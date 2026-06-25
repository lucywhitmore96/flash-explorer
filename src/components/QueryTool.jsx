import React, { useState, useMemo } from 'react'
import { Filter, TrendingUp } from 'lucide-react'
import { pct, groupTissue, TISSUE_GROUPS } from '../utils/dataUtils'

const PRESETS = [
  { label: 'Electron, brain, mouse', filters: { particle: 'electron', tissueGroup: 'Brain/CNS', species: 'mouse' } },
  { label: 'Proton, single fraction', filters: { particle: 'proton', fractionated: 'single' } },
  { label: 'Fractionated, any particle', filters: { fractionated: 'fractionated' } },
  { label: 'High dose rate (≥100 Gy/s)', filters: { drMin: 100 } },
  { label: 'Hyperoxic oxygen conditions', filters: { oxygenGroup: 'Hyperoxic' } },
]

function oxygenGroup(row) {
  const o = (row.oxygen_condition || '').toLowerCase()
  if (o.includes('hyper')) return 'Hyperoxic'
  if (o.includes('hypox') || o.includes('anox')) return 'Hypoxic/Anoxic'
  if (o.includes('norm') || o.includes('room air') || o.includes('ambient') || o.includes('air')) return 'Normoxic'
  return 'Not reported'
}

function wilsonCI(k, n, z = 1.96) {
  if (n === 0) return { lo: null, hi: null }
  const p = k / n
  const denom = 1 + (z * z) / n
  const mid = (p + (z * z) / (2 * n)) / denom
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom
  return { lo: Math.max(0, (mid - margin) * 100), hi: Math.min(100, (mid + margin) * 100) }
}

export default function QueryTool({ rows }) {
  const [particle, setParticle] = useState('')
  const [tissueGroup, setTissueGroup] = useState('')
  const [species, setSpecies] = useState('')
  const [fractionated, setFractionated] = useState('')
  const [oxyGen, setOxyGen] = useState('')
  const [drMin, setDrMin] = useState('')
  const [drMax, setDrMax] = useState('')
  const [dppMin, setDppMin] = useState('')
  const [doseMin, setDoseMin] = useState('')
  const [doseMax, setDoseMax] = useState('')

  const particles = useMemo(() => [...new Set(rows.map((r) => r.particle).filter(Boolean))].sort(), [rows])
  const allSpecies = useMemo(() => [...new Set(rows.map((r) => r.species).filter(Boolean))].sort(), [rows])

  const applyPreset = (preset) => {
    setParticle(preset.particle || '')
    setTissueGroup(preset.tissueGroup || '')
    setSpecies(preset.species || '')
    setFractionated(preset.fractionated || '')
    setOxyGen(preset.oxygenGroup || '')
    setDrMin(preset.drMin ? String(preset.drMin) : '')
    setDrMax('')
    setDppMin(preset.dppMin ? String(preset.dppMin) : '')
    setDoseMin('')
    setDoseMax('')
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.nts === null) return false
      if (particle && r.particle !== particle) return false
      if (tissueGroup && groupTissue(r.tissue_class) !== tissueGroup) return false
      if (species && r.species !== species) return false
      if (fractionated === 'single' && r.fractionated) return false
      if (fractionated === 'fractionated' && !r.fractionated) return false
      if (oxyGen && oxygenGroup(r) !== oxyGen) return false
      if (drMin && (r.flash_avg_dose_rate_Gy_s == null || r.flash_avg_dose_rate_Gy_s < parseFloat(drMin))) return false
      if (drMax && (r.flash_avg_dose_rate_Gy_s == null || r.flash_avg_dose_rate_Gy_s > parseFloat(drMax))) return false
      if (dppMin && (r.flash_dose_per_pulse_Gy == null || r.flash_dose_per_pulse_Gy < parseFloat(dppMin))) return false
      if (doseMin && (r.total_dose_Gy == null || r.total_dose_Gy < parseFloat(doseMin))) return false
      if (doseMax && (r.total_dose_Gy == null || r.total_dose_Gy > parseFloat(doseMax))) return false
      return true
    })
  }, [rows, particle, tissueGroup, species, fractionated, oxyGen, drMin, drMax, dppMin, doseMin, doseMax])

  const yes = filtered.filter((r) => r.nts === true)
  const ntsPct = pct(yes.length, filtered.length)
  const ci = wilsonCI(yes.length, filtered.length)

  const papers = useMemo(() => {
    const map = {}
    for (const r of filtered) {
      const k = r.citation_title || 'Unknown'
      if (!map[k]) map[k] = { n: 0, yes: 0 }
      map[k].n++
      if (r.nts) map[k].yes++
    }
    return Object.entries(map).sort((a, b) => b[1].n - a[1].n)
  }, [filtered])

  const hasFilters = particle || tissueGroup || species || fractionated || oxyGen || drMin || drMax || dppMin || doseMin || doseMax

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Query Builder</h2>
        <p className="text-sm text-slate-500">
          Build a custom subgroup query by combining any filters below.
          The FLASH NTS rate for the matching arms is computed instantly, with a 95% Wilson CI.
        </p>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-slate-500 self-center">Quick presets:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.filters)}
            className="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-700 hover:bg-flash-100 hover:text-flash-700 border border-slate-200 transition-colors"
          >
            {p.label}
          </button>
        ))}
        {hasFilters && (
          <button onClick={() => applyPreset({})} className="px-3 py-1 rounded-full text-xs bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors">
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filter panel */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4 text-flash-500" /> Filters
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Particle</label>
              <select className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
                value={particle} onChange={(e) => setParticle(e.target.value)}>
                <option value="">Any</option>
                {particles.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tissue Group</label>
              <select className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
                value={tissueGroup} onChange={(e) => setTissueGroup(e.target.value)}>
                <option value="">Any</option>
                {Object.keys(TISSUE_GROUPS).map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Species</label>
              <select className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
                value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="">Any</option>
                {allSpecies.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fractionation</label>
              <select className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
                value={fractionated} onChange={(e) => setFractionated(e.target.value)}>
                <option value="">Any</option>
                <option value="single">Single fraction</option>
                <option value="fractionated">Fractionated</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Oxygen condition</label>
              <select className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
                value={oxyGen} onChange={(e) => setOxyGen(e.target.value)}>
                <option value="">Any</option>
                <option value="Normoxic">Normoxic</option>
                <option value="Hyperoxic">Hyperoxic</option>
                <option value="Hypoxic/Anoxic">Hypoxic/Anoxic</option>
                <option value="Not reported">Not reported</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Avg DR ≥ (Gy/s)</label>
              <input type="number" min="0" placeholder="e.g. 40" value={drMin} onChange={(e) => setDrMin(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Avg DR ≤ (Gy/s)</label>
              <input type="number" min="0" placeholder="e.g. 1000" value={drMax} onChange={(e) => setDrMax(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">DPP ≥ (Gy)</label>
              <input type="number" min="0" placeholder="e.g. 1.0" value={dppMin} onChange={(e) => setDppMin(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total dose (Gy)</label>
              <div className="flex gap-1">
                <input type="number" min="0" placeholder="min" value={doseMin} onChange={(e) => setDoseMin(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400" />
                <input type="number" min="0" placeholder="max" value={doseMax} onChange={(e) => setDoseMax(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-flash-50 to-slate-50 border-flash-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-flash-600" />
              <h3 className="text-sm font-semibold text-flash-800">Query Result</h3>
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500">No evaluable arms match these filters.</p>
            ) : (
              <>
                <p className="text-4xl font-bold text-flash-700">{ntsPct}%</p>
                <p className="text-sm text-flash-600 font-medium">FLASH normal-tissue sparing rate</p>
                <p className="text-xs text-slate-500 mt-1">
                  {yes.length} / {filtered.length} arms · 95% CI [{ci.lo?.toFixed(1)}–{ci.hi?.toFixed(1)}%]
                </p>

                <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-flash-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ntsPct}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Paper list */}
          {papers.length > 0 && (
            <div className="card max-h-80 overflow-y-auto">
              <h3 className="text-xs font-semibold text-slate-700 mb-2">Matching papers ({papers.length})</h3>
              <div className="space-y-1.5">
                {papers.map(([title, v]) => (
                  <div key={title} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${v.yes > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <div>
                      <p className="text-slate-700 leading-snug">{title}</p>
                      <p className="text-slate-400">{v.yes}/{v.n} arms with NTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
