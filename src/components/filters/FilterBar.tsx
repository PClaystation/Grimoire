import type { ChangeEvent, FormEvent } from 'react'
import { RefreshCw, Search, Sparkles } from 'lucide-react'

import {
  COLOR_FILTER_OPTIONS,
  DECK_FORMAT_OPTIONS,
  MANA_VALUE_OPTIONS,
  RARITY_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
} from '@/constants/mtg'
import { SectionPanel } from '@/components/ui/SectionPanel'
import type { CardSearchFilters, CardSetOption } from '@/types/filters'

interface FilterBarProps {
  filters: CardSearchFilters
  sets: CardSetOption[]
  setsError: string | null
  isSearching: boolean
  areSetsLoading: boolean
  onFiltersChange: (filters: CardSearchFilters) => void
  onApply: () => void
  onReset: () => void
}

export function FilterBar({
  filters,
  sets,
  setsError,
  isSearching,
  areSetsLoading,
  onFiltersChange,
  onApply,
  onReset,
}: FilterBarProps) {
  function updateFilter<Key extends keyof CardSearchFilters>(
    key: Key,
    value: CardSearchFilters[Key],
  ) {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply()
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    updateFilter('query', event.target.value)
  }

  return (
    <SectionPanel
      title="Search Cards"
      subtitle="Search Scryfall by name, rules text, subtype tags, format, color, type, mana value, rarity, and set."
      actions={
        <div className="inline-flex items-center gap-2 rounded-full border border-ember-400/25 bg-ember-500/10 px-3 py-1 text-xs font-medium text-ember-100">
          <Sparkles className="h-3.5 w-3.5" />
          Real card images
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <label className="space-y-2 md:col-span-2 xl:col-span-2">
            <span className="text-sm font-medium text-ink-200">Card name or advanced query</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 focus-within:border-tide-400 focus-within:ring-2 focus-within:ring-tide-400/30">
              <Search className="h-4 w-4 text-ink-400" />
              <input
                type="text"
                value={filters.query}
                onChange={handleSearchChange}
                placeholder="Try Llanowar Elves, removal, or legendary dragon"
                className="w-full border-none bg-transparent text-sm text-ink-50 outline-none placeholder:text-ink-400"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Subtype or tag</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 focus-within:border-tide-400 focus-within:ring-2 focus-within:ring-tide-400/30">
              <Sparkles className="h-4 w-4 text-ink-400" />
              <input
                type="text"
                value={filters.subtype}
                onChange={(event) => updateFilter('subtype', event.target.value)}
                placeholder="Wizard, Aura, Equipment"
                className="w-full border-none bg-transparent text-sm text-ink-50 outline-none placeholder:text-ink-400"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Format</span>
            <select
              value={filters.format}
              onChange={(event) => updateFilter('format', event.target.value as CardSearchFilters['format'])}
              className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
            >
              {DECK_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Color</span>
            <select
              value={filters.color}
              onChange={(event) => updateFilter('color', event.target.value as CardSearchFilters['color'])}
              className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
            >
              {COLOR_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Type</span>
            <select
              value={filters.type}
              onChange={(event) => updateFilter('type', event.target.value as CardSearchFilters['type'])}
              className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
            >
              {TYPE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Mana value</span>
            <select
              value={filters.manaValue}
              onChange={(event) =>
                updateFilter('manaValue', event.target.value as CardSearchFilters['manaValue'])
              }
              className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
            >
              {MANA_VALUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Rarity</span>
            <select
              value={filters.rarity}
              onChange={(event) =>
                updateFilter('rarity', event.target.value as CardSearchFilters['rarity'])
              }
              className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
            >
              {RARITY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Set</span>
            <select
              value={filters.setCode}
              onChange={(event) => updateFilter('setCode', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
            >
              <option value="ANY">{areSetsLoading ? 'Loading sets...' : 'Any set'}</option>
              {sets.map((set) => (
                <option key={set.code} value={set.code}>
                  {set.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/55 px-4 py-3 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={filters.legalityOnly}
              onChange={(event) => updateFilter('legalityOnly', event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-ink-900 text-tide-500 focus:ring-tide-400/30"
            />
            Legal in selected format only
          </label>

          <div className="flex flex-wrap items-center gap-3">
            {setsError ? (
              <p className="text-sm text-ember-300">{setsError}</p>
            ) : (
              <p className="max-w-2xl text-sm leading-6 text-ink-400">
                Set data and images are loaded live from Scryfall.
              </p>
            )}

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>

            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex items-center gap-2 rounded-2xl bg-tide-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-tide-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Searching...' : 'Search Cards'}
            </button>
          </div>
        </div>
      </form>
    </SectionPanel>
  )
}
