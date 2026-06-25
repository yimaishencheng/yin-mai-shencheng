import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import { usePersons } from '../hooks/usePersons'
import { usePlaces } from '../hooks/usePlaces'
import { useEvents } from '../hooks/useEvents'
import type { HistoricalEvent, Place } from '../types'

type Evt = HistoricalEvent

const TYPE_COLORS: Record<string, string> = {
  '书店': '#f59e0b',
  '印刷厂': '#2a9d8f',
  '报社': '#457b9d',
  '学校': '#6a4c93',
  '历史遗址': '#e63946',
}

function useFilter(places: Place[], year: number, types: string[]) {
  return React.useMemo(() => places.filter(p => {
    if (!p.lat || p.lat === 0) return false
    if (p.established > 0 && p.established > year) return false
    if (p.closed !== null && p.closed > 0 && p.closed < year) return false
    if (types.length > 0 && !types.includes(p.type)) return false
    return true
  }), [places, year, types])
}

export default function MapExplorer() {
  const [year, setYear] = useState(1937)
  const [selTypes, setSelTypes] = useState<string[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const nav = useNavigate()
  const { persons, loading: pLoading } = usePersons()
  const { places, loading: plLoading } = usePlaces()
  const { events } = useEvents()

  if (pLoading || plLoading) {
    return <div className="flex items-center justify-center h-96 text-gray-500">加载数据中…</div>
  }

  const allTypes = useMemo(() => {
    const s = new Set(places.filter(p => p.lat && p.lat !== 0).map(p => p.type))
    return Array.from(s).sort()
  }, [places])

  const toggleType = (t: string) => {
    setSelTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
    setSelId(null)
  }

  const visible = useFilter(places, year, selTypes)
  const selPlace = places.find(p => p.id === selId) || null

  const relatedEvents = useMemo(() => {
    if (!selPlace) return []
    const name = selPlace.name
    return events.filter(e =>
      (e.description && e.description.includes(name)) ||
      (e.name && e.name.includes(name))
    ).slice(0, 4)
  }, [selPlace, events])

  const personMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of persons) if (p.name && p.id) m[p.id] = p.name
    return m
  }, [persons])

  const totalOK = places.filter(p => p.lat && p.lat !== 0).length
  const anomalyIds = new Set(places.filter(p => p.is_anomaly && p.lat && p.lat !== 0).map(p => p.id))

  return (
    <div className="h-full flex" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="relative" style={{ flex: '1 1 calc(100% - 320px)' }}>
        <MapContainer center={[31.2304, 121.4737]} zoom={13} className="w-full h-full" zoomControl={false} attributionControl={false} style={{ backgroundColor: '#0a0a0f' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {visible.map(pl => {
            const r = Math.min(6 + (pl.related_persons || []).length * 2, 20)
            const cl = TYPE_COLORS[pl.type] || '#6b7280'
            return (
              <CircleMarker key={pl.id} center={[pl.lat, pl.lng]} radius={r}
                pathOptions={{ color: cl, fillColor: cl, fillOpacity: 0.8, weight: 2 }}
                eventHandlers={{ click: () => setSelId(pl.id) }} />
            )
          })}
        </MapContainer>

        <div className="absolute top-3 left-3 z-[1000] p-4 rounded-lg" style={{ backgroundColor: 'rgba(17,17,24,0.92)', border: '1px solid #2a2a3a', maxWidth: 420 }}>
          <div className="flex items-center gap-3 mb-2">
            <span style={{ color: '#f59e0b', fontSize: 22, fontWeight: 700, minWidth: 44 }}>{year}</span>
            <input type="range" min={1919} max={1945} value={year} onChange={e => { setYear(Number(e.target.value)); setSelId(null) }}
              className="flex-1" style={{ accentColor: '#f59e0b', height: 4 }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => { setSelTypes([]); setSelId(null) }}
              className="px-2.5 py-1 rounded text-xs"
              style={{ backgroundColor: selTypes.length === 0 ? '#d97706' : '#1f1f2e', color: selTypes.length === 0 ? '#fff' : '#888899' }}>
              全部
            </button>
            {allTypes.map(t => (
              <button key={t} onClick={() => toggleType(t)}
                className="px-2.5 py-1 rounded text-xs"
                style={{ backgroundColor: selTypes.includes(t) ? '#d97706' : '#1f1f2e', color: selTypes.includes(t) ? '#fff' : '#888899' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-5 left-3 z-[1000] p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(17,17,24,0.85)', border: '1px solid #2a2a3a' }}>
          {Object.entries(TYPE_COLORS).map(([t, c]) => (
            <div key={t} className="flex items-center gap-2 mb-1 last:mb-0">
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c, display: 'inline-block' }} />
              <span style={{ color: '#888899' }}>{t}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1">
            <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block', opacity: 0.7 }} />
            <span style={{ color: '#888899' }}>异常地点</span>
          </div>
        </div>

        <style>{'@keyframes pa{0%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.5}100%{transform:scale(1);opacity:1}}.pulse-m{width:16px;height:16px;background:#ef4444;border-radius:50%;animation:pa 2s infinite;position:relative;z-index:999}'}</style>
      </div>

      <div className="flex flex-col overflow-y-auto" style={{ width: 320, borderLeft: '1px solid #2a2a3a', backgroundColor: '#111118' }}>
        {selPlace ? (
          <PlaceDetail place={selPlace} events={relatedEvents} pMap={personMap} nav={nav} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <p style={{ color: '#888899', fontSize: 13, marginBottom: 8 }}>点击地图上的标记查看详情</p>
            <p style={{ color: '#666677', fontSize: 11 }}>当前筛选: {visible.length}处 / {totalOK}处</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PlaceDetail({ place, events, pMap, nav }: {
  place: Place; events: Evt[]; pMap: Record<string, string>; nav: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="p-5">
      <h2 style={{ color: '#d97706', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{place.name}</h2>
      <span className="inline-block px-2 py-0.5 rounded-full text-xs mb-3" style={{ backgroundColor: 'rgba(128,128,140,0.15)', color: '#888899' }}>{place.type}</span>
      {place.address && <p style={{ color: '#666677', fontSize: 11, marginBottom: 6 }}>{place.address}</p>}
      <p style={{ color: '#e8e8ea', fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>{place.description}</p>

      {place.is_anomaly && (
        <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>⚠ 系统异常标注</p>
          {place.anomaly_note && <p style={{ color: '#fca5a5', fontSize: 11, marginBottom: 6 }}>{place.anomaly_note}</p>}
          {(place.anomaly_score ?? 0) > 0 && (
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#2a2a3a' }}>
              <div className="h-full rounded-full" style={{ width: Math.min((place.anomaly_score ?? 0) * 100, 100) + '%', backgroundColor: '#ef4444' }} />
            </div>
          )}
        </div>
      )}

      {place.related_persons && place.related_persons.length > 0 && (
        <div className="mb-4">
          <p style={{ color: '#888899', fontSize: 11, marginBottom: 6 }}>关联人物</p>
          <div className="flex flex-wrap gap-1.5">
            {place.related_persons.map(pid => (
              <button key={pid} onClick={() => nav('/portrait/' + encodeURIComponent(pid))}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: '#d97706' }}>
                {pMap[pid] || '未知'}
              </button>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <p style={{ color: '#888899', fontSize: 11, marginBottom: 6 }}>相关事件</p>
          {events.map((ev, i) => (
            <div key={ev.id || i} className="py-1.5 border-t" style={{ borderColor: '#1f1f2e' }}>
              <span style={{ color: '#f59e0b', fontSize: 10, marginRight: 6 }}>{ev.year || '?'}</span>
              <span style={{ color: '#e8e8ea', fontSize: 12 }}>{ev.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
