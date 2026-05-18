import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function Register() {
  const { register } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()
  const [form, setForm] = useState({ login: '', password: '', confirmPassword: '', favorite_color: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.login || !form.password) { setError(t('errorRequired')); return }
    if (form.password.length < 4) { setError(t('errorShort')); return }
    if (form.password !== form.confirmPassword) { setError(t('errorMismatch')); return }
    setLoading(true)
    try {
      await register({ login: form.login, password: form.password, favorite_color: form.favorite_color || 'blue' })
      nav('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'#0D0D0D' }}>
      <div className="fade-in" style={{ width:'100%', maxWidth:560, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:64, height:64, borderRadius:18,
            background:'linear-gradient(135deg,#4A90E2,#7B5EA7)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', fontSize:28,
          }}>📚</div>
          <h1 style={{ fontSize:26, marginBottom:6 }}>{t('register')}</h1>
          <p style={{ color:'#888', fontSize:13 }}>{t('registerSubtitle')}</p>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <input className="input" placeholder={t('loginField')} value={form.login} onChange={set('login')} autoComplete="username" />

          <div style={{ position:'relative' }}>
            <input className="input" type={showPw ? 'text' : 'password'} placeholder={t('password')}
              value={form.password} onChange={set('password')} autoComplete="new-password" style={{ paddingRight:48 }} />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{
              position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:'#888', padding:4
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                {showPw
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></>
                }
              </svg>
            </button>
          </div>

          <input className="input" type="password" placeholder={t('confirmPassword')}
            value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />

          <input className="input" placeholder={t('favoriteColor')}
            value={form.favorite_color} onChange={set('favorite_color')} />

          {error && (
            <div style={{ background:'#F4433618', border:'1px solid #F4433640', borderRadius:10, padding:'10px 14px', color:'#F44336', fontSize:13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop:4 }}>
            {loading ? '...' : t('signUp')}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:24, color:'#888', fontSize:14 }}>
          {t('haveAccount')}{' '}
          <Link to="/login" style={{ color:'#4A90E2', textDecoration:'none', fontWeight:600 }}>
            {t('logIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
