import { useEffect, useState } from 'react'

export const LEVEL_COLORS = {
  A1: '#4CAF50', A2: '#8BC34A',
  B1: '#FFC107', B2: '#FF9800',
  C1: '#FF5722', C2: '#F44336',
}

export function LevelBadge({ level, size = 'md' }) {
  const color = LEVEL_COLORS[level] || '#888'
  const sizes = { sm: { pad: '3px 8px', fs: 11 }, md: { pad: '5px 12px', fs: 13 }, lg: { pad: '8px 18px', fs: 16 } }
  const s = sizes[size] || sizes.md
  return (
    <span style={{
      background: color + '22', color: color,
      border: `1px solid ${color}55`,
      borderRadius: 8, padding: s.pad,
      fontSize: s.fs, fontWeight: 700, letterSpacing: 0.5,
    }}>{level}</span>
  )
}

export function LevelCard({ level, name, subname, onClick, progress, total }) {
  const color = LEVEL_COLORS[level] || '#888'
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [touchActive, setTouchActive] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 620px)')
    const update = (event) => setIsMobile(event.matches)
    update(media)
    if (media.addEventListener) media.addEventListener('change', update)
    else media.addListener(update)
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update)
      else media.removeListener(update)
    }
  }, [])
  
  return (
    <button onClick={onClick}
      className={
        `${isHovered ? 'level-card-hover' : 'level-card'}${isMobile && touchActive ? ' level-card-mobile-press' : ''}`
      }
      style={{
        background: color + '18',
        border: `1.5px solid ${color}40`,
        borderRadius: 14, padding: '16px',
        cursor: 'pointer', textAlign: 'left',
        transition: 'transform 0.15s, box-shadow 0.3s ease',
        display: 'flex', flexDirection: 'column', gap: 6,
        '--level-color': color,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onTouchStart={e => {
        setTouchActive(true)
        e.currentTarget.style.transform = 'scale(0.97)'
      }}
      onTouchEnd={e => {
        setTouchActive(false)
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onTouchCancel={() => setTouchActive(false)}
    >
      <span style={{ fontSize: 22, fontWeight: 800, color }}>{level}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{name}</span>
      {subname && <span style={{ fontSize: 11, color: '#888' }}>{subname}</span>}
      {total > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ background: '#ffffff18', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
          </div>
          <span style={{ fontSize: 10, color: '#888', marginTop: 2, display: 'block' }}>{progress}/{total}</span>
        </div>
      )}
    </button>
  )
}

export function ProgressBar({ value, max, color = '#4A90E2', height = 8 }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ background: '#2E2E2E', borderRadius: height, height, overflow: 'hidden', flex: 1 }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: color, borderRadius: height,
        transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  )
}

export function Spinner({ size = 24, color = '#4A90E2' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid #2E2E2E`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

export function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t) }, [])
  return <div className="toast">{message}</div>
}

export function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#fff', padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

export function SpeakButton({ word, size = 20 }) {
  const [speaking, setSpeaking] = useState(false)
  const speak = () => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(word)
    utt.lang = 'en-US'; utt.rate = 0.9
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }
  return (
    <button onClick={speak} style={{
      background: speaking ? '#4A90E222' : '#ffffff11',
      border: `1px solid ${speaking ? '#4A90E2' : '#2E2E2E'}`,
      borderRadius: 10, padding: '8px 10px',
      cursor: 'pointer', color: speaking ? '#4A90E2' : '#A0A0A0',
      display: 'flex', alignItems: 'center', transition: 'all 0.2s',
    }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        {speaking
          ? <path d="M19 5c2 2 2 12 0 14M15 8.5c1 1.5 1 5.5 0 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          : <path d="M15.5 8.5c1.5 1.5 1.5 5.5 0 7M19 5c2.5 3 2.5 11 0 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        }
      </svg>
    </button>
  )
}

// inject spinner keyframe and level card glow animation
const style = document.createElement('style')
style.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  
  @keyframes levelCardGlow {
    0% {
      box-shadow: 
        inset 0 0 0 1.5px var(--level-color),
        0 0 20px 0 var(--level-color),
        inset 0 0 5px 0 rgba(255, 255, 255, 0.1);
    }
    25% {
      box-shadow: 
        inset 0 0 0 1.5px var(--level-color),
        0 0 25px 3px var(--level-color),
        inset 0 0 10px 2px rgba(255, 255, 255, 0.15);
    }
    50% {
      box-shadow: 
        inset 0 0 0 1.5px var(--level-color),
        0 0 20px 0 var(--level-color),
        inset 0 0 5px 0 rgba(255, 255, 255, 0.1);
    }
    75% {
      box-shadow: 
        inset 0 0 0 1.5px var(--level-color),
        0 0 25px 3px var(--level-color),
        inset 0 0 10px 2px rgba(255, 255, 255, 0.15);
    }
    100% {
      box-shadow: 
        inset 0 0 0 1.5px var(--level-color),
        0 0 20px 0 var(--level-color),
        inset 0 0 5px 0 rgba(255, 255, 255, 0.1);
    }
  }

  @keyframes levelCardPressMobile {
    0% {
      transform: scale(0.97);
      box-shadow: 0 0 0 0 rgba(255,255,255,0);
    }
    50% {
      transform: scale(1.03);
      box-shadow: 0 14px 30px rgba(255,255,255,0.08);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255,255,255,0);
    }
  }
  .level-card-mobile-press {
    animation: levelCardPressMobile 0.28s ease-out;
  }
  
  .level-card-hover {
    animation: levelCardGlow 3s ease-in-out infinite;
  }
`;

document.head.appendChild(style)