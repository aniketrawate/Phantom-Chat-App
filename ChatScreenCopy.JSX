import { useState, useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatScreen({ messages, status, onSend, onDisconnect, onRemoveMessage, sendVanishSync, vanishSync }) {
  const [input, setInput] = useState('')
  const [vanishMode, setVanishMode] = useState(true)
  const [vanishSeconds, setVanishSeconds] = useState(15)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
  if (!vanishSync) return
  setVanishMode(vanishSync.vanishMode)
  setVanishSeconds(vanishSync.vanishSeconds)
}, [vanishSync])

  // Auto resize textarea as user types
  const handleInput = (e) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTimerChange = (e) => {
    const val = Math.max(1, Math.min(900, parseInt(e.target.value) || 15))
    setVanishSeconds(val)
    sendVanishSync(vanishMode, val)
  }

  return (
    <div className="h-screen bg-black flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">

        <h1 className="text-lg font-black tracking-tighter text-lime-400">
          PHANTOM
        </h1>

        <div className="flex items-center gap-3">

          {/* Vanish controls */}
          <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded px-3 py-1.5">
            <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
              Vanish
            </span>

            {/* Toggle */}
            <button
              onClick={() => {
                const newMode = !vanishMode
                setVanishMode(newMode)
                sendVanishSync(newMode, vanishSeconds)
              }}
              className={`w-8 h-4 rounded-full relative transition-colors ${
                vanishMode ? 'bg-lime-400/20 border border-lime-400/40' : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                vanishMode ? 'left-4 bg-lime-400' : 'left-0.5 bg-zinc-600'
              }`} />
            </button>

            {/* Timer input */}
            {vanishMode && (
              <>
                <input
                  type="number"
                  value={vanishSeconds}
                  onChange={handleTimerChange}
                  min={1}
                  max={900}
                  className="w-10 bg-transparent text-lime-400 font-mono text-xs text-center outline-none border border-zinc-800 rounded px-1 py-0.5"
                />
                <span className="text-[9px] text-zinc-600">s</span>
              </>
            )}
          </div>

          {/* Leave button */}
          <button
            onClick={onDisconnect}
            className="text-[9px] text-zinc-700 border border-zinc-800 rounded px-2 py-1.5 tracking-widest uppercase hover:border-red-900 hover:text-red-600 transition-colors"
          >
            LEAVE
          </button>

        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Connected system message */}
        <p className="text-center text-[10px] text-lime-400/60 tracking-widest uppercase">
          — connected · zero trace —
        </p>

        {status === 'disconnected' && (
          <p className="text-center text-[10px] text-zinc-600 tracking-widest uppercase">
            — other person left · all traces removed —
          </p>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            vanishMode={vanishMode}
            vanishSeconds={vanishSeconds}
            onVanish={() => onRemoveMessage(msg.id)}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-end gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="type a message..."
          rows={1}
          disabled={status === 'disconnected'}
          className="flex-1 bg-black border border-zinc-800 rounded px-4 py-2.5 text-zinc-100 font-mono text-sm placeholder-zinc-800 outline-none focus:border-zinc-700 resize-none transition-colors disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || status === 'disconnected'}
          className="w-10 h-10 bg-lime-400 rounded flex items-center justify-center flex-shrink-0 hover:bg-lime-300 transition-colors disabled:bg-zinc-800 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  )
}