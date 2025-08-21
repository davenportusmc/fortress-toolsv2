'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import BarbellGraphic from '@/components/BarbellGraphic'

type RoundingType = 'normal' | 'up' | 'down'

function roundValue(value: number, increment: number, type: RoundingType) {
  if (increment <= 0) return value
  const ratio = value / increment
  if (type === 'up') return Math.ceil(ratio) * increment
  if (type === 'down') return Math.floor(ratio) * increment
  return Math.round(ratio) * increment
}

export default function PercentCalculatorPage() {
  const [trainingMax, setTrainingMax] = useState<string>('')
  const [increment, setIncrement] = useState<number>(5) // lb only
  const [roundingType, setRoundingType] = useState<RoundingType>('normal')

  // Fixed percents: 100 down to 0, step 5
  const percents = useMemo(() => {
    const arr: number[] = []
    for (let p = 100; p >= 0; p -= 5) arr.push(p)
    return arr
  }, [])

  const rows = useMemo(() => {
    const tm = parseFloat(trainingMax)
    const tmNum = Number.isFinite(tm) ? tm : 0
    return percents.map((p) => {
      const raw = (tmNum * p) / 100
      const rounded = roundValue(raw, increment, roundingType)
      return { p, raw, rounded }
    })
  }, [percents, trainingMax, increment, roundingType])

  // Build modal state
  const [buildOpen, setBuildOpen] = useState(false)
  const [buildWeight, setBuildWeight] = useState<number | null>(null)

  function openBuild(weight: number) {
    setBuildWeight(weight)
    setBuildOpen(true)
  }

  // Plate calculation logic (LB only). Returns order array (each entry is a PAIR) and text lines.
  function buildForBar(total: number, barWeight: number) {
    const result = { order: [] as number[], lines: [] as string[] }
    if (total <= 0) return result
    if (total <= barWeight + 0.0001) {
      result.lines.push('Bar only')
      return result
    }
    const perSide = (total - barWeight) / 2
    const plateOptions = [45, 35, 25, 15, 10, 5, 2.5, 1]
    const used: Record<string, number> = {}
    let remaining = perSide
    for (const p of plateOptions) {
      let count = 0
      while (remaining + 1e-6 >= p) {
        remaining -= p
        count += 1
        result.order.push(p)
      }
      if (count > 0) used[p] = count
    }
    if (remaining > 0.01) {
      // Note any leftover that couldn't be matched exactly
      result.lines.push(`Unmatched remainder per side: ${remaining.toFixed(2)} lb`)
    }
    // Convert usage map to lines sorted by weight desc
    Object.keys(used)
      .map((k) => Number(k))
      .sort((a, b) => b - a)
      .forEach((w) => {
        const pairs = used[w]
        result.lines.push(`${w} x ${pairs * 2}`)
      })
    if (result.lines.length === 0) {
      result.lines.push('No plates required')
    }
    return result
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="relative flex items-center">
          <Link href="/" className="absolute left-0">
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="mx-auto text-2xl font-bold text-white">Percent Calculator</h1>
        </div>

        {/* Inputs */}
        <div className="bg-slate-800 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1 text-center">1 Rep Max (lb)</label>
              <div className="flex justify-center">
                <input
                  type="number"
                  className="w-40 text-center bg-slate-900 text-white rounded-md px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={trainingMax}
                  onChange={(e) => setTrainingMax(e.target.value)}
                  placeholder=""
                  min={0}
                  step={5}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 text-slate-300 text-sm text-center">
            <div className="px-3 py-2 bg-slate-900">% of 1RM</div>
            <div className="px-3 py-2 bg-slate-900">Weight (raw)</div>
            <div className="px-3 py-2 bg-slate-900">Rounded (lb)</div>
            <div className="px-3 py-2 bg-slate-900">Build</div>
          </div>
          <div>
            {rows.map((r) => (
              <div key={r.p} className="grid grid-cols-4 border-t border-slate-700 text-white text-center items-center">
                <div className="px-3 py-2">{r.p}%</div>
                <div className="px-3 py-2 text-slate-300">{r.raw.toFixed(1)}</div>
                <div className="px-3 py-2 font-semibold">{r.rounded}</div>
                <div className="px-3 py-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500" onClick={() => openBuild(r.rounded)}>
                    Build
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rounding controls under table */}
        <div className="bg-slate-800 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Rounding (lb)</label>
            <select
              className="w-full bg-slate-900 text-white rounded-md px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={increment}
              onChange={(e) => setIncrement(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2.5}>2.5</option>
              <option value={5}>5</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Rounding type</label>
            <select
              className="w-full bg-slate-900 text-white rounded-md px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={roundingType}
              onChange={(e) => setRoundingType(e.target.value as RoundingType)}
            >
              <option value="normal">Normal</option>
              <option value="up">Round up</option>
              <option value="down">Round down</option>
            </select>
          </div>
        </div>

        {/* Build Modal */}
        {buildOpen && buildWeight !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setBuildOpen(false)} />
            <div className="relative z-10 w-full max-w-4xl mx-4 bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-white">Build {buildWeight} lb</h2>
                <Button variant="ghost" className="text-slate-300" onClick={() => setBuildOpen(false)}>Close</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Men's 45 lb bar */}
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-slate-300 text-sm mb-2 text-center">45 lb barbell</div>
                  {(() => {
                    const plan = buildForBar(buildWeight, 45)
                    return (
                      <>
                        <div className="space-y-1 text-white text-sm mb-3 text-center flex flex-col items-center justify-start min-h-24 md:min-h-28">
                          {plan.lines.map((l, i) => (
                            <div key={i}>{l}</div>
                          ))}
                        </div>
                        <BarbellGraphic total={buildWeight} unit="lb" order={plan.order} showCollars={true} />
                      </>
                    )
                  })()}
                </div>

                {/* Women's 35 lb bar */}
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="text-slate-300 text-sm mb-2 text-center">35 lb barbell</div>
                  {(() => {
                    const plan = buildForBar(buildWeight, 35)
                    return (
                      <>
                        <div className="space-y-1 text-white text-sm mb-3 text-center flex flex-col items-center justify-start min-h-24 md:min-h-28">
                          {plan.lines.map((l, i) => (
                            <div key={i}>{l}</div>
                          ))}
                        </div>
                        <BarbellGraphic total={buildWeight} unit="lb" order={plan.order} showCollars={true} />
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
