/**
 * JoinScreen.jsx — Landing / Connection Screen
 *
 * This is the first screen the user sees. It prompts them to enter a
 * "shared secret" — a passphrase that both peers must type in order
 * to find each other on the PeerJS signaling server.
 *
 * How the flow works:
 *   1. User types a secret into the password input.
 *   2. On clicking CONNECT (or pressing Enter), the `onConnect` callback
 *      is fired with the raw secret string.
 *   3. The parent (App.jsx) passes the secret to `usePeer.connect()`, which
 *      hashes it and uses the hash as a deterministic PeerJS peer ID.
 *   4. While connecting, the `status` prop updates to 'hashing' → 'waiting',
 *      and this component shows the appropriate status message + pulsing indicator.
 *
 * Props:
 *   @param {function} onConnect - Called with the secret string when the user clicks CONNECT.
 *   @param {string}   status   - Current connection status: 'idle' | 'hashing' | 'waiting' | 'error'.
 */

import { useState } from 'react'

export default function JoinScreen({ onConnect, status }) {
  // Local state for the secret input field
  const [secret, setSecret] = useState('')

  /**
   * Trigger the connection process.
   * Only fires if the secret is non-empty after trimming whitespace.
   */
  const handleConnect = () => {
    if (secret.trim()) {
      onConnect(secret)
    }
  }

  /**
   * Allow the user to press Enter to connect,
   * so they don't have to click the button.
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConnect()
  }

  // Disable inputs while the app is actively trying to connect
  const isLoading = status === 'hashing' || status === 'waiting'

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">

      {/* Logo — app branding with tagline */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-black tracking-tighter text-lime-400">
          PHANTOM
        </h1>
        <p className="text-xs text-zinc-600 tracking-widest uppercase mt-2">
          zero trace · peer to peer · ephemeral
        </p>
      </div>

      {/* Card — contains the secret input, status indicator, and connect button */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded p-6 flex flex-col gap-5">

        {/* Secret Input — masked password field for the shared passphrase */}
        <div>
          <p className="text-xs text-zinc-600 tracking-widest uppercase mb-2">
            Shared Secret
          </p>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="enter your shared secret..."
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
            className="w-full bg-black border border-zinc-800 rounded px-4 py-3 text-lime-400 font-mono text-sm tracking-widest placeholder-zinc-800 outline-none focus:border-lime-400 transition-colors disabled:opacity-50"
          />
        </div>

        {/* Status Indicator — small dot + text showing current connection state */}
        <div className="flex items-center gap-2 min-h-4">
          {/* Colored dot: grey = idle, yellow pulsing = connecting, red = error */}
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            status === 'idle'    ? 'bg-zinc-700' :
            status === 'waiting' || status === 'hashing' ? 'bg-yellow-500 animate-pulse' :
            status === 'error'  ? 'bg-red-500' : 'bg-zinc-700'
          }`} />
          {/* Status text — changes based on the current connection phase */}
          <p className="text-xs text-zinc-600">
            {status === 'idle'    && 'Enter your shared secret to connect'}
            {status === 'hashing' && 'Hashing secret...'}
            {status === 'waiting' && 'Waiting for the other person...'}
            {status === 'error'   && 'Could not connect. Check your secret and try again.'}
          </p>
        </div>

        {/* Connect Button — disabled when secret is empty or connection is in progress */}
        <button
          onClick={handleConnect}
          disabled={isLoading || !secret.trim()}
          className="w-full bg-lime-400 text-black font-black text-sm tracking-widest uppercase py-3 rounded hover:bg-lime-300 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'CONNECTING...' : 'CONNECT'}
        </button>

      </div>

      {/* Hint — brief explanation of how the shared secret system works */}
      <p className="text-xs text-zinc-800 text-center mt-6 leading-relaxed">
        Both people must enter the exact same secret<br />
        at the same time · no servers · no logs · no trace
      </p>

    </div>
  )
}