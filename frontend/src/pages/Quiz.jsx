import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import { LEVEL_COLORS, BackButton, Spinner } from '../components/ui'

export default function Quiz() {
  const { levelId } = useParams()
  const nav = useNavigate()
  const { t } = useLang()
  const color = LEVEL_COLORS[levelId] || '#4A90E2'

  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const startTime = useRef(Date.now())

  useEffect(() => {
    api.getQuiz(levelId).then(data => { setQuestions(data); setLoading(false) }).catch(() => setLoading(false))
  }, [levelId])

  const current = questions[idx]
  const total = questions.length

  const handleSelect = async (option) => {
    if (selected !== null) return
    setSelected(option)

    const isCorrect = option === current.correct_answer
    const newResult = { word_id: current.word_id, correct: isCorrect }
    const newResults = [...results, newResult]

    await new Promise(r => setTimeout(r, 900))

    if (idx + 1 >= total) {
      try {
        const res = await api.quizResult({
          level: levelId,
          results: newResults,
          duration_seconds: Math.round((Date.now() - startTime.current) / 1000),
        })
        nav(`/session/${res.session_id}?mode=quiz&level=${levelId}&pct=${res.percentage}`, { replace: true })
      } catch (e) { console.error(e) }
    } else {
      setResults(newResults)
      setIdx(i => i + 1)
      setSelected(null)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0D0D0D' }}>
        <Spinner size={36} />
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0D0D0D', padding:24, gap:16 }}>
        <div style={{ fontSize:40 }}>😔</div>
        <p style={{ color:'#888' }}>No quiz questions available</p>
        <button className="btn btn-primary" onClick={() => nav(`/level/${levelId}`)} style={{ maxWidth:240 }}>Back</button>
      </div>
    )
  }

  const progress = (idx / total) * 100

  const getOptionStyle = (option) => {
    const base = {
      width:'100%', padding:'16px 18px', borderRadius:14, border:'1.5px solid',
      cursor: selected ? 'default' : 'pointer', textAlign:'left',
      fontSize:15, fontWeight:500, transition:'all 0.2s', fontFamily:'inherit',
    }
    if (selected === null) {
      return { ...base, background:'#1C1C1C', borderColor:'#2E2E2E', color:'#fff' }
    }
    if (option === current.correct_answer) {
      return { ...base, background:'#4CAF5022', borderColor:'#4CAF5099', color:'#4CAF50' }
    }
    if (option === selected && option !== current.correct_answer) {
      return { ...base, background:'#F4433622', borderColor:'#F4433699', color:'#F44336' }
    }
    return { ...base, background:'#1C1C1C', borderColor:'#2E2E2E', color:'#555' }
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0D0D0D', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 16px', display:'flex', alignItems:'center', gap:8 }}>
        <BackButton onClick={() => nav(`/level/${levelId}`)} />
        <span style={{ color, fontWeight:700, fontSize:15 }}>{levelId} {t('quiz')}</span>
        <span style={{ color:'#666', fontSize:13, marginLeft:'auto' }}>{idx+1}/{total}</span>
      </div>

      {/* Progress bar */}
      <div style={{ margin:'0 20px', background:'#2E2E2E', borderRadius:4, height:4, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.4s ease' }} />
      </div>

      {/* Dot indicators */}
      <div style={{ display:'flex', justifyContent:'center', gap:5, margin:'14px 0', flexWrap:'wrap', padding:'0 20px' }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            width: i < results.length ? 8 : i === idx ? 10 : 7,
            height: i < results.length ? 8 : i === idx ? 10 : 7,
            borderRadius:'50%',
            background: i < results.length
              ? (results[i].correct ? '#4CAF50' : '#F44336')
              : i === idx ? color : '#2E2E2E',
            transition:'all 0.3s',
          }} />
        ))}
      </div>

      {/* Question */}
      <div style={{ flex:1, padding:'20px 20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
        <div key={`q-${idx}`} style={{ animation:'fadeIn 0.3s ease' }}>
          <p style={{ color:'#888', fontSize:14, marginBottom:8 }}>{t('whatIsTranslation')}</p>
          <h2 style={{ fontSize:30, fontWeight:800, color:'#fff', marginBottom:4 }}>{current.word}</h2>
        </div>

        {/* Options */}
        <div key={`opts-${idx}`} style={{ display:'flex', flexDirection:'column', gap:10, animation:'slideUp 0.3s ease' }}>
          {current.options.map((option, i) => (
            <button key={i} onClick={() => handleSelect(option)} style={getOptionStyle(option)}>
              <span style={{ marginRight:10, opacity:0.5 }}>{String.fromCharCode(65+i)}.</span>
              {option}
              {selected && option === current.correct_answer && <span style={{ float:'right' }}>✓</span>}
              {selected && option === selected && option !== current.correct_answer && <span style={{ float:'right' }}>✗</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
