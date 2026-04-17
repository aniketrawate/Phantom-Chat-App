import { useCallback } from 'react'
import { usePeer } from './hooks/usePeer'
import JoinScreen from './components/JoinScreen'
import ChatScreen from './components/ChatScreen'

export default function App() {
  const { status, messages, connect, sendMessage, disconnect, removeMessage, sendVanishSync, vanishSync } = usePeer()

  const handleRemoveMessage = useCallback((id) => {
    removeMessage(id)
  }, [removeMessage])

  const isInChat = status === 'connected' || status === 'disconnected'

  return (
    <div className="h-full w-full">
      {!isInChat && (
        <JoinScreen
          onConnect={connect}
          status={status}
        />
      )}

      {isInChat && (
        <ChatScreen
          messages={messages}
          status={status}
          onSend={sendMessage}
          onDisconnect={disconnect}
          onRemoveMessage={handleRemoveMessage}
          sendVanishSync={sendVanishSync}
          vanishSync={vanishSync}
        />
      )}
    </div>
  )
}