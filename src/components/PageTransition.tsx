import React, { ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

type RouterLocation = ReturnType<typeof useLocation>

export default function PageTransition({ render }: {
  render: (location: RouterLocation) => ReactNode
}) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState<RouterLocation>(location)
  const [state, setState] = useState<'enter' | 'exit'>('enter')

  useEffect(() => {
    if (
      location.pathname === displayLocation.pathname &&
      location.search === displayLocation.search
    ) {
      return
    }
    setState('exit')
    const timer = window.setTimeout(() => {
      setDisplayLocation(location)
      setState('enter')
    }, 220)
    return () => window.clearTimeout(timer)
  }, [location, displayLocation])

  return (
    <div
      key={`${displayLocation.pathname}${displayLocation.search}`}
      className={`page-transition page-transition-${state}`}
    >
      {render(displayLocation)}
    </div>
  )
}
