import type { MagicCard } from '@/types/scryfall'

interface PlayCardAction {
  label: string
  onClick: () => void
  tone?: 'primary' | 'secondary' | 'danger'
}

interface PlayCardProps {
  card: MagicCard
  tapped?: boolean
  subtitle?: string
  size?: 'sm' | 'md'
  actions?: PlayCardAction[]
  onInspect: () => void
}

const ACTION_TONE_STYLES: Record<NonNullable<PlayCardAction['tone']>, string> = {
  primary: 'border-tide-400/25 bg-tide-500/12 text-tide-100 hover:border-tide-400/40',
  secondary: 'border-white/10 bg-white/6 text-ink-100 hover:border-white/20',
  danger: 'border-rose-400/25 bg-rose-500/12 text-rose-100 hover:border-rose-400/40',
}

export function PlayCard({
  card,
  tapped = false,
  subtitle,
  size = 'md',
  actions = [],
  onInspect,
}: PlayCardProps) {
  const containerClassName =
    size === 'sm' ? 'w-[9rem] min-w-[9rem]' : 'w-[12rem] min-w-[12rem]'
  const imageClassName = size === 'sm' ? 'h-48' : 'h-72'

  return (
    <article className={`${containerClassName} rounded-[1.5rem] border border-white/10 bg-ink-900/88 p-3 shadow-card`}>
      <button type="button" onClick={onInspect} className="w-full text-left">
        <div className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-ink-800/70">
          <img
            src={card.imageUrl}
            alt={card.name}
            className={`${imageClassName} w-full object-contain transition duration-200 ${
              tapped ? 'origin-center rotate-90 scale-[0.9]' : ''
            }`}
          />
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold text-ink-50">{card.name}</p>
          <p className="mt-1 text-xs text-ink-400">{subtitle ?? card.typeLine}</p>
        </div>
      </button>

      {actions.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {actions.map((action) => {
            const tone = action.tone ?? 'secondary'

            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${ACTION_TONE_STYLES[tone]}`}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}
