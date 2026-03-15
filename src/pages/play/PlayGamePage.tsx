import { useDeferredValue, useEffect, useState } from 'react'
import { ArrowRightLeft, Hand, Shuffle, Sparkles, StepForward } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PlayerPanel } from '@/play/components/PlayerPanel'
import { PlayCard } from '@/play/components/PlayCard'
import { PlayCardInspectModal } from '@/play/components/PlayCardInspectModal'
import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'
import type { BattlefieldPermanentSnapshot, OwnedZone } from '@/shared/play'
import type { MagicCard } from '@/types/scryfall'

export function PlayGamePage() {
  const navigate = useNavigate()
  const { gameId = '' } = useParams()
  const {
    connectionStatus,
    room,
    game,
    error,
    clearError,
    sendGameAction,
  } = usePlay()
  const [inspectedCard, setInspectedCard] = useState<MagicCard | null>(null)
  const battlefield = useDeferredValue(game?.publicState.battlefield ?? [])

  useEffect(() => {
    if (game && game.gameId !== gameId) {
      navigate(`/play/game/${game.gameId}`, { replace: true })
      return
    }

    if (!game && room && room.phase === 'lobby') {
      navigate(`/play/room/${room.roomId}`, { replace: true })
    }
  }, [game, gameId, navigate, room])

  if (!game || game.gameId !== gameId) {
    return (
      <PlayFrame
        eyebrow="Game Table"
        title="Waiting for the game state."
        description="If this browser belongs to an active room, the game snapshot will appear here as soon as the play server sync completes."
        connectionStatus={connectionStatus}
        error={error}
        onDismissError={clearError}
      >
        <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
          <p className="text-sm text-ink-300">No matching game is loaded in this browser session.</p>
          <Link
            to="/play"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
          >
            Back to play
          </Link>
        </section>
      </PlayFrame>
    )
  }

  const activeGame = game
  const players = activeGame.publicState.players
  const localPublicPlayer =
    players.find((player) => player.id === activeGame.localPlayerId) ?? null
  const localPrivatePlayer = activeGame.privateState
  const otherPlayers = players.filter((player) => player.id !== activeGame.localPlayerId)
  const battlefieldByController = players.map((player) => ({
    player,
    permanents: battlefield.filter((card) => card.controllerPlayerId === player.id),
  }))

  function moveOwnedCard(fromZone: OwnedZone, toZone: OwnedZone, cardId: string) {
    sendGameAction(activeGame.gameId, {
      type: 'move_owned_card',
      cardId,
      fromZone,
      toZone,
    })
  }

  return (
    <PlayFrame
      eyebrow="Live Table"
      title={`Game ${game.gameId.slice(0, 8)}`}
      description="Hands stay private, public zones stay synchronized, and players manually manage most rules just like a physical tabletop."
      connectionStatus={connectionStatus}
      error={error}
      onDismissError={clearError}
      actions={
        <>
          <button
            type="button"
            onClick={() => sendGameAction(activeGame.gameId, { type: 'shuffle_library' })}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-ink-100 transition hover:bg-white/10"
          >
            <Shuffle className="h-4 w-4" />
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => sendGameAction(activeGame.gameId, { type: 'draw_card' })}
            className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400"
          >
            <StepForward className="h-4 w-4" />
            Draw
          </button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_26rem]">
        <div className="grid gap-6">
          <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {otherPlayers.map((player) => (
              <PlayerPanel
                key={player.id}
                player={player}
                onAdjustLife={(playerId, delta) =>
                  sendGameAction(activeGame.gameId, {
                    type: 'adjust_life',
                    playerId,
                    delta,
                  })
                }
                onInspectCard={setInspectedCard}
              />
            ))}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
                  Shared battlefield
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-50">
                  {battlefield.length} permanents in play
                </h2>
              </div>
              <div className="rounded-full bg-white/8 px-4 py-2 text-sm text-ink-200">
                Everyone sees this zone in real time
              </div>
            </div>

            <div className="mt-5 grid gap-4 2xl:grid-cols-2">
              {battlefieldByController.map(({ player, permanents }) => (
                <section
                  key={player.id}
                  className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink-50">{player.name}</p>
                      <p className="text-sm text-ink-400">{permanents.length} permanents</p>
                    </div>
                    <ArrowRightLeft className="h-4 w-4 text-ink-400" />
                  </div>

                  {permanents.length > 0 ? (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                      {permanents.map((permanent) => (
                        <BattlefieldCard
                          key={permanent.instanceId}
                          permanent={permanent}
                          isLocal={permanent.ownerPlayerId === activeGame.localPlayerId}
                          onInspect={setInspectedCard}
                          onMoveCard={moveOwnedCard}
                          onToggleTapped={(tapped) =>
                            sendGameAction(activeGame.gameId, {
                              type: 'tap_card',
                              cardId: permanent.instanceId,
                              tapped,
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-ink-400">No permanents in this lane yet.</p>
                  )}
                </section>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
                  Private hand
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-50">
                  {localPrivatePlayer?.hand.length ?? 0} cards in hand
                </h2>
              </div>
              <div className="rounded-full bg-tide-500/12 px-4 py-2 text-sm text-tide-100 ring-1 ring-tide-400/25">
                Only this browser receives these card contents
              </div>
            </div>

            {localPrivatePlayer && localPrivatePlayer.hand.length > 0 ? (
              <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                {localPrivatePlayer.hand.map((card) => (
                  <PlayCard
                    key={card.instanceId}
                    card={card.card}
                    onInspect={() => setInspectedCard(card.card)}
                    actions={[
                      {
                        label: 'Battlefield',
                        onClick: () => moveOwnedCard('hand', 'battlefield', card.instanceId),
                        tone: 'primary',
                      },
                      {
                        label: 'Exile',
                        onClick: () => moveOwnedCard('hand', 'exile', card.instanceId),
                        tone: 'danger',
                      },
                    ]}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-ink-300">
                  Your hand is empty. Draw, return cards from public zones, or keep playing the
                  shared battlefield manually.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6">
          {localPublicPlayer ? (
            <PlayerPanel
              player={localPublicPlayer}
              isLocal
              onAdjustLife={(playerId, delta) =>
                sendGameAction(activeGame.gameId, {
                  type: 'adjust_life',
                  playerId,
                  delta,
                })
              }
              onInspectCard={setInspectedCard}
              onMoveOwnedCard={moveOwnedCard}
            />
          ) : null}

          <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
                  Activity log
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-50">Latest actions</h2>
              </div>
              <Sparkles className="h-5 w-5 text-ember-200" />
            </div>

            {game.publicState.actionLog.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {game.publicState.actionLog.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-medium text-ink-100">{entry.message}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-400">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-ink-300">No actions recorded yet.</p>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <Hand className="h-5 w-5 text-tide-200" />
              <h2 className="text-lg font-semibold text-ink-50">Table status</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink-300">
              Library order remains server-side, each hand stays private to its owner, and public
              zones are synchronized to all players. This mode intentionally leaves rules handling
              manual.
            </p>
          </section>
        </div>
      </div>

      <PlayCardInspectModal card={inspectedCard} onClose={() => setInspectedCard(null)} />
    </PlayFrame>
  )
}

function BattlefieldCard({
  permanent,
  isLocal,
  onInspect,
  onMoveCard,
  onToggleTapped,
}: {
  permanent: BattlefieldPermanentSnapshot
  isLocal: boolean
  onInspect: (card: MagicCard) => void
  onMoveCard: (fromZone: OwnedZone, toZone: OwnedZone, cardId: string) => void
  onToggleTapped: (tapped: boolean) => void
}) {
  return (
    <PlayCard
      card={permanent.card}
      tapped={permanent.tapped}
      onInspect={() => onInspect(permanent.card)}
      actions={
        isLocal
          ? [
              {
                label: permanent.tapped ? 'Untap' : 'Tap',
                onClick: () => onToggleTapped(!permanent.tapped),
                tone: 'primary',
              },
              {
                label: 'Graveyard',
                onClick: () => onMoveCard('battlefield', 'graveyard', permanent.instanceId),
              },
              {
                label: 'Exile',
                onClick: () => onMoveCard('battlefield', 'exile', permanent.instanceId),
                tone: 'danger',
              },
              {
                label: 'Hand',
                onClick: () => onMoveCard('battlefield', 'hand', permanent.instanceId),
              },
            ]
          : []
      }
    />
  )
}
