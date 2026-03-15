const MARK_SRC = `${import.meta.env.BASE_URL}branding/c2-mark-white.png`
const WORDMARK_SRC = `${import.meta.env.BASE_URL}branding/continental-wordmark-white.png`

interface ContinentalBrandingProps {
  variant?: 'nav' | 'signature'
  className?: string
}

export function ContinentalBranding({
  variant = 'signature',
  className = '',
}: ContinentalBrandingProps) {
  if (variant === 'nav') {
    return (
      <div className={`flex items-center gap-3 ${className}`.trim()}>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 p-2 shadow-card">
          <img src={MARK_SRC} alt="Continental logo" className="h-full w-full object-contain" />
        </div>

        <div className="space-y-0.5 leading-none">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-400">Grimoire</p>
          <p className="text-sm text-ink-200">Built by Continental</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mt-6 inline-flex w-full max-w-[23rem] items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3.5 text-left shadow-card backdrop-blur-xl sm:w-auto ${className}`.trim()}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 p-2">
        <img src={MARK_SRC} alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-1.5 self-stretch">
        <p className="text-[0.65rem] font-semibold uppercase leading-none tracking-[0.24em] text-ink-400">
          Built by
        </p>
        <div className="flex min-h-[1.9rem] items-center">
          <img
            src={WORDMARK_SRC}
            alt="Continental"
            className="h-[1.65rem] w-auto max-w-full -translate-y-px object-contain object-left"
          />
        </div>
      </div>
    </div>
  )
}
