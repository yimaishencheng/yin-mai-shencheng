import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'
import RoomScene, { type RoomModule } from '../components/three/RoomScene'
import { ArchiveSeal, SecretCompass } from '../components/Illustrations'

const ROOM_MODULES: Record<RoomModule, { title: string; desc: string; path: string; accent: string }> = {
  overview: {
    title: '档案大厅办公桌',
    desc: '这里是整个秘密档案馆的中枢。从桌面可以进入数据摘要、查看当前档案存量，也可以回到各条情报线。',
    path: '/overview',
    accent: '#d4a853',
  },
  map: {
    title: '上海时空地图',
    desc: '展开旧上海城区地图，查看 1930 年代地下活动网点、租界边界与秘密联络路径。',
    path: '/map',
    accent: '#3d5a80',
  },
  graph: {
    title: '地下情报网',
    desc: '墙上的朱砂红线是人物、事件与机构之间的情报连接，点击后进入完整关系网络。',
    path: '/graph',
    accent: '#c44b4b',
  },
  timeline: {
    title: '历史纪年打字机',
    desc: '打字机逐行打出的不是普通年份，而是上海地下革命网络的重要历史节点。',
    path: '/timeline',
    accent: '#d4a853',
  },
  portrait: {
    title: '人物档案柜',
    desc: '抽屉里存放着人物生平、化名、组织归属与相关事件线索，可检索或直接翻阅。',
    path: '/portrait/search',
    accent: '#7a8a9e',
  },
  anomalies: {
    title: '异常发现保险柜',
    desc: '保险柜封存的是史料断裂、地点异常和网络空洞，只对愿意面对空白的人打开。',
    path: '/anomalies',
    accent: '#c44b4b',
  },
}

function CursorGlow({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const light = useRef<THREE.PointLight>(null)
  const target = useRef(new THREE.Vector3())

  useFrame((state) => {
    const ndc = new THREE.Vector3(pointer.current.x, pointer.current.y, 0.5)
    ndc.unproject(state.camera)
    ndc.sub(state.camera.position).normalize()
    const distance = (0 - state.camera.position.z) / ndc.z
    const point = state.camera.position.clone().add(ndc.multiplyScalar(distance))
    target.current.lerp(point, 0.12)
    if (light.current) light.current.position.copy(target.current)
  })

  return <pointLight ref={light} color="#d4a853" intensity={12} distance={4.5} />
}

function ArchiveDrawer({ module, onClose }: { module: RoomModule; onClose: () => void }) {
  const nav = useNavigate()
  const meta = ROOM_MODULES[module]
  return (
    <aside className="archive-drawer" style={{ borderColor: 'rgba(214,168,83,0.3)' }}>
      <div className="archive-drawer-head">
        <div>
          <span className="text-[10px] font-serif tracking-widest uppercase" style={{ color: meta.accent }}>Archive Drawer</span>
          <h2 className="font-serif text-2xl font-bold tracking-widest mt-1" style={{ color: '#d4a853' }}>
            {meta.title}
          </h2>
        </div>
        <button onClick={onClose} className="text-sm" style={{ color: '#7a8a9e' }}>✕ 关 闭</button>
      </div>
      <div style={{ width: 58, height: 58, opacity: 0.9 }}>
        <ArchiveSeal />
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#ececed', lineHeight: 1.75 }}>
        {meta.desc}
      </p>
      <button
        onClick={() => nav(meta.path)}
        className="w-full px-4 py-3 rounded text-sm font-serif font-bold tracking-widest hover:scale-[1.02]"
        style={{ backgroundColor: '#d4a853', color: '#08080f' }}
      >
        进入{meta.title} →
      </button>
    </aside>
  )
}

export default function Lobby3D() {
  const [active, setActive] = useState<RoomModule | null>(null)
  const [cursor, setCursor] = useState({ x: -200, y: -200 })
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null)
      if (event.key.toLowerCase() === 'r') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onPointerMove = (event: MouseEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      }
      setCursor({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('pointermove', onPointerMove)
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [])

  return (
    <div className="lobby-3d-root">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.55, 5.4], fov: 45 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setActive(null)}
      >
        <color attach="background" args={['#08080f']} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[3, 5.5, 4]}
          intensity={0.85}
          color="#f0dfb8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0002}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-camera-near={0.5}
          shadow-camera-far={22}
        />
        <pointLight position={[0, 2.8, 1.6]} intensity={13} color="#d4a853" distance={9} />
        <spotLight position={[0, 4.2, 2.4]} angle={0.5} penumbra={0.9} intensity={19} color="#d4a853" />
        <CursorGlow pointer={pointer} />
        <RoomScene onSelect={setActive} />
        <OrbitControls
          target={[0, 0.9, 0]}
          minDistance={2.6}
          maxDistance={8}
          maxPolarAngle={Math.PI / 2.05}
          minAzimuthAngle={-0.98}
          maxAzimuthAngle={0.98}
          enablePan={false}
        />
      </Canvas>

      <div className="lobby-cursor-glow" style={{ left: cursor.x, top: cursor.y }} />
      <div className="lobby-cursor-cross" style={{ left: cursor.x, top: cursor.y }} />

      <div className="lobby-overlay">
        <div className="lobby-brand">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c44b4b', boxShadow: '0 0 10px #c44b4b' }} />
            <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: '#7a8a9e' }}>Yinmai · Shanghai Archive</span>
          </div>
          <h1 className="republican-header mt-2 font-bold" style={{ color: '#d4a853', fontSize: 'clamp(42px, 7vw, 84px)', fontFamily: 'var(--font-serif)', letterSpacing: '0.08em', lineHeight: 1 }}>
            隐脉申城
          </h1>
          <p className="text-xs mt-3 max-w-sm" style={{ color: '#7a8a9e', lineHeight: 1.7 }}>
            1930 年代上海地下革命网络数字档案馆。拖动视角，点击房间里的陈设进入档案模块。
          </p>
        </div>

        <div className="lobby-compass">
          <div style={{ width: 46, height: 46, opacity: 0.9 }}>
            <SecretCompass />
          </div>
          <span className="text-[10px] font-serif" style={{ color: '#7a8a9e' }}>拖动查看</span>
        </div>

        <div className="lobby-quick-nav">
          {(Object.keys(ROOM_MODULES) as RoomModule[]).map(key => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="px-2.5 py-1.5 rounded text-[10px] font-serif tracking-wider"
              style={{
                color: active === key ? '#d4a853' : '#7a8a9e',
                backgroundColor: active === key ? 'rgba(214,168,83,0.12)' : 'rgba(10,10,16,0.78)',
                border: `1px solid ${active === key ? 'rgba(214,168,83,0.35)' : 'rgba(214,168,83,0.12)'}`,
              }}
            >
              {ROOM_MODULES[key].title.replace('档案大厅办公桌', '办公桌').replace('上海时空地图', '地图').replace('地下情报网', '情报网').replace('历史纪年打字机', '纪年').replace('人物档案柜', '人物').replace('异常发现保险柜', '异常')}
            </button>
          ))}
        </div>
      </div>

      {active && <ArchiveDrawer module={active} onClose={() => setActive(null)} />}
    </div>
  )
}
