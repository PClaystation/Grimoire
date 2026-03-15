import type { DeckCardEntry, DeckDraft, DeckFormat, DeckSection } from '@/types/deck'
import type { DeckImportIdentifier, MagicCard } from '@/types/scryfall'
import type { PortableDeckEntry } from '@/utils/decklist'
import { buildPortableDeckSection, isPortableDeckPayload } from '@/utils/decklist'

interface ParsedDeckEntry extends PortableDeckEntry {
  section: DeckSection
}

export interface ParsedDeckImport {
  name: string
  format: DeckFormat | null
  notes: string
  matchupNotes: string
  budgetTargetUsd: number | null
  entries: ParsedDeckEntry[]
  warnings: string[]
}

export interface ImportedDeckResult {
  deck: DeckDraft
  missingCards: string[]
  warnings: string[]
}

function parseFormatValue(value: string): DeckFormat | null {
  switch (value.trim().toLowerCase()) {
    case 'standard':
      return 'standard'
    case 'pioneer':
      return 'pioneer'
    case 'modern':
      return 'modern'
    case 'legacy':
      return 'legacy'
    case 'vintage':
      return 'vintage'
    case 'pauper':
      return 'pauper'
    case 'commander':
      return 'commander'
    default:
      return null
  }
}

function extractCardNameParts(rawValue: string): { name: string; setCode?: string } {
  const arenaMatch = rawValue.match(/^(?<name>.+?)\s+\((?<set>[A-Za-z0-9]{2,6})\)\s+\d+[A-Za-z]*$/)

  if (arenaMatch?.groups?.name) {
    return {
      name: arenaMatch.groups.name.trim(),
      setCode: arenaMatch.groups.set.toLowerCase(),
    }
  }

  return {
    name: rawValue.trim(),
  }
}

function parseJsonDeckImport(input: string): ParsedDeckImport | null {
  try {
    const parsedValue = JSON.parse(input) as unknown

    if (!isPortableDeckPayload(parsedValue)) {
      return null
    }

    return {
      name: parsedValue.name,
      format: parseFormatValue(parsedValue.format),
      notes: typeof parsedValue.notes === 'string' ? parsedValue.notes : '',
      matchupNotes:
        typeof parsedValue.matchupNotes === 'string' ? parsedValue.matchupNotes : '',
      budgetTargetUsd:
        typeof parsedValue.budgetTargetUsd === 'number' ? parsedValue.budgetTargetUsd : null,
      entries: [
        ...buildPortableDeckSection(parsedValue.mainboard, 'mainboard'),
        ...buildPortableDeckSection(parsedValue.sideboard, 'sideboard'),
      ],
      warnings: [],
    }
  } catch {
    return null
  }
}

export function parseDeckImport(input: string): ParsedDeckImport {
  const jsonImport = parseJsonDeckImport(input)

  if (jsonImport) {
    return jsonImport
  }

  const lines = input.split(/\r?\n/)
  let name = 'Imported Deck'
  let format: DeckFormat | null = null
  let section: DeckSection = 'mainboard'
  let activeNotesSection: 'notes' | 'matchups' | null = null
  const notesLines: string[] = []
  const matchupLines: string[] = []
  const entries: ParsedDeckEntry[] = []
  const warnings: string[] = []

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim()

    if (!trimmedLine) {
      if (activeNotesSection === 'notes') {
        notesLines.push('')
      }

      if (activeNotesSection === 'matchups') {
        matchupLines.push('')
      }

      continue
    }

    const formatMatch = trimmedLine.match(/^#?\s*format\s*:\s*(.+)$/i)
    if (formatMatch) {
      format = parseFormatValue(formatMatch[1]) ?? format
      continue
    }

    const nameMatch = trimmedLine.match(/^#\s+(.+)$/)
    if (nameMatch && name === 'Imported Deck') {
      name = nameMatch[1].trim()
      continue
    }

    if (/^(deck|mainboard)\s*:?\s*$/i.test(trimmedLine)) {
      section = 'mainboard'
      activeNotesSection = null
      continue
    }

    if (/^(sideboard|sb)\s*:?\s*$/i.test(trimmedLine)) {
      section = 'sideboard'
      activeNotesSection = null
      continue
    }

    if (/^notes\s*:?\s*$/i.test(trimmedLine)) {
      activeNotesSection = 'notes'
      continue
    }

    if (/^(matchups|matchup notes)\s*:?\s*$/i.test(trimmedLine)) {
      activeNotesSection = 'matchups'
      continue
    }

    if (activeNotesSection === 'notes') {
      notesLines.push(rawLine)
      continue
    }

    if (activeNotesSection === 'matchups') {
      matchupLines.push(rawLine)
      continue
    }

    const sideboardEntry = trimmedLine.match(/^sb:\s*(.+)$/i)
    const lineToParse = sideboardEntry ? sideboardEntry[1] : trimmedLine
    const targetSection = sideboardEntry ? 'sideboard' : section
    const quantityMatch = lineToParse.match(/^(?<quantity>\d+)\s*[xX]?\s+(?<card>.+)$/)

    if (!quantityMatch?.groups?.card) {
      warnings.push(`Skipped "${trimmedLine}" because it does not match a decklist line.`)
      continue
    }

    const quantity = Number.parseInt(quantityMatch.groups.quantity, 10)

    if (!Number.isInteger(quantity) || quantity <= 0) {
      warnings.push(`Skipped "${trimmedLine}" because quantity must be at least 1.`)
      continue
    }

    const { name: cardName, setCode } = extractCardNameParts(quantityMatch.groups.card)

    entries.push({
      quantity,
      name: cardName,
      setCode,
      section: targetSection,
    })
  }

  return {
    name,
    format,
    notes: notesLines.join('\n').trim(),
    matchupNotes: matchupLines.join('\n').trim(),
    budgetTargetUsd: null,
    entries,
    warnings,
  }
}

function addResolvedCard(
  targetEntries: DeckCardEntry[],
  card: MagicCard,
  quantity: number,
) {
  const existingEntry = targetEntries.find((entry) => entry.card.id === card.id)

  if (existingEntry) {
    existingEntry.quantity += quantity
    return
  }

  targetEntries.push({
    card,
    quantity,
  })
}

export function buildImportedDeck(
  parsedImport: ParsedDeckImport,
  resolvedCards: Map<string, MagicCard>,
  fallbackFormat: DeckFormat,
): ImportedDeckResult {
  const mainboard: DeckCardEntry[] = []
  const sideboard: DeckCardEntry[] = []
  const missingCards: string[] = []

  for (const entry of parsedImport.entries) {
    const card =
      (entry.setCode
        ? resolvedCards.get(`${entry.name.toLowerCase()}|${entry.setCode.toLowerCase()}`)
        : null) ?? resolvedCards.get(entry.name.toLowerCase())

    if (!card) {
      missingCards.push(entry.setCode ? `${entry.name} (${entry.setCode})` : entry.name)
      continue
    }

    addResolvedCard(entry.section === 'mainboard' ? mainboard : sideboard, card, entry.quantity)
  }

  return {
    deck: {
      id: null,
      name: parsedImport.name.trim() || 'Imported Deck',
      format: parsedImport.format ?? fallbackFormat,
      mainboard,
      sideboard,
      notes: parsedImport.notes,
      matchupNotes: parsedImport.matchupNotes,
      budgetTargetUsd: parsedImport.budgetTargetUsd,
      createdAt: null,
    },
    missingCards,
    warnings: parsedImport.warnings,
  }
}

export function getDeckImportIdentifiers(parsedImport: ParsedDeckImport): DeckImportIdentifier[] {
  const uniqueKeys = new Set<string>()
  const identifiers: DeckImportIdentifier[] = []

  for (const entry of parsedImport.entries) {
    const uniqueKey = `${entry.name.toLowerCase()}|${entry.setCode?.toLowerCase() ?? ''}`

    if (uniqueKeys.has(uniqueKey)) {
      continue
    }

    uniqueKeys.add(uniqueKey)
    identifiers.push({
      name: entry.name,
      setCode: entry.setCode,
    })
  }

  return identifiers
}
