import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Copy,
  Globe2,
  Lock,
  LogOut,
  RadioTower,
  Settings2,
  Swords,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useDeckRepository } from '@/decks/useDeckRepository'
import { PlayFrame } from '@/play/components/PlayFrame'
import { RoomSettingsForm } from '@/play/components/RoomSettingsForm'
import {
  createRoomSettingsDraft,
  draftToRoomSettingsInput,
  ROOM_FORMAT_LABELS,
  ROOM_POWER_LEVEL_LABELS,
} from '@/play/roomSettings'
import { usePlay } from '@/play/usePlay'
import {
  createDeckSelectionSnapshot,
  type RoomSettings,
  type RoomSnapshot,
} from '@/shared/play'
import { useSavedDecks } from '@/state/useSavedDecks'
import { copyTextToClipboard } from '@/utils/clipboard'

export function PlayRoomPage() {
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const deckRepository = useDeckRepository()
  const { savedDecks, isLoading: isSavedDecksLoading } = useSavedDecks(deckRepository)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const {
    connectionStatus,
    room,
    game,
    error,
    clearError,
    leaveRoom,
    updateRoomSettings,
    selectDeck,
    startGame,
  } = usePlay()
  const roomSettingsSignature = room ? JSON.stringify(room.settings) : ''

  useEffect(() => {
    if (game && game.roomId === roomId) {
      navigate(`/play/game/${game.gameId}`, { replace: true })
      return
    }

    if (room && room.roomId !== roomId) {
      navigate(`/play/room/${room.roomId}`, { replace: true })
      return
    }

    if (room?.phase === 'game' && room.gameId) {
      navigate(`/play/game/${room.gameId}`, { replace: true })
    }
  }, [game, navigate, room, roomId])

  if (!room || room.roomId !== roomId) {
    return (
      <PlayFrame
        eyebrow="Lobby"
        title="Looking for that room."
        description="If this browser is already connected, it will appear here after sync."
        connectionStatus={connectionStatus}
        error={error}
        onDismissError={clearError}
      >
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
          <p className="text-sm text-ink-300">No matching room is loaded.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/play/create"
              className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400"
            >
              Create room
            </Link>
            <Link
              to="/play/join"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
            >
              Join room
            </Link>
          </div>
        </section>
      </PlayFrame>
    )
  }

  const localPlayer = room.players.find((player) => player.id === room.localPlayerId) ?? null
  const isHost = room.hostPlayerId === room.localPlayerId
  const everyoneReady =
    room.players.length >= room.settings.minPlayers &&
    room.players.every((player) => player.isConnected && player.selectedDeck)

  return (
    <PlayFrame
      eyebrow="Room Lobby"
      title={room.settings.name}
      description={`${room.settings.visibility === 'public' ? 'Public' : 'Private'} room ${room.code}. Players join, choose decks, and the host starts once the table matches the room settings.`}
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const didCopy = await copyTextToClipboard(room.code)
                setStatusMessage(didCopy ? `Copied ${room.code}.` : 'Could not copy the room code.')
              })()
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
          >
            <Copy className="h-4 w-4" />
            Copy code
          </button>
          {isHost ? (
            <button
              type="button"
              onClick={() => startGame(room.roomId)}
              disabled={!everyoneReady}
              className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Swords className="h-4 w-4" />
              Start game
            </button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_32rem]">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
                Lobby players
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ink-50">
                {room.players.length} / {room.settings.maxPlayers} players
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                leaveRoom(room.roomId)
                navigate('/play', { replace: true })
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Leave lobby
            </button>
          </div>

          <RoomSettingsSummary room={room} />

          <div className="mt-5 grid gap-4">
            {room.players.map((player) => (
              <article
                key={player.id}
                className={`rounded-[1.6rem] border p-5 ${
                  player.id === room.localPlayerId
                    ? 'border-tide-400/20 bg-tide-500/10'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-50">{player.name}</h3>
                    <p className="mt-2 text-sm text-ink-300">
                      {player.selectedDeck
                        ? `${player.selectedDeck.name} • ${player.selectedDeck.mainboardCount} cards`
                        : 'No deck selected yet'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {player.isHost ? (
                      <span className="rounded-full bg-ember-500/12 px-3 py-1 text-xs font-semibold text-ember-100 ring-1 ring-ember-400/25">
                        Host
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        player.isConnected
                          ? 'bg-emerald-500/12 text-emerald-100 ring-emerald-400/25'
                          : 'bg-rose-500/12 text-rose-100 ring-rose-400/25'
                      }`}
                    >
                      {player.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        player.selectedDeck
                          ? 'bg-tide-500/12 text-tide-100 ring-tide-400/25'
                          : 'bg-white/8 text-ink-200 ring-white/10'
                      }`}
                    >
                      {player.selectedDeck ? 'Deck ready' : 'Deck pending'}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-ink-300">
              {everyoneReady
                ? isHost
                  ? 'Everyone matches the room settings. You can start the game.'
                  : 'Everyone matches the room settings. Waiting for the host.'
                : `Need at least ${room.settings.minPlayers} connected players and a deck from everyone.`}
            </p>
          </div>

          {statusMessage ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-[1.4rem] border border-tide-400/20 bg-tide-500/10 px-4 py-3 text-sm text-tide-100"
            >
              {statusMessage}
            </p>
          ) : null}
        </section>

        <div className="grid gap-6">
          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
                  Room settings
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-50">
                  {isHost ? 'Tune this lobby' : 'Table details'}
                </h2>
              </div>
              <Settings2 className="h-5 w-5 text-tide-200" />
            </div>

            {room.settings.visibility === 'public' || isHost ? (
              <RoomSettingsPanel
                key={`${room.roomId}:${roomSettingsSignature}`}
                roomId={room.roomId}
                initialSettings={room.settings}
                hostPlayerName={localPlayer?.name ?? 'Planeswalker'}
                editable={isHost}
                onSave={(roomIdToSave, nextSettings) => {
                  updateRoomSettings(roomIdToSave, nextSettings)
                  setStatusMessage('Room settings updated.')
                }}
              />
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm leading-7 text-ink-300">
                  Only the host can change room settings. Use the details on the left to decide if
                  this table fits what you want to play.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
                  Your saved decks
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-50">
                  Choose the deck for this room
                </h2>
              </div>
              <RadioTower className="h-5 w-5 text-tide-200" />
            </div>

            {isSavedDecksLoading ? (
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-ink-300">Loading saved decks.</p>
              </div>
            ) : savedDecks.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {savedDecks.map((deck) => {
                  const isSelected = localPlayer?.selectedDeck?.id === deck.id

                  return (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => selectDeck(room.roomId, createDeckSelectionSnapshot(deck))}
                      aria-pressed={isSelected}
                      className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                        isSelected
                          ? 'border-tide-400/30 bg-tide-500/12'
                          : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-ink-50">{deck.name}</h3>
                          <p className="mt-2 text-sm text-ink-300">
                            {deck.format} •{' '}
                            {deck.mainboard.reduce((sum, entry) => sum + entry.quantity, 0)} mainboard
                            {deck.sideboard.length > 0
                              ? ` • ${deck.sideboard.reduce((sum, entry) => sum + entry.quantity, 0)} sideboard`
                              : ''}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                            isSelected
                              ? 'bg-tide-500/15 text-tide-100 ring-tide-400/30'
                              : 'bg-white/10 text-ink-200 ring-white/10'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Use deck'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm text-ink-300">
                  No saved decks yet. Build one first. Signed-in Continental ID decks appear after refresh.
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 text-sm font-semibold text-ink-50 transition hover:bg-ink-800"
                >
                  Open deckbuilder
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </PlayFrame>
  )
}

function RoomSettingsSummary({ room }: { room: RoomSnapshot }) {
  return (
    <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            room.settings.visibility === 'public'
              ? 'bg-tide-500/12 text-tide-100 ring-tide-400/25'
              : 'bg-white/8 text-ink-200 ring-white/10'
          }`}
        >
          {room.settings.visibility === 'public' ? (
            <Globe2 className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          {room.settings.visibility === 'public' ? 'Public room' : 'Private room'}
        </span>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-ink-200 ring-1 ring-white/10">
          {ROOM_FORMAT_LABELS[room.settings.format]}
        </span>
        <span className="rounded-full bg-ember-500/12 px-3 py-1 text-xs font-semibold text-ember-100 ring-1 ring-ember-400/25">
          {ROOM_POWER_LEVEL_LABELS[room.settings.powerLevel]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryStat label="Start threshold" value={`${room.settings.minPlayers} players`} />
        <SummaryStat label="Seat limit" value={`${room.settings.maxPlayers} players`} />
        <SummaryStat label="Room code" value={room.code} />
      </div>

      {room.settings.description ? (
        <p className="mt-4 text-sm leading-7 text-ink-300">{room.settings.description}</p>
      ) : null}

      {room.settings.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {room.settings.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-tide-500/12 px-3 py-1 text-xs font-semibold text-tide-100 ring-1 ring-tide-400/25"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function RoomSettingsPanel({
  roomId,
  initialSettings,
  hostPlayerName,
  editable,
  onSave,
}: {
  roomId: string
  initialSettings: RoomSettings
  hostPlayerName: string
  editable: boolean
  onSave: (roomId: string, nextSettings: ReturnType<typeof draftToRoomSettingsInput>) => void
}) {
  const [draft, setDraft] = useState(() => createRoomSettingsDraft(initialSettings, hostPlayerName))

  return (
    <div className="mt-5 grid gap-4">
      <RoomSettingsForm
        draft={draft}
        disabled={!editable}
        onChange={editable ? setDraft : () => undefined}
      />
      {editable ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSave(roomId, draftToRoomSettingsInput(draft))
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-white/8 px-4 py-3 text-sm font-semibold text-ink-50 transition hover:bg-white/12"
          >
            Save room settings
          </button>
        </form>
      ) : (
        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm leading-7 text-ink-300">
            You can view the room settings here. Only the host can make changes.
          </p>
        </div>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-ink-950/35 px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-ink-50">{value}</p>
    </div>
  )
}
