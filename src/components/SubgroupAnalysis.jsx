import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { pct, groupTissue } from '../utils/dataUtils'

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
  const byFrac = useMemo(
    () => makeBarData(rows, (r) => (r.fractionated ? 'Fractionated' : 'Single fraction')),
    [rows],
  )
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
        <SubgroupBar
          title="By Fractionation"
          data={byFrac}
          colorFn={(d) => (d.name === 'Fractionated' ? '#6366f1' : '#14b8a6')}
        />
      </div>

      <SubgroupBar
        title="By Oxygen Condition"
        data={byOxygen}
        colorFn={(d) => {
          const map = { Hyperoxic: '#f43f5e', Hypoxic_Anoxic: '#f59e0b', Normoxic: '#14b8a6', 'Not reported': '#94a3b8' }
          return map[d.name] || '#94a3b8'
        }}
      />
    </div>
  )
}
