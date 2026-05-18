import { useEffect, useState } from 'react'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { LEVEL_COLORS, ProgressBar, Spinner } from '../components/ui'

const LEVELS = ['A1','A2','B1','B2','C1','C2']

export default function Progress() {
  const { t, levelName } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProgress().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const LEVEL_FULL_NAMES = {
    A1: 'Beginner', A2: 'Elementary',
    B1: 'Intermediate', B2: 'Upper Intermediate',
    C1: 'Advanced', C2: 'Proficiency',
  }

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingBottom:80 }}>
        <div style={{ padding:'24px 20px 0' }}>
          <h2 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>{t('progress')}</h2>
          <p style={{ color:'#888', fontSize:13, marginBottom:20 }}>{t('progressByLevel')}</p>

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>
          ) : !data ? (
            <div style={{ textAlign:'center', color:'#666', padding:40 }}>Failed to load</div>
          ) : (
            <>
              {/* Overall progress card */}
              <div style={{ background:'#1C1C1C', borderRadius:20, padding:'20px', marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{t('overallProgress')}</span>
                  <span style={{ fontSize:28, fontWeight:900, color:'#4A90E2' }}>{data.overall.percentage}%</span>
                </div>
                <div style={{ background:'#2E2E2E', borderRadius:8, height:10, overflow:'hidden', marginBottom:12 }}>
                  <div style={{
                    width:`${data.overall.percentage}%`, height:'100%',
                    background:'linear-gradient(90deg,#4A90E2,#7B5EA7)',
                    borderRadius:8, transition:'width 1s ease',
                  }} />
                </div>
                <div style={{ display:'flex', gap:6, fontSize:12, color:'#888' }}>
                  <span>📚 {data.overall.learned} / {data.overall.total} {t('words')}</span>
                </div>

                {/* Stats grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16 }}>
                  {[
                    { icon:'🎯', val: data.stats.accuracy + '%', label: t('accuracy') },
                    { icon:'📅', val: data.stats.sessions, label: t('sessions') },
                    { icon:'💬', val: data.stats.words_practiced, label: t('wordsPracticed') },
                    { icon:'⏱', val: data.stats.minutes + ' min', label: t('minutes') },
                  ].map(({ icon, val, label }) => (
                    <div key={label} style={{ background:'#252525', borderRadius:12, padding:'12px', textAlign:'center' }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                      <div style={{ fontSize:20, fontWeight:700, color:'#fff' }}>{val}</div>
                      <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress by level */}
              <h3 style={{ marginBottom:14, color:'#A0A0A0', fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>
                {t('progressByLevel')}
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                {LEVELS.map(lv => {
                  const lp = data.levels[lv]
                  const color = LEVEL_COLORS[lv]
                  return (
                    <div key={lv} style={{ background:'#1C1C1C', borderRadius:16, padding:'16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                        <div style={{
                          width:40, height:40, borderRadius:10,
                          background: color + '22', border:`1.5px solid ${color}44`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontWeight:800, fontSize:14, color,
                        }}>{lv}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>{LEVEL_FULL_NAMES[lv]}</div>
                          <div style={{ fontSize:12, color:'#888' }}>{levelName(lv)}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:18, fontWeight:800, color }}>{lp.percentage}%</div>
                          <div style={{ fontSize:11, color:'#666' }}>{lp.learned}/{lp.total}</div>
                        </div>
                      </div>
                      <ProgressBar value={lp.learned} max={lp.total} color={color} height={6} />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
