import { useState, useEffect, useCallback, useRef } from 'react'
import { readSheet } from '../services/sheets.js'

export function useSheets(sheetNames, token) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        sheetNames.map(name => readSheet(name, token).then(rows => [name, rows]))
      )
      if (!mountedRef.current) return
      setData(Object.fromEntries(results))
      setLastSync(new Date())
    } catch (e) {
      if (mountedRef.current) setError(e.message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [sheetNames.join(','), token])

  useEffect(() => {
    mountedRef.current = true
    fetch()
    return () => { mountedRef.current = false }
  }, [fetch])

  return { data, loading, error, lastSync, refresh: fetch }
}
