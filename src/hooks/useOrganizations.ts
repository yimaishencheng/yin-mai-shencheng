import { useState, useEffect } from 'react'
import type { Organization } from '../types'

const BASE = import.meta.env.BASE_URL

let _cache: Organization[] | null = null
let _pending: Promise<Organization[]> | null = null

export function useOrganizations(): { organizations: Organization[]; loading: boolean } {
  const [organizations, setOrganizations] = useState<Organization[]>(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) {
      setOrganizations(_cache)
      setLoading(false)
      return
    }
    if (!_pending) {
      _pending = fetch(`${BASE}data/organizations.json`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load organizations: HTTP ${res.status}`)
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
        setOrganizations(data)
        setLoading(false)
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { organizations, loading }
}
