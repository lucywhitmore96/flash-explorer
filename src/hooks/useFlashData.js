import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { normaliseRow } from '../utils/dataUtils'

const CSV_URL = import.meta.env.BASE_URL + 'lit_review_structured_v86.csv'

export function useFlashData() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const normalised = result.data.map(normaliseRow)
        setRows(normalised)
        setLoading(false)
      },
      error: (err) => {
        setError(err.message)
        setLoading(false)
      },
    })
  }, [])

  return { rows, loading, error }
}
