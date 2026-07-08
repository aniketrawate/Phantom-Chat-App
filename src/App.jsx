/**
 * App.jsx — Root Component
 *
 * This is the top-level component of Phantom Chat.
 * It acts as a simple router between two screens:
 *   1. JoinScreen  — shown when the user hasn't connected yet (idle, hashing, waiting, error)
 *   2. ChatScreen  — shown once a P2P connection is established (connected) or after the peer leaves (disconnected)
 *
 * All peer-to-peer logic (connecting, messaging, disconnecting) lives inside
 * the `usePeer` custom hook. This component simply wires the hook's state and
 * callbacks into the two screen components.
 */

import { useCallback } from 'react'
import { usePeer } from './hooks/usePeer'
import JoinScreen from './components/JoinScreen'
import ChatScreen from './components/ChatScreen'

export default function App() {
  // Destructure all state and actions from the P2P hook
  const { status, messages, connect, sendMessage, disconnect, removeMessage, sendVanishSync, vanishSync } = usePeer()

  /**
   * Memoised callback to remove a single message by its ID.
   * Passed down to ChatScreen → MessageBubble so vanished messages
   * get cleaned out of the messages array.
   */
  const handleRemoveMessage = useCallback((id) => {
    removeMessage(id)
  }, [removeMessage])

  /**
   * Determine which screen to show:
   * - 'connected' or 'disconnected' → show the ChatScreen (user is in / was in a chat)
   * - anything else ('idle', 'hashing', 'waiting', 'error') → show JoinScreen
   */
  const isInChat = status === 'connected' || status === 'disconnected'

  return (
    <div className="min-h-dvh w-full">
      {/* Landing / join screen — enter a shared secret to start a P2P connection */}
      {!isInChat && (
        <JoinScreen
          onConnect={connect}
          status={status}
        />
      )}

      {/* Active chat screen — send messages, toggle vanish mode, or leave */}
      {isInChat && (
        <ChatScreen
          messages={messages}           // Array of message objects ({ id, text, direction, deliveredAt })
          status={status}               // 'connected' | 'disconnected'
          onSend={sendMessage}          // Callback to send a text message to the peer
          onDisconnect={disconnect}     // Callback to close the P2P connection and return to JoinScreen
          onRemoveMessage={handleRemoveMessage}  // Callback to remove a vanished message from state
          sendVanishSync={sendVanishSync}        // Callback to sync vanish settings to the peer
          vanishSync={vanishSync}                // Latest vanish settings received from the peer
        />
      )}
    </div>
  )
}