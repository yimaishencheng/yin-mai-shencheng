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

const TABS = ['消逝的历史人物','高风险联络原址','机制断裂节点','低活跃缄默组织']

export default function Anomalies() {
  const [tab, setTab] = useState(0)
  const nav = useNavigate()
  const { persons, loading: pLoading } = usePersons()
  const { places, loading: plLoading } = usePlaces()

  // All hooks must be called unconditionally
  const broken = useMemo(() => findBroken(persons, relations), [persons])
  const orgs = useMemo(() => findOrgs(persons), [persons])
  const [expOrg, setExpOrg] = useState<string | null>(null)

  const statsData = [
    { label: '消逝人物登记', value: persons.filter(p=>p.is_anomaly).length, color: '#c44b4b' },
    { label: '可疑联络网点', value: places.filter(p=>p.is_anomaly).length, color: '#d4a853' },
    { label: '间接网络断裂', value: broken.length, color: '#3d5a80' },
    { label: '沉默历史群落', value: orgs.filter(o=>o.count===1).length, color: '#7a8a9e' },
  ]

  if (pLoading || plLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-4" style={{ borderColor: '#d4a853', borderTopColor: 'transparent' }} />
        <span className="text-xs font-serif tracking-widest" style={{ color: '#7a8a9e' }}>算法审计并归档异常文献中...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto fade-in-up" style={{ backgroundColor: '#08080f' }}>
      {/* 顶部面板 - 异常发现报告 */}
      <div className="px-8 pt-8 pb-6 shrink-0 border-b" style={{ borderColor: 'rgba(214,168,83,0.15)', backgroundColor: '#0c0c14' }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c44b4b' }} />
              <span className="text-[10px] tracking-wider uppercase" style={{ color: '#7a8a9e' }}>ANOMALY DIGEST & INTELLIGENCE AUDITING</span>
            </div>
            <h1 className="text-2xl font-bold font-serif tracking-widest" style={{ color: '#d4a853' }}>
              历史网络异常诊断
            </h1>
            <p className="text-xs mt-1" style={{ color: '#7a8a9e' }}>
              基于时空重合、文献缺失、联络骤断等要素，算法智能判定民国上海地下网络的潜在异常。
            </p>
          </div>
          <span className="text-[10px] font-serif" style={{ color: '#525f6e' }}>[ 算法拟合审计结果仅供学术研判参考 ]</span>
        </div>

        {/* 审计概览 */}
        <div className="flex gap-4 mt-6">
          {statsData.map((s, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center rounded py-3.5 relative"
              style={{
                backgroundColor: '#12121a',
                border: '1px solid rgba(214, 168, 83, 0.12)',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
              }}
            >
              <div className="absolute top-1 right-1 rivet" />
              <span style={{ color: s.color, fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>{s.value}</span>
              <span style={{ color: '#7a8a9e', fontSize: '11px', marginTop: '2px' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 导航标签页组 */}
      <div className="flex gap-8 px-8 shrink-0 bg-[#0a0a12]" style={{ borderBottom: '1px solid rgba(214,168,83,0.12)' }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className="transition-all py-3.5 text-xs tracking-wider cursor-pointer font-serif relative"
            style={{
              color: tab === i ? '#d4a853' : '#7a8a9e',
              fontWeight: tab === i ? 700 : 400
            }}
          >
            {t}
            {tab === i && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: '#d4a853' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 各标签视图 */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#08080f]">
        {tab === 0 && <Tab1 persons={persons} nav={nav} />}
        {tab === 1 && <Tab2 places={places} nav={nav} />}
        {tab === 2 && <Tab3 broken={broken} persons={persons} nav={nav} />}
        {tab === 3 && <Tab4 orgs={orgs} expOrg={expOrg} setExpOrg={setExpOrg} persons={persons} />}
      </div>
    </div>
  )
}

function Tab1({ persons, nav }: { persons: Person[]; nav: ReturnType<typeof import('react-router-dom').useNavigate> }) {
  const items = persons.filter(p => p.is_anomaly)
  return (
    <div className="flex flex-col gap-3 max-w-4xl">
      {items.length === 0 && <p className="text-xs italic" style={{ color: '#7a8a9e' }}>暂无断裂消逝历史人物登记</p>}
      {items.map(p => (
        <button
          key={p.id}
          onClick={() => nav('/portrait/' + encodeURIComponent(p.id))}
          className="flex items-center gap-6 w-full rounded p-4 text-left transition-all hover:bg-[#d4a853]/5 border group"
          style={{ backgroundColor: '#0c0c14', borderColor: 'rgba(214, 168, 83, 0.12)' }}
        >
          <div className="flex flex-col shrink-0" style={{ width: 140 }}>
            <span style={{ color: '#d4a853', fontSize: '15px', fontWeight: 700 }} className="font-serif group-hover:underline">
              👤 {p.name}
            </span>
            {p.occupation && (
              <span
                className="inline-block px-1.5 py-0.5 rounded text-[10px] mt-1.5 font-sans"
                style={{ backgroundColor: 'rgba(214,168,83,0.06)', color: '#7a8a9e', border: '1px solid rgba(214,168,83,0.15)', alignSelf: 'flex-start' }}
              >
                {p.occupation}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px]" style={{ color: '#525f6e' }}>活跃生平轨迹起止：</span>
              <span style={{ color: '#ececed', fontSize: '11.5px' }} className="font-serif">{p.active_from || '?'} 年 - {p.active_to || '至今'}</span>
            </div>

            {/* 时间轴进度指示 */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <div className="h-1 bg-[#1d1d28] rounded-full relative flex-1">
                  <div className="absolute left-0 top-0 h-1 rounded-full bg-[#3d5a80]" style={{ width: '65%' }} />
                  <div className="absolute left-[65%] top-[-3px] w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c44b4b', boxShadow: '0 0 4px #c44b4b' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 max-w-xs text-right">
            <span className="text-[11px]" style={{ color: '#c44b4b', fontWeight: 600 }}>史料记载骤然断裂于 {p.active_to} 年</span>
            {p.anomaly_note && (
              <span className="text-[10px] mt-0.5 line-clamp-1" style={{ color: '#7a8a9e' }}>
                {p.anomaly_note}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function Tab2({ places, nav }: { places: Place[]; nav: ReturnType<typeof import('react-router-dom').useNavigate> }) {
  const items = places.filter(p => p.is_anomaly).sort((a,b) => (b.anomaly_score||0) - (a.anomaly_score||0))
  return (
    <div className="flex flex-col gap-3 max-w-4xl">
      {items.length === 0 && <p className="text-xs italic" style={{ color: '#7a8a9e' }}>暂无高风险可疑原址档案</p>}
      {items.map(pl => (
        <button
          key={pl.id}
          onClick={() => nav('/map?highlight=' + encodeURIComponent(pl.id))}
          className="flex items-center gap-6 w-full rounded p-4 text-left transition-all hover:bg-[#d4a853]/5 border group"
          style={{ backgroundColor: '#0c0c14', borderColor: 'rgba(214, 168, 83, 0.12)' }}
        >
          <div className="flex flex-col flex-1 gap-2">
            <div className="flex items-center gap-2.5">
              <span style={{ color: '#d4a853', fontSize: '15px', fontWeight: 700 }} className="font-serif group-hover:underline">
                📍 {pl.name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(214,168,83,0.06)', color: '#7a8a9e', border: '1px solid rgba(214,168,83,0.12)' }}>
                {pl.type}
              </span>
              {pl.district && <span style={{ color: '#525f6e', fontSize: '10px' }}>区域：{pl.district}</span>}
            </div>

            <div className="flex items-center gap-6">
              <div style={{ minWidth: '80px' }}>
                <span className="text-[10px] block" style={{ color: '#525f6e' }}>关联已知人物：</span>
                <span style={{ color: '#ececed', fontSize: '14px', fontWeight: 700 }} className="font-serif">
                  {(pl.related_persons||[]).length} <span className="text-[10px] font-sans font-normal text-[#7a8a9e]">人</span>
                </span>
              </div>

              <div className="flex-1">
                <div className="flex justify-between text-[9px] mb-1 text-[#7a8a9e]">
                  <span>时空交叉点可疑评分</span>
                  <span style={{ color: '#c44b4b', fontWeight: 600 }}>{(pl.anomaly_score||0).toFixed(2)}</span>
                </div>
                <div className="w-full h-1.5 bg-[#1d1d28] rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: Math.min((pl.anomaly_score||0)*100, 100) + '%',
                      backgroundColor: '#c44b4b'
                    }}
                  />
                </div>
              </div>
            </div>

            {pl.anomaly_note && (
              <p className="text-[11px] leading-relaxed italic" style={{ color: '#7a8a9e' }}>
                案卷备注: {pl.anomaly_note}
              </p>
            )}
          </div>

          <div className="shrink-0 rounded border overflow-hidden shadow-lg" style={{ width: 130, height: 86, borderColor: 'rgba(214,168,83,0.18)' }}>
            {pl.lat && pl.lat !== 0 && (
              <MapContainer
                center={[pl.lat, pl.lng]}
                zoom={14}
                style={{ width: 130, height: 86 }}
                zoomControl={false}
                attributionControl={false}
                scrollWheelZoom={false}
                dragging={false}
                key={pl.id}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <CircleMarker center={[pl.lat, pl.lng]} radius={4} pathOptions={{ color: '#c44b4b', fillColor: '#c44b4b', fillOpacity: 1 }} />
              </MapContainer>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function Tab3({ broken, persons, nav }: {
  broken: {a:string;b:string;c:string}[];
  persons: Person[];
  nav: ReturnType<typeof import('react-router-dom').useNavigate>
}) {
  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {broken.length === 0 && (
        <p className="text-xs italic" style={{ color: '#7a8a9e' }}>暂无机制断裂节点数据，历史网络密度正常</p>
      )}
      {broken.map((item, i) => {
        const pa = persons.find(p => p.id === item.a)
        const pb = persons.find(p => p.id === item.b)
        const pc = persons.find(p => p.id === item.c)
        if (!pa || !pb || !pc) return null
        return (
          <div key={i} className="rounded-lg p-6 relative" style={{ backgroundColor: '#0c0c14', border: '1px solid rgba(214, 168, 83, 0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            <div className="absolute top-2 right-2 rivet" />

            <div className="flex items-center justify-center gap-2 mb-4">
              {/* 人物 A */}
              <button
                onClick={() => nav('/portrait/' + encodeURIComponent(pa.id))}
                className="flex flex-col items-center transition-transform hover:scale-105 cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-serif font-bold"
                  style={{ backgroundColor: 'rgba(212,168,83,0.1)', color: '#d4a853', border: '2px solid rgba(212,168,83,0.3)' }}>
                  {pa.name[0]}
                </div>
                <span className="text-xs mt-1.5 font-serif" style={{ color: '#d4a853' }}>{pa.name}</span>
              </button>

              {/* 虚线连接 - 中介节点 */}
              <div className="flex items-center" style={{ flex: '0 0 auto', maxWidth: 100, minWidth: 60 }}>
                <div style={{ flex: 1, height: 0, borderTop: '2px dashed rgba(212,168,83,0.2)' }} />
              </div>

              {/* 断裂中介人 */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-serif font-bold"
                  style={{ backgroundColor: 'rgba(196,75,75,0.1)', color: '#c44b4b', border: '2px dashed #c44b4b', boxShadow: '0 0 12px rgba(196,75,75,0.3)' }}>
                  ?
                </div>
                <span className="text-xs mt-1.5 font-serif" style={{ color: '#c44b4b', fontWeight: 600 }}>{pc.name}</span>
              </div>

              {/* 虚线连接 */}
              <div className="flex items-center" style={{ flex: '0 0 auto', maxWidth: 100, minWidth: 60 }}>
                <div style={{ flex: 1, height: 0, borderTop: '2px dashed rgba(212,168,83,0.2)' }} />
              </div>

              {/* 人物 B */}
              <button
                onClick={() => nav('/portrait/' + encodeURIComponent(pb.id))}
                className="flex flex-col items-center transition-transform hover:scale-105 cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-serif font-bold"
                  style={{ backgroundColor: 'rgba(212,168,83,0.1)', color: '#d4a853', border: '2px solid rgba(212,168,83,0.3)' }}>
                  {pb.name[0]}
                </div>
                <span className="text-xs mt-1.5 font-serif" style={{ color: '#d4a853' }}>{pb.name}</span>
              </button>
            </div>

            {/* 案卷分析文字 */}
            <div className="text-center px-6 py-3 rounded border border-dashed border-[#d4a853]/10"
              style={{ backgroundColor: '#12121a' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#7a8a9e' }}>
                <span className="font-serif font-bold text-[#d4a853]">{pa.name}</span>
                <span className="text-[#7a8a9e]"> 与 </span>
                <span className="font-serif font-bold text-[#d4a853]">{pb.name}</span>
                <span className="text-[#7a8a9e]"> 分别通过 </span>
                <span className="font-serif font-bold text-[#c44b4b]">{pc.name}</span>
                <span className="text-[#7a8a9e]"> 存在间接关联，但两人之间未见直接史料记载。该拓扑结构属"知识图谱空洞节点"。</span>
              </p>
            </div>

            {/* 断裂节点编号 */}
            <div className="mt-4 flex items-center justify-between text-[9px]" style={{ color: '#525f6e' }}>
              <span className="font-serif">[ 断裂记录归档号：FR-1930-{i.toString().padStart(3, '0')} ]</span>
              <span className="font-serif text-[#c44b4b]">⚠ 潜在风险等级：中等</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Tab4({ orgs, expOrg, setExpOrg, persons }: {
  orgs: {org:string;count:number;ids:string[]}[];
  expOrg: string|null;
  setExpOrg: (v:string|null) => void;
  persons: Person[]
}) {
  const nav = useNavigate()
  return (
    <div className="max-w-4xl">
      {orgs.length === 0 && <p className="text-xs italic" style={{ color: '#7a8a9e' }}>暂无登记组织数据</p>}
      {orgs.map(o => {
        const anomalyScore = Math.min(o.count / 5, 1)
        const riskColor = anomalyScore > 0.6 ? '#c44b4b' : anomalyScore > 0.3 ? '#d4a853' : '#7a8a9e'
        const riskLabel = anomalyScore > 0.6 ? '高风险' : anomalyScore > 0.3 ? '中等风险' : '低风险'
        const members = o.ids.map(pid => persons.find(x => x.id === pid)).filter(Boolean) as Person[]

        return (
          <div key={o.org} className="rounded-lg mb-3 relative" style={{ backgroundColor: '#0c0c14', border: '1px solid rgba(214, 168, 83, 0.12)' }}>
            <div className="absolute top-2 right-2 rivet" />

            <button
              onClick={() => setExpOrg(expOrg === o.org ? null : o.org)}
              className="flex items-center gap-4 w-full p-4 text-left transition-colors hover:bg-[#d4a853]/3"
              style={{ background: 'none', cursor: 'pointer' }}
            >
              {/* 组织名称 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span style={{ color: '#d4a853', fontSize: '15px', fontWeight: 700 }} className="font-serif">
                    🏛 {o.org}
                  </span>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-6 shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-serif font-bold" style={{ color: '#d4a853' }}>{o.count}</span>
                  <span className="text-[10px]" style={{ color: '#7a8a9e' }}>已知成员</span>
                </div>

                {/* 异常指数进度条 */}
                <div style={{ width: 120 }}>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span style={{ color: '#7a8a9e' }}>踪迹完整度</span>
                    <span style={{ color: riskColor, fontWeight: 600 }}>{anomalyScore.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1d1d28] rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: (anomalyScore * 100) + '%', backgroundColor: riskColor }}
                    />
                  </div>
                </div>

                {/* 风险标签 */}
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-serif shrink-0"
                  style={{
                    backgroundColor: anomalyScore > 0.6 ? 'rgba(196,75,75,0.1)' : anomalyScore > 0.3 ? 'rgba(212,168,83,0.1)' : 'rgba(122,138,158,0.08)',
                    color: riskColor,
                    border: `1px solid ${riskColor}33`
                  }}
                >
                  {riskLabel}
                </span>

                <span className="text-[10px] ml-1" style={{ color: '#525f6e' }}>
                  {expOrg === o.org ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* 展开的成员列表 */}
            {expOrg === o.org && (
              <div className="px-4 pb-5 pt-2 border-t" style={{ borderColor: 'rgba(214,168,83,0.1)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-3" style={{ backgroundColor: '#d4a853' }} />
                  <span className="text-[10px] font-serif tracking-wider" style={{ color: '#7a8a9e' }}>
                    在册成员名册
                  </span>
                  <span className="text-[9px] ml-2" style={{ color: '#525f6e' }}>
                    [ 密级：待解密 ]
                  </span>
                </div>

                {members.length === 0 ? (
                  <p className="text-xs italic px-3" style={{ color: '#7a8a9e' }}>成员名册已散佚，暂无史料查考</p>
                ) : (
                  <div className="flex flex-wrap gap-2 px-2">
                    {members.map(person => (
                      <button
                        key={person.id}
                        onClick={(e) => { e.stopPropagation(); nav('/portrait/' + encodeURIComponent(person.id)) }}
                        className="px-3 py-1.5 rounded text-xs transition-all hover:scale-102 hover:brightness-110 flex items-center gap-1.5"
                        style={{
                          backgroundColor: person.is_anomaly ? 'rgba(196,75,75,0.08)' : 'rgba(212,168,83,0.06)',
                          color: person.is_anomaly ? '#c44b4b' : '#d4a853',
                          border: person.is_anomaly ? '1px solid rgba(196,75,75,0.25)' : '1px solid rgba(212,168,83,0.18)',
                          cursor: 'pointer'
                        }}
                      >
                        <span className="text-[10px]">👤</span>
                        <span className="font-serif">{person.name}</span>
                        {person.is_anomaly && (
                          <span className="text-[9px] ml-0.5" style={{ color: '#c44b4b' }}>⚠</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
