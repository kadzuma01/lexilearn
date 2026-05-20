const BASE = '/api'

async function req(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  // Auth
  login:          (d) => req('POST', '/auth/login', d),
  register:       (d) => req('POST', '/auth/register', d),
  logout:         ()  => req('POST', '/auth/logout'),
  me:             ()  => req('GET',  '/auth/me'),
  changePassword: (d) => req('POST', '/auth/change-password', d),

  // Words
  getWords:       (params = {}) => req('GET', '/words?' + new URLSearchParams(params)),
  getFlashcards:  (level)       => req('GET', `/words/flashcards?level=${level}`),
  getQuiz:        (level, cnt)  => req('GET', `/words/quiz?level=${level}&count=${cnt || 20}`),

  // Learning
  flashcardResult: (d) => req('POST', '/learning/flashcard-result', d),
  quizResult:      (d) => req('POST', '/learning/quiz-result', d),
  getSession:      (id) => req('GET',  `/learning/session/${id}`),

  // Progress
  getProgress: () => req('GET', '/progress'),

  // Settings
  getSettings: ()  => req('GET', '/settings'),
  saveSettings:(d) => req('PUT', '/settings', d),

  // Admin
  adminGetWords:   (params = {}) => req('GET', '/admin/words?' + new URLSearchParams(params)),
  adminCreateWord: (d)  => req('POST', '/admin/words', d),
  adminUpdateWord: (id, d) => req('PUT', `/admin/words/${id}`, d),
  adminDeleteWord: (id)   => req('DELETE', `/admin/words/${id}`),
  adminGetUsers:   ()     => req('GET', '/admin/users'),
  adminStats:      ()     => req('GET', '/admin/stats'),
}
