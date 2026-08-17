import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { GraphChart } from 'echarts/charts'
import { TooltipComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { usePersons } from '../hooks/usePersons'
import relations from '../data/relations.json'
import { UnsealingLoader, SecretCompass } from '../components/Illustrations'
import { OldMapAtmosphere } from '../components/Atmosphere'
import type { Person } from '../types'

echarts.use([GraphChart, TooltipComponent, TitleComponent, CanvasRenderer])

type P = Person

const REL_META: Record<string, { color: string; label: string }> = {
  '合作': { color: '#d4a853', label: '深层革命合作' },
  '文献共现': { color: '#7a8a9e', label: '文献史料共现' },
  '被同时逮捕': { color: '#c44b4b', label: '被捕共患难关联' },
  '同时被捕': { color: '#c44b4b', label: '被捕共患难关联' },
  '事件共现': { color: '#d4a853', label: '事件情报共现' },
  '同址关系': { color: '#3d5a80', label: '同址地下联络' },
  '同组织成员': { color: '#3d5a80', label: '同组织成员' },
  '夫妻': { color: '#c44b4b', label: '亲密关联' },
}

const CORE_NAMES = new Set([
  '鲁迅', '茅盾', '巴金', '郭沫若', '丁玲', '柔石', '殷夫', '冯雪峰', '夏衍', '田汉',
  '洪深', '阳翰笙', '叶圣陶', '郑振铎', '胡愈之', '李伯钊', '瞿秋白', '李大钊', '陈独秀', '蔡元培',
  '宋庆龄', '邹韬奋', '史沫特莱', '沈钧儒', '章乃器', '邓演达', '黄炎培', '陶行知',
  '林语堂', '徐志摩', '胡适', '梁实秋', '柳亚子', '闻一多', '朱自清', '冰心', '张爱玲', '苏青', '潘汉年',
  '向警予', '赵世炎', '罗亦农', '汪寿华', '陈延年', '陈乔年', '李启汉', '刘少奇', '邓中夏', '恽代英',
  '萧楚女', '彭湃', '周恩来', '毛泽东', '董必武', '何叔衡', '陈潭秋', '王尽美', '邓恩铭', '李达',
  '李汉俊', '张国焘', '刘仁静', '陈公博', '周佛海', '包惠僧', '林伯渠', '吴玉章', '徐特立', '谢觉哉',
  '张太雷', '苏兆征', '蔡和森', '王荷波', '项英', '关向应', '任弼时', '陈云', '聂荣臻',
  '叶挺', '贺龙', '刘伯承', '方志敏', '张闻天', '王稼祥', '秦邦宪', '杨尚昆', '李立三',
  '张叔平', '谢文锦', '任耐', '王乃坚', '潘梓年', '方慕韩', '陈赓', '陈毅', '刘亚楼', '李白',
])

const CORE_KEYWORDS = [
  '革命', '中共', '共产党', '地下', '特科', '左联', '左翼', '救国会', '烈士', '情报',
  '党团', '工会', '工人运动', '学生运动', '文化界', '秘密', '联络', '五卅', '淞沪',
  '被捕', '就义', '牺牲', '起义',
]

function personIsCore(p: Person): boolean {
  if (CORE_NAMES.has(p.name)) return true
  const text = `${p.description || ''} ${p.occupation || ''} ${(p.organizations || []).join(' ')}`
  return CORE_KEYWORDS.some(kw => text.includes(kw))
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
  const [year, setYear] = useState(1937)
  const [mode, setMode] = useState<'core' | 'full'>('core')
  const [selId, setSelId] = useState<string | null>(null)
  const nav = useNavigate()
  const { persons, loading } = usePersons()

  const coreIds = useMemo(() => {
    const ids = new Set<string>()
    for (const p of persons) if (personIsCore(p)) ids.add(p.id)
    return ids
  }, [persons])

  const baseRelations = useMemo(
    () => mode === 'core'
      ? relations.filter(r => coreIds.has(r.source) && coreIds.has(r.target))
      : relations,
    [mode, coreIds],
  )

  const yearRelations = useMemo(
    () => baseRelations.filter(r => r.year === 0 || (r.year >= 1930 && r.year <= year)),
    [baseRelations, year],
  )

  const visibleRelations = useMemo(() => {
    if (mode === 'core') return yearRelations
    const degree = new Map<string, number>()
    for (const r of yearRelations) {
      degree.set(r.source, (degree.get(r.source) || 0) + 1)
      degree.set(r.target, (degree.get(r.target) || 0) + 1)
    }
    const topIds = new Set(
      Array.from(degree.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 260)
        .map(([id]) => id),
    )
    return yearRelations
      .filter(r => topIds.has(r.source) && topIds.has(r.target))
      .slice(0, 1600)
  }, [mode, yearRelations])

  const visibleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const r of visibleRelations) {
      ids.add(r.source)
      ids.add(r.target)
    }
    return ids
  }, [visibleRelations])

  const visiblePersons = useMemo(
    () => persons.filter(p => visibleIds.has(p.id)),
    [persons, visibleIds],
  )

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
    const nodes = visiblePersons.map(p => {
      const match = !term || p.name.includes(term)
      const active = visibleIds.has(p.id)
      const relCnt = visibleRelations.filter(r => r.source === p.id || r.target === p.id).length
      const occ = p.occupation || ''
      const showLabel = relCnt >= 2 || p.is_anomaly || Boolean(term)
      return {
        id: p.id,
        name: p.name,
        symbol: 'rect' as const,
        symbolSize: p.is_anomaly ? 38 : Math.max(24, Math.min(40, 20 + relCnt * 2)),
        itemStyle: {
          color: active ? '#131319' : '#0a0a10',
          borderColor: active
            ? p.is_anomaly
              ? '#c44b4b'
              : occColor(occ)
            : '#22222f',
          borderWidth: active ? (p.is_anomaly ? 2.5 : 1.4) : 0.8,
          shadowBlur: active ? (p.is_anomaly ? 18 : 9) : 0,
          shadowColor: active ? (p.is_anomaly ? '#c44b4b' : '#d4a853') : 'transparent',
          opacity: match && active ? 1 : 0.1,
        },
        label: {
          show: showLabel,
          position: 'bottom' as const,
          color: '#ececed',
          fontFamily: 'var(--font-archive)',
          fontSize: 10,
          opacity: match && active ? 1 : 0.08,
        },
        _occ: occ,
        _from: p.active_from || 0,
        _to: p.active_to || 0,
        _relCnt: relCnt,
      }
    })

    const links = visibleRelations.map(r => {
      const src = visiblePersons.find(p => p.id === r.source)
      const tgt = visiblePersons.find(p => p.id === r.target)
      const srcMatch = !term || (src?.name || '').includes(term)
      const tgtMatch = !term || (tgt?.name || '').includes(term)
      const isDim = !srcMatch || !tgtMatch
      const meta = linkMeta[r.type] || { color: '#525f6e', dashed: false }
      return {
        source: r.source,
        target: r.target,
        lineStyle: {
          color: meta.color,
          width: 1.2 + r.strength * 3.4,
          type: meta.dashed ? 'dashed' as const : 'solid' as const,
          opacity: isDim ? 0.04 : 0.62,
          curveness: 0.18 + r.strength * 0.18,
          shadowBlur: 4,
          shadowColor: meta.color,
        },
        emphasis: {
          lineStyle: { opacity: 0.96, width: 2.4 + r.strength * 4.8 },
        },
      }
    })

    return {
      backgroundColor: 'transparent',
      animationDurationUpdate: 720,
      tooltip: {
        confine: true,
        backgroundColor: 'transparent',
        borderWidth: 0,
        extraCssText: 'transform: rotate(-2deg); background: linear-gradient(135deg, rgba(37,32,24,.98), rgba(16,15,20,.99)) !important; border: 1px solid rgba(214,168,83,.42) !important; border-radius: 2px !important; box-shadow: 0 12px 30px rgba(0,0,0,.6) !important; font-family: var(--font-archive) !important;',
        formatter: (ps: any) => {
          const d = ps.data
          if (!d || !d.id) return ''
          const p = visiblePersons.find(x => x.id === d.id)
          if (!p) return ''
          const rc = visibleRelations.filter(r => r.source === p.id || r.target === p.id).length
          return `<div style="min-width:150px;padding:8px 10px">
            <div style="font-family:var(--font-archive);font-weight:700;color:#d4a853;font-size:14px;letter-spacing:.12em;margin-bottom:4px">${p.name}</div>
            <div style="color:#7a8a9e;font-size:11px">${p.occupation || (p.is_incomplete ? '档案信息待考' : '暂未查明职业')}</div>
            <div style="color:#525f6e;font-size:10px;margin-top:5px">活跃年份: ${p.active_from || '?'} - ${p.active_to || '至今'}</div>
            <div style="color:#c44b4b;font-size:10px;font-weight:700">截至 ${year} 年情报线: ${rc} 条</div>
          </div>`
        },
      },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        data: nodes,
        links,
        force: {
          repulsion: 280,
          edgeLength: [70, 170],
          gravity: 0.08,
          layoutAnimation: true,
        },
        lineStyle: { curveness: 0.22 },
        edgeSymbol: ['none', 'none'],
        emphasis: {
          focus: 'adjacency' as const,
          itemStyle: {
            shadowBlur: 22,
            shadowColor: 'rgba(214,168,83,0.65)',
            borderWidth: 2,
          },
        },
      }],
    }
  }, [term, year, visibleRelations, visibleIds, visiblePersons, linkMeta])

  const handleEvents = useMemo(() => ({
    click: (ps: any) => {
      if (ps.dataType === 'node' && ps.data?.id) setSelId(ps.data.id)
    },
    dblclick: (ps: any) => {
      if (ps.dataType === 'node' && ps.data?.id) nav('/portrait/' + encodeURIComponent(ps.data.id))
    },
  }), [nav])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: '#08080f' }}>
        <UnsealingLoader />
        <span className="text-xs font-serif tracking-widest mt-4" style={{ color: '#7a8a9e' }}>正在测绘 1930 年代地下交通线...</span>
      </div>
    )
  }

  const selPerson = persons.find(p => p.id === selId) || null

  return (
    <div className="h-full flex flex-col fade-in-up graph-map-bg">
      <OldMapAtmosphere />

      <div className="relative z-10 flex items-center justify-between px-6 shrink-0" style={{ height: 64, backgroundColor: 'rgba(12,12,20,0.92)', borderBottom: '2px solid rgba(214,168,83,0.18)' }}>
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="检索特勤 / 革命人物姓名..."
            className="px-3 py-1.5 rounded text-xs outline-none w-64 transition-all duration-300 focus:w-80"
            style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.22)', color: '#ececed' }}
          />
          <span className="text-[10px] italic hidden md:inline" style={{ color: '#525f6e' }}>双击人物节点可调阅数字画像档案</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded border" style={{ borderColor: 'rgba(214,168,83,0.2)' }}>
            {(['core', 'full'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-3 py-1.5 text-[11px] font-serif tracking-wider"
                style={{
                  backgroundColor: mode === m ? 'rgba(214,168,83,0.16)' : 'transparent',
                  color: mode === m ? '#d4a853' : '#7a8a9e',
                  borderRight: m === 'core' ? '1px solid rgba(214,168,83,0.15)' : 'none',
                }}
              >
                {m === 'core' ? '核心情报网' : '全量档案'}
              </button>
            ))}
          </div>
          <div className="hidden xl:flex items-center gap-4 text-[11px]" style={{ color: '#7a8a9e' }}>
            {Object.values(REL_META).filter((m, i, arr) => arr.findIndex(x => x.label === m.label) === i).map((m, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5" style={{ backgroundColor: m.color, transform: 'rotate(45deg)' }} />
                <span className="font-serif">{m.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex min-h-0">
        <div className="flex-1 min-w-0">
          <ReactEChartsCore
            echarts={echarts}
            option={graphOpt}
            style={{ height: '100%', width: '100%' }}
            onEvents={handleEvents}
            notMerge
          />
        </div>

        <div
          className="shrink-0 overflow-y-auto transition-all duration-300 shadow-2xl"
          style={{
            width: 300,
            backgroundColor: 'rgba(12,12,20,0.97)',
            borderLeft: '2px solid rgba(214,168,83,0.18)',
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

      <div className="relative z-10 shrink-0 flex items-center gap-5 px-8" style={{ height: 78, backgroundColor: 'rgba(8,8,15,0.94)', borderTop: '1px solid rgba(214,168,83,0.16)' }}>
        <div style={{ width: 34, height: 34, opacity: 0.9 }}>
          <SecretCompass />
        </div>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-serif" style={{ color: '#7a8a9e' }}>1930</span>
          <input
            type="range"
            min={1930}
            max={1937}
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="flex-1 cursor-pointer"
            style={{ accentColor: '#d4a853' }}
          />
          <span className="text-xs font-serif font-bold" style={{ color: '#d4a853' }}>{year}</span>
        </div>
        <span className="text-[10px] font-serif tracking-wider" style={{ color: '#525f6e' }}>
          {mode === 'core' ? '核心情报网' : '全量档案'} · {visiblePersons.length} 人 / {visibleRelations.length} 条情报线
        </span>
      </div>
    </div>
  )
}

function PersonDrawer({ p, nav, onClose }: { p: P; nav: ReturnType<typeof useNavigate>; onClose: () => void }) {
  const relCnt = relations.filter(r => r.source === p.id || r.target === p.id).length
  return (
    <div className="p-6 relative flex flex-col h-full archive-paper">
      <div className="absolute top-3 right-3 rivet" />

      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-serif" style={{ color: '#525f6e' }}>[ 人物简报 ]</span>
        <button onClick={onClose} className="text-sm transition-colors hover:text-[#c44b4b] cursor-pointer" style={{ color: '#7a8a9e' }}>
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
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-serif mb-4" style={{ backgroundColor: 'rgba(214,168,83,0.08)', color: '#d4a853', border: '1px solid rgba(214,168,83,0.22)' }}>
          {p.occupation}
        </span>
      )}

      <div className="border-t border-b border-dashed border-[#d4a853]/15 py-3 mb-5 text-xs flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span style={{ color: '#7a8a9e' }}>活跃年段:</span>
          <span className="font-serif" style={{ color: '#ececed' }}>{p.active_from || '?'} - {p.active_to || '不详'}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#7a8a9e' }}>关联点广度:</span>
          <span style={{ color: '#ececed' }}>共 {relCnt} 处交叉关联</span>
        </div>
      </div>

      {p.description && (
        <div className="p-4 rounded text-xs leading-relaxed mb-6 flex-1 overflow-y-auto" style={{ backgroundColor: '#12121a', border: '1px solid rgba(214,168,83,0.08)', color: '#ececed' }}>
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
