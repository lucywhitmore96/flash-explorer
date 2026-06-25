import React, { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'

const DISPLAY_COLS = [
  { key: 'citation_title', label: 'Paper', width: 'min-w-[220px] max-w-xs' },
  { key: 'year', label: 'Year', width: 'w-16' },
  { key: 'particle', label: 'Particle', width: 'w-24' },
  { key: 'species', label: 'Species', width: 'w-24' },
  { key: 'tissue_class', label: 'Tissue', width: 'w-36' },
  { key: 'total_dose_Gy', label: 'Dose (Gy)', width: 'w-24' },
  { key: 'flash_avg_dose_rate_Gy_s', label: 'DR (Gy/s)', width: 'w-24' },
  { key: 'flash_dose_per_pulse_Gy', label: 'DPP (Gy)', width: 'w-24' },
  { key: 'num_fractions', label: 'Fractions', width: 'w-20' },
  { key: 'nts', label: 'NTS', width: 'w-16' },
]

function NtsBadge({ value }) {
  if (value === true) return <span className="badge-yes">YES</span>
  if (value === false) return <span className="badge-no">NO</span>
  return <span className="badge-na">N/A</span>
}

function fmt(val, key) {
  if (val === null || val === undefined || val === '' || val === 'nan') return '—'
  if (key === 'nts') return null
  if (typeof val === 'number') return val % 1 === 0 ? val : val.toFixed(2)
  return String(val)
}

const PAGE_SIZE = 50

export default function DataExplorer({ rows }) {
  const [search, setSearch] = useState('')
  const [particleFilter, setParticleFilter] = useState('all')
  const [ntsFilter, setNtsFilter] = useState('all')
  const [fracFilter, setFracFilter] = useState('all')
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)

  const particles = useMemo(() => ['all', ...new Set(rows.map((r) => r.particle).filter(Boolean))], [rows])

  const filtered = useMemo(() => {
    let r = rows
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(
        (row) =>
          (row.citation_title || '').toLowerCase().includes(q) ||
          (row.particle || '').toLowerCase().includes(q) ||
          (row.tissue_class || '').toLowerCase().includes(q) ||
          (row.species || '').toLowerCase().includes(q),
      )
    }
    if (particleFilter !== 'all') r = r.filter((row) => row.particle === particleFilter)
    if (ntsFilter === 'yes') r = r.filter((row) => row.nts === true)
    else if (ntsFilter === 'no') r = r.filter((row) => row.nts === false)
    else if (ntsFilter === 'evaluable') r = r.filter((row) => row.nts !== null)

    if (fracFilter === 'single') r = r.filter((row) => !row.fractionated)
    else if (fracFilter === 'frac') r = r.filter((row) => row.fractionated)

    r = [...r].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
      return sortDir === 'asc' ? cmp : -cmp
    })
    return r
  }, [rows, search, particleFilter, ntsFilter, fracFilter, sortKey, sortDir])

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 text-slate-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-flash-500" />
      : <ChevronDown className="w-3 h-3 text-flash-500" />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Data Explorer</h2>
        <p className="text-sm text-slate-500">Browse and filter all {rows.length} experimental arms in the database.</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Paper title, tissue, species…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-flash-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Particle</label>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
            value={particleFilter}
            onChange={(e) => { setParticleFilter(e.target.value); setPage(0) }}
          >
            {particles.map((p) => <option key={p} value={p}>{p === 'all' ? 'All particles' : p}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">NTS outcome</label>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
            value={ntsFilter}
            onChange={(e) => { setNtsFilter(e.target.value); setPage(0) }}
          >
            <option value="all">All arms</option>
            <option value="evaluable">Evaluable only</option>
            <option value="yes">NTS = YES</option>
            <option value="no">NTS = NO</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fractionation</label>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flash-400"
            value={fracFilter}
            onChange={(e) => { setFracFilter(e.target.value); setPage(0) }}
          >
            <option value="all">All</option>
            <option value="single">Single fraction</option>
            <option value="frac">Fractionated</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 self-end pb-2">{filtered.length} arms</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {DISPLAY_COLS.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left text-slate-600 font-semibold cursor-pointer hover:bg-slate-100 select-none ${col.width}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon k={col.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                {DISPLAY_COLS.map((col) => (
                  <td key={col.key} className={`px-3 py-2 ${col.width} ${col.key === 'citation_title' ? 'truncate' : ''}`}>
                    {col.key === 'nts' ? (
                      <NtsBadge value={row.nts} />
                    ) : (
                      <span className="text-slate-700">{fmt(row[col.key], col.key)}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {pageRows.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">No arms match the current filters.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Page {page + 1} of {totalPages} ({filtered.length} arms)</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
