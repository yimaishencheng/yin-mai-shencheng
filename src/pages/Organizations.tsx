import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganizations } from '../hooks/useOrganizations'
import { usePersons } from '../hooks/usePersons'
import { useEvents } from '../hooks/useEvents'
import type { Organization, Person } from '../types'
import { UnsealingLoader, DustyArchive } from '../components/Illustrations'

type Org = Organization

export default function Organizations() {
  const [term, setTerm] = useState('')
  const [type, setType] = useState('全部')
  const [expanded, setExpanded] = useState<string | null>(null)
  const nav = useNavigate()
  const { organizations, loading: oLoading } = useOrganizations()
  const { persons, loading: pLoading } = usePersons()
  const { events, loading: eLoading } = useEvents()

  const personMap = useMemo(() => {
    const m: Record<string, Person> = {}
    for (const p of persons) m[p.id] = p
    return m
  }, [persons])

  const orgTypes = useMemo(() => {
    const s = new Set(organizations.map(o => o.type || '未分类'))
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [organizations])

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase()
    return organizations
      .filter(o => {
        if (type !== '全部' && o.type !== type) return false
        if (!q) return true
        return (
          o.name.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          (o.member_ids || []).some(id => personMap[id]?.name.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => (b.member_ids?.length || 0) - (a.member_ids?.length || 0))
  }, [organizations, type, term, personMap])

  if (oLoading || pLoading || eLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <UnsealingLoader />
        <span className="text-xs font-serif tracking-widest mt-4" style={{ color: '#7a8a9e' }}>正在汇编机构名册卷宗...</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col fade-in-up" style={{ backgroundColor: '#08080f' }}>
      {/* 顶部档案名录标题与检索 */}
      <div className="px-8 pt-8 pb-5 shrink-0 border-b" style={{ borderColor: 'rgba(214,168,83,0.15)', backgroundColor: '#0c0c14' }}>
        <div className="flex items-start justify-between gap-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-serif font-bold text-xl shrink-0" style={{ color: '#d4a853', border: '2px solid rgba(214,168,83,0.35)', boxShadow: '0 0 18px rgba(214,168,83,0.12)' }}>
              名
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase block mb-1" style={{ color: '#7a8a9e' }}>Organization Registry</span>
              <h1 className="text-2xl font-bold font-serif tracking-widest" style={{ color: '#d4a853' }}>机构名册</h1>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#7a8a9e' }}>
                汇集 1930 年代上海地下革命相关的团体、机关、学校与秘密组织，按已知成员规模归档。
              </p>
            </div>
          </div>
          <span className="text-[10px] font-serif shrink-0" style={{ color: '#525f6e' }}>[ 在册机构 {filtered.length} / {organizations.length} ]</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px]">
            <input
              type="text"
              value={term}
              onChange={e => { setTerm(e.target.value); setExpanded(null) }}
              placeholder="检索机构名称、成员姓名或档案摘要..."
              className="w-full px-3 py-2 rounded text-xs outline-none transition-colors focus:border-[#d4a853]/55"
              style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.22)', color: '#ececed' }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TypeChip active={type === '全部'} onClick={() => setType('全部')}>全部</TypeChip>
            {orgTypes.map(t => (
              <TypeChip key={t} active={type === t} onClick={() => setType(t)}>{t}</TypeChip>
            ))}
          </div>
        </div>
      </div>

      {/* 名录列表 */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div style={{ width: 180, height: 144, opacity: 0.75 }}>
              <DustyArchive />
            </div>
            <p className="text-xs font-serif mt-4" style={{ color: '#7a8a9e' }}>未在名册中检索到匹配机构</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-7xl mx-auto">
            {filtered.map(org => (
              <OrgCard
                key={org.id}
                org={org}
                persons={persons}
                events={events}
                expanded={expanded === org.id}
                onToggle={() => setExpanded(expanded === org.id ? null : org.id)}
                nav={nav}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded text-[11px] font-serif transition-all"
      style={{
        backgroundColor: active ? 'rgba(214,168,83,0.16)' : '#161622',
        color: active ? '#d4a853' : '#7a8a9e',
        border: active ? '1px solid rgba(214,168,83,0.42)' : '1px solid rgba(214,168,83,0.08)',
      }}
    >
      {children}
    </button>
  )
}

function OrgCard({
  org,
  persons,
  events,
  expanded,
  onToggle,
  nav,
}: {
  org: Org
  persons: Person[]
  events: { id: string; name: string; year: number; description: string }[]
  expanded: boolean
  onToggle: () => void
  nav: ReturnType<typeof useNavigate>
}) {
  const members = (org.member_ids || [])
    .map(id => persons.find(p => p.id === id))
    .filter((p): p is Person => Boolean(p))

  const relatedEvents = useMemo(() => {
    const names = new Set(members.map(m => m.name))
    return events.filter(e => (e.description || '').includes(org.name) || (e.name || '').includes(org.name) || members.some(m => (e.description || '').includes(m.name)))
      .sort((a, b) => a.year - b.year)
      .slice(0, 4)
  }, [org.name, events, members])

  return (
    <div className="archive-paper relative overflow-hidden flex flex-col">
      <div className="absolute top-2 right-2 rivet" />
      <button onClick={onToggle} className="relative z-10 flex items-start gap-3 w-full p-5 text-left transition-colors hover:bg-[#d4a853]/5" style={{ background: 'none', cursor: 'pointer' }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-serif shrink-0" style={{ backgroundColor: 'rgba(61,90,128,0.12)', color: '#7a8a9e', border: '1px solid rgba(61,90,128,0.25)' }}>
              {org.type || '未分类'}
            </span>
            {org.source && <span className="text-[9px] font-serif truncate" style={{ color: '#525f6e' }}>来源 · {org.source}</span>}
          </div>
          <h2 className="font-serif text-lg font-bold tracking-wide truncate" style={{ color: '#d4a853' }}>{org.name}</h2>
          {org.description ? (
            <p className="text-[11px] mt-1 leading-relaxed line-clamp-2" style={{ color: '#7a8a9e' }}>{org.description}</p>
          ) : (
            <p className="text-[11px] mt-1 italic" style={{ color: '#525f6e' }}>档案摘要待补全</p>
          )}
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1">
          <span className="text-2xl font-serif font-bold leading-none" style={{ color: members.length > 0 ? '#d4a853' : '#7a8a9e' }}>{members.length}</span>
          <span className="text-[9px] font-serif" style={{ color: '#7a8a9e' }}>已知成员</span>
          <span className="text-[10px] mt-2" style={{ color: '#525f6e' }}>{expanded ? '收起' : '展开'}</span>
        </div>
      </button>

      {expanded && (
        <div className="relative z-10 px-5 pb-5 pt-1 border-t" style={{ borderColor: 'rgba(214,168,83,0.12)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-3" style={{ backgroundColor: '#d4a853' }} />
            <span className="text-[10px] font-serif tracking-wider" style={{ color: '#7a8a9e' }}>在册成员名册</span>
          </div>

          {members.length === 0 ? (
            <p className="text-xs italic px-2" style={{ color: '#7a8a9e' }}>暂无已归档成员线索。</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => nav('/portrait/' + encodeURIComponent(m.id))}
                  className="px-2.5 py-1 rounded text-xs transition-all hover:brightness-110 flex items-center gap-1.5"
                  style={{ backgroundColor: 'rgba(214,168,83,0.07)', color: '#d4a853', border: '1px solid rgba(214,168,83,0.18)' }}
                >
                  <span className="font-serif">{m.name}</span>
                  {m.occupation && <span className="text-[9px] font-sans" style={{ color: '#7a8a9e' }}>{m.occupation}</span>}
                </button>
              ))}
            </div>
          )}

          {relatedEvents.length > 0 && (
            <div className="mt-5 pt-4 border-t border-dashed" style={{ borderColor: 'rgba(214,168,83,0.12)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1 h-3" style={{ backgroundColor: '#c44b4b' }} />
                <span className="text-[10px] font-serif tracking-wider" style={{ color: '#7a8a9e' }}>关联历史事件</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {relatedEvents.map(ev => (
                  <div key={ev.id} className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ backgroundColor: 'rgba(18,18,26,0.7)' }}>
                    <span className="text-[10px] font-serif font-bold shrink-0 mt-0.5" style={{ color: '#c44b4b' }}>{ev.year || '?'}</span>
                    <span className="text-[11px] truncate" style={{ color: '#ececed' }}>{ev.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
