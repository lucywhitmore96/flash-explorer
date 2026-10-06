export function normaliseRow(row) {
  const r = { ...row }
  // Embedded line endings and padding must not create extra publications.
  r.citation_title = String(r.citation_title || '').replace(/\s+/g, ' ').trim()

  r.year = r.year ? parseInt(r.year) : null
  r.total_dose_Gy = parseFloat(r.total_dose_Gy) || null
  r.flash_avg_dose_rate_Gy_s = parseFloat(r.flash_avg_dose_rate_Gy_s) || null
  r.flash_inst_dose_rate_Gy_s = parseFloat(r.flash_inst_dose_rate_Gy_s) || null
  r.flash_dose_per_pulse_Gy = parseFloat(r.flash_dose_per_pulse_Gy) || null
  r.flash_prf_Hz = parseFloat(r.flash_prf_Hz) || null
  r.flash_pulse_width_us = parseFloat(r.flash_pulse_width_us) || null
  r.flash_irradiation_time_s = parseFloat(r.flash_irradiation_time_s) || null
  r.flash_num_pulses = parseFloat(r.flash_num_pulses) || null
  r.num_fractions = parseFloat(r.num_fractions) || null
  r.dose_per_fraction_Gy = parseFloat(r.dose_per_fraction_Gy) || null

  const hte = String(r.healthy_tissue_effect || '').trim().toUpperCase()
  r.nts = hte === 'YES' ? true : hte === 'NO' ? false : null

  const isFrac = String(r.is_fractionated || '').toLowerCase()
  const regime = String(r.fractionation_regime || '').toLowerCase()
  r.fractionated = regime.includes('single') ? false
    : regime.includes('multi') || regime.includes('intra') ? true
    : ['yes', '1', '1.0', 'yes_intrafraction_split', 'intra_session_split'].includes(isFrac)

  const pRaw = (r.particle_group || r.particle || 'unknown').toLowerCase().trim()
  if (pRaw === 'heavy_ion' || pRaw === 'other') r.particle = 'heavy ion'
  else if (pRaw === 'electron') r.particle = 'electron'
  else if (pRaw === 'proton') r.particle = 'proton'
  else if (pRaw === 'photon') r.particle = 'photon'
  else r.particle = pRaw

  r.oxygen_condition = r.oxy_group || r.oxygen_condition || 'Not reported'

  return r
}

export function isTumourArm(r) {
  return (r.tissue_class || '').trim().toLowerCase() === 'tumor'
}

export function fractionationGroups(rows) {
  const counts = {}
  const multiColors = { 2: '#fbbf24', 3: '#f59e0b', 4: '#fb923c', 5: '#f97316', 8: '#ef4444', 10: '#dc2626' }
  for (const r of rows) {
    if (isTumourArm(r) || r.nts === null) continue
    const regime = String(r.fractionation_regime || '').toLowerCase()
    let name, category, sortOrder, color
    if (regime.includes('intra')) {
      name = 'Intra-session splits'; category = 'split'; sortOrder = 1; color = '#6366f1'
    } else if (regime.includes('multi')) {
      name = r.num_fractions ? `${r.num_fractions} fx` : 'Multi-day (count unknown)'
      category = 'multi'; sortOrder = 100 + (r.num_fractions || 99); color = multiColors[r.num_fractions] || '#f59e0b'
    } else if (regime.includes('single')) {
      name = '1 fx'; category = 'single'; sortOrder = 0; color = '#14b8a6'
    } else {
      name = 'Unknown regime'; category = 'unknown'; sortOrder = 999; color = '#94a3b8'
    }
    if (!counts[name]) counts[name] = { yes: 0, total: 0, category, sortOrder, color }
    counts[name].total++
    if (r.nts) counts[name].yes++
  }
  return Object.entries(counts)
    .map(([name, v]) => ({ name, n: v.total, yes: v.yes, pct: parseFloat(pct(v.yes, v.total)), category: v.category, sortOrder: v.sortOrder, color: v.color }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function summarise(rows) {
  const nonTumour = rows.filter((r) => !isTumourArm(r))
  const evaluable = nonTumour.filter((r) => r.nts !== null)
  const ntsYes = evaluable.filter((r) => r.nts === true)
  const papers = new Set(rows.map((r) => r.citation_title).filter(Boolean))

  const byParticle = {}
  for (const r of evaluable) {
    const p = r.particle || 'unknown'
    if (!byParticle[p]) byParticle[p] = { total: 0, yes: 0 }
    byParticle[p].total++
    if (r.nts) byParticle[p].yes++
  }

  const byTissue = {}
  for (const r of evaluable) {
    const t = r.tissue_class || 'unknown'
    if (!byTissue[t]) byTissue[t] = { total: 0, yes: 0 }
    byTissue[t].total++
    if (r.nts) byTissue[t].yes++
  }

  const bySpecies = {}
  for (const r of evaluable) {
    const s = r.species || 'unknown'
    if (!bySpecies[s]) bySpecies[s] = { total: 0, yes: 0 }
    bySpecies[s].total++
    if (r.nts) bySpecies[s].yes++
  }

  const byFrac = { single: { total: 0, yes: 0 }, fractionated: { total: 0, yes: 0 } }
  for (const r of evaluable) {
    const key = r.fractionated ? 'fractionated' : 'single'
    byFrac[key].total++
    if (r.nts) byFrac[key].yes++
  }

  const byYear = {}
  for (const r of rows) {
    if (!r.year) continue
    if (!byYear[r.year]) byYear[r.year] = { total: 0, papers: new Set() }
    byYear[r.year].total++
    if (r.citation_title) byYear[r.year].papers.add(r.citation_title)
  }

  return { evaluable, ntsYes, papers, byParticle, byTissue, bySpecies, byFrac, byYear }
}

export function pct(n, d) {
  if (!d) return null
  return ((n / d) * 100).toFixed(1)
}

export function particleColor(p) {
  const map = {
    electron: '#14b8a6',
    proton: '#6366f1',
    'heavy ion': '#f59e0b',
    'heavy_ion': '#f59e0b',
    photon: '#94a3b8',
    other: '#a78bfa',
  }
  return map[p] || '#94a3b8'
}

export const TISSUE_GROUPS = {
  'Brain/CNS': ['CNS_brain', 'CNS_retina', 'neural'],
  'GI/Abdomen': ['GI_abdomen', 'normal_GI', 'GI_normal_tissue'],
  'Skin': ['normal_skin', 'skin', 'tumor_hindlimb_skin_muscle'],
  'Lung/Thorax': ['normal_thorax_lung_immune', 'lung'],
  'Haematopoietic': ['normal_hematopoiesis', 'lymphoid_hematologic', 'lymphoid_immune_system'],
  'Cardiac': ['cardiac', 'heart'],
  'Epithelial': ['epithelial'],
  'Normal tissue (general)': ['normal_tissue'],
  'Tumour': ['tumor', 'tumor_leukemia', 'tumor_and_normal_tissue', 'mixed_tumor_and_normal_hematopoiesis'],
  'Other/Mixed': ['mixed', 'other', 'connective', 'white_adipose_tissue_WAT', 'skin_skeletal_muscle'],
}

export function groupTissue(tissueClass) {
  for (const [group, classes] of Object.entries(TISSUE_GROUPS)) {
    if (classes.includes(tissueClass)) return group
  }
  return 'Other/Mixed'
}
