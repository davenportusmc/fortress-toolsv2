'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calculator } from 'lucide-react'

// Machines
type Machine = 'Rower' | 'Bike Erg' | 'Echo Bike' | 'Ski Erg' | 'Run'
const MACHINES: Machine[] = ['Rower', 'Bike Erg', 'Echo Bike', 'Ski Erg', 'Run']

type Unit = 'meters' | 'calories'

// Conversion profile (tunable). Intent:
// - Bike Erg meters ~ 2x Row meters for similar work
// - Echo Bike primarily calories; use row-equivalent meters for mapping
// - Meters per calorie heuristics (gym-friendly, adjustable):
//   Row: 12 m/cal, Ski: 12 m/cal, Run: 16 m/cal, Bike: 24 m/cal, Echo: 12 m/cal
const metersPerCal: Record<Machine, number> = {
  'Rower': 12,
  'Ski Erg': 12,
  'Run': 16,
  'Bike Erg': 24,
  'Echo Bike': 12,
}

// Meter ratios relative to Row meters
// rowEquivalentMeters = inputMeters * toRowMeterRatio[machine]
const toRowMeterRatio: Record<Machine, number> = {
  'Rower': 1,
  'Ski Erg': 1,
  'Run': 1,
  'Bike Erg': 0.5, // Bike meters are ~2x Row meters for similar work
  'Echo Bike': 1,  // no meters; treat given meters as row-equivalent
}
// Recover machine meters from rowEquivalentMeters
const fromRowMeterRatio: Record<Machine, number> = {
  'Rower': 1,
  'Ski Erg': 1,
  'Run': 1,
  'Bike Erg': 2,
  'Echo Bike': 1,
}

function formatNumber(n: number) {
  if (!isFinite(n)) return '-'
  if (n >= 1000) return Math.round(n).toString()
  if (n >= 100) return n.toFixed(0)
  if (n >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

export default function ConversionCalculatorPage() {
  const [value, setValue] = useState<string>('500')
  const [unit, setUnit] = useState<Unit>('meters')
  const [machine, setMachine] = useState<Machine>('Rower')

  const rowEquivalentMeters = useMemo(() => {
    const v = parseFloat(value)
    if (!isFinite(v) || v <= 0) return 0

    if (unit === 'meters') {
      return v * toRowMeterRatio[machine]
    } else {
      // calories -> meters for the selected machine
      return v * metersPerCal[machine]
    }
  }, [value, unit, machine])

  const rows = useMemo(() => {
    return MACHINES.map((m) => {
      const meters = rowEquivalentMeters * fromRowMeterRatio[m]
      const calories = meters / metersPerCal[m]
      return {
        machine: m,
        meters,
        calories,
      }
    })
  }, [rowEquivalentMeters])

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
          <h1 className="mx-auto text-2xl font-bold text-white">Conversion Calculator</h1>
        </div>

        {/* Controls */}
        <div className="space-y-3 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          {/* One-row compact controls */}
          <div className="grid grid-cols-6 gap-2 items-center">
            <input
              type="number"
              inputMode="decimal"
              className="col-span-2 w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none [appearance:textfield] [::-webkit-outer-spin-button]:appearance-none [::-webkit-inner-spin-button]:appearance-none"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value"
            />
            <select
              className="col-span-2 w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-white"
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
            >
              <option value="meters">Meters</option>
              <option value="calories">Calories</option>
            </select>
            <select
              className="col-span-2 w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-white"
              value={machine}
              onChange={(e) => setMachine(e.target.value as Machine)}
            >
              {MACHINES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Results Table */}
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60">
          <div className="grid grid-cols-3 text-slate-300 text-sm border-b border-slate-700">
            <div className="px-3 py-2 font-semibold">Machine</div>
            <div className="px-3 py-2 font-semibold text-right">Meters</div>
            <div className="px-3 py-2 font-semibold text-right">Calories</div>
          </div>
          <div>
            {rows.map((r) => (
              <div key={r.machine} className="grid grid-cols-3 text-white/90 text-sm border-t border-slate-700/60">
                <div className="px-3 py-2">{r.machine}</div>
                <div className="px-3 py-2 text-right">{formatNumber(r.meters)}</div>
                <div className="px-3 py-2 text-right">{formatNumber(r.calories)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rule of thumb */}
        <div className="text-[12px] text-slate-300 leading-5 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
          <div className="font-semibold text-slate-200 mb-1">Rule of thumb</div>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="text-slate-200">Row</span> / <span className="text-slate-200">Ski</span> / <span className="text-slate-200">Echo Bike</span>: ~12 meters ≈ 1 calorie</li>
            <li><span className="text-slate-200">Bike Erg</span>: ~24 meters ≈ 1 calorie</li>
            <li><span className="text-slate-200">Run</span>: ~16 meters ≈ 1 calorie</li>
            <li><span className="text-slate-200">Bike Erg meters</span> are roughly 2× Row meters for similar effort</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
