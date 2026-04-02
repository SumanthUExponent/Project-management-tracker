import { useState, useCallback, useRef } from 'react'
import { batchWrite } from '../services/sheets.js'

export function useSave(token) {
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const timeoutRef = useRef(null)
  const queueRef = useRef([])

  const save = useCallback(async (updates) => {
    if (!token) return
    clearTimeout(timeoutRef.current)
    queueRef.current = [...queueRef.current, ...updates]

    timeoutRef.current = setTimeout(async () => {
      const batch = [...queueRef.current]
      queueRef.current = []
      setSaveState('saving')
      try {
        await batchWrite(batch, token)
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 4000)
      }
    }, 600)
  }, [token])

  return { save, saveState }
}
