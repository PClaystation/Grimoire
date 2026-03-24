import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  Crown,
  Hand,
  Layers3,
  Minus,
  Monitor,
  Plus,
  RefreshCcw,
  ScrollText,
  ShieldPlus,
  Sparkles,
  Swords,
  Undo2,
  WandSparkles,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { SiteNav } from '@/components/layout/SiteNav'
import { RoomChatPanel } from '@/play/components/RoomChatPanel'
import {
  BattlefieldLane,
  HandTray,
  TableHud,
} from '@/pages/play/game/playGameBoard'
import {
  ActivityLog,
  InfoChip,
  InspectorButton,
  InspectorSection,
  OverviewStat,
  TableCard,
  TurnDock,
  ZoneActionButton,
} from '@/pages/play/game/playGamePrimitives'
import {
  compareBattlefieldPermanents,
  COUNTER_PRESETS,
  findSelectedCardData,
  getPermanentStackCards,
  PLAYER_COUNTER_PRESETS,
  TOKEN_PRESETS,
  zoneLabel,
  type BrowseableZone,
  type PublicZone,
  type SelectedCardData,
  type TableSelection,
} from '@/pages/play/game/playGameShared'
import { PlayFrame } from '@/play/components/PlayFrame'
import { usePlay } from '@/play/usePlay'
import type {
  BattlefieldPermanentSnapshot,
  ClientGameAction,
  GamePlayerPublicSnapshot,
  OwnedZone,
  PermanentPosition,
  StackItemSnapshot,
  TableCardSnapshot,
} from '@/shared/play'
import type { CardColor } from '@/types/scryfall'
import { formatManaCost, formatTypeLine } from '@/utils/format'

export function PlayGamePage() {
  const navigate = useNavigate()
  const { gameId = '' } = useParams()
  const {
    connectionStatus,
    connectionMessage,
    pendingMessageCount,
    room,
    game,
    error,
    clearError,
    sendRoomChat,
    sendGameAction,
  } = usePlay()
  const [selectedCard, setSelectedCard] = useState<TableSelection | null>(null)
  const [focusedPlayerId, setFocusedPlayerId] = useState<string | null>(null)
  const [activeZone, setActiveZone] = useState<BrowseableZone>('graveyard')
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')
  const [isZoneOverlayOpen, setIsZoneOverlayOpen] = useState(false)
  const [isZoneOverlayClosing, setIsZoneOverlayClosing] = useState(false)
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false)
  const [utilityPanel, setUtilityPanel] = useState<
    'players' | 'stack' | 'tokens' | 'log' | 'chat'
  >('players')
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
  const isSpectator = activeGame?.viewerRole === 'spectator'
  const turn = activeGame?.publicState.turn ?? null
  const activeTurnPlayer =
    players.find((player) => player.id === turn?.activePlayerId) ?? players[0] ?? null
  const isLocalPlayersTurn =
    !isSpectator && Boolean(localPlayerId) && activeTurnPlayer?.id === localPlayerId
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
  const canAct = !isSpectator && isLocalPlayersTurn
  const reconnectingPlayers = players.filter((player) => player.connectionState === 'reconnecting')
  const disconnectedPlayers = players.filter((player) => player.connectionState === 'disconnected')
  const activeGameId = activeGame?.gameId ?? gameId

  function sendTurnAction(action: ClientGameAction) {
    if (!activeGame || !isLocalPlayersTurn) {
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
    setZoneSearchQuery('')
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

  const handleShortcutKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) {
      return
    }

    if (event.key === '?') {
      event.preventDefault()
      setIsShortcutHelpOpen((current) => !current)
      return
    }

    if (event.key === 'Escape' && isShortcutHelpOpen) {
      setIsShortcutHelpOpen(false)
      return
    }

    switch (event.key.toLowerCase()) {
      case '1':
        setUtilityPanel('players')
        return
      case '2':
        setUtilityPanel('stack')
        return
      case '3':
        setUtilityPanel('tokens')
        return
      case '4':
        setUtilityPanel('log')
        return
      case '5':
        setUtilityPanel('chat')
        return
      case 'g':
        if (focusedPlayer) {
          openZone(focusedPlayer.id, 'graveyard')
        }
        return
      case 'e':
        if (focusedPlayer) {
          openZone(focusedPlayer.id, 'exile')
        }
        return
      case 'c':
        if (focusedPlayer) {
          openZone(focusedPlayer.id, 'command')
        }
        return
      case 'l':
        openLocalLibrary()
        return
      case 'd':
        if (canAct) {
          sendTurnAction({ type: 'draw_card' })
        }
        return
      case 'u':
        if (canAct) {
          sendTurnAction({ type: 'untap_all' })
        }
        return
      case 'p':
        if (canAct) {
          sendTurnAction({ type: 'advance_turn' })
        }
        return
      default:
        return
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleShortcutKeyDown)
    return () => window.removeEventListener('keydown', handleShortcutKeyDown)
  }, [])

  if (!activeGame || activeGame.gameId !== gameId) {
    return (
      <PlayFrame
        eyebrow="Game Table"
        title="Waiting for the game state."
        description="If this browser is in an active room, the game will appear after sync."
        connectionStatus={connectionStatus}
        connectionMessage={connectionMessage}
        pendingMessageCount={pendingMessageCount}
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
          viewerRole={activeGame.viewerRole}
          isLocalPlayersTurn={isLocalPlayersTurn}
          onAdvanceTurn={() => sendTurnAction({ type: 'advance_turn' })}
          onOpenShortcuts={() => setIsShortcutHelpOpen(true)}
        />

        {isSpectator || connectionStatus === 'reconnecting' || reconnectingPlayers.length > 0 || disconnectedPlayers.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {isSpectator ? (
              <div className="rounded-[1.5rem] border border-tide-400/25 bg-tide-500/10 px-4 py-3 shadow-card">
                <div className="flex items-start gap-3">
                  <Monitor className="mt-0.5 h-4 w-4 text-tide-100" />
                  <div>
                    <p className="text-sm font-semibold text-tide-100">Spectator mode</p>
                    <p className="mt-1 text-sm text-tide-50/90">
                      This browser can browse public zones, follow chat, and inspect the board, but
                      table actions stay locked to seated players.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {connectionStatus === 'reconnecting' || reconnectingPlayers.length > 0 || disconnectedPlayers.length > 0 ? (
              <div className="rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 px-4 py-3 shadow-card">
                <p className="text-sm font-semibold text-amber-100">Reconnect status</p>
                <p className="mt-1 text-sm text-amber-50/90">
                  {connectionStatus === 'reconnecting'
                    ? 'This browser is trying to restore the play server connection.'
                    : 'The table has remote connection issues.'}
                </p>
                {reconnectingPlayers.length > 0 ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/85">
                    Reconnecting: {reconnectingPlayers.map((player) => player.name).join(', ')}
                  </p>
                ) : null}
                {disconnectedPlayers.length > 0 ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/85">
                    Disconnected: {disconnectedPlayers.map((player) => player.name).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

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
            {battlefieldByController
              .filter(({ player }) => isSpectator || player.id !== localPlayerId).length > 0 ? (
              <section
                className={`grid gap-4 ${
                  battlefieldByController.filter(({ player }) => isSpectator || player.id !== localPlayerId).length > 1
                    ? 'xl:grid-cols-2'
                    : ''
                }`}
              >
                {battlefieldByController
                  .filter(({ player }) => isSpectator || player.id !== localPlayerId)
                  .map(({ player, permanents }) => (
                    <BattlefieldLane
                      key={player.id}
                      player={player}
                      permanents={permanents}
                      localPlayerId={localPlayerId}
                      isActiveTurnPlayer={activeTurnPlayer?.id === player.id}
                      isLocalPlayersTurn={isLocalPlayersTurn}
                      compact
                      compactRail
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

            {!isSpectator
              ? battlefieldByController
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
                  compactRail={false}
                />
              ))
              : null}

            {localPublicPlayer && localPrivatePlayer && !isSpectator ? (
              <HandTray
                privateState={localPrivatePlayer}
                canAct={canAct}
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
                players={players}
                localPlayerId={localPlayerId}
                canAct={canAct}
                focusedPlayer={focusedPlayer}
                activeZone={activeZone}
                cards={zoneCards}
                searchQuery={zoneSearchQuery}
                selectedCard={activeSelection}
                onClose={closeZoneOverlay}
                onClearSelection={() => setSelectedCard(null)}
                onSelectCard={selectZoneCard}
                onSelectLibraryCard={(cardId) => setSelectedCard({ zone: 'library', cardId })}
                onSearchChange={setZoneSearchQuery}
                onFocusPlayerChange={(playerId) => setFocusedPlayerId(playerId)}
                onZoneChange={(zone) => {
                  if (zone === 'library' && localPlayerId) {
                    setFocusedPlayerId(localPlayerId)
                  }
                  setActiveZone(zone)
                  setZoneSearchQuery('')
                }}
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
              canAct={canAct}
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
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['players', 'Players'],
                  ['stack', 'Stack'],
                  ['tokens', 'Tokens'],
                  ['log', 'Log'],
                  ['chat', 'Chat'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setUtilityPanel(value as 'players' | 'stack' | 'tokens' | 'log' | 'chat')
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
                    canAct={canAct}
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
                    canAct={canAct}
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
                    canAct={canAct}
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
                  <ActivityLog entries={activeGame.publicState.actionLog} players={players} />
                ) : null}

                {utilityPanel === 'chat' ? (
                  <RoomChatPanel
                    title="Live room chat"
                    description="Table talk and reconnect updates follow the room while the game is running."
                    connectionStatus={connectionStatus}
                    viewerRole={room?.viewerRole ?? activeGame.viewerRole}
                    messages={room?.chat ?? []}
                    onSendMessage={(message) => sendRoomChat(activeGame.roomId, message)}
                  />
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
      {isShortcutHelpOpen ? (
        <ShortcutOverlay
          isSpectator={Boolean(isSpectator)}
          canAct={canAct}
          onClose={() => setIsShortcutHelpOpen(false)}
        />
      ) : null}
    </div>
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
  players,
  localPlayerId,
  canAct,
  focusedPlayer,
  activeZone,
  cards,
  searchQuery,
  selectedCard,
  onClose,
  onClearSelection,
  onSelectCard,
  onSelectLibraryCard,
  onSearchChange,
  onFocusPlayerChange,
  onZoneChange,
  onMoveOwnedCard,
  animationToken,
  isClosing,
}: {
  players: GamePlayerPublicSnapshot[]
  localPlayerId: string
  canAct: boolean
  focusedPlayer: GamePlayerPublicSnapshot | null
  activeZone: BrowseableZone
  cards: TableCardSnapshot[]
  searchQuery: string
  selectedCard: TableSelection | null
  onClose: () => void
  onClearSelection: () => void
  onSelectCard: (playerId: string, zone: PublicZone, cardId: string) => void
  onSelectLibraryCard: (cardId: string) => void
  onSearchChange: (value: string) => void
  onFocusPlayerChange: (playerId: string) => void
  onZoneChange: (zone: BrowseableZone) => void
  onMoveOwnedCard: (
    fromZone: OwnedZone,
    toZone: OwnedZone,
    cardId: string,
    position?: PermanentPosition,
  ) => void
  animationToken: number
  isClosing: boolean
}) {
  const visibleCards = cards.filter((card) => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return true
    }

    return [card.card.name, card.card.typeLine, card.card.oracleText]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })
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
    selectedZoneCard.ownerPlayerId === localPlayerId &&
    canAct
  const selectedZoneCardInstanceId = selectedZoneCard?.instanceId ?? null
  const selectedZoneCardMoveTargets = selectedZoneCardHasActions
    ? (['library', 'battlefield', 'hand', 'graveyard', 'command', 'exile'] as OwnedZone[]).filter(
        (zone) => zone !== activeZone,
      )
    : []

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
          data-zone-overlay-surface="true"
          key={`${activeZone}-${focusedPlayer?.id ?? 'none'}-${animationToken}`}
          className={`zone-overlay-cards pointer-events-auto flex max-h-[calc(100vh-4.5rem)] w-full max-w-[min(108rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.8rem] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(8,20,27,0.28),rgba(6,14,18,0.18))] px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:px-3 sm:py-3 ${
            visibleCards.length === 0 ? 'zone-overlay-empty' : ''
          }`}
        >
          <div className="rounded-[1.4rem] border border-white/10 bg-ink-950/65 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Zone browser
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink-50">
                  {activeZone === 'library'
                    ? 'Private library'
                    : `${focusedPlayer?.name ?? 'Player'} • ${zoneLabel(activeZone)}`}
                </h2>
                <p className="mt-2 text-sm text-ink-300">
                  Search crowded piles without leaving the overlay.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink-200 transition hover:bg-white/6"
              >
                Close
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onFocusPlayerChange(player.id)}
                  disabled={activeZone === 'library' && player.id !== localPlayerId}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    focusedPlayer?.id === player.id
                      ? 'bg-tide-500/15 text-tide-100 ring-tide-400/30'
                      : 'bg-white/6 text-ink-200 ring-white/10 hover:bg-white/10'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {player.name}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(['graveyard', 'command', 'exile'] as BrowseableZone[]).map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => onZoneChange(zone)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    activeZone === zone
                      ? 'bg-ember-500/15 text-ember-100 ring-ember-400/30'
                      : 'bg-white/6 text-ink-200 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  {zoneLabel(zone)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onZoneChange('library')}
                disabled={!localPlayerId}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                  activeZone === 'library'
                    ? 'bg-ember-500/15 text-ember-100 ring-ember-400/30'
                    : 'bg-white/6 text-ink-200 ring-white/10 hover:bg-white/10'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Library
              </button>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by name, type, or rules text"
                className="w-full rounded-2xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 outline-none transition focus:border-tide-400/35"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
                {visibleCards.length} / {cards.length} cards
              </p>
            </div>
          </div>

          <div
            className={`mt-3 flex min-h-[11rem] flex-wrap items-start justify-center gap-2.5 overflow-y-auto ${
              visibleCards.length === 0 ? 'relative flex-1' : 'flex-1'
            }`}
          >
          {visibleCards.length > 0 ? (
            visibleCards.map((card, index) => {
              const isSelected = selectedZoneCardId === card.instanceId
              const showActionTray = isSelected && selectedZoneCardHasActions

              const animationStyle = {
                animationDelay: `${index * 54}ms`,
              } as CSSProperties

              return (
                <article
                  key={card.instanceId}
                  style={animationStyle}
                  className={`zone-card-fly-in relative flex w-[12rem] shrink-0 flex-col items-center ${isSelected ? 'z-20' : 'z-0'}`}
                >
                  <button
                    type="button"
                    data-card-name={card.card.name}
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (isSelected) {
                        onClearSelection()
                        return
                      }

                      if (activeZone === 'library') {
                        onSelectLibraryCard(card.instanceId)
                        return
                      }

                      if (focusedPlayer) {
                        onSelectCard(focusedPlayer.id, activeZone, card.instanceId)
                      }
                    }}
                    className={`block w-full text-left transition duration-200 ${
                      isSelected ? '-translate-y-1' : 'hover:-translate-y-1'
                    }`}
                  >
                    <TableCard card={card.card} variant="zone" selected={isSelected} />
                  </button>

                  {showActionTray ? (
                    <div className="zone-card-action-tray mt-3 grid w-full grid-cols-2 gap-2">
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
                  ) : null}
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
        </div>
      </div>
    </div>
  )
}

function ShortcutOverlay({
  isSpectator,
  canAct,
  onClose,
}: {
  isSpectator: boolean
  canAct: boolean
  onClose: () => void
}) {
  const shortcuts = [
    ['?', 'Toggle shortcuts'],
    ['1-5', 'Switch utility panels'],
    ['G / E / C', 'Open graveyard, exile, or command'],
    ['L', 'Open your library'],
    ['D', canAct ? 'Draw a card' : 'Draw when your turn is active'],
    ['U', canAct ? 'Untap all' : 'Untap when your turn is active'],
    ['P', canAct ? 'Pass the turn' : 'Pass when your turn is active'],
    ['Esc', 'Close the active overlay'],
  ] as const

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink-950/72 px-4 pt-10 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,25,33,0.98),rgba(7,18,24,0.98))] p-5 shadow-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              Keyboard shortcuts
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-50">Table controls</h2>
            <p className="mt-2 text-sm text-ink-300">
              {isSpectator
                ? 'Spectators can browse panels and zones, but action keys stay read-only.'
                : 'Shortcuts ignore focused inputs so chat and notes still type normally.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink-200 transition hover:bg-white/6"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {shortcuts.map(([shortcut, description]) => (
            <article
              key={shortcut}
              className="rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-tide-100">
                {shortcut}
              </p>
              <p className="mt-2 text-sm text-ink-300">{description}</p>
            </article>
          ))}
        </div>
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

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  )
}
