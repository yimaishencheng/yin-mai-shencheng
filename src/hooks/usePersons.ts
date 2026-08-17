import { useState, useEffect } from 'react'
import type { Person } from '../types'

const BASE = import.meta.env.BASE_URL

let _cache: Person[] | null = null
let _pending: Promise<Person[]> | null = null

export function usePersons(): { persons: Person[]; loading: boolean } {
  const [persons, setPersons] = useState<Person[]>(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) {
      setPersons(_cache)
      setLoading(false)
      return
    }
    if (!_pending) {
      _pending = fetch(`${BASE}data/persons.json`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load persons: HTTP ${res.status}`)
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
        setPersons(data)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { persons, loading }
}
