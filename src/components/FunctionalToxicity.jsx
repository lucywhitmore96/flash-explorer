import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  ScatterChart, Scatter,
} from 'recharts'
import { isTumourArm, pct } from '../utils/dataUtils'

function parseNum(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s.toLowerCase() === 'not_applicable' || s.toLowerCase() === 'not_comparable' || s.toLowerCase() === 'nan') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

const BENEFIT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e']
const DELTA_COLORS = { Better: '#10b981', Same: '#94a3b8', Worse: '#f43f5e' }

export default function FunctionalToxicity({ rows }) {
  const ntRows = useMemo(() => rows.filter((r) => !isTumourArm(r)), [rows])

  const benefitDist = useMemo(() => {
    const counts = { '0 (none)': 0, '1 (mild)': 0, '2 (moderate)': 0, '3 (marked)': 0 }
    for (const r of ntRows) {
      const v = parseNum(r.flash_benefit_magnitude)
      if (v === null) continue
      if (v === 0) counts['0 (none)']++
      else if (v <= 1) counts['1 (mild)']++
      else if (v <= 2) counts['2 (moderate)']++
      else counts['3 (marked)']++
    }
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: BENEFIT_COLORS[i] }))
  }, [ntRows])

  const deltaDist = useMemo(() => {
    const counts = { Better: 0, Same: 0, Worse: 0 }
    for (const r of ntRows) {
      const v = parseNum(r.functional_delta_score)
      if (v === null) continue
      if (v > 0) counts.Better++
      else if (v < 0) counts.Worse++
      else counts.Same++
    }
    const total = counts.Better + counts.Same + counts.Worse
    return Object.entries(counts).map(([name, value]) => ({
      name, value, pct: total ? parseFloat(((value / total) * 100).toFixed(1)) : 0,
    }))
  }, [ntRows])

  const severityCompare = useMemo(() => {
    const pts = []
    for (const r of ntRows) {
      const f = parseNum(r.functional_toxicity_severity_flash)
      const c = parseNum(r.functional_toxicity_severity_conv)
      if (f === null || c === null) continue
      pts.push({ flash: f, conv: c, ec: r.endpoint_class || 'other', name: r.citation_title })
    }
    return pts
  }, [ntRows])

  const byEndpoint = useMemo(() => {
    const counts = {}
    for (const r of ntRows) {
      const v = parseNum(r.flash_benefit_magnitude)
      if (v === null) continue
      const ec = r.endpoint_class || 'other'
      if (ec === '(blank)' || ec === 'nan') continue
      if (!counts[ec]) counts[ec] = { total: 0, sumBenefit: 0 }
      counts[ec].total++
      counts[ec].sumBenefit += v
    }
    return Object.entries(counts)
      .filter(([, v]) => v.total >= 5)
      .map(([name, v]) => ({ name, n: v.total, avgBenefit: parseFloat((v.sumBenefit / v.total).toFixed(2)) }))
      .sort((a, b) => b.avgBenefit - a.avgBenefit)
  }, [ntRows])

  const betterPct = pct(deltaDist.find(d => d.name === 'Better')?.value || 0,
    deltaDist.reduce((s, d) => s + d.value, 0))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Functional Toxicity</h2>
        <p className="text-sm text-slate-500">
          Functional outcome scores comparing FLASH vs conventional irradiation in non-tumour arms.
          Severity is rated on a 0–6 scale; benefit magnitude 0–3.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Arms scored</p>
          <p className="text-3xl font-bold text-flash-600">{deltaDist.reduce((s,d) => s+d.value,0)}</p>
          <p className="text-xs text-slate-400">with functional delta score</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">FLASH better</p>
          <p className="text-3xl font-bold text-emerald-600">{betterPct}%</p>
          <p className="text-xs text-slate-400">functional delta &gt; 0</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Arms with benefit ≥2</p>
          <p className="text-3xl font-bold text-indigo-600">
            {benefitDist.filter(d => d.name.startsWith('2') || d.name.startsWith('3')).reduce((s,d) => s+d.value,0)}
          </p>
          <p className="text-xs text-slate-400">moderate–marked benefit</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Endpoint classes</p>
          <p className="text-3xl font-bold text-slate-600">{byEndpoint.length}</p>
          <p className="text-xs text-slate-400">with n ≥ 5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delta score pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Functional Delta Score Distribution</h3>
          <p className="text-xs text-slate-400 mb-3">
            Delta = FLASH toxicity − conventional toxicity (normalised direction: positive = FLASH better)
          </p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={deltaDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, pct }) => `${pct}%`}>
                  {deltaDist.map((d) => <Cell key={d.name} fill={DELTA_COLORS[d.name]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3 text-sm">
              {deltaDist.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: DELTA_COLORS[d.name] }} />
                  <span className="text-slate-600">{d.name}</span>
                  <span className="text-slate-400 ml-1">{d.value} ({d.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Benefit magnitude */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">FLASH Benefit Magnitude</h3>
          <p className="text-xs text-slate-400 mb-3">0 = no benefit, 1 = mild, 2 = moderate, 3 = marked</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={benefitDist} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" name="Arms" radius={[4, 4, 0, 0]}>
                {benefitDist.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg benefit by endpoint class */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Mean Benefit Magnitude by Endpoint Class</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, byEndpoint.length * 38)}>
            <BarChart data={byEndpoint} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 3]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v, _, { payload }) => [`${v} (n=${payload.n})`, 'Mean benefit']} />
              <Bar dataKey="avgBenefit" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Severity scatter */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Toxicity Severity: FLASH vs Conventional</h3>
          <p className="text-xs text-slate-400 mb-3">Points below the diagonal = FLASH less toxic. n={severityCompare.length}</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="conv" name="Conv severity" domain={[0, 6]}
                label={{ value: 'Conventional severity', position: 'insideBottom', offset: -10, fontSize: 10 }} tick={{ fontSize: 9 }} />
              <YAxis type="number" dataKey="flash" name="FLASH severity" domain={[0, 6]}
                label={{ value: 'FLASH severity', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }} tick={{ fontSize: 9 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg p-2 text-xs shadow max-w-[200px]">
                      <p className="font-semibold truncate">{d?.name}</p>
                      <p>FLASH: {d?.flash} · Conv: {d?.conv}</p>
                    </div>
                  )
                }}
              />
              <Scatter data={severityCompare} fill="#6366f1" opacity={0.6} r={4} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
