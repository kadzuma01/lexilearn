import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import { LEVEL_COLORS, BackButton, SpeakButton, Spinner } from '../components/ui'

export default function Flashcards() {
  const { levelId } = useParams()
  const nav = useNavigate()
  const { t, translation } = useLang()
  const color = LEVEL_COLORS[levelId] || '#4A90E2'

  const [cards, setCards] = useState([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const [done, setDone] = useState(false)
  const startTime = useRef(Date.now())

  useEffect(() => {
    api.getFlashcards(levelId)
      .then(data => { setCards(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [levelId])

  const current = cards[idx]
  const total = cards.length
  const progress = total > 0 ? ((idx) / total) * 100 : 0

  const handleAnswer = useCallback(async (knew) => {
    const quality = knew ? 5 : 1
    const newResult = { word_id: current.id, quality }
    const newResults = [...results, newResult]
    setResults(newResults)

    if (idx + 1 >= total) {
      // Submit results
      try {
        const res = await api.flashcardResult({
          level: levelId,
          results: newResults,
          duration_seconds: Math.round((Date.now() - startTime.current) / 1000),
        })
        nav(`/session/${res.session_id}?mode=flashcard&level=${levelId}`, { replace: true })
      } catch (e) {
        console.error(e)
      }
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }, [current, idx, total, results, levelId, nav])

  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0D0D0D' }}>
        <Spinner size={36} />
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0D0D0D', padding:24, gap:16 }}>
        <div style={{ fontSize:40 }}>😔</div>
        <p style={{ color:'#888', textAlign:'center' }}>No words available for {levelId}</p>
        <button className="btn btn-primary" onClick={() => nav(`/level/${levelId}`)} style={{ maxWidth:240 }}>Back</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0D0D0D', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <BackButton onClick={() => nav(`/level/${levelId}`)} />
        <span style={{ color, fontWeight:700, fontSize:15 }}>{levelId} Quiz</span>
        <span style={{ color:'#666', fontSize:13, marginLeft:'auto' }}>{idx + 1}/{total}</span>
      </div>

      {/* Progress */}
      <div style={{ margin:'0 20px', background:'#2E2E2E', borderRadius:4, height:4, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.4s ease' }} />
      </div>

      {/* Dot indicators */}
      <div style={{ display:'flex', justifyContent:'center', gap:5, margin:'14px 0', flexWrap:'wrap', padding:'0 20px' }}>
        {cards.map((_, i) => (
          <div key={i} style={{
            width: i < results.length ? 8 : i === idx ? 10 : 7,
            height: i < results.length ? 8 : i === idx ? 10 : 7,
            borderRadius:'50%',
            background: i < results.length
              ? (results[i].quality >= 3 ? '#4CAF50' : '#F44336')
              : i === idx ? color : '#2E2E2E',
            transition:'all 0.3s',
          }} />
        ))}
      </div>

      {/* Card */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 20px 20px' }}>
        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            width:'100%', maxWidth:660,
            background:'#1C1C1C',
            border:`1.5px solid ${flipped ? color + '66' : '#2E2E2E'}`,
            borderRadius:24,
            padding:'40px 28px',
            cursor:'pointer',
            textAlign:'center',
            minHeight:220,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16,
            transition:'border-color 0.3s, transform 0.15s',
            boxShadow: flipped ? `0 0 30px ${color}22` : '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {!flipped ? (
            <div key={`front-${idx}`} style={{ animation:'fadeIn 0.3s ease' }}>
              <div style={{ fontSize:11, color:'#666', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
                {current.part_of_speech}
              </div>
              <div style={{ fontSize:36, fontWeight:800, color:'#fff', marginBottom:12 }}>
                {current.word}
              </div>
              <SpeakButton word={current.word} size={18} />
              <div style={{ marginTop:16, fontSize:12, color:'#555' }}>{t('tapToReveal')}</div>
            </div>
          ) : (
            <div key={`back-${idx}`} style={{ animation:'flipIn 0.25s ease' }}>
              <div style={{ fontSize:11, color:color, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                {current.word}
              </div>
              <div style={{ fontSize:34, fontWeight:800, color:'#fff', marginBottom:8 }}>
                {translation(current)}
              </div>
              {current.definition && (
                <div style={{ fontSize:13, color:'#888', fontStyle:'italic', marginTop:4, lineHeight:1.5 }}>
                  {current.definition}
                </div>
              )}
              {current.example && (
                <div style={{ fontSize:12, color:'#555', marginTop:8, lineHeight:1.5, borderTop:'1px solid #2E2E2E', paddingTop:10 }}>
                  "{current.example}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Answer buttons - only show after flip */}
        {flipped && (
          <div key={`btns-${idx}`} style={{ display:'flex', gap:12, marginTop:20, width:'100%', maxWidth:660, animation:'slideUp 0.25s ease' }}>
            <button
              onClick={() => handleAnswer(false)}
              style={{
                flex:1, padding:'14px', borderRadius:14,
                background:'#F4433618', border:'1.5px solid #F4433660',
                color:'#F44336', fontWeight:700, fontSize:15, cursor:'pointer',
                transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4433630' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F4433618' }}
            >
              ✗ {t('didntKnow')}
            </button>
            <button
              onClick={() => handleAnswer(true)}
              style={{
                flex:1, padding:'14px', borderRadius:14,
                background:'#4CAF5018', border:'1.5px solid #4CAF5060',
                color:'#4CAF50', fontWeight:700, fontSize:15, cursor:'pointer',
                transition:'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4CAF5030' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4CAF5018' }}
            >
              ✓ {t('knew')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
