import { useEffect, useState } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { DeckReadOnlyList } from '@/components/deck/DeckReadOnlyList'
import { DeckStats } from '@/components/deck/DeckStats'
import { SiteNav } from '@/components/layout/SiteNav'
import { buildAppRouteUrl } from '@/utils/appRouteUrl'
import { copyTextToClipboard } from '@/utils/clipboard'
import { getDeckStats } from '@/utils/deckStats'
import { resolveSharedDeckParam } from '@/utils/sharedDeckRoute'
import { decodeDeckSharePayload } from '@/utils/share'

type ResolvedSharedDeck = Awaited<ReturnType<typeof resolveSharedDeckParam>>

export function DeckPublicPage() {
  const [searchParams] = useSearchParams()
  const [resolvedDeckState, setResolvedDeckState] = useState<{
    resolvedKey: string
    deck: ResolvedSharedDeck | null
    error: string | null
  }>({
    resolvedKey: '',
    deck: null,
    error: null,
  })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const deckParam = searchParams.get('deck')
  const requestKey = deckParam ?? ''

  useEffect(() => {
    let isCancelled = false

    void resolveSharedDeckParam(deckParam)
      .then((resolvedDeck) => {
        if (isCancelled) {
          return
        }

        if (!resolvedDeck) {
          setResolvedDeckState({
            resolvedKey: requestKey,
            deck: null,
            error: 'That shared deck page is invalid or incomplete.',
          })
          return
        }

        setResolvedDeckState({
          resolvedKey: requestKey,
          deck: resolvedDeck,
          error: null,
        })
      })
      .catch(() => {
        if (!isCancelled) {
          setResolvedDeckState({
            resolvedKey: requestKey,
            deck: null,
            error: 'Unable to load that shared deck right now.',
          })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [deckParam, requestKey])

  const isLoading = resolvedDeckState.resolvedKey !== requestKey
  const error = isLoading ? null : resolvedDeckState.error
  const deckDraft = !isLoading ? resolvedDeckState.deck?.deck ?? null : null
  const stats = deckDraft
    ? getDeckStats(
        deckDraft.mainboard,
        deckDraft.sideboard,
        deckDraft.format,
        deckDraft.budgetTargetUsd,
      )
    : null

  async function copyCurrentPageLink() {
    try {
      const didCopy = await copyTextToClipboard(window.location.href)
      setStatusMessage(
        didCopy ? 'Copied the public deck page link.' : 'Unable to copy the public deck page link.',
      )
    } catch {
      setStatusMessage('Unable to copy the public deck page link.')
    }
  }

  async function copyBuilderImportLink() {
    if (!deckParam || !decodeDeckSharePayload(deckParam)) {
      return
    }

    try {
      const didCopy = await copyTextToClipboard(buildAppRouteUrl('/', { deck: deckParam }))
      setStatusMessage(
        didCopy ? 'Copied the builder import link.' : 'Unable to copy the builder import link.',
      )
    } catch {
      setStatusMessage('Unable to copy the builder import link.')
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.08),transparent_18%),radial-gradient(circle_at_top_right,rgba(223,107,11,0.08),transparent_14%)]" />
      <div className="relative mx-auto flex w-full max-w-[1320px] flex-col gap-6">
        <SiteNav />

        <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,31,39,0.98),rgba(10,20,27,0.96)_58%,rgba(18,35,44,0.98))] px-5 py-6 shadow-panel ring-1 ring-white/5 sm:px-6 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-tide-100">
                Public deck page
              </p>
              <h1 className="mt-3 font-display text-3xl leading-[1.06] tracking-tight text-ink-50 sm:text-4xl">
                {deckDraft?.name ?? 'Loading deck'}
              </h1>
              <p className="mt-3 text-sm leading-7 text-ink-300 sm:text-base">
                Share the page or copy a builder import link.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void copyCurrentPageLink()}
                disabled={!deckDraft}
                className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                Copy page link
              </button>
              <button
                type="button"
                onClick={() => void copyBuilderImportLink()}
                disabled={!deckDraft}
                className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ExternalLink className="h-4 w-4" />
                Copy builder link
              </button>
            </div>
          </div>
        </section>

        {statusMessage ? (
          <p className="rounded-[1.3rem] border border-tide-400/20 bg-tide-500/10 px-4 py-3 text-sm text-tide-100">
            {statusMessage}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-ink-300">Loading shared deck...</p>
          </section>
        ) : error ? (
          <section className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-5">
            <p className="text-sm text-rose-100">{error}</p>
          </section>
        ) : deckDraft && stats ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_24rem]">
              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-5 shadow-panel ring-1 ring-white/5">
                <DeckStats stats={stats} />
              </section>

              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-5 shadow-panel ring-1 ring-white/5">
                <div className="grid gap-4">
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                      Format
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink-50">{deckDraft.format}</p>
                  </div>

                  {deckDraft.notes.trim() ? (
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                        Notes
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-200">
                        {deckDraft.notes}
                      </p>
                    </div>
                  ) : null}

                  {deckDraft.matchupNotes.trim() ? (
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                        Matchups
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-200">
                        {deckDraft.matchupNotes}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DeckReadOnlyList
                title="Mainboard"
                entries={deckDraft.mainboard}
                emptyDescription="No mainboard cards were resolved."
              />
              <DeckReadOnlyList
                title="Sideboard"
                entries={deckDraft.sideboard}
                emptyDescription="No sideboard cards were resolved."
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
