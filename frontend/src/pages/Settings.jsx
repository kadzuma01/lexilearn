import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { BackButton, Toast } from '../components/ui'

export default function Settings() {
  const { logout, refreshUser } = useAuth()
  const { t, lang, changeLang } = useLang()
  const nav = useNavigate()
  const [view, setView] = useState('main') // main | password | learning
  const [toast, setToast] = useState(null)
  const [settings, setSettings] = useState({ flashcard_count: 20, language: 'ru' })
  const [pw, setPw] = useState({ old: '', new: '', repeat: '' })
  const [pwError, setPwError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwDialog, setShowPwDialog] = useState(false)

  useEffect(() => {
    api.getSettings().then(s => { setSettings(s); changeLang(s.language) }).catch(() => {})
  }, [])

  const saveSettings = async () => {
    setLoading(true)
    try {
      await api.saveSettings({ ...settings, language: lang })
      changeLang(lang)
      setToast(t('save') + ' ✓')
    } catch (e) { setToast(e.message) }
    finally { setLoading(false) }
  }

  const changePassword = async () => {
    setPwError('')
    if (!pw.old || !pw.new || !pw.repeat) { setPwError(t('errorRequired')); return }
    if (pw.new.length < 4) { setPwError(t('errorShort')); return }
    if (pw.new !== pw.repeat) { setPwError(t('errorMismatch')); return }
    setLoading(true)
    try {
      await api.changePassword({ old_password: pw.old, new_password: pw.new })
      setShowPwDialog(true)
      setPw({ old:'', new:'', repeat:'' })
    } catch (e) { setPwError(e.message) }
    finally { setLoading(false) }
  }

  const handleLogout = async () => {
    await logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingBottom:80 }}>
        <div style={{ padding:'20px 20px 0' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
            {view !== 'main' && <BackButton onClick={() => setView('main')} />}
            <h2 style={{ fontSize:22, fontWeight:800 }}>
              {view === 'main' ? t('settings') : view === 'password' ? t('changePassword') : t('learningSettings')}
            </h2>
          </div>

          {view === 'main' && (
            <div style={{ display:'flex', flexDirection:'column', gap:0, background:'#1C1C1C', borderRadius:20, overflow:'hidden' }}>
              <SettingsRow icon="🔑" label={t('changePassword')} onClick={() => setView('password')} />
              <SettingsRow icon="🎓" label={t('learningSettings')} onClick={() => setView('learning')} />
              <SettingsRow icon="🌐" label={t('language')} onClick={() => {}} noArrow
                right={
                  <div style={{ display:'flex', gap:4 }}>
                    {['ru','en','kz'].map(l => (
                      <button key={l} onClick={() => { changeLang(l); api.saveSettings({ language: l }).catch(()=>{}) }} style={{
                        padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer',
                        background: lang===l ? '#4A90E2' : '#2E2E2E',
                        color: lang===l ? '#fff' : '#888', fontSize:11, fontWeight:600, textTransform:'uppercase',
                      }}>{l}</button>
                    ))}
                  </div>
                }
              />
              <SettingsRow icon="🚪" label={t('logout')} onClick={handleLogout} danger />
            </div>
          )}

          {view === 'password' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <input className="input" type="password" placeholder={t('oldPassword')}
                value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} />
              <input className="input" type="password" placeholder={t('newPassword')}
                value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))} />
              <input className="input" type="password" placeholder={t('repeatPassword')}
                value={pw.repeat} onChange={e => setPw(p => ({ ...p, repeat: e.target.value }))} />
              {pwError && <div style={{ color:'#F44336', fontSize:13, background:'#F4433618', padding:'10px 14px', borderRadius:10 }}>{pwError}</div>}
              <button className="btn btn-primary" onClick={changePassword} disabled={loading} style={{ marginTop:4 }}>
                {loading ? '...' : t('save')}
              </button>
            </div>
          )}

          {view === 'learning' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'#1C1C1C', borderRadius:16, padding:'20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <span style={{ fontSize:14, color:'#A0A0A0' }}>{t('flashcardCount')}</span>
                  <span style={{ fontSize:22, fontWeight:800, color:'#4A90E2' }}>{settings.flashcard_count}</span>
                </div>
                <input type="range" min="5" max="50" step="5"
                  value={settings.flashcard_count}
                  onChange={e => setSettings(p => ({ ...p, flashcard_count: +e.target.value }))}
                  style={{ width:'100%', accentColor:'#4A90E2' }}
                />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, color:'#666', fontSize:12 }}>
                  <span>5</span><span>50</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveSettings} disabled={loading}>
                {loading ? '...' : t('save')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password changed dialog */}
      {showPwDialog && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 }}>
          <div style={{ background:'#1C1C1C', border:'1px solid #2E2E2E', borderRadius:20, padding:'32px 28px', textAlign:'center', maxWidth:420, width:'100%', animation:'fadeIn 0.3s ease' }}>
            <div style={{ fontSize:44, marginBottom:16 }}>✅</div>
            <h3 style={{ marginBottom:8 }}>{t('passwordChanged')}</h3>
            <button className="btn btn-primary" onClick={() => { setShowPwDialog(false); setView('main') }} style={{ marginTop:16 }}>
              OK
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <BottomNav />
    </div>
  )
}

function SettingsRow({ icon, label, onClick, danger, noArrow, right }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', background:'none', border:'none', borderBottom:'1px solid #252525',
      padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
      color: danger ? '#F44336' : '#fff', cursor:'pointer', textAlign:'left', fontSize:15,
    }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
      {right || (!noArrow && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ))}
    </button>
  )
}
