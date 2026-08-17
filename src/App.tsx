import React, { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import PageTransition from './components/PageTransition'
import { UnsealOverlay } from './components/Atmosphere'
import Lobby3D from './pages/Lobby3D'
import Dashboard from './pages/Dashboard'
import MapExplorer from './pages/MapExplorer'
import RelationGraph from './pages/RelationGraph'
import Timeline from './pages/Timeline'
import Portrait from './pages/Portrait'
import Anomalies from './pages/Anomalies'
import Organizations from './pages/Organizations'

function AppRoutes({ location }: { location: ReturnType<typeof useLocation> }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<Lobby3D />} />
      <Route path="/overview" element={<Dashboard />} />
      <Route path="/map" element={<Layout><MapExplorer /></Layout>} />
      <Route path="/graph" element={<Layout><RelationGraph /></Layout>} />
      <Route path="/timeline" element={<Layout><Timeline /></Layout>} />
      <Route path="/portrait/search" element={<Layout><Portrait /></Layout>} />
      <Route path="/portrait/:personId" element={<Layout><Portrait /></Layout>} />
      <Route path="/anomalies" element={<Layout><Anomalies /></Layout>} />
      <Route path="/orgs" element={<Layout><Organizations /></Layout>} />
    </Routes>
  )
}

function AppContent() {
  const [sealed, setSealed] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setSealed(false), 2100)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      {sealed && <UnsealOverlay />}
      <PageTransition render={loc => <AppRoutes location={loc} />} />
    </>
  )
}

export default function App() {
  return <AppContent />
}
