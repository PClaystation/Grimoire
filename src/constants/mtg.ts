import type {
  CardColorFilter,
  CardColorCountFilter,
  CardLayoutFilter,
  CardRarityFilter,
  CardSearchFilters,
  CardSetTypeFilter,
  CardSortOption,
  CardTypeFilter,
  ManaProducedFilter,
  ManaValueFilterOption,
} from '@/types/filters'
import type { DeckFormat, DeckTypeStatKey } from '@/types/deck'

export const DEFAULT_FILTERS: CardSearchFilters = {
  query: '',
  exactName: '',
  subtype: '',
  oracleText: '',
  flavorText: '',
  keyword: '',
  artist: '',
  collectorNumber: '',
  format: 'standard',
  legalityOnly: true,
  color: 'ANY',
  colorIdentity: 'ANY',
  colorCount: 'ANY',
  type: 'ANY',
  manaValue: 'ANY',
  manaValueMin: '',
  manaValueMax: '',
  rarity: 'ANY',
  setCode: 'ANY',
  setType: 'ANY',
  layout: 'ANY',
  manaProduced: 'ANY',
  releaseYearStart: '',
  releaseYearEnd: '',
  priceUsdMin: '',
  priceUsdMax: '',
  powerMin: '',
  powerMax: '',
  toughnessMin: '',
  toughnessMax: '',
  loyaltyMin: '',
  loyaltyMax: '',
  legendaryOnly: false,
  basicOnly: false,
  fullArtOnly: false,
  borderlessOnly: false,
  showcaseOnly: false,
  retroFrameOnly: false,
}

export const DECK_FORMAT_OPTIONS: Array<{
  value: DeckFormat
  label: string
  description: string
}> = [
  { value: 'standard', label: 'Standard', description: 'Current rotating premier format' },
  { value: 'pioneer', label: 'Pioneer', description: 'Return to Ravnica forward' },
  { value: 'modern', label: 'Modern', description: 'Eighth Edition forward' },
  { value: 'legacy', label: 'Legacy', description: 'High-power eternal format' },
  { value: 'vintage', label: 'Vintage', description: 'Restricted list eternal format' },
  { value: 'pauper', label: 'Pauper', description: 'Commons-only card pool' },
  { value: 'commander', label: 'Commander', description: 'Singleton 100-card decks' },
]

export const DECK_FORMAT_CONFIG: Record<
  DeckFormat,
  {
    label: string
    legalityKey: DeckFormat
    minMainboard: number
    recommendedMainboard: number
    sideboardMax: number
    copyLimit: number
    requiresSingleton: boolean
  }
> = {
  standard: {
    label: 'Standard',
    legalityKey: 'standard',
    minMainboard: 60,
    recommendedMainboard: 60,
    sideboardMax: 15,
    copyLimit: 4,
    requiresSingleton: false,
  },
  pioneer: {
    label: 'Pioneer',
    legalityKey: 'pioneer',
    minMainboard: 60,
    recommendedMainboard: 60,
    sideboardMax: 15,
    copyLimit: 4,
    requiresSingleton: false,
  },
  modern: {
    label: 'Modern',
    legalityKey: 'modern',
    minMainboard: 60,
    recommendedMainboard: 60,
    sideboardMax: 15,
    copyLimit: 4,
    requiresSingleton: false,
  },
  legacy: {
    label: 'Legacy',
    legalityKey: 'legacy',
    minMainboard: 60,
    recommendedMainboard: 60,
    sideboardMax: 15,
    copyLimit: 4,
    requiresSingleton: false,
  },
  vintage: {
    label: 'Vintage',
    legalityKey: 'vintage',
    minMainboard: 60,
    recommendedMainboard: 60,
    sideboardMax: 15,
    copyLimit: 4,
    requiresSingleton: false,
  },
  pauper: {
    label: 'Pauper',
    legalityKey: 'pauper',
    minMainboard: 60,
    recommendedMainboard: 60,
    sideboardMax: 15,
    copyLimit: 4,
    requiresSingleton: false,
  },
  commander: {
    label: 'Commander',
    legalityKey: 'commander',
    minMainboard: 100,
    recommendedMainboard: 100,
    sideboardMax: 0,
    copyLimit: 1,
    requiresSingleton: true,
  },
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

export const COLOR_IDENTITY_FILTER_OPTIONS: Array<{
  value: CardColorFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any identity' },
  { value: 'W', label: 'White identity' },
  { value: 'U', label: 'Blue identity' },
  { value: 'B', label: 'Black identity' },
  { value: 'R', label: 'Red identity' },
  { value: 'G', label: 'Green identity' },
  { value: 'MULTI', label: 'Multicolor identity' },
  { value: 'COLORLESS', label: 'Colorless identity' },
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

export const COLOR_COUNT_OPTIONS: Array<{
  value: CardColorCountFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any color count' },
  { value: '0', label: '0 colors' },
  { value: '1', label: '1 color' },
  { value: '2', label: '2 colors' },
  { value: '3', label: '3 colors' },
  { value: '4', label: '4 colors' },
  { value: '5', label: '5 colors' },
]

export const RARITY_FILTER_OPTIONS: Array<{
  value: CardRarityFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any rarity' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic' },
]

export const SET_TYPE_FILTER_OPTIONS: Array<{
  value: CardSetTypeFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any release line' },
  { value: 'core', label: 'Core set' },
  { value: 'expansion', label: 'Expansion set' },
  { value: 'masters', label: 'Masters set' },
  { value: 'commander', label: 'Commander release' },
  { value: 'draft_innovation', label: 'Draft innovation' },
]

export const LAYOUT_FILTER_OPTIONS: Array<{
  value: CardLayoutFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any layout' },
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'MODAL_DFC', label: 'Modal DFC' },
  { value: 'SPLIT', label: 'Split card' },
  { value: 'TRANSFORM', label: 'Transform card' },
]

export const MANA_PRODUCED_OPTIONS: Array<{
  value: ManaProducedFilter
  label: string
}> = [
  { value: 'ANY', label: 'Any mana output' },
  { value: 'W', label: 'Produces white' },
  { value: 'U', label: 'Produces blue' },
  { value: 'B', label: 'Produces black' },
  { value: 'R', label: 'Produces red' },
  { value: 'G', label: 'Produces green' },
  { value: 'C', label: 'Produces colorless' },
]

export const CARD_SORT_OPTIONS: Array<{
  value: CardSortOption
  label: string
}> = [
  { value: 'RELEVANCE', label: 'Best match' },
  { value: 'NAME', label: 'Name A-Z' },
  { value: 'MANA_VALUE', label: 'Mana value' },
  { value: 'PRICE_LOW', label: 'Price low-high' },
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
