import { useEffect, useState, useCallback } from 'react'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { LEVEL_COLORS, LevelBadge, Spinner, SpeakButton } from '../components/ui'

const LEVELS = ['ALL','A1','A2','B1','B2','C1','C2']

export default function Dictionary() {
  const { t, translation } = useLang()
  const [words, setWords] = useState([])
  const [total, setTotal] = useState(0)
  const [level, setLevel] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [showFilter, setShowFilter] = useState(false)

  const PER_PAGE = 50

  const fetchWords = useCallback(async (lvl, srch, pg) => {
    setLoading(true)
    try {
      const params = { level: lvl, search: srch, page: pg, per_page: PER_PAGE }
      const data = await api.getWords(params)
      if (pg === 1) setWords(data.words)
      else setWords(prev => [...prev, ...data.words])
      setTotal(data.total)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchWords(level, search, 1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, level, fetchWords])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchWords(level, search, nextPage)
  }

  return (
    <div className="app-shell">
      <div className="page" style={{ paddingBottom:80 }}>
        {/* Header */}
        <div style={{ padding:'20px 20px 0', position:'sticky', top:0, background:'#0D0D0D', zIndex:10, paddingBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <h2 style={{ fontSize:22, fontWeight:800 }}>{t('dictionary')}</h2>
              <span style={{ color:'#888', fontSize:12 }}>{total} {t('words')}</span>
            </div>
            <button onClick={() => setShowFilter(v => !v)} style={{
              background:'#1C1C1C', border:'1px solid #2E2E2E', borderRadius:10,
              padding:'8px 14px', color:'#fff', cursor:'pointer', fontSize:12,
              display:'flex', alignItems:'center', gap:6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {level === 'ALL' ? t('all') : level}
            </button>
          </div>

          {/* Search */}
          <div style={{ position:'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#666' }}>
              <circle cx="11" cy="11" r="7" stroke="#666" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input className="input" placeholder={t('search')} value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft:40, background:'#1C1C1C' }} />
          </div>
        </div>

        {/* Filter sheet */}
        {showFilter && (
          <>
            <div onClick={() => setShowFilter(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:50 }} />
            <div style={{
              position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)',
              width:'100%', maxWidth:720, background:'#1C1C1C',
              borderRadius:'20px 20px 0 0', padding:'20px 20px 28px', zIndex:51,
              animation:'slideUp 0.3s ease',
            }}>
              <div style={{ width:36, height:4, background:'#2E2E2E', borderRadius:2, margin:'0 auto 20px' }} />
              <h3 style={{ marginBottom:16, fontSize:15 }}>{t('filterByLevel')}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {LEVELS.map(lv => (
                  <button key={lv} onClick={() => { setLevel(lv); setShowFilter(false) }} style={{
                    background: level === lv ? (LEVEL_COLORS[lv] || '#4A90E2') + '22' : '#252525',
                    border: `1.5px solid ${level === lv ? (LEVEL_COLORS[lv] || '#4A90E2') + '66' : '#2E2E2E'}`,
                    borderRadius:12, padding:'13px 16px', color:'#fff', cursor:'pointer',
                    textAlign:'left', display:'flex', alignItems:'center', gap:12, fontSize:14,
                  }}>
                    {lv !== 'ALL' && (
                      <span style={{ width:10, height:10, borderRadius:'50%', background: LEVEL_COLORS[lv], flexShrink:0 }} />
                    )}
                    {lv === 'ALL' ? '● ' + t('all') : lv}
                    {level === lv && <span style={{ marginLeft:'auto', color:'#4A90E2' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Word list */}
        <div style={{ padding:'12px 20px 0' }}>
          {loading && page === 1 ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          ) : words.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#666' }}>
              No words found
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {words.map(word => (
                <WordItem key={word.id} word={word} t={t} translation={translation} />
              ))}
              {words.length < total && (
                <button className="btn btn-outline" onClick={loadMore} disabled={loading} style={{ marginTop:8 }}>
                  {loading ? '...' : `Load more (${total - words.length} remaining)`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

function WordItem({ word, t, translation }) {
  const [open, setOpen] = useState(false)
  const color = LEVEL_COLORS[word.level] || '#888'

  return (
    <div style={{
      background:'#1C1C1C', borderRadius:14, overflow:'hidden',
      borderLeft: `3px solid ${word.learned ? color : '#2E2E2E'}`,
      transition:'all 0.2s',
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width:'100%', background:'none', border:'none', cursor:'pointer',
        padding:'14px 16px', display:'flex', alignItems:'center', gap:12, textAlign:'left',
      }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{word.word}</span>
            <span style={{ fontSize:11, color:'#888', fontStyle:'italic' }}>{word.part_of_speech}</span>
          </div>
          <div style={{ fontSize:14, color:'#A0A0A0' }}>{translation(word)}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <LevelBadge level={word.level} size="sm" />
          {word.learned && <span style={{ fontSize:10, color:'#4CAF50' }}>✓</span>}
        </div>
      </button>

      {open && (
        <div style={{ padding:'0 16px 14px', borderTop:'1px solid #252525', animation:'fadeIn 0.2s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, marginTop:10 }}>
            <SpeakButton word={word.word} size={16} />
            <div>
              <div style={{ fontSize:12, color:'#888' }}>EN → RU</div>
              <div style={{ fontSize:14, color:'#fff' }}>{word.translation_ru}</div>
            </div>
            {word.translation_kz && (
              <div style={{ marginLeft:12 }}>
                <div style={{ fontSize:12, color:'#888' }}>EN → KZ</div>
                <div style={{ fontSize:14, color:'#fff' }}>{word.translation_kz}</div>
              </div>
            )}
          </div>
          {word.definition && (
            <div style={{ fontSize:13, color:'#A0A0A0', fontStyle:'italic', marginBottom:6 }}>
              📖 {word.definition}
            </div>
          )}
          {word.example && (
            <div style={{ fontSize:12, color:'#666', background:'#252525', borderRadius:8, padding:'8px 12px' }}>
              "{word.example}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
