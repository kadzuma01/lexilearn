import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'

export default function ForgotPassword() {
  const { t } = useLang()
  const nav = useNavigate()
  const [login, setLogin] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!login) return
    // Simulated reset (no email server in this demo)
    setSent(true)
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'#0D0D0D' }}>
      <div className="fade-in" style={{ width:'100%', maxWidth:560, margin:'0 auto' }}>
        <button onClick={() => nav(-1)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', marginBottom:24, display:'flex', alignItems:'center', gap:6, fontSize:14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Назад
        </button>

        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔑</div>
          <h1 style={{ fontSize:24, marginBottom:8 }}>{t('forgotPassword')}</h1>
          <p style={{ color:'#888', fontSize:13 }}>{t('forgotSubtitle')}</p>
        </div>

        {sent ? (
          <div className="fade-in" style={{ textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <p style={{ color:'#4CAF50', fontSize:16, marginBottom:24 }}>
              {t('lang') === 'kz' ? 'Нұсқаулар жіберілді!' : 'Инструкции отправлены!'}
            </p>
            <p style={{ color:'#888', fontSize:13, marginBottom:24 }}>
              (Demo mode: password reset not implemented — please contact admin)
            </p>
            <button className="btn btn-primary" onClick={() => nav('/login')}>
              {t('logIn')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <input
              className="input"
              placeholder={t('loginField')}
              value={login}
              onChange={e => setLogin(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={!login}>
              {t('resetPassword')}
            </button>
          </form>
        )}

        <p style={{ textAlign:'center', marginTop:24, color:'#888', fontSize:14 }}>
          {t('haveAccount')}{' '}
          <Link to="/login" style={{ color:'#4A90E2', textDecoration:'none', fontWeight:600 }}>{t('logIn')}</Link>
        </p>
      </div>
    </div>
  )
}
