export type Machine = 'Rower' | 'Bike Erg' | 'Echo Bike' | 'Ski Erg' | 'Run'
export type Unit = 'meters' | 'calories'

export const MACHINES: Machine[] = ['Rower', 'Bike Erg', 'Echo Bike', 'Ski Erg', 'Run']

// Heuristics (meters per calorie)
export const metersPerCal: Record<Machine, number> = {
  'Rower': 12,
  'Ski Erg': 12,
  'Run': 16,
  'Bike Erg': 24,
  'Echo Bike': 17.1428571429, // chosen so 10 baseline cals ~= 7 Echo cals
}

// Meter ratios relative to Row meters
export const toRowMeterRatio: Record<Machine, number> = {
  'Rower': 1,
  'Ski Erg': 1,
  'Run': 1,
  'Bike Erg': 0.5, // Bike meters are ~2x Row meters for similar work
  'Echo Bike': 1,  // no native meters; treat given meters as row-equivalent
}

export const fromRowMeterRatio: Record<Machine, number> = {
  'Rower': 1,
  'Ski Erg': 1,
  'Run': 1,
  'Bike Erg': 2,
  'Echo Bike': 1,
}

export function formatNumber(n: number) {
  if (!isFinite(n)) return '-'
  if (n >= 1000) return Math.round(n).toString()
  if (n >= 100) return n.toFixed(0)
  if (n >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

export function computeRowEquivalentMeters(value: number, unit: Unit, machine: Machine): number {
  if (!isFinite(value) || value <= 0) return 0
  if (unit === 'meters') {
    return value * toRowMeterRatio[machine]
  }
  // calories -> meters for the selected machine
  return value * metersPerCal[machine]
}

export function computeRows(value: number, unit: Unit, machine: Machine) {
  const rowEquivalentMeters = computeRowEquivalentMeters(value, unit, machine)
  const baselineCalories = rowEquivalentMeters / metersPerCal['Rower'] // 12 m/cal

  return MACHINES.map((m) => {
    const meters = rowEquivalentMeters * fromRowMeterRatio[m]
    const perMachineCalories = meters / metersPerCal[m]
    const calories = m === 'Echo Bike' ? baselineCalories * 0.7 : perMachineCalories
    return { machine: m, meters, calories }
  })
}
