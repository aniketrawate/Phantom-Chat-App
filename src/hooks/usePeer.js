/**
 * usePeer.js — Core P2P Connection Hook
 *
 * This custom React hook encapsulates ALL peer-to-peer logic for Phantom Chat.
 * It uses PeerJS (a WebRTC wrapper) to establish a direct data channel between
 * two browsers — no messages ever pass through a server.
 *
 * Connection Strategy (Host / Guest):
 *   1. Both users enter the same shared secret, which is SHA-256 hashed.
 *   2. The first user registers on the PeerJS server as "phantomchat-host-{hash}".
 *   3. The second user tries to register as host too — but that ID is taken,
 *      so PeerJS returns an 'unavailable-id' error.
 *   4. On that error, the second user registers as "phantomchat-guest-{hash}"
 *      and connects to the host's peer ID.
 *   5. A direct WebRTC data channel is established between the two peers.
 *
 * Status Flow:
 *   idle → hashing → waiting → connected → disconnected
 *                                ↑ error (can happen at any point)
 *
 * Returned API:
 *   - status         : Current connection state string
 *   - messages       : Array of message objects
 *   - connect(secret): Start the connection process with a shared secret
 *   - sendMessage(text): Send a text message to the peer
 *   - sendVanishSync(mode, seconds): Sync vanish settings to the peer
 *   - disconnect()   : Close the connection and reset all state
 *   - removeMessage(id): Remove a single message by ID (used by vanish timer)
 *   - vanishSync     : Latest vanish settings received from the peer
 */

import { useState, useRef, useCallback } from 'react'
import Peer from 'peerjs'
import { hashSecret } from '../utils/crypto'

/**
 * PeerJS server configuration.
 * Points to a local PeerJS signaling server that must be running on port 9000.
 * Start it with: npx peerjs --port 9000
 *
 * The signaling server is ONLY used for the initial handshake (peer discovery).
 * Once connected, all data flows directly between browsers via WebRTC.
 * STUN servers (Google's public ones) help with NAT traversal.
 */
const PEER_CONFIG = {
  host: 'localhost',
  port: 9000,
  path: '/',
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },   // Google STUN server for NAT traversal
      { urls: 'stun:stun1.l.google.com:19302' },   // Backup STUN server
    ],
  },
  debug: 0,  // 0 = silent, increase for PeerJS debug logging (1-3)
}

export function usePeer() {
  // ── State ────────────────────────────────────────────────────
  const [status, setStatus] = useState('idle')       // Connection lifecycle status
  const [vanishSync, setVanishSync] = useState(null)  // Vanish settings received from peer
  const [messages, setMessages] = useState([])        // Array of all chat messages

  // ── Refs ─────────────────────────────────────────────────────
  const peerRef = useRef(null)   // The local PeerJS Peer instance
  const connRef = useRef(null)   // The active DataConnection to the remote peer

  /**
   * Add a new message to the messages array.
   * @param {string} text      - The message text content
   * @param {string} direction - 'in' for received messages, 'out' for sent messages
   */
  const addMessage = useCallback((text, direction) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),    // Unique ID for React keys and vanish removal
      text,
      direction,                  // 'in' = received, 'out' = sent
      deliveredAt: Date.now(),    // Timestamp for display in MessageBubble
    }])
  }, [])

  /**
   * Set up event listeners on a PeerJS DataConnection.
   * This is called for both host and guest once a connection is established.
   *
   * Events handled:
   *   - 'open'  → Connection is ready, update status to 'connected'
   *   - 'data'  → Received data from peer (either a message or vanish sync)
   *   - 'close' → Peer disconnected, update status to 'disconnected'
   *   - 'error' → Something went wrong, update status to 'error'
   */
  const setupConnection = useCallback((conn) => {
    connRef.current = conn

    conn.on('open', () => setStatus('connected'))

    conn.on('data', (data) => {
      if (data.type === 'msg') {
        // Incoming chat message — add it to the messages array as 'in' direction
        addMessage(data.text, 'in')
      } else if (data.type === 'vanish_sync') {
        // Peer changed their vanish mode or timer — update local vanish settings
        setVanishSync({ vanishMode: data.vanishMode, vanishSeconds: data.vanishSeconds })
      }
    })

    conn.on('close', () => {
      setStatus('disconnected')
      connRef.current = null
    })

    conn.on('error', () => setStatus('error'))
  }, [addMessage])

  /**
   * Fallback: register as the GUEST peer and connect to the existing HOST.
   *
   * This is called when the user tried to register as host but the ID was
   * already taken (meaning the other person connected first).
   *
   * If the guest ID is also unavailable (race condition), it retries with
   * a random delay (200-500ms) to avoid collision loops.
   *
   * @param {string} hostId  - The PeerJS ID of the host to connect to
   * @param {string} guestId - The PeerJS ID to register this peer as
   */
  const tryAsGuest = useCallback((hostId, guestId) => {
    // Clean up any existing peer instance before creating a new one
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    const guestPeer = new Peer(guestId, PEER_CONFIG)
    peerRef.current = guestPeer

    guestPeer.on('open', () => {
      // Guest peer registered successfully — now connect to the host
      const conn = guestPeer.connect(hostId, { reliable: true })
      setupConnection(conn)
    })

    guestPeer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Guest ID also taken (rare race condition) — retry after a random delay
        const delay = 200 + Math.random() * 300
        setTimeout(() => tryAsGuest(hostId, guestId), delay)
      } else {
        setStatus('error')
      }
    })
  }, [setupConnection])

  /**
   * Main connection entry point.
   * Called when the user submits a shared secret from the JoinScreen.
   *
   * Steps:
   *   1. Hash the secret with SHA-256 to create deterministic peer IDs
   *   2. Try to register as the HOST peer
   *   3. If the host ID is already taken, fall back to GUEST via tryAsGuest()
   *   4. If registered as host successfully, wait for the guest to connect
   *
   * @param {string} secret - The shared passphrase entered by the user
   */
  const connect = useCallback(async (secret) => {
    setStatus('hashing')

    // Clean up any previous peer/connection instances
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    connRef.current = null

    // Hash the secret to create deterministic, collision-resistant peer IDs
    const hash = await hashSecret(secret)
    const hostId = 'phantomchat-host-' + hash    // First person gets this ID
    const guestId = 'phantomchat-guest-' + hash  // Second person gets this ID

    setStatus('waiting')

    // Attempt to register as the HOST
    const peer = new Peer(hostId, PEER_CONFIG)
    peerRef.current = peer

    peer.on('open', () => {
      // Successfully registered as host — listen for incoming guest connections
      peer.on('connection', (conn) => setupConnection(conn))
    })

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Host ID is taken — the other person is already waiting as host
        // Fall back to registering as guest and connecting to them
        tryAsGuest(hostId, guestId)
      } else {
        console.error('PeerJS error:', err.type, err)
        setStatus('error')
      }
    })
  }, [setupConnection, tryAsGuest])

  /**
   * Send a text message to the connected peer.
   * Also adds the message to the local messages array as an outgoing ('out') message.
   *
   * @param {string} text - The message text to send
   */
  const sendMessage = useCallback((text) => {
    if (!connRef.current || !connRef.current.open) return
    connRef.current.send({ type: 'msg', text })
    addMessage(text, 'out')
  }, [addMessage])

  /**
   * Send a vanish mode sync message to the peer.
   * This tells the peer about the current vanish mode and timer settings
   * so both sides stay in sync.
   *
   * @param {boolean} vanishMode    - Whether vanish mode is enabled
   * @param {number}  vanishSeconds - The vanish timer duration in seconds
   */
  const sendVanishSync = useCallback((vanishMode, vanishSeconds) => {
    if (!connRef.current || !connRef.current.open) return
    connRef.current.send({ type: 'vanish_sync', vanishMode, vanishSeconds })
  }, [])

  /**
   * Remove a single message from the messages array by its ID.
   * Called by the MessageBubble component when a message's vanish timer expires.
   *
   * @param {string} id - The unique ID of the message to remove
   */
  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }, [])

  /**
   * Disconnect from the peer and reset all state.
   * Closes the data connection, destroys the PeerJS instance,
   * clears messages, and returns to the 'idle' status (showing JoinScreen).
   */
  const disconnect = useCallback(() => {
    if (connRef.current) connRef.current.close()
    if (peerRef.current) peerRef.current.destroy()
    connRef.current = null
    peerRef.current = null
    setStatus('idle')
    setMessages([])
  }, [])

  // ── Public API ───────────────────────────────────────────────
  return {
    status, messages, connect, sendMessage,
    sendVanishSync, disconnect, removeMessage, vanishSync,
  }
}