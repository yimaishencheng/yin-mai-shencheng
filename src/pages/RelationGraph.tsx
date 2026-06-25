import React, { useState, useMemo } from 'react'
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

const REL_META: Record<string, { color: string; label: string }> = {
  '合作': { color: '#d4a853', label: '深层革命合作' },
  '文献共现': { color: '#7a8a9e', label: '文献史料共现' },
  '被同时逮捕': { color: '#c44b4b', label: '被捕共患难关联' },
  '同组织成员': { color: '#3d5a80', label: '中共党团组织共属' },
}

function occColor(occ: string): string {
  const o = occ || ''
  if (/[作家编辑出版文学]/.test(o)) return '#9a815a'
  if (/[革命政治特委特科地下]/.test(o)) return '#d4a853'
  if (/[教大理学]/.test(o)) return '#3d5a80'
  return '#6e5a4f'
}

export default function RelationGraph() {
  const [term, setTerm] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const nav = useNavigate()
  const { persons, loading } = usePersons()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-4" style={{ borderColor: '#d4a853', borderTopColor: 'transparent' }} />
        <span className="text-xs font-serif tracking-widest" style={{ color: '#7a8a9e' }}>解密上海特科关系图谱...</span>
      </div>
    )
  }

  const selPerson = persons.find(p => p.id === selId) || null

  const linkMeta = useMemo(() => {
    const m: Record<string, { color: string; dashed: boolean }> = {}
    for (const r of relations) {
      if (!m[r.type]) {
        const c = REL_META[r.type]?.color || '#525f6e'
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
        symbolSize: p.is_anomaly ? 34 : 22,
        itemStyle: {
          color: occColor(occ),
          borderColor: p.is_anomaly ? '#c44b4b' : 'rgba(214,168,83,0.3)',
          borderWidth: p.is_anomaly ? 2.5 : 1,
          shadowBlur: p.is_anomaly ? 15 : 0,
          shadowColor: '#c44b4b',
          opacity: match ? 1 : 0.12,
        },
        label: {
          show: true,
          color: '#ececed',
          fontFamily: 'var(--font-serif)',
          fontSize: 11,
          opacity: match ? 1 : 0.12
        },
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
      const meta = linkMeta[r.type] || { color: '#525f6e', dashed: false }
      return {
        source: r.source,
        target: r.target,
        lineStyle: {
          color: meta.color,
          width: r.strength * 2.8,
          type: meta.dashed ? 'dashed' as const : 'solid' as const,
          opacity: isDim ? 0.04 : 0.55,
        },
        emphasis: { lineStyle: { opacity: 0.95, width: r.strength * 4.5 } },
      }
    })

    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (ps: any) => {
          const d = ps.data
          if (!d || !d.id) return ''
          const p = persons.find(x => x.id === d.id)
          if (!p) return ''
          const rc = relations.filter(r => r.source === p.id || r.target === p.id).length
          return `<div style="padding: 6px 10px; background-color:#12121a; border: 1px solid rgba(214,168,83,0.3); border-radius:4px">
            <div style="font-family:var(--font-serif);font-weight:700;color:#d4a853;font-size:14px;margin-bottom:4px">${p.name}</div>
            <div style="color:#7a8a9e;font-size:11px">${p.occupation || '暂未查明职业'}</div>
            <div style="color:#525f6e;font-size:10px;margin-top:4px">活跃年份: ${p.active_from || '?'} - ${p.active_to || '至今'}</div>
            <div style="color:#d4a853;font-size:10px">史料关联强度: ${rc} 处</div>
          </div>`
        },
        backgroundColor: 'transparent',
        borderWidth: 0,
        textStyle: { color: '#ececed', fontSize: 11 },
      },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        data: nodes,
        links: links,
        force: {
          repulsion: 380,
          edgeLength: [80, 180],
          gravity: 0.08,
          layoutAnimation: true
        },
        lineStyle: { curveness: 0.25 },
        edgeSymbol: ['none', 'none'],
        emphasis: { focus: 'adjacency' as const },
      }],
    }
  }, [term, linkMeta, persons])

  const handleEvents = useMemo(() => ({
    click: (ps: any) => {
      if (ps.dataType === 'node' && ps.data?.id) setSelId(ps.data.id)
    },
    dblclick: (ps: any) => {
      if (ps.dataType === 'node' && ps.data?.id) nav('/portrait/' + encodeURIComponent(ps.data.id))
    },
  }), [nav])

  return (
    <div className="h-full flex flex-col fade-in-up" style={{ backgroundColor: '#08080f' }}>
      {/* 检索条 & 关系分类指示 */}
      <div
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 64, backgroundColor: '#0c0c14', borderBottom: '2px solid rgba(214, 168, 83, 0.15)' }}
      >
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="🔍 输入特勤/革命人物姓名检索..."
            className="px-3 py-1.5 rounded text-xs outline-none w-64 transition-all duration-300 focus:w-80"
            style={{
              backgroundColor: '#12121a',
              border: '1px solid rgba(214, 168, 83, 0.2)',
              color: '#ececed'
            }}
          />
          <span className="text-[10px] italic hidden md:inline" style={{ color: '#525f6e' }}>提示: 双击人物节点可直接调阅详尽人物数字画像</span>
        </div>

        {/* 指标图例 */}
        <div className="flex items-center gap-5 text-[11px]" style={{ color: '#7a8a9e' }}>
          {Object.values(REL_META).map((m, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="font-serif">{m.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 主画布图谱 */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 min-w-0">
          <ReactEChartsCore
            echarts={echarts}
            option={graphOpt}
            style={{ height: '100%', width: '100%' }}
            onEvents={handleEvents}
            notMerge
          />
        </div>

        {/* 悬浮侧拉式人物简档抽屉 */}
        <div
          className="shrink-0 overflow-y-auto transition-all duration-300 shadow-2xl"
          style={{
            width: 300,
            backgroundColor: '#0c0c14',
            borderLeft: '2px solid rgba(214, 168, 83, 0.15)',
            transform: selId ? 'translateX(0)' : 'translateX(100%)',
            position: 'absolute' as const,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          {selPerson && <PersonDrawer p={selPerson} nav={nav} onClose={() => setSelId(null)} />}
        </div>
      </div>
    </div>
  )
}

function PersonDrawer({ p, nav, onClose }: { p: P; nav: ReturnType<typeof useNavigate>; onClose: () => void }) {
  const relCnt = relations.filter(r => r.source === p.id || r.target === p.id).length
  return (
    <div className="p-6 relative flex flex-col h-full">
      <div className="absolute top-2 right-2 rivet" />

      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-serif" style={{ color: '#525f6e' }}>[ 人物简报 ]</span>
        <button
          onClick={onClose}
          className="text-sm transition-colors hover:text-[#c44b4b] cursor-pointer"
          style={{ color: '#7a8a9e' }}
        >
          ✕ 关 闭
        </button>
      </div>

      <h2 className="font-serif text-xl font-bold tracking-widest mb-1.5" style={{ color: '#d4a853' }}>
        {p.name}
      </h2>

      {p.aliases && p.aliases.length > 0 && (
        <p className="text-xs italic mb-3" style={{ color: '#7a8a9e' }}>
          曾用化名：{p.aliases.join('、')}
        </p>
      )}

      {p.occupation && (
        <div className="mb-4">
          <span
            className="inline-block px-2 py-0.5 rounded text-[11px] font-serif"
            style={{ backgroundColor: 'rgba(214, 168, 83, 0.08)', color: '#d4a853', border: '1px solid rgba(214, 168, 83, 0.2)' }}
          >
            {p.occupation}
          </span>
        </div>
      )}

      <div className="border-t border-b border-dashed border-[#d4a853]/15 py-3 mb-5 text-xs flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span style={{ color: '#7a8a9e' }}>活跃年段:</span>
          <span style={{ color: '#ececed' }} className="font-serif">{p.active_from || '?'} - {p.active_to || '不详'}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#7a8a9e' }}>关联点广度:</span>
          <span style={{ color: '#ececed' }}>共 {relCnt} 处交叉关联</span>
        </div>
      </div>

      {p.description && (
        <div className="p-4 rounded text-xs leading-relaxed mb-6 flex-1 overflow-y-auto" style={{ backgroundColor: '#12121a', border: '1px solid rgba(214, 168, 83, 0.08)', color: '#ececed' }}>
          <p style={{ textIndent: '2em' }} className="line-clamp-6">{p.description}</p>
        </div>
      )}

      <button
        onClick={() => nav('/portrait/' + encodeURIComponent(p.id))}
        className="px-4 py-2.5 rounded text-xs font-serif font-bold tracking-widest w-full text-center hover:scale-102 hover:brightness-110 active:scale-98 transition-all duration-300"
        style={{ backgroundColor: '#d4a853', color: '#08080f' }}
      >
        查阅数字画像档案 →
      </button>
    </div>
  )
}
