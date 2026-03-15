const MARK_SRC = '/branding/c2-mark-white.png'
const WORDMARK_SRC = '/branding/continental-wordmark-white.png'

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

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-400">Grimoire</p>
          <p className="text-sm text-ink-200">Built by Continental</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mt-6 inline-flex w-full max-w-[26rem] items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 shadow-card backdrop-blur-xl ${className}`.trim()}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 p-2">
        <img src={MARK_SRC} alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </div>

      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-400">
          Built by
        </p>
        <img
          src={WORDMARK_SRC}
          alt="Continental"
          className="mt-2 h-auto w-[12.5rem] max-w-full object-contain"
        />
      </div>
    </div>
  )
}
