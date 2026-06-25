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
  is_anomaly?: boolean
  anomaly_note?: string
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
}

export interface Relation {
  source: string
  target: string
  type: string
  strength: number
  year: number
}

export interface Organization {
  id: string
  name: string
  type: string
  description: string
  source: string
}
