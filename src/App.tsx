import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MapExplorer from './pages/MapExplorer'
import RelationGraph from './pages/RelationGraph'
import Timeline from './pages/Timeline'
import Portrait from './pages/Portrait'
import Anomalies from './pages/Anomalies'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/map" element={<Layout><MapExplorer /></Layout>} />
      <Route path="/graph" element={<Layout><RelationGraph /></Layout>} />
      <Route path="/timeline" element={<Layout><Timeline /></Layout>} />
      <Route path="/portrait/search" element={<Layout><Portrait /></Layout>} />
      <Route path="/portrait/:personId" element={<Layout><Portrait /></Layout>} />
      <Route path="/anomalies" element={<Layout><Anomalies /></Layout>} />
    </Routes>
  )
}