import { Minus, Plus } from 'lucide-react'

import { PlayCard } from '@/play/components/PlayCard'
import type { GamePlayerPublicSnapshot, OwnedZone, TableCardSnapshot } from '@/shared/play'
import type { MagicCard } from '@/types/scryfall'

interface PlayerPanelProps {
  player: GamePlayerPublicSnapshot
  isLocal?: boolean
  onAdjustLife: (playerId: string, delta: number) => void
  onInspectCard: (card: MagicCard) => void
  onMoveOwnedCard?: (fromZone: 'graveyard' | 'exile', toZone: OwnedZone, cardId: string) => void
}

export function PlayerPanel({
  player,
  isLocal = false,
  onAdjustLife,
  onInspectCard,
  onMoveOwnedCard,
}: PlayerPanelProps) {
  function renderZoneCards(
    zoneLabel: 'graveyard' | 'exile',
    cards: TableCardSnapshot[],
    emptyMessage: string,
  ) {
    return (
      <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            {zoneLabel}
          </p>
          <p className="text-xs text-ink-400">{cards.length} cards</p>
        </div>

        {cards.length > 0 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {cards.map((card) => (
              <PlayCard
                key={card.instanceId}
                card={card.card}
                size="sm"
                onInspect={() => onInspectCard(card.card)}
                actions={
                  isLocal && onMoveOwnedCard
                    ? zoneLabel === 'graveyard'
                      ? [
                          {
                            label: 'Battlefield',
                            onClick: () => onMoveOwnedCard('graveyard', 'battlefield', card.instanceId),
                            tone: 'primary',
                          },
                          {
                            label: 'Hand',
                            onClick: () => onMoveOwnedCard('graveyard', 'hand', card.instanceId),
                          },
                          {
                            label: 'Exile',
                            onClick: () => onMoveOwnedCard('graveyard', 'exile', card.instanceId),
                            tone: 'danger',
                          },
                        ]
                      : [
                          {
                            label: 'Battlefield',
                            onClick: () => onMoveOwnedCard('exile', 'battlefield', card.instanceId),
                            tone: 'primary',
                          },
                          {
                            label: 'Hand',
                            onClick: () => onMoveOwnedCard('exile', 'hand', card.instanceId),
                          },
                          {
                            label: 'Graveyard',
                            onClick: () => onMoveOwnedCard('exile', 'graveyard', card.instanceId),
                          },
                        ]
                    : []
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-400">{emptyMessage}</p>
        )}
      </div>
    )
  }

  return (
    <section className="rounded-[1.8rem] border border-white/10 bg-ink-900/80 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-400">
            {isLocal ? 'Your panel' : 'Remote player'}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink-50">{player.name}</h2>
          <p className="mt-2 text-sm text-ink-400">
            {player.deck ? `${player.deck.name} • ${player.deck.format}` : 'No deck selected'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Life</p>
            <p className="mt-1 text-3xl font-semibold text-ink-50">{player.lifeTotal}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAdjustLife(player.id, -1)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-ink-100 transition hover:bg-white/10"
            >
              <Minus className="h-3.5 w-3.5" />
              1
            </button>
            <button
              type="button"
              onClick={() => onAdjustLife(player.id, +1)}
              className="inline-flex items-center gap-2 rounded-full border border-tide-400/25 bg-tide-500/12 px-3 py-2 text-xs font-semibold text-tide-100 transition hover:border-tide-400/40"
            >
              <Plus className="h-3.5 w-3.5" />
              1
            </button>
            <button
              type="button"
              onClick={() => onAdjustLife(player.id, +5)}
              className="inline-flex items-center gap-2 rounded-full border border-ember-400/25 bg-ember-500/12 px-3 py-2 text-xs font-semibold text-ember-100 transition hover:border-ember-400/40"
            >
              <Plus className="h-3.5 w-3.5" />
              5
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Library" value={player.zoneCounts.library} />
        <StatCard label="Hand" value={player.zoneCounts.hand} />
        <StatCard label="Battlefield" value={player.zoneCounts.battlefield} />
        <StatCard label="Graveyard" value={player.zoneCounts.graveyard} />
        <StatCard label="Exile" value={player.zoneCounts.exile} />
      </div>

      <div className="mt-5 grid gap-4">
        {renderZoneCards('graveyard', player.graveyard, 'No cards in graveyard.')}
        {renderZoneCards('exile', player.exile, 'No cards in exile.')}
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink-50">{value}</p>
    </div>
  )
}
