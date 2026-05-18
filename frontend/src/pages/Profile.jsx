import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { Spinner } from '../components/ui'

export default function Profile() {
  const { user, logout } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProgress().then(setProgress).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await logout()
    nav('/login', { replace: true })
  }

  const avatarColor = { red:'#F44336', blue:'#4A90E2', green:'#4CAF50', yellow:'#FFC107', purple:'#7B5EA7', orange:'#FF9800' }
  const ac = avatarColor[user?.favorite_color] || '#4A90E2'

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingBottom:80 }}>
        <div style={{ padding:'24px 20px 0' }}>
          {/* Avatar & name */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
            <div style={{
              width:64, height:64, borderRadius:20,
              background: ac + '33', border:`2px solid ${ac}66`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:26, fontWeight:800, color:ac,
            }}>
              {user?.login?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 style={{ fontSize:20, fontWeight:800 }}>{user?.login}</h2>
              {user?.is_admin && (
                <span style={{ background:'#FF572220', color:'#FF5722', fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600 }}>Admin</span>
              )}
            </div>
            {user?.is_admin && (
              <button onClick={() => nav('/admin')} style={{
                marginLeft:'auto', background:'#FF572218', border:'1px solid #FF572240',
                borderRadius:10, padding:'8px 14px', color:'#FF5722', cursor:'pointer', fontSize:13,
              }}>
                ⚙️ Admin
              </button>
            )}
          </div>

          {/* Stats */}
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:32 }}><Spinner /></div>
          ) : progress && (
            <div style={{ background:'#1C1C1C', borderRadius:20, padding:'20px', marginBottom:20 }}>
              <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>{t('todayStats')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { icon:'📚', val: progress.overall.learned, label: t('words') },
                  { icon:'📅', val: progress.stats.sessions, label: t('sessions') },
                  { icon:'🎯', val: progress.stats.accuracy + '%', label: t('accuracy') },
                  { icon:'⏱', val: progress.stats.minutes + ' min', label: t('minutes') },
                ].map(({ icon, val, label }) => (
                  <div key={label} style={{ background:'#252525', borderRadius:12, padding:'14px', textAlign:'center' }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{val}</div>
                    <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div style={{ background:'#1C1C1C', borderRadius:20, overflow:'hidden', marginBottom:20 }}>
            {[
              { icon:'📊', label: t('progress'), action: () => nav('/progress') },
              { icon:'📖', label: t('dictionary'), action: () => nav('/dictionary') },
              { icon:'⚙️', label: t('settings'), action: () => nav('/settings') },
            ].map(({ icon, label, action }) => (
              <button key={label} onClick={action} style={{
                width:'100%', background:'none', border:'none', borderBottom:'1px solid #252525',
                padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                color:'#fff', cursor:'pointer', textAlign:'left', fontSize:15,
              }}>
                <span style={{ fontSize:18 }}>{icon}</span>
                <span style={{ flex:1 }}>{label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ))}
          </div>

          {/* Logout */}
          <button className="btn" onClick={handleLogout} style={{
            background:'#F4433618', border:'1.5px solid #F4433640', color:'#F44336',
          }}>
            {t('logout')}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
