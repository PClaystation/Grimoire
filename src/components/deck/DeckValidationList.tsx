import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import type { DeckValidationIssue } from '@/types/deck'

interface DeckValidationListProps {
  issues: DeckValidationIssue[]
}

const STYLE_MAP = {
  error: {
    icon: AlertCircle,
    className: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
    iconClassName: 'text-rose-300',
  },
  warning: {
    icon: AlertCircle,
    className: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    iconClassName: 'text-amber-300',
  },
  info: {
    icon: CheckCircle2,
    className: 'border-tide-400/20 bg-tide-500/10 text-tide-100',
    iconClassName: 'text-tide-300',
  },
} as const

export function DeckValidationList({ issues }: DeckValidationListProps) {
  if (issues.length === 0) {
    return (
      <EmptyState
        title="No validation feedback"
        description="Add more cards to generate feedback."
        icon={<Info className="h-5 w-5" />}
      />
    )
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const style = STYLE_MAP[issue.severity]
        const Icon = style.icon

        return (
          <div
            key={issue.id}
            className={`rounded-[1.3rem] border px-4 py-3 ${style.className}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClassName}`} />
              <div>
                <p className="text-sm font-semibold">{issue.title}</p>
                <p className="mt-1 text-sm opacity-80">{issue.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
