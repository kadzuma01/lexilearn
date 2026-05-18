import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { LEVEL_COLORS, LevelCard, Spinner } from '../components/ui'

const LEVELS = ['A1','A2','B1','B2','C1','C2']

export default function Home() {
  const { user } = useAuth()
  const { t, levelName, lang, changeLang } = useLang()
  const nav = useNavigate()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProgress().then(setProgress).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const langs = ['ru','en','kz']

  return (
    <div className="app-shell">
      <div className="page" style={{ padding:'0 0 80px' }}>
        {/* Header */}
        <div style={{ padding:'20px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, lineHeight:1.2 }}>{t('learnEnglish')}</h1>
            <p style={{ color:'#888', fontSize:13, marginTop:4 }}>{t('appSubtitle')}</p>
          </div>
          {/* Language Toggle */}
          <div style={{ display:'flex', gap:4, background:'#1C1C1C', borderRadius:10, padding:3 }}>
            {langs.map(l => (
              <button key={l} onClick={() => changeLang(l)} style={{
                padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
                background: lang === l ? '#4A90E2' : 'transparent',
                color: lang === l ? '#fff' : '#888',
                fontSize:11, fontWeight:600, textTransform:'uppercase',
                transition:'all 0.2s',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Overall Progress Banner */}
        {progress && (
          <div style={{ margin:'16px 20px 0', background:'linear-gradient(135deg,#4A90E218,#7B5EA718)', border:'1px solid #4A90E230', borderRadius:16, padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:13, color:'#A0A0A0' }}>{t('overallProgress')}</span>
              <span style={{ fontSize:18, fontWeight:700, color:'#4A90E2' }}>{progress.overall.percentage}%</span>
            </div>
            <div style={{ background:'#2E2E2E', borderRadius:6, height:6, overflow:'hidden' }}>
              <div style={{
                width:`${progress.overall.percentage}%`, height:'100%',
                background:'linear-gradient(90deg,#4A90E2,#7B5EA7)',
                borderRadius:6, transition:'width 0.8s ease',
              }} />
            </div>
            <div style={{ display:'flex', gap:16, marginTop:10 }}>
              {[
                { label: t('words'), val: progress.overall.learned + '/' + progress.overall.total },
                { label: t('sessions'), val: progress.stats.sessions },
                { label: t('accuracy'), val: progress.stats.accuracy + '%' },
              ].map(({ label, val }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{val}</div>
                  <div style={{ fontSize:10, color:'#666' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level Grid */}
        <div style={{ padding:'20px 20px 0' }}>
          <h3 style={{ marginBottom:14, color:'#A0A0A0', fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>
            {t('chooseLevel')}
          </h3>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {LEVELS.map(lv => {
                const lp = progress?.levels?.[lv]
                return (
                  <LevelCard
                    key={lv}
                    level={lv}
                    name={levelName(lv)}
                    subname={lp ? `${lp.learned}/${lp.total} ${t('words')}` : ''}
                    progress={lp?.learned || 0}
                    total={lp?.total || 0}
                    onClick={() => nav(`/level/${lv}`)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
