import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function Login() {
  const { login } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()
  const [form, setForm] = useState({ login: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.login || !form.password) { setError(t('errorRequired')); return }
    setLoading(true); setError('')
    try {
      await login(form)
      nav('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', padding: 24, background:'#0D0D0D' }}>
      <div className="fade-in" style={{ width:'100%', maxWidth:560, margin:'0 auto' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{
            width:64, height:64, borderRadius:18,
            background:'linear-gradient(135deg,#4A90E2,#7B5EA7)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', fontSize:28,
          }}>📚</div>
          <h1 style={{ fontSize:26, marginBottom:6 }}>{t('login')}</h1>
          <p style={{ color:'#888', fontSize:13 }}>{t('loginSubtitle')}</p>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <input
              className="input"
              placeholder={t('loginField')}
              value={form.login}
              onChange={e => setForm(p => ({ ...p, login: e.target.value }))}
              autoComplete="username"
            />
          </div>
          <div style={{ position:'relative' }}>
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder={t('password')}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              autoComplete="current-password"
              style={{ paddingRight: 48 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{
              position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:'#888', padding:4,
            }}>
              {showPw
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
              }
            </button>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Link to="/forgot-password" style={{ color:'#4A90E2', fontSize:13, textDecoration:'none' }}>
              {t('forgotLink')}
            </Link>
          </div>

          {error && (
            <div style={{ background:'#F4433618', border:'1px solid #F4433640', borderRadius:10, padding:'10px 14px', color:'#F44336', fontSize:13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop:4 }}>
            {loading ? '...' : t('logIn')}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:24, color:'#888', fontSize:14 }}>
          {t('noAccount')}{' '}
          <Link to="/register" style={{ color:'#4A90E2', textDecoration:'none', fontWeight:600 }}>
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  )
}
