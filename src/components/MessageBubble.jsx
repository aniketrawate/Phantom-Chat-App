/**
 * MessageBubble.jsx — Individual Chat Message
 *
 * Renders a single chat message with:
 *   - Directional alignment (outgoing = right, incoming = left)
 *   - Timestamp display
 *   - Vanish mode: a countdown timer + animated progress bar that
 *     auto-deletes the message after the timer expires
 *   - Fade-out animation when the message is about to vanish
 *
 * IMPORTANT: The vanish timer and mode are "frozen" at mount time using refs.
 * This means if the user changes the vanish timer while this message is already
 * displayed, the existing message keeps its original countdown. Only new messages
 * will use the updated timer value.
 *
 * Props:
 *   @param {object}   message       - Message object: { id, text, direction ('in'|'out'), deliveredAt }
 *   @param {boolean}  vanishMode    - Whether vanish mode is currently enabled (frozen at mount)
 *   @param {number}   vanishSeconds - Seconds until the message vanishes (frozen at mount)
 *   @param {function} onVanish      - Callback fired with the message ID when the vanish timer expires
 */

import { useEffect, useState, useRef } from 'react'

export default function MessageBubble({ message, vanishMode, vanishSeconds, onVanish }) {
  // ── Frozen Values ────────────────────────────────────────────
  // Capture vanish settings at mount time so they never change for this message.
  // This prevents mid-countdown changes from breaking the timer logic.
  const frozenSeconds = useRef(vanishSeconds)
  const frozenMode = useRef(vanishMode)

  // ── Local State ──────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState(frozenSeconds.current) // Countdown display
  const [vanishing, setVanishing] = useState(false)   // True during the 300ms fade-out animation
  const intervalRef = useRef(null)    // Ref to the 1-second countdown interval
  const fadeTimerRef = useRef(null)   // Ref to the setTimeout that triggers the fade-out

  /**
   * Vanish Timer Effect — runs once on mount (empty dependency array).
   *
   * If vanish mode is enabled, this sets up two things:
   *   1. A 1-second interval that counts down `secondsLeft` for the progress bar
   *   2. A setTimeout that triggers the fade-out animation 300ms before
   *      the message is removed, so the CSS transition has time to play
   *
   * Both timers are cleaned up on unmount to prevent memory leaks.
   */
  useEffect(() => {
    // Skip if vanish mode was OFF when this message was created
    if (!frozenMode.current) return

    // 1. Countdown interval — ticks every second to update the progress bar
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // 2. Fade-out trigger — starts the opacity/scale transition 300ms before removal
    //    After the 300ms animation completes, the message is removed from state via onVanish
    fadeTimerRef.current = setTimeout(() => {
      setVanishing(true) // Triggers CSS fade-out (opacity-0, scale-95)
      setTimeout(() => onVanish && onVanish(message.id), 300) // Remove after animation
    }, (frozenSeconds.current * 1000) - 300)

    // Cleanup: clear both timers when the component unmounts
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(fadeTimerRef.current)
    }
  }, []) // ← empty deps: runs once at mount only

  // ── Derived Values ───────────────────────────────────────────
  const isOut = message.direction === 'out'                    // Is this an outgoing message?
  const isUrgent = secondsLeft <= 5 && frozenMode.current      // Less than 5 seconds left → turn red

  return (
    <div className={`flex flex-col max-w-[80%] gap-1 transition-all duration-300 ${
      isOut ? 'self-end items-end' : 'self-start items-start'   // Align right for sent, left for received
    } ${vanishing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}> {/* Fade-out animation */}

      {/* Message Bubble — styled differently for sent vs received messages */}
      <div className={`px-4 py-2.5 rounded text-sm leading-relaxed break-words ${
        isOut
          ? 'bg-zinc-900 border border-lime-400/20 text-zinc-100 rounded-br-none'   // Sent: lime accent border, no bottom-right radius
          : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-none'      // Received: neutral border, no bottom-left radius
      }`}>
        {message.text}
      </div>

      {/* Timestamp — shows the time the message was delivered in HH:MM format */}
      <p className="text-[10px] text-zinc-700 tracking-wide">
        {new Date(message.deliveredAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>

      {/* Vanish Progress Bar — only shown when vanish mode was ON at mount time */}
      {frozenMode.current && (
        <div className="flex items-center gap-2 w-full">
          {/* Progress bar track */}
          <div className="flex-1 h-px bg-zinc-800 rounded overflow-hidden">
            {/* Progress bar fill — shrinks linearly as time runs out
                Turns red when less than 5 seconds remain */}
            <div
              className={`h-full rounded ${isUrgent ? 'bg-red-500' : 'bg-lime-400'}`}
              style={{
                width: `${(secondsLeft / frozenSeconds.current) * 100}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>
          {/* Seconds remaining label */}
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
