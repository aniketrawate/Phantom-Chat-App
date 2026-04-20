import { useEffect, useState, useRef } from 'react'

export default function MessageBubble({ message, vanishMode, vanishSeconds, onVanish }) {
  // Capture timer value at mount — never changes after that
  const frozenSeconds = useRef(vanishSeconds)
  const frozenMode = useRef(vanishMode)

  const [secondsLeft, setSecondsLeft] = useState(frozenSeconds.current)
  const [vanishing, setVanishing] = useState(false)
  const intervalRef = useRef(null)
  const fadeTimerRef = useRef(null)

  useEffect(() => {
    if (!frozenMode.current) return

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    fadeTimerRef.current = setTimeout(() => {
      setVanishing(true)
      setTimeout(() => onVanish && onVanish(message.id), 300)
    }, (frozenSeconds.current * 1000) - 300)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(fadeTimerRef.current)
    }
  }, []) // ← empty deps: runs once at mount only

  const isOut = message.direction === 'out'
  const isUrgent = secondsLeft <= 5 && frozenMode.current

  return (
    <div className={`flex flex-col max-w-[80%] gap-1 transition-all duration-300 ${
      isOut ? 'self-end items-end' : 'self-start items-start'
    } ${vanishing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>

      <div className={`px-4 py-2.5 rounded text-sm leading-relaxed break-words ${
        isOut
          ? 'bg-zinc-900 border border-lime-400/20 text-zinc-100 rounded-br-none'
          : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-none'
      }`}>
        {message.text}
      </div>

      <p className="text-[10px] text-zinc-700 tracking-wide">
        {new Date(message.deliveredAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>

      {frozenMode.current && (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 h-px bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full rounded ${isUrgent ? 'bg-red-500' : 'bg-lime-400'}`}
              style={{
                width: `${(secondsLeft / frozenSeconds.current) * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
          <span className={`text-[9px] font-mono tabular-nums w-5 text-right ${
            isUrgent ? 'text-red-500' : 'text-zinc-700'
          }`}>
            {secondsLeft}s
          </span>
        </div>
      )}

    </div>
  )
}
