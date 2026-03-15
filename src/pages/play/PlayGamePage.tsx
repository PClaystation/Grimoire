import { useDeferredValue, useEffect, useState, type DragEvent, type ReactNode } from 'react'
import {
  BookOpen,
  Crown,
  Hand,
  History,
  Minus,
  Plus,
  RefreshCcw,
  ScrollText,
  ShieldPlus,
  Shuffle,
  Sparkles,
  Swords,
  Undo2,
  WandSparkles,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { SiteNav } from '@/components/layout/SiteNav'
import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'
import type {
  BattlefieldPermanentSnapshot,
  GameActionEvent,
  GamePlayerPublicSnapshot,
  GamePrivatePlayerState,
  OwnedZone,
  PermanentCounter,
  PermanentPosition,
  TableCardSnapshot,
} from '@/shared/play'
import type { CardColor, MagicCard } from '@/types/scryfall'

type PublicZone = 'graveyard' | 'exile' | 'command'

type TableSelection =
  | { zone: 'battlefield'; cardId: string }
  | { zone: 'hand'; cardId: string }
  | { zone: PublicZone; playerId: string; cardId: string }

interface SelectedCardData {
  zone: OwnedZone
  card: TableCardSnapshot | BattlefieldPermanentSnapshot
  player: GamePlayerPublicSnapshot | null
  permanent: BattlefieldPermanentSnapshot | null
}

interface DragPayload {
  cardId: string
  fromZone: OwnedZone
  controllerPlayerId?: string
}

interface TokenPreset {
  name: string
  tokenType: string
  note: string
  colors: CardColor[]
  power?: string
  toughness?: string
}

const COUNTER_PRESETS = ['+1/+1', 'loyalty', 'shield', 'stun']
const PUBLIC_ZONE_ORDER: PublicZone[] = ['command', 'graveyard', 'exile']
const TOKEN_PRESETS: TokenPreset[] = [
  {
    name: 'Treasure',
    tokenType: 'Artifact Token',
    note: 'Tap, Sacrifice this artifact: Add one mana of any color.',
    colors: [],
  },
  {
    name: 'Clue',
    tokenType: 'Artifact Token',
    note: '2, Sacrifice this artifact: Draw a card.',
    colors: [],
  },
  {
    name: 'Food',
    tokenType: 'Artifact Token',
    note: '2, Tap, Sacrifice this artifact: You gain 3 life.',
    colors: [],
  },
  {
    name: 'Spirit',
    tokenType: 'Creature Token',
    note: 'Flying',
    colors: ['W'],
    power: '1',
    toughness: '1',
  },
  {
    name: 'Beast',
    tokenType: 'Creature Token',
    note: '',
    colors: ['G'],
    power: '3',
    toughness: '3',
  },
]

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
  const [selectedCard, setSelectedCard] = useState<TableSelection | null>(null)
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null)
  const [activeZone, setActiveZone] = useState<PublicZone>('command')
  const [counterDraft, setCounterDraft] = useState(COUNTER_PRESETS[0])
  const [noteEditor, setNoteEditor] = useState<{ cardId: string | null; value: string }>({
    cardId: null,
    value: '',
  })
  const [tokenDraft, setTokenDraft] = useState({
    name: 'Spirit',
    tokenType: 'Creature Token',
    note: 'Flying',
    power: '1',
    toughness: '1',
    colors: ['W'] as CardColor[],
  })
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

  const activeGame = game
  const players = activeGame?.publicState.players ?? []
  const localPlayerId = activeGame?.localPlayerId ?? ''
  const localPublicPlayer = players.find((player) => player.id === localPlayerId) ?? null
  const localPrivatePlayer = activeGame?.privateState ?? null
  const opponentPlayers = players.filter((player) => player.id !== localPlayerId)
  const battlefieldByController = players.map((player) => ({
    player,
    permanents: battlefield
      .filter((card) => card.controllerPlayerId === player.id)
      .sort((left, right) => left.position.y - right.position.y || left.position.x - right.position.x),
  }))
  const resolvedFocusedPlayerId = focusedPlayerId ?? localPublicPlayer?.id ?? players[0]?.id ?? null
  const focusedPlayer =
    players.find((player) => player.id === resolvedFocusedPlayerId) ??
    localPublicPlayer ??
    players[0] ??
    null
  const selectedData = findSelectedCardData(selectedCard, battlefield, players, localPrivatePlayer)
  const activeSelection = selectedData ? selectedCard : null
  const zoneCards = focusedPlayer ? focusedPlayer[activeZone] : []
  const selectedPermanent = selectedData?.permanent ?? null
  const noteDraft =
    selectedPermanent && noteEditor.cardId === selectedPermanent.instanceId
      ? noteEditor.value
      : selectedPermanent?.note ?? ''
  const isSelectedCardLocalOwned = selectedData?.card.ownerPlayerId === localPlayerId
  const isSelectedCardLocallyControlled =
    selectedPermanent !== null &&
    (selectedPermanent.ownerPlayerId === localPlayerId ||
      selectedPermanent.controllerPlayerId === localPlayerId)

  if (!activeGame || activeGame.gameId !== gameId) {
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

  const activeGameId = activeGame.gameId

  function moveOwnedCard(
    fromZone: OwnedZone,
    toZone: OwnedZone,
    cardId: string,
    position?: PermanentPosition,
  ) {
    sendGameAction(activeGameId, {
      type: 'move_owned_card',
      cardId,
      fromZone,
      toZone,
      position,
    })
  }

  function openZone(playerId: string, zone: PublicZone) {
    setFocusedPlayerId(playerId)
    setActiveZone(zone)
  }

  function selectZoneCard(playerId: string, zone: PublicZone, cardId: string) {
    openZone(playerId, zone)
    setSelectedCard({ zone, playerId, cardId })
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 text-ink-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4">
        <SiteNav connectionStatus={connectionStatus} compact />

        <TableHud
          gameId={activeGameId}
          startedAt={activeGame.publicState.startedAt}
          roomCode={room?.code ?? activeGame.roomId}
          battlefieldCount={battlefield.length}
          localPlayer={localPublicPlayer}
          onDraw={() => sendGameAction(activeGameId, { type: 'draw_card' })}
          onDrawSeven={() => sendGameAction(activeGameId, { type: 'draw_card', amount: 7 })}
          onShuffle={() => sendGameAction(activeGameId, { type: 'shuffle_library' })}
          onUntapAll={() => sendGameAction(activeGameId, { type: 'untap_all' })}
        />

        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-rose-400/25 bg-rose-500/10 px-4 py-3 shadow-card">
            <div>
              <p className="text-sm font-semibold text-rose-100">Play sync issue</p>
              <p className="mt-1 text-sm text-rose-50/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid gap-5">
            {opponentPlayers.length > 0 ? (
              <section
                className={`grid gap-4 ${opponentPlayers.length > 1 ? 'xl:grid-cols-2' : ''}`}
              >
                {battlefieldByController
                  .filter(({ player }) => player.id !== localPlayerId)
                  .map(({ player, permanents }) => (
                    <BattlefieldLane
                      key={player.id}
                      player={player}
                      permanents={permanents}
                      localPlayerId={localPlayerId}
                      compact
                      selectedCardId={
                        activeSelection?.zone === 'battlefield' ? activeSelection.cardId : null
                      }
                      onAdjustLife={(playerId, delta) =>
                        sendGameAction(activeGameId, {
                          type: 'adjust_life',
                          playerId,
                          delta,
                        })
                      }
                      onOpenZone={openZone}
                      onSelectPermanent={(cardId) => {
                        setSelectedCard({ zone: 'battlefield', cardId })
                        setFocusedPlayerId(player.id)
                      }}
                      onDropCard={(payload, position) => {
                        if (payload.fromZone === 'battlefield') {
                          if (payload.controllerPlayerId === player.id) {
                            sendGameAction(activeGameId, {
                              type: 'set_permanent_position',
                              cardId: payload.cardId,
                              position,
                            })
                          }
                          return
                        }
                      }}
                      onToggleTapped={(cardId, tapped) =>
                        sendGameAction(activeGameId, {
                          type: 'tap_card',
                          cardId,
                          tapped,
                        })
                      }
                    />
                  ))}
              </section>
            ) : null}

            {battlefieldByController
              .filter(({ player }) => player.id === localPlayerId)
              .map(({ player, permanents }) => (
                <BattlefieldLane
                  key={player.id}
                  player={player}
                  permanents={permanents}
                  localPlayerId={localPlayerId}
                  selectedCardId={
                    activeSelection?.zone === 'battlefield' ? activeSelection.cardId : null
                  }
                  onAdjustLife={(playerId, delta) =>
                    sendGameAction(activeGameId, {
                      type: 'adjust_life',
                      playerId,
                      delta,
                    })
                  }
                  onOpenZone={openZone}
                  onSelectPermanent={(cardId) => {
                    setSelectedCard({ zone: 'battlefield', cardId })
                    setFocusedPlayerId(player.id)
                  }}
                  onDropCard={(payload, position) => {
                    if (payload.fromZone === 'battlefield') {
                      sendGameAction(activeGameId, {
                        type: 'set_permanent_position',
                        cardId: payload.cardId,
                        position,
                      })
                      return
                    }

                    moveOwnedCard(payload.fromZone, 'battlefield', payload.cardId, position)
                  }}
                  onToggleTapped={(cardId, tapped) =>
                    sendGameAction(activeGameId, {
                      type: 'tap_card',
                      cardId,
                      tapped,
                    })
                  }
                />
              ))}

            {localPublicPlayer && localPrivatePlayer ? (
              <HandTray
                player={localPublicPlayer}
                privateState={localPrivatePlayer}
                selectedCardId={activeSelection?.zone === 'hand' ? activeSelection.cardId : null}
                onOpenZone={(zone) => openZone(localPublicPlayer.id, zone)}
                onSelectCard={(cardId) => setSelectedCard({ zone: 'hand', cardId })}
                onQuickCast={(cardId) => moveOwnedCard('hand', 'battlefield', cardId)}
              />
            ) : null}
          </div>

          <aside className="grid gap-4 2xl:sticky 2xl:top-4 2xl:h-fit">
            <InspectorCard
              players={players}
              selected={selectedData}
              counterDraft={counterDraft}
              noteDraft={noteDraft}
              onCounterDraftChange={setCounterDraft}
              onNoteDraftChange={(value) =>
                setNoteEditor({
                  cardId: selectedPermanent?.instanceId ?? null,
                  value,
                })
              }
              onSelectCounter={(counterKind) => setCounterDraft(counterKind)}
              onMoveOwnedCard={moveOwnedCard}
              onToggleTapped={(cardId, tapped) =>
                sendGameAction(activeGameId, {
                  type: 'tap_card',
                  cardId,
                  tapped,
                })
              }
              onAdjustCounter={(cardId, counterKind, delta) =>
                sendGameAction(activeGameId, {
                  type: 'adjust_permanent_counter',
                  cardId,
                  counterKind,
                  delta,
                })
              }
              onSaveNote={(cardId, note) =>
                sendGameAction(activeGameId, {
                  type: 'set_permanent_note',
                  cardId,
                  note,
                })
              }
              onChangeControl={(cardId, controllerPlayerId) =>
                sendGameAction(activeGameId, {
                  type: 'change_control',
                  cardId,
                  controllerPlayerId,
                })
              }
              onClearSelection={() => setSelectedCard(null)}
              isLocallyControlled={isSelectedCardLocallyControlled}
              isLocalOwned={isSelectedCardLocalOwned}
            />

            <ZoneBrowser
              players={players}
              localPlayerId={localPlayerId}
              focusedPlayer={focusedPlayer}
              activeZone={activeZone}
              cards={zoneCards}
              selectedCard={activeSelection}
              onFocusPlayer={(playerId) => setFocusedPlayerId(playerId)}
              onZoneChange={setActiveZone}
              onOpenZone={openZone}
              onSelectCard={selectZoneCard}
              onQuickCast={(zone, cardId) => moveOwnedCard(zone, 'battlefield', cardId)}
            />

            <TokenWorkshop
              draft={tokenDraft}
              onDraftChange={setTokenDraft}
              onCreateToken={(preset) =>
                sendGameAction(activeGameId, {
                  type: 'create_token',
                  ...preset,
                })
              }
            />

            <ActivityLog entries={activeGame.publicState.actionLog} />
          </aside>
        </div>
      </div>
    </div>
  )
}

function TableHud({
  gameId,
  roomCode,
  startedAt,
  battlefieldCount,
  localPlayer,
  onDraw,
  onDrawSeven,
  onShuffle,
  onUntapAll,
}: {
  gameId: string
  roomCode: string
  startedAt: string
  battlefieldCount: number
  localPlayer: GamePlayerPublicSnapshot | null
  onDraw: () => void
  onDrawSeven: () => void
  onShuffle: () => void
  onUntapAll: () => void
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900/88 px-5 py-5 shadow-panel backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(223,107,11,0.12),transparent_24%)]" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-tide-100">
            <span className="rounded-full border border-tide-400/25 bg-tide-500/12 px-3 py-1">
              Live Table
            </span>
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-ink-300">
              Room {roomCode}
            </span>
          </div>

          <div>
            <h1 className="font-display text-3xl tracking-tight text-ink-50 sm:text-[2.65rem]">
              Table {gameId.slice(0, 8)}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-ink-300 sm:text-base">
              Drag cards onto your lane, double-click your permanents to tap them, and manage the
              rest from the inspector without losing sight of the board.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MetaPill icon={<ClockPip />} label={`Started ${new Date(startedAt).toLocaleTimeString()}`} />
            <MetaPill icon={<Swords className="h-3.5 w-3.5" />} label={`${battlefieldCount} permanents`} />
            {localPlayer ? (
              <>
                <MetaPill icon={<Hand className="h-3.5 w-3.5" />} label={`${localPlayer.zoneCounts.hand} in hand`} />
                <MetaPill
                  icon={<Crown className="h-3.5 w-3.5" />}
                  label={`${localPlayer.zoneCounts.command} in command`}
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <HudButton icon={<Shuffle className="h-4 w-4" />} label="Shuffle" onClick={onShuffle} />
          <HudButton icon={<BookOpen className="h-4 w-4" />} label="Draw 1" onClick={onDraw} />
          <HudButton
            icon={<Sparkles className="h-4 w-4" />}
            label="Draw 7"
            onClick={onDrawSeven}
          />
          <HudButton
            icon={<RefreshCcw className="h-4 w-4" />}
            label="Untap all"
            onClick={onUntapAll}
          />
        </div>
      </div>
    </section>
  )
}

function BattlefieldLane({
  player,
  permanents,
  localPlayerId,
  compact = false,
  selectedCardId,
  onAdjustLife,
  onOpenZone,
  onSelectPermanent,
  onDropCard,
  onToggleTapped,
}: {
  player: GamePlayerPublicSnapshot
  permanents: BattlefieldPermanentSnapshot[]
  localPlayerId: string
  compact?: boolean
  selectedCardId: string | null
  onAdjustLife: (playerId: string, delta: number) => void
  onOpenZone: (playerId: string, zone: PublicZone) => void
  onSelectPermanent: (cardId: string) => void
  onDropCard: (payload: DragPayload, position: PermanentPosition) => void
  onToggleTapped: (cardId: string, tapped: boolean) => void
}) {
  const isLocalLane = player.id === localPlayerId
  const laneHeight = compact ? 'min-h-[15rem]' : 'min-h-[18rem]'

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()

    const payload = parseDragPayload(event.dataTransfer.getData('application/x-grimoire-card'))

    if (!payload) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    onDropCard(payload, {
      x,
      y,
    })
  }

  return (
    <section
      data-lane-owner={player.name}
      data-local-lane={isLocalLane ? 'true' : 'false'}
      className={`rounded-[1.8rem] border px-4 py-4 shadow-panel ${
        isLocalLane
          ? 'border-tide-400/30 bg-ink-900/92'
          : 'border-white/10 bg-ink-900/82'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${
                isLocalLane
                  ? 'border-tide-400/30 bg-tide-500/12 text-tide-100'
                  : 'border-white/10 bg-white/6 text-ink-100'
              }`}
            >
              {isLocalLane ? <ShieldPlus className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-ink-50">{player.name}</h2>
                {isLocalLane ? (
                  <span className="rounded-full border border-tide-400/25 bg-tide-500/12 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-tide-100">
                    Your seat
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-ink-400">
                {player.deck ? `${player.deck.name} • ${player.deck.format}` : 'No deck selected'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CountPill label="Library" value={player.zoneCounts.library} />
            <CountPill label="Hand" value={player.zoneCounts.hand} />
            <CountPill label="Field" value={player.zoneCounts.battlefield} />
            {PUBLIC_ZONE_ORDER.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => onOpenZone(player.id, zone)}
                className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:border-white/20 hover:bg-white/10"
              >
                {zoneLabel(zone)} {player.zoneCounts[zone]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Life
            </p>
            <p className="mt-1 text-3xl font-semibold text-ink-50">{player.lifeTotal}</p>
          </div>
          <div className="flex gap-2">
            <LifeButton tone="secondary" onClick={() => onAdjustLife(player.id, -1)}>
              <Minus className="h-3.5 w-3.5" />
              1
            </LifeButton>
            <LifeButton tone="primary" onClick={() => onAdjustLife(player.id, +1)}>
              <Plus className="h-3.5 w-3.5" />
              1
            </LifeButton>
            <LifeButton tone="accent" onClick={() => onAdjustLife(player.id, +5)}>
              <Plus className="h-3.5 w-3.5" />
              5
            </LifeButton>
          </div>
        </div>
      </div>

      <div
        data-testid={`lane-board-${isLocalLane ? 'local' : player.name.toLowerCase().replace(/\s+/g, '-')}`}
        className={`relative mt-4 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,37,45,0.94),rgba(12,27,34,0.94))] ${laneHeight}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.08),transparent_22%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:auto,28px_28px,28px_28px]" />
        <div className="pointer-events-none absolute inset-x-4 top-[20%] border-t border-dashed border-white/8" />
        <div className="pointer-events-none absolute inset-x-4 top-[53%] border-t border-dashed border-white/8" />
        <div className="pointer-events-none absolute inset-x-4 top-[76%] border-t border-dashed border-white/8" />
        <div className="pointer-events-none absolute left-4 top-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
          Pressure row
        </div>
        <div className="pointer-events-none absolute left-4 top-[47%] text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
          Support row
        </div>
        <div className="pointer-events-none absolute left-4 top-[70%] text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
          Resource row
        </div>

        {permanents.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-ink-400">
            {isLocalLane
              ? 'Drag cards from your hand or command zone here to build your board.'
              : 'No permanents in this lane yet.'}
          </div>
        ) : null}

        {permanents.map((permanent, index) => {
          const canControl =
            permanent.ownerPlayerId === localPlayerId || permanent.controllerPlayerId === localPlayerId

          return (
            <button
              key={permanent.instanceId}
              type="button"
              data-card-name={permanent.card.name}
              draggable={canControl}
              onDragStart={(event) =>
                event.dataTransfer.setData(
                  'application/x-grimoire-card',
                  JSON.stringify({
                    cardId: permanent.instanceId,
                    fromZone: 'battlefield',
                    controllerPlayerId: permanent.controllerPlayerId,
                  } satisfies DragPayload),
                )
              }
              onClick={() => onSelectPermanent(permanent.instanceId)}
              onDoubleClick={() =>
                canControl ? onToggleTapped(permanent.instanceId, !permanent.tapped) : undefined
              }
              style={{
                left: `${permanent.position.x}%`,
                top: `${permanent.position.y}%`,
                zIndex: index + 2,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
            >
              <TableCard
                card={permanent.card}
                variant="battlefield"
                tapped={permanent.tapped}
                selected={selectedCardId === permanent.instanceId}
                counters={permanent.counters}
                note={permanent.note}
                badge={permanent.isToken ? 'Token' : undefined}
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function HandTray({
  player,
  privateState,
  selectedCardId,
  onOpenZone,
  onSelectCard,
  onQuickCast,
}: {
  player: GamePlayerPublicSnapshot
  privateState: GamePrivatePlayerState
  selectedCardId: string | null
  onOpenZone: (zone: PublicZone) => void
  onSelectCard: (cardId: string) => void
  onQuickCast: (cardId: string) => void
}) {
  return (
    <section
      data-testid="hand-tray"
      className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 px-4 py-4 shadow-panel backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Hand tray
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-50">
            {privateState.hand.length} cards in hand
          </h2>
          <p className="mt-2 text-sm text-ink-400">
            Drag cards onto your lane or double-click a card for a quick move to the battlefield.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PUBLIC_ZONE_ORDER.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => onOpenZone(zone)}
              className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-ink-100 transition hover:border-white/20 hover:bg-white/10"
            >
              {zoneLabel(zone)} {player.zoneCounts[zone]}
            </button>
          ))}
        </div>
      </div>

      {privateState.hand.length > 0 ? (
        <div className="mt-5 overflow-x-auto pb-2">
          <div className="flex min-w-max items-end px-2 pt-3">
            {privateState.hand.map((card, index) => (
              <button
                key={card.instanceId}
                type="button"
                data-card-name={card.card.name}
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData(
                    'application/x-grimoire-card',
                    JSON.stringify({
                      cardId: card.instanceId,
                      fromZone: 'hand',
                    } satisfies DragPayload),
                  )
                }
                onClick={() => onSelectCard(card.instanceId)}
                onDoubleClick={() => onQuickCast(card.instanceId)}
                className={`${index === 0 ? '' : '-ml-12'} rounded-[1.3rem] transition hover:z-10 hover:-translate-y-3`}
              >
                <TableCard
                  card={card.card}
                  variant="hand"
                  selected={selectedCardId === card.instanceId}
                  badge="Private"
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-ink-300">
          Your hand is empty. Draw cards, recover cards from public zones, or create new board
          material from the token workshop.
        </div>
      )}
    </section>
  )
}

function InspectorCard({
  players,
  selected,
  counterDraft,
  noteDraft,
  onCounterDraftChange,
  onNoteDraftChange,
  onSelectCounter,
  onMoveOwnedCard,
  onToggleTapped,
  onAdjustCounter,
  onSaveNote,
  onChangeControl,
  onClearSelection,
  isLocallyControlled,
  isLocalOwned,
}: {
  players: GamePlayerPublicSnapshot[]
  selected: SelectedCardData | null
  counterDraft: string
  noteDraft: string
  onCounterDraftChange: (value: string) => void
  onNoteDraftChange: (value: string) => void
  onSelectCounter: (value: string) => void
  onMoveOwnedCard: (
    fromZone: OwnedZone,
    toZone: OwnedZone,
    cardId: string,
    position?: PermanentPosition,
  ) => void
  onToggleTapped: (cardId: string, tapped: boolean) => void
  onAdjustCounter: (cardId: string, counterKind: string, delta: number) => void
  onSaveNote: (cardId: string, note: string) => void
  onChangeControl: (cardId: string, controllerPlayerId: string) => void
  onClearSelection: () => void
  isLocallyControlled: boolean
  isLocalOwned: boolean
}) {
  const selectedPermanent = selected?.permanent ?? null

  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Inspector
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-50">
            {selected ? selected.card.card.name : 'Table overview'}
          </h2>
          <p className="mt-2 text-sm text-ink-400">
            {selected
              ? `${selected.zone === 'battlefield' ? 'Battlefield' : zoneLabel(selected.zone)} • ${
                  selected.card.card.typeLine
                }`
              : 'Select any card to inspect it, move it, or tune the board around it.'}
          </p>
        </div>
        {selected ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink-200 transition hover:bg-white/6"
          >
            Clear
          </button>
        ) : null}
      </div>

      {selected ? (
        <>
          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-ink-800/70">
            <img
              src={selected.card.card.largeImageUrl}
              alt={selected.card.card.name}
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <InfoChip label={selected.card.card.typeLine} tone="info" />
            <InfoChip label={selected.player?.name ?? 'Unknown owner'} />
            {selectedPermanent?.isToken ? <InfoChip label="Token" tone="accent" /> : null}
            {selectedPermanent &&
            selectedPermanent.controllerPlayerId !== selected.card.ownerPlayerId ? (
              <InfoChip
                label={`Controlled by ${
                  players.find((player) => player.id === selectedPermanent.controllerPlayerId)?.name ??
                  'another player'
                }`}
                tone="warning"
              />
            ) : null}
          </div>

          <div className="mt-4 grid gap-2">
            {renderSelectedActions({
              selected,
              isLocalOwned,
              isLocallyControlled,
              onMoveOwnedCard,
              onToggleTapped,
            })}
          </div>

          {selectedPermanent && isLocallyControlled ? (
            <>
              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <ShieldPlus className="h-4 w-4 text-tide-200" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-200">
                    Counters
                  </h3>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {COUNTER_PRESETS.map((counterKind) => (
                    <button
                      key={counterKind}
                      type="button"
                      onClick={() => onSelectCounter(counterKind)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        counterDraft === counterKind
                          ? 'border-tide-400/35 bg-tide-500/12 text-tide-100'
                          : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'
                      }`}
                    >
                      {counterKind}
                    </button>
                  ))}
                </div>

                <input
                  value={counterDraft}
                  onChange={(event) => onCounterDraftChange(event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
                  placeholder="Custom counter label"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <InspectorButton
                    onClick={() => onAdjustCounter(selectedPermanent.instanceId, counterDraft, -1)}
                    tone="secondary"
                  >
                    <Minus className="h-3.5 w-3.5" />
                    Remove
                  </InspectorButton>
                  <InspectorButton
                    onClick={() => onAdjustCounter(selectedPermanent.instanceId, counterDraft, +1)}
                    tone="primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </InspectorButton>
                </div>

                {selectedPermanent.counters.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPermanent.counters.map((counter) => (
                      <span
                        key={counter.kind}
                        className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-ink-100"
                      >
                        {counter.kind} {counter.amount}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-ember-200" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-200">
                    Table note
                  </h3>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(event) => onNoteDraftChange(event.target.value)}
                  rows={3}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
                  placeholder="Status, chosen mode, remembered trigger..."
                />
                <div className="mt-3 flex justify-end">
                  <InspectorButton
                    onClick={() => onSaveNote(selectedPermanent.instanceId, noteDraft)}
                    tone="primary"
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    Save note
                  </InspectorButton>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-tide-200" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-200">
                    Control
                  </h3>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => onChangeControl(selectedPermanent.instanceId, player.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedPermanent.controllerPlayerId === player.id
                          ? 'border-ember-400/30 bg-ember-500/12 text-ember-100'
                          : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'
                      }`}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="mt-4 grid gap-3">
          <OverviewStat
            icon={<Hand className="h-4 w-4" />}
            title="Direct interaction"
            body="Drag from hand, command zone, graveyard, or exile onto your lane. Double-click your permanents to tap or untap."
          />
          <OverviewStat
            icon={<ShieldPlus className="h-4 w-4" />}
            title="Board tools"
            body="Use the inspector to add counters, write table notes, or hand control of permanents to another player."
          />
          <OverviewStat
            icon={<WandSparkles className="h-4 w-4" />}
            title="Token workshop"
            body="Spin up common tokens without cluttering the main table UI."
          />
        </div>
      )}
    </section>
  )
}

function ZoneBrowser({
  players,
  localPlayerId,
  focusedPlayer,
  activeZone,
  cards,
  selectedCard,
  onFocusPlayer,
  onZoneChange,
  onOpenZone,
  onSelectCard,
  onQuickCast,
}: {
  players: GamePlayerPublicSnapshot[]
  localPlayerId: string
  focusedPlayer: GamePlayerPublicSnapshot | null
  activeZone: PublicZone
  cards: TableCardSnapshot[]
  selectedCard: TableSelection | null
  onFocusPlayer: (playerId: string) => void
  onZoneChange: (zone: PublicZone) => void
  onOpenZone: (playerId: string, zone: PublicZone) => void
  onSelectCard: (playerId: string, zone: PublicZone, cardId: string) => void
  onQuickCast: (zone: PublicZone, cardId: string) => void
}) {
  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-tide-200" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Public zones
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink-50">
            {focusedPlayer ? focusedPlayer.name : 'No player selected'}
          </h2>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {players.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => onFocusPlayer(player.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              focusedPlayer?.id === player.id
                ? 'border-tide-400/35 bg-tide-500/12 text-tide-100'
                : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'
            }`}
          >
            {player.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PUBLIC_ZONE_ORDER.map((zone) => (
          <button
            key={zone}
            type="button"
            onClick={() => {
              onZoneChange(zone)
              if (focusedPlayer) {
                onOpenZone(focusedPlayer.id, zone)
              }
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              activeZone === zone
                ? 'border-ember-400/30 bg-ember-500/12 text-ember-100'
                : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'
            }`}
          >
            {zoneLabel(zone)} {focusedPlayer ? focusedPlayer.zoneCounts[zone] : 0}
          </button>
        ))}
      </div>

      {cards.length > 0 ? (
        <div className="mt-4 grid max-h-[24rem] grid-cols-2 gap-3 overflow-y-auto pr-1">
          {cards.map((card) => {
            const isSelected =
              selectedCard?.zone === activeZone &&
              'playerId' in selectedCard &&
              selectedCard.playerId === focusedPlayer?.id &&
              selectedCard.cardId === card.instanceId
            const canDrag = card.ownerPlayerId === localPlayerId

            return (
              <button
                key={card.instanceId}
                type="button"
                data-card-name={card.card.name}
                draggable={canDrag}
                onDragStart={(event) =>
                  canDrag
                    ? event.dataTransfer.setData(
                        'application/x-grimoire-card',
                        JSON.stringify({
                          cardId: card.instanceId,
                          fromZone: activeZone,
                        } satisfies DragPayload),
                      )
                    : undefined
                }
                onClick={() => focusedPlayer && onSelectCard(focusedPlayer.id, activeZone, card.instanceId)}
                onDoubleClick={() => (canDrag ? onQuickCast(activeZone, card.instanceId) : undefined)}
              >
                <TableCard
                  card={card.card}
                  variant="zone"
                  selected={isSelected}
                  badge={canDrag ? 'Drag' : 'Public'}
                />
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-ink-300">
          No cards in this zone right now.
        </div>
      )}
    </section>
  )
}

function TokenWorkshop({
  draft,
  onDraftChange,
  onCreateToken,
}: {
  draft: {
    name: string
    tokenType: string
    note: string
    power: string
    toughness: string
    colors: CardColor[]
  }
  onDraftChange: (value: {
    name: string
    tokenType: string
    note: string
    power: string
    toughness: string
    colors: CardColor[]
  }) => void
  onCreateToken: (preset: {
    name: string
    tokenType?: string
    note?: string
    power?: string
    toughness?: string
    colors?: CardColor[]
  }) => void
}) {
  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <WandSparkles className="h-4 w-4 text-ember-200" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Token workshop
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink-50">Common board pieces</h2>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {TOKEN_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onCreateToken(preset)}
            className="flex items-center justify-between rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
          >
            <div>
              <p className="text-sm font-semibold text-ink-100">{preset.name}</p>
              <p className="mt-1 text-xs text-ink-400">
                {preset.power && preset.toughness ? `${preset.power}/${preset.toughness} • ` : ''}
                {preset.tokenType}
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-ember-200" />
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-300">
          Custom token
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            className="rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
            placeholder="Token name"
          />
          <input
            value={draft.tokenType}
            onChange={(event) => onDraftChange({ ...draft, tokenType: event.target.value })}
            className="rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
            placeholder="Type line"
          />
          <input
            value={draft.power}
            onChange={(event) => onDraftChange({ ...draft, power: event.target.value })}
            className="rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
            placeholder="Power"
          />
          <input
            value={draft.toughness}
            onChange={(event) => onDraftChange({ ...draft, toughness: event.target.value })}
            className="rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
            placeholder="Toughness"
          />
        </div>

        <textarea
          value={draft.note}
          onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
          rows={2}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
          placeholder="Rules text or reminder text"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {(['W', 'U', 'B', 'R', 'G'] as CardColor[]).map((color) => {
            const active = draft.colors.includes(color)

            return (
              <button
                key={color}
                type="button"
                onClick={() =>
                  onDraftChange({
                    ...draft,
                    colors: active
                      ? draft.colors.filter((entry) => entry !== color)
                      : [...draft.colors, color],
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-tide-400/35 bg-tide-500/12 text-tide-100'
                    : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'
                }`}
              >
                {color}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <InspectorButton onClick={() => onCreateToken(draft)} tone="primary">
            <Sparkles className="h-3.5 w-3.5" />
            Create token
          </InspectorButton>
        </div>
      </div>
    </section>
  )
}

function ActivityLog({ entries }: { entries: GameActionEvent[] }) {
  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-ember-200" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Table feed
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink-50">Latest actions</h2>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="mt-4 grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.25rem] border border-white/10 bg-white/5 px-3 py-3"
            >
              <p className="text-sm font-medium text-ink-100">{entry.message}</p>
              <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
                {new Date(entry.createdAt).toLocaleTimeString()}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-ink-300">
          No actions recorded yet.
        </div>
      )}
    </section>
  )
}

function TableCard({
  card,
  variant,
  tapped = false,
  selected = false,
  counters = [],
  note,
  badge,
}: {
  card: MagicCard
  variant: 'battlefield' | 'hand' | 'zone'
  tapped?: boolean
  selected?: boolean
  counters?: PermanentCounter[]
  note?: string
  badge?: string
}) {
  const cardClassName =
    variant === 'battlefield'
      ? 'w-[7.8rem]'
      : variant === 'hand'
        ? 'w-[10rem]'
        : 'w-full'
  const imageClassName =
    variant === 'battlefield'
      ? 'h-[11rem]'
      : variant === 'hand'
        ? 'h-[14rem]'
        : 'h-[9.8rem]'

  return (
    <article
      className={`${cardClassName} rounded-[1.25rem] border bg-ink-900/95 p-2 shadow-card transition ${
        selected
          ? 'border-tide-300/60 ring-2 ring-tide-300/20'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className={`relative ${imageClassName} overflow-visible`}>
        <div
          className={`absolute inset-0 overflow-hidden rounded-[0.95rem] border border-white/10 bg-ink-800/70 transition duration-200 ${
            tapped && variant === 'battlefield'
              ? 'translate-x-4 translate-y-4 rotate-90 origin-center'
              : ''
          }`}
        >
          <img src={card.imageUrl} alt={card.name} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-2 py-2">
            <p className="line-clamp-2 text-xs font-semibold text-white">{card.name}</p>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="line-clamp-2 text-[0.7rem] font-medium text-ink-300">{card.typeLine}</p>
        {badge ? (
          <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-ink-100">
            {badge}
          </span>
        ) : null}
      </div>

      {variant === 'battlefield' && (counters.length > 0 || note) ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {counters.slice(0, 3).map((counter) => (
            <span
              key={counter.kind}
              className="rounded-full border border-ember-400/20 bg-ember-500/10 px-2 py-1 text-[0.6rem] font-semibold text-ember-100"
            >
              {counter.kind} {counter.amount}
            </span>
          ))}
          {note ? (
            <span className="rounded-full border border-tide-400/20 bg-tide-500/10 px-2 py-1 text-[0.6rem] font-semibold text-tide-100">
              Note
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-ink-100">
      {icon}
      {label}
    </span>
  )
}

function HudButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-ink-100 transition hover:border-white/20 hover:bg-white/10"
    >
      {icon}
      {label}
    </button>
  )
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-ink-100">
      {label} {value}
    </span>
  )
}

function LifeButton({
  children,
  tone,
  onClick,
}: {
  children: ReactNode
  tone: 'secondary' | 'primary' | 'accent'
  onClick: () => void
}) {
  const toneClassName =
    tone === 'primary'
      ? 'border-tide-400/25 bg-tide-500/12 text-tide-100 hover:border-tide-400/40'
      : tone === 'accent'
        ? 'border-ember-400/25 bg-ember-500/12 text-ember-100 hover:border-ember-400/40'
        : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${toneClassName}`}
    >
      {children}
    </button>
  )
}

function InspectorButton({
  children,
  tone = 'secondary',
  onClick,
}: {
  children: ReactNode
  tone?: 'secondary' | 'primary' | 'danger'
  onClick: () => void
}) {
  const toneClassName =
    tone === 'primary'
      ? 'border-tide-400/25 bg-tide-500/12 text-tide-100 hover:border-tide-400/40'
      : tone === 'danger'
        ? 'border-rose-400/25 bg-rose-500/12 text-rose-100 hover:border-rose-400/40'
        : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${toneClassName}`}
    >
      {children}
    </button>
  )
}

function InfoChip({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'info' | 'warning' | 'accent'
}) {
  const toneClassName =
    tone === 'info'
      ? 'border-tide-400/25 bg-tide-500/12 text-tide-100'
      : tone === 'warning'
        ? 'border-ember-400/25 bg-ember-500/12 text-ember-100'
        : tone === 'accent'
          ? 'border-rose-400/25 bg-rose-500/12 text-rose-100'
          : 'border-white/10 bg-white/6 text-ink-100'

  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClassName}`}>
      {label}
    </span>
  )
}

function OverviewStat({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
      <div className="flex items-center gap-2 text-tide-100">{icon}</div>
      <h3 className="mt-3 text-base font-semibold text-ink-50">{title}</h3>
      <p className="mt-2 text-sm text-ink-300">{body}</p>
    </article>
  )
}

function ClockPip() {
  return <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
}

function zoneLabel(zone: PublicZone | OwnedZone) {
  switch (zone) {
    case 'command':
      return 'Command'
    case 'graveyard':
      return 'Graveyard'
    case 'exile':
      return 'Exile'
    case 'battlefield':
      return 'Battlefield'
    case 'hand':
      return 'Hand'
  }
}

function parseDragPayload(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as unknown

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as DragPayload).cardId === 'string' &&
      typeof (parsed as DragPayload).fromZone === 'string'
    ) {
      return parsed as DragPayload
    }

    return null
  } catch {
    return null
  }
}

function findSelectedCardData(
  selection: TableSelection | null,
  battlefield: BattlefieldPermanentSnapshot[],
  players: GamePlayerPublicSnapshot[],
  privateState: GamePrivatePlayerState | null,
): SelectedCardData | null {
  if (!selection) {
    return null
  }

  if (selection.zone === 'battlefield') {
    const permanent = battlefield.find((card) => card.instanceId === selection.cardId)

    if (!permanent) {
      return null
    }

    return {
      zone: 'battlefield',
      card: permanent,
      player: players.find((player) => player.id === permanent.ownerPlayerId) ?? null,
      permanent,
    }
  }

  if (selection.zone === 'hand') {
    const card = privateState?.hand.find((entry) => entry.instanceId === selection.cardId)

    if (!card) {
      return null
    }

    return {
      zone: 'hand',
      card,
      player: players.find((player) => player.id === card.ownerPlayerId) ?? null,
      permanent: null,
    }
  }

  const zoneOwner = players.find((player) => player.id === selection.playerId) ?? null
  const zoneCards = zoneOwner?.[selection.zone] ?? []
  const card = zoneCards.find((entry) => entry.instanceId === selection.cardId) ?? null

  if (!card) {
    return null
  }

  return {
    zone: selection.zone,
    card,
    player: zoneOwner,
    permanent: null,
  }
}

function renderSelectedActions({
  selected,
  isLocalOwned,
  isLocallyControlled,
  onMoveOwnedCard,
  onToggleTapped,
}: {
  selected: SelectedCardData
  isLocalOwned: boolean
  isLocallyControlled: boolean
  onMoveOwnedCard: (
    fromZone: OwnedZone,
    toZone: OwnedZone,
    cardId: string,
    position?: PermanentPosition,
  ) => void
  onToggleTapped: (cardId: string, tapped: boolean) => void
}) {
  if (selected.zone === 'battlefield' && selected.permanent) {
    return (
      <>
        {isLocallyControlled ? (
          <InspectorButton
            onClick={() => onToggleTapped(selected.permanent!.instanceId, !selected.permanent!.tapped)}
            tone="primary"
          >
            {selected.permanent.tapped ? <RefreshCcw className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
            {selected.permanent.tapped ? 'Untap' : 'Tap'}
          </InspectorButton>
        ) : null}

        {isLocallyControlled || isLocalOwned ? (
          <>
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'graveyard', selected.permanent!.instanceId)}
            >
              <ScrollText className="h-3.5 w-3.5" />
              Graveyard
            </InspectorButton>
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'command', selected.permanent!.instanceId)}
            >
              <Crown className="h-3.5 w-3.5" />
              Command
            </InspectorButton>
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'hand', selected.permanent!.instanceId)}
            >
              <Hand className="h-3.5 w-3.5" />
              Hand
            </InspectorButton>
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'exile', selected.permanent!.instanceId)}
              tone="danger"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Exile
            </InspectorButton>
          </>
        ) : (
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-3 text-sm text-ink-300">
            This permanent is read-only from your seat.
          </div>
        )}
      </>
    )
  }

  if (!isLocalOwned) {
    return (
      <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-3 text-sm text-ink-300">
        Public card. You can inspect it, but only its owner can move it between zones.
      </div>
    )
  }

  return (
    <>
      {selected.zone !== 'battlefield' ? (
        <InspectorButton
          onClick={() => onMoveOwnedCard(selected.zone, 'battlefield', selected.card.instanceId)}
          tone="primary"
        >
          <Swords className="h-3.5 w-3.5" />
          Battlefield
        </InspectorButton>
      ) : null}
      {selected.zone !== 'hand' ? (
        <InspectorButton onClick={() => onMoveOwnedCard(selected.zone, 'hand', selected.card.instanceId)}>
          <Hand className="h-3.5 w-3.5" />
          Hand
        </InspectorButton>
      ) : null}
      {selected.zone !== 'command' ? (
        <InspectorButton onClick={() => onMoveOwnedCard(selected.zone, 'command', selected.card.instanceId)}>
          <Crown className="h-3.5 w-3.5" />
          Command
        </InspectorButton>
      ) : null}
      {selected.zone !== 'graveyard' ? (
        <InspectorButton onClick={() => onMoveOwnedCard(selected.zone, 'graveyard', selected.card.instanceId)}>
          <ScrollText className="h-3.5 w-3.5" />
          Graveyard
        </InspectorButton>
      ) : null}
      {selected.zone !== 'exile' ? (
        <InspectorButton
          onClick={() => onMoveOwnedCard(selected.zone, 'exile', selected.card.instanceId)}
          tone="danger"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Exile
        </InspectorButton>
      ) : null}
      {selected.zone === 'hand' ? (
        <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-3 text-sm text-ink-300">
          Drag onto your lane or double-click from the hand tray for a fast battlefield move.
        </div>
      ) : null}
    </>
  )
}
