export interface Person {
  id: string
  name: string
  aliases: string[]
  occupation: string
  active_from: number
  active_to: number | null
  district: string
  organizations: string[]
  description: string
  source: string
  source_detail?: string
  source_uri?: string
  provenance?: 'raw' | 'cleaned' | 'inferred' | 'manual' | 'synthetic'
  is_anomaly?: boolean
  anomaly_note?: string
  is_incomplete?: boolean
}

export interface Place {
  id: string
  name: string
  address: string
  district: string
  type: string
  lat: number
  lng: number
  established: number
  closed: number | null
  related_persons: string[]
  description: string
  source_detail?: string
  source_uri?: string
  provenance?: 'raw' | 'cleaned' | 'inferred' | 'manual' | 'synthetic'
  is_anomaly?: boolean
  anomaly_score?: number
  anomaly_note?: string
}

export interface HistoricalEvent {
  id: string
  name: string
  date: string
  year: number
  type: string
  location_id: string
  person_ids: string[]
  description: string
  source: string
  source_detail?: string
  source_uri?: string
  provenance?: 'raw' | 'cleaned' | 'inferred' | 'manual' | 'synthetic'
}

export interface Relation {
  source: string
  target: string
  type: string
  strength: number
  year: number
  provenance?: 'raw' | 'cleaned' | 'inferred' | 'manual' | 'synthetic'
}

export interface Organization {
  id: string
  name: string
  type: string
  description: string
  source: string
  source_detail?: string
  source_uri?: string
  provenance?: 'raw' | 'cleaned' | 'inferred' | 'manual' | 'synthetic'
  member_ids: string[]
}
