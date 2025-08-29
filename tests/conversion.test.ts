import assert from 'assert'
import { computeRowEquivalentMeters, computeRows, metersPerCal, type Unit, type Machine } from '../src/lib/conversion'

function approxEqual(a: number, b: number, tol = 1e-2) {
  return Math.abs(a - b) <= tol
}

// Self-execute when run directly
if (require.main === module) {
  try {
    runConversionTests()
    console.log('conversion.test.ts: All tests passed')
    process.exit(0)
  } catch (err) {
    console.error('conversion.test.ts: Test failure:', err)
    process.exit(1)
  }
}

function find(machine: Machine, rows: { machine: Machine; meters: number; calories: number }[]) {
  const r = rows.find((x) => x.machine === machine)
  if (!r) throw new Error(`Missing machine row: ${machine}`)
  return r
}

export function runConversionTests() {
  // 1. Input: 10 calories on Rower
  {
    const v = 10
    const unit: Unit = 'calories'
    const machine: Machine = 'Rower'
    const rowEq = computeRowEquivalentMeters(v, unit, machine)
    const rows = computeRows(rowEq, 'meters', 'Rower')

    assert(approxEqual(find('Rower', rows).calories, 10))
    assert(approxEqual(find('Ski Erg', rows).calories, 10))
    assert(approxEqual(find('Bike Erg', rows).calories, 10))
    assert(approxEqual(find('Echo Bike', rows).calories, 7))
    assert(approxEqual(find('Run', rows).calories, 7.5))
  }

  // 2. Input: 7 calories on Echo
  {
    const v = 7
    const unit: Unit = 'calories'
    const machine: Machine = 'Echo Bike'
    const rowEq = computeRowEquivalentMeters(v, unit, machine)
    const rows = computeRows(rowEq, 'meters', 'Rower')

    assert(approxEqual(find('Rower', rows).calories, 10))
    assert(approxEqual(find('Ski Erg', rows).calories, 10))
    assert(approxEqual(find('Bike Erg', rows).calories, 10))
    assert(approxEqual(find('Echo Bike', rows).calories, 7))
    assert(approxEqual(find('Run', rows).calories, 7.5))
  }

  // 3. Input: 1000 meters on Rower
  {
    const v = 1000
    const unit: Unit = 'meters'
    const machine: Machine = 'Rower'
    const rowEq = computeRowEquivalentMeters(v, unit, machine)
    const rows = computeRows(rowEq, 'meters', 'Rower')

    assert(approxEqual(find('Rower', rows).calories, 83.3333, 1e-2))
    assert(approxEqual(find('Ski Erg', rows).calories, 83.3333, 1e-2))
    assert(approxEqual(find('Bike Erg', rows).calories, 83.3333, 1e-2))
    assert(approxEqual(find('Echo Bike', rows).calories, 58.3333, 1e-2))
    assert(approxEqual(find('Run', rows).calories, 62.5, 1e-2))
  }

  // 4. Input: 2000 meters on BikeErg
  {
    const v = 2000
    const unit: Unit = 'meters'
    const machine: Machine = 'Bike Erg'
    const rowEq = computeRowEquivalentMeters(v, unit, machine)
    const rows = computeRows(rowEq, 'meters', 'Rower')

    assert(approxEqual(find('Rower', rows).calories, 83.3333, 1e-2))
    assert(approxEqual(find('Ski Erg', rows).calories, 83.3333, 1e-2))
    assert(approxEqual(find('Bike Erg', rows).calories, 83.3333, 1e-2))
    assert(approxEqual(find('Echo Bike', rows).calories, 58.3333, 1e-2))
    assert(approxEqual(find('Run', rows).calories, 62.5, 1e-2))
  }

  // 5. Input: meters equal to 10 calories on any baseline machine (Row/Ski/BikeErg)
  for (const m of ['Rower', 'Ski Erg', 'Bike Erg'] as Machine[]) {
    const v = metersPerCal[m] * 10 // Row/Ski=120m, BikeErg=240m
    const unit: Unit = 'meters'
    const rowEq = computeRowEquivalentMeters(v, unit, m)
    const rows = computeRows(rowEq, 'meters', 'Rower')

    assert(approxEqual(find('Rower', rows).calories, 10))
    assert(approxEqual(find('Ski Erg', rows).calories, 10))
    assert(approxEqual(find('Bike Erg', rows).calories, 10))
    assert(approxEqual(find('Echo Bike', rows).calories, 7))
    assert(approxEqual(find('Run', rows).calories, 7.5))
  }

  // 6. Input: zero
  for (const unit of ['meters', 'calories'] as Unit[]) {
    for (const m of ['Rower', 'Ski Erg', 'Bike Erg', 'Echo Bike', 'Run'] as Machine[]) {
      const rowEq = computeRowEquivalentMeters(0, unit, m)
      const rows = computeRows(rowEq, 'meters', 'Rower')
      for (const r of rows) {
        assert(approxEqual(r.meters, 0))
        assert(approxEqual(r.calories, 0))
      }
    }
  }

  // Symmetry check: meters <-> calories baseline (excluding Echo adjustment)
  {
    const cals = 10
    const rowEqFromCals = computeRowEquivalentMeters(cals, 'calories', 'Rower') // 120
    const meters = 120
    const rowEqFromMeters = computeRowEquivalentMeters(meters, 'meters', 'Rower')
    assert(approxEqual(rowEqFromCals, rowEqFromMeters))
  }
}
