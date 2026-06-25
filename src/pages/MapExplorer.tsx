import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { usePersons } from '../hooks/usePersons'
import { usePlaces } from '../hooks/usePlaces'
import { useEvents } from '../hooks/useEvents'
import type { HistoricalEvent, Place } from '../types'
import { UnsealingLoader, SecretCompass } from '../components/Illustrations'

type Evt = HistoricalEvent

const TYPE_COLORS: Record<string, string> = {
  '书店': '#d4a853',
  '印刷厂': '#3d5a80',
  '报社': '#7a8a9e',
  '学校': '#6e5a4f',
  '历史遗址': '#c44b4b',
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

  // All hooks must be called unconditionally
  const allTypes = useMemo(() => {
    const s = new Set(places.filter(p => p.lat && p.lat !== 0).map(p => p.type))
    return Array.from(s).sort()
  }, [places])

  const visible = useFilter(places, year, selTypes)

  const personMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const p of persons) if (p.name && p.id) m[p.id] = p.name
    return m
  }, [persons])

  if (pLoading || plLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <UnsealingLoader />
        <span className="text-xs font-serif tracking-widest mt-4" style={{ color: '#7a8a9e' }}>秘密地图情报校准中...</span>
      </div>
    )
  }

  const toggleType = (t: string) => {
    setSelTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
    setSelId(null)
  }

  const selPlace = places.find(p => p.id === selId) || null

  const relatedEvents = useMemo(() => {
    if (!selPlace) return []
    const name = selPlace.name
    return events.filter(e =>
      (e.description && e.description.includes(name)) ||
      (e.name && e.name.includes(name))
    ).slice(0, 5)
  }, [selPlace, events])

  const totalOK = places.filter(p => p.lat && p.lat !== 0).length

  return (
    <div className="h-full flex fade-in-up" style={{ backgroundColor: '#08080f' }}>
      {/* 核心地图视口 */}
      <div className="relative h-full" style={{ flex: '1 1 calc(100% - 340px)' }}>
        <MapContainer
          center={[31.2304, 121.4737]}
          zoom={13}
          className="w-full h-full"
          zoomControl={false}
          attributionControl={false}
          style={{ backgroundColor: '#08080f' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

          {visible.map(pl => {
            const r = Math.min(6 + (pl.related_persons || []).length * 2, 18)
            const isAnomaly = pl.is_anomaly
            const cl = isAnomaly ? '#c44b4b' : (TYPE_COLORS[pl.type] || '#7a8a9e')
            return (
              <CircleMarker
                key={pl.id}
                center={[pl.lat, pl.lng]}
                radius={r}
                pathOptions={{
                  color: isAnomaly ? '#c44b4b' : cl,
                  fillColor: cl,
                  fillOpacity: isAnomaly ? 0.8 : 0.7,
                  weight: isAnomaly ? 3 : 1.5,
                  dashArray: isAnomaly ? '5,5' : undefined
                }}
                eventHandlers={{ click: () => setSelId(pl.id) }}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                  <div className="px-2 py-1 bg-[#12121a] border border-[#d4a853]/25 text-xs rounded text-[#ececed]">
                    <span className="font-serif block font-bold text-[#d4a853]">{pl.name}</span>
                    <span className="text-[10px] text-[#7a8a9e]">{pl.type} (活跃人数: {(pl.related_persons || []).length}人)</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* 顶部悬浮面板 - 编年纪控制卡片 */}
        <div className="absolute top-4 left-4 z-[1000] p-4 rounded bg-[#0c0c14]/95 border shadow-xl backdrop-blur max-w-sm" style={{ borderColor: 'rgba(214, 168, 83, 0.25)' }}>
          <div className="absolute top-1 right-1 rivet" />

          <div className="flex items-center gap-3 mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] tracking-wider" style={{ color: '#7a8a9e' }}>HISTORICAL ERA CONTROLLER</span>
              <span className="text-2xl font-bold font-serif" style={{ color: '#d4a853', letterSpacing: '1px' }}>
                民国 {year - 1911} 年 <span className="text-sm font-sans font-normal text-[#7a8a9e]">({year})</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-serif text-[#7a8a9e]">1919</span>
            <input
              type="range"
              min={1919}
              max={1945}
              value={year}
              onChange={e => { setYear(Number(e.target.value)); setSelId(null) }}
              className="flex-1 cursor-pointer h-1.5 rounded-lg appearance-none bg-neutral-800"
              style={{ accentColor: '#d4a853' }}
            />
            <span className="text-xs font-serif text-[#7a8a9e]">1945</span>
          </div>

          <div className="border-t border-dashed border-[#d4a853]/15 pt-3">
            <span className="text-[10px] block mb-2 tracking-wide font-serif text-[#7a8a9e]">网点性质分类筛选:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setSelTypes([]); setSelId(null) }}
                className="px-2.5 py-1 rounded text-[11px] font-serif transition-all"
                style={{
                  backgroundColor: selTypes.length === 0 ? 'rgba(214, 168, 83, 0.18)' : '#161622',
                  color: selTypes.length === 0 ? '#d4a853' : '#7a8a9e',
                  border: selTypes.length === 0 ? '1px solid rgba(214, 168, 83, 0.4)' : '1px solid rgba(214, 168, 83, 0.08)'
                }}
              >
                全部
              </button>
              {allTypes.map(t => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="px-2.5 py-1 rounded text-[11px] font-serif transition-all"
                  style={{
                    backgroundColor: selTypes.includes(t) ? 'rgba(214, 168, 83, 0.18)' : '#161622',
                    color: selTypes.includes(t) ? '#d4a853' : '#7a8a9e',
                    border: selTypes.includes(t) ? '1px solid rgba(214, 168, 83, 0.4)' : '1px solid rgba(214, 168, 83, 0.08)'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 图例浮动卡 */}
        <div className="absolute bottom-5 left-4 z-[1000] p-4 rounded bg-[#0c0c14]/90 border text-xs shadow-md backdrop-blur" style={{ borderColor: 'rgba(214, 168, 83, 0.18)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: 40, height: 40, opacity: 0.85 }}>
              <SecretCompass />
            </div>
            <span className="text-[10px] block font-serif text-[#7a8a9e] uppercase tracking-widest">图例索引</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(TYPE_COLORS).map(([t, c]) => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                <span style={{ color: '#7a8a9e' }}>{t}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: '#c44b4b', border: '1px solid #08080f' }} />
              <span style={{ color: '#c44b4b', fontWeight: 500 }}>异常标注点</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧边栏 - 复古档案夹设计 */}
      <div
        className="flex flex-col overflow-y-auto shrink-0"
        style={{
          width: 340,
          borderLeft: '2px solid rgba(214, 168, 83, 0.15)',
          backgroundColor: '#0c0c14',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.5)'
        }}
      >
        {selPlace ? (
          <PlaceDetail place={selPlace} events={relatedEvents} pMap={personMap} nav={nav} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-4xl mb-4 opacity-35 filter saturate-[0.1]">🗎</span>
            <h3 className="font-serif text-sm tracking-widest mb-1.5" style={{ color: '#d4a853' }}>申城旧迹备忘录</h3>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: '#7a8a9e' }}>
              请于左侧历史时空地图中，点击相应圆形档案红泥或金漆标记，以启阅绝密活动点案情。
            </p>
            <div className="px-4 py-2 mt-4 rounded border border-dashed border-[#d4a853]/15 text-[10px]" style={{ color: '#525f6e' }}>
              当前选定年份在册：{visible.length} 处 / 录入总量：{totalOK} 处
            </div>
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
    <div className="p-6 flex flex-col h-full">
      {/* 徽章标记 */}
      <div className="flex justify-between items-start mb-4">
        <span className="px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-serif" style={{ backgroundColor: 'rgba(214, 168, 83, 0.1)', color: '#d4a853', border: '1px solid rgba(214, 168, 83, 0.25)' }}>
          {place.type}
        </span>
        <span className="text-[10px] font-serif" style={{ color: '#525f6e' }}>[ 地理密级：特等 ]</span>
      </div>

      <h2 className="font-serif text-xl font-bold tracking-wide mb-1" style={{ color: '#d4a853' }}>
        {place.name}
      </h2>

      {place.address && (
        <p className="text-xs italic mb-4 pb-2 border-b border-dashed border-[#d4a853]/15" style={{ color: '#7a8a9e' }}>
          📍 历史原址：{place.address} ({place.district || '暂无区域'})
        </p>
      )}

      {/* 信函式叙述块 */}
      <div className="p-4 rounded mb-5 leading-relaxed text-xs" style={{ backgroundColor: '#12121a', border: '1px solid rgba(214, 168, 83, 0.08)', color: '#ececed', boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)' }}>
        <p style={{ textIndent: '2em' }}>{place.description}</p>
      </div>

      {/* 异常标注盖印 */}
      {place.is_anomaly && (
        <div className="p-4 rounded mb-5 relative overflow-hidden" style={{ backgroundColor: 'rgba(196, 75, 75, 0.08)', border: '1px solid rgba(196, 75, 75, 0.35)' }}>
          <div className="absolute top-[-10px] right-[-10px] text-[36px] font-bold opacity-[0.08] select-none text-[#c44b4b] uppercase font-serif">CRITICAL</div>
          <p style={{ color: '#c44b4b', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
            ⚠️ 史料完整度异常判定
          </p>
          {place.anomaly_note && <p className="text-[11px] mb-2 leading-relaxed" style={{ color: '#fca5a5' }}>{place.anomaly_note}</p>}
          {(place.anomaly_score ?? 0) > 0 && (
            <div className="w-full">
              <div className="flex justify-between text-[9px] text-[#7a8a9e] mb-1">
                <span>网络断裂拟合系数</span>
                <span>{Math.floor((place.anomaly_score ?? 0) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'rgba(122, 138, 158, 0.15)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: Math.min((place.anomaly_score ?? 0) * 100, 100) + '%', backgroundColor: '#c44b4b' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 关联人物贴签 */}
      {place.related_persons && place.related_persons.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-serif uppercase tracking-wider mb-2" style={{ color: '#7a8a9e' }}>关联活动人物</p>
          <div className="flex flex-wrap gap-1.5">
            {place.related_persons.map(pid => (
              <button
                key={pid}
                onClick={() => nav('/portrait/' + encodeURIComponent(pid))}
                className="px-2.5 py-1 rounded text-xs transition-all duration-200 hover:scale-102 flex items-center gap-1 hover:brightness-110 active:scale-98"
                style={{
                  backgroundColor: 'rgba(214, 168, 83, 0.08)',
                  color: '#d4a853',
                  border: '1px solid rgba(214, 168, 83, 0.25)'
                }}
              >
                <span>👤</span>
                <span className="font-serif">{pMap[pid] || '未知人员'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 备考事件清单 */}
      {events.length > 0 && (
        <div className="mt-auto pt-4 border-t border-dashed border-[#d4a853]/15">
          <p className="text-[10px] font-serif uppercase tracking-wider mb-2.5" style={{ color: '#7a8a9e' }}>网点历史大事件备查</p>
          <div className="flex flex-col gap-2">
            {events.map((ev, i) => (
              <div key={ev.id || i} className="p-2 rounded hover:bg-[#12121a] transition-colors flex items-start gap-2.5">
                <span className="font-serif text-[10px] px-1 py-0.5 rounded text-black shrink-0 font-semibold" style={{ backgroundColor: '#d4a853' }}>
                  {ev.year || '?'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-normal text-[#ececed] truncate">{ev.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
