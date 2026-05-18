import { useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 9.5L12 3L21 9.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
)
const BookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
)
const ChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export default function BottomNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const { t } = useLang()

  const tabs = [
    { path: '/',           icon: HomeIcon,  label: t('home') },
    { path: '/dictionary', icon: BookIcon,  label: t('dictionary') },
    { path: '/progress',   icon: ChartIcon, label: t('progress') },
    { path: '/profile',    icon: UserIcon,  label: t('profile') },
  ]

  const isActive = (path) => path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path)

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 1100,
      background: '#161616',
      borderTop: '1px solid #2E2E2E',
      display: 'flex', zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          onClick={() => nav(path)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4, padding: '10px 0',
            background: 'none', border: 'none', cursor: 'pointer',
            color: isActive(path) ? '#4A90E2' : '#6A6A6A',
            transition: 'color 0.2s',
          }}
        >
          <Icon />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
        </button>
      ))}
    </nav>
  )
}
