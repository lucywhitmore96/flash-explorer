export function normaliseRow(row) {
  const r = { ...row }

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

  const nts = parseFloat(r.target_normal_tissue_sparing_binary)
  r.nts = isNaN(nts) ? null : nts === 1 ? true : nts === 0 ? false : null

  const isFrac = String(r.is_fractionated || '').toLowerCase()
  r.fractionated = isFrac === 'yes' || isFrac === '1' || isFrac === '1.0' || isFrac === 'yes_intrafraction_split'

  r.particle = r.particle_group || r.particle || 'unknown'
  r.particle = r.particle.replace('_', ' ')

  return r
}

export function summarise(rows) {
  const evaluable = rows.filter((r) => r.nts !== null)
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
