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
      className={`relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.95),rgba(11,24,31,0.99))] p-5 shadow-panel ring-1 ring-white/5 sm:p-6 lg:p-6 ${
        className ?? ''
      }`}
    >
      <div className="relative">
        {(title || subtitle || actions) && (
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4 lg:gap-6">
            <div className="space-y-2">
              {title ? (
                <h2 className="font-display text-[clamp(1.4rem,1.8vw,1.8rem)] leading-tight text-ink-50">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="max-w-3xl text-sm leading-6 text-ink-300">{subtitle}</p>
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
