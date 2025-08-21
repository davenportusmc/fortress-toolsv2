import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Percent calculator utilities
export function calculatePercentages(value: number, roundingMethod: 'down' | 'up', smallestPlate: number) {
  const percentages = []
  
  for (let i = 0; i <= 100; i += 5) {
    const exact = (value * i) / 100
    let rounded: number
    
    if (roundingMethod === 'down') {
      rounded = Math.floor(exact / smallestPlate) * smallestPlate
    } else {
      rounded = Math.ceil(exact / smallestPlate) * smallestPlate
    }
    
    percentages.push({
      percent: i,
      exact: Math.round(exact * 100) / 100,
      rounded: rounded
    })
  }
  
  return percentages
}

// Weight calculator utilities
export interface PlateCount {
  [key: string]: number
}

export interface WeightState {
  barbell: number
  plates: PlateCount
  unit: 'lb' | 'kg'
  total: number
  order: number[]
}

export const PLATE_WEIGHTS = {
  // Include 1 lb to support very small adjustments
  lb: [55, 45, 35, 25, 15, 10, 5, 2.5, 1],
  kg: [20, 15, 10, 5, 2.5, 1.25]
}

// Approx bumper plate colors (readable text colors included)
export const PLATE_COLORS_LB: Record<number, string> = {
  45: 'bg-blue-600 border-blue-500 text-white',
  35: 'bg-yellow-400 border-yellow-300 text-slate-900',
  25: 'bg-green-600 border-green-500 text-white',
  10: 'bg-neutral-900 border-neutral-700 text-white',
  5: 'bg-white border-neutral-300 text-slate-900',
  2.5: 'bg-neutral-900 border-neutral-700 text-white',
  1: 'bg-slate-500 border-slate-400 text-white'
}

export const PLATE_COLORS_KG: Record<number, string> = {
  20: 'bg-blue-600 border-blue-500 text-white',
  15: 'bg-yellow-400 border-yellow-300 text-slate-900',
  10: 'bg-green-600 border-green-500 text-white',
  5: 'bg-white border-neutral-300 text-slate-900',
  2.5: 'bg-neutral-900 border-neutral-700 text-white',
  1.25: 'bg-slate-500 border-slate-400 text-white'
}

export function calculateTotal(barbell: number, plates: PlateCount): number {
  let total = barbell
  
  Object.entries(plates).forEach(([weight, count]) => {
    total += parseFloat(weight) * count * 2 // multiply by 2 since plates go on both sides
  })
  
  return Math.round(total * 100) / 100
}

export function convertWeight(weight: number, fromUnit: 'lb' | 'kg', toUnit: 'lb' | 'kg'): number {
  if (fromUnit === toUnit) return weight
  
  if (fromUnit === 'lb' && toUnit === 'kg') {
    return Math.round((weight / 2.20462) * 100) / 100
  } else {
    return Math.round((weight * 2.20462) * 100) / 100
  }
}

// Undo functionality
export class UndoStack<T> {
  private stack: T[] = []
  private maxSize: number

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize
  }

  push(state: T): void {
    this.stack.push(state)
    if (this.stack.length > this.maxSize) {
      this.stack.shift()
    }
  }

  pop(): T | undefined {
    return this.stack.pop()
  }

  isEmpty(): boolean {
    return this.stack.length === 0
  }

  clear(): void {
    this.stack.length = 0
  }
}

// UI helpers
export function getPlateSizeClass(weight: number) {
  // Scale circle sizes by plate weight for visual emphasis
  if (weight >= 45 || weight >= 20) return 'w-16 h-16 text-base'
  if (weight >= 35 || weight >= 15) return 'w-14 h-14 text-sm'
  if (weight >= 25 || weight >= 10) return 'w-12 h-12 text-xs'
  if (weight >= 10 || weight >= 5) return 'w-10 h-10 text-[11px]'
  if (weight >= 5 || weight >= 2.5) return 'w-9 h-9 text-[10px]'
  return 'w-8 h-8 text-[10px]'
}

export function getPlateColorClass(weight: number, unit: 'lb' | 'kg') {
  if (unit === 'lb') {
    // Exact LB mapping using provided hex palette
    // 55 lb (if present)
    if (weight === 55) return 'bg-[#d62828] border-[#d62828] text-white' // red
    if (weight === 45) return 'bg-[#003f91] border-[#003f91] text-white' // blue
    if (weight === 35) return 'bg-[#f6aa1c] border-[#f6aa1c] text-black' // yellow
    if (weight === 25) return 'bg-[#2a9d8f] border-[#2a9d8f] text-white' // green
    if (weight === 15) return 'bg-[#f5f5f5] border-black text-black' // awaiting confirmation; using white for now
    if (weight === 10) return 'bg-[#f5f5f5] border-black text-black' // ~11 lb white
    if (weight === 5)  return 'bg-[#1f1f1f] border-[#1f1f1f] text-white' // black
    if (weight === 2.5) return 'bg-[#1f1f1f] border-[#1f1f1f] text-white' // black
    if (weight === 1) return 'bg-[#1f1f1f] border-[#1f1f1f] text-white' // default small black
    // default
    return 'bg-neutral-900 border-neutral-700 text-white'
  } else {
    // kg approximation
    if (weight === 25) return 'bg-[#d62828] border-[#d62828] text-white' // red
    if (weight === 20) return 'bg-[#003f91] border-[#003f91] text-white' // blue
    if (weight === 15) return 'bg-[#f6aa1c] border-[#f6aa1c] text-black' // yellow
    if (weight === 10) return 'bg-[#2a9d8f] border-[#2a9d8f] text-white' // green
    if (weight === 5)  return 'bg-[#f5f5f5] border-black text-black' // white
    if (weight === 2.5) return 'bg-[#1f1f1f] border-[#1f1f1f] text-white' // black
    // default small
    return 'bg-[#1f1f1f] border-[#1f1f1f] text-white'
  }
}

export function getPlateWidthClass(weight: number) {
  // Visual width by weight for the graphic (not buttons)
  if (weight >= 45 || weight >= 20) return 'w-10'
  if (weight >= 35 || weight >= 15) return 'w-8'
  if (weight >= 25 || weight >= 10) return 'w-7'
  if (weight >= 10 || weight >= 5) return 'w-5'
  if (weight >= 5 || weight >= 2.5) return 'w-4'
  return 'w-3'
}

export function getPlateHeightClass(weight: number) {
  // Height of a plate in the graphic, larger weights are taller
  if (weight >= 45 || weight >= 20) return 'h-24'
  if (weight >= 35 || weight >= 15) return 'h-20'
  if (weight >= 25 || weight >= 10) return 'h-16'
  if (weight >= 10 || weight >= 5) return 'h-14'
  if (weight >= 5 || weight >= 2.5) return 'h-12'
  return 'h-10'
}
