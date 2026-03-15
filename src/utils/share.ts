import { isPortableDeckPayload, type PortableDeckPayload } from '@/utils/decklist'

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddedValue = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(paddedValue)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function encodeDeckSharePayload(payload: PortableDeckPayload): string {
  return toBase64Url(JSON.stringify(payload))
}

export function decodeDeckSharePayload(value: string): PortableDeckPayload | null {
  try {
    const parsedValue = JSON.parse(fromBase64Url(value)) as unknown
    return isPortableDeckPayload(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}
