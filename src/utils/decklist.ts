import type { DeckCardEntry, DeckDraft, DeckFormat, DeckSection, SavedDeck } from '@/types/deck'

export interface PortableDeckEntry {
  quantity: number
  name: string
  setCode?: string
}

export interface PortableDeckPayload {
  version: 1
  name: string
  format: DeckFormat
  notes: string
  matchupNotes: string
  budgetTargetUsd: number | null
  mainboard: PortableDeckEntry[]
  sideboard: PortableDeckEntry[]
}

function formatSection(title: string, entries: DeckCardEntry[]): string[] {
  if (entries.length === 0) {
    return []
  }

  return [title, ...entries.map((entry) => `${entry.quantity} ${entry.card.name}`)]
}

function toPortableEntries(entries: DeckCardEntry[]): PortableDeckEntry[] {
  return entries.map((entry) => ({
    quantity: entry.quantity,
    name: entry.card.name,
    setCode: entry.card.setCode,
  }))
}

export function buildDecklistText(
  deckName: string,
  format: DeckFormat,
  mainboard: DeckCardEntry[],
  sideboard: DeckCardEntry[],
  notes?: string,
  matchupNotes?: string,
): string {
  const lines = [`# ${deckName.trim() || 'Untitled Deck'}`, `# Format: ${format}`]
  const mainboardLines = formatSection('Deck', mainboard)
  const sideboardLines = formatSection('Sideboard', sideboard)

  if (mainboardLines.length > 0) {
    lines.push('', ...mainboardLines)
  }

  if (sideboardLines.length > 0) {
    lines.push('', ...sideboardLines)
  }

  if (notes?.trim()) {
    lines.push('', 'Notes', notes.trim())
  }

  if (matchupNotes?.trim()) {
    lines.push('', 'Matchups', matchupNotes.trim())
  }

  return lines.join('\n')
}

export function buildPortableDeckPayload(deck: DeckDraft | SavedDeck): PortableDeckPayload {
  return {
    version: 1,
    name: deck.name.trim() || 'Untitled Deck',
    format: deck.format,
    notes: deck.notes,
    matchupNotes: deck.matchupNotes,
    budgetTargetUsd: deck.budgetTargetUsd,
    mainboard: toPortableEntries(deck.mainboard),
    sideboard: toPortableEntries(deck.sideboard),
  }
}

export function buildDeckExportJson(deck: DeckDraft | SavedDeck): string {
  return JSON.stringify(buildPortableDeckPayload(deck), null, 2)
}

export function buildPortableDeckSection(
  entries: PortableDeckEntry[],
  section: DeckSection,
): Array<PortableDeckEntry & { section: DeckSection }> {
  return entries.map((entry) => ({
    ...entry,
    section,
  }))
}
