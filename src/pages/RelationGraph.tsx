import React, { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePersons } from '../hooks/usePersons'
import relations from '../data/relations.json'

echarts.use([GraphChart, TooltipComponent, TitleComponent, CanvasRenderer])

import type { Person } from '../types'
type P = Person
type R = (typeof relations)[number]

const REL_META: Record<string, { color: string; label: string }> = {
  '合作': { color: '#f59e0b', label: '合作' },
  '文献共现': { color: '#6b7280', label: '文献共现' },
  '被同时逮捕': { color: '#ef4444', label: '被同时逮捕' },
  '同组织成员': { color: '#457b9d', label: '同组织成员' },
}

function occColor(occ: string): string {
  const o = occ || ''
  if (/[作家文学]/.test(o)) return '#e63946'
  if (/[编辑出版]/.test(o)) return '#f4a261'
  if (/[革命政治]/.test(o)) return '#2a9d8f'
  if (/[教]/.test(o)) return '#457b9d'
  return '#6a4c93'
}

export default function RelationGraph() {
  const [term, setTerm] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const nav = useNavigate()
  const { persons, loading } = usePersons()

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-500">加载数据中…</div>
  }

  const selPerson = persons.find(p => p.id === selId) || null

  const linkMeta = useMemo(() => {
    const m: Record<string, { color: string; dashed: boolean }> = {}
    for (const r of relations) {
      if (!m[r.type]) {
        const c = REL_META[r.type]?.color || '#374151'
        m[r.type] = { color: c, dashed: r.type === '文献共现' }
      }
    }
    return m
  }, [])

  const graphOpt = useMemo(() => {
    const nodes = persons.map(p => {
      const match = !term || p.name.includes(term)
      const occ = p.occupation || ''
      const relCnt = relations.filter(r => r.source === p.id || r.target === p.id).length
      return {
        id: p.id,
        name: p.name,
        symbolSize: p.is_anomaly ? 32 : 22,
        itemStyle: {
          color: occColor(occ),
          borderColor: p.is_anomaly ? '#ef4444' : 'transparent',
          borderWidth: p.is_anomaly ? 2 : 0,
          shadowBlur: p.is_anomaly ? 10 : 0,
          shadowColor: '#ef4444',
          opacity: match ? 1 : 0.1,
        },
        label: { show: true, color: '#e5e7eb', fontSize: 11, opacity: match ? 1 : 0.1 },
        _occ: occ,
        _from: p.active_from || 0,
        _to: p.active_to || 0,
        _relCnt: relCnt,
      }
    })
    const links = relations.map(r => {
      const srcMatch = !term || (persons.find(p => p.id === r.source)?.name || '').includes(term)
      const tgtMatch = !term || (persons.find(p => p.id === r.target)?.name || '').includes(term)
      const isDim = !srcMatch || !tgtMatch
      const meta = linkMeta[r.type] || { color: '#374151', dashed: false }
      return {
        source: r.source, target: r.target,
        lineStyle: {
          color: meta.color, width: r.strength * 3,
          type: meta.dashed ? 'dashed' as const : 'solid' as const,
          opacity: isDim ? 0.05 : 0.6,
        },
        emphasis: { lineStyle: { opacity: 1, width: r.strength * 5 } },
      }
    })
    return {
      tooltip: {
        formatter: (ps: any) => {
          const d = ps.data
          if (!d || !d.id) return ''
          const p = persons.find(x => x.id === d.id)
          if (!p) return ''
          const rc = relations.filter(r => r.source === p.id || r.target === p.id).length
          return '<div style="font-weight:700;color:#f59e0b;font-size:15px;margin-bottom:4px">' + p.name + '</div>' +
            '<div style="color:#888;font-size:12px">' + (p.occupation || '未知职业') + '</div>' +
            '<div style="color:#666;font-size:11px;margin-top:2px">' +
            (p.active_from || '?') + ' - ' + (p.active_to || '至今') + '</div>' +
            '<div style="color:#666;font-size:11px">关系 ' + rc + ' 条</div>'
        },
        backgroundColor: '#1a1a25', borderColor: '#2a2a3a',
        textStyle: { color: '#e8e8ea', fontSize: 12 },
      },
      series: [{
        type: 'graph', layout: 'force', roam: true, draggable: true,
        data: nodes, links: links,
        force: { repulsion: 400, edgeLength: [60, 200], gravity: 0.05, layoutAnimation: true },
        lineStyle: { curveness: 0.3 },
        edgeSymbol: ['none', 'none'],
        emphasis: { focus: 'adjacency' as const, lineStyle: { width: 4 } },
      }],
    }
  }, [term, linkMeta])

  const handleEvents = useMemo(() => ({
    click: (ps: any) => {
      if (ps.dataType === 'node' && ps.data?.id) setSelId(ps.data.id)
    },
    dblclick: (ps: any) => {
      if (ps.dataType === 'node' && ps.data?.id) nav('/portrait/' + encodeURIComponent(ps.data.id))
    },
  }), [nav])

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      {/* search bar */}
      <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: 60, backgroundColor: '#111118', borderBottom: '1px solid #2a2a3a' }}>
        <input type="text" value={term} onChange={e => setTerm(e.target.value)}
          placeholder="搜索人物姓名…"
          className="flex-1 max-w-xs px-3 py-1.5 rounded text-sm outline-none"
          style={{ backgroundColor: '#1f1f2e', border: '1px solid #2a2a3a', color: '#e8e8ea' }} />
        <div className="flex items-center gap-4 text-xs" style={{ color: '#888899' }}>
          {Object.values(REL_META).map((m, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: m.color, display: 'inline-block' }} />
              {m.label}
            </span>
          ))}
        </div>
      </div>
      {/* main area */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 min-w-0">
          <ReactEChartsCore echarts={echarts} option={graphOpt} style={{ height: '100%', width: '100%' }}
            onEvents={handleEvents} notMerge />
        </div>
        {/* right drawer */}
        <div className="shrink-0 overflow-y-auto transition-transform duration-300"
          style={{
            width: 280, backgroundColor: '#111118', borderLeft: '1px solid #2a2a3a',
            transform: selId ? 'translateX(0)' : 'translateX(100%)',
            position: 'absolute' as const, right: 0, top: 0, bottom: 0, zIndex: 10,
          }}>
          {selPerson && <PersonDrawer p={selPerson} nav={nav} onClose={() => setSelId(null)} />}
        </div>
      </div>
    </div>
  )
}

function PersonDrawer({ p, nav, onClose }: { p: P; nav: ReturnType<typeof useNavigate>; onClose: () => void }) {
  const relCnt = relations.filter(r => r.source === p.id || r.target === p.id).length
  return (
    <div className="p-5">
      <button onClick={onClose} className="float-right text-lg" style={{ color: '#666677' }}>✖</button>
      <h2 style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{p.name}</h2>
      {p.aliases && p.aliases.length > 0 && (
        <p style={{ color: '#666677', fontSize: 11, marginBottom: 4 }}>{p.aliases.join('、')}</p>
      )}
      {p.occupation && (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs mb-3"
          style={{ backgroundColor: 'rgba(128,128,140,0.15)', color: '#888899' }}>{p.occupation}</span>
      )}
      <p style={{ color: '#888899', fontSize: 11, marginBottom: 8 }}>
        活跃年份: {p.active_from || '?'} - {p.active_to || '至今'} | 关系 {relCnt} 条
      </p>
      {p.description && (
        <p className="line-clamp-3" style={{ color: '#e8e8ea', fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
          {p.description}
        </p>
      )}
      <button onClick={() => nav('/portrait/' + encodeURIComponent(p.id))}
        className="px-4 py-2 rounded text-sm font-medium w-full text-center"
        style={{ backgroundColor: '#d97706', color: '#0a0a0f' }}>
        查看完整画像 →
      </button>
    </div>
  )
}
