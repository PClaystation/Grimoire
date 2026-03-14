import type {
  CardColorFilter,
  CardSearchFilters,
  CardSortOption,
  CardTypeFilter,
  ManaValueFilterOption,
} from '@/types/filters'
import type { DeckTypeStatKey } from '@/types/deck'

export const DEFAULT_FILTERS: CardSearchFilters = {
  query: '',
  standardOnly: true,
  color: 'ANY',
  type: 'ANY',
  manaValue: 'ANY',
  setCode: 'ANY',
}

export const COLOR_FILTER_OPTIONS: Array<{
  value: CardColorFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any color' },
  { value: 'W', label: 'White' },
  { value: 'U', label: 'Blue' },
  { value: 'B', label: 'Black' },
  { value: 'R', label: 'Red' },
  { value: 'G', label: 'Green' },
  { value: 'MULTI', label: 'Multicolor' },
  { value: 'COLORLESS', label: 'Colorless' },
]

export const TYPE_FILTER_OPTIONS: Array<{
  value: CardTypeFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any type' },
  { value: 'Creature', label: 'Creature' },
  { value: 'Instant', label: 'Instant' },
  { value: 'Sorcery', label: 'Sorcery' },
  { value: 'Artifact', label: 'Artifact' },
  { value: 'Enchantment', label: 'Enchantment' },
  { value: 'Planeswalker', label: 'Planeswalker' },
  { value: 'Land', label: 'Land' },
  { value: 'Battle', label: 'Battle' },
]

export const MANA_VALUE_OPTIONS: Array<{
  value: ManaValueFilterOption
  label: string
}> = [
  { value: 'ANY', label: 'Any mana value' },
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7+', label: '7+' },
]

export const CARD_SORT_OPTIONS: Array<{
  value: CardSortOption
  label: string
}> = [
  { value: 'RELEVANCE', label: 'Best match' },
  { value: 'NAME', label: 'Name A-Z' },
  { value: 'MANA_VALUE', label: 'Mana value' },
  { value: 'PRICE_HIGH', label: 'Price high-low' },
  { value: 'NEWEST', label: 'Newest print' },
]

export const COLOR_LABELS: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
}

export const COLOR_SWATCHES: Record<string, string> = {
  W: 'bg-amber-100 text-amber-900 ring-amber-200',
  U: 'bg-sky-100 text-sky-900 ring-sky-200',
  B: 'bg-slate-200 text-slate-900 ring-slate-300',
  R: 'bg-rose-100 text-rose-900 ring-rose-200',
  G: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  C: 'bg-stone-100 text-stone-900 ring-stone-200',
}

export const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'] as const

export const DECK_TYPE_BUCKETS: DeckTypeStatKey[] = [
  'Creature',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Planeswalker',
  'Land',
  'Battle',
  'Other',
]

export const MANA_CURVE_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7+']
