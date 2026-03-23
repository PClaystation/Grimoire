import { resolveImportedDeckInput } from '@/utils/resolveImportedDeck'
import { decodeDeckSharePayload } from '@/utils/share'

export async function resolveSharedDeckParam(value: string | null) {
  if (!value) {
    return null
  }

  const payload = decodeDeckSharePayload(value)

  if (!payload) {
    return null
  }

  return resolveImportedDeckInput(JSON.stringify(payload), payload.format)
}
