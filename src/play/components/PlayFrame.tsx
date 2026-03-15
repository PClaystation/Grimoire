import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

import { SiteNav } from '@/components/layout/SiteNav'

interface PlayFrameProps {
  eyebrow: string
  title: string
  description: string
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  error: string | null
  onDismissError: () => void
  actions?: ReactNode
  children: ReactNode
}

export function PlayFrame({
  eyebrow,
  title,
  description,
  connectionStatus,
  error,
  onDismissError,
  actions,
  children,
}: PlayFrameProps) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
        <SiteNav connectionStatus={connectionStatus} />

        <section className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-ink-900/78 px-6 py-8 shadow-panel backdrop-blur-xl sm:px-8 sm:py-10">
          <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-ember-500/14 blur-3xl" />
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-tide-500/16 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-tide-200">
                {eyebrow}
              </p>
              <h1 className="mt-3 font-display text-4xl leading-[1.02] tracking-tight text-ink-50 sm:text-5xl xl:text-[3.65rem]">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-ink-300 sm:text-lg">
                {description}
              </p>
            </div>

            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </section>

        {error ? (
          <div className="flex flex-col gap-3 rounded-[1.8rem] border border-rose-400/20 bg-rose-500/10 px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-500/12 p-2 text-rose-100">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-100">Play sync issue</p>
                <p className="mt-1 text-sm text-rose-50/90">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismissError}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  )
}
