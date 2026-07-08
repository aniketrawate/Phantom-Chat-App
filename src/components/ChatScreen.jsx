/**
 * ChatScreen.jsx — Main Chat Interface
 *
 * Displayed after a successful P2P connection is established.
 * This component is responsible for:
 *   - Rendering the list of messages (using MessageBubble)
 *   - Providing a textarea input to compose and send new messages
 *   - Showing vanish-mode controls (toggle + timer) in the header
 *   - Providing a LEAVE button to disconnect from the peer
 *   - Auto-scrolling to the latest message
 *
 * Props:
 *   @param {Array}    messages       - Array of message objects: { id, text, direction, deliveredAt }
 *   @param {string}   status         - 'connected' | 'disconnected'
 *   @param {function} onSend         - Called with the message text when the user sends a message.
 *   @param {function} onDisconnect   - Called when the user clicks the LEAVE button.
 *   @param {function} onRemoveMessage - Called with a message ID to remove a vanished message from state.
 *   @param {function} sendVanishSync - Called to broadcast vanish mode/timer changes to the peer.
 *   @param {object}   vanishSync     - Latest vanish settings received from the peer: { vanishMode, vanishSeconds }
 */

import { useState, useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatScreen({ messages, status, onSend, onDisconnect, onRemoveMessage, sendVanishSync, vanishSync }) {
  // ── Local State ──────────────────────────────────────────────
  const [input, setInput] = useState('')              // Current text in the message input
  const [vanishMode, setVanishMode] = useState(true)  // Whether vanish (auto-delete) mode is ON
  const [vanishSeconds, setVanishSeconds] = useState(15) // Seconds before a message vanishes
  const messagesEndRef = useRef(null)   // Invisible element at the bottom — used for auto-scroll
  const textareaRef = useRef(null)      // Ref to the textarea DOM node — used for auto-resize

  // ── Auto-scroll: whenever the messages array changes, scroll to the bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Sync vanish settings when the peer changes them.
   * `vanishSync` is updated by the usePeer hook when a 'vanish_sync'
   * message is received over the data channel.
   */
  useEffect(() => {
    if (!vanishSync) return
    setVanishMode(vanishSync.vanishMode)
    setVanishSeconds(vanishSync.vanishSeconds)
  }, [vanishSync])

  /**
   * Handle textarea input changes.
   * Also auto-resizes the textarea height up to a max of 120px,
   * so multi-line messages don't require manual resizing.
   */
  const handleInput = (e) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    ta.style.height = 'auto'                              // Reset height to recalculate
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px' // Grow up to 120px max
  }

  /**
   * Send the current message to the peer.
   * Clears the input and resets the textarea height after sending.
   */
  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  /**
   * Keyboard shortcut: press Enter to send (without Shift).
   * Shift+Enter inserts a newline instead.
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /**
   * Handle changes to the vanish timer input.
   * Clamps the value between 1 and 900 seconds, then syncs
   * the new timer value to the peer.
   */
  const handleTimerChange = (e) => {
    const val = Math.max(1, Math.min(900, parseInt(e.target.value) || 15))
    setVanishSeconds(val)
    sendVanishSync(vanishMode, val)
  }

  return (
    <div className="min-h-dvh w-full bg-black flex flex-col">

      {/* ── Header Bar ─────────────────────────────────────────── */}
      {/* Contains: app name, vanish mode controls, and the LEAVE button */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <h1 className="text-lg font-black tracking-tighter text-lime-400">PHANTOM</h1>

        <div className="flex items-center gap-3">
          {/* Vanish Mode Controls — toggle switch + timer input */}
          <div className="flex items-center gap-2 bg-black border border-zinc-800 rounded px-3 py-1.5">
            <span className="text-[9px] text-zinc-600 tracking-widest uppercase">Vanish</span>

            {/* Toggle Switch — turns vanish mode on/off and syncs the change to the peer */}
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
              {/* Toggle Knob — slides left/right based on vanish mode state */}
              <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                vanishMode ? 'left-4 bg-lime-400' : 'left-0.5 bg-zinc-600'
              }`} />
            </button>

            {/* Timer Input — only shown when vanish mode is ON */}
            {vanishMode && (
              <>
                <input
                  type="number"
                  value={vanishSeconds}
                  onChange={handleTimerChange}
                  min={1}
                  max={900}
                  className="w-15 bg-transparent text-lime-400 font-mono text-xs text-center outline-none border border-zinc-800 rounded px-1 py-0.5"
                />
                <span className="text-[9px] text-zinc-600">s</span>
              </>
            )}
          </div>

          {/* Leave Button — disconnects from the peer and returns to JoinScreen */}
          <button
            onClick={onDisconnect}
            className="text-[9px] text-red-700 border border-red-800 rounded px-2 py-1.5 tracking-widest uppercase hover:border-red-900 hover:text-red-600 transition-colors"
          >
            LEAVE
          </button>
        </div>
      </div>

      {/* ── Messages Area ──────────────────────────────────────── */}
      {/* Scrollable container for all chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Connection banner — always shown at the top of the chat */}
        <p className="text-center text-[10px] text-lime-400/60 tracking-widest uppercase">
          — connected · zero trace —
        </p>

        {/* Disconnection notice — shown when the other peer has left */}
        {status === 'disconnected' && (
          <p className="text-center text-[10px] text-zinc-600 tracking-widest uppercase">
            — other person left · all traces removed —
          </p>
        )}

        {/* Render each message as a MessageBubble component */}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}             // The message object ({ id, text, direction, deliveredAt })
            vanishMode={vanishMode}    // Whether vanish mode is currently enabled
            vanishSeconds={vanishSeconds}  // How many seconds before the message vanishes
            onVanish={onRemoveMessage}    // Callback to remove the message after it vanishes
          />
        ))}

        {/* Invisible scroll anchor — scrollIntoView() targets this element */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ─────────────────────────────────────────── */}
      {/* Textarea for composing messages + send button */}
      <div className="flex items-end gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex-shrink-0">
        {/* Auto-resizing textarea — grows with content up to 120px */}
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
        {/* Send Button — paper plane icon, disabled when input is empty or disconnected */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || status === 'disconnected'}
          className="w-10 h-10 bg-lime-400 rounded flex items-center justify-center flex-shrink-0 hover:bg-lime-300 transition-colors disabled:bg-zinc-800 disabled:cursor-not-allowed"
        >
          {/* Paper plane SVG icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  )
}
