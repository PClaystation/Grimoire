import type { ReactNode } from 'react'

interface SectionPanelProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function SectionPanel({
  title,
  subtitle,
  actions,
  className,
  children,
}: SectionPanelProps) {
  return (
    <section
      className={`relative isolate overflow-hidden rounded-[2.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(11,24,31,0.99))] p-6 shadow-panel ring-1 ring-white/5 sm:p-7 lg:p-8 ${
        className ?? ''
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(223,107,11,0.12),transparent_32%)]" />
      <div className="relative">
        {(title || subtitle || actions) && (
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 lg:gap-6">
            <div className="space-y-2">
              {title ? (
                <h2 className="font-display text-[clamp(1.65rem,2vw,2.15rem)] leading-tight text-ink-50">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="max-w-3xl text-[15px] leading-7 text-ink-300">{subtitle}</p>
              ) : null}
            </div>
            {actions ? <div className="max-w-full shrink-0">{actions}</div> : null}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
