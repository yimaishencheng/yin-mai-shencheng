import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePersons } from '../hooks/usePersons'
import { useEvents } from '../hooks/useEvents'
import type { HistoricalEvent } from '../types'
import { UnsealingLoader, BookSpine } from '../components/Illustrations'

const PAGE = 40
type Evt = HistoricalEvent

export default function Timeline() {
  const { persons, loading: pLoading } = usePersons()
  const { events } = useEvents()

  // All hooks must be called unconditionally
  const [yF, setYF] = useState(1925)
  const [yT, setYT] = useState(1940)
  const [types, setTypes] = useState<string[]>([])
  const [kw, setKw] = useState('')
  const [pg, setPg] = useState(1)
  const [exp, setExp] = useState<Set<string>>(new Set())
  const nav = useNavigate()

  const allTypes = useMemo(() => {
    const s = new Set(events.map(e => e.type).filter(Boolean))
    return Array.from(s)
  }, [events])

  const filtered = useMemo(() => events.filter(e => {
    if (e.year < yF || e.year > yT) return false
    if (types.length && !types.includes(e.type)) return false
    if (kw && !e.name.includes(kw) && !(e.description || '').includes(kw)) return false
    return true
  }).sort((a, b) => a.year - b.year), [yF, yT, types, kw, events])

  useEffect(() => { setPg(1) }, [yF, yT, types, kw])

  if (pLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <UnsealingLoader />
        <span className="text-xs font-serif tracking-widest mt-4" style={{ color: '#7a8a9e' }}>秘密纪年史料编纂中...</span>
      </div>
    )
  }

  const totalPages = Math.ceil(filtered.length / PAGE)
  const items = filtered.slice((pg - 1) * PAGE, pg * PAGE)

  const toggle = (id: string) => {
    setExp(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const toggleType = (t: string) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <div className="h-full flex fade-in-up" style={{ backgroundColor: '#08080f' }}>
      {/* 编年纪左控制抽屉 */}
      <div
        className="shrink-0 flex flex-col p-5 overflow-y-auto gap-4"
        style={{
          width: 230,
          backgroundColor: '#0c0c14',
          borderRight: '2px solid rgba(214, 168, 83, 0.15)'
        }}
      >
        <div className="pb-2 border-b border-dashed border-[#d4a853]/15">
          <span className="text-[10px] tracking-wider block" style={{ color: '#7a8a9e' }}>CHRONOLOGICAL FILTER</span>
          <h3 className="font-serif text-sm font-bold" style={{ color: '#d4a853' }}>历史编年纪事轴</h3>
        </div>

        {/* 起止年份范围 */}
        <div>
          <p style={{ color: '#7a8a9e', fontSize: '11px', marginBottom: '8px' }} className="font-serif">起止年份范围</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: '#525f6e' }}>自：</span>
              <span style={{ color: '#d4a853', fontSize: '12px', fontWeight: 600 }}>{yF} 年</span>
            </div>
            <input
              type="range"
              min={1919}
              max={1945}
              value={yF}
              onChange={e => setYF(Math.min(Number(e.target.value), yT - 1))}
              className="w-full cursor-pointer"
              style={{ accentColor: '#d4a853' }}
            />

            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px]" style={{ color: '#525f6e' }}>至：</span>
              <span style={{ color: '#d4a853', fontSize: '12px', fontWeight: 600 }}>{yT} 年</span>
            </div>
            <input
              type="range"
              min={1919}
              max={1945}
              value={yT}
              onChange={e => setYT(Math.max(Number(e.target.value), yF + 1))}
              className="w-full cursor-pointer"
              style={{ accentColor: '#d4a853' }}
            />
          </div>
        </div>

        {/* 纪事类别勾选 */}
        <div className="border-t border-[#d4a853]/10 pt-3">
          <p style={{ color: '#7a8a9e', fontSize: '11px', marginBottom: '8px' }} className="font-serif">编纪事件类别</p>
          <div className="flex flex-col gap-1">
            {allTypes.map(t => (
              <label
                key={t}
                className="flex items-center gap-2 py-1 cursor-pointer transition-colors hover:text-[#ececed]"
                style={{ color: types.includes(t) ? '#d4a853' : '#7a8a9e' }}
              >
                <input
                  type="checkbox"
                  checked={types.includes(t)}
                  onChange={() => toggleType(t)}
                  className="rounded"
                  style={{ accentColor: '#d4a853' }}
                />
                <span style={{ fontSize: '12px' }}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 案卷关键词检索 */}
        <div className="border-t border-[#d4a853]/10 pt-3">
          <p style={{ color: '#7a8a9e', fontSize: '11px', marginBottom: '8px' }} className="font-serif">案卷全文检索</p>
          <input
            type="text"
            value={kw}
            onChange={e => setKw(e.target.value)}
            placeholder="搜索事件名称、说明..."
            className="w-full px-2.5 py-1.5 rounded text-xs outline-none"
            style={{ backgroundColor: '#12121a', border: '1px solid rgba(214, 168, 83, 0.2)', color: '#ececed' }}
          />
        </div>

        <div className="mt-auto pt-4 border-t border-[#d4a853]/10" style={{ color: '#7a8a9e', fontSize: '11px' }}>
          <span className="font-serif">当前卷宗共录得：</span>
          <br />
          <span className="text-[#d4a853] font-serif font-bold text-sm">{filtered.length}</span> 条机密事件
        </div>
      </div>

      {/* 主纪年时间轴视图 */}
      <div className="flex-1 overflow-y-auto px-6 py-12 relative">
        <div className="max-w-4xl mx-auto mb-6" style={{ height: 30 }}>
          <BookSpine />
        </div>
        <div style={{ position: 'relative' }} className="max-w-4xl mx-auto">
          {/* 中轴贯穿红绳/旧书脊连线效果 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'linear-gradient(to bottom, rgba(214,168,83,0.05), rgba(214,168,83,0.4) 15%, rgba(214,168,83,0.4) 85%, rgba(214,168,83,0.05))',
              transform: 'translateX(-50%)'
            }}
          />

          {items.map((evt, i) => {
            const isL = i % 2 === 0
            const open = exp.has(evt.id)
            return (
              <div key={evt.id || i} style={{ display: 'flex', position: 'relative', marginBottom: '16px' }}>
                <div
                  className="flex flex-col cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                  style={{ width: '50%', padding: '10px 24px', alignItems: isL ? 'flex-end' : 'flex-start' }}
                  onClick={() => toggle(evt.id)}
                >
                  {isL && <Card evt={evt} open={open} persons={persons} nav={nav} />}
                </div>

                {/* 节点视觉：火漆印章或金铆钉 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 18,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#c44b4b',
                    border: '2px solid #d4a853',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    boxShadow: '0 0 6px #c44b4b'
                  }}
                />

                <div
                  className="flex flex-col cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                  style={{ width: '50%', padding: '10px 24px', alignItems: isL ? 'flex-start' : 'flex-end' }}
                  onClick={() => toggle(evt.id)}
                >
                  {!isL && <Card evt={evt} open={open} persons={persons} nav={nav} />}
                </div>
              </div>
            )
          })}
        </div>

        {/* 翻页栏 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 py-8 mt-6 border-t border-dashed border-[#d4a853]/10 max-w-4xl mx-auto" style={{ color: '#7a8a9e' }}>
            <button
              disabled={pg <= 1}
              onClick={() => setPg(p => p - 1)}
              className="px-3 py-1.5 rounded text-xs font-serif transition-colors disabled:opacity-20 active:scale-95"
              style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.2)', color: '#ececed' }}
            >
              ◀ 上一页
            </button>
            <span style={{ fontSize: '11px' }} className="font-serif">第 {pg} 页 / 共 {totalPages} 页</span>
            <button
              disabled={pg >= totalPages}
              onClick={() => setPg(p => p + 1)}
              className="px-3 py-1.5 rounded text-xs font-serif transition-colors disabled:opacity-20 active:scale-95"
              style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.2)', color: '#ececed' }}
            >
              下一页 ▶
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ evt, open, persons, nav }: {
  evt: Evt;
  open: boolean;
  persons: { id: string; name: string }[];
  nav: ReturnType<typeof import('react-router-dom').useNavigate>
}) {
  const rel = persons.filter(p => p.name && ((evt.description || '').includes(p.name) || evt.name.includes(p.name)))
  return (
    <div
      className="rounded telegram-card transition-all duration-300 w-full"
      style={{
        maxWidth: 360,
        padding: open ? '16px' : '12px',
        border: '1px solid rgba(214, 168, 83, 0.18)',
        boxShadow: open ? '0 10px 25px rgba(0,0,0,0.65)' : '0 4px 12px rgba(0,0,0,0.35)'
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: '#c44b4b', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
          ⏱ {evt.year}年{evt.date ? ' ' + evt.date : ''}
        </span>
        <span style={{ color: '#525f6e', fontSize: '9px' }}>[ 密档案卷 ]</span>
      </div>

      <div
        className="font-serif tracking-wide"
        style={{
          color: '#d4a853',
          fontSize: '14px',
          fontWeight: 700,
          lineHeight: 1.35,
          marginBottom: '6px',
          display: '-webkit-box',
          WebkitLineClamp: open ? undefined : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {evt.name}
      </div>

      <span
        className="inline-block px-1.5 py-0.5 rounded text-[9px] mb-2 font-serif"
        style={{ backgroundColor: 'rgba(214,168,83,0.06)', color: '#7a8a9e', border: '1px solid rgba(214,168,83,0.15)' }}
      >
        {evt.type}
      </span>

      <div
        style={{
          color: '#ececed',
          fontSize: '11.5px',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: open ? undefined : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {evt.description || '暂无详细描述'}
      </div>

      {open && evt.source && (
        <div className="text-[10px] mt-3 pt-2 border-t border-dashed border-[#d4a853]/10" style={{ color: '#525f6e' }}>
          史料考证出处：{evt.source}
        </div>
      )}

      {open && rel.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {rel.map(p => (
            <button
              key={p.id}
              onClick={e => { e.stopPropagation(); nav('/portrait/' + encodeURIComponent(p.id)) }}
              className="px-1.5 py-0.5 rounded text-[10px] font-serif transition-colors hover:brightness-110"
              style={{ backgroundColor: 'rgba(214,168,83,0.08)', color: '#d4a853', border: '1px solid rgba(214,168,83,0.2)' }}
            >
              👤 {p.name}
            </button>
          ))}
        </div>
      )}

      {!open && (
        <div className="text-[10px] mt-2 text-right transition-all duration-300 hover:text-[#d4a853]" style={{ color: '#525f6e' }}>
          点击展开案卷 ▽
        </div>
      )}
    </div>
  )
}
