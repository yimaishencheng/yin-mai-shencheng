import React from 'react'

/** 首页 Hero —— 申城暗脉 */
export function HeroSilhouette(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120" width="100%" height="100%" {...props}>
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--bg-primary)" stopOpacity="0.9" />
          <stop offset="50%" stopColor="var(--bg-primary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--bg-primary)" stopOpacity="0.9" />
        </linearGradient>
        <filter id="goldGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect width="600" height="120" fill="url(#skyGrad)" />
      <g fill="rgba(122, 138, 158, 0.12)" stroke="rgba(122, 138, 158, 0.2)" strokeWidth="0.5">
        <rect x="50" y="90" width="40" height="30" />
        <rect x="70" y="75" width="15" height="15" />
        <path d="M 110 120 L 110 80 Q 125 70 140 80 L 140 120 Z" />
        <path d="M 120 80 L 120 68 Q 125 62 130 68 L 130 80 Z" />
        <rect x="160" y="70" width="45" height="50" />
        <rect x="172" y="45" width="20" height="25" />
        <path d="M 179 45 L 182 30 L 182 15 L 183 15 L 183 30 Z" />
        <circle cx="182" cy="53" r="4" fill="rgba(214, 168, 83, 0.25)" />
        <rect x="220" y="75" width="35" height="45" />
        <path d="M 220 75 L 237.5 40 L 255 75 Z" />
        <rect x="280" y="80" width="60" height="40" />
        <rect x="290" y="65" width="40" height="15" />
        <rect x="300" y="55" width="20" height="10" />
        <path d="M 0 115 L 600 115" stroke="rgba(122, 138, 158, 0.3)" strokeWidth="1" />
      </g>
      <path d="M 0 118 Q 150 115 300 118 T 600 118" fill="none" stroke="rgba(61, 90, 128, 0.3)" strokeWidth="1.5" />
      <g fill="none">
        <path d="M 40 100 Q 150 20 280 90 T 520 30" stroke="var(--accent-amber)" strokeWidth="1" strokeOpacity="0.45" />
        <path d="M 100 110 Q 220 40 380 15 T 580 80" stroke="var(--accent-indigo)" strokeDasharray="3,3" strokeWidth="1" strokeOpacity="0.6" />
        <path d="M 182 53 Q 260 10 320 80" stroke="var(--accent-amber)" strokeWidth="0.75" strokeOpacity="0.3" />
        <path d="M 237 40 Q 350 100 460 30" stroke="var(--accent-red)" strokeWidth="0.8" strokeOpacity="0.3" />
      </g>
      <g filter="url(#goldGlow)">
        <circle cx="182" cy="53" r="3" fill="var(--accent-amber)" />
        <circle cx="237" cy="40" r="2.5" fill="var(--accent-red)" />
        <circle cx="320" cy="80" r="3" fill="var(--accent-indigo)" />
        <circle cx="460" cy="30" r="3.5" fill="var(--accent-amber)" />
        <circle cx="125" cy="68" r="2" fill="var(--text-secondary)" />
        <circle cx="520" cy="30" r="2.5" fill="var(--accent-amber)" />
      </g>
      <g fill="var(--accent-amber)" opacity="0.4">
        <path d="M 420 20 L 422 25 L 427 27 L 422 29 L 420 34 L 418 29 L 413 27 L 418 25 Z" />
        <path d="M 150 30 L 151 33 L 154 34 L 151 35 L 150 38 L 149 35 L 146 34 L 149 33 Z" />
        <path d="M 540 50 L 541 53 L 544 54 L 541 55 L 540 58 L 539 55 L 536 54 L 539 53 Z" />
      </g>
    </svg>
  )
}

/** 地图页罗盘 —— 密件罗盘 */
export function SecretCompass(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="100%" height="100%" {...props}>
      <polygon points="40,2 78,40 40,78 2,40" fill="none" stroke="var(--accent-amber)" strokeWidth="0.75" strokeOpacity="0.8" />
      <polygon points="40,5 75,40 40,75 5,40" fill="none" stroke="var(--accent-amber)" strokeWidth="0.5" strokeOpacity="0.4" />
      <circle cx="40" cy="40" r="32" fill="none" stroke="var(--accent-amber)" strokeWidth="0.8" />
      <circle cx="40" cy="40" r="29" fill="none" stroke="var(--accent-amber)" strokeWidth="0.5" strokeDasharray="2,2" strokeOpacity="0.6" />
      <circle cx="40" cy="40" r="20" fill="none" stroke="var(--accent-amber)" strokeWidth="0.5" strokeOpacity="0.5" />
      <g stroke="var(--accent-amber)" strokeWidth="0.5" strokeOpacity="0.7">
        <line x1="40" y1="8" x2="40" y2="12" />
        <line x1="40" y1="68" x2="40" y2="72" />
        <line x1="8" y1="40" x2="12" y2="40" />
        <line x1="68" y1="40" x2="72" y2="40" />
        <line x1="17.37" y1="17.37" x2="20.2" y2="20.2" />
        <line x1="59.8" y1="59.8" x2="62.63" y2="62.63" />
        <line x1="62.63" y1="17.37" x2="59.8" y2="20.2" />
        <line x1="20.2" y1="59.8" x2="17.37" y2="62.63" />
      </g>
      <polygon points="40,16 43,36 40,40" fill="var(--accent-red)" stroke="var(--accent-red)" strokeWidth="0.5" strokeLinejoin="round" />
      <polygon points="40,64 37,44 40,40" fill="none" stroke="var(--accent-amber)" strokeWidth="0.5" strokeLinejoin="round" />
      <circle cx="40" cy="40" r="2" fill="var(--bg-primary)" stroke="var(--accent-amber)" strokeWidth="1" />
      <g fill="var(--accent-amber)" fontFamily="STKaiti, KaiTi, Noto Serif SC, serif" fontSize="6" fontWeight="bold" textAnchor="middle" dominantBaseline="central">
        <text x="40" y="15">北</text>
        <text x="40" y="65">南</text>
        <text x="15" y="40">西</text>
        <text x="65" y="40">東</text>
      </g>
    </svg>
  )
}

/** 时间轴书脊 —— 史册脊线 */
export function BookSpine(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 30" width="100%" height="100%" {...props}>
      <line x1="20" y1="13" x2="380" y2="13" stroke="var(--accent-amber)" strokeWidth="1" strokeOpacity="0.8" />
      <line x1="15" y1="16" x2="385" y2="16" stroke="var(--accent-amber)" strokeWidth="0.5" strokeOpacity="0.4" />
      <g stroke="var(--accent-amber)" strokeWidth="0.75" fill="none" strokeOpacity="0.6">
        <path d="M 20 13 C 12 13, 8 8, 5 15" />
        <path d="M 15 16 C 10 16, 6 12, 3 18" />
        <path d="M 380 13 C 388 13, 392 8, 395 15" />
        <path d="M 385 16 C 390 16, 394 12, 397 18" />
      </g>
      <g fill="var(--bg-primary)" stroke="var(--accent-amber)" strokeWidth="0.8">
        <circle cx="60" cy="14.5" r="2.5" />
        <line x1="60" y1="8" x2="60" y2="21" strokeWidth="0.75" />
        <circle cx="130" cy="14.5" r="2.5" />
        <line x1="130" y1="8" x2="130" y2="21" strokeWidth="0.75" />
        <circle cx="200" cy="14.5" r="3" fill="var(--accent-red)" stroke="var(--accent-red)" />
        <line x1="200" y1="6" x2="200" y2="23" stroke="var(--accent-red)" strokeWidth="1" />
        <circle cx="270" cy="14.5" r="2.5" />
        <line x1="270" y1="8" x2="270" y2="21" strokeWidth="0.75" />
        <circle cx="340" cy="14.5" r="2.5" />
        <line x1="340" y1="8" x2="340" y2="21" strokeWidth="0.75" />
      </g>
      <g fill="var(--accent-red)" fillOpacity="0.35">
        <circle cx="60" cy="14.5" r="1" />
        <circle cx="130" cy="14.5" r="1" />
        <circle cx="270" cy="14.5" r="1" />
        <circle cx="340" cy="14.5" r="1" />
      </g>
    </svg>
  )
}

/** 人物火漆印章 —— 绝密档案火漆 */
export function ArchiveSeal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" {...props}>
      <path d="M -10 40 Q 50 48 110 40" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeOpacity="0.6" />
      <path d="M -10 43 Q 50 51 110 43" fill="none" stroke="var(--text-secondary)" strokeWidth="0.8" strokeDasharray="2,2" strokeOpacity="0.4" />
      <path d="M 50 12 C 65 10, 78 16, 85 28 C 92 40, 87 56, 88 68 C 89 80, 75 92, 60 90 C 45 88, 36 94, 25 88 C 14 82, 10 65, 12 50 C 14 35, 18 20, 30 15 C 42 10, 45 14, 50 12 Z"
        fill="var(--accent-red)" fillOpacity="0.9"
        filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.5))" />
      <path d="M 50 18 Q 78 18 78 50 T 50 82 T 22 50 T 50 18" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" />
      <path d="M 50 20 Q 75 20 75 50 T 50 80 T 25 50 T 50 20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <g fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 50 29 L 50 32" />
        <path d="M 37 36 L 50 33 L 63 36 L 63 41" />
        <path d="M 39 52 C 45 52, 50 44, 50 44 C 50 44, 55 52, 61 52" />
        <path d="M 50 44 L 50 56" />
        <path d="M 43 47 C 43 47, 46 49, 47 50" />
        <path d="M 57 47 C 57 47, 54 49, 53 50" />
        <path d="M 38 67 L 38 71 L 62 71 L 62 67" />
        <path d="M 50 63 L 50 71" />
      </g>
      <g fill="rgba(0,0,0,0.15)">
        <circle cx="34" cy="30" r="1.2" />
        <circle cx="68" cy="62" r="0.8" />
        <circle cx="42" cy="74" r="1.5" />
        <circle cx="65" cy="24" r="1" />
      </g>
    </svg>
  )
}

/** 异常警示章 —— 档案断裂印 */
export function FractureSeal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="100%" height="100%" {...props}>
      <polygon points="30,5 57,51 3,51" fill="none" stroke="var(--accent-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="30,9 52,47 8,47" fill="none" stroke="var(--accent-red)" strokeWidth="0.8" strokeDasharray="2,1" />
      <g fill="var(--accent-red)" fontFamily="Source Han Serif SC, Noto Serif SC, SimSun, serif" fontWeight="900" fontSize="9" textAnchor="middle" dominantBaseline="central">
        <text x="24" y="32">断</text>
        <text x="36" y="32">裂</text>
      </g>
      <g stroke="var(--bg-primary)" strokeWidth="1.8" strokeLinecap="round">
        <line x1="12" y1="22" x2="48" y2="42" />
        <line x1="45" y1="20" x2="15" y2="44" />
      </g>
      <g stroke="var(--accent-red)" strokeWidth="0.75" strokeLinecap="round">
        <line x1="12" y1="22" x2="48" y2="42" strokeOpacity="0.8" />
        <line x1="45" y1="20" x2="15" y2="44" strokeOpacity="0.8" />
      </g>
      <g fill="var(--bg-primary)">
        <circle cx="30" cy="18" r="1.5" />
        <circle cx="15" cy="42" r="1" />
        <circle cx="48" cy="45" r="1.3" />
        <circle cx="36" cy="28" r="1.1" />
        <circle cx="21" cy="35" r="0.9" />
      </g>
    </svg>
  )
}

/** 空状态 —— 尘封卷宗 */
export function DustyArchive(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" width="100%" height="100%" {...props}>
      <g fill="var(--text-secondary)" opacity="0.15">
        <circle cx="30" cy="30" r="1.5" />
        <circle cx="170" cy="40" r="1" />
        <circle cx="150" cy="120" r="2" />
        <circle cx="45" cy="130" r="1" />
        <circle cx="110" cy="20" r="1.5" />
      </g>
      <g filter="drop-shadow(0 8px 12px rgba(0,0,0,0.6))">
        <path d="M 40 30 L 150 20 L 165 130 L 45 140 Z" fill="#1e1e26" stroke="var(--accent-amber)" strokeWidth="0.8" strokeOpacity="0.5" />
        <path d="M 40 30 L 150 20 L 135 60 L 50 65 Z" fill="#252530" stroke="var(--accent-amber)" strokeWidth="0.5" strokeOpacity="0.3" />
      </g>
      <g transform="translate(70, 42) rotate(-15)">
        <rect x="-15" y="-7" width="30" height="14" rx="2" fill="none" stroke="var(--accent-red)" strokeWidth="1.2" strokeOpacity="0.7" strokeDasharray="20,1" />
        <text x="0" y="1" fill="var(--accent-red)" fillOpacity="0.75" fontFamily="STKaiti, KaiTi, serif" fontSize="8" fontWeight="900" textAnchor="middle" dominantBaseline="central">绝密</text>
      </g>
      <g stroke="var(--accent-red)" strokeWidth="1.2" fill="none">
        <path d="M 98 25 C 90 40, 115 50, 95 65 C 80 75, 120 85, 98 105" strokeOpacity="0.8" />
        <circle cx="98" cy="25" r="6" fill="#12121a" stroke="var(--accent-amber)" strokeWidth="1" />
        <circle cx="98" cy="25" r="2" fill="var(--bg-primary)" stroke="var(--accent-amber)" strokeWidth="0.8" />
        <circle cx="98" cy="105" r="6" fill="#12121a" stroke="var(--accent-amber)" strokeWidth="1" />
        <circle cx="98" cy="105" r="2" fill="var(--bg-primary)" stroke="var(--accent-amber)" strokeWidth="0.8" />
      </g>
      <g fill="var(--text-secondary)" fontFamily="STKaiti, KaiTi, Noto Serif SC, serif">
        <text x="105" y="148" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="2" fill="var(--accent-amber)">在册无匹配线索</text>
        <g fontSize="7" fillOpacity="0.5" transform="translate(142, 60)">
          <text x="0" y="0">未</text>
          <text x="0" y="9">予</text>
          <text x="0" y="18">解</text>
          <text x="0" y="27">密</text>
        </g>
      </g>
      <path d="M 45 100 L 60 102 M 150 110 L 160 109" stroke="var(--accent-amber)" strokeWidth="0.5" strokeOpacity="0.3" />
    </svg>
  )
}

/** 加载动画 —— 启封中 */
export function UnsealingLoader(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60" {...props}>
      <circle cx="30" cy="30" r="25" fill="var(--accent-amber)" fillOpacity="0.02" className="loading-pulse-glow" />
      <g className="loading-spin-circle">
        <circle cx="30" cy="30" r="26" fill="none" stroke="var(--accent-amber)" strokeWidth="0.75" strokeOpacity="0.7" />
        <circle cx="30" cy="30" r="23" fill="none" stroke="var(--accent-amber)" strokeWidth="0.4" strokeDasharray="2,3" strokeOpacity="0.4" />
        <line x1="30" y1="2" x2="30" y2="5" stroke="var(--accent-amber)" strokeWidth="1.2" />
        <line x1="30" y1="55" x2="30" y2="58" stroke="var(--accent-amber)" strokeWidth="1.2" />
        <line x1="2" y1="30" x2="5" y2="30" stroke="var(--accent-amber)" strokeWidth="1.2" />
        <line x1="55" y1="30" x2="58" y2="30" stroke="var(--accent-amber)" strokeWidth="1.2" />
        <circle cx="11.5" cy="11.5" r="1.2" fill="var(--accent-red)" />
        <circle cx="48.5" cy="48.5" r="1.2" fill="var(--accent-amber)" />
        <circle cx="48.5" cy="11.5" r="1.2" fill="var(--accent-amber)" />
        <circle cx="11.5" cy="48.5" r="1.2" fill="var(--accent-amber)" />
      </g>
      <circle cx="30" cy="30" r="18" fill="none" stroke="var(--accent-amber)" strokeWidth="1.2" strokeOpacity="0.9" />
      <circle cx="30" cy="30" r="16.5" fill="none" stroke="var(--accent-amber)" strokeWidth="0.5" strokeOpacity="0.4" />
      <text x="30" y="30.5"
        fill="var(--accent-amber)"
        fontFamily="STKaiti, KaiTi, Noto Serif SC, serif"
        fontSize="11"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="central"
        className="loading-pulse-glow">启</text>
    </svg>
  )
}
