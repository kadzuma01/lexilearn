import requests

s = requests.Session()
base = 'http://127.0.0.1:5000/api'
login_payload = {'login': 'test_chat_user', 'password': 'pass1234'}
print('Logging in...')
r = s.post(base + '/auth/login', json=login_payload)
print('login', r.status_code, r.text)
print('Posting chat...')
r2 = s.post(base + '/chat', json={'message': 'Привет'})
print('chat', r2.status_code, r2.text)
