'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calculator } from 'lucide-react'
import {
  MACHINES,
  Machine,
  Unit,
  formatNumber,
  computeRowEquivalentMeters,
  computeRows,
} from '@/lib/conversion'

export default function ConversionCalculatorPage() {
  const [value, setValue] = useState<string>('500')
  const [unit, setUnit] = useState<Unit>('meters')
  const [machine, setMachine] = useState<Machine>('Rower')

  const rowEquivalentMeters = useMemo(() => {
    const v = parseFloat(value)
    return computeRowEquivalentMeters(v, unit, machine)
  }, [value, unit, machine])

  const rows = useMemo(() => computeRows(rowEquivalentMeters, 'meters', 'Rower'), [rowEquivalentMeters])

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
            <li><span className="text-slate-200">Row</span> / <span className="text-slate-200">Ski</span> / <span className="text-slate-200">Bike Erg</span>: ~12 meters ≈ 1 calorie</li>
            <li><span className="text-slate-200">Echo Bike</span>: ~17.1 meters ≈ 1 calorie (10 baseline cals ≈ 7 Echo cals)</li>
            <li><span className="text-slate-200">Run</span>: ~16 meters ≈ 1 calorie</li>
            <li><span className="text-slate-200">Bike Erg meters</span> are roughly 2× Row meters for similar effort</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
