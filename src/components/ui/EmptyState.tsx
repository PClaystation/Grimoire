import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-ink-800/55 px-5 py-10 text-center">
      {icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-tide-300 ring-1 ring-white/10 shadow-card">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-xl text-ink-50">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">{description}</p>
    </div>
  )
}
