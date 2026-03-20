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
      className={`rounded-[2.15rem] border border-white/10 bg-ink-900/90 p-6 shadow-panel sm:p-7 lg:p-8 ${
        className ?? ''
      }`}
    >
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
    </section>
  )
}
