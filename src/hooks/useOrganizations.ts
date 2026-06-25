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
        .then(res => res.json())
        .then(data => {
          _cache = data
          _pending = null
          return data
        })
    }
    _pending.then(data => {
      setOrganizations(data)
      setLoading(false)
    })
  }, [])

  return { organizations, loading }
}
