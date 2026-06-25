import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import { usePersons } from '../hooks/usePersons'
import { usePlaces } from '../hooks/usePlaces'
import relations from '../data/relations.json'
import type { Person, Place } from '../types'

type P = Person; type Pl = Place

function findBroken(persons: Person[], rels: typeof relations) {
  const g = new Map<string, Set<string>>()
  for (const r of rels) {
    if (!g.has(r.source)) g.set(r.source, new Set())
    if (!g.has(r.target)) g.set(r.target, new Set())
    g.get(r.source)!.add(r.target); g.get(r.target)!.add(r.source)
  }
  const all = persons.map(p => p.id); const out: {a:string;b:string;c:string}[] = []
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (g.get(a)?.has(b)) continue
      const ac = g.get(a) || new Set(), bc = g.get(b) || new Set()
      for (const c of ac) { if (c !== a && c !== b && bc.has(c)) { out.push({a,b,c}); break } }
      if (out.length >= 10) break
    }
    if (out.length >= 10) break
  }
  return out
}

function findOrgs(persons: Person[]) {
  const m = new Map<string, Set<string>>()
  for (const p of persons) for (const o of (p.organizations||[])) {
    if (!o) continue; if (!m.has(o)) m.set(o, new Set()); m.get(o)!.add(p.id)
  }
  return Array.from(m.entries()).map(([o,s]) => ({org:o,count:s.size,ids:Array.from(s)})).sort((a,b)=>b.count-a.count)
}

const TABS = ['消失的人物','可疑联络地点','断裂的网络','沉默的组织']

export default function Anomalies() {
  const [tab, setTab] = useState(0)
  const nav = useNavigate()
  const { persons, loading: pLoading } = usePersons()
  const { places, loading: plLoading } = usePlaces()

  if (pLoading || plLoading) {
    return <div className="flex items-center justify-center h-96 text-gray-500">加载数据中…</div>
  }

  const broken = useMemo(() => findBroken(persons, relations), [persons])
  const orgs = useMemo(() => findOrgs(persons), [persons])
  const [expOrg, setExpOrg] = useState<string | null>(null)

  const statsData = [
    { label: '消失人物', value: persons.filter(p=>p.is_anomaly).length, color: '#ef4444' },
    { label: '可疑地点', value: places.filter(p=>p.is_anomaly).length, color: '#f59e0b' },
    { label: '断裂网络', value: broken.length, color: '#457b9d' },
    { label: '沉默组织', value: orgs.filter(o=>o.count===1).length, color: '#6a4c93' },
  ]

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 style={{ color: '#d97706', fontSize: 26, fontWeight: 700, marginBottom: 2 }}>异常发现</h1>
        <p style={{ color: '#888899', fontSize: 13, marginBottom: 16 }}>以下异常由系统分析历史数据后自动标注，仅供学术参考</p>
        <div className="flex gap-3">{statsData.map((s,i) => (
          <div key={i} className="flex-1 flex flex-col items-center rounded-lg py-3" style={{ backgroundColor: '#111118', border: '1px solid #1f1f2e' }}>
            <span style={{ color: s.color, fontSize: 26, fontWeight: 700 }}>{s.value}</span>
            <span style={{ color: '#888899', fontSize: 11 }}>{s.label}</span>
          </div>
        ))}</div>
      </div>

      <div className="flex gap-6 px-6 shrink-0" style={{ borderBottom: '1px solid #1f1f2e' }}>
        {TABS.map((t,i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ color: tab===i ? '#d97706' : '#666677', borderBottom: tab===i ? '2px solid #d97706' : '2px solid transparent', padding: '8px 0', marginBottom: -1, fontSize: 13, fontWeight: tab===i ? 600 : 400, background: 'none', cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 0 && <Tab1 persons={persons} nav={nav} />}
        {tab === 1 && <Tab2 places={places} nav={nav} />}
        {tab === 2 && <Tab3 broken={broken} persons={persons} />}
        {tab === 3 && <Tab4 orgs={orgs} expOrg={expOrg} setExpOrg={setExpOrg} persons={persons} />}
      </div>
    </div>
  )
}

function Tab1({ persons, nav }: { persons: Person[]; nav: ReturnType<typeof import('react-router-dom').useNavigate> }) {
  const items = persons.filter(p => p.is_anomaly)
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p style={{ color: '#888899' }}>无异常人物数据</p>}
      {items.map(p => (
        <button key={p.id} onClick={() => nav('/portrait/' + encodeURIComponent(p.id))}
          className="flex items-center gap-4 w-full rounded-lg p-4 text-left" style={{ backgroundColor: '#111118', border: '1px solid #1f1f2e' }}>
          <div className="flex flex-col shrink-0" style={{ width: 120 }}>
            <span style={{ color: '#d97706', fontSize: 16, fontWeight: 700 }}>{p.name}</span>
            {p.occupation && <span className="inline-block px-1.5 py-0.5 rounded text-xs mt-1" style={{ backgroundColor: 'rgba(128,128,140,0.15)', color: '#888899', alignSelf: 'flex-start' }}>{p.occupation}</span>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <div style={{ height: 8, width: 60, borderRadius: 4, backgroundColor: '#2a2a3a', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: 8, width: '70%', borderRadius: 4, backgroundColor: '#22c55e' }} />
                <div style={{ position: 'absolute', right: '10%', top: -2, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
              </div>
            </div>
            <div style={{ color: '#666677', fontSize: 11 }}>{p.active_from || '?'} - {p.active_to || '至今'}</div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            {p.anomaly_note && <span style={{ color: '#ef4444', fontSize: 11 }}>史料记载终止 {p.active_to}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}

function Tab2({ places, nav }: { places: Place[]; nav: ReturnType<typeof import('react-router-dom').useNavigate> }) {
  const items = places.filter(p => p.is_anomaly).sort((a,b) => (b.anomaly_score||0) - (a.anomaly_score||0))
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p style={{ color: '#888899' }}>无异常地点数据</p>}
      {items.map(pl => (
        <button key={pl.id} onClick={() => nav('/map?highlight=' + encodeURIComponent(pl.id))}
          className="flex items-center gap-4 w-full rounded-lg p-4 text-left" style={{ backgroundColor: '#111118', border: '1px solid #1f1f2e' }}>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: '#d97706', fontSize: 16, fontWeight: 700 }}>{pl.name}</span>
              <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(128,128,140,0.15)', color: '#888899' }}>{pl.type}</span>
              {pl.district && <span style={{ color: '#666677', fontSize: 11 }}>{pl.district}</span>}
            </div>
            <div className="flex items-center gap-4 mb-1">
              <div style={{ textAlign: 'center' }}><span style={{ color: '#e8e8ea', fontSize: 22, fontWeight: 700 }}>{(pl.related_persons||[]).length}</span><span style={{ color: '#888899', fontSize: 10, marginLeft: 4 }}>关联人物</span></div>
              <div className="flex-1">
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#2a2a3a' }}>
                  <div className="h-full rounded-full" style={{ width: Math.min((pl.anomaly_score||0)*100,100)+'%', backgroundColor: '#ef4444' }} />
                </div>
                <span style={{ color: '#888899', fontSize: 10 }}>异常评分 {(pl.anomaly_score||0).toFixed(2)}</span>
              </div>
            </div>
            {pl.anomaly_note && <p style={{ color: '#888899', fontSize: 11, fontStyle: 'italic' }}>{pl.anomaly_note}</p>}
          </div>
          <div className="shrink-0" style={{ width: 120, height: 80, borderRadius: 6, overflow: 'hidden' }}>
            {pl.lat && pl.lat !== 0 && (
              <MapContainer center={[pl.lat, pl.lng]} zoom={14} style={{ width: 120, height: 80 }} zoomControl={false} attributionControl={false} scrollWheelZoom={false} dragging={false} key={pl.id}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <CircleMarker center={[pl.lat, pl.lng]} radius={5} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }} />
              </MapContainer>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function Tab3({ broken, persons }: { broken: {a:string;b:string;c:string}[]; persons: Person[] }) {
  return (
    <div className="flex flex-col gap-4">
      {broken.length === 0 && <p style={{ color: '#888899' }}>无断裂网络数据</p>}
      {broken.map((item, i) => {
        const pa = persons.find(p => p.id === item.a)
        const pb = persons.find(p => p.id === item.b)
        const pc = persons.find(p => p.id === item.c)
        if (!pa || !pb || !pc) return null
        return (
          <div key={i} className="rounded-lg p-5" style={{ backgroundColor: '#111118', border: '1px solid #1f1f2e' }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex flex-col items-center"><div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#6a4c93', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>{pa.name[0]}</div><span style={{ color: '#e8e8ea', fontSize: 11, marginTop: 2 }}>{pa.name}</span></div>
              <div style={{ flex: 1, height: 0, borderTop: '2px dashed #2a2a3a', maxWidth: 80 }} />
              <div className="flex flex-col items-center"><div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 0 8px #ef4444' }}>?</div><span style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>{pc.name}</span></div>
              <div style={{ flex: 1, height: 0, borderTop: '2px dashed #2a2a3a', maxWidth: 80 }} />
              <div className="flex flex-col items-center"><div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#6a4c93', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>{pb.name[0]}</div><span style={{ color: '#e8e8ea', fontSize: 11, marginTop: 2 }}>{pb.name}</span></div>
            </div>
            <p style={{ color: '#888899', fontSize: 12, textAlign: 'center' }}>{pa.name}与{pb.name}通过{pc.name}存在间接关联，但两人之间未见直接史料记载</p>
          </div>
        )
      })}
    </div>
  )
}

function Tab4({ orgs, expOrg, setExpOrg, persons }: { orgs: {org:string;count:number;ids:string[]}[]; expOrg: string|null; setExpOrg: (v:string|null) => void; persons: Person[] }) {
  return (
    <div>
      {orgs.length === 0 && <p style={{ color: '#888899' }}>无组织数据</p>}
      {orgs.map(o => (
        <div key={o.org} className="rounded-lg mb-2" style={{ backgroundColor: '#111118', border: '1px solid #1f1f2e' }}>
          <button onClick={() => setExpOrg(expOrg===o.org ? null : o.org)}
            className="flex items-center gap-4 w-full p-4 text-left" style={{ background: 'none', cursor: 'pointer' }}>
            <span style={{ color: '#e8e8ea', fontSize: 14, fontWeight: 600, flex: 1 }}>{o.org}</span>
            <span style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700 }}>{o.count}</span>
            <span style={{ color: '#888899', fontSize: 11 }}>已知成员</span>
            <span style={{ color: '#888899', fontSize: 11 }}>异常指数: {Math.min(o.count/5,1).toFixed(2)}</span>
          </button>
          {expOrg === o.org && (
            <div className="px-4 pb-4 flex flex-wrap gap-2 border-t" style={{ borderColor: '#1f1f2e', paddingTop: 8 }}>
              {o.ids.map(pid => { const p = persons.find(x => x.id === pid); return p ? (
                <span key={pid} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: '#d97706' }}>{p.name}</span>
              ) : null })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
