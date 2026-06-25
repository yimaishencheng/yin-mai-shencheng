import React from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/map', icon: '🗺', label: '时空地图' },
  { path: '/graph', icon: '🕸', label: '关系网络' },
  { path: '/timeline', icon: '📅', label: '历史时间轴' },
  { path: '/portrait/search', icon: '👤', label: '人物画像' },
  { path: '/anomalies', icon: '⚠️', label: '异常发现' },
] as const

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <nav
        className="flex flex-col shrink-0 border-r"
        style={{
          width: 200,
          backgroundColor: '#111118',
          borderColor: '#1f2937',
        }}
      >
        <div className="px-4 pt-6 pb-5 border-b" style={{ borderColor: '#1f2937' }}>
          <h1 className="text-lg font-bold" style={{ color: '#d97706' }}>
            隐脉申城
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#888899' }}>
            1930年代上海
          </p>
        </div>
        <div className="flex-1 flex flex-col gap-1 px-2 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive ? 'font-medium' : ''
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#1f2937' : 'transparent',
                color: isActive ? '#d97706' : '#888899',
              })}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div
          className="px-4 py-4 text-xs border-t leading-relaxed"
          style={{ color: '#555566', borderColor: '#1f2937' }}
        >
          数据来源：
          <br />上海图书馆
          <br />开放数据
        </div>
      </nav>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}