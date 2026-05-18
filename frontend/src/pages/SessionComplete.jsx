import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { LEVEL_COLORS, Spinner } from '../components/ui'

export default function SessionComplete() {
  const { sessionId } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { t } = useLang()

  const mode = params.get('mode') || 'flashcard'
  const level = params.get('level') || 'A1'
  const pct = params.get('pct')

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showWords, setShowWords] = useState(false)
  const color = LEVEL_COLORS[level] || '#4A90E2'
  const isQuiz = mode === 'quiz'

  useEffect(() => {
    api.getSession(sessionId).then(setSession).catch(() => {}).finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0D0D0D' }}>
        <Spinner size={36} />
      </div>
    )
  }

  const correct = session?.correct || 0
  const incorrect = session?.incorrect || 0
  const total = correct + incorrect
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

  const scoreColor = percentage >= 80 ? '#4CAF50' : percentage >= 50 ? '#FFC107' : '#F44336'

  return (
    <div className="app-shell">
      <div className="page fade-in" style={{ paddingBottom:80, minHeight:'100dvh' }}>
        <div style={{ padding:'20px 20px 0' }}>
          {/* Title */}
          <div style={{ textAlign:'center', padding:'32px 0 24px' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>
              {percentage >= 80 ? '🏆' : percentage >= 50 ? '👍' : '💪'}
            </div>
            <h2 style={{ fontSize:24, marginBottom:6 }}>
              {isQuiz ? t('quizComplete') : t('sessionComplete')}
            </h2>
            {isQuiz && (
              <div style={{ fontSize:52, fontWeight:900, color:scoreColor, marginTop:8 }}>
                {percentage}%
              </div>
            )}
          </div>

          {/* Stats cards */}
          <div style={{ display:'flex', gap:12, marginBottom:20 }}>
            <div style={{
              flex:1, background:'#4CAF5018', border:'1.5px solid #4CAF5040',
              borderRadius:16, padding:'20px 16px', textAlign:'center',
            }}>
              <div style={{ fontSize:36, fontWeight:800, color:'#4CAF50' }}>{correct}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{t('correct')}</div>
            </div>
            <div style={{
              flex:1, background:'#F4433618', border:'1.5px solid #F4433640',
              borderRadius:16, padding:'20px 16px', textAlign:'center',
            }}>
              <div style={{ fontSize:36, fontWeight:800, color:'#F44336' }}>{incorrect}</div>
              <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{t('incorrect')}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            <button className="btn btn-primary" onClick={() => setShowWords(v => !v)}>
              {t('viewWords')}
            </button>
            <button className="btn btn-ghost" onClick={() => nav(`/level/${level}`)}>
              {isQuiz ? t('learnNewWords') : t('backToHome')}
            </button>
            <button className="btn btn-outline" onClick={() => nav('/')}>
              {t('backToHome')}
            </button>
          </div>

          {/* Word list */}
          {showWords && session?.words && (
            <div style={{ animation:'slideUp 0.3s ease' }}>
              <h3 style={{ marginBottom:12, color:'#A0A0A0', fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>
                {t('sessionWords')} ({total})
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                {session.words.map((w, i) => (
                  <div key={i} style={{
                    background:'#1C1C1C', borderRadius:12, padding:'12px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    borderLeft:`3px solid ${w.correct ? '#4CAF50' : '#F44336'}`,
                  }}>
                    <div>
                      <div style={{ fontWeight:600, color:'#fff', fontSize:15 }}>{w.word}</div>
                      <div style={{ color:'#888', fontSize:13, marginTop:2 }}>{w.translation_ru}</div>
                    </div>
                    <span style={{ fontSize:18 }}>{w.correct ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline" onClick={() => setShowWords(false)} style={{ marginBottom:12 }}>
                {t('close')}
              </button>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
