import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { generatePortrait } from '../api/deepseek'
import { usePersons } from '../hooks/usePersons'
import relations from '../data/relations.json'
import { useEvents } from '../hooks/useEvents'
import type { HistoricalEvent, Person } from '../types'

echarts.use([GraphChart, TooltipComponent, CanvasRenderer])
type P = Person

export default function Portrait() {
  const { personId } = useParams(); const nav = useNavigate()
  const [st, setSt] = useState(''); const [bio, setBio] = useState(''); const [gen, setGen] = useState(false)
  const { persons, loading } = usePersons()
  const id = personId ? decodeURIComponent(personId) : ''
  const { events } = useEvents()

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-500">加载数据中…</div>
  }

  const person = persons.find(p => p.id === id) || null

  const results = useMemo(() => persons.filter(p => p.name.includes(st)), [st])

  if (id === 'search') {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="w-full max-w-lg px-6">
          <h1 style={{ color: '#d97706', fontSize: 22, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>\u4eba\u7269\u753b\u50cf\u641c\u7d22</h1>
          <input type="text" value={st} onChange={e => setSt(e.target.value)} placeholder="\u8f93\u5165\u5386\u53f2\u4eba\u7269\u59d3\u540d\u2026"
            className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={{ backgroundColor: '#111118', border: '1px solid #2a2a3a', color: '#e8e8ea' }} />
          <div className="mt-4 flex flex-col gap-2">
            {results.map(p => (
              <button key={p.id} onClick={() => nav('/portrait/' + encodeURIComponent(p.id))}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-left"
                style={{ backgroundColor: '#111118', border: '1px solid #1f1f2e' }}>
                <div><div style={{ color: '#e8e8ea', fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ color: '#888899', fontSize: 11 }}>{p.occupation || ''}</div></div>
                <div style={{ color: '#666677', fontSize: 11 }}>{p.active_from || '?'}-{p.active_to || '"\u81f3\u4eca"'}</div>
              </button>
            ))}
            {st && results.length === 0 && <div style={{ color: '#666677', fontSize: 13, textAlign: 'center' }}>\u672a\u627e\u5230\u5339\u914d\u4eba\u7269</div>}
          </div>
        </div>
      </div>
    )
  }

  if (!person) return <div className="h-full flex items-center justify-center" style={{ color: '#888899', backgroundColor: '#0a0a0f' }}>\u4eba\u7269\u672a\u627e\u5230</div>

  const rels = relations.filter(r => r.source === person.id || r.target === person.id)
  const relPids = new Set(rels.map(r => r.source === person.id ? r.target : r.source))
  const relPersons = persons.filter(p => relPids.has(p.id))
  const relEvts = events.filter(e => ((e as any).person_ids||[]).includes(person.id) || e.description.includes(person.name)).slice(0, 10)
  const actEvts = events.filter(e => e.description.includes(person.name) || e.name.includes(person.name)).sort((a, b) => a.year - b.year)

  const handleGen = async () => {
    if (!person || gen) return; setGen(true); setBio('')
    try {
      const text = await generatePortrait(person); let i = 0
      const tmr = setInterval(() => {
        if (i < text.length) { setBio(text.slice(0, i + 1)); i++ }
        else { clearInterval(tmr); setGen(false) }
      }, 16)
    } catch { setBio('\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5'); setGen(false) }
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="px-5 py-2 shrink-0" style={{ borderBottom: '1px solid #1a1a25', backgroundColor: '#111118' }}>
        <button onClick={() => nav(-1)} style={{ color: '#f59e0b', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none' }}>\u2190 \u8fd4\u56de</button>
      </div>
      <div className="flex-1 flex min-h-0">
        <LeftPanel person={person} />
        <div style={{ width: 1, backgroundColor: '#2a2a3a' }} />
        <MiddlePanel person={person} rels={rels} relPersons={relPersons} relEvts={relEvts} nav={nav} />
        <div style={{ width: 1, backgroundColor: '#2a2a3a' }} />
        <RightPanel person={person} actEvts={actEvts} />
      </div>
      <div className="shrink-0 flex items-center gap-4 px-5" style={{ height: 120, backgroundColor: '#111118', borderTop: '1px solid #2a2a3a' }}>
        <div className="flex flex-col flex-1 min-w-0">
          <span style={{ color: '#888899', fontSize: 11, marginBottom: 2 }}>AI \u5386\u53f2\u5c0f\u4f20</span>
          <div ref={r => { if (r) r.scrollIntoView({ block: 'end' }) }} style={{ color: '#e8e8ea', fontSize: 13, lineHeight: 1.5, maxHeight: 56, overflow: 'auto' }}>{bio}</div>
          {!bio && <span style={{ color: '#555566', fontSize: 10 }}>\u7531AI\u57fa\u4e8e\u6863\u6848\u6570\u636e\u751f\u6210</span>}
        </div>
        <button onClick={handleGen} disabled={gen}
          className="px-5 py-2 rounded-lg text-sm font-medium shrink-0 disabled:opacity-50"
          style={{ backgroundColor: '#d97706', color: '#0a0a0f' }}>
          {gen ? '\u751f\u6210\u4e2d\u2026' : '\u751f\u6210\u5c0f\u4f20'}</button>
      </div>
    </div>
  )
}

function LeftPanel({ person }: { person: P }) {
  return (
    <div className="flex flex-col p-5 overflow-y-auto" style={{ width: '25%' }}>
      <h2 style={{ color: '#f59e0b', fontSize: 24, fontWeight: 700, marginBottom: 2 }}>{person.name}</h2>
      {person.aliases && person.aliases.length > 0 && <p style={{ color: '#666677', fontSize: 11, marginBottom: 4 }}>{person.aliases.join('\u3001')}</p>}
      {person.occupation && <span className="inline-block px-2 py-0.5 rounded-full text-xs mb-4" style={{ backgroundColor: 'rgba(128,128,140,0.15)', color: '#888899', alignSelf: 'flex-start' }}>{person.occupation}</span>}
      <hr style={{ borderColor: '#2a2a3a', marginBottom: 12 }} />
      <InfoRow label="\u6d3b\u8dc3\u5e74\u4efd" value={`${person.active_from || '?'} - ${person.active_to || '\u81f3\u4eca'}`} />
      <InfoRow label="\u4e3b\u8981\u533a\u57df" value={person.district || '\u672a\u77e5'} />
      <InfoRow label="\u5173\u8054\u7ec4\u7ec7" value={person.organizations?.join('\u3001') || '\u65e0'} />
      <hr style={{ borderColor: '#2a2a3a', marginBlock: 12 }} />
      {person.is_anomaly && (
        <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>\u26a0 \u5386\u53f2\u5f02\u5e38\u6807\u6ce8</p>
          {person.anomaly_note && <p style={{ color: '#fca5a5', fontSize: 11 }}>{person.anomaly_note}</p>}</div>
      )}
      <p style={{ color: '#555566', fontSize: 10, marginTop: 'auto' }}>\u6570\u636e\u6765\u6e90: {person.source}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2 mb-2" style={{ fontSize: 12 }}><span style={{ color: '#888899', minWidth: 60 }}>{label}</span><span style={{ color: '#e8e8ea' }}>{value}</span></div>
}

function MiddlePanel({ person, rels, relPersons, relEvts, nav }: { person: P; rels: typeof relations; relPersons: P[]; relEvts: HistoricalEvent[]; nav: ReturnType<typeof import('react-router-dom').useNavigate> }) {
  const opt = useMemo(() => ({
    tooltip: { show: false },
    series: [{
      type: 'graph', layout: 'force', roam: true,
      data: [
        { id: person.id, name: person.name, symbolSize: 35, itemStyle: { color: '#f59e0b' } },
        ...relPersons.map(p => ({ id: p.id, name: p.name, symbolSize: 20, itemStyle: { color: '#e8e8ea' } })),
      ],
      links: rels.map(r => ({ source: r.source, target: r.target, lineStyle: { color: '#2a2a3a', width: r.strength * 2.5 } })),
      force: { repulsion: 250, edgeLength: [60, 150], gravity: 0.1 },
      label: { show: true, color: '#e5e7eb', fontSize: 10 },
      lineStyle: { curveness: 0.2 },
      emphasis: { focus: 'adjacency' },
    }],
  }), [person, relPersons, rels])
  const [graphKey, setGraphKey] = useState(0)
  useEffect(() => setGraphKey(k => k + 1), [person.id])

  return (
    <div className="flex flex-col" style={{ width: '40%' }}>
      <div style={{ height: '50%' }}>
        <p style={{ color: '#e8e8ea', fontSize: 14, fontWeight: 500, padding: '10px 14px 0' }}>\u5173\u7cfb\u7f51\u7edc</p>
        {relPersons.length > 0 ? (
          <ReactEChartsCore key={graphKey} echarts={echarts} option={opt} style={{ height: 'calc(100% - 30px)', width: '100%' }}
            onEvents={{ click: (ps: any) => { if (ps.dataType === 'node' && ps.data.id !== person.id) nav('/portrait/' + encodeURIComponent(ps.data.id)) } }} notMerge />
        ) : (
          <div className="flex items-center justify-center" style={{ height: 'calc(100% - 30px)', color: '#888899', fontSize: 13 }}>\u6682\u65e0\u5173\u8054\u6570\u636e</div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3" style={{ borderTop: '1px solid #1a1a25' }}>
        <p style={{ color: '#e8e8ea', fontSize: 14, fontWeight: 500, padding: '10px 0' }}>\u5173\u8054\u4e8b\u4ef6</p>
        {relEvts.length === 0 && <p style={{ color: '#888899', fontSize: 12 }}>\u6682\u65e0\u5173\u8054\u4e8b\u4ef6</p>}
        {relEvts.map((ev, i) => (
          <div key={ev.id || i} className="flex items-center gap-2 py-1.5 border-t" style={{ borderColor: '#1a1a25' }}>
            <span style={{ color: '#f59e0b', fontSize: 10, minWidth: 32 }}>{ev.year || '?'}</span>
            <span style={{ color: '#e8e8ea', fontSize: 12, lineHeight: 1.3 }} className="line-clamp-2">{ev.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RightPanel({ person, actEvts }: { person: P; actEvts: HistoricalEvent[] }) {
  return (
    <div className="flex flex-col p-5 overflow-y-auto" style={{ width: '35%' }}>
      <p style={{ color: '#e8e8ea', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>\u6d3b\u52a8\u8f68\u8ff9</p>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div style={{ position: 'absolute', left: 8, top: 4, bottom: 4, width: 2, backgroundColor: '#2a2a3a' }} />
        {actEvts.map((ev, i) => (
          <div key={ev.id || i} style={{ position: 'relative', paddingBottom: 12 }}>
            <div style={{ position: 'absolute', left: -14, top: 4, width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <div style={{ color: '#f59e0b', fontSize: 10, marginBottom: 1 }}>{ev.year}{ev.date ? ' ' + ev.date : ''}</div>
            <div style={{ color: '#e8e8ea', fontSize: 12, lineHeight: 1.4 }} className="line-clamp-2">{ev.name}</div>
          </div>
        ))}
        {actEvts.length === 0 && <p style={{ color: '#888899', fontSize: 12 }}>\u6682\u65e0\u6d3b\u52a8\u8bb0\u5f55</p>}
        {person.active_to && (
          <div style={{ position: 'relative', paddingBottom: 8 }}>
            <div style={{ position: 'absolute', left: -16, top: 4, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ color: '#ef4444', fontSize: 12, fontStyle: 'italic' }}>\u25cf \u6b64\u540e\u53f2\u6599\u4e2d\u672a\u89c1\u8bb0\u8f7d</div>
          </div>
        )}
      </div>
    </div>
  )
}
