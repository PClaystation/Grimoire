import type { DeckCardEntry } from '@/types/deck'

function formatSection(title: string, entries: DeckCardEntry[]): string[] {
  if (entries.length === 0) {
    return []
  }

  return [title, ...entries.map((entry) => `${entry.quantity} ${entry.card.name}`)]
}

export function buildDecklistText(
  deckName: string,
  mainboard: DeckCardEntry[],
  sideboard: DeckCardEntry[],
): string {
  const lines = [`# ${deckName.trim() || 'Untitled Deck'}`]
  const mainboardLines = formatSection('Deck', mainboard)
  const sideboardLines = formatSection('Sideboard', sideboard)

  if (mainboardLines.length > 0) {
    lines.push('', ...mainboardLines)
  }

  if (sideboardLines.length > 0) {
    lines.push('', ...sideboardLines)
  }

  return lines.join('\n')
}
