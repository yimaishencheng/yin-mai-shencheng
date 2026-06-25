import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { TooltipComponent, TitleComponent, GridComponent, LegendComponent, GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { MapContainer, CircleMarker, TileLayer, Tooltip } from 'react-leaflet'
import { usePersons } from '../hooks/usePersons'
import { usePlaces } from '../hooks/usePlaces'
import { useEvents } from '../hooks/useEvents'
import { HeroSilhouette, UnsealingLoader } from '../components/Illustrations'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TooltipComponent,
  TitleComponent,
  GridComponent,
  LegendComponent,
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

  if (pLoading || plLoading || eLoading) {
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

  // Events by year (1919-1945)
  const yearMap: Record<number, number> = {}
  for (const e of events) {
    const y = e.year
    if (y >= 1919 && y <= 1945) yearMap[y] = (yearMap[y] || 0) + 1
  }
  const years = Array.from({ length: 1945 - 1919 + 1 }, (_, i) => 1919 + i)
  const yearData = years.map(y => yearMap[y] || 0)

  // Events by type
  const typeMap: Record<string, number> = {}
  for (const e of events) {
    const t = e.type || '其他'
    typeMap[t] = (typeMap[t] || 0) + 1
  }
  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1])
  const typeTotal = events.length

  // Persons by occupation (top 8)
  const occMap: Record<string, number> = {}
  for (const p of persons) {
    const o = p.occupation && p.occupation.trim() ? p.occupation : '未标注'
    occMap[o] = (occMap[o] || 0) + 1
  }
  const occEntries = Object.entries(occMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const lineOpt = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      textStyle: { color: '#ececed', fontFamily: 'var(--font-sans)', fontSize: 11 },
      backgroundColor: '#161620',
      borderColor: 'rgba(214, 168, 83, 0.2)',
      borderWidth: 1
    },
    grid: { left: '8%', right: '4%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: years.map(String),
      axisLine: { lineStyle: { color: 'rgba(122, 138, 158, 0.2)' } },
      axisLabel: { color: '#7a8a9e', fontSize: 10, rotate: 35, fontFamily: 'var(--font-sans)' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#7a8a9e', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(122, 138, 158, 0.1)', type: 'dashed' } }
    },
    series: [{
      type: 'line',
      data: yearData,
      smooth: true,
      lineStyle: { color: '#d4a853', width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(214, 168, 83, 0.2)' },
          { offset: 1, color: 'rgba(214, 168, 83, 0.0)' }
        ])
      },
      symbol: 'circle',
      symbolSize: 5,
      itemStyle: { color: '#d4a853', borderColor: '#08080f', borderWidth: 1 }
    }],
  }

  const pieOpt = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      textStyle: { color: '#ececed', fontSize: 11 },
      backgroundColor: '#161620',
      borderColor: 'rgba(214, 168, 83, 0.2)',
      borderWidth: 1
    },
    color: THEME_COLORS,
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '50%'],
      data: typeEntries.map(([n, v]) => ({ name: n, value: v })),
      itemStyle: { borderRadius: 4, borderColor: '#08080f', borderWidth: 2 },
      label: { color: '#7a8a9e', fontSize: 10, show: true, formatter: '{b}\n({d}%)' },
      emphasis: { label: { color: '#ececed', fontWeight: 'bold' } },
    }],
    graphic: [{
      type: 'text', left: 'center', top: '44%',
      style: { text: `${typeTotal}`, fill: '#ececed', fontSize: 22, fontWeight: 'bold', fontFamily: 'var(--font-serif)', textAlign: 'center' },
    }, {
      type: 'text', left: 'center', top: '56%',
      style: { text: '起史料记录', fill: '#7a8a9e', fontSize: 10, textAlign: 'center' },
    }],
  }

  const barOpt = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      textStyle: { color: '#ececed', fontSize: 11 },
      backgroundColor: '#161620',
      borderColor: 'rgba(214, 168, 83, 0.2)',
      borderWidth: 1
    },
    grid: { left: '22%', right: '6%', top: '10%', bottom: '10%' },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#7a8a9e', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(122, 138, 158, 0.1)' } }
    },
    yAxis: {
      type: 'category',
      data: occEntries.map(([n]) => n.length > 6 ? n.slice(0, 6) + '…' : n),
      axisLine: { lineStyle: { color: 'rgba(122, 138, 158, 0.2)' } },
      axisLabel: { color: '#7a8a9e', fontSize: 10, fontFamily: 'var(--font-serif)' }
    },
    series: [{
      type: 'bar',
      data: occEntries.map(([, v]) => v),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#3d5a80' },
          { offset: 1, color: '#d4a853' }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      barWidth: 10
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
        <ChartPanel title="革命活动历史年代分布 (1919-1945)" style={{ width: '36%' }}>
          <ReactEChartsCore echarts={echarts} option={lineOpt} style={{ height: '100%', width: '100%' }} notMerge />
        </ChartPanel>
        <div style={{ width: '1px', backgroundColor: 'rgba(214, 168, 83, 0.12)' }} />
        <ChartPanel title="事件史料类别构成" style={{ width: '30%' }}>
          <ReactEChartsCore echarts={echarts} option={pieOpt} style={{ height: '100%', width: '100%' }} notMerge />
        </ChartPanel>
        <div style={{ width: '1px', backgroundColor: 'rgba(214, 168, 83, 0.12)' }} />
        <ChartPanel title="核心人物主要社会职业构成 (Top 8)" style={{ width: '34%' }}>
          <ReactEChartsCore echarts={echarts} option={barOpt} style={{ height: '100%', width: '100%' }} notMerge />
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

function ChartPanel({ title, children, style: panelStyle }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col p-4" style={panelStyle}>
      <div className="px-1 pb-2 shrink-0 flex items-center justify-between border-b border-dashed border-[#d4a853]/15">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3" style={{ backgroundColor: '#d4a853' }} />
          <h3 className="font-serif tracking-wider" style={{ color: '#ececed', fontSize: '13px', fontWeight: 500 }}>
            {title}
          </h3>
        </div>
        <span className="text-[9px]" style={{ color: '#525f6e' }}>[ 档号 1930-B ]</span>
      </div>
      <div className="flex-1 min-h-0 px-1 py-2">{children}</div>
    </div>
  )
}
