import { useEffect, useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { DeckReadOnlyList } from '@/components/deck/DeckReadOnlyList'
import { DeckStats } from '@/components/deck/DeckStats'
import { SiteNav } from '@/components/layout/SiteNav'
import { copyTextToClipboard } from '@/utils/clipboard'
import { buildDeckComparisonSummary } from '@/utils/deckCompare'
import { getDeckStats } from '@/utils/deckStats'
import { resolveSharedDeckParam } from '@/utils/sharedDeckRoute'

type ResolvedSharedDeck = Awaited<ReturnType<typeof resolveSharedDeckParam>>

function DiffSection({
  title,
  entries,
  emptyLabel,
}: {
  title: string
  entries: Array<{ name: string; leftQuantity: number; rightQuantity: number; delta: number }>
  emptyLabel: string
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
      {entries.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {entries.slice(0, 18).map((entry) => (
            <div
              key={`${title}-${entry.name}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-ink-900/45 px-4 py-3"
            >
              <p className="text-sm font-semibold text-ink-50">{entry.name}</p>
              <p className="text-xs text-ink-300">
                {entry.leftQuantity} → {entry.rightQuantity}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-300">{emptyLabel}</p>
      )}
    </section>
  )
}

export function DeckComparePage() {
  const [searchParams] = useSearchParams()
  const [resolvedDeckState, setResolvedDeckState] = useState<{
    resolvedKey: string
    leftDeck: ResolvedSharedDeck | null
    rightDeck: ResolvedSharedDeck | null
    error: string | null
  }>({
    resolvedKey: '',
    leftDeck: null,
    rightDeck: null,
    error: null,
  })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const leftParam = searchParams.get('left')
  const rightParam = searchParams.get('right')
  const requestKey = `${leftParam ?? ''}::${rightParam ?? ''}`

  useEffect(() => {
    let isCancelled = false

    void Promise.all([resolveSharedDeckParam(leftParam), resolveSharedDeckParam(rightParam)])
      .then(([resolvedLeftDeck, resolvedRightDeck]) => {
        if (isCancelled) {
          return
        }

        if (!resolvedLeftDeck || !resolvedRightDeck) {
          setResolvedDeckState({
            resolvedKey: requestKey,
            leftDeck: null,
            rightDeck: null,
            error: 'Both comparison decks must be valid share links.',
          })
          return
        }

        setResolvedDeckState({
          resolvedKey: requestKey,
          leftDeck: resolvedLeftDeck,
          rightDeck: resolvedRightDeck,
          error: null,
        })
      })
      .catch(() => {
        if (!isCancelled) {
          setResolvedDeckState({
            resolvedKey: requestKey,
            leftDeck: null,
            rightDeck: null,
            error: 'Unable to load one of the comparison decks.',
          })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [leftParam, requestKey, rightParam])

  const isLoading = resolvedDeckState.resolvedKey !== requestKey
  const error = isLoading ? null : resolvedDeckState.error
  const leftDraft = !isLoading ? resolvedDeckState.leftDeck?.deck ?? null : null
  const rightDraft = !isLoading ? resolvedDeckState.rightDeck?.deck ?? null : null
  const leftStats = leftDraft
    ? getDeckStats(leftDraft.mainboard, leftDraft.sideboard, leftDraft.format, leftDraft.budgetTargetUsd)
    : null
  const rightStats = rightDraft
    ? getDeckStats(
        rightDraft.mainboard,
        rightDraft.sideboard,
        rightDraft.format,
        rightDraft.budgetTargetUsd,
      )
    : null
  const comparisonSummary = useMemo(
    () => (leftDraft && rightDraft ? buildDeckComparisonSummary(leftDraft, rightDraft) : null),
    [leftDraft, rightDraft],
  )

  async function copyCompareLink() {
    try {
      const didCopy = await copyTextToClipboard(window.location.href)
      setStatusMessage(didCopy ? 'Copied the compare link.' : 'Unable to copy the compare link.')
    } catch {
      setStatusMessage('Unable to copy the compare link.')
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-6 text-ink-50 sm:px-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,150,167,0.08),transparent_18%),radial-gradient(circle_at_top_right,rgba(223,107,11,0.08),transparent_14%)]" />
      <div className="relative mx-auto flex w-full max-w-[1380px] flex-col gap-6">
        <SiteNav />

        <section className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,31,39,0.98),rgba(10,20,27,0.96)_58%,rgba(18,35,44,0.98))] px-5 py-6 shadow-panel ring-1 ring-white/5 sm:px-6 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-tide-100">
                Deck compare
              </p>
              <h1 className="mt-3 font-display text-3xl leading-[1.06] tracking-tight text-ink-50 sm:text-4xl">
                {leftDraft && rightDraft
                  ? `${leftDraft.name} vs ${rightDraft.name}`
                  : 'Loading comparison'}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void copyCompareLink()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-ink-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Copy className="h-4 w-4" />
              Copy compare link
            </button>
          </div>
        </section>

        {statusMessage ? (
          <p className="rounded-[1.3rem] border border-tide-400/20 bg-tide-500/10 px-4 py-3 text-sm text-tide-100">
            {statusMessage}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-ink-300">Loading comparison...</p>
          </section>
        ) : error ? (
          <section className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-5">
            <p className="text-sm text-rose-100">{error}</p>
          </section>
        ) : leftDraft && rightDraft && leftStats && rightStats && comparisonSummary ? (
          <>
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-5 shadow-panel ring-1 ring-white/5">
                <h2 className="mb-4 text-xl font-semibold text-ink-50">{leftDraft.name}</h2>
                <DeckStats stats={leftStats} />
              </section>
              <section className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,33,41,0.96),rgba(11,24,31,0.99))] p-5 shadow-panel ring-1 ring-white/5">
                <h2 className="mb-4 text-xl font-semibold text-ink-50">{rightDraft.name}</h2>
                <DeckStats stats={rightStats} />
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <DiffSection
                title="Mainboard quantity changes"
                entries={comparisonSummary.mainboard.quantityChanged}
                emptyLabel="No overlapping mainboard cards changed quantity."
              />
              <DiffSection
                title={`Only in ${leftDraft.name}`}
                entries={comparisonSummary.mainboard.onlyInLeft}
                emptyLabel="Every mainboard card also exists in the right deck."
              />
              <DiffSection
                title={`Only in ${rightDraft.name}`}
                entries={comparisonSummary.mainboard.onlyInRight}
                emptyLabel="Every mainboard card also exists in the left deck."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <DeckReadOnlyList
                title={`${leftDraft.name} mainboard`}
                entries={leftDraft.mainboard}
                emptyDescription="No mainboard cards were resolved."
              />
              <DeckReadOnlyList
                title={`${rightDraft.name} mainboard`}
                entries={rightDraft.mainboard}
                emptyDescription="No mainboard cards were resolved."
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
