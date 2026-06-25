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
        .then(res => res.json())
        .then(data => {
          _cache = data
          _pending = null
          return data
        })
    }
    _pending.then(data => {
      setPlaces(data)
      setLoading(false)
    })
  }, [])

  return { places, loading }
}
