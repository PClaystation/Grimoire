import { useEffect, useRef, useState } from 'react'
import { MessageSquareText, Send } from 'lucide-react'

import type { ConnectionStatus } from '@/play/playContext'
import type { RoomChatMessage, RoomParticipantRole } from '@/shared/play'

interface RoomChatPanelProps {
  title?: string
  description?: string
  connectionStatus: ConnectionStatus
  viewerRole: RoomParticipantRole | null
  messages: RoomChatMessage[]
  onSendMessage: (message: string) => void
}

export function RoomChatPanel({
  title = 'Room chat',
  description = 'Share quick updates, mulligan notes, and table talk without leaving the room.',
  connectionStatus,
  viewerRole,
  messages,
  onSendMessage,
}: RoomChatPanelProps) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!scrollRef.current) {
      return
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length])

  const canSend = connectionStatus !== 'disconnected'

  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="flex items-start gap-3">
        <div className="rounded-full border border-white/10 bg-white/6 p-2 text-tide-100">
          <MessageSquareText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Room chat</p>
          <h2 className="mt-1 text-xl font-semibold text-ink-50">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">{description}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
            {viewerRole === 'spectator' ? 'Spectator chat access' : 'Player chat access'}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 grid max-h-[20rem] gap-2 overflow-y-auto rounded-[1.5rem] border border-white/10 bg-white/5 p-3"
      >
        {messages.length > 0 ? (
          messages.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.2rem] border border-white/10 bg-ink-950/60 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink-50">{entry.senderName}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                    entry.senderRole === 'spectator'
                      ? 'bg-white/10 text-ink-200 ring-1 ring-white/10'
                      : 'bg-tide-500/12 text-tide-100 ring-1 ring-tide-400/25'
                  }`}
                >
                  {entry.senderRole}
                </span>
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-200">
                {entry.message}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-ink-300">
            No messages yet.
          </div>
        )}
      </div>

      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const message = draft.trim()

          if (!message) {
            return
          }

          onSendMessage(message)
          setDraft('')
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          disabled={!canSend}
          placeholder={
            canSend ? 'Type a room message...' : 'Reconnect to send messages to the room.'
          }
          className="w-full rounded-[1.3rem] border border-white/10 bg-ink-950/80 px-3 py-3 text-sm text-ink-100 outline-none transition focus:border-tide-400/35 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSend || !draft.trim()}
            className="inline-flex items-center gap-2 rounded-2xl border border-tide-400/25 bg-tide-500/12 px-4 py-2.5 text-sm font-semibold text-tide-100 transition hover:border-tide-400/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </section>
  )
}
