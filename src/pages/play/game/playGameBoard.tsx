import type { DragEvent } from 'react'
import {
  ArrowRight,
  BookOpen,
  Crown,
  FlaskConical,
  Hand,
  Keyboard,
  Minus,
  Plus,
  RefreshCcw,
  ShieldPlus,
  Shuffle,
  Swords,
} from 'lucide-react'

import type {
  BattlefieldPermanentSnapshot,
  GamePlayerPublicSnapshot,
  GamePrivatePlayerState,
  PermanentPosition,
  RoomParticipantRole,
} from '@/shared/play'
import {
  buildBattlefieldStackGroups,
  MTG_CARD_BACK_URL,
  parseDragPayload,
  type BrowseableZone,
  type DragPayload,
} from '@/pages/play/game/playGameShared'
import {
  ClockPip,
  CountPill,
  HudButton,
  InfoChip,
  LifeButton,
  MetaPill,
  TableCard,
} from '@/pages/play/game/playGamePrimitives'

export function TableHud({
  gameId,
  roomCode,
  startedAt,
  isDebugMode,
  battlefieldCount,
  turn,
  activePlayer,
  localPlayer,
  viewerRole,
  isLocalPlayersTurn,
  onAdvanceTurn,
  onOpenShortcuts,
}: {
  gameId: string
  roomCode: string
  startedAt: string
  isDebugMode: boolean
  battlefieldCount: number
  turn: { turnNumber: number; activePlayerId: string }
  activePlayer: GamePlayerPublicSnapshot | null
  localPlayer: GamePlayerPublicSnapshot | null
  viewerRole: RoomParticipantRole
  isLocalPlayersTurn: boolean
  onAdvanceTurn: () => void
  onOpenShortcuts: () => void
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
            <MetaPill
              icon={<ClockPip />}
              label={`Started ${new Date(startedAt).toLocaleTimeString()}`}
            />
            <MetaPill
              icon={<Swords className="h-3.5 w-3.5" />}
              label={`${battlefieldCount} permanents`}
            />
            {isDebugMode ? (
              <MetaPill
                icon={<FlaskConical className="h-3.5 w-3.5" />}
                label="Sandbox room"
              />
            ) : null}
            <MetaPill
              icon={<Crown className="h-3.5 w-3.5" />}
              label={`Turn ${turn.turnNumber} • ${activePlayer?.name ?? 'Unknown player'} acting`}
            />
            {viewerRole === 'spectator' ? (
              <MetaPill
                icon={<Swords className="h-3.5 w-3.5" />}
                label="Spectating"
              />
            ) : null}
            {localPlayer ? (
              <>
                <MetaPill
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  label={`${localPlayer.zoneCounts.library} in library`}
                />
                <MetaPill
                  icon={<Hand className="h-3.5 w-3.5" />}
                  label={`${localPlayer.zoneCounts.hand} in hand`}
                />
                <MetaPill
                  icon={<Crown className="h-3.5 w-3.5" />}
                  label={`${localPlayer.zoneCounts.command} in command`}
                />
              </>
            ) : null}
            <MetaPill
              icon={<Keyboard className="h-3.5 w-3.5" />}
              label="Press ? for shortcuts"
            />
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
                  {viewerRole === 'spectator'
                    ? `${activePlayer?.name ?? 'Unknown player'}'s turn`
                    : isLocalPlayersTurn
                      ? 'Your turn'
                      : `${activePlayer?.name ?? 'Unknown player'}'s turn`}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ink-50">
                  {viewerRole === 'spectator'
                    ? 'You can inspect the table without taking actions.'
                    : isLocalPlayersTurn
                      ? 'You can move cards and use the board.'
                      : `Actions stay locked until ${activePlayer?.name ?? 'the active player'} passes.`}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HudButton
                  icon={<Keyboard className="h-4 w-4" />}
                  label="Shortcuts"
                  onClick={onOpenShortcuts}
                />
                <HudButton
                  icon={<ArrowRight className="h-4 w-4" />}
                  label="Pass turn"
                  onClick={onAdvanceTurn}
                  disabled={!isLocalPlayersTurn}
                  dataTestId="table-hud-pass-turn"
                />
              </div>
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

export function BattlefieldLane({
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
  compactRail = false,
}: {
  player: GamePlayerPublicSnapshot
  permanents: BattlefieldPermanentSnapshot[]
  localPlayerId: string
  privateState?: GamePrivatePlayerState | null
  compact?: boolean
  compactRail?: boolean
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
  const railCompact = compactRail && !isLocalLane

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
                {player.connectionState !== 'connected' ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${
                      player.connectionState === 'reconnecting'
                        ? 'border-amber-400/30 bg-amber-500/12 text-amber-100'
                        : 'border-rose-400/30 bg-rose-500/12 text-rose-100'
                    }`}
                  >
                    {player.connectionState === 'reconnecting' ? 'Reconnecting' : 'Disconnected'}
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
        <div
          className={`grid h-full gap-0 ${
            railCompact
              ? 'xl:grid-cols-[minmax(0,1fr)_7.5rem] 2xl:grid-cols-[minmax(0,1fr)_8.25rem]'
              : 'xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]'
          }`}
        >
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
            compactRail={railCompact}
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
  compactRail = false,
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
  compactRail?: boolean
  onOpenZone: (playerId: string, zone: BrowseableZone) => void
  onDrawCard: () => void
  onBrowseLocalLibrary: () => void
  onShuffle: () => void
  onUntapAll: () => void
}) {
  const laneSlug = isLocalLane ? 'local' : player.name.toLowerCase().replace(/\s+/g, '-')
  const libraryCount =
    isLocalLane ? privateState?.library.length ?? player.zoneCounts.library : player.zoneCounts.library
  const graveyardTopCard = player.graveyard[player.graveyard.length - 1]?.card.imageUrl
  const commandTopCard = player.command[player.command.length - 1]?.card.imageUrl
  const exileTopCard = player.exile[player.exile.length - 1]?.card.imageUrl
  const railClassName = compactRail
    ? 'flex h-full flex-col bg-[linear-gradient(180deg,rgba(6,18,23,0.44),rgba(5,13,17,0.74))] p-2'
    : 'flex h-full flex-col bg-[linear-gradient(180deg,rgba(6,18,23,0.68),rgba(5,13,17,0.9))] p-4 sm:p-5'

  if (compactRail) {
    return (
      <aside className={railClassName}>
        <div className="grid gap-1.5">
          <CompactZoneRailStat label="Lib" value={libraryCount} />
          <CompactZoneRailStat
            label="GY"
            value={player.zoneCounts.graveyard}
            onClick={() => onOpenZone(player.id, 'graveyard')}
          />
          <CompactZoneRailStat
            label="Cmd"
            value={player.zoneCounts.command}
            onClick={() => onOpenZone(player.id, 'command')}
          />
          <CompactZoneRailStat
            label="Ex"
            value={player.zoneCounts.exile}
            onClick={() => onOpenZone(player.id, 'exile')}
          />
        </div>

        {isActiveTurnPlayer ? (
          <div className="mt-2 rounded-xl border border-ember-400/20 bg-ember-500/10 px-2 py-1 text-center text-[0.52rem] font-semibold uppercase tracking-[0.16em] text-ember-100">
            Turn
          </div>
        ) : null}
      </aside>
    )
  }

  return (
    <aside className={railClassName}>
      <div>
        <p
          className={`font-semibold uppercase tracking-[0.16em] text-ink-500 ${compactRail ? 'text-[0.55rem]' : 'text-[0.65rem]'}`}
        >
          Zone rail
        </p>
        <h3 className={`mt-2 font-semibold text-ink-50 ${compactRail ? 'text-sm' : 'text-lg'}`}>
          {isLocalLane ? 'Your piles' : `${player.name}'s piles`}
        </h3>
        {compactRail ? (
          <p className="mt-1 text-[0.72rem] leading-4 text-ink-500">
            Quick access to public piles.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-5 text-ink-400">
            {isLocalLane
              ? isLocalPlayersTurn
                ? 'Click the library pile to draw. Open any pile to throw its cards over the table as an overlay.'
                : 'Piles stay visible, but only the active player can use the board controls.'
              : isActiveTurnPlayer
                ? 'This player currently has the turn.'
                : 'Public piles stay on the same shared table from here.'}
          </p>
        )}
      </div>

      <div className={`mt-4 grid grid-cols-2 ${compactRail ? 'gap-2' : 'gap-3'}`}>
        <BoardZonePile
          dataTestId={`zone-pile-library-${laneSlug}`}
          title="Library"
          count={libraryCount}
          faceDown
          imageUrl={null}
          actionLabel={isLocalLane ? 'Draw 1' : 'Hidden'}
          onClick={isLocalLane ? onDrawCard : undefined}
          disabled={!isLocalLane || !isLocalPlayersTurn}
          compact={compactRail}
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
          compact={compactRail}
        />
        <BoardZonePile
          dataTestId={`zone-pile-command-${laneSlug}`}
          title="Command"
          count={player.zoneCounts.command}
          imageUrl={commandTopCard ?? null}
          actionLabel="Open"
          onClick={() => onOpenZone(player.id, 'command')}
          compact={compactRail}
        />
        <BoardZonePile
          dataTestId={`zone-pile-exile-${laneSlug}`}
          title="Exile"
          count={player.zoneCounts.exile}
          imageUrl={exileTopCard ?? null}
          actionLabel="Open"
          onClick={() => onOpenZone(player.id, 'exile')}
          compact={compactRail}
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

function CompactZoneRailStat({
  label,
  value,
  onClick,
}: {
  label: string
  value: number
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      {...(onClick
        ? {
            type: 'button' as const,
            onClick,
          }
        : {})}
      className={`flex w-full items-center justify-between rounded-xl border px-2 py-2 text-left ${
        onClick
          ? 'border-white/10 bg-white/[0.04] text-ink-100 transition hover:border-tide-400/30 hover:bg-white/[0.08]'
          : 'border-white/[0.08] bg-white/[0.03] text-ink-300'
      }`}
    >
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {label}
      </span>
      <span className="text-sm font-semibold text-ink-50">{value}</span>
    </Tag>
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
  compact = false,
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
  compact?: boolean
  secondaryAction?: { label: string; dataTestId?: string; onClick: () => void }
}) {
  const canActivate = Boolean(onClick) && !disabled

  return (
    <article
      className={`rounded-[1.65rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] ${
        compact ? 'p-2.5' : 'p-4'
      }`}
    >
      <button
        type="button"
        data-testid={dataTestId}
        onClick={canActivate ? onClick : undefined}
        disabled={!canActivate}
        className={`w-full rounded-[1.35rem] border text-left transition ${
          compact ? 'px-3 py-3' : 'px-4 py-4'
        } ${
          canActivate
            ? 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,18,24,0.78),rgba(7,18,24,0.96))] hover:border-tide-400/30 hover:bg-ink-900/95'
            : 'cursor-not-allowed border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,18,24,0.48),rgba(7,18,24,0.72))] text-ink-500'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`font-semibold uppercase tracking-[0.16em] text-ink-500 ${compact ? 'text-[0.53rem]' : 'text-[0.62rem]'}`}
            >
              {title}
            </p>
            <p className={`mt-1 font-semibold text-ink-50 ${compact ? 'text-base' : 'text-lg'}`}>
              {count}
            </p>
          </div>
          <span
            className={`rounded-full border border-white/10 bg-white/6 font-semibold uppercase tracking-[0.14em] text-ink-200 ${
              compact ? 'px-1.5 py-0.5 text-[0.5rem]' : 'px-2 py-1 text-[0.58rem]'
            }`}
          >
            {actionLabel}
          </span>
        </div>

        <div className={`mt-3 flex justify-center ${compact ? 'mt-2' : ''}`}>
          <BoardPileVisual faceDown={faceDown} imageUrl={imageUrl} title={title} compact={compact} />
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
  compact = false,
}: {
  faceDown: boolean
  imageUrl: string | null
  title: string
  compact?: boolean
}) {
  const layers = faceDown ? [0, 1, 2] : [0, 1]
  const frameClassName = compact
    ? 'relative w-[5.45rem] aspect-[61/85]'
    : 'relative w-[8.4rem] aspect-[61/85]'
  const layerStepX = compact ? 6 : 10
  const layerStepY = compact ? 4 : 7

  return (
    <div className={frameClassName}>
      {layers.map((layer) => {
        const isTopLayer = layer === layers.length - 1

        return (
          <div
            key={layer}
            style={{
              transform: `translate(${layer * layerStepX}px, ${layer * layerStepY}px)`,
            }}
            className="absolute inset-0 overflow-hidden rounded-[0.95rem] border border-white/10 bg-[#120f0b] shadow-card"
          >
            {faceDown ? (
              <>
                <img
                  src={MTG_CARD_BACK_URL}
                  alt={`${title} card back`}
                  className="h-full w-full object-contain"
                />
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

export function HandTray({
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
