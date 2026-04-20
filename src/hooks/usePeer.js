import { useState, useRef, useCallback } from 'react'
import Peer from 'peerjs'
import { hashSecret } from '../utils/crypto'

// Local PeerJS server — run: npx peerjs --port 9000
const PEER_CONFIG = {
  host: 'localhost',
  port: 9000,
  path: '/',
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
  debug: 0,
}

export function usePeer() {
  const [status, setStatus] = useState('idle')
  const [vanishSync, setVanishSync] = useState(null)
  const [messages, setMessages] = useState([])
  const peerRef = useRef(null)
  const connRef = useRef(null)

  const addMessage = useCallback((text, direction) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      text,
      direction,
      deliveredAt: Date.now(),
    }])
  }, [])

  const setupConnection = useCallback((conn) => {
    connRef.current = conn
    conn.on('open', () => setStatus('connected'))
    conn.on('data', (data) => {
      if (data.type === 'msg') {
        addMessage(data.text, 'in')
      } else if (data.type === 'vanish_sync') {
        setVanishSync({ vanishMode: data.vanishMode, vanishSeconds: data.vanishSeconds })
      }
    })
    conn.on('close', () => {
      setStatus('disconnected')
      connRef.current = null
    })
    conn.on('error', () => setStatus('error'))
  }, [addMessage])

  const tryAsGuest = useCallback((hostId, guestId) => {
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    const guestPeer = new Peer(guestId, PEER_CONFIG)
    peerRef.current = guestPeer

    guestPeer.on('open', () => {
      const conn = guestPeer.connect(hostId, { reliable: true })
      setupConnection(conn)
    })

    guestPeer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        const delay = 200 + Math.random() * 300
        setTimeout(() => tryAsGuest(hostId, guestId), delay)
      } else {
        setStatus('error')
      }
    })
  }, [setupConnection])

  const connect = useCallback(async (secret) => {
    setStatus('hashing')

    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    connRef.current = null

    const hash = await hashSecret(secret)
    const hostId = 'phantomchat-host-' + hash
    const guestId = 'phantomchat-guest-' + hash

    setStatus('waiting')

    const peer = new Peer(hostId, PEER_CONFIG)
    peerRef.current = peer

    peer.on('open', () => {
      peer.on('connection', (conn) => setupConnection(conn))
    })

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        tryAsGuest(hostId, guestId)
      } else {
        console.error('PeerJS error:', err.type, err)
        setStatus('error')
      }
    })
  }, [setupConnection, tryAsGuest])

  const sendMessage = useCallback((text) => {
    if (!connRef.current || !connRef.current.open) return
    connRef.current.send({ type: 'msg', text })
    addMessage(text, 'out')
  }, [addMessage])

  const sendVanishSync = useCallback((vanishMode, vanishSeconds) => {
    if (!connRef.current || !connRef.current.open) return
    connRef.current.send({ type: 'vanish_sync', vanishMode, vanishSeconds })
  }, [])

  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }, [])

  const disconnect = useCallback(() => {
    if (connRef.current) connRef.current.close()
    if (peerRef.current) peerRef.current.destroy()
    connRef.current = null
    peerRef.current = null
    setStatus('idle')
    setMessages([])
  }, [])

  return {
    status, messages, connect, sendMessage,
    sendVanishSync, disconnect, removeMessage, vanishSync,
  }
}