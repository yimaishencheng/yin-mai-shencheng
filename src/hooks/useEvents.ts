import { useState, useEffect } from 'react'
import type { HistoricalEvent } from '../types'

const BASE = import.meta.env.BASE_URL

let _cache: HistoricalEvent[] | null = null
let _pending: Promise<HistoricalEvent[]> | null = null

export function useEvents(): { events: HistoricalEvent[]; loading: boolean } {
  const [events, setEvents] = useState<HistoricalEvent[]>(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) {
      setEvents(_cache)
      setLoading(false)
      return
    }
    if (!_pending) {
      _pending = fetch(`${BASE}data/events.json`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load events: HTTP ${res.status}`)
          return res.json()
        })
        .then(data => {
          _cache = data
          return data
        })
        .finally(() => {
          _pending = null
        })
    }
    let active = true
    _pending
      .then(data => {
        if (!active) return
        setEvents(data)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { events, loading }
}
