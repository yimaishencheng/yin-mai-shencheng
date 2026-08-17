import React from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', icon: '🏛️', label: '档案大厅' },
  { path: '/map', icon: '🗺️', label: '时空地图' },
  { path: '/graph', icon: '🕸️', label: '关系网络' },
  { path: '/timeline', icon: '📅', label: '历史时间轴' },
  { path: '/portrait/search', icon: '👤', label: '人物画像' },
  { path: '/orgs', icon: '🏷️', label: '机构名册' },
  { path: '/anomalies', icon: '⚠️', label: '异常发现' },
] as const

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#08080f' }}>
      {/* 侧边导航栏 - 线装书装订边缘质感 */}
      <nav
        className="flex flex-col shrink-0 relative"
        style={{
          width: 210,
          backgroundColor: '#0d0d16',
          borderRight: '2px solid rgba(214, 168, 83, 0.15)',
        }}
      >
        {/* 装订书线节点装饰 */}
        <div className="absolute right-[-4px] top-0 bottom-0 flex flex-col justify-between py-12 pointer-events-none z-10 select-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: '#d4a853', opacity: 0.35, border: '1px solid #08080f' }} />
          ))}
        </div>

        {/* 顶部标题区 */}
        <div className="px-5 pt-8 pb-6 border-b" style={{ borderColor: 'rgba(214, 168, 83, 0.12)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded tracking-widest font-semibold" style={{ border: '1px solid #c44b4b', color: '#c44b4b' }}>
              密件
            </span>
            <span className="text-xs tracking-wider" style={{ color: '#7a8a9e' }}>地下特科驻地</span>
          </div>
          <h1 className="text-2xl font-bold mt-2 tracking-widest republican-header" style={{ color: '#d4a853', fontFamily: 'var(--font-serif)' }}>
            隐脉申城
          </h1>
          <p className="text-xs mt-1.5 font-sans" style={{ color: '#7a8a9e', letterSpacing: '0.05em' }}>
            1930年代地下革命网络
          </p>
        </div>

        {/* 导航菜单 */}
        <div className="flex-1 flex flex-col gap-2 px-3 py-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-3 rounded-md text-sm transition-all duration-300 group ${
                  isActive ? 'font-semibold' : 'hover:bg-white/[0.02]'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'rgba(214, 168, 83, 0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid #d4a853' : '3px solid transparent',
                color: isActive ? '#d4a853' : '#7a8a9e',
              })}
            >
              <div className="flex items-center gap-3">
                <span className="text-base filter saturate-[0.85]">{item.icon}</span>
                <span className="tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>{item.label}</span>
              </div>
              <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#d4a853' }}>🗎</span>
            </NavLink>
          ))}
        </div>

        {/* 底部信息纸质感盖印效果 */}
        <div
          className="px-5 py-5 text-xs border-t leading-relaxed"
          style={{ color: '#525f6e', borderColor: 'rgba(214, 168, 83, 0.12)', background: 'linear-gradient(to top, rgba(13,13,22,1), rgba(13,13,22,0))' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#c44b4b' }} />
            <span style={{ color: '#7a8a9e', fontWeight: 500 }}>数据来源</span>
          </div>
          上海图书馆开放数据
          <br />及竞赛支持机构
          <br />详见 DATA_SOURCES.md
        </div>
      </nav>

      {/* 右侧主视口 */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.85)'
        }} />
        {children}
      </main>
    </div>
  )
}
