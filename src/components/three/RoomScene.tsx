import React, { ReactNode, useMemo, useState } from 'react'
import { Edges, Html, Line, RoundedBox, Sparkles, useCursor } from '@react-three/drei'
import * as THREE from 'three'

export type RoomModule = 'overview' | 'map' | 'graph' | 'timeline' | 'portrait' | 'anomalies'

const GOLD = '#d4a853'
const RED = '#c44b4b'
const INDIGO = '#3d5a80'
const SLATE = '#7a8a9e'
const WALL_DARK = '#0a0a12'
const WALL_PANEL = '#11121c'
const WOOD_DARK = '#1c120c'
const WOOD_MID = '#2c1a10'
const WOOD_WARM = '#4a2f1b'
const BRASS = '#b98a3d'

type Vec3 = [number, number, number]

function Hotspot({
  position,
  rotation = [0, 0, 0],
  label,
  onSelect,
  children,
}: {
  position: Vec3
  rotation?: Vec3
  label: string
  onSelect: () => void
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  return (
    <group position={position} rotation={rotation}>
      <group
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        {children}
      </group>
      {hovered && (
        <Html center position={[0, 1.25, 0]} distanceFactor={8} zIndexRange={[20, 0]}>
          <div className="room-hotspot-tag">{label}</div>
        </Html>
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Canvas texture helpers. Everything is generated at runtime so no external
// assets are required and the style stays tightly coupled to the archive theme.
// ---------------------------------------------------------------------------
function useCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w: number,
  h: number,
): THREE.Texture {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    draw(ctx, w, h)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
    return texture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function drawWoodFloor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#241711'
  ctx.fillRect(0, 0, w, h)

  const plankW = w / 8
  for (let i = 0; i <= 8; i++) {
    const x = i * plankW
    ctx.fillStyle = 'rgba(0,0,0,0.52)'
    ctx.fillRect(x - 1, 0, 2, h)
  }

  for (let row = 0; row < 5; row++) {
    const y = ((row + 1) * h) / 5
    const offset = (row % 2) * plankW * 0.5
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    for (let i = 0; i < 8; i++) {
      const x = i * plankW + offset
      ctx.fillRect(x, y, plankW * 0.72, 1)
    }
  }

  for (let i = 0; i < 150; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const len = 70 + Math.random() * 150
    ctx.strokeStyle = `rgba(0,0,0,${0.035 + Math.random() * 0.055})`
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(
      x + len * 0.3,
      y + (Math.random() * 10 - 5),
      x + len * 0.6,
      y + (Math.random() * 10 - 5),
      x + len,
      y + (Math.random() * 10 - 5),
    )
    ctx.stroke()
  }

  const sheen = ctx.createLinearGradient(0, 0, w, h)
  sheen.addColorStop(0, 'rgba(255,255,255,0.02)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)')
  sheen.addColorStop(1, 'rgba(255,255,255,0.015)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h)
}

function drawRug(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2a1418'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = GOLD
  ctx.lineWidth = 7
  ctx.strokeRect(26, 22, w - 52, h - 44)

  ctx.strokeStyle = 'rgba(214,168,83,0.5)'
  ctx.lineWidth = 2
  ctx.strokeRect(40, 36, w - 80, h - 72)

  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(46, 42, w - 92, h - 84)

  ctx.strokeStyle = 'rgba(214,168,83,0.11)'
  ctx.lineWidth = 2
  for (let x = 96; x < w; x += 92) {
    for (let y = 84; y < h; y += 92) {
      ctx.beginPath()
      ctx.moveTo(x, y - 24)
      ctx.lineTo(x + 24, y)
      ctx.lineTo(x, y + 24)
      ctx.lineTo(x - 24, y)
      ctx.closePath()
      ctx.stroke()
    }
  }

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  rotate = 0,
  alpha = 1,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotate)
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  ctx.font = `bold ${size}px "Noto Serif SC","Source Han Serif SC",SimSun,serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function riverBand(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  width: number,
  fill: string,
  stroke: string,
) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = fill
  ctx.fillStyle = fill
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.stroke()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

function drawShanghaiMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#1a1a22'
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
  }

  ctx.strokeStyle = 'rgba(214,168,83,0.055)'
  ctx.lineWidth = 1
  for (let x = 0; x <= w; x += 128) {
    ctx.beginPath()
    ctx.moveTo(x, 122)
    ctx.lineTo(x, 720)
    ctx.stroke()
  }
  for (let y = 122; y <= 720; y += 100) {
    ctx.beginPath()
    ctx.moveTo(48, y)
    ctx.lineTo(976, y)
    ctx.stroke()
  }

  // Huangpu river, flowing from north toward the southeast bend.
  riverBand(
    ctx,
    [
      [700, 112],
      [660, 280],
      [628, 430],
      [700, 560],
      [826, 646],
      [980, 706],
    ],
    72,
    '#2f4a68',
    '#4d7294',
  )

  // Suzhou creek joining the Huangpu near the Bund.
  riverBand(
    ctx,
    [
      [40, 328],
      [240, 312],
      [450, 328],
      [622, 358],
    ],
    17,
    '#2f4a68',
    '#4d7294',
  )

  // Old walled city with radiating streets.
  ctx.strokeStyle = 'rgba(214,168,83,0.68)'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.arc(356, 548, 92, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(214,168,83,0.3)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(356 + Math.cos(a) * 36, 548 + Math.sin(a) * 36)
    ctx.lineTo(356 + Math.cos(a) * 92, 548 + Math.sin(a) * 92)
    ctx.stroke()
  }

  // Street grid.
  ctx.strokeStyle = 'rgba(214,168,83,0.18)'
  ctx.lineWidth = 1
  for (let x = 170; x <= 560; x += 70) {
    ctx.beginPath()
    ctx.moveTo(x, 150)
    ctx.lineTo(x, 700)
    ctx.stroke()
  }
  for (let y = 160; y <= 700; y += 78) {
    ctx.beginPath()
    ctx.moveTo(70, y)
    ctx.lineTo(600, y)
    ctx.stroke()
  }

  // Named avenues and the Bund.
  const avenue = (x1: number, y1: number, x2: number, y2: number, width: number, alpha = 0.58) => {
    ctx.strokeStyle = `rgba(214,168,83,${alpha})`
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  avenue(180, 300, 640, 300, 3)
  avenue(180, 428, 600, 428, 3)
  avenue(300, 160, 300, 540, 2.4, 0.42)
  avenue(480, 160, 480, 520, 2.4, 0.42)
  avenue(622, 165, 622, 560, 4, 0.8)

  // Underground network motif: red dashes and nodes.
  ctx.setLineDash([9, 7])
  ctx.strokeStyle = 'rgba(196,75,75,0.7)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(340, 262)
  ctx.lineTo(500, 330)
  ctx.lineTo(618, 300)
  ctx.lineTo(500, 470)
  ctx.lineTo(382, 430)
  ctx.lineTo(300, 350)
  ctx.closePath()
  ctx.stroke()
  ctx.setLineDash([])

  const nodes: number[][] = [
    [340, 262],
    [500, 330],
    [618, 300],
    [500, 470],
    [382, 430],
    [300, 350],
  ]
  for (const [nx, ny] of nodes) {
    ctx.fillStyle = 'rgba(196,75,75,0.35)'
    ctx.beginPath()
    ctx.arc(nx, ny, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c44b4b'
    ctx.beginPath()
    ctx.arc(nx, ny, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  label(ctx, '上海市區全圖', 512, 66, 40, GOLD)
  label(ctx, '中華民國二十五年 · 檔案館測繪', 512, 108, 16, SLATE)
  label(ctx, '公共租界', 300, 220, 18, 'rgba(214,168,83,0.68)')
  label(ctx, '法租界', 250, 490, 18, 'rgba(214,168,83,0.68)')
  label(ctx, '南市', 356, 600, 18, 'rgba(214,168,83,0.72)')
  label(ctx, '閘北', 430, 168, 18, 'rgba(214,168,83,0.58)')
  label(ctx, '浦東', 830, 360, 20, 'rgba(214,168,83,0.62)')
  label(ctx, '楊樹浦', 800, 180, 16, 'rgba(214,168,83,0.55)')
  label(ctx, '黃浦江', 730, 430, 17, '#7fa1bd', 0.5)
  label(ctx, '蘇州河', 330, 300, 14, '#7fa1bd', 0.08)

  // Compass rose.
  const cx = 900
  const cy = 660
  ctx.strokeStyle = 'rgba(214,168,83,0.8)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(cx, cy, 24, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, cy - 30)
  ctx.lineTo(cx, cy + 30)
  ctx.moveTo(cx - 30, cy)
  ctx.lineTo(cx + 30, cy)
  ctx.stroke()
  ctx.fillStyle = RED
  ctx.beginPath()
  ctx.moveTo(cx, cy - 28)
  ctx.lineTo(cx + 7, cy)
  ctx.lineTo(cx, cy + 28)
  ctx.lineTo(cx - 7, cy)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = GOLD
  ctx.lineWidth = 5
  ctx.strokeRect(18, 18, w - 36, h - 36)
  ctx.strokeStyle = 'rgba(214,168,83,0.55)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(30, 30, w - 60, h - 60)

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.24, w / 2, h / 2, h * 0.74)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.48)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

function drawWindowBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#070b18')
  sky.addColorStop(0.55, '#101a2b')
  sky.addColorStop(1, '#1b2433')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#e8e3d0'
  ctx.beginPath()
  ctx.arc(w * 0.72, h * 0.22, 42, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(232,227,208,0.13)'
  ctx.beginPath()
  ctx.arc(w * 0.72, h * 0.22, 72, 0, Math.PI * 2)
  ctx.fill()

  const buildings: number[][] = [
    [0, 360, 130, 210],
    [140, 300, 90, 270],
    [240, 400, 120, 170],
    [370, 250, 80, 320],
    [460, 360, 110, 210],
    [580, 280, 90, 290],
    [680, 400, 120, 170],
    [810, 220, 90, 350],
    [910, 360, 114, 210],
  ]
  for (const [bx, by, bw, bh] of buildings) {
    ctx.fillStyle = '#05070d'
    ctx.fillRect(bx, by, bw, bh)
    ctx.strokeStyle = 'rgba(214,168,83,0.18)'
    ctx.lineWidth = 1
    ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6)
  }

  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(214,168,83,${0.25 + Math.random() * 0.55})`
    ctx.fillRect(20 + Math.random() * (w - 40), 260 + Math.random() * 360, 6, 8)
  }

  ctx.fillStyle = 'rgba(61,90,128,0.16)'
  ctx.fillRect(0, h - 150, w, 150)
}

function drawPortrait(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#2b2118')
  bg.addColorStop(1, '#17130e')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#0c0a08'
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.36, w * 0.19, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(w * 0.5, h * 0.78, w * 0.32, h * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(214,168,83,0.16)'
  ctx.fillRect(w * 0.18, h * 0.06, w * 0.64, 3)
  ctx.fillRect(w * 0.18, h * 0.9, w * 0.64, 3)
  ctx.fillRect(w * 0.18, h * 0.06, 3, h * 0.84)
  ctx.fillRect(w * 0.82, h * 0.06, 3, h * 0.84)

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

// ---------------------------------------------------------------------------
// Architecture
// ---------------------------------------------------------------------------
function Floor() {
  const wood = useCanvasTexture(drawWoodFloor, 1024, 1024)
  const rug = useCanvasTexture(drawRug, 1024, 768)

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[9.2, 9.2]} />
        <meshStandardMaterial map={wood} roughness={0.78} metalness={0.04} color="#ffffff" />
      </mesh>

      <Line
        points={[
          [-4.08, 0.012, -4.08],
          [4.08, 0.012, -4.08],
          [4.08, 0.012, 4.08],
          [-4.08, 0.012, 4.08],
          [-4.08, 0.012, -4.08],
        ]}
        color={GOLD}
        lineWidth={0.8}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.2]} receiveShadow>
        <planeGeometry args={[3.7, 2.75]} />
        <meshStandardMaterial map={rug} roughness={0.96} color="#ffffff" />
      </mesh>
    </group>
  )
}

function Ceiling() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.64, 0]}>
        <planeGeometry args={[9.2, 9.2]} />
        <meshStandardMaterial color="#0b0b13" roughness={0.96} />
      </mesh>
      {[-2.25, 0, 2.25].map((x) => (
        <mesh key={x} position={[x, 3.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.15, 9, 0.13]} />
          <meshStandardMaterial color="#171721" roughness={0.72} />
        </mesh>
      ))}
      {[-2.25, 0, 2.25].map((z) => (
        <mesh key={z} position={[0, 3.58, z]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[9, 0.15, 0.13]} />
          <meshStandardMaterial color="#171721" roughness={0.72} />
        </mesh>
      ))}
      <Line
        points={[
          [-4.1, 3.52, -4.1],
          [4.1, 3.52, -4.1],
          [4.1, 3.52, 4.1],
          [-4.1, 3.52, 4.1],
          [-4.1, 3.52, -4.1],
        ]}
        color={GOLD}
        lineWidth={0.7}
      />
    </group>
  )
}

function WallPanel({
  position,
  rotation,
  width,
  height,
  insetColor = WALL_PANEL,
}: {
  position: Vec3
  rotation: Vec3
  width: number
  height: number
  insetColor?: string
}) {
  const halfW = width / 2
  const halfH = height / 2
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={insetColor} roughness={0.9} />
      </mesh>
      <Line
        points={[
          [-halfW, -halfH, 0.012],
          [halfW, -halfH, 0.012],
          [halfW, halfH, 0.012],
          [-halfW, halfH, 0.012],
          [-halfW, -halfH, 0.012],
        ]}
        color={GOLD}
        lineWidth={0.55}
      />
    </group>
  )
}

function Walls() {
  return (
    <group>
      <mesh position={[0, 1.8, -4.5]}>
        <boxGeometry args={[9, 3.6, 0.18]} />
        <meshStandardMaterial color={WALL_DARK} roughness={0.96} />
      </mesh>
      <mesh position={[-4.5, 1.8, 0]}>
        <boxGeometry args={[0.18, 3.6, 9]} />
        <meshStandardMaterial color={WALL_DARK} roughness={0.96} />
      </mesh>
      <mesh position={[4.5, 1.8, 0]}>
        <boxGeometry args={[0.18, 3.6, 9]} />
        <meshStandardMaterial color={WALL_DARK} roughness={0.96} />
      </mesh>

      {/* Wainscot lower band. */}
      <mesh position={[0, 0.55, -4.4]}>
        <boxGeometry args={[9, 1.1, 0.04]} />
        <meshStandardMaterial color="#13111b" roughness={0.92} />
      </mesh>
      <mesh position={[-4.4, 0.55, 0]}>
        <boxGeometry args={[0.04, 1.1, 9]} />
        <meshStandardMaterial color="#13111b" roughness={0.92} />
      </mesh>
      <mesh position={[4.4, 0.55, 0]}>
        <boxGeometry args={[0.04, 1.1, 9]} />
        <meshStandardMaterial color="#13111b" roughness={0.92} />
      </mesh>

      {/* Chair rail and crown trim. */}
      <mesh position={[0, 1.12, -4.4]}>
        <boxGeometry args={[9, 0.035, 0.05]} />
        <meshStandardMaterial color={WOOD_WARM} roughness={0.62} />
      </mesh>
      <mesh position={[-4.4, 1.12, 0]}>
        <boxGeometry args={[0.05, 0.035, 9]} />
        <meshStandardMaterial color={WOOD_WARM} roughness={0.62} />
      </mesh>
      <mesh position={[4.4, 1.12, 0]}>
        <boxGeometry args={[0.05, 0.035, 9]} />
        <meshStandardMaterial color={WOOD_WARM} roughness={0.62} />
      </mesh>

      <mesh position={[0, 3.48, -4.4]}>
        <boxGeometry args={[9, 0.05, 0.06]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[-4.4, 3.48, 0]}>
        <boxGeometry args={[0.06, 0.05, 9]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[4.4, 3.48, 0]}>
        <boxGeometry args={[0.06, 0.05, 9]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>

      {/* Back wall panels flanking the intelligence wall. */}
      <WallPanel position={[-3.15, 2.1, -4.42]} rotation={[0, 0, 0]} width={1.25} height={2.3} />
      <WallPanel position={[3.15, 2.1, -4.42]} rotation={[0, 0, 0]} width={1.25} height={2.3} />

      {/* Left wall lower panels. */}
      <WallPanel position={[-4.42, 0.55, -2.3]} rotation={[0, Math.PI / 2, 0]} width={1.2} height={1.05} insetColor="#171019" />
      <WallPanel position={[-4.42, 0.55, 0.2]} rotation={[0, Math.PI / 2, 0]} width={1.2} height={1.05} insetColor="#171019" />
      <WallPanel position={[-4.42, 0.55, 2.7]} rotation={[0, Math.PI / 2, 0]} width={1.2} height={1.05} insetColor="#171019" />

      {/* Right wall lower panels. */}
      <WallPanel position={[4.42, 0.55, -2.3]} rotation={[0, -Math.PI / 2, 0]} width={1.2} height={1.05} insetColor="#171019" />
      <WallPanel position={[4.42, 0.55, 0.2]} rotation={[0, -Math.PI / 2, 0]} width={1.2} height={1.05} insetColor="#171019" />
      <WallPanel position={[4.42, 0.55, 2.7]} rotation={[0, -Math.PI / 2, 0]} width={1.2} height={1.05} insetColor="#171019" />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Wall decor
// ---------------------------------------------------------------------------
function ShanghaiMapWall({ onSelect }: { onSelect: () => void }) {
  const map = useCanvasTexture(drawShanghaiMap, 1024, 768)
  return (
    <Hotspot position={[0, 1.85, -4.42]} rotation={[0, 0, 0]} label="上海市區全圖" onSelect={onSelect}>
      <RoundedBox args={[2.62, 2.02, 0.08]} radius={0.02} castShadow>
        <meshStandardMaterial color="#20150d" roughness={0.62} metalness={0.08} />
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[2.38, 1.78]} />
        <meshStandardMaterial map={map} roughness={0.9} />
      </mesh>
      {[
        [-1.13, 0.82],
        [1.13, 0.82],
        [-1.13, -0.82],
        [1.13, -0.82],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.055]}>
          <cylinderGeometry args={[0.05, 0.05, 0.015, 18]} />
          <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.65} />
        </mesh>
      ))}
    </Hotspot>
  )
}

function Window() {
  const backdrop = useCanvasTexture(drawWindowBackdrop, 1024, 768)
  return (
    <group position={[4.47, 1.95, -0.7]} rotation={[0, -Math.PI / 2, 0]}>
      <RoundedBox args={[2.1, 1.62, 0.09]} radius={0.02}>
        <meshStandardMaterial color="#20150d" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.84, 1.36]} />
        <meshStandardMaterial map={backdrop} roughness={1} emissive="#0c1626" emissiveIntensity={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <boxGeometry args={[0.045, 1.36, 0.02]} />
        <meshStandardMaterial color="#20150d" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <boxGeometry args={[1.84, 0.045, 0.02]} />
        <meshStandardMaterial color="#20150d" roughness={0.55} />
      </mesh>
      <pointLight position={[-0.4, 0.1, 0.8]} intensity={3.2} distance={6} color="#5d7ca8" />
    </group>
  )
}

function WallSconce({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.045, 0.07, 0.14, 14]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[0, 0.19, 0.02]}>
        <sphereGeometry args={[0.06, 14, 14]} />
        <meshStandardMaterial color="#ffd98a" emissive="#ffd98a" emissiveIntensity={2.4} />
      </mesh>
      <pointLight position={[0, 0.12, 0.35]} intensity={1.5} distance={3.2} color={GOLD} />
    </group>
  )
}

function WallClock({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.25, 0.25, 0.07, 28]} />
        <meshStandardMaterial color="#1c120c" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <cylinderGeometry args={[0.19, 0.19, 0.018, 28]} />
        <meshStandardMaterial color="#d9d2c0" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0, 0.052]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.012, 0.15, 0.006]} />
        <meshStandardMaterial color="#1c120c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.052]} rotation={[0, 0, 2.2]}>
        <boxGeometry args={[0.012, 0.1, 0.006]} />
        <meshStandardMaterial color="#1c120c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  )
}

function FramedPortraits() {
  const a = useCanvasTexture(drawPortrait, 256, 320)
  const b = useCanvasTexture(drawPortrait, 256, 320)
  return (
    <group position={[4.47, 1.78, 1.45]} rotation={[0, -Math.PI / 2, 0]}>
      {[
        { z: 0, tex: a, tilt: 0.02 },
        { z: 0.54, tex: b, tilt: -0.02 },
      ].map((p, i) => (
        <group key={i} position={[0, 0, p.z]} rotation={[0, 0, p.tilt]}>
          <RoundedBox args={[0.42, 0.54, 0.04]} radius={0.01}>
            <meshStandardMaterial color="#24160f" roughness={0.55} />
          </RoundedBox>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[0.34, 0.46]} />
            <meshStandardMaterial map={p.tex} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------
function Desk({ onSelect }: { onSelect: () => void }) {
  return (
    <Hotspot position={[0, 0, 0.35]} label="檔案大廳辦公桌" onSelect={onSelect}>
      <RoundedBox args={[1.9, 0.08, 0.86]} radius={0.02} position={[0, 0.79, 0]} castShadow>
        <meshStandardMaterial color="#171318" roughness={0.78} metalness={0.04} />
      </RoundedBox>

      {/* Left pedestal with drawers. */}
      <RoundedBox args={[0.58, 0.7, 0.58]} radius={0.02} position={[-0.64, 0.35, -0.07]} castShadow>
        <meshStandardMaterial color="#1a1310" roughness={0.82} />
      </RoundedBox>
      {[0.47, 0.24].map((y, i) => (
        <mesh key={i} position={[-0.64, y, 0.24]}>
          <boxGeometry args={[0.4, 0.12, 0.012]} />
          <meshStandardMaterial color="#3c2413" roughness={0.72} />
        </mesh>
      ))}
      <mesh position={[-0.64, 0.47, 0.25]}>
        <cylinderGeometry args={[0.035, 0.035, 0.02, 14]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[-0.64, 0.24, 0.25]}>
        <cylinderGeometry args={[0.035, 0.035, 0.02, 14]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.65} />
      </mesh>

      {/* Right pedestal with door. */}
      <RoundedBox args={[0.58, 0.7, 0.58]} radius={0.02} position={[0.64, 0.35, -0.07]} castShadow>
        <meshStandardMaterial color="#1a1310" roughness={0.82} />
      </RoundedBox>
      <mesh position={[0.64, 0.35, 0.24]}>
        <boxGeometry args={[0.4, 0.52, 0.012]} />
        <meshStandardMaterial color="#3c2413" roughness={0.72} />
      </mesh>
      <mesh position={[0.5, 0.35, 0.25]}>
        <cylinderGeometry args={[0.035, 0.035, 0.02, 14]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.65} />
      </mesh>

      {/* Modesty panel. */}
      <mesh position={[0, 0.45, -0.36]}>
        <boxGeometry args={[1.5, 0.5, 0.03]} />
        <meshStandardMaterial color="#151015" roughness={0.86} />
      </mesh>

      {/* Leather blotter. */}
      <RoundedBox args={[0.58, 0.018, 0.4]} radius={0.005} position={[-0.15, 0.84, 0.08]}>
        <meshStandardMaterial color="#2d1f14" roughness={0.94} />
      </RoundedBox>

      {/* Papers and a brass document tray. */}
      <mesh position={[0.34, 0.855, 0.12]} rotation={[0, 0.12, 0]}>
        <boxGeometry args={[0.26, 0.006, 0.2]} />
        <meshStandardMaterial color="#d9d2c0" roughness={0.92} />
      </mesh>
      <mesh position={[0.36, 0.862, 0.12]} rotation={[0, -0.08, 0]}>
        <boxGeometry args={[0.26, 0.006, 0.2]} />
        <meshStandardMaterial color="#ece7db" roughness={0.92} />
      </mesh>
      <mesh position={[0.25, 0.87, 0.2]}>
        <boxGeometry args={[0.28, 0.012, 0.012]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
      </mesh>

      {/* Telephone. */}
      <group position={[0.56, 0.855, 0.2]}>
        <RoundedBox args={[0.14, 0.05, 0.16]} radius={0.015}>
          <meshStandardMaterial color="#0f0d0f" roughness={0.45} metalness={0.35} />
        </RoundedBox>
        <mesh position={[-0.09, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.16, 10]} />
          <meshStandardMaterial color="#0f0d0f" roughness={0.45} metalness={0.35} />
        </mesh>
      </group>

      {/* Brass desk lamp. */}
      <group position={[-0.72, 0.86, -0.16]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.11, 0.06, 18]} />
          <meshStandardMaterial color="#6a4b22" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.17, 0]} rotation={[0.45, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.2, 8]} />
          <meshStandardMaterial color="#7a5a2b" roughness={0.4} metalness={0.55} />
        </mesh>
        <mesh position={[0.08, 0.35, 0.02]}>
          <sphereGeometry args={[0.05, 14, 14]} />
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={2.5} />
        </mesh>
        <pointLight position={[0.08, 0.3, 0.08]} intensity={1.2} distance={2.4} color={GOLD} />
      </group>
    </Hotspot>
  )
}

function DeskChair() {
  return (
    <group position={[1.3, 0, -0.25]} rotation={[0, 0.34, 0]} castShadow>
      <RoundedBox args={[0.46, 0.08, 0.44]} radius={0.03} position={[0, 0.44, 0]}>
        <meshStandardMaterial color="#151013" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.44, 0.76, 0.06]} radius={0.03} position={[0, 0.84, -0.2]} rotation={[-0.14, 0, 0]}>
        <meshStandardMaterial color="#151013" roughness={0.85} />
      </RoundedBox>
      {[
        [-0.18, 0.22, -0.16],
        [0.18, 0.22, -0.16],
        [-0.18, 0.22, 0.16],
        [0.18, 0.22, 0.16],
      ].map((pos, i) => (
        <mesh key={i} position={pos as Vec3}>
          <cylinderGeometry args={[0.022, 0.022, 0.44, 8]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Bookshelf() {
  const bookColors = ['#5b3d2a', '#3a2a1f', '#7a2f2f', '#2f4a68', '#6e5a3a', '#4a4a52', '#2f5d4a']
  return (
    <group position={[-3.25, 1.0, -3.95]}>
      <RoundedBox args={[0.98, 1.15, 0.24]} radius={0.02} castShadow>
        <meshStandardMaterial color="#170f0b" roughness={0.8} />
      </RoundedBox>
      {[0.28, 0.55, 0.82].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.94, 0.025, 0.2]} />
          <meshStandardMaterial color="#2c1a10" roughness={0.55} />
        </mesh>
      ))}
      {[-0.31, 0, 0.31].map((x, i) => (
        <group key={i} position={[x, 0.42, 0.06]}>
          {[0, 0.09, 0.18, 0.27].map((y, j) => {
            const lean = (i + j) % 3 === 0 ? 0.12 : 0
            return (
              <group key={j} position={[0, y, 0]} rotation={[0, 0, lean]}>
                <mesh>
                  <boxGeometry args={[0.09, 0.105, 0.1]} />
                  <meshStandardMaterial color={bookColors[(i * 4 + j) % bookColors.length]} roughness={0.78} />
                </mesh>
              </group>
            )
          })}
        </group>
      ))}
      <mesh position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#233d5e" roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.08, 0]} rotation={[Math.PI / 2, 0, 0.4]}>
        <torusGeometry args={[0.1, 0.008, 8, 28]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  )
}

function MapTable({ onSelect }: { onSelect: () => void }) {
  const map = useCanvasTexture(drawShanghaiMap, 512, 384)
  return (
    <Hotspot position={[-2.75, 0, 0.45]} label="上海時空地圖" onSelect={onSelect}>
      <RoundedBox args={[1.35, 0.07, 0.82]} radius={0.02} position={[0, 0.72, 0]} castShadow>
        <meshStandardMaterial color="#171119" roughness={0.78} />
      </RoundedBox>
      <mesh position={[0, 0.78, 0]}>
        <planeGeometry args={[1.18, 0.68]} />
        <meshStandardMaterial map={map} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.79, 0.35]}>
        <boxGeometry args={[1.2, 0.012, 0.012]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.79, -0.35]}>
        <boxGeometry args={[1.2, 0.012, 0.012]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh position={[-0.55, 0.36, -0.25]}>
        <cylinderGeometry args={[0.045, 0.055, 0.72, 12]} />
        <meshStandardMaterial color="#1b110b" roughness={0.85} />
      </mesh>
      <mesh position={[0.55, 0.36, -0.25]}>
        <cylinderGeometry args={[0.045, 0.055, 0.72, 12]} />
        <meshStandardMaterial color="#1b110b" roughness={0.85} />
      </mesh>
      <mesh position={[-0.55, 0.36, 0.25]}>
        <cylinderGeometry args={[0.045, 0.055, 0.72, 12]} />
        <meshStandardMaterial color="#1b110b" roughness={0.85} />
      </mesh>
      <mesh position={[0.55, 0.36, 0.25]}>
        <cylinderGeometry args={[0.045, 0.055, 0.72, 12]} />
        <meshStandardMaterial color="#1b110b" roughness={0.85} />
      </mesh>
      <mesh position={[0.22, 0.84, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.008, 8, 26]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
    </Hotspot>
  )
}

function FilingCabinet({ onSelect }: { onSelect: () => void }) {
  return (
    <Hotspot position={[2.95, 0, 0.35]} label="人物檔案櫃" onSelect={onSelect}>
      <RoundedBox args={[0.82, 1.22, 0.44]} radius={0.02} position={[0, 0.61, 0]} castShadow>
        <meshStandardMaterial color="#151219" roughness={0.78} />
      </RoundedBox>
      {[-0.42, -0.14, 0.14].map((y, i) => (
        <group key={i}>
          <mesh position={[0, y, 0.24]}>
            <boxGeometry args={[0.64, 0.13, 0.016]} />
            <meshStandardMaterial color="#4a3627" roughness={0.72} />
          </mesh>
          <mesh position={[0.14, y, 0.26]}>
            <boxGeometry args={[0.12, 0.02, 0.02]} />
            <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.72, 0.74, -0.14]}>
        <boxGeometry args={[0.14, 0.2, 0.02]} />
        <meshStandardMaterial color="#d9d2c0" roughness={0.9} />
      </mesh>
      <mesh position={[0.7, 0.76, -0.14]} rotation={[0, 0.12, 0]}>
        <boxGeometry args={[0.14, 0.2, 0.02]} />
        <meshStandardMaterial color="#ece7db" roughness={0.9} />
      </mesh>
    </Hotspot>
  )
}

function TypewriterTable({ onSelect }: { onSelect: () => void }) {
  return (
    <Hotspot position={[1.95, 0, -1.72]} label="歷史紀年打字機" onSelect={onSelect}>
      <RoundedBox args={[1.12, 0.07, 0.64]} radius={0.02} position={[0, 0.72, 0]} castShadow>
        <meshStandardMaterial color="#171119" roughness={0.78} />
      </RoundedBox>
      <mesh position={[-0.42, 0.36, -0.2]}>
        <cylinderGeometry args={[0.04, 0.05, 0.72, 10]} />
        <meshStandardMaterial color="#1b110b" roughness={0.85} />
      </mesh>
      <mesh position={[0.42, 0.36, -0.2]}>
        <cylinderGeometry args={[0.04, 0.05, 0.72, 10]} />
        <meshStandardMaterial color="#1b110b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.36, 0.25]}>
        <boxGeometry args={[0.9, 0.02, 0.1]} />
        <meshStandardMaterial color="#1b110b" roughness={0.85} />
      </mesh>

      <RoundedBox args={[0.66, 0.12, 0.32]} radius={0.02} position={[0, 0.8, 0]}>
        <meshStandardMaterial color="#151515" roughness={0.4} metalness={0.55} />
      </RoundedBox>
      <mesh position={[0.18, 0.92, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 22]} />
        <meshStandardMaterial color={GOLD} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.9, 0.12]}>
        <boxGeometry args={[0.12, 0.02, 0.24]} />
        <meshStandardMaterial color="#d9d2c0" roughness={0.9} />
      </mesh>
      {[[-0.1, 0.85, 0.1], [0, 0.85, 0.1], [0.1, 0.85, 0.1]].map((pos, i) => (
        <mesh key={i} position={pos as Vec3}>
          <cylinderGeometry args={[0.028, 0.028, 0.02, 10]} />
          <meshStandardMaterial color={GOLD} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </Hotspot>
  )
}

function AnomalySafe({ onSelect }: { onSelect: () => void }) {
  return (
    <Hotspot position={[-2.45, 0, -1.95]} label="異常發現保險櫃" onSelect={onSelect}>
      <RoundedBox args={[0.92, 1.08, 0.56]} radius={0.03} position={[0, 0.7, 0]} castShadow>
        <meshStandardMaterial color="#141014" roughness={0.55} metalness={0.22} />
      </RoundedBox>
      <mesh position={[0.16, 0.7, 0.3]}>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 26]} />
        <meshStandardMaterial color={RED} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0.16, 0.7, 0.33]}>
        <torusGeometry args={[0.1, 0.012, 8, 26]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[-0.26, 0.7, 0.31]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.5, 0.025, 0.01]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh position={[0.16, 0.7, 0.32]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.012, 0.12, 0.012]} />
        <meshStandardMaterial color="#0b090d" roughness={0.5} metalness={0.4} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.16, 0.3]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 1.26, 0.3]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
    </Hotspot>
  )
}

// ---------------------------------------------------------------------------
// Corner details and props
// ---------------------------------------------------------------------------
function Sideboard() {
  return (
    <group position={[3.45, 0, -4.18]} rotation={[0, Math.PI, 0]}>
      <RoundedBox args={[1.45, 0.95, 0.5]} radius={0.02} position={[0, 0.48, 0]} castShadow>
        <meshStandardMaterial color="#1a120e" roughness={0.78} />
      </RoundedBox>
      <mesh position={[0, 0.5, 0.27]}>
        <boxGeometry args={[1.28, 0.02, 0.014]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0.48, 0.27]}>
        <boxGeometry args={[0.02, 0.72, 0.014]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
      </mesh>
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.32, 0.27]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 14]} />
          <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
        </mesh>
      ))}

      {/* Old radio on top. */}
      <group position={[0.3, 1.0, 0]}>
        <RoundedBox args={[0.62, 0.34, 0.26]} radius={0.03}>
          <meshStandardMaterial color="#2a1d12" roughness={0.65} metalness={0.08} />
        </RoundedBox>
        <mesh position={[0, 0.06, 0.14]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
          <meshStandardMaterial color="#3a2a18" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.08, 0.14]}>
          <boxGeometry args={[0.3, 0.02, 0.012]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, -0.09, 0.14]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
            <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Stack of books + brass bookend. */}
      <group position={[-0.42, 1.03, 0.05]}>
        <mesh>
          <boxGeometry args={[0.28, 0.04, 0.22]} />
          <meshStandardMaterial color="#5b3d2a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[0.26, 0.04, 0.2]} />
          <meshStandardMaterial color="#2f4a68" roughness={0.8} />
        </mesh>
        <mesh position={[0.16, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.24, 0.02, 0.02]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
        </mesh>
      </group>
    </group>
  )
}

function Armchair({ position, rotation }: { position: Vec3; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation} castShadow>
      <RoundedBox args={[0.62, 0.2, 0.58]} radius={0.05} position={[0, 0.34, 0]}>
        <meshStandardMaterial color="#2d1a17" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.64, 0.72, 0.14]} radius={0.05} position={[0, 0.7, -0.22]} rotation={[-0.12, 0, 0]}>
        <meshStandardMaterial color="#2d1a17" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.2, 0.48, 0.54]} radius={0.04} position={[-0.22, 0.5, 0.01]}>
        <meshStandardMaterial color="#241410" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.2, 0.48, 0.54]} radius={0.04} position={[0.22, 0.5, 0.01]}>
        <meshStandardMaterial color="#241410" roughness={0.9} />
      </RoundedBox>
    </group>
  )
}

function FloorLamp({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.24, 0.28, 0.06, 22]} />
        <meshStandardMaterial color="#24150d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 1.58, 10]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.68, 0]} rotation={[0.25, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0.05, 1.8, 0.02]} rotation={[0.6, 0, 0]}>
        <coneGeometry args={[0.19, 0.2, 24]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.7} />
      </mesh>
      <mesh position={[0.05, 1.75, 0.02]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#ffd98a" emissive="#ffd98a" emissiveIntensity={2.2} />
      </mesh>
      <pointLight position={[0.05, 1.7, 0.02]} intensity={1.7} distance={4} color={GOLD} />
    </group>
  )
}

function PottedPlant({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.23, 0.17, 0.36, 20]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.18, 0.24, 0.08, 20]} />
        <meshStandardMaterial color="#2b1d15" roughness={0.88} />
      </mesh>
      {[
        [-0.1, 0.58, 0],
        [0.1, 0.62, 0],
        [0, 0.68, 0.03],
        [-0.18, 0.5, 0.05],
        [0.18, 0.52, -0.05],
        [0.05, 0.74, -0.08],
      ].map((pos, i) => (
        <mesh key={i} position={pos as Vec3} castShadow>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshStandardMaterial color="#24382a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function CoatRack({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 0.06, 22]} />
        <meshStandardMaterial color="#20150d" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.72, 12]} />
        <meshStandardMaterial color="#2c1a10" roughness={0.7} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[0.02, 1.72, 0.13]} rotation={[Math.PI / 2.6, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.24, 8]} />
            <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[0.02, 1.66, 0.23]}>
            <sphereGeometry args={[0.025, 10, 10]} />
            <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.88, 0]}>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.65} />
      </mesh>
    </group>
  )
}

function Globe({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.06, 22]} />
        <meshStandardMaterial color="#24150d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.7, 12]} />
        <meshStandardMaterial color="#2c1a10" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color="#233d5e" roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.82, 0]} rotation={[0, 0, 0.35]}>
        <torusGeometry args={[0.37, 0.02, 8, 44]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.012, 8, 44]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.6} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
export default function RoomScene({ onSelect }: { onSelect: (module: RoomModule) => void }) {
  return (
    <group>
      <Floor />
      <Ceiling />
      <Walls />

      {/* Wall details. */}
      <IntelligenceWall onSelect={() => onSelect('graph')} />
      <ShanghaiMapWall onSelect={() => onSelect('map')} />
      <Window />
      <FramedPortraits />
      <WallClock position={[3.2, 2.45, -4.42]} />
      <WallSconce position={[-2.5, 2.35, -4.42]} rotation={[0, 0, 0]} />
      <WallSconce position={[2.5, 2.35, -4.42]} rotation={[0, 0, 0]} />
      <WallSconce position={[-4.42, 2.25, -2.5]} rotation={[0, Math.PI / 2, 0]} />
      <WallSconce position={[4.42, 2.25, 3.5]} rotation={[0, -Math.PI / 2, 0]} />

      {/* Furniture. */}
      <Desk onSelect={() => onSelect('overview')} />
      <DeskChair />
      <Bookshelf />
      <MapTable onSelect={() => onSelect('map')} />
      <FilingCabinet onSelect={() => onSelect('portrait')} />
      <TypewriterTable onSelect={() => onSelect('timeline')} />
      <AnomalySafe onSelect={() => onSelect('anomalies')} />

      {/* Corner props. */}
      <Sideboard />
      <Armchair position={[3.0, 0, -3.25]} rotation={[0, -0.65, 0]} />
      <FloorLamp position={[3.95, 0, -3.55]} />
      <PottedPlant position={[-3.65, 0, 3.05]} />
      <CoatRack position={[3.7, 0, 2.75]} />
      <Globe position={[-1.95, 0, 1.75]} />

      <Sparkles count={44} scale={[8, 4, 8]} size={1.5} speed={0.18} color={GOLD} opacity={0.25} />
    </group>
  )
}

function IntelligenceWall({ onSelect }: { onSelect: () => void }) {
  return (
    <Hotspot position={[-4.42, 1.8, 1.15]} rotation={[0, Math.PI / 2, 0]} label="地下情報網" onSelect={onSelect}>
      <group>
        <Line
          points={[[-1.4, 0.3, 0.04], [-0.5, 0.9, 0.04], [0.1, 0.2, 0.04], [1.2, 0.95, 0.04], [0.4, 1.5, 0.04], [-0.8, 1.55, 0.04]]}
          color={RED}
          lineWidth={1}
        />
        <Line
          points={[[-1.4, 0.3, 0.04], [-1.9, 0.7, 0.04], [-1.2, 1.25, 0.04], [-0.8, 1.55, 0.04]]}
          color={SLATE}
          lineWidth={0.6}
        />
        <Line
          points={[[0.1, 0.2, 0.04], [0.7, 0.5, 0.04], [1.2, 0.95, 0.04]]}
          color={SLATE}
          lineWidth={0.6}
        />
        <Line points={[[-0.5, 0.9, 0.04], [0.4, 1.5, 0.04]]} color={GOLD} lineWidth={0.7} />
        <Line
          points={[[-1.4, 0.3, 0.03], [0.4, 1.5, 0.03], [1.2, 0.95, 0.03]]}
          color={GOLD}
          lineWidth={1}
        />

        {[
          [-1.4, 0.3, GOLD],
          [-0.5, 0.9, RED],
          [0.1, 0.2, SLATE],
          [1.2, 0.95, GOLD],
          [0.4, 1.5, RED],
          [-0.8, 1.55, SLATE],
        ].map(([x, y, color], i) => (
          <mesh key={i} position={[x as number, y as number, 0.02]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={color as string} emissive={color as string} emissiveIntensity={1.7} />
          </mesh>
        ))}

        {[
          [-1.9, 0.7],
          [-1.2, 1.25],
          [0.7, 0.5],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x as number, y as number, 0.02]}>
            <boxGeometry args={[0.055, 0.038, 0.02]} />
            <meshStandardMaterial color={i === 2 ? RED : GOLD} emissive={i === 2 ? RED : GOLD} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
    </Hotspot>
  )
}
