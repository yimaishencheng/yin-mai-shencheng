import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePersons } from '../hooks/usePersons'
import { useEvents } from '../hooks/useEvents'
import type { HistoricalEvent } from '../types'
import { UnsealingLoader, BookSpine } from '../components/Illustrations'
import { FilmPlate } from '../components/Atmosphere'

const PAGE = 40
type Evt = HistoricalEvent

function moodForYear(year: number): 'night' | 'storm' | 'dawn' {
  if (year <= 1932) return 'night'
  if (year <= 1935) return 'storm'
  return 'dawn'
}

function isKeyEvent(evt: Evt): boolean {
  const text = `${evt.type || ''} ${evt.name || ''} ${evt.description || ''}`
  return /牺牲|逮捕|暗杀|起义|暴动|五卅|淞沪|四一二|枪决|秘密|地下/.test(text)
}

export default function Timeline() {
  const { persons, loading: pLoading } = usePersons()
  const { events } = useEvents()
  const [yF, setYF] = useState(1925)
  const [yT, setYT] = useState(1940)
  const [types, setTypes] = useState<string[]>([])
  const [kw, setKw] = useState('')
  const [pg, setPg] = useState(1)
  const [exp, setExp] = useState<Set<string>>(new Set())
  const [mood, setMood] = useState<'night' | 'storm' | 'dawn'>('night')
  const nav = useNavigate()

  const allTypes = useMemo(() => {
    return Array.from(new Set(events.map(e => e.type).filter(Boolean)))
  }, [events])

  const filtered = useMemo(() => events.filter(e => {
    if (e.year < yF || e.year > yT) return false
    if (types.length && !types.includes(e.type)) return false
    if (kw && !e.name.includes(kw) && !(e.description || '').includes(kw)) return false
    return true
  }).sort((a, b) => a.year - b.year), [yF, yT, types, kw, events])

  useEffect(() => {
    setPg(1)
  }, [yF, yT, types, kw])

  const items = useMemo(() => {
    const start = (pg - 1) * PAGE
    return filtered.slice(start, start + PAGE)
  }, [filtered, pg])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-mood]'))
    if (!nodes.length) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible?.target instanceof HTMLElement) {
        const nextMood = visible.target.dataset.timelineMood as 'night' | 'storm' | 'dawn'
        if (nextMood) setMood(nextMood)
      }
    }, { rootMargin: '-35% 0px -35% 0px', threshold: [0.2, 0.5] })
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [items])

  if (pLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <UnsealingLoader />
        <span className="text-xs font-serif tracking-widest mt-4" style={{ color: '#7a8a9e' }}>正在编纂秘密纪年档案...</span>
      </div>
    )
  }

  const totalPages = Math.ceil(filtered.length / PAGE)

  const toggle = (id: string) => {
    setExp(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleType = (t: string) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <div className="h-full flex fade-in-up" style={{ backgroundColor: '#08080f' }}>
      <div
        className="shrink-0 flex flex-col p-5 overflow-y-auto gap-4"
        style={{ width: 230, backgroundColor: '#0c0c14', borderRight: '2px solid rgba(214,168,83,0.16)' }}
      >
        <div className="pb-2 border-b border-dashed border-[#d4a853]/15">
          <span className="text-[10px] tracking-wider block" style={{ color: '#7a8a9e' }}>CHRONOLOGICAL FILTER</span>
          <h3 className="font-serif text-sm font-bold" style={{ color: '#d4a853' }}>历史编年纪事轴</h3>
        </div>

        <div>
          <p className="font-serif" style={{ color: '#7a8a9e', fontSize: '11px', marginBottom: '8px' }}>起止年份范围</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: '#525f6e' }}>自：</span>
              <span className="text-xs font-semibold" style={{ color: '#d4a853' }}>{yF} 年</span>
            </div>
            <input type="range" min={1919} max={1945} value={yF} onChange={e => setYF(Math.min(Number(e.target.value), yT - 1))} className="w-full cursor-pointer" style={{ accentColor: '#d4a853' }} />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px]" style={{ color: '#525f6e' }}>至：</span>
              <span className="text-xs font-semibold" style={{ color: '#d4a853' }}>{yT} 年</span>
            </div>
            <input type="range" min={1919} max={1945} value={yT} onChange={e => setYT(Math.max(Number(e.target.value), yF + 1))} className="w-full cursor-pointer" style={{ accentColor: '#d4a853' }} />
          </div>
        </div>

        <div className="border-t border-[#d4a853]/10 pt-3">
          <p className="font-serif" style={{ color: '#7a8a9e', fontSize: '11px', marginBottom: '8px' }}>编纪事件类别</p>
          <div className="flex flex-col gap-1">
            {allTypes.map(t => (
              <label key={t} className="flex items-center gap-2 py-1 cursor-pointer" style={{ color: types.includes(t) ? '#d4a853' : '#7a8a9e' }}>
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} className="rounded" style={{ accentColor: '#d4a853' }} />
                <span style={{ fontSize: '12px' }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#d4a853]/10 pt-3">
          <p className="font-serif" style={{ color: '#7a8a9e', fontSize: '11px', marginBottom: '8px' }}>案卷全文检索</p>
          <input type="text" value={kw} onChange={e => setKw(e.target.value)} placeholder="搜索事件名称、说明..."
            className="w-full px-2.5 py-1.5 rounded text-xs outline-none"
            style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.2)', color: '#ececed' }} />
        </div>

        <div className="mt-auto pt-4 border-t border-[#d4a853]/10" style={{ color: '#7a8a9e', fontSize: '11px' }}>
          <span className="font-serif">当前卷宗共录得：</span>
          <br />
          <span className="text-[#d4a853] font-serif font-bold text-sm">{filtered.length}</span> 条机密事件
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto px-6 py-12 relative timeline-main timeline-mood-${mood}`}>
        <div className="max-w-4xl mx-auto mb-6" style={{ height: 30 }}>
          <BookSpine />
        </div>
        <div className="max-w-4xl mx-auto timeline-rail">
          <div className="timeline-line" />

          {items.map((evt, i) => {
            const isL = i % 2 === 0
            const open = exp.has(evt.id)
            const mood = moodForYear(evt.year)
            return (
              <div key={evt.id || i} data-timeline-mood={mood} style={{ display: 'flex', position: 'relative', marginBottom: '22px' }}>
                <div
                  className="flex flex-col cursor-pointer"
                  style={{ width: '50%', padding: '12px 28px', alignItems: isL ? 'flex-end' : 'flex-start' }}
                  onClick={() => toggle(evt.id)}
                >
                  {isL && <Card evt={evt} open={open} persons={persons} nav={nav} />}
                </div>

                <div className="timeline-node" />

                <div
                  className="flex flex-col cursor-pointer"
                  style={{ width: '50%', padding: '12px 28px', alignItems: isL ? 'flex-start' : 'flex-end' }}
                  onClick={() => toggle(evt.id)}
                >
                  {!isL && <Card evt={evt} open={open} persons={persons} nav={nav} />}
                </div>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 py-8 mt-6 border-t border-dashed border-[#d4a853]/10 max-w-4xl mx-auto" style={{ color: '#7a8a9e' }}>
            <button disabled={pg <= 1} onClick={() => setPg(p => p - 1)} className="px-3 py-1.5 rounded text-xs font-serif disabled:opacity-20"
              style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.2)', color: '#ececed' }}>
              ◀ 上一页
            </button>
            <span className="font-serif text-[11px]">第 {pg} 页 / 共 {totalPages} 页</span>
            <button disabled={pg >= totalPages} onClick={() => setPg(p => p + 1)} className="px-3 py-1.5 rounded text-xs font-serif disabled:opacity-20"
              style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.2)', color: '#ececed' }}>
              下一页 ▶
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ evt, open, persons, nav }: {
  evt: Evt
  open: boolean
  persons: { id: string; name: string }[]
  nav: ReturnType<typeof import('react-router-dom').useNavigate>
}) {
  const rel = persons.filter(p => p.name && ((evt.description || '').includes(p.name) || evt.name.includes(p.name)))
  const key = isKeyEvent(evt)
  const canTrace = Boolean(evt.location_id)

  return (
    <div className="timeline-card w-full" style={{ maxWidth: 360, padding: open ? '18px' : '14px' }}>
      <div className="relative z-10 flex items-center justify-between mb-2">
        <span className="font-serif font-bold" style={{ color: '#c44b4b', fontSize: '10px', letterSpacing: '0.08em' }}>
          ⏱ {evt.year}年{evt.date ? ` ${evt.date}` : ''}
        </span>
        <span className="seal-stamp">{key ? '阅后即焚' : '绝密'}</span>
      </div>

      <h4
        className="relative z-10 font-serif tracking-wide"
        style={{
          color: '#d4a853',
          fontSize: '15px',
          fontWeight: 700,
          lineHeight: 1.35,
          marginBottom: '8px',
          display: '-webkit-box',
          WebkitLineClamp: open ? undefined : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {evt.name}
      </h4>

      <div className="relative z-10 mb-3 flex flex-wrap gap-2">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-serif" style={{ backgroundColor: 'rgba(214,168,83,0.06)', color: '#7a8a9e', border: '1px solid rgba(214,168,83,0.16)' }}>
          {evt.type}
        </span>
        {key && <span className="text-[9px] font-serif" style={{ color: '#c44b4b' }}>关键历史节点</span>}
      </div>

      {key && (
        <div className="relative z-10 mb-3">
          <FilmPlate title={evt.name} year={evt.year} />
        </div>
      )}

      <div
        className="relative z-10"
        style={{
          color: '#ececed',
          fontSize: '11.5px',
          lineHeight: 1.65,
          display: '-webkit-box',
          WebkitLineClamp: open ? undefined : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {evt.description || '暂无详细描述'}
      </div>

      {open && evt.source && (
        <div className="relative z-10 text-[10px] mt-3 pt-2 border-t border-dashed border-[#d4a853]/10" style={{ color: '#525f6e' }}>
          数据来源：{evt.source_detail || evt.source}
        </div>
      )}

      {open && (
        <div className="relative z-10 flex flex-wrap gap-2 mt-3">
          {canTrace && (
            <button
              onClick={e => { e.stopPropagation(); nav('/map?highlight=' + encodeURIComponent(evt.location_id || '')) }}
              className="px-2 py-1 rounded text-[10px] font-serif"
              style={{ backgroundColor: 'rgba(196,75,75,0.1)', color: '#c44b4b', border: '1px solid rgba(196,75,75,0.24)' }}
            >
              🗺 溯源地图
            </button>
          )}
          {rel.slice(0, 4).map(p => (
            <button
              key={p.id}
              onClick={e => { e.stopPropagation(); nav('/portrait/' + encodeURIComponent(p.id)) }}
              className="px-1.5 py-0.5 rounded text-[10px] font-serif"
              style={{ backgroundColor: 'rgba(214,168,83,0.08)', color: '#d4a853', border: '1px solid rgba(214,168,83,0.2)' }}
            >
              👤 {p.name}
            </button>
          ))}
        </div>
      )}

      {!open && (
        <div className="relative z-10 text-[10px] mt-2 text-right" style={{ color: '#525f6e' }}>
          点击展开案卷 ▽
        </div>
      )}
    </div>
  )
}
