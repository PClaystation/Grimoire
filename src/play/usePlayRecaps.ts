import { useEffect, useState } from 'react'

import {
  getPlayRecapsEventName,
  readPlaySessionRecaps,
  type PlaySessionRecap,
} from '@/play/playRecapStorage'

export function usePlayRecaps() {
  const [recaps, setRecaps] = useState<PlaySessionRecap[]>(() => readPlaySessionRecaps())

  useEffect(() => {
    function refresh() {
      setRecaps(readPlaySessionRecaps())
    }

    window.addEventListener(getPlayRecapsEventName(), refresh)
    window.addEventListener('storage', refresh)

    return () => {
      window.removeEventListener(getPlayRecapsEventName(), refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return recaps
}
