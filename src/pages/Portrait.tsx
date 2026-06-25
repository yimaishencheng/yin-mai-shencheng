import React, { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import { usePersons } from '../hooks/usePersons'
import relations from '../data/relations.json'
import { useEvents } from '../hooks/useEvents'
import type { HistoricalEvent, Person } from '../types'

echarts.use([GraphChart, TooltipComponent, CanvasRenderer])
type P = Person

export default function Portrait() {
  const { personId } = useParams()
  const nav = useNavigate()
  const [st, setSt] = useState('')
  const { persons, loading } = usePersons()
  const id = personId ? decodeURIComponent(personId) : ''
  const { events } = useEvents()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-4" style={{ borderColor: '#d4a853', borderTopColor: 'transparent' }} />
        <span className="text-xs font-serif tracking-widest" style={{ color: '#7a8a9e' }}>解密人物机密生平卷宗中...</span>
      </div>
    )
  }

  const person = persons.find(p => p.id === id) || null
  const results = useMemo(() => persons.filter(p => p.name.includes(st)), [st, persons])

  if (id === 'search' || !personId) {
    return (
      <div className="h-full flex items-center justify-center fade-in-up" style={{ backgroundColor: '#08080f' }}>
        <div className="w-full max-w-xl px-6 py-12 rounded border" style={{ backgroundColor: '#0c0c14', borderColor: 'rgba(214, 168, 83, 0.18)', boxShadow: '0 12px 36px rgba(0,0,0,0.6)' }}>
          <div className="text-center mb-8 relative">
            <div className="absolute top-0 right-0 rivet" />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#7a8a9e' }}>Dossier Query Service</span>
            <h1 className="text-3xl font-bold font-serif tracking-wider mt-1" style={{ color: '#d4a853' }}>
              申城地下党特勤生平检索
            </h1>
            <p className="text-xs font-sans mt-2" style={{ color: '#7a8a9e' }}>
              请在下方输入拟校阅人物生平、代号或化名以调阅绝密生平。
            </p>
          </div>

          <input
            type="text"
            value={st}
            onChange={e => setSt(e.target.value)}
            placeholder="输入历史人物姓名（如：潘汉年、李白）..."
            className="w-full px-4 py-3 rounded text-sm outline-none transition-all focus:border-[#d4a853]/50"
            style={{
              backgroundColor: '#12121a',
              border: '1px solid rgba(214, 168, 83, 0.25)',
              color: '#ececed'
            }}
          />

          <div className="mt-6 flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => nav('/portrait/' + encodeURIComponent(p.id))}
                className="flex items-center justify-between w-full px-4 py-3 rounded text-left transition-all hover:bg-[#d4a853]/10 border"
                style={{
                  backgroundColor: '#12121a',
                  borderColor: 'rgba(214, 168, 83, 0.1)'
                }}
              >
                <div>
                  <div style={{ color: '#d4a853', fontSize: '14px', fontWeight: 600 }} className="font-serif">
                    {p.name}
                  </div>
                  <div style={{ color: '#7a8a9e', fontSize: '11px' }}>
                    {p.occupation || '生平社会职业不详'}
                  </div>
                </div>
                <div style={{ color: '#525f6e', fontSize: '11px' }} className="font-serif">
                  活跃段：{p.active_from || '?'}-{p.active_to || '不详'}
                </div>
              </button>
            ))}
            {st && results.length === 0 && (
              <div className="text-center py-6 text-xs" style={{ color: '#7a8a9e' }}>
                未在保密机要档案中检索到匹配人员
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="h-full flex items-center justify-center fade-in-up" style={{ backgroundColor: '#08080f' }}>
        <p className="text-xs font-serif" style={{ color: '#7a8a9e' }}>未找到该人物档案</p>
      </div>
    )
  }

  const rels = relations.filter(r => r.source === person.id || r.target === person.id)
  const relPids = new Set(rels.map(r => r.source === person.id ? r.target : r.source))
  const relPersons = persons.filter(p => relPids.has(p.id))
  const relEvts = events.filter(e => ((e as any).person_ids || []).includes(person.id) || e.description.includes(person.name)).slice(0, 10)
  const actEvts = events.filter(e => e.description.includes(person.name) || e.name.includes(person.name)).sort((a, b) => a.year - b.year)

  return (
    <div className="h-full flex flex-col fade-in-up" style={{ backgroundColor: '#08080f' }}>
      {/* 顶部简易返回条 */}
      <div className="px-6 py-3.5 shrink-0 flex items-center justify-between border-b" style={{ borderColor: 'rgba(214, 168, 83, 0.15)', backgroundColor: '#0c0c14' }}>
        <button
          onClick={() => nav('/portrait/search')}
          className="text-xs font-serif flex items-center gap-1.5 transition-colors hover:text-[#d4a853] cursor-pointer"
          style={{ color: '#7a8a9e' }}
        >
          <span>◀</span>
          <span>返回档案库柜架</span>
        </button>
        <span className="text-[10px] font-serif" style={{ color: '#525f6e' }}>[ 当前校阅机密号：SH-30-{person.id.slice(0,4).toUpperCase()} ]</span>
      </div>

      <div className="flex-1 flex min-h-0">
        <LeftPanel person={person} />
        <div style={{ width: 1, backgroundColor: 'rgba(214,168,83,0.12)' }} />
        <MiddlePanel person={person} rels={rels} relPersons={relPersons} relEvts={relEvts} nav={nav} />
        <div style={{ width: 1, backgroundColor: 'rgba(214,168,83,0.12)' }} />
        <RightPanel person={person} actEvts={actEvts} />
      </div>
    </div>
  )
}

function LeftPanel({ person }: { person: P }) {
  return (
    <div className="flex flex-col p-6 overflow-y-auto" style={{ width: '26%', backgroundColor: '#0c0c14' }}>
      <div className="text-center pb-5 mb-5 border-b border-double" style={{ borderColor: 'rgba(214,168,83,0.25)' }}>
        {/* 特科火漆印章 */}
        <div className="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-double flex items-center justify-center text-xs font-serif font-bold rotate-[-12deg]"
          style={{ borderColor: '#c44b4b', color: '#c44b4b', backgroundColor: 'rgba(196,75,75,0.04)' }}>
          密卷特科
        </div>

        <h2 className="font-serif text-2xl font-bold tracking-widest mb-1.5" style={{ color: '#d4a853' }}>
          {person.name}
        </h2>
        {person.aliases && person.aliases.length > 0 && (
          <p className="text-xs italic" style={{ color: '#7a8a9e' }}>
            化名、曾用名：{person.aliases.join('、')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3.5 mb-6 text-xs">
        <InfoRow label="社会公开身份" value={person.occupation || '未知职业'} />
        <InfoRow label="活跃历史年段" value={`${person.active_from || '?'} - ${person.active_to || '不详'}`} />
        <InfoRow label="主要革命区域" value={person.district || '暂无精确记载'} />
        <InfoRow label="党团秘密组织" value={person.organizations?.join('、') || '暂无登记'} />
      </div>

      {/* 人物异常历史标注 */}
      {person.is_anomaly && (
        <div className="p-4 rounded-md mb-5" style={{ backgroundColor: 'rgba(196, 75, 75, 0.08)', border: '1px solid rgba(196, 75, 75, 0.35)' }}>
          <p style={{ color: '#c44b4b', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
            ⚠️ 历史档案断裂警示
          </p>
          {person.anomaly_note && (
            <p className="text-[11px] leading-relaxed" style={{ color: '#fca5a5' }}>
              {person.anomaly_note}
            </p>
          )}
        </div>
      )}

      {person.description && (
        <div className="p-4 rounded text-xs leading-relaxed" style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.06)', color: '#ececed' }}>
          <p style={{ textIndent: '2em' }} className="line-clamp-6">{person.description}</p>
        </div>
      )}

      <p className="text-[10px] mt-auto text-center" style={{ color: '#525f6e' }}>
        史学界定考证出处: {person.source}
      </p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-dashed border-[#d4a853]/10">
      <span style={{ color: '#7a8a9e' }} className="font-serif">{label}</span>
      <span style={{ color: '#ececed', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function MiddlePanel({
  person,
  rels,
  relPersons,
  relEvts,
  nav
}: {
  person: P;
  rels: typeof relations;
  relPersons: P[];
  relEvts: HistoricalEvent[];
  nav: ReturnType<typeof import('react-router-dom').useNavigate>
}) {
  const opt = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      data: [
        { id: person.id, name: person.name, symbolSize: 32, itemStyle: { color: '#d4a853' } },
        ...relPersons.map(p => ({ id: p.id, name: p.name, symbolSize: 18, itemStyle: { color: '#7a8a9e' } })),
      ],
      links: rels.map(r => ({ source: r.source, target: r.target, lineStyle: { color: 'rgba(214,168,83,0.18)', width: r.strength * 2 } })),
      force: { repulsion: 180, edgeLength: [50, 120], gravity: 0.12 },
      label: { show: true, color: '#ececed', fontFamily: 'var(--font-serif)', fontSize: 10 },
      lineStyle: { curveness: 0.2 },
      emphasis: { focus: 'adjacency' },
    }],
  }), [person, relPersons, rels])

  const [graphKey, setGraphKey] = useState(0)
  useEffect(() => setGraphKey(k => k + 1), [person.id])

  return (
    <div className="flex flex-col" style={{ width: '40%' }}>
      {/* 局部社交图谱 */}
      <div style={{ height: '50%' }} className="relative border-b border-dashed border-[#d4a853]/12">
        <div className="absolute top-3 left-4 z-10">
          <p className="font-serif text-xs font-bold" style={{ color: '#d4a853' }}>直接关联网脉图谱</p>
        </div>

        {relPersons.length > 0 ? (
          <ReactEChartsCore
            key={graphKey}
            echarts={echarts}
            option={opt}
            style={{ height: '100%', width: '100%' }}
            onEvents={{
              click: (ps: any) => {
                if (ps.dataType === 'node' && ps.data.id !== person.id) {
                  nav('/portrait/' + encodeURIComponent(ps.data.id))
                }
              }
            }}
            notMerge
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: '#7a8a9e' }}>
            档案中未记有其他同案人物直接交叉网点
          </div>
        )}
      </div>

      {/* 关联涉案大事件 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <p className="font-serif text-xs font-bold mb-3" style={{ color: '#d4a853' }}>相关涉案历史纪要事件</p>
        {relEvts.length === 0 ? (
          <p className="text-xs italic" style={{ color: '#7a8a9e' }}>暂无直接考证史料事件</p>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
            {relEvts.map((ev, i) => (
              <div
                key={ev.id || i}
                className="p-2.5 rounded transition-colors hover:bg-[#0c0c14] border flex items-center justify-between gap-3"
                style={{ backgroundColor: '#12121a', borderColor: 'rgba(214,168,83,0.08)' }}
              >
                <div className="min-w-0">
                  <span style={{ color: '#c44b4b', fontSize: '10px' }} className="font-serif block mb-0.5">⏱ {ev.year || '?'} 年</span>
                  <span style={{ color: '#ececed', fontSize: '11.5px', fontWeight: 500 }} className="line-clamp-1">{ev.name}</span>
                </div>
                <span className="text-[9px] shrink-0 font-serif" style={{ color: '#525f6e' }}>[ 查看详案 ]</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RightPanel({ person, actEvts }: { person: P; actEvts: HistoricalEvent[] }) {
  return (
    <div className="flex flex-col p-6 overflow-y-auto" style={{ width: '34%', backgroundColor: '#0c0c14' }}>
      <p className="font-serif text-xs font-bold mb-5 pb-1 border-b border-dashed border-[#d4a853]/15" style={{ color: '#d4a853' }}>
        👣 地下活动轨迹与存亡纪年
      </p>

      <div className="relative pl-4 flex-1">
        {/* 时间脊骨连线 */}
        <div
          style={{
            position: 'absolute',
            left: '4px',
            top: '4px',
            bottom: '4px',
            width: '2px',
            background: 'linear-gradient(to bottom, #d4a853, rgba(212,168,83,0.1))'
          }}
        />

        {actEvts.map((ev, i) => (
          <div key={ev.id || i} style={{ position: 'relative', paddingBottom: '20px' }}>
            <div
              style={{
                position: 'absolute',
                left: '-16px',
                top: '3px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#d4a853',
                boxShadow: '0 0 4px #d4a853'
              }}
            />
            <div style={{ color: '#d4a853', fontSize: '10px', fontWeight: 700 }} className="font-serif mb-1">
              {ev.year}年{ev.date ? ' ' + ev.date : ''}
            </div>
            <div
              className="p-3 rounded text-[11px] leading-relaxed"
              style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.06)', color: '#ececed' }}
            >
              <span className="font-semibold text-xs block mb-1" style={{ color: '#ececed' }}>{ev.name}</span>
              <p className="line-clamp-3 text-[#7a8a9e]">{ev.description || '暂无详情'}</p>
            </div>
          </div>
        ))}

        {actEvts.length === 0 && (
          <p className="text-xs" style={{ color: '#7a8a9e' }}>暂无具体涉案活动时间节点登记</p>
        )}

        {/* 活动戛然而止的史学存疑视觉节点 */}
        {person.active_to && (
          <div style={{ position: 'relative', paddingBottom: '10px', marginTop: '10px' }}>
            <div
              style={{
                position: 'absolute',
                left: '-18px',
                top: '4px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#c44b4b',
                boxShadow: '0 0 6px #c44b4b'
              }}
            />
            <div className="p-3 rounded" style={{ backgroundColor: 'rgba(196, 75, 75, 0.05)', border: '1px solid rgba(196, 75, 75, 0.2)' }}>
              <div style={{ color: '#c44b4b', fontSize: '11.5px', fontWeight: 700 }} className="font-serif">
                ☠️ 存疑：此后断绝记载
              </div>
              <p className="text-[10px] mt-1 leading-normal" style={{ color: '#7a8a9e' }}>
                史料纪年自 {person.active_to} 年后再无该人活动，推测被捕、转移或英勇牺牲。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
