import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Bot, User, Key, ExternalLink, Loader2, Trash2, AlertCircle } from 'lucide-react'
import { summarise, pct, isTumourArm, groupTissue } from '../utils/dataUtils'

const STORAGE_KEY = 'flash_explorer_groq_key'
const MODEL = 'llama-3.3-70b-versatile'

function buildContext(rows, stats) {
  const nonTumour = rows.filter(r => !isTumourArm(r))
  const evaluable = nonTumour.filter(r => r.nts !== null)

  const byParticle = Object.entries(stats.byParticle)
    .map(([p, v]) => `  - ${p}: ${v.yes}/${v.total} (${pct(v.yes, v.total)}%) NTS`)
    .join('\n')

  const byTissueGroup = {}
  for (const r of evaluable) {
    const g = groupTissue(r.tissue_class)
    if (!byTissueGroup[g]) byTissueGroup[g] = { yes: 0, total: 0 }
    byTissueGroup[g].total++
    if (r.nts) byTissueGroup[g].yes++
  }
  const byTissueStr = Object.entries(byTissueGroup)
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([g, v]) => `  - ${g}: ${v.yes}/${v.total} (${pct(v.yes, v.total)}%) NTS`)
    .join('\n')

  const drWithData = evaluable.filter(r => r.flash_avg_dose_rate_Gy_s)
  const dppWithData = evaluable.filter(r => r.flash_dose_per_pulse_Gy)
  const drMed = drWithData.map(r => r.flash_avg_dose_rate_Gy_s).sort((a,b) => a-b)
  const median = arr => arr.length ? arr[Math.floor(arr.length/2)] : null

  const papers = new Set(rows.map(r => r.citation_title).filter(Boolean))
  const years = rows.map(r => r.year).filter(Boolean)
  const yearRange = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : 'unknown'

  return `You are an expert scientific assistant for the FLASH RT Explorer — an interactive database of in-vivo FLASH radiotherapy research.

## DATABASE SUMMARY
- Total experimental arms: ${rows.length} from ${papers.size} publications (${yearRange})
- Evaluable non-tumour arms (direct FLASH vs conventional comparison): ${evaluable.length}
- FLASH normal-tissue sparing (NTS) rate: ${pct(stats.ntsYes.length, evaluable.length)}% (${stats.ntsYes.length}/${evaluable.length})
- Dose rates available: n=${drWithData.length}, median ${median(drMed)?.toFixed(0)} Gy/s
- Dose per pulse available: n=${dppWithData.length}

## NTS RATE BY PARTICLE TYPE
${byParticle}

## NTS RATE BY TISSUE GROUP
${byTissueStr}

## FRACTIONATION
- Single fraction: 71.6% NTS (n=306)
- Fractionated: 51.5% NTS (n=33) — χ²=4.76, p=0.029

## ML ANALYSIS RESULTS (Random Forest, 5-fold CV, n=349)
- Dosimetric features (dose, dose rate): Balanced Accuracy = 0.685 ± 0.017
- Temporal/pulse features (DPP, PRF, pulse width, fractions): BA = 0.683 ± 0.021
- Model/tissue features (species, tissue class): BA = 0.527 ± 0.014 (near chance)
- Experimental conditions (anaesthesia, oxygen): BA = 0.542 ± 0.021 (near chance)
- Combined: BA = 0.668 ± 0.022
- KEY FINDING: Physics features dominate; biology near chance — FLASH effect is primarily physics-driven.

## KEY THRESHOLDS
- Average dose rate: ≥40.8 Gy/s threshold identified; 26.3% non-sparing even above threshold
- Dose per pulse (non-proton): ≥3.7 Gy (Balanced Accuracy = 0.612)
- Dose per pulse (electron only): ≥1.0 Gy (BA = 0.620)

## DMF (Dose Modifying Factor)
- n=99 arms with calculable DMF; mean DMF = 1.24 ± 0.20

## OXYGEN CONDITION (single fraction subset, n=304)
- Normoxia: 73.1% NTS (n=175) — reference
- Hyperoxic (>90% O₂): 30.0% NTS (n=10) — p=0.007, significantly lower
- Hypoxic/anoxic: 60.0% NTS (n=5) — underpowered

## ANAESTHESIA (single fraction, n=297)
- Isoflurane: 78.1% (n=114) vs Ketamine: 77.5% (n=40) — p=1.0, NO EFFECT

Answer questions concisely and scientifically. Cite specific numbers from the database. If asked about something not in the database, say so clearly. Use markdown formatting.`
}

const EXAMPLE_QUESTIONS = [
  'Which particle type shows the highest FLASH NTS rate?',
  'Is there evidence that dose rate alone explains the FLASH effect?',
  'How does fractionation affect FLASH sparing?',
  'What tissue types benefit most from FLASH?',
  'Does oxygen condition affect the FLASH effect?',
  'What is the evidence for a dose per pulse threshold?',
]

export default function AIAssistant({ rows }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [keyInput, setKeyInput] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  const stats = useMemo(() => summarise(rows), [rows])
  const systemContext = useMemo(() => buildContext(rows, stats), [rows, stats])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveKey = () => {
    const k = keyInput.trim()
    if (!k.startsWith('gsk_')) {
      setError('Groq API keys start with "gsk_". Please check your key.')
      return
    }
    localStorage.setItem(STORAGE_KEY, k)
    setApiKey(k)
    setKeyInput('')
    setError(null)
  }

  const sendMessage = async (text) => {
    const question = text.trim()
    if (!question || loading) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemContext },
            ...history,
            userMsg,
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `API error ${res.status}`)
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'No response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function renderContent(text) {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('## ')) return <p key={i} className="font-bold text-slate-800 mt-2">{line.slice(3)}</p>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>
      if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>
      if (line.match(/^\d+\. /)) return <li key={i} className="ml-4 list-decimal">{renderInline(line.replace(/^\d+\. /, ''))}</li>
      if (line === '') return <br key={i} />
      return <p key={i}>{renderInline(line)}</p>
    })
  }

  function renderInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  if (!apiKey) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">AI Research Assistant</h2>
          <p className="text-sm text-slate-500">Ask natural language questions about the FLASH RT database.</p>
        </div>

        <div className="card max-w-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Enter your Groq API key</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Groq is <strong>completely free</strong> — no credit card required.
                Get your key at{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                  console.groq.com/keys <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700 space-y-1">
            <p className="font-semibold">How it works</p>
            <p>Your key is stored only in your browser (localStorage) and sent directly to Groq's servers. It is never stored anywhere else. The AI is given a structured summary of the database as context.</p>
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder="gsk_..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button onClick={saveKey} className="btn-primary bg-indigo-600 hover:bg-indigo-700">
              Save
            </button>
          </div>
          {error && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
        </div>

        <div className="card bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 mb-2">Example questions you can ask</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map(q => (
              <span key={q} className="px-3 py-1.5 bg-white rounded-full text-xs text-slate-600 border border-slate-200">{q}</span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">AI Research Assistant</h2>
          <p className="text-sm text-slate-500">
            Powered by Llama 3.3 70B via Groq · Context: full database summary ({rows.length} arms, {stats.evaluable.length} evaluable)
          </p>
        </div>
        <button
          onClick={() => { localStorage.removeItem(STORAGE_KEY); setApiKey(''); setMessages([]) }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors"
        >
          <Key className="w-3.5 h-3.5" /> Change key
        </button>
      </div>

      {/* Example questions */}
      {messages.length === 0 && (
        <div className="card bg-indigo-50 border-indigo-100">
          <p className="text-xs font-semibold text-indigo-700 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="px-3 py-1.5 bg-white rounded-full text-xs text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat window */}
      <div className="card p-0 overflow-hidden flex flex-col" style={{ minHeight: '400px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[520px]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Bot className="w-10 h-10" />
              <p className="text-sm">Ask a question about the FLASH RT database</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                ${m.role === 'user' ? 'bg-flash-100' : 'bg-indigo-100'}`}>
                {m.role === 'user'
                  ? <User className="w-4 h-4 text-flash-600" />
                  : <Bot className="w-4 h-4 text-indigo-600" />}
              </div>
              <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[80%]
                ${m.role === 'user'
                  ? 'bg-flash-600 text-white'
                  : 'bg-slate-100 text-slate-800'}`}>
                {m.role === 'assistant'
                  ? <div className="space-y-0.5">{renderContent(m.content)}</div>
                  : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-slate-100 rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-sm text-slate-500">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 flex items-center gap-2 text-xs text-rose-600">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 p-3 flex gap-2">
          <input
            type="text"
            placeholder="Ask a question about FLASH RT…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            disabled={loading}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null) }}
              className="w-9 h-9 rounded-lg border border-slate-300 text-slate-400 hover:text-rose-500 hover:border-rose-300 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
