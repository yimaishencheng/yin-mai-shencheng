import React from 'react'
import { UnsealingLoader } from './Illustrations'

export function UnsealOverlay() {
  return (
    <div className="unseal-overlay" aria-hidden="true">
      <div className="unseal-paper">
        <div className="unseal-lines" />
        <UnsealingLoader />
        <p>正在启封 1930 年代上海秘密档案</p>
        <span>IMPERIAL ARCHIVE · 隐脉申城</span>
      </div>
    </div>
  )
}

export function OldMapAtmosphere({ className = '' }: { className?: string }) {
  return (
    <div className={`old-map-atmosphere ${className}`} aria-hidden="true">
      <div className="old-map-river" />
      <div className="old-map-route old-map-route-a" />
      <div className="old-map-route old-map-route-b" />
      <div className="old-map-route old-map-route-c" />
      <span className="old-map-compass">N</span>
    </div>
  )
}

export function FilmPlate({ title, year }: { title: string; year: number }) {
  return (
    <div className="film-plate">
      <div className="film-plate-photo" />
      <div className="film-plate-grain" />
      <div className="film-plate-meta">
        <span>{year || '?'}</span>
        <span>{title}</span>
      </div>
    </div>
  )
}
