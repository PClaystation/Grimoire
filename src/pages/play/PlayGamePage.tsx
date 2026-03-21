import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from 'react'
import {
  ArrowRight,
  BookOpen,
  Crown,
  FlaskConical,
  Hand,
  History,
  Layers3,
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
  ClientGameAction,
  GameActionEvent,
  GamePlayerPublicSnapshot,
  GamePrivatePlayerState,
  OwnedZone,
  PermanentCounter,
  PermanentPosition,
  StackItemSnapshot,
  TableCardSnapshot,
} from '@/shared/play'
import type { CardColor, MagicCard } from '@/types/scryfall'
import { formatManaCost, formatTypeLine } from '@/utils/format'

type PublicZone = 'graveyard' | 'exile' | 'command'
type PrivateZone = 'hand' | 'library'
type BrowseableZone = PublicZone | 'library'

type TableSelection =
  | { zone: 'battlefield'; cardId: string }
  | { zone: PrivateZone; cardId: string }
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

interface BattlefieldStackGroup {
  id: string
  position: PermanentPosition
  cards: BattlefieldPermanentSnapshot[]
}

interface ZoneOverlayAnchor {
  left: number
  top: number
}

const COUNTER_PRESETS = ['+1/+1', 'loyalty', 'shield', 'stun']
const PLAYER_COUNTER_PRESETS = ['poison', 'energy', 'experience', 'rad']
const MTG_CARD_BACK_URL = '/Magic_card_back-removebg.png'
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
  const [activeZone, setActiveZone] = useState<BrowseableZone>('graveyard')
  const [isZoneOverlayOpen, setIsZoneOverlayOpen] = useState(false)
  const [isZoneOverlayClosing, setIsZoneOverlayClosing] = useState(false)
  const [utilityPanel, setUtilityPanel] = useState<'players' | 'stack' | 'tokens' | 'log'>('players')
  const [counterDraft, setCounterDraft] = useState(COUNTER_PRESETS[0])
  const [playerCounterDraft, setPlayerCounterDraft] = useState(PLAYER_COUNTER_PRESETS[0])
  const [noteEditor, setNoteEditor] = useState<{ cardId: string | null; value: string }>({
    cardId: null,
    value: '',
  })
  const [zoneOverlayAnimationToken, setZoneOverlayAnimationToken] = useState(0)
  const [playerNoteEditor, setPlayerNoteEditor] = useState<{ playerId: string | null; value: string }>({
    playerId: null,
    value: '',
  })
  const [stackDraft, setStackDraft] = useState({
    itemType: 'ability' as StackItemSnapshot['itemType'],
    label: '',
    note: '',
    targets: '',
    faceDown: false,
  })
  const [tokenDraft, setTokenDraft] = useState({
    name: 'Spirit',
    tokenType: 'Creature Token',
    note: 'Flying',
    power: '1',
    toughness: '1',
    colors: ['W'] as CardColor[],
  })
  const zoneOverlayCloseTimeoutRef = useRef<number | null>(null)
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

  useEffect(() => {
    return () => {
      if (zoneOverlayCloseTimeoutRef.current !== null) {
        window.clearTimeout(zoneOverlayCloseTimeoutRef.current)
      }
    }
  }, [])

  const activeGame = game
  const players = activeGame?.publicState.players ?? []
  const localPlayerId = activeGame?.localPlayerId ?? ''
  const localPublicPlayer = players.find((player) => player.id === localPlayerId) ?? null
  const localPrivatePlayer = activeGame?.privateState ?? null
  const turn = activeGame?.publicState.turn ?? null
  const activeTurnPlayer =
    players.find((player) => player.id === turn?.activePlayerId) ?? players[0] ?? null
  const isLocalPlayersTurn = Boolean(localPlayerId) && activeTurnPlayer?.id === localPlayerId
  const opponentPlayers = players.filter((player) => player.id !== localPlayerId)
  const battlefieldByController = players.map((player) => ({
    player,
    permanents: battlefield
      .filter((card) => card.controllerPlayerId === player.id)
      .sort(compareBattlefieldPermanents),
  }))
  const resolvedFocusedPlayerId = focusedPlayerId ?? localPublicPlayer?.id ?? players[0]?.id ?? null
  const focusedPlayer =
    players.find((player) => player.id === resolvedFocusedPlayerId) ??
    localPublicPlayer ??
    players[0] ??
    null
  const selectedData = findSelectedCardData(selectedCard, battlefield, players, localPrivatePlayer)
  const activeSelection = selectedData ? selectedCard : null
  const zoneCards =
    activeZone === 'library'
      ? localPrivatePlayer?.library ?? []
      : focusedPlayer
        ? focusedPlayer[activeZone]
        : []
  const selectedPermanent = selectedData?.permanent ?? null
  const selectedStackCards = selectedPermanent
    ? getPermanentStackCards(battlefield, selectedPermanent.instanceId)
    : []
  const noteDraft =
    selectedPermanent && noteEditor.cardId === selectedPermanent.instanceId
      ? noteEditor.value
      : selectedPermanent?.note ?? ''
  const isSelectedCardLocalOwned = selectedData?.card.ownerPlayerId === localPlayerId
  const isSelectedCardLocallyControlled =
    selectedPermanent !== null &&
    (selectedPermanent.ownerPlayerId === localPlayerId ||
      selectedPermanent.controllerPlayerId === localPlayerId)
  const focusedPlayerNoteDraft =
    focusedPlayer && playerNoteEditor.playerId === focusedPlayer.id
      ? playerNoteEditor.value
      : focusedPlayer?.note ?? ''

  if (!activeGame || activeGame.gameId !== gameId) {
    return (
      <PlayFrame
        eyebrow="Game Table"
        title="Waiting for the game state."
        description="If this browser is in an active room, the game will appear after sync."
        connectionStatus={connectionStatus}
        error={error}
        onDismissError={clearError}
      >
        <section className="rounded-[2rem] border border-white/10 bg-ink-900/82 p-6 shadow-panel">
          <p className="text-sm text-ink-300">No matching game is loaded.</p>
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

  function sendTurnAction(action: ClientGameAction) {
    if (!isLocalPlayersTurn) {
      return
    }

    sendGameAction(activeGameId, action)
  }

  function moveOwnedCard(
    fromZone: OwnedZone,
    toZone: OwnedZone,
    cardId: string,
    position?: PermanentPosition,
  ) {
    sendTurnAction({
      type: 'move_owned_card',
      cardId,
      fromZone,
      toZone,
      position,
    })
  }

  function openZone(playerId: string, zone: BrowseableZone) {
    if (zone === 'library' && playerId !== localPlayerId) {
      return
    }

    if (zoneOverlayCloseTimeoutRef.current !== null) {
      window.clearTimeout(zoneOverlayCloseTimeoutRef.current)
      zoneOverlayCloseTimeoutRef.current = null
    }

    setFocusedPlayerId(playerId)
    setActiveZone(zone)
    setIsZoneOverlayOpen(true)
    setIsZoneOverlayClosing(false)
    setZoneOverlayAnimationToken((value) => value + 1)
  }

  function selectZoneCard(playerId: string, zone: PublicZone, cardId: string) {
    setSelectedCard({ zone, playerId, cardId })

    if (!isZoneOverlayOpen) {
      openZone(playerId, zone)
    }
  }

  function closeZoneOverlay() {
    if (!isZoneOverlayOpen || isZoneOverlayClosing) {
      return
    }

    setIsZoneOverlayClosing(true)

    if (zoneOverlayCloseTimeoutRef.current !== null) {
      window.clearTimeout(zoneOverlayCloseTimeoutRef.current)
    }

    zoneOverlayCloseTimeoutRef.current = window.setTimeout(() => {
      setIsZoneOverlayOpen(false)
      setIsZoneOverlayClosing(false)
      zoneOverlayCloseTimeoutRef.current = null
    }, 180)
  }

  function openLocalLibrary() {
    if (!localPlayerId) {
      return
    }

    openZone(localPlayerId, 'library')
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 pb-28 text-ink-50 sm:px-6 sm:pb-32 lg:px-8 lg:pb-36">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4">
        <SiteNav connectionStatus={connectionStatus} compact />

        <TableHud
          gameId={activeGameId}
          startedAt={activeGame.publicState.startedAt}
          roomCode={room?.code ?? activeGame.roomId}
          isDebugMode={activeGame.debugMode}
          battlefieldCount={battlefield.length}
          turn={activeGame.publicState.turn}
          activePlayer={activeTurnPlayer}
          localPlayer={localPublicPlayer}
          isLocalPlayersTurn={isLocalPlayersTurn}
          onAdvanceTurn={() => sendTurnAction({ type: 'advance_turn' })}
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

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div className="relative">
            <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,26,33,0.98),rgba(7,18,24,0.99))] p-5 shadow-panel lg:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(29,150,167,0.15),transparent_28%),radial-gradient(circle_at_bottom,rgba(223,107,11,0.13),transparent_28%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:auto,auto,34px_34px,34px_34px]" />
              <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_68%)] blur-2xl" />
              {isLocalPlayersTurn ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_72%)] blur-2xl" />
              ) : null}
              <div className="relative grid gap-6">
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
                      isActiveTurnPlayer={activeTurnPlayer?.id === player.id}
                      isLocalPlayersTurn={isLocalPlayersTurn}
                      compact
                      selectedCardId={
                        activeSelection?.zone === 'battlefield' ? activeSelection.cardId : null
                      }
                      onAdjustLife={(playerId, delta) =>
                        sendTurnAction({
                          type: 'adjust_life',
                          playerId,
                          delta,
                        })
                      }
                      onOpenZone={openZone}
                      onDrawCard={() => sendTurnAction({ type: 'draw_card' })}
                      onBrowseLocalLibrary={openLocalLibrary}
                      onShuffle={() => sendTurnAction({ type: 'shuffle_library' })}
                      onUntapAll={() => sendTurnAction({ type: 'untap_all' })}
                      onSelectPermanent={(cardId) => {
                        setSelectedCard({ zone: 'battlefield', cardId })
                        setFocusedPlayerId(player.id)
                      }}
                      onDropCard={(payload, position) => {
                        if (payload.fromZone === 'battlefield') {
                          if (payload.controllerPlayerId === player.id) {
                            sendTurnAction({
                              type: 'set_permanent_position',
                              cardId: payload.cardId,
                              position,
                            })
                          }
                          return
                        }
                      }}
                      onToggleTapped={(cardId, tapped) =>
                        sendTurnAction({
                          type: 'tap_card',
                          cardId,
                          tapped,
                        })
                      }
                      onStackCard={(cardId, stackWithCardId) =>
                        sendTurnAction({
                          type: 'set_permanent_stack',
                          cardId,
                          stackWithCardId,
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
                  privateState={localPrivatePlayer}
                  isActiveTurnPlayer={activeTurnPlayer?.id === player.id}
                  isLocalPlayersTurn={isLocalPlayersTurn}
                  selectedCardId={
                    activeSelection?.zone === 'battlefield' ? activeSelection.cardId : null
                  }
                  onAdjustLife={(playerId, delta) =>
                    sendTurnAction({
                      type: 'adjust_life',
                      playerId,
                      delta,
                    })
                  }
                  onOpenZone={openZone}
                  onDrawCard={() => sendTurnAction({ type: 'draw_card' })}
                  onBrowseLocalLibrary={openLocalLibrary}
                  onShuffle={() => sendTurnAction({ type: 'shuffle_library' })}
                  onUntapAll={() => sendTurnAction({ type: 'untap_all' })}
                  onSelectPermanent={(cardId) => {
                    setSelectedCard({ zone: 'battlefield', cardId })
                    setFocusedPlayerId(player.id)
                  }}
                  onDropCard={(payload, position) => {
                    if (payload.fromZone === 'battlefield') {
                      sendTurnAction({
                        type: 'set_permanent_position',
                        cardId: payload.cardId,
                        position,
                      })
                      return
                    }

                    moveOwnedCard(payload.fromZone, 'battlefield', payload.cardId, position)
                  }}
                  onToggleTapped={(cardId, tapped) =>
                    sendTurnAction({
                      type: 'tap_card',
                      cardId,
                      tapped,
                    })
                  }
                  onStackCard={(cardId, stackWithCardId) =>
                    sendTurnAction({
                      type: 'set_permanent_stack',
                      cardId,
                      stackWithCardId,
                    })
                  }
                />
              ))}

            {localPublicPlayer && localPrivatePlayer ? (
              <HandTray
                privateState={localPrivatePlayer}
                canAct={isLocalPlayersTurn}
                activePlayerName={activeTurnPlayer?.name ?? 'Unknown player'}
                selectedCardId={
                  activeSelection?.zone === 'hand' || activeSelection?.zone === 'library'
                    ? activeSelection.cardId
                    : null
                }
                onSelectCard={(cardId) => setSelectedCard({ zone: 'hand', cardId })}
                onQuickCast={(cardId) => moveOwnedCard('hand', 'battlefield', cardId)}
              />
            ) : null}
              </div>
            </section>

            {isZoneOverlayOpen ? (
              <ZoneOverlay
                localPlayerId={localPlayerId}
                canAct={isLocalPlayersTurn}
                focusedPlayer={focusedPlayer}
                activeZone={activeZone}
                cards={zoneCards}
                selectedCard={activeSelection}
                onClose={closeZoneOverlay}
                onSelectCard={selectZoneCard}
                onSelectLibraryCard={(cardId) => setSelectedCard({ zone: 'library', cardId })}
                onMoveOwnedCard={moveOwnedCard}
                animationToken={zoneOverlayAnimationToken}
                isClosing={isZoneOverlayClosing}
              />
            ) : null}
          </div>

          <aside className="grid gap-4 2xl:sticky 2xl:top-4 2xl:h-fit">
            <InspectorCard
              players={players}
              selected={selectedData}
              canAct={isLocalPlayersTurn}
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
              stackCards={selectedStackCards}
              onToggleTapped={(cardId, tapped) =>
                sendTurnAction({
                  type: 'tap_card',
                  cardId,
                  tapped,
                })
              }
              onSetStack={(cardId, stackWithCardId) =>
                sendTurnAction({
                  type: 'set_permanent_stack',
                  cardId,
                  stackWithCardId,
                })
              }
              onAdjustCounter={(cardId, counterKind, delta) =>
                sendTurnAction({
                  type: 'adjust_permanent_counter',
                  cardId,
                  counterKind,
                  delta,
                })
              }
              onSaveNote={(cardId, note) =>
                sendTurnAction({
                  type: 'set_permanent_note',
                  cardId,
                  note,
                })
              }
              onSetFaceDown={(cardId, faceDown) =>
                sendTurnAction({
                  type: 'set_permanent_face_down',
                  cardId,
                  faceDown,
                })
              }
              onChangeControl={(cardId, controllerPlayerId) =>
                sendTurnAction({
                  type: 'change_control',
                  cardId,
                  controllerPlayerId,
                })
              }
              onClearSelection={() => setSelectedCard(null)}
              isLocallyControlled={isSelectedCardLocallyControlled}
              isLocalOwned={isSelectedCardLocalOwned}
            />
            <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-3 shadow-panel">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['players', 'Players'],
                  ['stack', 'Stack'],
                  ['tokens', 'Tokens'],
                  ['log', 'Log'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setUtilityPanel(value as 'players' | 'stack' | 'tokens' | 'log')
                    }
                    className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                      utilityPanel === value
                        ? 'border-tide-400/35 bg-tide-500/12 text-tide-100'
                        : 'border-white/10 bg-white/6 text-ink-200 hover:border-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                {utilityPanel === 'players' ? (
                  <PlayerStatePanel
                    players={players}
                    focusedPlayer={focusedPlayer}
                    localPlayerId={localPlayerId}
                    canAct={isLocalPlayersTurn}
                    counterDraft={playerCounterDraft}
                    noteDraft={focusedPlayerNoteDraft}
                    onCounterDraftChange={setPlayerCounterDraft}
                    onNoteDraftChange={(value) =>
                      setPlayerNoteEditor({
                        playerId: focusedPlayer?.id ?? null,
                        value,
                      })
                    }
                    onFocusPlayer={(playerId) => setFocusedPlayerId(playerId)}
                    onAdjustCounter={(playerId, counterKind, delta) =>
                      sendTurnAction({
                        type: 'adjust_player_counter',
                        playerId,
                        counterKind,
                        delta,
                      })
                    }
                    onSaveNote={(playerId, note) =>
                      sendTurnAction({
                        type: 'set_player_note',
                        playerId,
                        note,
                      })
                    }
                    onSetDesignation={(playerId, designation, value) =>
                      sendTurnAction({
                        type: 'set_player_designation',
                        playerId,
                        designation,
                        value,
                      })
                    }
                    onAdjustCommanderTax={(playerId, delta) =>
                      sendTurnAction({
                        type: 'adjust_commander_tax',
                        playerId,
                        delta,
                      })
                    }
                    onAdjustCommanderDamage={(playerId, sourcePlayerId, delta) =>
                      sendTurnAction({
                        type: 'adjust_commander_damage',
                        playerId,
                        sourcePlayerId,
                        delta,
                      })
                    }
                  />
                ) : null}

                {utilityPanel === 'stack' ? (
                  <StackPanel
                    stack={activeGame.publicState.stack}
                    selected={selectedData}
                    isLocalOwned={Boolean(isSelectedCardLocalOwned)}
                    canAct={isLocalPlayersTurn}
                    draft={stackDraft}
                    onDraftChange={setStackDraft}
                    onCreateFromSelected={(itemType, note, faceDown) => {
                      if (!selectedData || selectedData.zone === 'battlefield' || !isSelectedCardLocalOwned) {
                        return
                      }

                      sendTurnAction({
                        type: 'create_stack_item',
                        itemType,
                        cardId: selectedData.card.instanceId,
                        fromZone: selectedData.zone,
                        note,
                        faceDown,
                      })
                    }}
                    onCreateManual={(payload) =>
                      sendTurnAction({
                        type: 'create_stack_item',
                        ...payload,
                      })
                    }
                    onResolve={(stackItemId) =>
                      sendTurnAction({
                        type: 'resolve_stack_item',
                        stackItemId,
                      })
                    }
                    onRemove={(stackItemId) =>
                      sendTurnAction({
                        type: 'remove_stack_item',
                        stackItemId,
                      })
                    }
                  />
                ) : null}

                {utilityPanel === 'tokens' ? (
                  <TokenWorkshop
                    canAct={isLocalPlayersTurn}
                    draft={tokenDraft}
                    onDraftChange={setTokenDraft}
                    onCreateToken={(preset) =>
                      sendTurnAction({
                        type: 'create_token',
                        ...preset,
                      })
                    }
                  />
                ) : null}

                {utilityPanel === 'log' ? (
                  <ActivityLog entries={activeGame.publicState.actionLog} />
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
      <TurnDock
        activePlayerName={activeTurnPlayer?.name ?? 'Unknown player'}
        isLocalPlayersTurn={isLocalPlayersTurn}
        onAdvanceTurn={() => sendTurnAction({ type: 'advance_turn' })}
      />
    </div>
  )
}

function TableHud({
  gameId,
  roomCode,
  startedAt,
  isDebugMode,
  battlefieldCount,
  turn,
  activePlayer,
  localPlayer,
  isLocalPlayersTurn,
  onAdvanceTurn,
}: {
  gameId: string
  roomCode: string
  startedAt: string
  isDebugMode: boolean
  battlefieldCount: number
  turn: { turnNumber: number; activePlayerId: string }
  activePlayer: GamePlayerPublicSnapshot | null
  localPlayer: GamePlayerPublicSnapshot | null
  isLocalPlayersTurn: boolean
  onAdvanceTurn: () => void
}) {
  return (
    <section
      className={`relative isolate overflow-hidden rounded-[2rem] border px-5 py-5 shadow-panel ${
        isLocalPlayersTurn
          ? 'border-emerald-400/25 bg-[linear-gradient(180deg,rgba(8,35,24,0.97),rgba(6,24,17,0.98))] shadow-[0_0_0_1px_rgba(34,197,94,0.14),0_18px_55px_rgba(0,0,0,0.28)]'
          : 'border-white/10 bg-ink-900/94'
      }`}
    >
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
              The active player owns the table controls. Draw from the library pile on the board and open graveyards, command, and exile directly as table overlays.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MetaPill icon={<ClockPip />} label={`Started ${new Date(startedAt).toLocaleTimeString()}`} />
            <MetaPill icon={<Swords className="h-3.5 w-3.5" />} label={`${battlefieldCount} permanents`} />
            {isDebugMode ? (
              <MetaPill icon={<FlaskConical className="h-3.5 w-3.5" />} label="Sandbox room" />
            ) : null}
            <MetaPill
              icon={<Crown className="h-3.5 w-3.5" />}
              label={`Turn ${turn.turnNumber} • ${activePlayer?.name ?? 'Unknown player'} acting`}
            />
            {localPlayer ? (
              <>
                <MetaPill
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  label={`${localPlayer.zoneCounts.library} in library`}
                />
                <MetaPill icon={<Hand className="h-3.5 w-3.5" />} label={`${localPlayer.zoneCounts.hand} in hand`} />
                <MetaPill
                  icon={<Crown className="h-3.5 w-3.5" />}
                  label={`${localPlayer.zoneCounts.command} in command`}
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/6 p-4 xl:min-w-[25rem]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Turn spotlight
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] ${
                    isLocalPlayersTurn
                      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
                      : 'border-ember-400/25 bg-ember-500/12 text-ember-100'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isLocalPlayersTurn
                        ? 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]'
                        : 'bg-ember-300 shadow-[0_0_14px_rgba(253,186,116,0.75)]'
                    }`}
                  />
                  {isLocalPlayersTurn ? 'Your turn' : `${activePlayer?.name ?? 'Unknown player'}'s turn`}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-50">
                  {isLocalPlayersTurn
                    ? 'You can move cards and use the board.'
                    : `Actions stay locked until ${activePlayer?.name ?? 'the active player'} passes.`}
                </h2>
              </div>
              <HudButton
                icon={<ArrowRight className="h-4 w-4" />}
                label="Pass turn"
                onClick={onAdvanceTurn}
                disabled={!isLocalPlayersTurn}
                dataTestId="table-hud-pass-turn"
              />
            </div>
          </div>

          <p className="text-sm leading-6 text-ink-300">
            The library, graveyard, command, and exile piles now live inside each lane so the board carries the game flow instead of the old phase toolbar.
          </p>
        </div>
      </div>
    </section>
  )
}

function BattlefieldLane({
  player,
  permanents,
  localPlayerId,
  privateState = null,
  compact = false,
  isActiveTurnPlayer,
  isLocalPlayersTurn,
  selectedCardId,
  onAdjustLife,
  onOpenZone,
  onDrawCard,
  onBrowseLocalLibrary,
  onShuffle,
  onUntapAll,
  onSelectPermanent,
  onDropCard,
  onToggleTapped,
  onStackCard,
}: {
  player: GamePlayerPublicSnapshot
  permanents: BattlefieldPermanentSnapshot[]
  localPlayerId: string
  privateState?: GamePrivatePlayerState | null
  compact?: boolean
  isActiveTurnPlayer: boolean
  isLocalPlayersTurn: boolean
  selectedCardId: string | null
  onAdjustLife: (playerId: string, delta: number) => void
  onOpenZone: (playerId: string, zone: BrowseableZone) => void
  onDrawCard: () => void
  onBrowseLocalLibrary: () => void
  onShuffle: () => void
  onUntapAll: () => void
  onSelectPermanent: (cardId: string) => void
  onDropCard: (payload: DragPayload, position: PermanentPosition) => void
  onToggleTapped: (cardId: string, tapped: boolean) => void
  onStackCard: (cardId: string, stackWithCardId: string | null) => void
}) {
  const isLocalLane = player.id === localPlayerId
  const laneHeight = compact ? 'min-h-[22rem]' : 'min-h-[27rem]'
  const stackGroups = buildBattlefieldStackGroups(permanents)
  const stackOffsetX = compact ? 10 : 12
  const stackOffsetY = compact ? 6 : 8

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!isLocalPlayersTurn) {
      return
    }

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
      className={`rounded-[2rem] border px-5 py-5 ${
        isLocalLane
          ? 'border-tide-400/18 bg-[linear-gradient(180deg,rgba(8,26,34,0.55),rgba(7,18,24,0.26))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,22,29,0.38),rgba(7,17,24,0.16))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
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
                {isActiveTurnPlayer ? (
                  <span className="rounded-full border border-ember-400/30 bg-ember-500/12 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ember-100">
                    Active turn
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-ink-400">
                {player.deck ? `${player.deck.name} • ${player.deck.format}` : 'No deck selected'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CountPill label="Hand" value={player.zoneCounts.hand} />
            <CountPill label="Field" value={player.zoneCounts.battlefield} />
            <CountPill label="Library" value={player.zoneCounts.library} />
            <CountPill label="Graveyard" value={player.zoneCounts.graveyard} />
            <CountPill label="Command" value={player.zoneCounts.command} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Life
            </p>
            <p className="mt-1 text-3xl font-semibold text-ink-50">{player.lifeTotal}</p>
          </div>
          <fieldset disabled={!isLocalPlayersTurn} className={isLocalPlayersTurn ? '' : 'opacity-60'}>
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
          </fieldset>
        </div>
      </div>

      <div
        className={`mt-4 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,22,29,0.56),rgba(5,13,17,0.86))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${laneHeight}`}
      >
        <div className="grid h-full gap-0 xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div
            data-testid={`lane-board-${isLocalLane ? 'local' : player.name.toLowerCase().replace(/\s+/g, '-')}`}
            data-lane-dropzone="true"
            className="relative h-full min-h-[22rem] overflow-hidden border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,48,58,0.84),rgba(8,25,32,0.94))] xl:border-b-0 xl:border-r"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(240,125,39,0.08),transparent_30%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:auto,auto,28px_28px,28px_28px]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[31%] border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(223,107,11,0.1))]" />
            <div className="pointer-events-none absolute left-4 top-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
              Play field
            </div>
            <div className="pointer-events-none absolute right-4 bottom-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ember-200/80">
              Mana shelf
            </div>

            {permanents.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-ink-400">
                {isLocalLane
                  ? isLocalPlayersTurn
                    ? 'Drag cards here. Drop one permanent onto another to stack them.'
                    : `Waiting for the active player. Your board unlocks on your turn.`
                  : 'No permanents in this lane yet.'}
              </div>
            ) : null}

            {stackGroups.map((group, index) => {
              const stackWidth = 192 + (group.cards.length - 1) * stackOffsetX
              const stackHeight = 212 + (group.cards.length - 1) * stackOffsetY

              return (
                <div
                  key={group.id}
                  style={{
                    left: `${group.position.x}%`,
                    top: `${group.position.y}%`,
                    zIndex: index + 2,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
                >
                  <div
                    className="relative"
                    style={{
                      width: `${stackWidth}px`,
                      height: `${stackHeight}px`,
                    }}
                  >
                    {group.cards.length > 1 ? (
                      <div className="absolute left-2 top-2 z-30 rounded-full border border-tide-400/25 bg-ink-950/85 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-tide-100 shadow-lg">
                        {group.cards.length} card stack
                      </div>
                    ) : null}

                    {group.cards.map((permanent, stackIndex) => {
                      const canControl =
                        isLocalPlayersTurn &&
                        (permanent.ownerPlayerId === localPlayerId ||
                          permanent.controllerPlayerId === localPlayerId)

                      return (
                        <div
                          key={permanent.instanceId}
                          style={{
                            left: `${stackIndex * stackOffsetX}px`,
                            top: `${stackIndex * stackOffsetY}px`,
                            zIndex: stackIndex + 1,
                          }}
                          className="absolute"
                        >
                          <div className="relative h-[13.25rem] w-[12rem]">
                            {canControl ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onToggleTapped(permanent.instanceId, !permanent.tapped)
                                }}
                                className={`absolute right-1 top-1 z-20 rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition ${
                                  permanent.tapped
                                    ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100 hover:border-emerald-400/40'
                                    : 'border-ember-400/25 bg-ember-500/12 text-ember-100 hover:border-ember-400/40'
                                }`}
                              >
                                {permanent.tapped ? 'Untap' : 'Tap'}
                              </button>
                            ) : null}

                            <button
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
                              onDragOver={(event) => {
                                if (
                                  canControl &&
                                  event.dataTransfer.types.includes('application/x-grimoire-card')
                                ) {
                                  event.preventDefault()
                                }
                              }}
                              onDrop={(event) => {
                                if (!isLocalPlayersTurn) {
                                  return
                                }

                                const payload = parseDragPayload(
                                  event.dataTransfer.getData('application/x-grimoire-card'),
                                )

                                if (
                                  !payload ||
                                  payload.fromZone !== 'battlefield' ||
                                  payload.cardId === permanent.instanceId
                                ) {
                                  return
                                }

                                event.preventDefault()
                                event.stopPropagation()

                                onStackCard(payload.cardId, permanent.instanceId)
                              }}
                              onClick={() => onSelectPermanent(permanent.instanceId)}
                              onDoubleClick={() =>
                                canControl
                                  ? onToggleTapped(permanent.instanceId, !permanent.tapped)
                                  : undefined
                              }
                              className="absolute inset-0 flex items-center justify-center text-left"
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
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <LaneZoneDock
            player={player}
            privateState={isLocalLane ? privateState : null}
            isLocalLane={isLocalLane}
            isActiveTurnPlayer={isActiveTurnPlayer}
            isLocalPlayersTurn={isLocalPlayersTurn}
            onOpenZone={onOpenZone}
            onDrawCard={onDrawCard}
            onBrowseLocalLibrary={onBrowseLocalLibrary}
            onShuffle={onShuffle}
            onUntapAll={onUntapAll}
          />
        </div>
      </div>
    </section>
  )
}

function LaneZoneDock({
  player,
  privateState,
  isLocalLane,
  isActiveTurnPlayer,
  isLocalPlayersTurn,
  onOpenZone,
  onDrawCard,
  onBrowseLocalLibrary,
  onShuffle,
  onUntapAll,
}: {
  player: GamePlayerPublicSnapshot
  privateState: GamePrivatePlayerState | null
  isLocalLane: boolean
  isActiveTurnPlayer: boolean
  isLocalPlayersTurn: boolean
  onOpenZone: (playerId: string, zone: BrowseableZone) => void
  onDrawCard: () => void
  onBrowseLocalLibrary: () => void
  onShuffle: () => void
  onUntapAll: () => void
}) {
  const laneSlug = isLocalLane ? 'local' : player.name.toLowerCase().replace(/\s+/g, '-')
  const libraryCount = isLocalLane ? privateState?.library.length ?? player.zoneCounts.library : player.zoneCounts.library
  const graveyardTopCard = player.graveyard[player.graveyard.length - 1]?.card.imageUrl
  const commandTopCard = player.command[player.command.length - 1]?.card.imageUrl
  const exileTopCard = player.exile[player.exile.length - 1]?.card.imageUrl

  return (
    <aside className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(6,18,23,0.68),rgba(5,13,17,0.9))] p-4 sm:p-5">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
          Zone rail
        </p>
        <h3 className="mt-2 text-lg font-semibold text-ink-50">
          {isLocalLane ? 'Your piles' : `${player.name}'s piles`}
        </h3>
        <p className="mt-2 text-sm leading-5 text-ink-400">
          {isLocalLane
            ? isLocalPlayersTurn
              ? 'Click the library pile to draw. Open any pile to throw its cards over the table as an overlay.'
              : 'Piles stay visible, but only the active player can use the board controls.'
            : isActiveTurnPlayer
              ? 'This player currently has the turn.'
              : 'Public piles stay on the same shared table from here.'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <BoardZonePile
          dataTestId={`zone-pile-library-${laneSlug}`}
          title="Library"
          count={libraryCount}
          faceDown
          imageUrl={null}
          actionLabel={isLocalLane ? 'Draw 1' : 'Hidden'}
          onClick={isLocalLane ? onDrawCard : undefined}
          disabled={!isLocalLane || !isLocalPlayersTurn}
          secondaryAction={
            isLocalLane
              ? {
                  label: 'Open',
                  dataTestId: `zone-pile-library-browse-${laneSlug}`,
                  onClick: onBrowseLocalLibrary,
                }
              : undefined
          }
        />
        <BoardZonePile
          dataTestId={`zone-pile-graveyard-${laneSlug}`}
          title="Graveyard"
          count={player.zoneCounts.graveyard}
          imageUrl={graveyardTopCard ?? null}
          actionLabel="Open"
          onClick={() => onOpenZone(player.id, 'graveyard')}
        />
        <BoardZonePile
          dataTestId={`zone-pile-command-${laneSlug}`}
          title="Command"
          count={player.zoneCounts.command}
          imageUrl={commandTopCard ?? null}
          actionLabel="Open"
          onClick={() => onOpenZone(player.id, 'command')}
        />
        <BoardZonePile
          dataTestId={`zone-pile-exile-${laneSlug}`}
          title="Exile"
          count={player.zoneCounts.exile}
          imageUrl={exileTopCard ?? null}
          actionLabel="Open"
          onClick={() => onOpenZone(player.id, 'exile')}
        />
      </div>

      {isLocalLane ? (
        <fieldset
          disabled={!isLocalPlayersTurn}
          className={`mt-4 grid gap-2 ${isLocalPlayersTurn ? '' : 'opacity-60'}`}
        >
          <button
            type="button"
            onClick={onShuffle}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm font-semibold text-ink-100 transition hover:border-white/20 hover:bg-white/10"
          >
            <Shuffle className="h-4 w-4" />
            Shuffle
          </button>
          <button
            type="button"
            onClick={onUntapAll}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm font-semibold text-ink-100 transition hover:border-white/20 hover:bg-white/10"
          >
            <RefreshCcw className="h-4 w-4" />
            Untap all
          </button>
        </fieldset>
      ) : null}
    </aside>
  )
}

function BoardZonePile({
  dataTestId,
  title,
  count,
  faceDown = false,
  imageUrl,
  actionLabel,
  onClick,
  disabled = false,
  secondaryAction,
}: {
  dataTestId: string
  title: string
  count: number
  faceDown?: boolean
  imageUrl: string | null
  actionLabel: string
  onClick?: () => void
  disabled?: boolean
  secondaryAction?: { label: string; dataTestId?: string; onClick: () => void }
}) {
  const canActivate = Boolean(onClick) && !disabled

  return (
    <article className="rounded-[1.65rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4">
      <button
        type="button"
        data-testid={dataTestId}
        onClick={canActivate ? onClick : undefined}
        disabled={!canActivate}
        className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition ${
          canActivate
            ? 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,18,24,0.78),rgba(7,18,24,0.96))] hover:border-tide-400/30 hover:bg-ink-900/95'
            : 'cursor-not-allowed border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,18,24,0.48),rgba(7,18,24,0.72))] text-ink-500'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink-500">
              {title}
            </p>
            <p className="mt-1 text-lg font-semibold text-ink-50">{count}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-ink-200">
            {actionLabel}
          </span>
        </div>

        <div className="mt-3 flex justify-center">
          <BoardPileVisual faceDown={faceDown} imageUrl={imageUrl} title={title} />
        </div>
      </button>

      {secondaryAction ? (
        <button
          type="button"
          data-testid={secondaryAction.dataTestId}
          onClick={secondaryAction.onClick}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-ink-100 transition hover:border-white/20 hover:bg-white/10"
        >
          {secondaryAction.label}
        </button>
      ) : null}
    </article>
  )
}

function BoardPileVisual({
  faceDown,
  imageUrl,
  title,
}: {
  faceDown: boolean
  imageUrl: string | null
  title: string
}) {
  const layers = faceDown ? [0, 1, 2] : [0, 1]

  return (
    <div className="relative h-[11.75rem] w-[8.4rem]">
      {layers.map((layer) => {
        const isTopLayer = layer === layers.length - 1

        return (
        <div
          key={layer}
          style={{
            transform: `translate(${layer * 10}px, ${layer * 7}px) ${faceDown ? 'rotate(180deg)' : 'rotate(0deg)'}`,
          }}
          className="absolute inset-0 overflow-hidden rounded-[0.95rem] border border-white/10 bg-[#120f0b] shadow-card"
        >
          {faceDown ? (
            <>
              <img src={MTG_CARD_BACK_URL} alt={`${title} card back`} className="h-full w-full object-contain" />
              {!isTopLayer ? <div className="absolute inset-0 bg-black/20" /> : null}
            </>
          ) : isTopLayer && imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,rgba(21,32,44,0.92),rgba(12,18,27,0.98))] px-3 text-center text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-300">
              {title}
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}

function HandTray({
  privateState,
  canAct,
  activePlayerName,
  selectedCardId,
  onSelectCard,
  onQuickCast,
}: {
  privateState: GamePrivatePlayerState
  canAct: boolean
  activePlayerName: string
  selectedCardId: string | null
  onSelectCard: (cardId: string) => void
  onQuickCast: (cardId: string) => void
}) {
  return (
    <section
      data-testid="hand-tray"
      className="rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,22,29,0.58),rgba(5,14,19,0.84))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Hand tray
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-50">
            {privateState.hand.length} cards in hand
          </h2>
          <p className="mt-1 text-sm text-ink-400">
            {canAct
              ? 'Drag to the board or double-click to cast.'
              : `Waiting for ${activePlayerName} to finish their turn.`}
          </p>
        </div>
        <InfoChip
          label={canAct ? 'Board controls unlocked' : 'Board controls locked'}
          tone={canAct ? 'info' : 'warning'}
        />
      </div>

      {privateState.hand.length > 0 ? (
        <div className="mt-5 overflow-x-auto pb-2">
          <div className="flex min-w-max items-end px-2 pt-3">
            {privateState.hand.map((card, index) => (
              <button
                key={card.instanceId}
                type="button"
                data-card-name={card.card.name}
                draggable={canAct}
                onDragStart={(event) =>
                  canAct
                    ? event.dataTransfer.setData(
                        'application/x-grimoire-card',
                        JSON.stringify({
                          cardId: card.instanceId,
                          fromZone: 'hand',
                        } satisfies DragPayload),
                      )
                    : undefined
                }
                onClick={() => onSelectCard(card.instanceId)}
                onDoubleClick={() => (canAct ? onQuickCast(card.instanceId) : undefined)}
                className={`${index === 0 ? '' : '-ml-16'} rounded-[1.3rem] transition ${
                  canAct ? 'hover:z-10 hover:-translate-y-2' : 'cursor-default opacity-85'
                }`}
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
          Your hand is empty. Draw cards or use the token workshop.
        </div>
      )}

      {!canAct ? (
        <div className="mt-4 rounded-[1.4rem] border border-ember-400/20 bg-ember-500/8 px-4 py-3 text-sm text-ember-100/90">
          The hand stays read-only until the turn marker comes back to you.
        </div>
      ) : null}
    </section>
  )
}

function InspectorCard({
  players,
  selected,
  canAct,
  stackCards,
  counterDraft,
  noteDraft,
  onCounterDraftChange,
  onNoteDraftChange,
  onSelectCounter,
  onMoveOwnedCard,
  onSetStack,
  onToggleTapped,
  onAdjustCounter,
  onSaveNote,
  onSetFaceDown,
  onChangeControl,
  onClearSelection,
  isLocallyControlled,
  isLocalOwned,
}: {
  players: GamePlayerPublicSnapshot[]
  selected: SelectedCardData | null
  canAct: boolean
  stackCards: BattlefieldPermanentSnapshot[]
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
  onSetStack: (cardId: string, stackWithCardId: string | null) => void
  onToggleTapped: (cardId: string, tapped: boolean) => void
  onAdjustCounter: (cardId: string, counterKind: string, delta: number) => void
  onSaveNote: (cardId: string, note: string) => void
  onSetFaceDown: (cardId: string, faceDown: boolean) => void
  onChangeControl: (cardId: string, controllerPlayerId: string) => void
  onClearSelection: () => void
  isLocallyControlled: boolean
  isLocalOwned: boolean
}) {
  const selectedPermanent = selected?.permanent ?? null
  const selectedActions = selected
    ? renderSelectedActions({
        selected,
        canAct,
        stackCards,
        isLocalOwned,
        isLocallyControlled,
        onMoveOwnedCard,
        onSetStack,
        onToggleTapped,
      })
    : null

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
              : 'Select a card to inspect or move it.'}
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
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-ink-800/70">
                <img
                  src={selected.card.card.largeImageUrl}
                  alt={selected.card.card.name}
                  className="h-[11rem] w-full object-contain"
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <InfoChip label={selected.card.card.manaCost ? formatManaCost(selected.card.card.manaCost) : 'No mana cost'} tone="warning" />
                  <InfoChip label={formatTypeLine(selected.card.card.typeLine)} tone="info" />
                  <InfoChip label={selected.player?.name ?? 'Unknown owner'} />
                  {selectedPermanent?.isToken ? <InfoChip label="Token" tone="accent" /> : null}
                  {selectedPermanent?.faceDown ? <InfoChip label="Face-down" tone="warning" /> : null}
                  {selectedPermanent && stackCards.length > 1 ? (
                    <InfoChip label={`${stackCards.length} card stack`} tone="info" />
                  ) : null}
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

                <div className="grid gap-2 sm:grid-cols-2">{selectedActions}</div>

                {!canAct && (isLocalOwned || isLocallyControlled) ? (
                  <div className="rounded-[1.2rem] border border-ember-400/20 bg-ember-500/8 px-3 py-3 text-sm text-ember-100/90">
                    The active player is the only one who can move or mark cards right now.
                  </div>
                ) : null}

                {selectedPermanent && isLocallyControlled ? (
                  <fieldset disabled={!canAct} className={canAct ? '' : 'opacity-60'}>
                  <div className="flex flex-wrap gap-2">
                    <InspectorButton
                      onClick={() => onSetFaceDown(selectedPermanent.instanceId, !selectedPermanent.faceDown)}
                      tone="primary"
                    >
                      <Layers3 className="h-3.5 w-3.5" />
                      {selectedPermanent.faceDown ? 'Turn face up' : 'Turn face down'}
                    </InspectorButton>
                  </div>
                  </fieldset>
                ) : null}

                {selectedPermanent ? (
                  <p className="text-xs leading-5 text-ink-400">
                    Drag onto another permanent to stack cards. Dragging any card moves the stack.
                  </p>
                ) : null}
              </div>
            </div>

            {selected.card.card.oracleText ? (
              <div className="rounded-[1.3rem] border border-white/10 bg-white/5 px-3 py-3 text-sm leading-6 text-ink-300">
                {selected.card.card.oracleText}
              </div>
            ) : null}
          </div>

          {selectedPermanent && isLocallyControlled ? (
            <fieldset disabled={!canAct} className={canAct ? '' : 'opacity-60'}>
              <InspectorSection
                title="Counters"
                icon={<ShieldPlus className="h-4 w-4 text-tide-200" />}
                defaultOpen
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-ink-300">
                    Track shields, stuns, loyalty, or custom counters here.
                  </p>
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
              </InspectorSection>

              <InspectorSection
                title="Table note"
                icon={<ScrollText className="h-4 w-4 text-ember-200" />}
              >
                <textarea
                  value={noteDraft}
                  onChange={(event) => onNoteDraftChange(event.target.value)}
                  rows={3}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
                  placeholder="Status, mode, trigger..."
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
              </InspectorSection>

              <InspectorSection
                title="Control"
                icon={<Undo2 className="h-4 w-4 text-tide-200" />}
              >
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
              </InspectorSection>
            </fieldset>
          ) : null}
        </>
      ) : (
        <div className="mt-4 grid gap-3">
          <OverviewStat
            icon={<Hand className="h-4 w-4" />}
            title="Direct interaction"
            body="Drag cards to the lane. Drop one permanent onto another to stack."
          />
          <OverviewStat
            icon={<ShieldPlus className="h-4 w-4" />}
            title="Board tools"
            body="Use the inspector for counters, notes, and control changes."
          />
          <OverviewStat
            icon={<WandSparkles className="h-4 w-4" />}
            title="Token workshop"
            body="Create tokens without leaving the table."
          />
        </div>
      )}
    </section>
  )
}

function ZoneOverlay({
  localPlayerId,
  canAct,
  focusedPlayer,
  activeZone,
  cards,
  selectedCard,
  onClose,
  onSelectCard,
  onSelectLibraryCard,
  onMoveOwnedCard,
  animationToken,
  isClosing,
}: {
  localPlayerId: string
  canAct: boolean
  focusedPlayer: GamePlayerPublicSnapshot | null
  activeZone: BrowseableZone
  cards: TableCardSnapshot[]
  selectedCard: TableSelection | null
  onClose: () => void
  onSelectCard: (playerId: string, zone: PublicZone, cardId: string) => void
  onSelectLibraryCard: (cardId: string) => void
  onMoveOwnedCard: (
    fromZone: OwnedZone,
    toZone: OwnedZone,
    cardId: string,
    position?: PermanentPosition,
  ) => void
  animationToken: number
  isClosing: boolean
}) {
  const visibleCards = cards
  const selectedZoneCardId =
    selectedCard &&
    ((activeZone === 'library' && selectedCard.zone === 'library') ||
      (activeZone !== 'library' &&
        'playerId' in selectedCard &&
        selectedCard.playerId === focusedPlayer?.id &&
        selectedCard.zone === activeZone))
      ? selectedCard.cardId
      : null
  const selectedZoneCard =
    selectedZoneCardId !== null
      ? visibleCards.find((card) => card.instanceId === selectedZoneCardId) ?? null
      : null
  const selectedZoneCardHasActions =
    selectedZoneCard !== null &&
    activeZone !== 'library' &&
    selectedZoneCard.ownerPlayerId === localPlayerId &&
    canAct
  const selectedZoneCardInstanceId = selectedZoneCard?.instanceId ?? null
  const selectedZoneCardMoveTargets = selectedZoneCardHasActions
    ? (['battlefield', 'hand', 'graveyard', 'command', 'exile'] as OwnedZone[]).filter(
        (zone) => zone !== activeZone,
      )
    : []
  const cardsContainerRef = useRef<HTMLDivElement | null>(null)
  const selectedCardRef = useRef<HTMLButtonElement | null>(null)
  const [selectedTrayAnchor, setSelectedTrayAnchor] = useState<ZoneOverlayAnchor | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useLayoutEffect(() => {
    if (!selectedZoneCardHasActions || !selectedCardRef.current) {
      return
    }

    function syncSelectedTrayAnchor() {
      const cardButton = selectedCardRef.current
      if (!cardButton) {
        setSelectedTrayAnchor(null)
        return
      }

      const rect = cardButton.getBoundingClientRect()
      const trayWidthEstimate = Math.min(240, window.innerWidth - 24)
      const trayHeightEstimate = 104
      const centeredLeft = rect.left + rect.width / 2
      const trayLeft = Math.min(
        Math.max(centeredLeft, trayWidthEstimate / 2 + 12),
        window.innerWidth - trayWidthEstimate / 2 - 12,
      )
      const belowTop = rect.bottom + 12
      const trayTop =
        belowTop + trayHeightEstimate <= window.innerHeight - 12
          ? belowTop
          : Math.max(12, rect.top - trayHeightEstimate - 12)

      setSelectedTrayAnchor({
        left: trayLeft,
        top: trayTop,
      })
    }

    syncSelectedTrayAnchor()

    const cardsContainer = cardsContainerRef.current
    window.addEventListener('resize', syncSelectedTrayAnchor)
    cardsContainer?.addEventListener('scroll', syncSelectedTrayAnchor, { passive: true })

    return () => {
      window.removeEventListener('resize', syncSelectedTrayAnchor)
      cardsContainer?.removeEventListener('scroll', syncSelectedTrayAnchor)
    }
  }, [activeZone, canAct, focusedPlayer?.id, selectedZoneCardHasActions, selectedZoneCardId, visibleCards.length])

  return (
    <div
      className={`fixed inset-0 z-50 zone-overlay-root ${isClosing ? 'zone-overlay-closing' : ''}`}
      data-testid="zone-overlay"
      onPointerDownCapture={(event) => {
        if (!(event.target instanceof Element)) {
          return
        }

        if (event.target.closest('[data-zone-overlay-surface="true"]')) {
          return
        }

        onClose()
      }}
    >
      <div aria-hidden="true" className="zone-overlay-backdrop absolute inset-0 z-0" />

      <div className="zone-overlay-panel pointer-events-none relative z-10 flex h-full w-full items-start justify-center px-3 pt-5 sm:px-5 sm:pt-6">
        <div
          ref={cardsContainerRef}
          data-zone-overlay-surface="true"
          key={`${activeZone}-${focusedPlayer?.id ?? 'none'}-${animationToken}`}
          className={`zone-overlay-cards pointer-events-auto flex max-h-[calc(100vh-4.5rem)] ${
            visibleCards.length > 0
              ? 'w-fit max-w-[calc(100vw-1.5rem)]'
              : 'min-w-[18rem] min-h-[11rem] w-fit'
          } flex-wrap items-start justify-center gap-2.5 overflow-y-auto rounded-[1.8rem] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(8,20,27,0.28),rgba(6,14,18,0.18))] px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-3 sm:py-3 ${
            visibleCards.length === 0 ? 'zone-overlay-empty' : ''
          }`}
        >
          {visibleCards.length > 0 ? (
            visibleCards.map((card, index) => {
              const isSelected = selectedZoneCardId === card.instanceId

              const animationStyle = {
                animationDelay: `${index * 54}ms`,
              } as CSSProperties

              return (
                <article
                  key={card.instanceId}
                  style={animationStyle}
                  className={`zone-card-fly-in relative w-[12rem] shrink-0 ${isSelected ? 'z-20' : 'z-0'}`}
                >
                  <button
                    ref={selectedZoneCardHasActions && isSelected ? selectedCardRef : undefined}
                    type="button"
                    data-card-name={card.card.name}
                    aria-pressed={isSelected}
                    onClick={() =>
                      activeZone === 'library'
                        ? onSelectLibraryCard(card.instanceId)
                        : focusedPlayer && onSelectCard(focusedPlayer.id, activeZone, card.instanceId)
                    }
                    className="block w-full text-left"
                  >
                    <TableCard card={card.card} variant="zone" selected={isSelected} />
                  </button>
                </article>
              )
            })
          ) : (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-semibold tracking-[0.18em] text-white/6">
                  {zoneLabel(activeZone)}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/10">
                  Empty pile
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedZoneCardHasActions && selectedTrayAnchor ? (
          <div
            data-zone-overlay-surface="true"
            className="zone-overlay-tray pointer-events-auto absolute z-20"
            style={{
              left: `${selectedTrayAnchor.left}px`,
              top: `${selectedTrayAnchor.top}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="grid w-[14rem] grid-cols-2 gap-2 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,20,27,0.92),rgba(6,14,18,0.96))] p-2.5 shadow-[0_18px_44px_rgba(0,0,0,0.34)]">
              {selectedZoneCardMoveTargets.map((zone) => (
                <ZoneActionButton
                  key={zone}
                  tone={zone === 'battlefield' ? 'primary' : zone === 'exile' ? 'danger' : 'secondary'}
                  onClick={() => {
                    if (selectedZoneCardInstanceId === null) {
                      return
                    }

                    onMoveOwnedCard(activeZone, zone, selectedZoneCardInstanceId)
                  }}
                >
                  {zoneLabel(zone)}
                </ZoneActionButton>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TokenWorkshop({
  canAct,
  draft,
  onDraftChange,
  onCreateToken,
}: {
  canAct: boolean
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
          <h2 className="mt-1 text-xl font-semibold text-ink-50">Tokens</h2>
        </div>
      </div>

      {!canAct ? (
        <div className="mt-4 rounded-[1.4rem] border border-ember-400/20 bg-ember-500/8 px-4 py-3 text-sm text-ember-100/90">
          Token creation is locked until the turn marker comes back to you.
        </div>
      ) : null}

      <fieldset disabled={!canAct} className={`mt-4 grid gap-4 ${canAct ? '' : 'opacity-60'}`}>
        <div className="grid gap-2">
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

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-300">
            Custom token
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={draft.name}
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
              className="rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              placeholder="Name"
            />
            <input
              value={draft.tokenType}
              onChange={(event) => onDraftChange({ ...draft, tokenType: event.target.value })}
              className="rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              placeholder="Type"
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
            placeholder="Text"
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
      </fieldset>
    </section>
  )
}

function PlayerStatePanel({
  players,
  focusedPlayer,
  localPlayerId,
  canAct,
  counterDraft,
  noteDraft,
  onCounterDraftChange,
  onNoteDraftChange,
  onFocusPlayer,
  onAdjustCounter,
  onSaveNote,
  onSetDesignation,
  onAdjustCommanderTax,
  onAdjustCommanderDamage,
}: {
  players: GamePlayerPublicSnapshot[]
  focusedPlayer: GamePlayerPublicSnapshot | null
  localPlayerId: string
  canAct: boolean
  counterDraft: string
  noteDraft: string
  onCounterDraftChange: (value: string) => void
  onNoteDraftChange: (value: string) => void
  onFocusPlayer: (playerId: string) => void
  onAdjustCounter: (playerId: string, counterKind: string, delta: number) => void
  onSaveNote: (playerId: string, note: string) => void
  onSetDesignation: (
    playerId: string,
    designation: 'monarch' | 'initiative' | 'citys_blessing',
    value: boolean,
  ) => void
  onAdjustCommanderTax: (playerId: string, delta: number) => void
  onAdjustCommanderDamage: (playerId: string, sourcePlayerId: string, delta: number) => void
}) {
  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="flex flex-wrap gap-2">
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
            {player.id === localPlayerId ? ' • You' : ''}
          </button>
        ))}
      </div>

      {focusedPlayer ? (
        <div className="mt-4 grid gap-4">
          <div className="flex flex-wrap gap-2">
            {focusedPlayer.counters.map((counter) => (
              <InfoChip key={counter.kind} label={`${counter.kind} ${counter.amount}`} tone="info" />
            ))}
            {focusedPlayer.counters.length === 0 ? (
              <div className="text-sm text-ink-400">No counters yet.</div>
            ) : null}
          </div>
          {!canAct ? (
            <div className="rounded-[1.4rem] border border-ember-400/20 bg-ember-500/8 px-4 py-3 text-sm text-ember-100/90">
              Player markers are read-only until your turn.
            </div>
          ) : null}

          <fieldset disabled={!canAct} className={canAct ? '' : 'opacity-60'}>
            <div className="flex flex-wrap gap-2">
              {PLAYER_COUNTER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onCounterDraftChange(preset)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    counterDraft === preset
                      ? 'border-tide-400/35 bg-tide-500/12 text-tide-100'
                      : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              value={counterDraft}
              onChange={(event) => onCounterDraftChange(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              placeholder="Counter label"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <InspectorButton onClick={() => onAdjustCounter(focusedPlayer.id, counterDraft, -1)}>
                <Minus className="h-3.5 w-3.5" />
                Counter -1
              </InspectorButton>
              <InspectorButton
                onClick={() => onAdjustCounter(focusedPlayer.id, counterDraft, +1)}
                tone="primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Counter +1
              </InspectorButton>
              <InspectorButton onClick={() => onAdjustCommanderTax(focusedPlayer.id, -2)}>
                <Minus className="h-3.5 w-3.5" />
                Tax -2
              </InspectorButton>
              <InspectorButton
                onClick={() => onAdjustCommanderTax(focusedPlayer.id, +2)}
                tone="primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Tax +2
              </InspectorButton>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <InfoChip label={`Commander tax ${focusedPlayer.commanderTax}`} tone="warning" />
            {focusedPlayer.designations.monarch ? <InfoChip label="Monarch" tone="accent" /> : null}
            {focusedPlayer.designations.initiative ? <InfoChip label="Initiative" tone="accent" /> : null}
            {focusedPlayer.designations.citysBlessing ? (
              <InfoChip label="City's blessing" tone="accent" />
            ) : null}
          </div>

          <fieldset disabled={!canAct} className={canAct ? '' : 'opacity-60'}>
            <div className="flex flex-wrap gap-2">
              <InspectorButton
                onClick={() =>
                  onSetDesignation(
                    focusedPlayer.id,
                    'monarch',
                    !focusedPlayer.designations.monarch,
                  )
                }
              >
                Monarch
              </InspectorButton>
              <InspectorButton
                onClick={() =>
                  onSetDesignation(
                    focusedPlayer.id,
                    'initiative',
                    !focusedPlayer.designations.initiative,
                  )
                }
              >
                Initiative
              </InspectorButton>
              <InspectorButton
                onClick={() =>
                  onSetDesignation(
                    focusedPlayer.id,
                    'citys_blessing',
                    !focusedPlayer.designations.citysBlessing,
                  )
                }
              >
                City's blessing
              </InspectorButton>
            </div>

            <div className="mt-4 grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
                Commander damage on {focusedPlayer.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {players
                  .filter((player) => player.id !== focusedPlayer.id)
                  .map((player) => {
                    const amount =
                      focusedPlayer.commanderDamage.find((entry) => entry.sourcePlayerId === player.id)
                        ?.amount ?? 0

                    return (
                      <div
                        key={player.id}
                        className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-ink-100">{player.name}</p>
                        <p className="mt-1 text-xs text-ink-400">{amount} damage</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => onAdjustCommanderDamage(focusedPlayer.id, player.id, -1)}
                            className="rounded-full border border-white/10 px-2 py-1 text-xs font-semibold text-ink-100 transition hover:border-white/20"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdjustCommanderDamage(focusedPlayer.id, player.id, +1)}
                            className="rounded-full border border-tide-400/25 bg-tide-500/12 px-2 py-1 text-xs font-semibold text-tide-100 transition hover:border-tide-400/40"
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <textarea
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              rows={3}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              placeholder="Note"
            />
            <div className="mt-4 flex justify-end">
              <InspectorButton onClick={() => onSaveNote(focusedPlayer.id, noteDraft)} tone="primary">
                <ScrollText className="h-3.5 w-3.5" />
                Save player note
              </InspectorButton>
            </div>
          </fieldset>
        </div>
      ) : null}
    </section>
  )
}

function StackPanel({
  stack,
  selected,
  isLocalOwned,
  canAct,
  draft,
  onDraftChange,
  onCreateFromSelected,
  onCreateManual,
  onResolve,
  onRemove,
}: {
  stack: StackItemSnapshot[]
  selected: SelectedCardData | null
  isLocalOwned: boolean
  canAct: boolean
  draft: {
    itemType: StackItemSnapshot['itemType']
    label: string
    note: string
    targets: string
    faceDown: boolean
  }
  onDraftChange: (
    value: {
      itemType: StackItemSnapshot['itemType']
      label: string
      note: string
      targets: string
      faceDown: boolean
    },
  ) => void
  onCreateFromSelected: (
    itemType: StackItemSnapshot['itemType'],
    note: string,
    faceDown: boolean,
  ) => void
  onCreateManual: (payload: {
    itemType: StackItemSnapshot['itemType']
    label?: string
    note?: string
    targets?: string[]
    faceDown?: boolean
  }) => void
  onResolve: (stackItemId: string) => void
  onRemove: (stackItemId: string) => void
}) {
  return (
    <section className="rounded-[1.9rem] border border-white/10 bg-ink-900/90 p-4 shadow-panel">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Shared stack</p>
          <h2 className="mt-2 text-xl font-semibold text-ink-50">Stack</h2>
        </div>

        {!canAct ? (
          <div className="rounded-[1.4rem] border border-ember-400/20 bg-ember-500/8 px-4 py-3 text-sm text-ember-100/90">
            Stack actions unlock only for the active player.
          </div>
        ) : null}

        <fieldset disabled={!canAct} className={canAct ? '' : 'opacity-60'}>
          {selected && selected.zone !== 'battlefield' && isLocalOwned ? (
            <InspectorButton
              onClick={() => onCreateFromSelected(draft.itemType, draft.note, draft.faceDown)}
              tone="primary"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              Put selected card on stack
            </InspectorButton>
          ) : null}

          <div className="mt-3 grid gap-2">
            <div className="flex flex-wrap gap-2">
              {(['spell', 'ability', 'trigger'] as const).map((itemType) => (
                <button
                  key={itemType}
                  type="button"
                  onClick={() => onDraftChange({ ...draft, itemType })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    draft.itemType === itemType
                      ? 'border-tide-400/35 bg-tide-500/12 text-tide-100'
                      : 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20'
                  }`}
                >
                  {itemType}
                </button>
              ))}
            </div>

            <input
              value={draft.label}
              onChange={(event) => onDraftChange({ ...draft, label: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              placeholder="Label"
            />
            <input
              value={draft.targets}
              onChange={(event) => onDraftChange({ ...draft, targets: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              placeholder="Targets"
            />
            <textarea
              value={draft.note}
              onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              placeholder="Note"
            />
            <label className="inline-flex items-center gap-2 text-sm text-ink-300">
              <input
                type="checkbox"
                checked={draft.faceDown}
                onChange={(event) => onDraftChange({ ...draft, faceDown: event.target.checked })}
              />
              Face down
            </label>
            <div className="flex justify-end">
              <InspectorButton
                onClick={() =>
                  onCreateManual({
                    itemType: draft.itemType,
                    label: draft.label,
                    note: draft.note,
                    targets: draft.targets
                      .split(',')
                      .map((entry) => entry.trim())
                      .filter(Boolean),
                    faceDown: draft.faceDown,
                  })
                }
                tone="primary"
              >
                <WandSparkles className="h-3.5 w-3.5" />
                Add manual stack item
              </InspectorButton>
            </div>
          </div>
        </fieldset>

        <div className="grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
          {stack.map((entry, index) => (
            <article key={entry.id} className="rounded-[1.25rem] border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                    {index === 0 ? 'Top of stack' : `Stack ${index + 1}`}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-ink-50">{entry.label}</h3>
                  <p className="mt-1 text-xs text-ink-400">
                    {entry.itemType}
                    {entry.sourceCard ? ` • ${entry.sourceCard.card.name}` : ''}
                  </p>
                </div>
                <fieldset disabled={!canAct} className={canAct ? '' : 'opacity-60'}>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onResolve(entry.id)}
                      className="rounded-full border border-tide-400/25 bg-tide-500/12 px-2.5 py-1 text-xs font-semibold text-tide-100 transition hover:border-tide-400/40"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(entry.id)}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-ink-100 transition hover:border-white/20"
                    >
                      Remove
                    </button>
                  </div>
                </fieldset>
              </div>
              {entry.targets.length > 0 ? (
                <p className="mt-2 text-xs text-ink-300">Targets: {entry.targets.join(', ')}</p>
              ) : null}
              {entry.note ? <p className="mt-2 text-xs text-ink-300">{entry.note}</p> : null}
            </article>
          ))}
          {stack.length === 0 ? (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-ink-300">
              The stack is empty.
            </div>
          ) : null}
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
        <div className="mt-4 grid max-h-[18rem] gap-2 overflow-y-auto pr-1">
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
      ? 'w-[7.2rem]'
      : variant === 'hand'
        ? 'w-[8.75rem]'
        : 'w-full'
  const imageClassName =
    variant === 'battlefield'
      ? 'h-[9.25rem]'
      : variant === 'hand'
        ? 'h-[12rem]'
        : 'h-[13.75rem]'
  const imageFitClassName = 'object-contain'
  const manaLabel =
    card.manaCost
      ? formatManaCost(card.manaCost)
      : card.typeLine.includes('Land')
        ? 'Land'
        : `MV ${card.manaValue}`
  const battlefieldRotationClassName =
    tapped && variant === 'battlefield' ? 'rotate-90 origin-center' : ''
  const showDetails = variant !== 'zone'

  return (
    <article
      className={`${cardClassName} rounded-[1.2rem] border bg-ink-900/95 p-2 shadow-card transition duration-200 ${
        battlefieldRotationClassName
      } ${
        selected
          ? 'border-tide-300/60 ring-2 ring-tide-300/20'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className={`relative ${imageClassName} overflow-hidden rounded-[0.95rem] border border-white/10 bg-ink-800/70`}>
        <div className="absolute inset-0">
          <img src={card.imageUrl} alt={card.name} className={`h-full w-full ${imageFitClassName}`} />
          {showDetails ? (
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-2 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-xs font-semibold text-white">{card.name}</p>
                <span className="max-w-[46%] rounded-full border border-black/20 bg-black/55 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/90">
                  {manaLabel}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showDetails ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="line-clamp-2 text-[0.68rem] font-medium text-ink-300">
            {formatTypeLine(card.typeLine)}
          </p>
          {badge ? (
            <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-ink-100">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}

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

function InspectorSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 open:bg-white/[0.07]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-200">
            {title}
          </h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ink-300">
          Toggle
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
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
  disabled = false,
  dataTestId,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  dataTestId?: string
}) {
  return (
    <button
      type="button"
      data-testid={dataTestId}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-ink-100 transition ${
        disabled
          ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-60'
          : 'border-white/10 bg-white/6 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function TurnDock({
  activePlayerName,
  isLocalPlayersTurn,
  onAdvanceTurn,
}: {
  activePlayerName: string
  isLocalPlayersTurn: boolean
  onAdvanceTurn: () => void
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1720px] justify-end">
        <div
          className={`pointer-events-auto flex max-w-[28rem] items-center justify-between gap-4 rounded-[1.6rem] border px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur ${
            isLocalPlayersTurn
              ? 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(8,35,24,0.96),rgba(5,20,15,0.96))]'
              : 'border-white/10 bg-ink-950/92'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                isLocalPlayersTurn
                  ? 'bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.95)] animate-pulse'
                  : 'bg-amber-300 shadow-[0_0_16px_rgba(253,186,116,0.8)]'
              }`}
            />
            <div>
              <p
                className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${
                  isLocalPlayersTurn ? 'text-emerald-100' : 'text-ember-100/85'
                }`}
              >
                {isLocalPlayersTurn ? 'Your turn' : `${activePlayerName} is acting`}
              </p>
              <p className="text-sm text-ink-300">
                {isLocalPlayersTurn
                  ? 'Pass here without scrolling back to the top.'
                  : 'The pass button will unlock when the active player finishes.'}
              </p>
            </div>
          </div>

          <HudButton
            icon={<ArrowRight className="h-4 w-4" />}
            label="Pass turn"
            onClick={onAdvanceTurn}
            disabled={!isLocalPlayersTurn}
            dataTestId="turn-dock-pass-turn"
          />
        </div>
      </div>
    </div>
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

function ZoneActionButton({
  children,
  tone = 'secondary',
  disabled = false,
  onClick,
}: {
  children: ReactNode
  tone?: 'secondary' | 'primary' | 'danger'
  disabled?: boolean
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
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        disabled ? 'cursor-not-allowed border-white/10 bg-white/5 text-ink-500' : toneClassName
      }`}
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
    case 'library':
      return 'Library'
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

function compareBattlefieldPermanents(
  left: BattlefieldPermanentSnapshot,
  right: BattlefieldPermanentSnapshot,
) {
  if (left.position.y !== right.position.y) {
    return left.position.y - right.position.y
  }

  if (left.position.x !== right.position.x) {
    return left.position.x - right.position.x
  }

  if (left.stackIndex !== right.stackIndex) {
    return left.stackIndex - right.stackIndex
  }

  return left.enteredAt.localeCompare(right.enteredAt)
}

function buildBattlefieldStackGroups(permanents: BattlefieldPermanentSnapshot[]): BattlefieldStackGroup[] {
  const groups = new Map<string, BattlefieldPermanentSnapshot[]>()

  permanents.forEach((permanent) => {
    const groupId = permanent.stackId ?? permanent.instanceId
    const currentGroup = groups.get(groupId) ?? []
    currentGroup.push(permanent)
    groups.set(groupId, currentGroup)
  })

  return Array.from(groups.entries())
    .map(([id, cards]) => {
      const sortedCards = [...cards].sort(compareBattlefieldPermanents)
      return {
        id,
        cards: sortedCards,
        position: sortedCards[0]?.position ?? { x: 50, y: 50 },
      }
    })
    .sort((left, right) => {
      if (left.position.y !== right.position.y) {
        return left.position.y - right.position.y
      }

      return left.position.x - right.position.x
    })
}

function getPermanentStackCards(
  permanents: BattlefieldPermanentSnapshot[],
  permanentId: string,
) {
  const permanent = permanents.find((card) => card.instanceId === permanentId)

  if (!permanent) {
    return []
  }

  const stackKey = permanent.stackId ?? permanent.instanceId
  return permanents
    .filter((card) => (card.stackId ?? card.instanceId) === stackKey)
    .sort(compareBattlefieldPermanents)
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

  if (selection.zone === 'library') {
    const card = privateState?.library.find((entry) => entry.instanceId === selection.cardId)

    if (!card) {
      return null
    }

    return {
      zone: 'library',
      card,
      player: players.find((player) => player.id === card.ownerPlayerId) ?? null,
      permanent: null,
    }
  }

  if (!('playerId' in selection)) {
    return null
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
  canAct,
  stackCards,
  isLocalOwned,
  isLocallyControlled,
  onMoveOwnedCard,
  onSetStack,
  onToggleTapped,
}: {
  selected: SelectedCardData
  canAct: boolean
  stackCards: BattlefieldPermanentSnapshot[]
  isLocalOwned: boolean
  isLocallyControlled: boolean
  onMoveOwnedCard: (
    fromZone: OwnedZone,
    toZone: OwnedZone,
    cardId: string,
    position?: PermanentPosition,
  ) => void
  onSetStack: (cardId: string, stackWithCardId: string | null) => void
  onToggleTapped: (cardId: string, tapped: boolean) => void
}) {
  const selectedPermanent = selected.zone === 'battlefield' ? selected.permanent : null

  if (!canAct && (isLocalOwned || isLocallyControlled)) {
    return (
      <div className="rounded-[1.2rem] border border-ember-400/20 bg-ember-500/8 px-3 py-3 text-sm text-ember-100/90 sm:col-span-2">
        This card is locked until the active player passes the turn.
      </div>
    )
  }

  if (selected.zone === 'battlefield' && selectedPermanent) {
    return (
      <>
        {isLocallyControlled ? (
          <InspectorButton
            onClick={() => onToggleTapped(selectedPermanent.instanceId, !selectedPermanent.tapped)}
            tone="primary"
          >
            {selectedPermanent.tapped ? <RefreshCcw className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
            {selectedPermanent.tapped ? 'Untap' : 'Tap'}
          </InspectorButton>
        ) : null}

        {isLocallyControlled || isLocalOwned ? (
          <>
            {stackCards.length > 1 ? (
              <InspectorButton
                onClick={() => onSetStack(selectedPermanent.instanceId, null)}
                tone="primary"
              >
                <Layers3 className="h-3.5 w-3.5" />
                Unstack
              </InspectorButton>
            ) : null}
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'graveyard', selectedPermanent.instanceId)}
            >
              <ScrollText className="h-3.5 w-3.5" />
              Graveyard
            </InspectorButton>
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'command', selectedPermanent.instanceId)}
            >
              <Crown className="h-3.5 w-3.5" />
              Command
            </InspectorButton>
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'hand', selectedPermanent.instanceId)}
            >
              <Hand className="h-3.5 w-3.5" />
              Hand
            </InspectorButton>
            <InspectorButton
              onClick={() => onMoveOwnedCard('battlefield', 'exile', selectedPermanent.instanceId)}
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
          Drag to your lane or double-click to move it.
        </div>
      ) : null}
      {selected.zone === 'library' ? (
        <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-3 text-sm text-ink-300">
          Search by name, type, or rules text, then move it where needed.
        </div>
      ) : null}
    </>
  )
}
