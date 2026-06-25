import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { TooltipComponent, TitleComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { MapContainer, CircleMarker, TileLayer } from 'react-leaflet'
import { Tooltip } from 'react-leaflet'
import relations from '../data/relations.json'
import { usePersons } from '../hooks/usePersons'
import { usePlaces } from '../hooks/usePlaces'
import { useEvents } from '../hooks/useEvents'

echarts.use([LineChart, BarChart, PieChart, TooltipComponent, TitleComponent, GridComponent, LegendComponent, CanvasRenderer])

function useCountUp(end: number, dur = 1500) {
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

const COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#6a4c93', '#f1faee', '#d97706', '#059669']

export default function Dashboard() {
  const nav = useNavigate()
  const { persons, loading: pLoading } = usePersons()
  const { places, loading: plLoading } = usePlaces()
  const { events, loading: eLoading } = useEvents()

  if (pLoading || plLoading || eLoading) {
    return <div className="flex items-center justify-center h-96 text-gray-500">加载数据中…</div>
  }

  const stats = [
    { label: '位历史人物', value: persons.length, color: '#f59e0b' },
    { label: '处历史地点', value: places.filter(p => p.lat && p.lat !== 0).length, color: '#f59e0b' },
    { label: '起历史事件', value: events.length, color: '#f59e0b' },
    { label: '处异常标注', value: places.filter(p => p.is_anomaly).length, color: '#ef4444' },
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
    tooltip: { trigger: 'axis', textStyle: { color: '#e8e8ea' }, backgroundColor: '#1a1a25', borderColor: '#2a2a3a' },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: years.map(String), axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#888899', fontSize: 9, rotate: 45 } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#888899', fontSize: 9 }, splitLine: { lineStyle: { color: '#1f2937' } } },
    series: [{ type: 'line', data: yearData, smooth: true, lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: 'rgba(245,158,11,0.12)' }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f59e0b' } }],
  }

  const pieOpt = {
    tooltip: { trigger: 'item', textStyle: { color: '#e8e8ea' }, backgroundColor: '#1a1a25', borderColor: '#2a2a3a' },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '50%'],
      data: typeEntries.map(([n, v]) => ({ name: n, value: v })),
      itemStyle: { borderRadius: 4, borderColor: '#0a0a0f', borderWidth: 2 },
      label: { color: '#888899', fontSize: 10, show: typeEntries.length <= 8 },
      emphasis: { label: { color: '#e8e8ea', fontWeight: 'bold' } },
    }],
    graphic: [{
      type: 'text', left: 'center', top: '45%',
      style: { text: `${typeTotal}`, fill: '#e8e8ea', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    }, {
      type: 'text', left: 'center', top: '55%',
      style: { text: '条事件', fill: '#888899', fontSize: 11, textAlign: 'center' },
    }],
  }

  const barOpt = {
    tooltip: { trigger: 'axis', textStyle: { color: '#e8e8ea' }, backgroundColor: '#1a1a25', borderColor: '#2a2a3a' },
    grid: { left: 90, right: 20, top: 40, bottom: 10 },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#888899', fontSize: 9 }, splitLine: { lineStyle: { color: '#1f2937' } } },
    yAxis: { type: 'category', data: occEntries.map(([n]) => n.length > 8 ? n.slice(0, 8) + '…' : n), axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#888899', fontSize: 9 } },
    series: [{ type: 'bar', data: occEntries.map(([, v]) => v), itemStyle: { color: '#f59e0b', borderRadius: [0, 3, 3, 0] }, barWidth: 12 }],
  }

  const mapPlaces = places.filter(p => p.lat && p.lat !== 0)

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col" style={{ backgroundColor: '#0a0a0f' }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0.6; transform: scale(1); }
        }
        .pulse-marker { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      {/* ── Top stats bar ── */}
      <div className="flex items-center gap-5 px-6 shrink-0" style={{ height: '12%', backgroundColor: '#0a0a0f', borderBottom: '1px solid #1a1a25' }}>
        <div className="flex flex-col mr-4 shrink-0">
          <h1 style={{ color: '#d97706', fontSize: 32, fontWeight: 700, letterSpacing: 2, lineHeight: 1.2 }}>隐脉申城</h1>
          <p style={{ color: '#888899', fontSize: 11, letterSpacing: 1 }}>1930年代上海地下革命网络可视化</p>
        </div>
        <div className="flex gap-3 flex-1 min-w-0">
          {stats.map((s, i) => (
            <StatCard key={i} value={s.value} label={s.label} color={s.color} />
          ))}
        </div>
      </div>

      {/* ── Three-column charts ── */}
      <div className="flex shrink-0" style={{ height: '55%', borderBottom: '1px solid #1a1a25' }}>
        <ChartPanel title="革命活动年份分布" style={{ width: '35%' }}>
          <ReactEChartsCore echarts={echarts} option={lineOpt} style={{ height: '100%', width: '100%' }} notMerge />
        </ChartPanel>
        <div style={{ width: '1px', backgroundColor: '#1a1a25' }} />
        <ChartPanel title="事件类型分布" style={{ width: '30%' }}>
          <ReactEChartsCore echarts={echarts} option={pieOpt} style={{ height: '100%', width: '100%' }} notMerge />
        </ChartPanel>
        <div style={{ width: '1px', backgroundColor: '#1a1a25' }} />
        <ChartPanel title="人物职业构成" style={{ width: '35%' }}>
          <ReactEChartsCore echarts={echarts} option={barOpt} style={{ height: '100%', width: '100%' }} notMerge />
        </ChartPanel>
      </div>

      {/* ── Bottom map strip ── */}
      <div className="flex-1 relative">
        <MapContainer center={[31.2304, 121.4737]} zoom={11} className="w-full h-full" zoomControl={false} attributionControl={false} style={{ backgroundColor: '#0a0a0f' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {mapPlaces.map((pl) => {
            const isAnomaly = pl.is_anomaly
            return (
              <CircleMarker
                key={pl.id}
                center={[pl.lat, pl.lng]}
                pathOptions={{
                  color: isAnomaly ? '#ef4444' : '#f59e0b',
                  fillColor: isAnomaly ? '#ef4444' : '#f59e0b',
                  fillOpacity: 0.7,
                  weight: 2,
                }}
                radius={isAnomaly ? 12 : 6}
              >
                <Tooltip>{pl.name}</Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
        <button
          onClick={() => nav('/map')}
          className="absolute bottom-5 right-5 z-[1000] px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ backgroundColor: '#d97706', color: '#0a0a0f' }}
        >
          进入探索 →
        </button>
      </div>
    </div>
  )
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  const n = useCountUp(value)
  return (
    <div className="flex flex-col items-center justify-center flex-1 rounded-lg min-w-0 py-2" style={{ backgroundColor: '#111118', border: '1px solid #1f1f2e' }}>
      <span style={{ color, fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{n.toLocaleString()}</span>
      <span style={{ color: '#888899', fontSize: 11, marginTop: 2 }}>{label}</span>
    </div>
  )
}

function ChartPanel({ title, children, style: panelStyle }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col" style={panelStyle}>
      <div className="px-4 pt-3 pb-1 shrink-0">
        <h3 style={{ color: '#e8e8ea', fontSize: 13, fontWeight: 500 }}>{title}</h3>
      </div>
      <div className="flex-1 min-h-0 px-1 pb-2">{children}</div>
    </div>
  )
}

// Leaflet Tooltip must be imported in the same scope
