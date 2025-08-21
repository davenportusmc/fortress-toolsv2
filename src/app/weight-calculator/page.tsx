'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { WeightState, PlateCount, PLATE_WEIGHTS, calculateTotal, UndoStack, getPlateColorClass } from '@/lib/utils'
import BarbellGraphic from '@/components/BarbellGraphic'

export default function WeightCalculator() {
  const [barbell, setBarbell] = useState<number>(45)
  const [plates, setPlates] = useState<PlateCount>({})
  // Track selection order; each entry equals one pair added
  const [order, setOrder] = useState<number[]>([])
  const [undoStack] = useState(() => new UndoStack<WeightState>(10))
  const [showCollars, setShowCollars] = useState(false)

  const total = calculateTotal(barbell, plates)

  const saveState = useCallback(() => {
    // Persist with LB as the only unit
    undoStack.push({ barbell, plates: { ...plates }, unit: 'lb', total, order: [...order] })
  }, [barbell, plates, total, order, undoStack])

  const handleUndo = () => {
    const previousState = undoStack.pop()
    if (previousState) {
      setBarbell(previousState.barbell)
      setPlates(previousState.plates)
      setOrder(previousState.order || [])
    }
  }

  const handleReset = () => {
    saveState()
    setPlates({})
    setBarbell(45)
    setOrder([])
  }

  const handleBarbellChange = (weight: number) => {
    saveState()
    setBarbell(weight)
  }

  const handlePlateChange = (weight: number, change: number) => {
    saveState()
    setPlates(prev => {
      const next = { ...prev }
      const nextCount = Math.max(0, (next[weight] || 0) + change)
      next[weight] = nextCount
      return next
    })
    setOrder(prev => {
      if (change > 0) {
        return [...prev, weight]
      } else {
        // remove last occurrence of this weight
        const idx = [...prev].reverse().findIndex(w => w === weight)
        if (idx === -1) return prev
        const removeAt = prev.length - 1 - idx
        return [...prev.slice(0, removeAt), ...prev.slice(removeAt + 1)]
      }
    })
  }

  // KG removed; LB only

  const plateWeights = PLATE_WEIGHTS.lb
  const barbellOptions = [45, 35, 15]

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
          <h1 className="mx-auto text-2xl font-bold text-white">Barbell Calculator</h1>
        </div>

        {/* Removed Undo/Reset row to save vertical space */}

        {/* Barbell Selection */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Barbell</h3>
          <div className="flex gap-2">
            {barbellOptions.map((weight) => (
              <Button
                key={weight}
                onClick={() => handleBarbellChange(weight)}
                variant={barbell === weight ? "default" : "outline"}
                className={`fortress-pill flex-1 ${
                  barbell === weight 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                }`}
              >
                {weight} lb
              </Button>
            ))}
          </div>
        </div>

        {/* Barbell Graphic with Total */}
        <BarbellGraphic total={total} unit={'lb'} order={order} showCollars={showCollars} />

        {/* Plates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Plates</h3>
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white h-8 px-3"
              title="Reset all"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
          {(() => {
            // 3 rows: first 4, next 3, remaining (e.g., 2)
            const row1 = plateWeights.slice(0, 4)
            const row2 = plateWeights.slice(4, 7)
            const row3 = plateWeights.slice(7)

            const PlateButton = ({ weight, size }: { weight: number, size: 'lg' | 'md' | 'sm' }) => {
              const countPairs = (plates[weight] || 0) * 2
              const sizeClass = size === 'lg' ? 'w-16 h-16 text-base' : size === 'md' ? 'w-14 h-14 text-sm' : 'w-12 h-12 text-xs'
              const colorClass = getPlateColorClass(weight, 'lb')
              const visibilityClass = (weight === 5 || weight === 2.5 || weight === 1)
                ? 'ring-2 ring-slate-300/60 shadow-lg'
                : ''
              return (
                <div key={weight} className="flex flex-col items-center space-y-1">
                  <button
                    onClick={() => handlePlateChange(weight, 1)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      handlePlateChange(weight, -1)
                    }}
                    className={`relative flex items-center justify-center rounded-full border ${sizeClass} aspect-square p-0 shadow active:scale-95 transition-transform flex-shrink-0 ${colorClass} ${visibilityClass}`}
                    title={`${weight} lb`}
                  >
                    {countPairs > 0 && (
                      <span className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white text-[10px] leading-4 min-w-4 h-4 px-1 border border-white/20 flex items-center justify-center">
                        {countPairs}
                      </span>
                    )}
                    <div className="text-center leading-tight select-none flex items-center justify-center">
                      <div className="font-bold">{weight}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handlePlateChange(weight, -1)}
                    className={`text-[11px] transition-colors ${countPairs > 0 ? 'text-red-400 hover:text-red-300 opacity-100' : 'opacity-0 text-slate-800 pointer-events-none'}`}
                  >
                    Remove
                  </button>
                </div>
              )
            }

            return (
              <div className="space-y-3">
                {/* Row 1: 55,45,35,25 */}
                <div className="flex justify-center items-center gap-4">
                  {row1.map((w) => (
                    <PlateButton key={w} weight={w} size="lg" />
                  ))}
                </div>

                {/* Row 2: 15,10,5 */}
                <div className="flex justify-center items-center gap-4">
                  {row2.map((w) => (
                    <PlateButton key={w} weight={w} size="md" />
                  ))}
                </div>

                {/* Row 3: 2.5,1 */}
                <div className="flex justify-center items-center gap-4">
                  {row3.map((w) => (
                    <PlateButton key={w} weight={w} size="sm" />
                  ))}
                </div>

                {/* Collars toggle row (round button + label) */}
                <div className="flex justify-center items-center pt-1">
                  <div className="flex flex-col items-center space-y-1">
                    <button
                      type="button"
                      onClick={() => setShowCollars((v) => !v)}
                      className={`flex items-center justify-center rounded-full border w-12 h-12 aspect-square p-0 shadow active:scale-95 transition-transform ${
                        showCollars
                          ? 'bg-slate-200 text-slate-900 border-slate-300'
                          : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                      }`}
                      title="Toggle collars"
                      aria-label="Toggle collars"
                    >
                      {/* simple spring icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 14c-3-6 7-9 9-3 1 3-1 5-4 6" />
                        <circle cx="16" cy="16" r="1.5" />
                      </svg>
                    </button>
                    <div className="text-[11px] text-slate-300">Collars</div>
                  </div>
                </div>
              </div>
            )
          })()}
          {/* instruction text removed per request */}
        </div>

      </div>
    </div>
  )
}
