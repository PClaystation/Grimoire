import { CheckCircle2, Info, Lightbulb } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import type { DeckRecommendation } from '@/types/deck'

interface DeckRecommendationsListProps {
  recommendations: DeckRecommendation[]
}

const TONE_STYLES = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    iconClassName: 'text-emerald-300',
  },
  warning: {
    icon: Lightbulb,
    className: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    iconClassName: 'text-amber-300',
  },
  info: {
    icon: Info,
    className: 'border-tide-400/20 bg-tide-500/10 text-tide-100',
    iconClassName: 'text-tide-300',
  },
} as const

export function DeckRecommendationsList({
  recommendations,
}: DeckRecommendationsListProps) {
  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No tuning suggestions yet"
        description="Add a few more cards and Grimoire will start surfacing structural hints."
        icon={<Info className="h-5 w-5" />}
      />
    )
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation) => {
        const tone = TONE_STYLES[recommendation.tone]
        const Icon = tone.icon

        return (
          <div
            key={recommendation.id}
            className={`rounded-[1.3rem] border px-4 py-3 ${tone.className}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClassName}`} />
              <div>
                <p className="text-sm font-semibold">{recommendation.title}</p>
                <p className="mt-1 text-sm opacity-80">{recommendation.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
