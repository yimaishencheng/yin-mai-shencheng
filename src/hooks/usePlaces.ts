import { useState, useEffect } from 'react'
import type { Place } from '../types'

const BASE = import.meta.env.BASE_URL

let _cache: Place[] | null = null
let _pending: Promise<Place[]> | null = null

export function usePlaces(): { places: Place[]; loading: boolean } {
  const [places, setPlaces] = useState<Place[]>(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) {
      setPlaces(_cache)
      setLoading(false)
      return
    }
    if (!_pending) {
      _pending = fetch(`${BASE}data/places.json`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load places: HTTP ${res.status}`)
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
        setPlaces(data)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { places, loading }
}
