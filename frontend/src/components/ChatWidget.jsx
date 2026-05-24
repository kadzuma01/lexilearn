import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import './chat.css'

export default function ChatWidget() {
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [welcomeHintVisible, setWelcomeHintVisible] = useState(false)
  const [welcomeHintShown, setWelcomeHintShown] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('chat_welcome_shown') === '1'
  })
  const [toastCount, setToastCount] = useState(() => {
    if (typeof window === 'undefined') return 0
    return Number(sessionStorage.getItem('chat_toast_count') || '0')
  })
  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 620px)').matches
  })
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { left: 0, top: 0 }
    const saved = window.localStorage.getItem('chat_widget_position')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) {}
    }
    return { left: window.innerWidth - 76 - 20, top: window.innerHeight - 76 - 20 }
  })
  const [dragging, setDragging] = useState(false)
  const listRef = useRef(null)
  const pressTimerRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const draggedRef = useRef(false)

  const clampPosition = (pos) => {
    const width = window.innerWidth
    const height = window.innerHeight
    const maxLeft = Math.max(12, width - 76 - 12)
    const maxTop = Math.max(12, height - 76 - 12)
    return {
      left: Math.min(Math.max(12, pos.left), maxLeft),
      top: Math.min(Math.max(12, pos.top), maxTop),
    }
  }

  useEffect(() => { if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [open, messages])
  useEffect(() => {
    if (!user) {
      setMessages([])
      return
    }

    let cancelled = false
    api.chatHistory()
      .then(data => {
        if (cancelled) return
        setMessages(Array.isArray(data.messages) ? data.messages : [])
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 620px)')
    const handler = (event) => setIsSmallScreen(event.matches)
    if (media.addEventListener) media.addEventListener('change', handler)
    else media.addListener(handler)
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', handler)
      else media.removeListener(handler)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setPosition(p => clampPosition(p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    localStorage.setItem('chat_widget_position', JSON.stringify(position))
  }, [position])

  useEffect(() => {
    if (open || isSmallScreen || welcomeHintShown) return
    const showTimer = window.setTimeout(() => {
      setWelcomeHintVisible(true)
      setWelcomeHintShown(true)
      window.localStorage.setItem('chat_welcome_shown', '1')
    }, 1200)
    const hideTimer = window.setTimeout(() => {
      setWelcomeHintVisible(false)
    }, 5600)
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [isSmallScreen, open, welcomeHintShown])

  useEffect(() => {
    if (open || isSmallScreen || toastCount >= 2) return
    setToastVisible(true)
    const hideTimer = window.setTimeout(() => {
      setToastVisible(false)
      const nextCount = toastCount + 1
      setToastCount(nextCount)
      sessionStorage.setItem('chat_toast_count', String(nextCount))
    }, 4200)
    return () => window.clearTimeout(hideTimer)
  }, [location.pathname, open, isSmallScreen, toastCount])

  const startDrag = (clientX, clientY) => {
    dragOffsetRef.current = {
      x: clientX - position.left,
      y: clientY - position.top,
    }
    setDragging(true)
  }

  const stopDrag = () => {
    setDragging(false)
    draggedRef.current = false
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    draggedRef.current = false
    pressTimerRef.current = window.setTimeout(() => {
      startDrag(e.clientX, e.clientY)
    }, 280)
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    e.preventDefault()
    draggedRef.current = true
    setPosition(clampPosition({
      left: e.clientX - dragOffsetRef.current.x,
      top: e.clientY - dragOffsetRef.current.y,
    }))
  }

  const cancelPress = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const onPointerUp = () => {
    cancelPress()
    if (dragging) {
      stopDrag()
      return
    }
    if (!draggedRef.current) {
      setOpen(o => !o)
    }
  }

  const onPointerCancel = () => {
    cancelPress()
    if (dragging) stopDrag()
  }

  const send = async () => {
    const text = input.trim()
    if (!text || !user) return
    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const data = await api.chatSend(text)
      const reply = data.reply || 'Извините, я не смог ответить на этот запрос.'
      setMessages(m => [...m, { id: Date.now() + 1, role: 'assistant', text: reply }])
    } catch (e) {
      const msg = (e && e.message) ? e.message : 'Ошибка соединения с сервером. Попробуйте позже.'
      setMessages(m => [...m, { id: Date.now() + 1, role: 'assistant', text: msg }])
    } finally {
      setLoading(false)
    }
  }

  const clear = async () => {
    if (!user) return
    try {
      await api.chatClear()
      setMessages([])
    } catch (e) {
      console.error('Не удалось очистить чат', e)
    }
  }

  return (
    <div className={"chat-widget" + (open ? ' open' : '')} style={{ left: position.left, top: position.top }}>
      <div className={"chat-toast" + ((toastVisible || welcomeHintVisible) ? ' visible' : '')}>
        {welcomeHintVisible ? 'Новый пользователь? Нажмите на 💬, чтобы открыть помощника.' : 'Нужна помощь? нажми 💬'}
      </div>

      <div className={"chat-toggle" + (dragging ? ' dragging' : '')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        aria-label="Toggle chat">
        {open ? '✕' : '💬'}
      </div>

      <div className="chat-panel" role="dialog" aria-hidden={!open}>
        <div className="chat-header">
          <div className="chat-title">Mini Assistant</div>
          <div className="chat-actions">
            <button className="chat-btn" onClick={clear} title="Clear">🗑️</button>
          </div>
        </div>

        <div className="chat-list" ref={listRef}>
          {!user && <div className="chat-empty">Войдите, чтобы использовать чат-помощника.</div>}
          {user && messages.length === 0 && <div className="chat-empty">Hi — ask me something about the app.</div>}
          {messages.map(m => (
            <div key={m.id} className={"chat-msg " + (m.role === 'user' ? 'user' : 'assistant')}>
              <div className="chat-text">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder={user ? 'Type a message...' : 'Login to chat...' }
            disabled={!user}
          />
          <button className="chat-send" onClick={send} disabled={loading || !user}>{loading ? '…' : 'Send'}</button>
        </div>
      </div>
    </div>
  )
}
