import { useContext } from 'react'

import { PlayContext } from '@/play/playContext'

export function usePlay() {
  const value = useContext(PlayContext)

  if (!value) {
    throw new Error('usePlay must be used inside PlayProvider.')
  }

  return value
}
