import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { api } from '../api'
import { LEVEL_COLORS, LevelBadge, BackButton, Spinner, Toast } from '../components/ui'

const LEVELS = ['A1','A2','B1','B2','C1','C2']
const POS = ['noun','verb','adjective','adverb','interjection','conjunction','number']
const EMPTY = { word:'', translation_ru:'', translation_kz:'', definition:'', example:'', level:'A1', part_of_speech:'noun' }

export default function Admin() {
  const { user } = useAuth()
  const { t } = useLang()
  const nav = useNavigate()
  const [words, setWords] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [level, setLevel] = useState('ALL')
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | { mode:'add'|'edit', word }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersVisible, setUsersVisible] = useState(false)

  useEffect(() => {
    if (!user?.is_admin) { nav('/'); return }
    api.adminStats().then(setStats).catch(() => {})
  }, [])

  const fetchWords = useCallback(async (lvl, srch, pg) => {
    setLoading(true)
    try {
      const d = await api.adminGetWords({ level: lvl, search: srch, page: pg, per_page: 20 })
      if (pg === 1) setWords(d.words)
      else setWords(p => [...p, ...d.words])
      setTotal(d.total)
    } catch (e) {}
    finally { setLoading(false) }
  }, [])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await api.adminGetUsers()
      setUsers(res.users || [])
      setUsersVisible(true)
    } catch (e) {
      setToast(e.message)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchWords(level, search, 1) }, 300)
    return () => clearTimeout(timer)
  }, [level, search, fetchWords])

  const openAdd = () => { setForm(EMPTY); setModal({ mode:'add' }) }
  const openEdit = (w) => { setForm({ ...w }); setModal({ mode:'edit', word: w }) }

  const save = async () => {
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        await api.adminCreateWord(form)
        setToast('Word added ✓')
      } else {
        await api.adminUpdateWord(modal.word.id, form)
        setToast('Word updated ✓')
      }
      setModal(null)
      setPage(1)
      fetchWords(level, search, 1)
      api.adminStats().then(setStats).catch(() => {})
    } catch (e) { setToast(e.message) }
    finally { setSaving(false) }
  }

  const deleteWord = async (id) => {
    try {
      await api.adminDeleteWord(id)
      setWords(w => w.filter(x => x.id !== id))
      setTotal(t => t - 1)
      setDeleteConfirm(null)
      setToast('Deleted ✓')
      api.adminStats().then(setStats).catch(() => {})
    } catch (e) { setToast(e.message) }
  }

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="app-shell" style={{ background:'#0D0D0D', minHeight:'100dvh' }}>
      <div style={{ paddingBottom:24 }}>
        {/* Header */}
        <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid #2E2E2E', display:'flex', alignItems:'center', gap:10 }}>
          <BackButton onClick={() => nav('/')} />
          <h2 style={{ fontSize:20, fontWeight:800 }}>{t('admin')}</h2>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { label: t('totalUsers'), val: stats.total_users, icon:'👤' },
              { label: t('totalWords'), val: stats.total_words, icon:'📚' },
              { label: t('totalSessions'), val: stats.total_sessions, icon:'🎯' },
            ].map(({ label, val, icon }) => (
              <div key={label} style={{ background:'#1C1C1C', borderRadius:14, padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#4A90E2' }}>{val}</div>
                <div style={{ fontSize:10, color:'#888', marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div style={{ padding:'0 20px 16px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <button onClick={fetchUsers} className="btn btn-outline" style={{ width: 'auto', whiteSpace: 'nowrap' }} disabled={usersLoading}>
              {usersLoading ? 'Loading...' : t('showUsers')}
            </button>
            {usersVisible && (
              <button onClick={() => setUsersVisible(false)} className="btn btn-outline" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
                {t('hideUsers')}
              </button>
            )}
          </div>
        )}

        {/* Word counts by level */}
        {stats && (
          <div style={{ padding:'0 20px 16px', display:'flex', gap:6, flexWrap:'wrap' }}>
            {LEVELS.map(lv => (
              <div key={lv} style={{
                background: LEVEL_COLORS[lv] + '18', border:`1px solid ${LEVEL_COLORS[lv]}40`,
                borderRadius:10, padding:'4px 10px', display:'flex', alignItems:'center', gap:6,
              }}>
                <span style={{ fontSize:11, fontWeight:700, color: LEVEL_COLORS[lv] }}>{lv}</span>
                <span style={{ fontSize:11, color:'#888' }}>{stats.words_by_level[lv]}</span>
              </div>
            ))}
          </div>
        )}

        {usersVisible && (
          <div style={{ padding:'0 20px 20px', display:'grid', gap:10 }}>
            <div style={{ background:'#1C1C1C', borderRadius:14, padding:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:12 }}>Users</div>
              {users.length > 0 ? (
                <div style={{ display:'grid', gap:10 }}>
                  {users.map(u => (
                    <div key={u.id} style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, padding:12, borderRadius:12, background:'#101010', border:'1px solid #2E2E2E' }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{u.login}</div>
                        <div style={{ fontSize:12, color:'#888', marginTop:4 }}>
                          ID: {u.id} · Admin: {u.is_admin ? 'Yes' : 'No'} · Color: {u.favorite_color}
                        </div>
                        <div style={{ fontSize:12, color:'#666', marginTop:4 }}>Created: {new Date(u.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
                        <span style={{ fontSize:12, color:'#4A90E2', padding:'4px 10px', borderRadius:999, background:'#4A90E222' }}>
                          {u.is_admin ? 'ADMIN' : 'USER'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color:'#888', fontSize:13 }}>No users found.</div>
              )}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ padding:'0 20px 12px', display:'flex', gap:10 }}>
          <div style={{ position:'relative', flex:1 }}>
            <input className="input" placeholder={t('search')} value={search}
              onChange={e => setSearch(e.target.value)} style={{ background:'#1C1C1C', paddingLeft:36, fontSize:14 }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7" stroke="#666" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <select value={level} onChange={e => setLevel(e.target.value)} style={{
            background:'#1C1C1C', border:'1.5px solid #2E2E2E', borderRadius:12,
            color:'#fff', padding:'0 12px', fontSize:13, cursor:'pointer',
          }}>
            <option value="ALL">{t('all')}</option>
            {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
          </select>
          <button onClick={openAdd} style={{
            background:'#4A90E2', border:'none', borderRadius:12, padding:'0 16px',
            color:'#fff', cursor:'pointer', fontWeight:700, fontSize:13, whiteSpace:'nowrap',
          }}>+ {t('addWord')}</button>
        </div>

        {/* Word list */}
        <div style={{ padding:'0 20px' }}>
          {loading && page === 1 ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {words.map(w => (
                <div key={w.id} style={{ background:'#1C1C1C', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <LevelBadge level={w.level} size="sm" />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:2 }}>{w.word}</div>
                    <div style={{ fontSize:13, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {w.translation_ru} · {w.translation_kz}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(w)} style={{
                      background:'#4A90E218', border:'1px solid #4A90E240', borderRadius:8,
                      padding:'6px 12px', color:'#4A90E2', cursor:'pointer', fontSize:12,
                    }}>Edit</button>
                    <button onClick={() => setDeleteConfirm(w)} style={{
                      background:'#F4433618', border:'1px solid #F4433640', borderRadius:8,
                      padding:'6px 12px', color:'#F44336', cursor:'pointer', fontSize:12,
                    }}>Del</button>
                  </div>
                </div>
              ))}
              {words.length < total && (
                <button className="btn btn-outline" onClick={() => { const np=page+1; setPage(np); fetchWords(level, search, np) }} disabled={loading} style={{ marginTop:4 }}>
                  Load more ({total - words.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200, overflowY:'auto', padding:'20px 0' }}>
          <div style={{ background:'#1C1C1C', margin:'0 auto', maxWidth:780, borderRadius:20, padding:'24px 20px', minHeight:400 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:18 }}>{modal.mode==='add' ? t('addWord') : t('editWord')}</h3>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <input className="input" placeholder={t('wordEn')} value={form.word} onChange={set('word')} />
              <input className="input" placeholder={t('translationRu')} value={form.translation_ru} onChange={set('translation_ru')} />
              <input className="input" placeholder={t('translationKz')} value={form.translation_kz} onChange={set('translation_kz')} />
              <input className="input" placeholder={t('definition')} value={form.definition} onChange={set('definition')} />
              <input className="input" placeholder={t('example')} value={form.example} onChange={set('example')} />
              <div style={{ display:'flex', gap:10 }}>
                <select value={form.level} onChange={set('level')} style={{ flex:1, background:'#252525', border:'1.5px solid #2E2E2E', borderRadius:12, color:'#fff', padding:'13px 14px', fontSize:14 }}>
                  {LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                </select>
                <select value={form.part_of_speech} onChange={set('part_of_speech')} style={{ flex:1, background:'#252525', border:'1.5px solid #2E2E2E', borderRadius:12, color:'#fff', padding:'13px 14px', fontSize:14 }}>
                  {POS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button className="btn btn-outline" onClick={() => setModal(null)} style={{ flex:1 }}>{t('cancel')}</button>
                <button className="btn btn-primary" onClick={save} disabled={saving || !form.word || !form.translation_ru} style={{ flex:2 }}>
                  {saving ? '...' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ background:'#1C1C1C', borderRadius:20, padding:'28px 24px', maxWidth:420, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:16 }}>🗑️</div>
            <h3 style={{ marginBottom:8 }}>{t('confirmDelete')}</h3>
            <p style={{ color:'#888', fontSize:14, marginBottom:24 }}>"{deleteConfirm.word}"</p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)} style={{ flex:1 }}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={() => deleteWord(deleteConfirm.id)} style={{ flex:1 }}>{t('deleteWord')}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
