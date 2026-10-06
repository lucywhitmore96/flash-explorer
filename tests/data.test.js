import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { normaliseRow, summarise, fractionationGroups } from '../src/utils/dataUtils.js'

const dataRoot = new URL('../public/data/ml-final-2026-09-11/', import.meta.url)
const results = JSON.parse(readFileSync(new URL('../src/data/mlFinal.json', import.meta.url), 'utf8'))
function parse(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' })
  assert.deepEqual(parsed.errors, [])
  return parsed.data
}
const readTable = name => parse(readFileSync(new URL(`${name}.csv`, dataRoot), 'utf8'))

test('published data matches the reviewed 80-publication cohort', () => {
  const rows = readTable('literature').map(normaliseRow)
  const stats = summarise(rows)
  assert.equal(rows.length, 466)
  assert.equal(stats.papers.size, 80)
  assert.ok(rows.every(row => row.citation_title))
  assert.equal(stats.evaluable.length, 326)
  assert.equal(stats.ntsYes.length, 221)
  assert.equal(new Set(stats.evaluable.map(row => row.citation_title)).size, 66)
  assert.equal(readTable('ml-input').length, 331)
  assert.deepEqual(results.dataset, { arms: 466, publications: 80, mlInputRows: 331, evaluableArms: 326, ntsYes: 221 })
})

test('empty spreadsheet records are skipped and title whitespace does not split publications', () => {
  const rows = parse('citation_title,year,healthy_tissue_effect\n"Study A",2026,YES\n,,\n"  ", , \n"Study\r\nA",2026,NO\n').map(normaliseRow)
  assert.equal(rows.length, 2)
  assert.equal(summarise(rows).papers.size, 1)
})

test('analysis tables displayed in the app match downloadable source tables', () => {
  for (const name of ['ML_main_results', 'primary_cohort_summary', 'DMF_summary_single_fraction', 'fractionation_regime_summary', 'threshold_summary_apparent', 'threshold_summary_publication_grouped', 'oxygen_NTS_summary', 'anesthesia_NTS_summary']) {
    assert.deepEqual(results[name], readTable(name), name)
  }
})

test('paired toxicity scores retain the 0–5 scale and CONV minus FLASH direction', () => {
  let paired = 0
  for (const row of readTable('literature')) {
    const values = ['functional_toxicity_severity_flash', 'functional_toxicity_severity_conv', 'functional_delta_score'].map(key => row[key])
    if (values.some(value => !value?.trim() || !Number.isFinite(Number(value)))) continue
    const [flash, conv, delta] = values.map(Number)
    assert.ok(flash >= 0 && flash <= 5 && conv >= 0 && conv <= 5)
    assert.equal(delta, conv - flash)
    paired++
  }
  assert.ok(paired > 0)
})

test('fractionation charts and filters agree with the reviewed regime summary', () => {
  const rows = readTable('literature').map(normaliseRow)
  const groups = fractionationGroups(rows)
  const categories = { single_fraction: 'single', multi_day_fractionated: 'multi', intra_session_split: 'split' }
  for (const source of readTable('fractionation_regime_summary')) {
    const subset = groups.filter(group => group.category === categories[source.comparison])
    assert.equal(subset.reduce((n, group) => n + group.n, 0), Number(source.n))
    assert.equal(subset.reduce((n, group) => n + group.yes, 0), Number(source.NTS_yes))
  }
  const evaluable = summarise(rows).evaluable
  assert.equal(evaluable.filter(row => !row.fractionated).length, 286)
  assert.equal(evaluable.filter(row => row.fractionated).length, 40)
})
