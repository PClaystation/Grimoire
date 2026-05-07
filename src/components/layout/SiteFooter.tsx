import {
  CONTINENTAL_CONTACT_URL,
  CONTINENTAL_GITHUB_URL,
  CONTINENTAL_PATREON_URL,
} from '@/constants/siteLinks'

const WORDMARK_SRC = `${import.meta.env.BASE_URL}branding/made-by-continental-white.png`
const PRIVACY_URL = `${import.meta.env.BASE_URL}privacy-policy.html`
const TERMS_URL = `${import.meta.env.BASE_URL}terms-of-service.html`

export function SiteFooter() {
  return (
    <footer className="flex w-full min-w-0 flex-col gap-3 overflow-hidden rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,31,39,0.76),rgba(8,18,24,0.86))] px-4 py-4 text-ink-300 shadow-card ring-1 ring-white/5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5" aria-label="Made by Continental">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-400">
          Made by
        </span>
        <img
          src={WORDMARK_SRC}
          alt="Continental"
          className="h-auto w-[min(9.5rem,48vw)] max-w-full opacity-85"
        />
      </div>

      <nav
        className="flex min-w-0 flex-wrap items-center gap-2.5 text-sm font-semibold sm:justify-end"
        aria-label="Site links"
      >
        <a className="transition hover:text-ink-50" href={PRIVACY_URL}>
          Privacy
        </a>
        <a className="transition hover:text-ink-50" href={TERMS_URL}>
          Terms
        </a>
        <a
          className="transition hover:text-ink-50"
          href={CONTINENTAL_GITHUB_URL}
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          className="transition hover:text-ink-50"
          href={CONTINENTAL_PATREON_URL}
          target="_blank"
          rel="noreferrer"
        >
          Patreon
        </a>
        <a
          className="transition hover:text-ink-50"
          href={CONTINENTAL_CONTACT_URL}
          target="_blank"
          rel="noreferrer"
        >
          Contact
        </a>
      </nav>
    </footer>
  )
}
