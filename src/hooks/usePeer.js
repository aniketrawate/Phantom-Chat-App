import { useState, useRef, useCallback } from 'react'
import Peer from 'peerjs'
import { hashSecret } from '../utils/crypto'

export function usePeer() {
  const [status, setStatus] = useState('idle')
  // idle | hashing | waiting | connected | error | disconnected

  const [vanishSync, setVanishSync] = useState(null)

  const [messages, setMessages] = useState([])
  const peerRef = useRef(null)
  const connRef = useRef(null)

  const addMessage = useCallback((text, direction) => {
    const msg = {
      id: crypto.randomUUID(),
      text,
      direction, // 'out' or 'in'
      deliveredAt: Date.now(),
    }
    setMessages(prev => [...prev, msg])
  }, [])

  const setupConnection = useCallback((conn) => {
    connRef.current = conn

    conn.on('open', () => {
      setStatus('connected')
    })

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

    conn.on('error', () => {
      setStatus('error')
    })
  }, [addMessage])

  const connect = useCallback(async (secret) => {
    setStatus('hashing')

    const hash = await hashSecret(secret)
    const hostId = 'phantomchat-host-' + hash
    const guestId = 'phantomchat-guest-' + hash

    setStatus('waiting')

    const peer = new Peer(hostId)
    peerRef.current = peer

    peer.on('open', () => {
      // We became host, now wait for guest to dial in
      peer.on('connection', (conn) => {
        setupConnection(conn)
      })
    })

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Host already exists, so we are the guest
        peer.destroy()
        const guestPeer = new Peer(guestId)
        peerRef.current = guestPeer

        guestPeer.on('open', () => {
          const conn = guestPeer.connect(hostId, { reliable: true })
          setupConnection(conn)
        })

        guestPeer.on('error', () => {
          setStatus('error')
        })
      } else {
        setStatus('error')
      }
    })
  }, [setupConnection])

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
    status,
    messages,
    connect,
    sendMessage,
    sendVanishSync,
    disconnect,
    removeMessage,
    vanishSync,
  }
}