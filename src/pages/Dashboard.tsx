import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { TooltipComponent, GridComponent, GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { MapContainer, CircleMarker, TileLayer, Tooltip } from 'react-leaflet'
import { usePersons } from '../hooks/usePersons'
import { usePlaces } from '../hooks/usePlaces'
import { useEvents } from '../hooks/useEvents'
import { useOrganizations } from '../hooks/useOrganizations'
import relations from '../data/relations.json'
import { HeroSilhouette, UnsealingLoader } from '../components/Illustrations'

echarts.use([
  LineChart,
  TooltipComponent,
  GridComponent,
  GraphicComponent,
  CanvasRenderer
])

function useCountUp(end: number, dur = 1200) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (end === 0) { setV(0); return }
    const t0 = Date.now()
    const id = setInterval(() => {
      const p = Math.min((Date.now() - t0) / dur, 1)
      setV(Math.floor(p * end))
      if (p >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [end, dur])
  return v
}

// 融合民国色板
const THEME_COLORS = ['#c44b4b', '#d4a853', '#3d5a80', '#7a8a9e', '#6e5a4f', '#4e5a65', '#9a815a']

export default function Dashboard() {
  const nav = useNavigate()
  const { persons, loading: pLoading } = usePersons()
  const { places, loading: plLoading } = usePlaces()
  const { events, loading: eLoading } = useEvents()
  const { organizations, loading: oLoading } = useOrganizations()

  if (pLoading || plLoading || eLoading || oLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <UnsealingLoader />
        <span className="text-sm font-serif tracking-wider mt-4" style={{ color: '#7a8a9e' }}>正在启封上海地下党历史档案...</span>
      </div>
    )
  }

  const stats = [
    { label: '载册历史人物', value: persons.length, color: '#d4a853', icon: '👤' },
    { label: '革命活动遗址', value: places.filter(p => p.lat && p.lat !== 0).length, color: '#d4a853', icon: '📍' },
    { label: '录入重大事件', value: events.length, color: '#d4a853', icon: '📜' },
    { label: '异常断裂标注', value: places.filter(p => p.is_anomaly).length, color: '#c44b4b', icon: '⚠️' },
  ]

  const degreeMap: Record<string, number> = {}
  for (const r of relations) {
    degreeMap[r.source] = (degreeMap[r.source] || 0) + 1
    degreeMap[r.target] = (degreeMap[r.target] || 0) + 1
  }
  const topPersons = persons
    .map(p => ({ person: p, degree: degreeMap[p.id] || 0 }))
    .filter(x => x.degree > 0)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 8)

  const archiveIndex = [
    { label: '人物档案', value: persons.length, color: '#d4a853' },
    { label: '地点索引', value: places.length, color: '#3d5a80' },
    { label: '事件卷宗', value: events.length, color: '#c44b4b' },
    { label: '机构名册', value: organizations.length, color: '#7a8a9e' },
    { label: '情报连线', value: relations.length, color: '#c44b4b' },
    { label: '完整人物', value: persons.filter(p => !p.is_incomplete).length, color: '#d4a853' },
  ]

  // Events by year (1919-1945)
  const yearMap: Record<number, number> = {}
  for (const e of events) {
    const y = e.year
    if (y >= 1919 && y <= 1945) yearMap[y] = (yearMap[y] || 0) + 1
  }
  const years = Array.from({ length: 1945 - 1919 + 1 }, (_, i) => 1919 + i)
  const yearData = years.map(y => yearMap[y] || 0)

  const peak = Math.max(0, ...yearData)
  const peakYear = years[yearData.indexOf(peak)]

  const lineOpt = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      textStyle: { color: '#ececed', fontFamily: 'var(--font-archive)', fontSize: 11 },
      backgroundColor: 'rgba(18, 18, 26, 0.96)',
      borderColor: 'rgba(196, 75, 75, 0.35)',
      borderWidth: 1
    },
    grid: { left: '9%', right: '5%', top: '18%', bottom: '18%' },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: years.map(String),
      axisLine: { lineStyle: { color: 'rgba(122, 138, 158, 0.2)' } },
      axisTick: { show: false },
      axisLabel: { color: '#7a8a9e', fontSize: 9, rotate: 30, fontFamily: 'var(--font-archive)' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisLabel: { color: '#7a8a9e', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(122, 138, 158, 0.12)', type: 'dashed' } }
    },
    series: [{
      type: 'line',
      data: yearData,
      smooth: true,
      symbol: 'rect',
      symbolSize: 6,
      showSymbol: false,
      lineStyle: {
        color: '#c44b4b',
        width: 2.2,
        shadowBlur: 12,
        shadowColor: 'rgba(196, 75, 75, 0.65)'
      },
      itemStyle: { color: '#d4a853', borderColor: '#c44b4b', borderWidth: 1 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(196, 75, 75, 0.34)' },
          { offset: 0.5, color: 'rgba(214, 168, 83, 0.12)' },
          { offset: 1, color: 'rgba(214, 168, 83, 0)' }
        ])
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: 'rgba(196, 75, 75, 0.35)', type: 'dashed' },
        label: { color: '#525f6e', fontSize: 9, fontFamily: 'var(--font-archive)' },
        data: [{ xAxis: '1927' }, { xAxis: '1932' }, { xAxis: '1937' }]
      },
      markPoint: {
        symbol: 'pin',
        symbolSize: 36,
        itemStyle: { color: 'rgba(196, 75, 75, 0.92)', borderColor: '#d4a853', borderWidth: 1 },
        label: { color: '#08080f', fontWeight: 700, fontSize: 9, fontFamily: 'var(--font-archive)' },
        data: [{ coord: [String(peakYear), peak], value: String(peak) }]
      }
    }],
  }

  const mapPlaces = places.filter(p => p.lat && p.lat !== 0)

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col fade-in-up" style={{ backgroundColor: '#08080f' }}>
      <style>{`
        @keyframes subtle-pulse {
          0% { box-shadow: 0 0 0 0 rgba(212, 168, 83, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(212, 168, 83, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 168, 83, 0); }
        }
        .republican-btn-pulse {
          animation: subtle-pulse 2s infinite;
        }
      `}</style>

      {/* ── 顶部数据及刊头区域 ── */}
      <div className="flex items-center justify-between px-8 shrink-0 border-b relative overflow-hidden" style={{ height: '14%', backgroundColor: '#0c0c14', borderColor: 'rgba(214, 168, 83, 0.15)' }}>
        {/* 背景装饰：申城暗脉插画 */}
        <div className="absolute inset-0 opacity-30">
          <HeroSilhouette style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice" />
        </div>
        <div className="flex flex-col relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c44b4b' }} />
            <span className="text-[10px] tracking-wider uppercase" style={{ color: '#7a8a9e' }}>Shanghai Secret Agent Intelligence Visualization Platform</span>
          </div>
          <h1 className="republican-header text-3xl font-bold tracking-widest" style={{ color: '#d4a853', fontFamily: 'var(--font-serif)' }}>
            隐脉申城
          </h1>
          <p className="text-xs font-sans mt-0.5" style={{ color: '#7a8a9e', opacity: 0.8 }}>
            1930年代上海地下党情报、活动网点及秘密联络机制数字还原
          </p>
        </div>

        <div className="flex gap-4 flex-1 max-w-4xl ml-12">
          {stats.map((s, i) => (
            <StatCard key={i} value={s.value} label={s.label} color={s.color} icon={s.icon} />
          ))}
        </div>
      </div>

      {/* ── 图表网格区域 (提升呼吸感) ── */}
      <div className="flex shrink-0" style={{ height: '51%', borderBottom: '1px solid rgba(214, 168, 83, 0.12)', backgroundColor: '#0a0a12' }}>
        <ChartPanel
          title="革命活动历史年代分布 (1919-1945)"
          code="1930-A"
          summary={`峰值 ${peakYear} 年 · ${peak} 条`}
          style={{ width: '36%' }}
        >
          <ReactEChartsCore echarts={echarts} option={lineOpt} style={{ height: '100%', width: '100%' }} notMerge />
        </ChartPanel>
        <div style={{ width: '1px', backgroundColor: 'rgba(214, 168, 83, 0.12)' }} />
        <ChartPanel
          title="重点人物速查"
          code="1930-B"
          summary={`关联广度最高 ${topPersons[0]?.person.name || '暂无'}`}
          style={{ width: '30%' }}
        >
          <div className="flex flex-col gap-1.5 overflow-y-auto h-full pr-1">
            {topPersons.map(({ person, degree }, i) => (
              <button
                key={person.id}
                onClick={() => nav('/portrait/' + encodeURIComponent(person.id))}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded text-left transition-all hover:bg-[#d4a853]/10"
                style={{ backgroundColor: 'rgba(18,18,26,0.72)', border: '1px solid rgba(214,168,83,0.1)' }}
              >
                <span className="font-serif text-[10px] shrink-0" style={{ color: '#c44b4b' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="font-serif text-xs truncate flex-1" style={{ color: '#d4a853' }}>{person.name}</span>
                <span className="text-[9px] shrink-0" style={{ color: '#7a8a9e' }}>{degree} 条连线</span>
              </button>
            ))}
          </div>
        </ChartPanel>
        <div style={{ width: '1px', backgroundColor: 'rgba(214, 168, 83, 0.12)' }} />
        <ChartPanel
          title="档案馆藏索引"
          code="1930-C"
          summary={`在库总量 ${archiveIndex.reduce((sum, item) => sum + item.value, 0)}`}
          style={{ width: '34%' }}
        >
          <div className="grid grid-cols-2 gap-2 overflow-y-auto h-full pr-1">
            {archiveIndex.map(item => (
              <div
                key={item.label}
                className="relative p-2.5 rounded overflow-hidden"
                style={{ backgroundColor: 'rgba(18,18,26,0.72)', border: '1px solid rgba(214,168,83,0.1)' }}
              >
                <span className="font-serif text-lg font-bold block" style={{ color: item.color }}>{item.value.toLocaleString()}</span>
                <span className="text-[10px]" style={{ color: '#7a8a9e' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>

      {/* ── 底部数字底图区 ── */}
      <div className="flex-1 relative overflow-hidden">
        <MapContainer
          center={[31.2304, 121.4737]}
          zoom={12}
          className="w-full h-full"
          zoomControl={false}
          attributionControl={false}
          style={{ backgroundColor: '#08080f' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {mapPlaces.map((pl) => {
            const isAnomaly = pl.is_anomaly
            return (
              <CircleMarker
                key={pl.id}
                center={[pl.lat, pl.lng]}
                pathOptions={{
                  color: isAnomaly ? '#c44b4b' : '#d4a853',
                  fillColor: isAnomaly ? '#c44b4b' : '#3d5a80',
                  fillOpacity: 0.65,
                  weight: isAnomaly ? 2 : 1,
                }}
                radius={isAnomaly ? 10 : 5}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={0.9} className="custom-leaflet-tooltip">
                  <div className="px-2 py-1 bg-[#161620] border border-[#d4a853]/30 text-xs rounded text-[#ececed]">
                    <span className="font-serif block font-bold text-[#d4a853]">{pl.name}</span>
                    <span className="text-[10px] text-[#7a8a9e]">{pl.type} | {pl.address || '暂无详细地址'}</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* 地理信息指示框 */}
        <div className="absolute top-4 left-6 z-[1000] flex items-center gap-3 bg-[#0c0c14]/90 border border-[#d4a853]/20 px-4 py-2.5 rounded shadow-lg backdrop-blur">
          <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: '#d4a853' }} />
          <div>
            <span className="text-[11px] block text-[#7a8a9e] tracking-wider font-serif">地理信息系统已加载</span>
            <span className="text-xs text-[#ececed] font-medium font-sans">申城地下联络点实时图层分布</span>
          </div>
        </div>

        {/* 契合民国排版的主按钮 */}
        <button
          onClick={() => nav('/map')}
          className="absolute bottom-6 right-8 z-[1000] px-6 py-3 rounded-md text-sm font-serif font-semibold tracking-widest transition-all duration-300 hover:scale-102 hover:brightness-110 active:scale-98 shadow-md hover:shadow-lg republican-btn-pulse flex items-center gap-2"
          style={{
            backgroundColor: '#d4a853',
            color: '#08080f',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}
        >
          <span>启阅历史地图</span>
          <span className="text-xs">→</span>
        </button>
      </div>
    </div>
  )
}

function StatCard({ value, label, color, icon }: { value: number; label: string; color: string; icon: string }) {
  const n = useCountUp(value)
  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 flex-1 rounded relative overflow-hidden transition-all duration-300 hover:bg-[#161622]/40"
      style={{
        backgroundColor: '#12121a',
        border: '1px solid rgba(214, 168, 83, 0.15)',
        boxShadow: 'inset 0 0 10px rgba(214, 168, 83, 0.02)'
      }}
    >
      <div className="absolute top-1.5 right-1.5 rivet" />
      <span className="text-xl filter saturate-[0.8]" style={{ color }}>{icon}</span>
      <div className="flex flex-col min-w-0">
        <span style={{ color, fontSize: '24px', fontWeight: 700, lineHeight: 1.1, fontFamily: 'var(--font-serif)' }}>
          {n.toLocaleString()}
        </span>
        <span style={{ color: '#7a8a9e', fontSize: '10px', marginTop: '2px', letterSpacing: '0.5px' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

function ChartPanel({ title, code, summary, children, style: panelStyle }: {
  title: string
  code: string
  summary: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div className="archive-paper relative flex flex-col min-w-0" style={panelStyle}>
      <div className="relative z-10 px-4 pt-4 pb-2 shrink-0 flex items-center justify-between border-b border-dashed border-[#d4a853]/15">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-4 shrink-0" style={{ backgroundColor: '#c44b4b', boxShadow: '0 0 10px rgba(196,75,75,.6)' }} />
          <h3 className="font-serif tracking-wider truncate" style={{ color: '#ececed', fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}>
            {title}
          </h3>
        </div>
        <span className="text-[9px] shrink-0 font-serif" style={{ color: '#525f6e' }}>[ 档号 {code} ]</span>
      </div>
      <div className="relative z-10 flex-1 min-h-0 px-2 pt-1 pb-1">{children}</div>
      <div className="relative z-10 px-4 pb-3 shrink-0 flex items-center justify-between text-[9px] font-serif" style={{ color: '#525f6e' }}>
        <span>档案摘要</span>
        <span style={{ color: '#7a8a9e' }}>{summary}</span>
      </div>
    </div>
  )
}
