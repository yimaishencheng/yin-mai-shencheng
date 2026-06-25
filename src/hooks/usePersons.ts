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
        .then(res => res.json())
        .then(data => {
          _cache = data
          _pending = null
          return data
        })
    }
    _pending.then(data => {
      setPersons(data)
      setLoading(false)
    })
  }, [])

  return { persons, loading }
}
