from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
from functools import wraps
import random
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'lexilearn-secret-key-2024-secure'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lexilearn.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

CORS(app, supports_credentials=True, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
])

db = SQLAlchemy(app)

# ─────────────────────────────────────────
#  MODELS
# ─────────────────────────────────────────

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    favorite_color = db.Column(db.String(50), default='blue')
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    settings = db.relationship('UserSettings', backref='user', uselist=False, cascade='all, delete-orphan')
    word_progress = db.relationship('UserWordProgress', backref='user', cascade='all, delete-orphan')
    study_sessions = db.relationship('StudySession', backref='user', cascade='all, delete-orphan')


class UserSettings(db.Model):
    __tablename__ = 'user_settings'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    flashcard_count = db.Column(db.Integer, default=20)
    language = db.Column(db.String(5), default='ru')


class Word(db.Model):
    __tablename__ = 'words'
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False)
    translation_ru = db.Column(db.String(200), nullable=False)
    translation_kz = db.Column(db.String(200), nullable=False)
    definition = db.Column(db.String(500))
    example = db.Column(db.String(300))
    level = db.Column(db.String(5), nullable=False)
    part_of_speech = db.Column(db.String(20))


class UserWordProgress(db.Model):
    __tablename__ = 'user_word_progress'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    word_id = db.Column(db.Integer, db.ForeignKey('words.id'), nullable=False)
    easiness = db.Column(db.Float, default=2.5)
    interval = db.Column(db.Integer, default=1)
    repetitions = db.Column(db.Integer, default=0)
    next_review = db.Column(db.Date, default=date.today)
    last_reviewed = db.Column(db.Date)
    correct_count = db.Column(db.Integer, default=0)
    incorrect_count = db.Column(db.Integer, default=0)
    learned = db.Column(db.Boolean, default=False)
    word = db.relationship('Word')
    __table_args__ = (db.UniqueConstraint('user_id', 'word_id'),)


class StudySession(db.Model):
    __tablename__ = 'study_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    level = db.Column(db.String(5), nullable=False)
    mode = db.Column(db.String(20), nullable=False)
    correct = db.Column(db.Integer, default=0)
    incorrect = db.Column(db.Integer, default=0)
    duration_seconds = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    session_words = db.relationship('SessionWord', backref='session', cascade='all, delete-orphan')


class SessionWord(db.Model):
    __tablename__ = 'session_words'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('study_sessions.id'), nullable=False)
    word_id = db.Column(db.Integer, db.ForeignKey('words.id'), nullable=False)
    correct = db.Column(db.Boolean, nullable=False)
    word = db.relationship('Word')


# ─────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


def sm2_update(prog, quality):
    """Apply SM-2 spaced repetition algorithm. quality 0-5."""
    if quality < 3:
        prog.repetitions = 0
        prog.interval = 1
    else:
        if prog.repetitions == 0:
            prog.interval = 1
        elif prog.repetitions == 1:
            prog.interval = 6
        else:
            prog.interval = round(prog.interval * prog.easiness)
        prog.repetitions += 1
        prog.easiness = max(1.3, prog.easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    prog.next_review = date.today() + timedelta(days=prog.interval)
    prog.last_reviewed = date.today()
    if prog.repetitions >= 3 and prog.easiness >= 2.0:
        prog.learned = True


def word_to_dict(w, prog=None):
    d = {
        'id': w.id, 'word': w.word,
        'translation_ru': w.translation_ru,
        'translation_kz': w.translation_kz,
        'definition': w.definition,
        'example': w.example,
        'level': w.level,
        'part_of_speech': w.part_of_speech,
    }
    if prog:
        d['learned'] = prog.learned
        d['correct_count'] = prog.correct_count
        d['incorrect_count'] = prog.incorrect_count
        d['next_review'] = str(prog.next_review) if prog.next_review else None
    else:
        d['learned'] = False
    return d


# ─────────────────────────────────────────
#  AUTH ROUTES
# ─────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    login_val = data.get('login', '').strip()
    password = data.get('password', '')
    favorite_color = data.get('favorite_color', 'blue')
    if not login_val or not password:
        return jsonify({'error': 'Login and password are required'}), 400
    if User.query.filter_by(login=login_val).first():
        return jsonify({'error': 'Login already taken'}), 400
    user = User(login=login_val, password_hash=generate_password_hash(password), favorite_color=favorite_color)
    db.session.add(user)
    db.session.flush()
    db.session.add(UserSettings(user_id=user.id))
    db.session.commit()
    session.permanent = True
    session['user_id'] = user.id
    return jsonify({'id': user.id, 'login': user.login, 'is_admin': user.is_admin}), 201


@app.route('/api/auth/login', methods=['POST'])
def login_route():
    data = request.json or {}
    user = User.query.filter_by(login=data.get('login', '').strip()).first()
    if not user or not check_password_hash(user.password_hash, data.get('password', '')):
        return jsonify({'error': 'Invalid login or password'}), 401
    session.permanent = True
    session['user_id'] = user.id
    return jsonify({'id': user.id, 'login': user.login, 'is_admin': user.is_admin})


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})


@app.route('/api/auth/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    s = user.settings
    return jsonify({
        'id': user.id, 'login': user.login,
        'favorite_color': user.favorite_color,
        'is_admin': user.is_admin,
        'settings': {
            'flashcard_count': s.flashcard_count if s else 20,
            'language': s.language if s else 'ru',
        }
    })


@app.route('/api/auth/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json or {}
    user = User.query.get(session['user_id'])
    if not check_password_hash(user.password_hash, data.get('old_password', '')):
        return jsonify({'error': 'Incorrect current password'}), 400
    new_pw = data.get('new_password', '')
    if len(new_pw) < 4:
        return jsonify({'error': 'New password too short'}), 400
    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'})


# ─────────────────────────────────────────
#  WORDS ROUTES
# ─────────────────────────────────────────

@app.route('/api/words', methods=['GET'])
@login_required
def get_words():
    level = request.args.get('level', 'ALL')
    search = request.args.get('search', '').strip()
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(100, int(request.args.get('per_page', 50)))

    q = Word.query
    if level and level != 'ALL':
        q = q.filter_by(level=level)
    if search:
        q = q.filter(Word.word.ilike(f'%{search}%'))
    q = q.order_by(Word.level, Word.word)
    total = q.count()
    words = q.offset((page - 1) * per_page).limit(per_page).all()

    uid = session['user_id']
    prog_map = {
        p.word_id: p
        for p in UserWordProgress.query.filter(
            UserWordProgress.user_id == uid,
            UserWordProgress.word_id.in_([w.id for w in words])
        ).all()
    }
    return jsonify({
        'words': [word_to_dict(w, prog_map.get(w.id)) for w in words],
        'total': total, 'page': page, 'per_page': per_page
    })


@app.route('/api/words/flashcards', methods=['GET'])
@login_required
def get_flashcards():
    level = request.args.get('level', 'A1')
    uid = session['user_id']
    s = UserSettings.query.filter_by(user_id=uid).first()
    count = s.flashcard_count if s else 20

    words = Word.query.filter_by(level=level).all()
    if not words:
        return jsonify([])

    prog_map = {
        p.word_id: p
        for p in UserWordProgress.query.filter_by(user_id=uid).filter(
            UserWordProgress.word_id.in_([w.id for w in words])
        ).all()
    }

    today = date.today()
    due, not_seen, learned = [], [], []
    for w in words:
        p = prog_map.get(w.id)
        if p:
            if p.learned:
                learned.append((w, p))
            elif p.next_review and p.next_review <= today:
                due.append((w, p))
            else:
                not_seen.append((w, p))
        else:
            not_seen.append((w, None))

    random.shuffle(not_seen)
    selected = due[:count]
    if len(selected) < count:
        selected += not_seen[:count - len(selected)]
    if len(selected) < count:
        selected += learned[:count - len(selected)]
    selected = selected[:count]
    random.shuffle(selected)

    result = []
    for w, p in selected:
        d = word_to_dict(w)
        d['easiness'] = p.easiness if p else 2.5
        d['interval'] = p.interval if p else 1
        d['repetitions'] = p.repetitions if p else 0
        result.append(d)
    return jsonify(result)


@app.route('/api/words/quiz', methods=['GET'])
@login_required
def get_quiz():
    level = request.args.get('level', 'A1')
    count = min(int(request.args.get('count', 20)), 30)

    words = Word.query.filter_by(level=level).all()
    all_words = Word.query.all()
    if len(words) < 4:
        return jsonify({'error': 'Not enough words for quiz'}), 400

    random.shuffle(words)
    quiz_words = words[:count]
    questions = []
    for word in quiz_words:
        others = [w for w in all_words if w.id != word.id and w.translation_ru != word.translation_ru]
        wrong = random.sample(others, min(3, len(others)))
        options = [word.translation_ru] + [w.translation_ru for w in wrong]
        random.shuffle(options)
        questions.append({
            'word_id': word.id,
            'word': word.word,
            'correct_answer': word.translation_ru,
            'correct_answer_kz': word.translation_kz,
            'options': options,
        })
    return jsonify(questions)


# ─────────────────────────────────────────
#  LEARNING ROUTES
# ─────────────────────────────────────────

@app.route('/api/learning/flashcard-result', methods=['POST'])
@login_required
def flashcard_result():
    data = request.json or {}
    uid = session['user_id']
    results = data.get('results', [])
    correct_count = incorrect_count = 0
    sw_list = []

    for r in results:
        word_id, quality = r['word_id'], r['quality']
        is_correct = quality >= 3
        if is_correct:
            correct_count += 1
        else:
            incorrect_count += 1

        prog = UserWordProgress.query.filter_by(user_id=uid, word_id=word_id).first()
        if not prog:
            prog = UserWordProgress(user_id=uid, word_id=word_id, easiness=2.5, interval=1, repetitions=0, correct_count=0, incorrect_count=0, learned=False, next_review=date.today())
            db.session.add(prog)
            db.session.flush()
        prog.correct_count = (prog.correct_count or 0) + (1 if is_correct else 0)
        prog.incorrect_count = (prog.incorrect_count or 0) + (0 if is_correct else 1)
        sm2_update(prog, quality)
        sw_list.append({'word_id': word_id, 'correct': is_correct})

    study = StudySession(
        user_id=uid, level=data.get('level', 'A1'),
        mode='flashcard', correct=correct_count, incorrect=incorrect_count,
        duration_seconds=data.get('duration_seconds', 0)
    )
    db.session.add(study)
    db.session.flush()
    for sw in sw_list:
        db.session.add(SessionWord(session_id=study.id, word_id=sw['word_id'], correct=sw['correct']))
    db.session.commit()
    return jsonify({'session_id': study.id, 'correct': correct_count, 'incorrect': incorrect_count})


@app.route('/api/learning/quiz-result', methods=['POST'])
@login_required
def quiz_result():
    data = request.json or {}
    uid = session['user_id']
    results = data.get('results', [])
    correct_count = sum(1 for r in results if r['correct'])
    incorrect_count = len(results) - correct_count

    for r in results:
        word_id = r['word_id']
        is_correct = r['correct']
        quality = 5 if is_correct else 1

        prog = UserWordProgress.query.filter_by(user_id=uid, word_id=word_id).first()
        if not prog:
            prog = UserWordProgress(user_id=uid, word_id=word_id, easiness=2.5, interval=1, repetitions=0, correct_count=0, incorrect_count=0, learned=False, next_review=date.today())
            db.session.add(prog)
            db.session.flush()
        prog.correct_count = (prog.correct_count or 0) + (1 if is_correct else 0)
        prog.incorrect_count = (prog.incorrect_count or 0) + (0 if is_correct else 1)
        sm2_update(prog, quality)

    study = StudySession(
        user_id=uid, level=data.get('level', 'A1'),
        mode='quiz', correct=correct_count, incorrect=incorrect_count,
        duration_seconds=data.get('duration_seconds', 0)
    )
    db.session.add(study)
    db.session.flush()
    for r in results:
        db.session.add(SessionWord(session_id=study.id, word_id=r['word_id'], correct=r['correct']))
    db.session.commit()
    pct = round(correct_count / len(results) * 100) if results else 0
    return jsonify({'session_id': study.id, 'correct': correct_count, 'incorrect': incorrect_count, 'percentage': pct})


@app.route('/api/learning/session/<int:sid>', methods=['GET'])
@login_required
def get_session_detail(sid):
    study = StudySession.query.filter_by(id=sid, user_id=session['user_id']).first_or_404()
    return jsonify({
        'id': study.id, 'level': study.level, 'mode': study.mode,
        'correct': study.correct, 'incorrect': study.incorrect,
        'duration_seconds': study.duration_seconds,
        'created_at': study.created_at.isoformat(),
        'words': [{'word': sw.word.word, 'translation_ru': sw.word.translation_ru, 'correct': sw.correct}
                  for sw in study.session_words]
    })


# ─────────────────────────────────────────
#  PROGRESS ROUTES
# ─────────────────────────────────────────

@app.route('/api/progress', methods=['GET'])
@login_required
def get_progress():
    uid = session['user_id']
    levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    prog, total_w, total_l = {}, 0, 0

    for lv in levels:
        wc = Word.query.filter_by(level=lv).count()
        lc = UserWordProgress.query.join(Word).filter(
            UserWordProgress.user_id == uid,
            UserWordProgress.learned == True,
            Word.level == lv
        ).count()
        prog[lv] = {'total': wc, 'learned': lc, 'percentage': round(lc / wc * 100) if wc else 0}
        total_w += wc
        total_l += lc

    sessions = StudySession.query.filter_by(user_id=uid).all()
    tc = sum(s.correct for s in sessions)
    ti_cnt = sum(s.incorrect for s in sessions)
    ta = tc + ti_cnt
    return jsonify({
        'overall': {'total': total_w, 'learned': total_l, 'percentage': round(total_l / total_w * 100) if total_w else 0},
        'levels': prog,
        'stats': {
            'sessions': len(sessions),
            'words_practiced': ta,
            'accuracy': round(tc / ta * 100) if ta else 0,
            'minutes': round(sum(s.duration_seconds for s in sessions) / 60)
        }
    })


# ─────────────────────────────────────────
#  SETTINGS ROUTES
# ─────────────────────────────────────────

@app.route('/api/settings', methods=['GET', 'PUT'])
@login_required
def settings_route():
    uid = session['user_id']
    s = UserSettings.query.filter_by(user_id=uid).first()
    if not s:
        s = UserSettings(user_id=uid)
        db.session.add(s)
        db.session.commit()

    if request.method == 'GET':
        return jsonify({'flashcard_count': s.flashcard_count, 'language': s.language})

    data = request.json or {}
    if 'flashcard_count' in data:
        s.flashcard_count = max(5, min(50, int(data['flashcard_count'])))
    if 'language' in data:
        s.language = data['language']
    db.session.commit()
    return jsonify({'message': 'Settings saved'})


# ─────────────────────────────────────────
#  ADMIN ROUTES
# ─────────────────────────────────────────

@app.route('/api/admin/words', methods=['GET'])
@admin_required
def admin_get_words():
    level = request.args.get('level', 'ALL')
    search = request.args.get('search', '').strip()
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(100, int(request.args.get('per_page', 20)))

    q = Word.query
    if level and level != 'ALL':
        q = q.filter_by(level=level)
    if search:
        q = q.filter(Word.word.ilike(f'%{search}%'))
    total = q.count()
    words = q.order_by(Word.level, Word.word).offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({'words': [word_to_dict(w) for w in words], 'total': total, 'page': page, 'per_page': per_page})


@app.route('/api/admin/words', methods=['POST'])
@admin_required
def admin_create_word():
    data = request.json or {}
    w = Word(
        word=data['word'], translation_ru=data['translation_ru'],
        translation_kz=data['translation_kz'], definition=data.get('definition', ''),
        example=data.get('example', ''), level=data['level'],
        part_of_speech=data.get('part_of_speech', 'noun')
    )
    db.session.add(w)
    db.session.commit()
    return jsonify(word_to_dict(w)), 201


@app.route('/api/admin/words/<int:wid>', methods=['PUT'])
@admin_required
def admin_update_word(wid):
    w = Word.query.get_or_404(wid)
    data = request.json or {}
    for f in ['word', 'translation_ru', 'translation_kz', 'definition', 'example', 'level', 'part_of_speech']:
        if f in data:
            setattr(w, f, data[f])
    db.session.commit()
    return jsonify(word_to_dict(w))


@app.route('/api/admin/words/<int:wid>', methods=['DELETE'])
@admin_required
def admin_delete_word(wid):
    w = Word.query.get_or_404(wid)
    db.session.delete(w)
    db.session.commit()
    return jsonify({'message': 'Deleted'})


@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    return jsonify({
        'total_users': User.query.count(),
        'total_words': Word.query.count(),
        'total_sessions': StudySession.query.count(),
        'words_by_level': {lv: Word.query.filter_by(level=lv).count() for lv in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']}
    })


# ─────────────────────────────────────────
#  SEED DATABASE
# ─────────────────────────────────────────

WORDS_DATA = [
    # ── A1 Beginner ──
    ("apple","яблоко","алма","A round fruit with red or green skin","I eat an apple every day.","A1","noun"),
    ("book","книга","кітап","A set of written or printed pages","This is a great book.","A1","noun"),
    ("cat","кошка","мысық","A small domestic animal","The cat is sleeping.","A1","noun"),
    ("dog","собака","ит","A common pet kept at home","My dog is friendly.","A1","noun"),
    ("house","дом","үй","A building where people live","They live in a big house.","A1","noun"),
    ("water","вода","су","A clear liquid we drink","Please give me some water.","A1","noun"),
    ("food","еда","тамақ","Things we eat","The food is delicious.","A1","noun"),
    ("school","школа","мектеп","A place where children learn","I go to school every day.","A1","noun"),
    ("friend","друг","дос","A person you like and trust","She is my best friend.","A1","noun"),
    ("mother","мама","ана","A female parent","My mother is a teacher.","A1","noun"),
    ("father","папа","әке","A male parent","My father works hard.","A1","noun"),
    ("big","большой","үлкен","Of large size","That is a big elephant.","A1","adjective"),
    ("small","маленький","кіші","Of little size","The mouse is small.","A1","adjective"),
    ("good","хороший","жақсы","Of high quality","You did a good job!","A1","adjective"),
    ("bad","плохой","жаман","Of poor quality","The weather is bad today.","A1","adjective"),
    ("happy","счастливый","бақытты","Feeling pleasure","She looks happy today.","A1","adjective"),
    ("go","идти","бару","To move to another place","Let's go to the park.","A1","verb"),
    ("eat","есть","жеу","To take food into your body","I eat breakfast at 8 am.","A1","verb"),
    ("drink","пить","ішу","To swallow liquid","Drink plenty of water.","A1","verb"),
    ("run","бежать","жүгіру","To move quickly on foot","She can run very fast.","A1","verb"),
    ("see","видеть","көру","To notice with your eyes","Can you see the mountain?","A1","verb"),
    ("come","приходить","келу","To move toward a place","Come here, please.","A1","verb"),
    ("have","иметь","болу","To own or possess","I have two brothers.","A1","verb"),
    ("make","делать","жасау","To produce or create","Let me make some tea.","A1","verb"),
    ("day","день","күн","A period of 24 hours","Have a nice day!","A1","noun"),
    ("night","ночь","түн","Time from sunset to sunrise","Good night!","A1","noun"),
    ("year","год","жыл","A period of 12 months","Happy New Year!","A1","noun"),
    ("time","время","уақыт","The measured passage of hours","What time is it?","A1","noun"),
    ("red","красный","қызыл","The color of blood","She wore a red dress.","A1","adjective"),
    ("blue","синий","көк","The color of the sky","The sky is blue.","A1","adjective"),
    ("white","белый","ақ","The color of snow","He wore a white shirt.","A1","adjective"),
    ("black","чёрный","қара","The color of night","My cat is black.","A1","adjective"),
    ("tree","дерево","ағаш","A tall plant with a trunk","The tree is very old.","A1","noun"),
    ("sun","солнце","күн","The star at the center of our solar system","The sun is shining.","A1","noun"),
    ("hot","горячий","ыстық","Having a high temperature","The soup is hot.","A1","adjective"),
    ("cold","холодный","суық","Having a low temperature","It's cold outside.","A1","adjective"),
    ("fast","быстрый","жылдам","Moving quickly","The train is fast.","A1","adjective"),
    ("slow","медленный","баяу","Not moving quickly","The turtle is slow.","A1","adjective"),
    ("new","новый","жаңа","Recently made","I have a new phone.","A1","adjective"),
    ("old","старый","ескі","Having existed long","This is an old building.","A1","adjective"),
    ("yes","да","иә","Used to agree","Yes, I agree.","A1","adverb"),
    ("no","нет","жоқ","Used to disagree","No, I don't think so.","A1","adverb"),
    ("hello","привет","сәлем","A greeting word","Hello! How are you?","A1","interjection"),
    ("open","открывать","ашу","To make accessible","Please open the window.","A1","verb"),
    ("close","закрывать","жабу","To shut something","Please close the door.","A1","verb"),
    ("tall","высокий","биік","Having great height","He is very tall.","A1","adjective"),
    ("thank you","спасибо","рахмет","An expression of gratitude","Thank you very much!","A1","interjection"),
    ("please","пожалуйста","өтінемін","Used to make a polite request","Please sit down.","A1","adverb"),
    ("walk","ходить","жүру","To move on foot at a normal pace","I walk to work every day.","A1","verb"),
    ("sleep","спать","ұйықтау","To rest with eyes closed","I sleep eight hours a night.","A1","verb"),
    # ── A2 Elementary ──
    ("travel","путешествовать","саяхаттау","To go from one place to another","I love to travel.","A2","verb"),
    ("airport","аэропорт","әуежай","A place where aircraft land","We arrived at the airport.","A2","noun"),
    ("weather","погода","ауа райы","Atmospheric conditions outside","The weather is beautiful.","A2","noun"),
    ("family","семья","отбасы","A group of related people","I love my family.","A2","noun"),
    ("market","рынок","базар","A place to buy and sell goods","Let's go to the market.","A2","noun"),
    ("money","деньги","ақша","Currency for buying things","I don't have much money.","A2","noun"),
    ("work","работать","жұмыс істеу","To do a job or activity","I work in an office.","A2","verb"),
    ("study","учиться","оқу","To learn about a subject","She studies medicine.","A2","verb"),
    ("believe","верить","сену","To think something is true","I believe in you.","A2","verb"),
    ("understand","понимать","түсіну","To know the meaning of something","Do you understand?","A2","verb"),
    ("beautiful","красивый","әдемі","Attractive to look at","What a beautiful view!","A2","adjective"),
    ("interesting","интересный","қызықты","Causing curiosity","This book is interesting.","A2","adjective"),
    ("difficult","трудный","қиын","Not easy to do","Math is difficult for me.","A2","adjective"),
    ("important","важный","маңызды","Having great significance","Sleep is very important.","A2","adjective"),
    ("different","другой","басқа","Not the same","These books are different.","A2","adjective"),
    ("together","вместе","бірге","With each other","Let's do this together.","A2","adverb"),
    ("always","всегда","әрдайым","At all times","I always wake up early.","A2","adverb"),
    ("never","никогда","ешқашан","At no time","I never smoke.","A2","adverb"),
    ("sometimes","иногда","кейде","Occasionally","Sometimes I feel tired.","A2","adverb"),
    ("future","будущее","болашақ","The time yet to come","The future looks bright.","A2","noun"),
    ("past","прошлое","өткен","The time already gone","Let's not talk about the past.","A2","noun"),
    ("city","город","қала","A large town","London is a big city.","A2","noun"),
    ("country","страна","ел","A nation with its own government","France is beautiful.","A2","noun"),
    ("language","язык","тіл","A system of communication","I speak three languages.","A2","noun"),
    ("music","музыка","музыка","Sounds in a pleasing pattern","I love classical music.","A2","noun"),
    ("color","цвет","түс","A visual property of objects","What is your favorite color?","A2","noun"),
    ("start","начинать","бастау","To begin something","Let's start the meeting.","A2","verb"),
    ("stop","останавливать","тоқтату","To bring to an end","Please stop talking.","A2","verb"),
    ("help","помогать","көмектесу","To assist someone","Can you help me?","A2","verb"),
    ("find","находить","табу","To discover something","I can't find my keys.","A2","verb"),
    ("know","знать","білу","To have information","Do you know the answer?","A2","verb"),
    ("think","думать","ойлау","To use one's mind","I think you're right.","A2","verb"),
    ("feel","чувствовать","сезіну","To experience an emotion","How do you feel today?","A2","verb"),
    ("need","нуждаться","қажет ету","To require something","I need your help.","A2","verb"),
    ("want","хотеть","қалау","To desire something","I want a coffee.","A2","verb"),
    ("like","нравиться","ұнату","To find pleasant","I like chocolate.","A2","verb"),
    ("love","любить","жақсы көру","To feel deep affection","I love my family.","A2","verb"),
    ("try","пытаться","тырысу","To make an effort","Try your best!","A2","verb"),
    ("change","менять","өзгерту","To make different","Please change your shirt.","A2","verb"),
    ("question","вопрос","сұрақ","A sentence asking for information","Can I ask a question?","A2","noun"),
    ("answer","ответ","жауап","A response to a question","What is the answer?","A2","noun"),
    ("problem","проблема","мәселе","A situation that needs solving","There is a big problem.","A2","noun"),
    ("idea","идея","идея","A thought or plan","That's a great idea!","A2","noun"),
    ("picture","картина","сурет","A visual representation","This picture is beautiful.","A2","noun"),
    ("sport","спорт","спорт","Physical activity for enjoyment","Sport keeps you healthy.","A2","noun"),
    ("give","давать","беру","To hand something to someone","Give me that book, please.","A2","verb"),
    ("take","брать","алу","To reach out and hold","Take this umbrella.","A2","verb"),
    ("hate","ненавидеть","жек көру","To feel strong dislike","I hate waking up early.","A2","verb"),
    ("read","читать","оқу","To look at and understand text","I read every night.","A2","verb"),
    ("write","писать","жазу","To form words on a surface","Write your name here.","A2","verb"),
    # ── B1 Intermediate ──
    ("achieve","достигать","жету","To successfully reach a goal","She achieved her dream.","B1","verb"),
    ("advantage","преимущество","артықшылық","A condition that helps you","Experience is an advantage.","B1","noun"),
    ("attitude","отношение","көзқарас","A person's opinion about something","He has a positive attitude.","B1","noun"),
    ("avoid","избегать","аулақ болу","To stay away from something","Try to avoid stress.","B1","verb"),
    ("benefit","польза","пайда","Something with a positive effect","The benefits of exercise are huge.","B1","noun"),
    ("challenge","вызов","қиындық","A difficult task testing your abilities","Life is full of challenges.","B1","noun"),
    ("consider","рассматривать","қарастыру","To think carefully about something","Consider all your options.","B1","verb"),
    ("contribute","вносить вклад","үлес қосу","To give to help a cause","Everyone can contribute.","B1","verb"),
    ("creative","творческий","шығармашыл","Using imagination","She is a creative person.","B1","adjective"),
    ("culture","культура","мәдениет","The beliefs and customs of a society","Japan has a rich culture.","B1","noun"),
    ("develop","развивать","дамыту","To grow or cause to grow","Develop new skills.","B1","verb"),
    ("effect","эффект","әсер","A change produced by an action","The medicine had no effect.","B1","noun"),
    ("environment","окружающая среда","қоршаған орта","The natural world around us","Protect the environment.","B1","noun"),
    ("experience","опыт","тәжірибе","Knowledge gained through doing","I have teaching experience.","B1","noun"),
    ("explain","объяснять","түсіндіру","To make something clear","Can you explain this?","B1","verb"),
    ("focus","сосредоточиться","шоғырлану","To concentrate on something","Focus on your goals.","B1","verb"),
    ("freedom","свобода","бостандық","The state of being free","Freedom is a basic right.","B1","noun"),
    ("government","правительство","үкімет","The group that rules a country","The government passed a law.","B1","noun"),
    ("improve","улучшать","жақсарту","To make something better","Improve your English.","B1","verb"),
    ("increase","увеличивать","арттыру","To become or make larger","Sales increased this year.","B1","verb"),
    ("influence","влияние","ықпал","The power to affect others","Music influences mood.","B1","noun"),
    ("join","присоединяться","қосылу","To become a member of something","Would you like to join us?","B1","verb"),
    ("knowledge","знание","білім","Information and understanding","Knowledge is power.","B1","noun"),
    ("manage","управлять","басқару","To be in charge of something","She manages the whole team.","B1","verb"),
    ("opportunity","возможность","мүмкіндік","A time when something can be done","This is a great opportunity.","B1","noun"),
    ("opinion","мнение","пікір","What you think about something","In my opinion, this is wrong.","B1","noun"),
    ("perform","выступать","орындау","To carry out an activity","She performed beautifully.","B1","verb"),
    ("prepare","готовить","дайындау","To make ready for something","Prepare carefully for the exam.","B1","verb"),
    ("purpose","цель","мақсат","The reason something is done","What is the purpose of this?","B1","noun"),
    ("reach","достигать","жету","To arrive at a destination","We reached the summit.","B1","verb"),
    ("recognize","узнавать","тану","To identify something seen before","I recognized him immediately.","B1","verb"),
    ("relationship","отношение","қарым-қатынас","How people or things are connected","They have a great relationship.","B1","noun"),
    ("responsibility","ответственность","жауапкершілік","A duty or obligation","Being a parent is a responsibility.","B1","noun"),
    ("result","результат","нәтиже","Something caused by something else","Hard work produces good results.","B1","noun"),
    ("serious","серьёзный","маңызды","Solemn and thoughtful","This is a serious matter.","B1","adjective"),
    ("situation","ситуация","жағдай","Circumstances at a given moment","We are in a difficult situation.","B1","noun"),
    ("skill","навык","дағды","Ability to do something well","Communication is an important skill.","B1","noun"),
    ("society","общество","қоғам","People living together in a community","Society has changed a lot.","B1","noun"),
    ("suggest","предлагать","ұсыну","To put forward an idea","I suggest we take a break.","B1","verb"),
    ("support","поддерживать","қолдау","To help or encourage","Thank you for your support.","B1","verb"),
    ("truth","правда","шындық","The fact of something being true","Tell me the truth.","B1","noun"),
    ("imagine","воображать","елестету","To form a picture in your mind","Imagine a better world.","B1","verb"),
    ("discuss","обсуждать","талқылау","To talk about something with others","Let's discuss this problem.","B1","verb"),
    ("decide","решать","шешу","To make a choice","You must decide now.","B1","verb"),
    ("describe","описывать","сипаттау","To say what something is like","Describe what you see.","B1","verb"),
    ("discover","открывать","ашу","To find something for the first time","Scientists discover new planets.","B1","verb"),
    ("express","выражать","білдіру","To show feelings or thoughts","It is hard to express my feelings.","B1","verb"),
    ("mistake","ошибка","қате","Something done incorrectly","Everyone makes mistakes.","B1","noun"),
    ("success","успех","жетістік","The achievement of a goal","Success requires hard work.","B1","noun"),
    ("protect","защищать","қорғау","To keep safe from harm","Protect your data online.","B1","verb"),
    ("receive","получать","алу","To be given something","I received a gift today.","B1","verb"),
    # ── B2 Upper Intermediate ──
    ("ambiguous","неоднозначный","екіұшты","Open to more than one interpretation","His answer was ambiguous.","B2","adjective"),
    ("anticipate","ожидать","күту","To expect something to happen","We anticipate a good result.","B2","verb"),
    ("assume","предполагать","болжау","To take as true without proof","Don't assume anything.","B2","verb"),
    ("coherent","последовательный","жүйелі","Logical and consistent","She gave a coherent argument.","B2","adjective"),
    ("comprehensive","всесторонний","жан-жақты","Including all important details","A comprehensive guide.","B2","adjective"),
    ("consequence","последствие","салдар","A result or effect of an action","Think of the consequences.","B2","noun"),
    ("controversial","спорный","даулы","Causing much discussion","This is a controversial topic.","B2","adjective"),
    ("crucial","решающий","шешуші","Extremely important","This is a crucial decision.","B2","adjective"),
    ("debate","обсуждение","пікірталас","A formal discussion of opposing views","The debate was interesting.","B2","noun"),
    ("decline","снижение","төмендеу","A gradual decrease","There has been a decline in sales.","B2","noun"),
    ("diverse","разнообразный","алуан","Showing great variety","Our team is diverse.","B2","adjective"),
    ("eliminate","устранять","жою","To completely remove something","We must eliminate waste.","B2","verb"),
    ("emphasize","подчёркивать","баса айту","To give special attention","I want to emphasize this point.","B2","verb"),
    ("establish","устанавливать","орнату","To set up or create","They established a new company.","B2","verb"),
    ("evaluate","оценивать","бағалау","To judge the value of something","Please evaluate the results.","B2","verb"),
    ("evidence","доказательство","дәлел","Facts that prove something true","The evidence was overwhelming.","B2","noun"),
    ("evolve","эволюционировать","дамыту","To develop gradually over time","Technology continues to evolve.","B2","verb"),
    ("facilitate","облегчать","жеңілдету","To make something easier","Education facilitates growth.","B2","verb"),
    ("fundamental","фундаментальный","іргелі","Forming a base or foundation","This is a fundamental right.","B2","adjective"),
    ("generate","генерировать","туындату","To produce or create","Solar panels generate electricity.","B2","verb"),
    ("hypothesis","гипотеза","гипотеза","An idea that needs to be tested","The hypothesis was correct.","B2","noun"),
    ("implement","внедрять","енгізу","To put a plan into action","We will implement the new policy.","B2","verb"),
    ("interpret","интерпретировать","түсіндіру","To explain the meaning of something","How do you interpret this?","B2","verb"),
    ("investigate","расследовать","тергеу","To examine something carefully","Police investigated the crime.","B2","verb"),
    ("justify","обосновывать","негіздеу","To show that something is reasonable","Can you justify your decision?","B2","verb"),
    ("maintain","поддерживать","сақтау","To keep in good condition","Maintain a healthy lifestyle.","B2","verb"),
    ("negotiate","договариваться","келіссөз жүргізу","To discuss to reach an agreement","They negotiated a contract.","B2","verb"),
    ("perceive","воспринимать","қабылдау","To become aware through senses","How do you perceive this issue?","B2","verb"),
    ("phenomenon","феномен","құбылыс","A fact or event that can be observed","Inflation is a complex phenomenon.","B2","noun"),
    ("precise","точный","нақты","Exact and accurate","Give me a precise answer.","B2","adjective"),
    ("principle","принцип","принцип","A fundamental truth or rule","Honesty is my key principle.","B2","noun"),
    ("profound","глубокий","терең","Having great depth or intensity","A profound change occurred.","B2","adjective"),
    ("relevant","актуальный","өзекті","Closely connected to the matter","Your point is relevant.","B2","adjective"),
    ("significant","значительный","маңызды","Large or important enough to notice","A significant improvement.","B2","adjective"),
    ("substantial","существенный","елеулі","Of considerable importance or size","A substantial amount of work.","B2","adjective"),
    ("sustain","поддерживать","ұстау","To keep something going over time","Can we sustain this growth?","B2","verb"),
    ("tendency","тенденция","үрдіс","A direction in which something changes","There is a tendency to overwork.","B2","noun"),
    ("acknowledge","признавать","мойындау","To accept or admit something","She acknowledged her mistake.","B2","verb"),
    ("bias","предвзятость","алалаушылық","An unfair preference","The judge showed no bias.","B2","noun"),
    ("dedicate","посвящать","арнау","To give time or energy to something","She dedicated her life to science.","B2","verb"),
    ("encounter","встречать","кездесу","To meet unexpectedly","I encountered many challenges.","B2","verb"),
    ("persist","настаивать","жалғастыру","To continue despite difficulty","Persist in your efforts.","B2","verb"),
    ("obtain","получать","алу","To get or acquire something","How can I obtain a visa?","B2","verb"),
    ("illustrate","иллюстрировать","суреттеу","To show with examples","Let me illustrate my point.","B2","verb"),
    ("imply","подразумевать","білдіру","To suggest without saying directly","What do you imply by that?","B2","verb"),
    ("mechanism","механизм","механизм","A process by which something works","The mechanism needs repair.","B2","noun"),
    ("straightforward","прямой","тікелей","Easy to understand or honest","The instructions are clear.","B2","adjective"),
    ("inherent","присущий","тән","Existing as a natural characteristic","Risk is inherent in business.","B2","adjective"),
    ("hence","отсюда","сондықтан","For this reason; therefore","Hence, we need a new plan.","B2","adverb"),
    ("process","процесс","процесс","A series of actions to achieve a result","The process takes time.","B2","noun"),
    # ── C1 Advanced ──
    ("advocate","защитник","жақтаушы","A person who supports a cause","She is a human rights advocate.","C1","noun"),
    ("albeit","хотя","дегенмен","Although; even though","He succeeded, albeit with difficulty.","C1","conjunction"),
    ("ambivalent","двойственный","екіжақты","Having mixed feelings","I feel ambivalent about this.","C1","adjective"),
    ("articulate","красноречивый","шешен","Able to express thoughts clearly","She is an articulate speaker.","C1","adjective"),
    ("assert","утверждать","қуаттау","To state something confidently","She asserted her innocence.","C1","verb"),
    ("astute","проницательный","зерек","Having good judgement","An astute observer noticed the error.","C1","adjective"),
    ("augment","увеличивать","толықтыру","To make greater by adding to it","Augment your income through investments.","C1","verb"),
    ("benevolent","доброжелательный","қайырымды","Showing kindness and goodwill","A benevolent leader earns respect.","C1","adjective"),
    ("complacent","самодовольный","мойынсұнғыш","Feeling excessive self-satisfaction","Don't be complacent about success.","C1","adjective"),
    ("concede","уступать","мойындау","To admit that something is true","He conceded that he was wrong.","C1","verb"),
    ("conjecture","предположение","жорамал","A conclusion based on incomplete evidence","That's just conjecture.","C1","noun"),
    ("conspicuous","заметный","көзге түсетін","Clearly visible and attracting attention","His absence was conspicuous.","C1","adjective"),
    ("contemplate","размышлять","ойлану","To think deeply about something","I often contemplate life's meaning.","C1","verb"),
    ("convey","передавать","жеткізу","To communicate a message or idea","Art can convey deep emotions.","C1","verb"),
    ("cynical","циничный","циникалық","Believing people act selfishly","He gave a cynical laugh.","C1","adjective"),
    ("daunting","пугающий","батылсыздандыратын","Seeming difficult to deal with","The task seemed daunting at first.","C1","adjective"),
    ("deliberate","преднамеренный","қасақана","Done with careful consideration","It was a deliberate mistake.","C1","adjective"),
    ("depict","изображать","бейнелеу","To represent in a picture or story","The painting depicts a stormy sea.","C1","verb"),
    ("derive","извлекать","алу","To obtain from a source","She derives pleasure from reading.","C1","verb"),
    ("detrimental","вредный","зиянды","Causing harm or damage","Smoking is detrimental to health.","C1","adjective"),
    ("diminish","уменьшать","кемудеу","To make or become smaller","Her enthusiasm didn't diminish.","C1","verb"),
    ("eloquent","красноречивый","шешен","Fluent and persuasive in speaking","An eloquent speech moved the crowd.","C1","adjective"),
    ("emulate","подражать","еліктеу","To try to equal someone","Young athletes emulate their heroes.","C1","verb"),
    ("encompass","охватывать","қамту","To include a wide range of things","The project encompasses many topics.","C1","verb"),
    ("endeavor","усилие","ұмтылыс","An attempt to achieve something","His endeavors were rewarded.","C1","noun"),
    ("exacerbate","усугублять","асқындыру","To make something worse","Stress can exacerbate illness.","C1","verb"),
    ("explicit","явный","айқын","Stated clearly and in detail","The instructions were explicit.","C1","adjective"),
    ("facade","фасад","сырт пішін","A false or deceptive appearance","His smile was just a facade.","C1","noun"),
    ("fallacy","заблуждение","қателік","A mistaken belief or faulty reasoning","That argument contains a fallacy.","C1","noun"),
    ("feasible","осуществимый","орындалатын","Possible to do easily","Is this plan feasible?","C1","adjective"),
    ("fluctuate","колебаться","тербелу","To change or vary irregularly","Prices fluctuate daily.","C1","verb"),
    ("formidable","грозный","күшті","Inspiring awe through strength","She is a formidable opponent.","C1","adjective"),
    ("foster","воспитывать","қолдау","To encourage the development of something","We foster creativity in children.","C1","verb"),
    ("fragile","хрупкий","нәзік","Easily broken or damaged","Handle this carefully, it's fragile.","C1","adjective"),
    ("frugal","бережливый","үнемді","Economical with money","She is frugal with her spending.","C1","adjective"),
    ("futile","бессмысленный","бекер","Having no useful result","His efforts were futile.","C1","adjective"),
    ("hinder","мешать","кедергі жасау","To make it difficult to do something","Don't let fear hinder your progress.","C1","verb"),
    ("dichotomy","дихотомия","екіге бөлінушілік","A division into two contrasting parts","The work-life dichotomy is real.","C1","noun"),
    ("credibility","доверие","сенімділік","The quality of being trusted","His credibility was damaged.","C1","noun"),
    ("grievance","обида","шағым","A feeling of unfair treatment","She filed a grievance with HR.","C1","noun"),
    ("friction","трение","үйкеліс","Conflict or tension between two parties","There is friction between them.","C1","noun"),
    ("exemplify","иллюстрировать","мысал келтіру","To be a typical example of something","Her work exemplifies dedication.","C1","verb"),
    ("enumerate","перечислять","санамалау","To list items one by one","Enumerate the reasons for your decision.","C1","verb"),
    ("forthcoming","предстоящий","алдағы","About to happen in the near future","The forthcoming election matters.","C1","adjective"),
    ("grudge","злоба","кек","A persistent feeling of resentment","He bears no grudge against her.","C1","noun"),
    ("coerce","принуждать","мәжбүрлеу","To persuade by force or threats","She was coerced into signing.","C1","verb"),
    ("candid","откровенный","ашық","Truthful and straightforward","She gave a candid assessment.","C1","adjective"),
    ("benign","доброкачественный","зиянсыз","Gentle and kind; not harmful","The tumor was benign.","C1","adjective"),
    ("scrutinize","тщательно изучать","мұқият тексеру","To examine closely and critically","Scrutinize every detail.","C1","verb"),
    ("reconcile","примирять","татуластыру","To restore friendly relations","They reconciled after the argument.","C1","verb"),
    # ── C2 Proficiency ──
    ("abstruse","туманный","күрделі","Difficult to understand; obscure","His lecture was abstruse.","C2","adjective"),
    ("acrimony","горечь","ашулылық","Bitterness or ill feeling","The divorce was full of acrimony.","C2","noun"),
    ("ameliorate","улучшать","жақсарту","To make something bad better","Efforts to ameliorate poverty.","C2","verb"),
    ("anachronism","анахронизм","уақыттан тыс нәрсе","Something out of its historical period","Fax machines are now an anachronism.","C2","noun"),
    ("anathema","проклятие","жиренішті нәрсе","Something greatly detested","Dishonesty is anathema to me.","C2","noun"),
    ("apocryphal","сомнительный","күмәнді","Of doubtful authenticity","That story is probably apocryphal.","C2","adjective"),
    ("apotheosis","апофеоз","шыңы","The highest point of something","This was the apotheosis of his career.","C2","noun"),
    ("arcane","тайный","жасырын","Known by very few; mysterious","The ritual was arcane and strange.","C2","adjective"),
    ("assiduous","старательный","еңбекқор","Showing great care and persistence","An assiduous student always succeeds.","C2","adjective"),
    ("audacious","дерзкий","батыл","Showing willingness to take bold risks","An audacious plan shocked everyone.","C2","adjective"),
    ("bellicose","воинственный","жауынгерлік","Aggressive or war-like","His bellicose rhetoric scared allies.","C2","adjective"),
    ("cacophony","какофония","сырсыз дыбыс","A harsh unpleasant mixture of sounds","The construction site was a cacophony.","C2","noun"),
    ("capitulate","капитулировать","бас ию","To give in or surrender","They capitulated after the siege.","C2","verb"),
    ("capricious","капризный","ерен","Given to sudden unpredictable changes","Her capricious mood confused everyone.","C2","adjective"),
    ("clandestine","тайный","жасырын","Done in secret","A clandestine meeting took place.","C2","adjective"),
    ("cogent","убедительный","сенімді","Clear and logical in argument","She made a cogent case.","C2","adjective"),
    ("compendium","компендиум","жинақ","A collection of detailed information","This book is a compendium of history.","C2","noun"),
    ("contrite","раскаявшийся","өкінген","Feeling deep regret for wrong done","He was contrite after the argument.","C2","adjective"),
    ("conundrum","головоломка","жұмбақ","A difficult problem with no clear answer","This is a real conundrum.","C2","noun"),
    ("corroborate","подтверждать","растау","To confirm with evidence","The witness corroborated his story.","C2","verb"),
    ("dearth","нехватка","тапшылық","A scarcity or lack of something","There is a dearth of good doctors here.","C2","noun"),
    ("debacle","разгром","күйреу","A sudden disaster or failure","The project ended in a debacle.","C2","noun"),
    ("denigrate","порочить","кемсіту","To criticize unfairly","Don't denigrate others' achievements.","C2","verb"),
    ("denouement","развязка","шешімі","The final resolution of a story","The denouement surprised everyone.","C2","noun"),
    ("desultory","бессистемный","ретсіз","Done without a clear plan","A desultory attempt to clean up.","C2","adjective"),
    ("dilettante","дилетант","дилетант","A person who pursues art superficially","He was a dilettante in painting.","C2","noun"),
    ("disingenuous","неискренний","жалған","Not candid or sincere","His apology seemed disingenuous.","C2","adjective"),
    ("ebullient","жизнерадостный","жанды","Cheerful and full of energy","Her ebullient personality charmed all.","C2","adjective"),
    ("egregious","вопиющий","өрескел","Outstandingly bad or shocking","An egregious violation of rights.","C2","adjective"),
    ("enigmatic","загадочный","жұмбақты","Difficult to interpret","He gave an enigmatic smile.","C2","adjective"),
    ("ephemeral","мимолётный","өткінші","Lasting a very short time","Fame is ephemeral.","C2","adjective"),
    ("equanimity","невозмутимость","тыныштық","Mental calmness under stress","She faced crisis with equanimity.","C2","noun"),
    ("equivocate","уклоняться","екіұштылық","To use unclear language to avoid truth","Politicians often equivocate.","C2","verb"),
    ("esoteric","эзотерический","жасырын","Intended for a small specialist group","Quantum physics can be esoteric.","C2","adjective"),
    ("euphemism","эвфемизм","жұмсарту","A mild expression for something harsh","'Passed away' is a euphemism for died.","C2","noun"),
    ("evanescent","мимолётный","тез жоғалатын","Soon vanishing; short-lived","The evanescent mist lifted quickly.","C2","adjective"),
    ("exigent","срочный","жедел","Requiring immediate action; urgent","This is an exigent situation.","C2","adjective"),
    ("fatuous","глупый","ақымақ","Silly and pointless","A fatuous remark annoyed everyone.","C2","adjective"),
    ("garrulous","болтливый","шөберек","Excessively talkative","The garrulous neighbor never stopped.","C2","adjective"),
    ("grandiloquent","помпезный","мақтаншақ","Using pompous language","A grandiloquent speech bored everyone.","C2","adjective"),
    ("hubris","высокомерие","менмендік","Excessive pride or self-confidence","His hubris led to his downfall.","C2","noun"),
    ("impetuous","порывистый","ашуланшақ","Acting quickly without thinking","An impetuous decision can backfire.","C2","adjective"),
    ("inscrutable","непостижимый","түсініксіз","Impossible to understand","His inscrutable expression revealed nothing.","C2","adjective"),
    ("loquacious","болтливый","тілді","Very talkative","A loquacious host entertained guests.","C2","adjective"),
    ("magnanimous","великодушный","кеңпейіл","Very generous or forgiving","A magnanimous gesture surprised everyone.","C2","adjective"),
    ("mendacious","лживый","өтірікші","Not telling the truth; lying","A mendacious politician loses trust.","C2","adjective"),
    ("nefarious","злодейский","қылмысты","Wicked or criminal","A nefarious plot was uncovered.","C2","adjective"),
    ("obfuscate","запутывать","шатастыру","To make something difficult to understand","The legal jargon obfuscated the truth.","C2","verb"),
    ("pernicious","пагубный","зиянды","Having a harmful effect","The pernicious effects of propaganda.","C2","adjective"),
    ("perspicacious","проницательный","зерек","Having a ready insight","A perspicacious critic spotted the flaw.","C2","adjective"),
]


def seed_database():
    if Word.query.count() > 0:
        return

    for wd in WORDS_DATA:
        db.session.add(Word(
            word=wd[0], translation_ru=wd[1], translation_kz=wd[2],
            definition=wd[3], example=wd[4], level=wd[5], part_of_speech=wd[6]
        ))

    if not User.query.filter_by(login='admin').first():
        admin = User(login='admin', password_hash=generate_password_hash('admin123'), is_admin=True)
        db.session.add(admin)
        db.session.flush()
        db.session.add(UserSettings(user_id=admin.id))

    db.session.commit()
    print(f"✅ Seeded {len(WORDS_DATA)} words + admin user")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()
    app.run(debug=True, host='0.0.0.0', port=5000)
