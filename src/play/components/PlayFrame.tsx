import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

import { ContinentalBranding } from '@/components/layout/ContinentalBranding'
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
  const statusToneClassName =
    connectionStatus === 'connected'
      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
      : connectionStatus === 'connecting'
        ? 'border-amber-400/25 bg-amber-500/10 text-amber-100'
        : 'border-rose-400/25 bg-rose-500/10 text-rose-100'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,rgba(7,19,27,0.98)_0%,rgba(10,22,29,0.98)_44%,rgba(16,32,41,0.98)_100%)] px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(223,107,11,0.1),transparent_22%)]" />
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
        <SiteNav connectionStatus={connectionStatus} />

        <section className="relative isolate overflow-hidden rounded-[2.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(11,25,32,0.98),rgba(7,18,24,0.98)_58%,rgba(18,36,45,0.98))] px-6 py-7 shadow-panel ring-1 ring-white/5 sm:px-8 sm:py-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(223,107,11,0.14),transparent_30%),radial-gradient(circle_at_right_top,rgba(29,150,167,0.16),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-end">
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
              <ContinentalBranding className="max-w-[22rem]" />
            </div>

            <div className="flex flex-col gap-3 xl:items-stretch">
              {actions ? <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div> : null}
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className={`rounded-[1.4rem] border px-4 py-3 ${statusToneClassName}`}>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]">Socket</p>
                  <p className="mt-2 text-sm font-semibold capitalize">{connectionStatus}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-ink-100">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                    Hidden
                  </p>
                  <p className="mt-2 text-sm font-semibold">Hands stay private.</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-ink-100">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                    Shared
                  </p>
                  <p className="mt-2 text-sm font-semibold">Public zones sync live.</p>
                </div>
              </div>
            </div>
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
