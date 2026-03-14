export type CardColor = 'W' | 'U' | 'B' | 'R' | 'G'

export interface ScryfallImageUris {
  small?: string
  normal?: string
  large?: string
  png?: string
  art_crop?: string
  border_crop?: string
}

export interface ScryfallCardFace {
  name: string
  mana_cost?: string
  type_line: string
  oracle_text?: string
  colors?: CardColor[]
  image_uris?: ScryfallImageUris
}

export type ScryfallLegalities = Record<string, string>

export interface ScryfallPrices {
  usd: string | null
  usd_foil: string | null
  eur: string | null
  eur_foil: string | null
  tix: string | null
}

export interface ScryfallCard {
  id: string
  oracle_id?: string
  name: string
  released_at: string
  mana_cost?: string
  cmc: number
  type_line: string
  oracle_text?: string
  colors?: CardColor[]
  color_identity: CardColor[]
  set: string
  set_name: string
  collector_number: string
  rarity: string
  legalities: ScryfallLegalities
  prices: ScryfallPrices
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
}

export interface ScryfallCardsResponse {
  object: 'list'
  total_cards: number
  has_more: boolean
  data: ScryfallCard[]
}

export interface ScryfallSet {
  id: string
  code: string
  name: string
  set_type: string
  released_at?: string
  card_count: number
  digital: boolean
}

export interface ScryfallSetsResponse {
  object: 'list'
  has_more: boolean
  data: ScryfallSet[]
}

export interface MagicCard {
  id: string
  oracleId: string | null
  name: string
  manaCost: string
  manaValue: number
  releasedAt: string
  typeLine: string
  oracleText: string
  colors: CardColor[]
  colorIdentity: CardColor[]
  setCode: string
  setName: string
  collectorNumber: string
  rarity: string
  legalities: ScryfallLegalities
  imageUrl: string
  largeImageUrl: string
  prices: {
    usd: number | null
    usdFoil: number | null
    eur: number | null
    eurFoil: number | null
    tix: number | null
  }
}

export interface CardSearchResult {
  cards: MagicCard[]
  totalCards: number
  hasMore: boolean
}
