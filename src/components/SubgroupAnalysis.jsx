import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { pct, groupTissue, isTumourArm } from '../utils/dataUtils'

function makeBarData(rows, keyFn, minN = 3) {
  const counts = {}
  for (const r of rows) {
    if (r.nts === null) continue
    const k = keyFn(r) || 'Unknown'
    if (!counts[k]) counts[k] = { total: 0, yes: 0 }
    counts[k].total++
    if (r.nts) counts[k].yes++
  }
  return Object.entries(counts)
    .filter(([, v]) => v.total >= minN)
    .map(([name, v]) => ({
      name,
      pct: parseFloat(pct(v.yes, v.total)),
      n: v.total,
    }))
    .sort((a, b) => b.pct - a.pct)
}

function SubgroupBar({ data, title, colorFn }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 38)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 60, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
          <Tooltip formatter={(v, _, { payload }) => [`${v}% (n=${payload.n})`, 'FLASH NTS rate']} />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v) => `${v}%`}
              style={{ fontSize: 10, fill: '#64748b' }}
            />
            {data.map((d, i) => (
              <Cell key={i} fill={colorFn ? colorFn(d, i) : '#14b8a6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const BLUE_SHADES = ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
const TEAL_SHADES = ['#134e4a', '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4']

export default function SubgroupAnalysis({ rows }) {
  const byParticle = useMemo(() => makeBarData(rows, (r) => r.particle), [rows])
  const byTissueGroup = useMemo(() => makeBarData(rows, (r) => groupTissue(r.tissue_class)), [rows])
  const bySpecies = useMemo(() => makeBarData(rows, (r) => r.species), [rows])
  const byFracN = useMemo(() => {
    const evaluable = rows.filter((r) => !isTumourArm(r) && r.nts !== null)
    const counts = {}
    for (const r of evaluable) {
      const n = r.num_fractions
      if (!n) continue
      const key = `${n} fx`
      if (!counts[key]) counts[key] = { yes: 0, total: 0, nFx: n }
      counts[key].total++
      if (r.nts) counts[key].yes++
    }
    return Object.entries(counts)
      .map(([name, v]) => ({ name, n: v.total, nFx: v.nFx, pct: parseFloat(pct(v.yes, v.total)) }))
      .sort((a, b) => a.nFx - b.nFx)
  }, [rows])

  const byFracRegime = useMemo(() => {
    const evaluable = rows.filter((r) => !isTumourArm(r) && r.nts !== null)
    const counts = {}
    for (const r of evaluable) {
      const raw = (r.fractionation_regime || '').toLowerCase()
      let label
      if (raw.includes('intra')) label = 'Intra-session split'
      else if (raw.includes('multi')) label = 'Multi-day fractionated'
      else if (raw.includes('single') || raw.includes('one')) label = 'Single fraction'
      else continue
      if (!counts[label]) counts[label] = { yes: 0, total: 0 }
      counts[label].total++
      if (r.nts) counts[label].yes++
    }
    const order = ['Single fraction', 'Intra-session split', 'Multi-day fractionated']
    return order
      .filter((k) => counts[k])
      .map((name) => ({ name, n: counts[name].total, pct: parseFloat(pct(counts[name].yes, counts[name].total)) }))
  }, [rows])
  const byOxygen = useMemo(
    () =>
      makeBarData(rows, (r) => {
        const o = (r.oxygen_condition || '').toLowerCase()
        if (o.includes('hyper')) return 'Hyperoxic'
        if (o.includes('hypox') || o.includes('anox')) return 'Hypoxic/Anoxic'
        if (o.includes('norm') || o.includes('room air') || o.includes('ambient') || o.includes('air'))
          return 'Normoxic'
        return 'Not reported'
      }),
    [rows],
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Subgroup Analysis</h2>
        <p className="text-sm text-slate-500">
          FLASH normal-tissue sparing rate broken down by experimental variable.
          Only evaluable arms (direct FLASH vs conventional comparison) are included.
          Groups with n &lt; 3 are hidden.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubgroupBar
          title="By Particle Type"
          data={byParticle}
          colorFn={(_, i) => TEAL_SHADES[i % TEAL_SHADES.length]}
        />
        <SubgroupBar
          title="By Tissue Group"
          data={byTissueGroup}
          colorFn={(_, i) => BLUE_SHADES[i % BLUE_SHADES.length]}
        />
        <SubgroupBar
          title="By Species"
          data={bySpecies}
          colorFn={(d, i) => {
            const colors = { mouse: '#14b8a6', dog: '#6366f1', cat: '#f59e0b', 'mini-pig': '#f43f5e' }
            return colors[d.name] || '#94a3b8'
          }}
        />
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">By Fractionation Regime</h3>
          <p className="text-xs text-slate-400 mb-3">Single · Intra-session split · Multi-day fractionated</p>
          <ResponsiveContainer width="100%" height={Math.max(120, byFracRegime.length * 44)}>
            <BarChart data={byFracRegime} layout="vertical" margin={{ left: 10, right: 60, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={145} />
              <Tooltip formatter={(v, _, { payload }) => [`${v}% (n=${payload.n})`, 'NTS rate']} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="pct" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: '#64748b' }} />
                {byFracRegime.map((d, i) => (
                  <Cell key={d.name} fill={['#14b8a6', '#6366f1', '#f59e0b'][i] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SubgroupBar
        title="By Oxygen Condition"
        data={byOxygen}
        colorFn={(d) => {
          const map = { Hyperoxic: '#f43f5e', Hypoxic_Anoxic: '#f59e0b', Normoxic: '#14b8a6', 'Not reported': '#94a3b8' }
          return map[d.name] || '#94a3b8'
        }}
      />

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">NTS Rate by Exact Fraction Count</h3>
        <p className="text-xs text-slate-400 mb-3">
          Faded bars = n &lt; 5 (interpret with caution). Hover for exact n.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byFracN} margin={{ left: 0, right: 20, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, _, { payload }) => [`${v}% (n=${payload.n})`, 'NTS rate']} />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="pct" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: '#64748b' }} />
              {byFracN.map((d, i) => {
                const cols = ['#14b8a6','#2dd4bf','#6366f1','#818cf8','#a78bfa','#f59e0b','#fb923c','#f43f5e']
                return <Cell key={d.name} fill={cols[i % cols.length]} opacity={d.n < 5 ? 0.45 : 1} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {byFracN.map((d, i) => {
            const cols = ['#14b8a6','#2dd4bf','#6366f1','#818cf8','#a78bfa','#f59e0b','#fb923c','#f43f5e']
            return (
              <span key={d.name} className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: cols[i % cols.length], opacity: d.n < 5 ? 0.45 : 1 }} />
                {d.name}: n={d.n}{d.n < 5 ? ' ⚠' : ''}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
