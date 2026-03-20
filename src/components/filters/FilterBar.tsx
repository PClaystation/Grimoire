import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ChevronDown, RefreshCw, Search, SlidersHorizontal, Sparkles } from 'lucide-react'

import {
  COLOR_COUNT_OPTIONS,
  COLOR_FILTER_OPTIONS,
  COLOR_IDENTITY_FILTER_OPTIONS,
  DECK_FORMAT_OPTIONS,
  LAYOUT_FILTER_OPTIONS,
  MANA_PRODUCED_OPTIONS,
  MANA_VALUE_OPTIONS,
  RARITY_FILTER_OPTIONS,
  SET_TYPE_FILTER_OPTIONS,
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

function hasValue(value: string) {
  return value.trim().length > 0
}

function hasAdvancedFilters(filters: CardSearchFilters) {
  return (
    hasValue(filters.exactName) ||
    hasValue(filters.subtype) ||
    hasValue(filters.oracleText) ||
    hasValue(filters.flavorText) ||
    hasValue(filters.keyword) ||
    hasValue(filters.artist) ||
    hasValue(filters.collectorNumber) ||
    filters.color !== 'ANY' ||
    filters.colorIdentity !== 'ANY' ||
    filters.colorCount !== 'ANY' ||
    filters.type !== 'ANY' ||
    filters.manaValue !== 'ANY' ||
    filters.rarity !== 'ANY' ||
    filters.setCode !== 'ANY' ||
    hasValue(filters.manaValueMin) ||
    hasValue(filters.manaValueMax) ||
    filters.setType !== 'ANY' ||
    filters.layout !== 'ANY' ||
    filters.manaProduced !== 'ANY' ||
    hasValue(filters.releaseYearStart) ||
    hasValue(filters.releaseYearEnd) ||
    hasValue(filters.priceUsdMin) ||
    hasValue(filters.priceUsdMax) ||
    hasValue(filters.powerMin) ||
    hasValue(filters.powerMax) ||
    hasValue(filters.toughnessMin) ||
    hasValue(filters.toughnessMax) ||
    hasValue(filters.loyaltyMin) ||
    hasValue(filters.loyaltyMax) ||
    filters.legendaryOnly ||
    filters.basicOnly ||
    filters.fullArtOnly ||
    filters.borderlessOnly ||
    filters.showcaseOnly ||
    filters.retroFrameOnly
  )
}

function RangeField({
  label,
  minValue,
  maxValue,
  minPlaceholder,
  maxPlaceholder,
  minStep = '1',
  maxStep = '1',
  onMinChange,
  onMaxChange,
}: {
  label: string
  minValue: string
  maxValue: string
  minPlaceholder: string
  maxPlaceholder: string
  minStep?: string
  maxStep?: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-ink-200">{label}</span>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          inputMode="numeric"
          step={minStep}
          value={minValue}
          onChange={(event) => onMinChange(event.target.value)}
          placeholder={minPlaceholder}
          className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
        />
        <input
          type="number"
          inputMode="numeric"
          step={maxStep}
          value={maxValue}
          onChange={(event) => onMaxChange(event.target.value)}
          placeholder={maxPlaceholder}
          className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
        />
      </div>
    </label>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-ink-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-ink-900 text-tide-500 focus:ring-tide-400/30"
      />
      {label}
    </label>
  )
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(hasAdvancedFilters(filters))
  const advancedFiltersApplied = hasAdvancedFilters(filters)

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
      subtitle="Start with a fast Scryfall query, then open advanced filters only when you need to narrow the pool further."
      actions={
        <div className="inline-flex items-center gap-2 rounded-full border border-ember-400/25 bg-ember-500/10 px-3 py-1 text-xs font-medium text-ember-100">
          <Sparkles className="h-3.5 w-3.5" />
          Real card images
        </div>
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.8fr)_minmax(12rem,0.8fr)]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-200">Card name or advanced query</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 focus-within:border-tide-400 focus-within:ring-2 focus-within:ring-tide-400/30">
              <Search className="h-4 w-4 text-ink-400" />
              <input
                type="text"
                value={filters.query}
                onChange={handleSearchChange}
                placeholder='Try Llanowar Elves, removal, or o:"draw a card"'
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

        <div className="rounded-[1.6rem] border border-white/10 bg-ink-900/55 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink-100">Advanced Search</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-400">
                Use this when you need exact text, subtype tags, color, set filters, prices,
                release windows, and print treatments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAdvancedOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm font-medium text-ink-200 transition hover:border-white/20 hover:bg-ink-700"
              aria-expanded={isAdvancedOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {isAdvancedOpen ? 'Hide filters' : advancedFiltersApplied ? 'Show active filters' : 'More filters'}
              <ChevronDown
                className={`h-4 w-4 transition ${isAdvancedOpen ? 'rotate-180' : ''}`.trim()}
              />
            </button>
          </div>

          {isAdvancedOpen ? (
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Text Match
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Exact name</span>
                    <input
                      type="text"
                      value={filters.exactName}
                      onChange={(event) => updateFilter('exactName', event.target.value)}
                      placeholder="Lightning Bolt"
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    />
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
                    <span className="text-sm font-medium text-ink-200">Rules text</span>
                    <input
                      type="text"
                      value={filters.oracleText}
                      onChange={(event) => updateFilter('oracleText', event.target.value)}
                      placeholder="draw a card"
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Keyword ability</span>
                    <input
                      type="text"
                      value={filters.keyword}
                      onChange={(event) => updateFilter('keyword', event.target.value)}
                      placeholder="flying, flash"
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Flavor text</span>
                    <input
                      type="text"
                      value={filters.flavorText}
                      onChange={(event) => updateFilter('flavorText', event.target.value)}
                      placeholder="ancient dragon"
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Artist</span>
                    <input
                      type="text"
                      value={filters.artist}
                      onChange={(event) => updateFilter('artist', event.target.value)}
                      placeholder="Seb McKinnon"
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Collector number</span>
                    <input
                      type="text"
                      value={filters.collectorNumber}
                      onChange={(event) => updateFilter('collectorNumber', event.target.value)}
                      placeholder="123"
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Card Attributes
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Card color</span>
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
                    <span className="text-sm font-medium text-ink-200">Color identity</span>
                    <select
                      value={filters.colorIdentity}
                      onChange={(event) =>
                        updateFilter('colorIdentity', event.target.value as CardSearchFilters['colorIdentity'])
                      }
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    >
                      {COLOR_IDENTITY_FILTER_OPTIONS.map((option) => (
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

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Color count</span>
                    <select
                      value={filters.colorCount}
                      onChange={(event) =>
                        updateFilter('colorCount', event.target.value as CardSearchFilters['colorCount'])
                      }
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    >
                      {COLOR_COUNT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Mana produced</span>
                    <select
                      value={filters.manaProduced}
                      onChange={(event) =>
                        updateFilter('manaProduced', event.target.value as CardSearchFilters['manaProduced'])
                      }
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    >
                      {MANA_PRODUCED_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Release line</span>
                    <select
                      value={filters.setType}
                      onChange={(event) =>
                        updateFilter('setType', event.target.value as CardSearchFilters['setType'])
                      }
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    >
                      {SET_TYPE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-ink-200">Layout</span>
                    <select
                      value={filters.layout}
                      onChange={(event) =>
                        updateFilter('layout', event.target.value as CardSearchFilters['layout'])
                      }
                      className="w-full rounded-2xl border border-white/10 bg-ink-800/80 px-4 py-3 text-sm text-ink-50 outline-none transition focus:border-tide-400 focus:ring-2 focus:ring-tide-400/30"
                    >
                      {LAYOUT_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <RangeField
                    label="Mana value range"
                    minValue={filters.manaValueMin}
                    maxValue={filters.manaValueMax}
                    minPlaceholder="Min"
                    maxPlaceholder="Max"
                    onMinChange={(value) => updateFilter('manaValueMin', value)}
                    onMaxChange={(value) => updateFilter('manaValueMax', value)}
                  />

                  <RangeField
                    label="Release year"
                    minValue={filters.releaseYearStart}
                    maxValue={filters.releaseYearEnd}
                    minPlaceholder="From"
                    maxPlaceholder="To"
                    onMinChange={(value) => updateFilter('releaseYearStart', value)}
                    onMaxChange={(value) => updateFilter('releaseYearEnd', value)}
                  />

                  <RangeField
                    label="USD price"
                    minValue={filters.priceUsdMin}
                    maxValue={filters.priceUsdMax}
                    minPlaceholder="Min"
                    maxPlaceholder="Max"
                    minStep="0.01"
                    maxStep="0.01"
                    onMinChange={(value) => updateFilter('priceUsdMin', value)}
                    onMaxChange={(value) => updateFilter('priceUsdMax', value)}
                  />

                  <RangeField
                    label="Power"
                    minValue={filters.powerMin}
                    maxValue={filters.powerMax}
                    minPlaceholder="Min"
                    maxPlaceholder="Max"
                    onMinChange={(value) => updateFilter('powerMin', value)}
                    onMaxChange={(value) => updateFilter('powerMax', value)}
                  />

                  <RangeField
                    label="Toughness"
                    minValue={filters.toughnessMin}
                    maxValue={filters.toughnessMax}
                    minPlaceholder="Min"
                    maxPlaceholder="Max"
                    onMinChange={(value) => updateFilter('toughnessMin', value)}
                    onMaxChange={(value) => updateFilter('toughnessMax', value)}
                  />

                  <RangeField
                    label="Loyalty"
                    minValue={filters.loyaltyMin}
                    maxValue={filters.loyaltyMax}
                    minPlaceholder="Min"
                    maxPlaceholder="Max"
                    onMinChange={(value) => updateFilter('loyaltyMin', value)}
                    onMaxChange={(value) => updateFilter('loyaltyMax', value)}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Card Traits
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <ToggleField
                    label="Legendary only"
                    checked={filters.legendaryOnly}
                    onChange={(value) => updateFilter('legendaryOnly', value)}
                  />
                  <ToggleField
                    label="Basic only"
                    checked={filters.basicOnly}
                    onChange={(value) => updateFilter('basicOnly', value)}
                  />
                  <ToggleField
                    label="Full art only"
                    checked={filters.fullArtOnly}
                    onChange={(value) => updateFilter('fullArtOnly', value)}
                  />
                  <ToggleField
                    label="Borderless only"
                    checked={filters.borderlessOnly}
                    onChange={(value) => updateFilter('borderlessOnly', value)}
                  />
                  <ToggleField
                    label="Showcase only"
                    checked={filters.showcaseOnly}
                    onChange={(value) => updateFilter('showcaseOnly', value)}
                  />
                  <ToggleField
                    label="Retro frame only"
                    checked={filters.retroFrameOnly}
                    onChange={(value) => updateFilter('retroFrameOnly', value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {setsError ? (
              <p className="text-sm text-ember-300">{setsError}</p>
            ) : (
              <p className="max-w-2xl text-sm leading-6 text-ink-400">
                Set data and images are loaded live from Scryfall.
              </p>
            )}
          </div>
        </div>
      </form>
    </SectionPanel>
  )
}
