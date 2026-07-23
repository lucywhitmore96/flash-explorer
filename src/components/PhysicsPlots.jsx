import React, { useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { particleColor } from '../utils/dataUtils'

const PARTICLES = ['electron', 'proton', 'heavy ion', 'photon']

const PARAMS = [
  { key: 'flash_avg_dose_rate_Gy_s', label: 'Avg Dose Rate (Gy/s)', log: true, threshold: 40.8, thresholdLabel: '40.8 Gy/s' },
  { key: 'flash_dose_per_pulse_Gy', label: 'Dose per Pulse (Gy)', log: true, threshold: 1.0, thresholdLabel: '1.0 Gy (electron only)' },
  { key: 'total_dose_Gy', label: 'Total Dose (Gy)', log: false },
  { key: 'flash_inst_dose_rate_Gy_s', label: 'Peak Dose Rate (Gy/s)', log: true },
  { key: 'flash_prf_Hz', label: 'Pulse Rep. Freq. (Hz)', log: false },
  { key: 'flash_irradiation_time_s', label: 'Irradiation Time (s)', log: false },
  { key: 'num_fractions', label: 'Number of Fractions', log: false },
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-800 mb-1 line-clamp-2">{d.citation_title}</p>
      <p className="text-slate-500">{d.particle} · {d.species} · {d.tissue_class}</p>
      <p className="text-slate-500">{d.year}</p>
      <p className="mt-1">
        <span className="font-medium">NTS: </span>
        <span className={d.nts ? 'text-emerald-600' : 'text-rose-600'}>{d.nts ? 'YES' : 'NO'}</span>
      </p>
    </div>
  )
}

export default function PhysicsPlots({ rows }) {
  const [xParam, setXParam] = useState(PARAMS[0])
  const [yParam, setYParam] = useState(PARAMS[2])
  const [selectedParticles, setSelectedParticles] = useState(new Set(PARTICLES))
  const [onlyEvaluable, setOnlyEvaluable] = useState(true)

  const toggleParticle = (p) => {
    setSelectedParticles((prev) => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  const plotData = useMemo(() => {
    let filtered = rows.filter((r) => {
      const xVal = r[xParam.key]
      const yVal = r[yParam.key]
      return xVal && yVal && xVal > 0 && yVal > 0 && selectedParticles.has(r.particle)
    })
    if (onlyEvaluable) filtered = filtered.filter((r) => r.nts !== null)

    return {
      yes: filtered.filter((r) => r.nts === true),
      no: filtered.filter((r) => r.nts === false),
      na: filtered.filter((r) => r.nts === null),
    }
  }, [rows, xParam, yParam, selectedParticles, onlyEvaluable])

  const mapPoint = (r) => ({
    x: xParam.log ? Math.log10(r[xParam.key]) : r[xParam.key],
    y: yParam.log ? Math.log10(r[yParam.key]) : r[yParam.key],
    ...r,
  })

  const xThreshold = xParam.threshold
    ? (xParam.log ? Math.log10(xParam.threshold) : xParam.threshold)
    : null
  const yThreshold = yParam.threshold
    ? (yParam.log ? Math.log10(yParam.threshold) : yParam.threshold)
    : null

  const tickFormatter = (param) => (v) => {
    if (!param.log) return v
    const val = Math.pow(10, v)
    return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val >= 1 ? val.toFixed(0) : val.toFixed(2)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Physics Parameter Explorer</h2>
        <p className="text-sm text-slate-500">
          Scatter plot of any two physics parameters. Points coloured by FLASH NTS outcome.
          Threshold lines are derived from the paper (DR ≥ 40.8 Gy/s; DPP ≥ 1.0 Gy, electron only).
        </p>
      </div>

      {/* Controls */}
      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">X Axis</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
              value={xParam.key}
              onChange={(e) => setXParam(PARAMS.find((p) => p.key === e.target.value))}
            >
              {PARAMS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Y Axis</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
              value={yParam.key}
              onChange={(e) => setYParam(PARAMS.find((p) => p.key === e.target.value))}
            >
              {PARAMS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-600">Particles:</span>
          {PARTICLES.map((p) => (
            <button
              key={p}
              onClick={() => toggleParticle(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedParticles.has(p)
                  ? 'text-white border-transparent'
                  : 'text-slate-500 border-slate-300 bg-white'
              }`}
              style={selectedParticles.has(p) ? { background: particleColor(p), borderColor: particleColor(p) } : {}}
            >
              {p}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto cursor-pointer">
            <input type="checkbox" checked={onlyEvaluable} onChange={(e) => setOnlyEvaluable(e.target.checked)} className="accent-flash-500" />
            Evaluable only
          </label>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-600">FLASH sparing (YES) — {plotData.yes.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
            <span className="text-slate-600">No sparing (NO) — {plotData.no.length}</span>
          </div>
          {!onlyEvaluable && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
              <span className="text-slate-600">Not evaluable — {plotData.na.length}</span>
            </div>
          )}
          {xParam.log && <span className="text-xs text-slate-400 ml-auto">X axis: log₁₀ scale</span>}
          {yParam.log && <span className="text-xs text-slate-400">Y axis: log₁₀ scale</span>}
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xParam.label}
              tickFormatter={tickFormatter(xParam)}
              label={{ value: xParam.log ? `log₁₀(${xParam.label})` : xParam.label, position: 'insideBottom', offset: -15, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yParam.label}
              tickFormatter={tickFormatter(yParam)}
              label={{ value: yParam.log ? `log₁₀(${yParam.label})` : yParam.label, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />

            {xThreshold && (
              <ReferenceLine x={xThreshold} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: xParam.thresholdLabel, fontSize: 9, fill: '#b45309', position: 'top' }} />
            )}
            {yThreshold && (
              <ReferenceLine y={yThreshold} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: yParam.thresholdLabel, fontSize: 9, fill: '#b45309' }} />
            )}

            <Scatter name="FLASH sparing" data={plotData.yes.map(mapPoint)} fill="#10b981" opacity={0.75} r={4} />
            <Scatter name="No sparing" data={plotData.no.map(mapPoint)} fill="#f43f5e" opacity={0.75} r={4} />
            {!onlyEvaluable && (
              <Scatter name="Not evaluable" data={plotData.na.map(mapPoint)} fill="#94a3b8" opacity={0.5} r={3} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-400 mt-2">Hover a point to see study details.</p>
      </div>
    </div>
  )
}
