import React, { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { summarise, pct, particleColor, isTumourArm } from '../utils/dataUtils'

function StatCard({ label, value, sub, color = 'text-flash-600' }) {
  return (
    <div className="stat-card">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

const PARTICLE_COLORS = {
  electron: '#14b8a6',
  proton: '#6366f1',
  'heavy ion': '#f59e0b',
  photon: '#94a3b8',
  other: '#a78bfa',
}

export default function Dashboard({ rows }) {
  const stats = useMemo(() => summarise(rows), [rows])

  const particlePieData = Object.entries(stats.byParticle)
    .map(([p, v]) => ({ name: p, value: v.total }))
    .sort((a, b) => b.value - a.value)

  const particleBarData = Object.entries(stats.byParticle)
    .filter(([, v]) => v.total >= 5)
    .map(([p, v]) => ({
      particle: p,
      total: v.total,
      pct: parseFloat(pct(v.yes, v.total)),
    }))
    .sort((a, b) => b.pct - a.pct)

  const yearData = Object.entries(stats.byYear)
    .map(([y, v]) => ({ year: parseInt(y), arms: v.total, papers: v.papers.size }))
    .sort((a, b) => a.year - b.year)

  const fracByN = useMemo(() => {
    const evaluable = rows.filter((r) => !isTumourArm(r) && r.nts !== null)
    const counts = {}
    for (const r of evaluable) {
      const nFx = r.num_fractions
      if (!nFx) continue
      const regime = (r.fractionation_regime || '').toLowerCase()
      const isIntra = regime.includes('intra')
      const isMulti = regime.includes('multi')
      // intra-session with nFx=1 → treat as single fraction (temporal split of one dose)
      let category, key, sortOrder, color
      if (!isIntra && !isMulti) {
        category = 'single'; key = '1 fx'; sortOrder = 0; color = '#14b8a6'
      } else if (isIntra && nFx <= 1) {
        category = 'single'; key = '1 fx'; sortOrder = 0; color = '#14b8a6'
      } else if (isIntra) {
        category = 'split'; key = '2–6 splits (intra-session)'; sortOrder = 1; color = '#6366f1'
      } else {
        const multiColors = { 2: '#fbbf24', 3: '#f59e0b', 4: '#fb923c', 5: '#f97316', 8: '#ef4444', 10: '#dc2626' }
        category = 'multi'; key = `${nFx} fx`; sortOrder = 100 + nFx
        color = multiColors[nFx] || '#f59e0b'
      }
      if (!counts[key]) counts[key] = { yes: 0, total: 0, category, sortOrder, color }
      counts[key].total++
      if (r.nts) counts[key].yes++
    }
    return Object.entries(counts)
      .map(([name, v]) => ({ name, n: v.total, pct: parseFloat(pct(v.yes, v.total)), category: v.category, sortOrder: v.sortOrder, color: v.color }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [rows])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Database Overview</h2>
        <p className="text-sm text-slate-500">
          Living literature review of in-vivo FLASH radiotherapy. Each row is one experimental arm.
          Normal-tissue sparing (NTS) evaluability requires a direct FLASH vs conventional comparison.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Arms" value={rows.length} sub="experimental arms" />
        <StatCard label="Publications" value={stats.papers.size} sub="unique papers" />
        <StatCard label="Evaluable NTS Arms" value={stats.evaluable.length} sub="with FLASH vs CONV" />
        <StatCard
          label="FLASH NTS Rate"
          value={`${pct(stats.ntsYes.length, stats.evaluable.length)}%`}
          sub={`${stats.ntsYes.length} / ${stats.evaluable.length} arms`}
          color="text-emerald-600"
        />
        <StatCard
          label="Particle Types"
          value={Object.keys(stats.byParticle).length}
          sub="electron · proton · heavy ion · photon"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Particle distribution */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Arms by Particle Type</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={particlePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                  {particlePieData.map((entry) => (
                    <Cell key={entry.name} fill={PARTICLE_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 text-xs">
              {particlePieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PARTICLE_COLORS[d.name] || '#94a3b8' }} />
                  <span className="capitalize">{d.name}</span>
                  <span className="text-slate-400 ml-auto pl-3">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* NTS rate by particle */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">FLASH NTS Rate by Particle (evaluable arms ≥5)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={particleBarData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis dataKey="particle" type="category" tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => [`${v}%`, 'NTS rate']} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {particleBarData.map((d) => (
                  <Cell key={d.particle} fill={PARTICLE_COLORS[d.particle] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Publications over time */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Publications Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yearData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="papers" name="Papers" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="arms" name="Arms" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fractionation by count */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">NTS Rate by Fractionation</h3>
          <div className="flex gap-4 mb-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-teal-400" /> Single fraction</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-indigo-500" /> Intra-session splits</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-amber-400" /> Multi-day fractions</span>
            <span className="text-slate-400">· faded = n&lt;5</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fracByN} margin={{ left: 0, right: 20, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, _, { payload }) => [`${v}% (n=${payload.n})`, `NTS rate — ${payload.category}`]} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {fracByN.map((d) => (
                  <Cell key={d.name} fill={d.color} opacity={d.n < 5 ? 0.45 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {fracByN.map((d) => (
              <span key={d.name} className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color, opacity: d.n < 5 ? 0.45 : 1 }} />
                {d.name}: n={d.n}{d.n < 5 ? ' ⚠' : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-flash-50 border-flash-200">
        <p className="text-xs text-flash-800 font-medium mb-1">About this dataset</p>
        <p className="text-xs text-flash-700 leading-relaxed">
          This database was compiled as part of a systematic machine-learning analysis of in-vivo FLASH radiotherapy literature.
          Each arm represents a single experimental condition from a published paper. The <strong>Normal-Tissue Sparing (NTS)</strong> binary
          outcome (1 = sparing observed, 0 = no sparing) was assigned for arms with a direct FLASH vs conventional dose-rate comparison.
          Tumour arms and arms without a comparator are included in the full dataset but excluded from NTS summary statistics.
        </p>
      </div>
    </div>
  )
}
