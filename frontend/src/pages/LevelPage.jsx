import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { LEVEL_COLORS, ProgressBar, BackButton, Spinner } from '../components/ui'

export default function LevelPage() {
  const { levelId } = useParams()
  const nav = useNavigate()
  const { t, levelName } = useLang()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizUnlocked, setQuizUnlocked] = useState(false)
  const color = LEVEL_COLORS[levelId] || '#4A90E2'

  useEffect(() => {
    api.getProgress().then(prog => {
      const lp = prog.levels?.[levelId]
      setProgress(lp)
      setQuizUnlocked(prog.stats.sessions > 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [levelId])

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingBottom: 80 }}>
        <div style={{ background:`linear-gradient(160deg, ${color}33 0%, #0D0D0D 60%)`, padding:'20px 20px 24px', borderBottom:'1px solid #2E2E2E' }}>
          <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
            <BackButton onClick={() => nav('/')} />
            <span style={{ color:'#888', fontSize:13, marginLeft:4 }}>{levelId}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:64, height:64, borderRadius:18, background:color+'33', border:`2px solid ${color}66`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:900, color }}>
              {levelId}
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800 }}>{levelId}</div>
              <div style={{ color:'#A0A0A0', fontSize:14 }}>{levelName(levelId)}</div>
            </div>
          </div>
          {progress && (
            <div style={{ marginTop:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'#888' }}>{t('progress')}</span>
                <span style={{ fontSize:12, color:'#888' }}>{progress.learned}/{progress.total}</span>
              </div>
              <ProgressBar value={progress.learned} max={progress.total} color={color} height={6} />
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>
        ) : (
          <div style={{ padding:'24px 20px' }}>
            <h3 style={{ marginBottom:16, color:'#A0A0A0', fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>
              {t('chooseMode')}
            </h3>

            <ModeCard icon="🃏" title={t('flashcards')} desc={t('flashcardsDesc')} color={color}
              onClick={() => nav(`/level/${levelId}/flashcards`)} />

            <div style={{ marginTop:12 }}>
              <ModeCard icon="🧠" title={t('quiz')} desc={quizUnlocked ? t('quizDesc') : t('completeFlashcardsFirst')}
                color={color} onClick={() => quizUnlocked && nav(`/level/${levelId}/quiz`)} locked={!quizUnlocked}
                lockHint={t('quizUnlockHint')} />
            </div>

            {progress && (
              <div style={{ marginTop:24, background:'#1C1C1C', borderRadius:16, padding:'16px 20px' }}>
                <div style={{ fontSize:13, color:'#888', marginBottom:12 }}>{t('progress')}</div>
                <div style={{ display:'flex', gap:12 }}>
                  {[
                    { val: progress.percentage+'%', label: t('learned') },
                    { val: progress.learned, label: t('words') },
                    { val: progress.total, label: t('totalWords') },
                  ].map((item, i) => (
                    <div key={i} style={{ flex:1, textAlign:'center' }}>
                      {i > 0 && <div style={{ position:'absolute' }} />}
                      <div style={{ fontSize:22, fontWeight:800, color: i===0 ? color : '#fff' }}>{item.val}</div>
                      <div style={{ fontSize:11, color:'#666' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

function ModeCard({ icon, title, desc, color, onClick, locked, lockHint }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', background:'#1C1C1C', border:`1.5px solid ${locked?'#2E2E2E':'#2E2E2E'}`,
      borderRadius:16, padding:'18px 20px', cursor: locked ? 'not-allowed' : 'pointer',
      textAlign:'left', display:'flex', alignItems:'center', gap:16,
      opacity: locked ? 0.6 : 1, transition:'all 0.2s',
    }}
      onMouseEnter={e => { if (!locked) { e.currentTarget.style.borderColor=color; e.currentTarget.style.background=color+'11' }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor='#2E2E2E'; e.currentTarget.style.background='#1C1C1C' }}
    >
      <div style={{ fontSize:32 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:13, color:'#888' }}>{desc}</div>
        {locked && lockHint && (
          <div style={{ marginTop:6, fontSize:11, color:'#FF9800', background:'#FF980018', borderRadius:6, padding:'3px 8px', display:'inline-block' }}>
            🔒 {lockHint}
          </div>
        )}
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 18l6-6-6-6" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  )
}
