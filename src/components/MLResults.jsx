import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, ErrorBar,
} from 'recharts'

const FEATURE_GROUPS = [
  { name: 'Dosimetric', ba: 0.689, se: 0.031, color: '#14b8a6',
    features: 'Total dose, avg dose rate (raw + log), peak dose rate, dose per fraction' },
  { name: 'Temporal', ba: 0.678, se: 0.036, color: '#6366f1',
    features: 'Dose per pulse (raw + log), PRF, pulse width, irradiation time, pulse count, proton spot rate, spot count, fractions, inter-fraction interval' },
  { name: 'Model / tissue', ba: 0.543, se: 0.023, color: '#94a3b8',
    features: 'Species, tissue class, site group, model type (one-hot encoded)' },
  { name: 'Exp. conditions', ba: 0.629, se: 0.032, color: '#f59e0b',
    features: 'Anaesthesia class, oxygen condition (one-hot encoded)' },
  { name: 'Combined', ba: 0.668, se: 0.034, color: '#1e40af',
    features: 'All features above combined' },
]

const THRESHOLDS = [
  { label: 'Avg Dose Rate threshold', value: '≥ 40.8 Gy/s', detail: '27.3% non-sparing above threshold', color: '#14b8a6' },
  { label: 'Dose per Pulse threshold (electron only)', value: '≥ 1.0 Gy', detail: 'Balanced accuracy = 0.624', color: '#6366f1' },
]

const FRAC_DATA = [
  { name: 'Single fraction', pct: 71.3, n: 293, color: '#14b8a6' },
  { name: 'Fractionated', pct: 46.7, n: 30, color: '#6366f1' },
]

const FRAC_ELECTRON = [
  { name: 'Single fraction', pct: 71.9, n: 192, color: '#14b8a6' },
  { name: 'Fractionated', pct: 40.0, n: 25, color: '#6366f1' },
]

function FeatureGroupBar() {
  const data = FEATURE_GROUPS.map((g) => ({
    name: g.name,
    ba: g.ba,
    seCI: g.se * 1.96,
    se: g.se,
    color: g.color,
    features: g.features,
  }))

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Feature Group Balanced Accuracy (5-fold CV, n=349)</h3>
      <p className="text-xs text-slate-400 mb-4">
        A random forest was trained on each feature group separately. Balanced accuracy (BA) is reported with 95% CI error bars.
        Chance = 0.50 (dashed line).
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 60, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0.45, 0.75]} tickFormatter={(v) => v.toFixed(2)} tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={115} />
          <ReferenceLine x={0.5} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Chance', fontSize: 9, fill: '#94a3b8', position: 'top' }} />
          <Tooltip
            formatter={(v, _, { payload }) => [
              `BA = ${v.toFixed(3)} ± ${(payload.se * 1.96).toFixed(3)}`,
              payload.name,
            ]}
            labelFormatter={() => ''}
          />
          <Bar dataKey="ba" radius={[0, 4, 4, 0]}>
            <ErrorBar dataKey="seCI" width={4} strokeWidth={2} stroke="#1e293b" direction="x" />
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5">
        {FEATURE_GROUPS.map((g) => (
          <div key={g.name} className="flex gap-2 text-xs items-start">
            <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: g.color }} />
            <span className="font-medium text-slate-700 w-32 flex-shrink-0">{g.name}</span>
            <span className="text-slate-500">{g.features}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MLResults() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">ML Analysis Results</h2>
        <p className="text-sm text-slate-500">
          Results from the random forest / machine learning analysis of predictors of FLASH normal-tissue sparing.
          All results are from the non-tumour evaluable arms (n = 349).
        </p>
      </div>

      <div className="card bg-indigo-50 border-indigo-200">
        <p className="text-xs font-semibold text-indigo-800 mb-1">Key finding</p>
        <p className="text-sm text-indigo-700">
          Physics features — both dosimetric (BA 0.685) and temporal/pulse-structure (BA 0.683) — are the dominant
          predictors of FLASH normal-tissue sparing. Biological features (model/tissue, experimental conditions)
          perform near chance (BA ≈ 0.53), suggesting the FLASH effect is primarily physics-driven.
        </p>
      </div>

      <FeatureGroupBar />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thresholds */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Derived Thresholds</h3>
          <div className="space-y-3">
            {THRESHOLDS.map((t) => (
              <div key={t.label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: t.color }} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{t.label}</p>
                  <p className="text-lg font-bold" style={{ color: t.color }}>{t.value}</p>
                  <p className="text-xs text-slate-500">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DMF */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Dose Modifying Factor (DMF)</h3>
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500">Arms with calculable DMF (non-tumour)</p>
              <p className="text-2xl font-bold text-flash-700">n = 97</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500">Mean DMF</p>
              <p className="text-2xl font-bold text-flash-700">1.24 <span className="text-sm font-normal text-slate-400">± 0.21</span></p>
              <p className="text-xs text-slate-400">FLASH dose required to produce same effect as conventional dose</p>
            </div>
          </div>
        </div>

        {/* Fractionation — all particles */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">NTS by Fractionation — All Particles</h3>
          <p className="text-xs text-slate-400 mb-4">χ² = 4.76, p = 0.029</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={FRAC_DATA} margin={{ left: 0, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, _, { payload }) => [`${v}% (n=${payload.n})`, 'NTS rate']} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {FRAC_DATA.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fractionation — electron only */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">NTS by Fractionation — Electron Only</h3>
          <p className="text-xs text-slate-400 mb-4">χ² = 6.31, p = 0.012</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={FRAC_ELECTRON} margin={{ left: 0, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, _, { payload }) => [`${v}% (n=${payload.n})`, 'NTS rate']} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {FRAC_ELECTRON.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card bg-slate-50 border-slate-200">
        <p className="text-xs font-semibold text-slate-600 mb-1">Methods note</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Random forest classifier (scikit-learn). 5-fold cross-validation stratified by NTS outcome.
          Balanced accuracy accounts for class imbalance (YES : NO ≈ 70 : 30).
          Feature importance derived by permutation. Thresholds derived by balanced-accuracy-maximising sweep.
          DPP threshold is electron-only (pulsed linac arms); proton PBS spot dose and quasi-continuous X-ray arms excluded.
          Full methods in the associated manuscript.
        </p>
      </div>
    </div>
  )
}
