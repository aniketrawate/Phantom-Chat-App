import { useState } from 'react'

export default function JoinScreen({ onConnect, status }) {
  const [secret, setSecret] = useState('')

  const handleConnect = () => {
    if (secret.trim()) {
      onConnect(secret)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConnect()
  }

  const isLoading = status === 'hashing' || status === 'waiting'

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-black tracking-tighter text-lime-400">
          PHANTOM
        </h1>
        <p className="text-xs text-zinc-600 tracking-widest uppercase mt-2">
          zero trace · peer to peer · ephemeral
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded p-6 flex flex-col gap-5">

        {/* Input */}
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

        {/* Status */}
        <div className="flex items-center gap-2 min-h-4">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            status === 'idle'    ? 'bg-zinc-700' :
            status === 'waiting' || status === 'hashing' ? 'bg-yellow-500 animate-pulse' :
            status === 'error'  ? 'bg-red-500' : 'bg-zinc-700'
          }`} />
          <p className="text-xs text-zinc-600">
            {status === 'idle'    && 'Enter your shared secret to connect'}
            {status === 'hashing' && 'Hashing secret...'}
            {status === 'waiting' && 'Waiting for the other person...'}
            {status === 'error'   && 'Could not connect. Check your secret and try again.'}
          </p>
        </div>

        {/* Button */}
        <button
          onClick={handleConnect}
          disabled={isLoading || !secret.trim()}
          className="w-full bg-lime-400 text-black font-black text-sm tracking-widest uppercase py-3 rounded hover:bg-lime-300 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'CONNECTING...' : 'CONNECT'}
        </button>

      </div>

      {/* Hint */}
      <p className="text-xs text-zinc-800 text-center mt-6 leading-relaxed">
        Both people must enter the exact same secret<br />
        at the same time · no servers · no logs · no trace
      </p>

    </div>
  )
}