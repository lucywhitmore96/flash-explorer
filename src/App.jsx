import React, { useState } from 'react'
import { LayoutDashboard, Table, ScatterChart, BarChart2, Search, BrainCircuit, Zap, Loader2, AlertCircle } from 'lucide-react'
import { useFlashData } from './hooks/useFlashData'
import Dashboard from './components/Dashboard'
import DataExplorer from './components/DataExplorer'
import PhysicsPlots from './components/PhysicsPlots'
import SubgroupAnalysis from './components/SubgroupAnalysis'
import QueryTool from './components/QueryTool'
import MLResults from './components/MLResults'

const TABS = [
  { id: 'dashboard', label: 'Overview', Icon: LayoutDashboard },
  { id: 'explorer', label: 'Data Explorer', Icon: Table },
  { id: 'physics', label: 'Physics Plots', Icon: ScatterChart },
  { id: 'subgroups', label: 'Subgroups', Icon: BarChart2 },
  { id: 'query', label: 'Query Builder', Icon: Search },
  { id: 'ml', label: 'ML Results', Icon: BrainCircuit },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const { rows, loading, error } = useFlashData()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 py-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-flash-600 text-white flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">FLASH RT Explorer</h1>
              <p className="text-xs text-slate-500">In-Vivo Literature Database · Living Review</p>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              {!loading && !error && (
                <p className="text-xs text-slate-400">
                  {rows.length} arms · {new Set(rows.map((r) => r.citation_title).filter(Boolean)).size} papers
                </p>
              )}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-flash-600 hover:text-flash-700 font-medium"
              >
                View on GitHub →
              </a>
            </div>
          </div>

          {/* Tabs */}
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === id ? 'tab-active' : 'tab-inactive'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-flash-500" />
            <p className="text-sm">Loading database…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Failed to load database</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {tab === 'dashboard' && <Dashboard rows={rows} />}
            {tab === 'explorer' && <DataExplorer rows={rows} />}
            {tab === 'physics' && <PhysicsPlots rows={rows} />}
            {tab === 'subgroups' && <SubgroupAnalysis rows={rows} />}
            {tab === 'query' && <QueryTool rows={rows} />}
            {tab === 'ml' && <MLResults />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <p>
              Database compiled as part of a systematic ML analysis of in-vivo FLASH radiotherapy.
            </p>
            <p className="mt-0.5">
              If you use this resource, please cite the associated manuscript.
            </p>
          </div>
          <p>Built with React · Recharts · Tailwind CSS</p>
        </div>
      </footer>
    </div>
  )
}
