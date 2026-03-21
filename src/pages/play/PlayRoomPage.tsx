import { useEffect, useState } from 'react'
import { ArrowRight, Copy, LogOut, RadioTower, Swords } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useDeckRepository } from '@/decks/useDeckRepository'
import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'
import { createDeckSelectionSnapshot, PLAY_MIN_PLAYERS } from '@/shared/play'
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
    selectDeck,
    startGame,
  } = usePlay()

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
    room.players.length >= PLAY_MIN_PLAYERS &&
    room.players.every((player) => player.isConnected && player.selectedDeck)

  return (
    <PlayFrame
      eyebrow="Room Lobby"
      title={`Room ${room.code}`}
      description="Players join, pick a deck, and the host starts when everyone is ready."
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
                setStatusMessage(
                  didCopy ? `Copied ${room.code}.` : 'Could not copy the room code.',
                )
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
                {room.players.length} / {room.maxPlayers} players
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
                  ? 'Everyone is ready. You can start the game.'
                  : 'Everyone is ready. Waiting for the host.'
                : `Need at least ${PLAY_MIN_PLAYERS} connected players and a deck from everyone.`}
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
              <p className="text-sm text-ink-300">
                Loading saved decks.
              </p>
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
    </PlayFrame>
  )
}
