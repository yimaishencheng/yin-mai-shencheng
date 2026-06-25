import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePersons } from '../hooks/usePersons'
import { useEvents } from '../hooks/useEvents'
import type { HistoricalEvent } from '../types'

const PAGE = 50
type Evt = HistoricalEvent

export default function Timeline() {
  const { persons, loading: pLoading } = usePersons()
  const { events } = useEvents()

  if (pLoading) {
    return <div className="flex items-center justify-center h-96 text-gray-500">加载数据中…</div>
  }
  const [yF, setYF] = useState(1925); const [yT, setYT] = useState(1940)
  const [types, setTypes] = useState<string[]>([])
  const [kw, setKw] = useState('')
  const [pg, setPg] = useState(1)
  const [exp, setExp] = useState<Set<string>>(new Set())
  const nav = useNavigate()

  const allTypes = useMemo(() => [...new Set(events.map(e => e.type))], [])

  const filtered = useMemo(() => events.filter(e => {
    if (e.year < yF || e.year > yT) return false
    if (types.length && !types.includes(e.type)) return false
    if (kw && !e.name.includes(kw) && !(e.description || '').includes(kw)) return false
    return true
  }).sort((a, b) => a.year - b.year), [yF, yT, types, kw])

  useEffect(() => { setPg(1) }, [yF, yT, types, kw])

  const totalPages = Math.ceil(filtered.length / PAGE)
  const items = filtered.slice((pg - 1) * PAGE, pg * PAGE)

  const toggle = (id: string) => {
    setExp(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const getRel = (evt: Evt) => persons.filter(p => p.name && ((evt.description || '').includes(p.name) || evt.name.includes(p.name)))

  const toggleType = (t: string) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <div className="h-full flex" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="shrink-0 flex flex-col p-4 overflow-y-auto" style={{ width: 220, backgroundColor: '#111118', borderRight: '1px solid #2a2a3a' }}>
        <p style={{ color: '#888899', fontSize: 11, marginBottom: 4 }}>\u5e74\u4efd\u8303\u56f4</p>
        <div className="flex items-center gap-2 mb-1">
          <input type="range" min={1919} max={1945} value={yF} onChange={e => setYF(Math.min(Number(e.target.value), yT-1))} className="flex-1" style={{ accentColor: '#f59e0b' }} />
          <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, minWidth: 36 }}>{yF}</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input type="range" min={1919} max={1945} value={yT} onChange={e => setYT(Math.max(Number(e.target.value), yF+1))} className="flex-1" style={{ accentColor: '#f59e0b' }} />
          <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, minWidth: 36 }}>{yT}</span>
        </div>
        <p style={{ color: '#888899', fontSize: 11, marginBottom: 4 }}>\u4e8b\u4ef6\u7c7b\u578b</p>
        {allTypes.map(t => (
          <label key={t} className="flex items-center gap-2 py-1 cursor-pointer" style={{ color: types.includes(t) ? '#f59e0b' : '#888899' }}>
            <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} style={{ accentColor: '#f59e0b' }} />
            <span style={{ fontSize: 12 }}>{t}</span>
          </label>
        ))}
        <p style={{ color: '#888899', fontSize: 11, marginTop: 12, marginBottom: 4 }}>\u5173\u952e\u8bcd\u641c\u7d22</p>
        <input type="text" value={kw} onChange={e => setKw(e.target.value)} placeholder="\u8f93\u5165\u641c\u7d22\u2026"
          className="w-full px-2 py-1.5 rounded text-sm outline-none" style={{ backgroundColor: '#1f1f2e', border: '1px solid #2a2a3a', color: '#e8e8ea' }} />
        <div className="mt-auto pt-4" style={{ color: '#888899', fontSize: 12 }}>\u5171 {filtered.length} \u6761\u4e8b\u4ef6</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: '#2a2a3a', transform: 'translateX(-50%)' }} />
          {items.map((evt, i) => {
            const isL = i % 2 === 0
            const open = exp.has(evt.id)
            return (
              <div key={evt.id || i} style={{ display: 'flex', position: 'relative' }}>
                <div className="flex flex-col cursor-pointer" style={{ width: '50%', padding: '14px 28px', alignItems: isL ? 'flex-end' : 'flex-start' }} onClick={() => toggle(evt.id)}>
                  {isL && <Card evt={evt} open={open} persons={persons} nav={nav} />}
                </div>
                <div style={{ position: 'absolute', left: '50%', top: 22, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b', transform: 'translateX(-50%)', zIndex: 1 }} />
                <div className="flex flex-col" style={{ width: '50%', padding: '14px 28px', alignItems: isL ? 'flex-start' : 'flex-end' }} onClick={() => toggle(evt.id)}>
                  {!isL && <Card evt={evt} open={open} persons={persons} nav={nav} />}
                </div>
              </div>
            )})}
        </div>
        <div className="flex items-center justify-center gap-4 py-4" style={{ color: '#888899' }}>
          <button disabled={pg<=1} onClick={() => setPg(p => p-1)} className="px-3 py-1 rounded text-sm disabled:opacity-30" style={{ backgroundColor: '#1f1f2e', color: '#e8e8ea' }}>\u4e0a\u4e00\u9875</button>
          <span style={{ fontSize: 12 }}>{pg} / {totalPages}</span>
          <button disabled={pg>=totalPages} onClick={() => setPg(p => p+1)} className="px-3 py-1 rounded text-sm disabled:opacity-30" style={{ backgroundColor: '#1f1f2e', color: '#e8e8ea' }}>\u4e0b\u4e00\u9875</button>
        </div>
      </div>
    </div>
  )
}

function Card({ evt, open, persons, nav }: { evt: Evt; open: boolean; persons: {id:string;name:string}[]; nav: ReturnType<typeof import('react-router-dom').useNavigate> }) {
  const rel = persons.filter(p => p.name && ((evt.description || '').includes(p.name) || evt.name.includes(p.name)))
  return (
    <div className="rounded-lg" style={{ maxWidth: 380, backgroundColor: '#1a1a25', border: '1px solid #2a2a3a', padding: open ? 14 : 10 }}>
      <div style={{ color: '#f59e0b', fontSize: 11, marginBottom: 2 }}>
        {evt.year}{evt.date ? ' ' + evt.date : ''}
      </div>
      <div style={{ color: '#e8e8ea', fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: open ? undefined : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {evt.name}
      </div>
      <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(128,128,140,0.15)', color: '#888899', marginBottom: 4 }}>{evt.type}</span>
      <div style={{ color: '#a0a0b0', fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: open ? undefined : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {evt.description || ''}
      </div>
      {open && evt.source && <div style={{ color: '#666677', fontSize: 10, marginTop: 6 }}>{evt.source}</div>}
      {open && rel.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {rel.map(p => (
            <button key={p.id} onClick={e => { e.stopPropagation(); nav('/portrait/' + encodeURIComponent(p.id)) }}
              className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(217,119,6,0.12)', color: '#d97706' }}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      {!open && <div style={{ color: '#555566', fontSize: 10, marginTop: 4 }}>\u70b9\u51fb\u5c55\u5f00</div>}
    </div>
  )
}
