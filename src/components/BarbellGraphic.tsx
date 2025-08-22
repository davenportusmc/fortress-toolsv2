"use client"

import React, { useMemo } from 'react'

type Props = {
  total: number
  unit: 'lb' | 'kg'
  order: number[] // each entry represents one PAIR of plates added
  showCollars?: boolean
}

// Map weight to a display color (approx IWF/IPF style) and size
function plateStyle(weight: number, unit: 'lb' | 'kg') {
  // Defaults
  let width = 30
  let height = 120
  let fill = '#111827'
  let stroke = '#64748b'

  if (unit === 'lb') {
    // Sizes roughly by weight tier; colors per user palette
    if (weight === 55) { width = 56; height = 200; fill = '#d62828'; stroke = '#b51f1f' } // red (optional)
    else if (weight === 45) { width = 52; height = 190; fill = '#003f91'; stroke = '#00337a' } // blue
    else if (weight === 35) { width = 44; height = 170; fill = '#f6aa1c'; stroke = '#d08e14' } // yellow
    else if (weight === 25) { width = 36; height = 150; fill = '#2a9d8f'; stroke = '#21867a' } // green
    else if (weight === 15) { width = 32; height = 140; fill = '#f5f5f5'; stroke = '#111111' } // white
    else if (weight === 10) { width = 28; height = 130; fill = '#f5f5f5'; stroke = '#111111' } // white (mapping uses 11 lb)
    else if (weight === 5)  { width = 24; height = 110; fill = '#1f1f1f'; stroke = '#9ca3af' } // black with lighter stroke for visibility
    else if (weight === 2.5) { width = 20; height = 100; fill = '#1f1f1f'; stroke = '#9ca3af' } // black
    else if (weight === 1) { width = 18; height = 96; fill = '#1f1f1f'; stroke = '#9ca3af' } // black
  } else {
    // KG mapping per user palette
    if (weight === 25) { width = 56; height = 200; fill = '#d62828'; stroke = '#b51f1f' } // red
    else if (weight === 20) { width = 52; height = 190; fill = '#003f91'; stroke = '#00337a' } // blue
    else if (weight === 15) { width = 44; height = 170; fill = '#f6aa1c'; stroke = '#d08e14' } // yellow
    else if (weight === 10) { width = 36; height = 150; fill = '#2a9d8f'; stroke = '#21867a' } // green
    else if (weight === 5)  { width = 28; height = 130; fill = '#f5f5f5'; stroke = '#111111' } // white
    else if (weight === 2.5) { width = 24; height = 110; fill = '#1f1f1f'; stroke = '#9ca3af' } // black
    else if (weight === 1.25) { width = 20; height = 100; fill = '#1f1f1f'; stroke = '#9ca3af' } // default small black
  }

  return { width, height, fill, stroke }
}

export default function BarbellGraphic({ total, unit, order, showCollars = false }: Props) {
  const plates = useMemo(() => order.slice(), [order])

  // Fixed canvas width (no horizontal scroll)
  const baseW = 1000
  const H = 260
  const cy = H / 2
  const W = baseW
  const cx = W / 2

  // Bar geometry
  const shaftY = cy
  const shaftH = 16

  // Sleeve and collar geometry
  const sleeveLen = 160
  const sleeveH = 32 // thicker than shaft
  const collarW = 5
  const collarH = 28
  const sleeveGapFromEdge = 36

  // Sleeve outer/inner edges
  const leftSleeveOuterX = 40 + sleeveGapFromEdge
  const leftSleeveInnerX = leftSleeveOuterX + sleeveLen
  const rightSleeveOuterX = W - 40 - sleeveGapFromEdge
  const rightSleeveInnerX = rightSleeveOuterX - sleeveLen

  // Dynamic collar positions: just OUTSIDE the outermost plate. If no plates, near sleeve tips.
  const defaultLeftOuter = 40 + sleeveGapFromEdge // equals leftSleeveOuterX
  const defaultRightOuter = W - 40 - sleeveGapFromEdge // equals rightSleeveOuterX

  // Plate layout: scale to fit within usable sleeve length per side
  const plateGap = 6
  const usableSleeve = sleeveLen - 20 // leave a bit of breathing room
  const naturalStackWidth = plates.reduce((sum, w) => sum + plateStyle(w, unit).width + plateGap, 0)
  const scale = naturalStackWidth > 0 ? Math.min(1, usableSleeve / naturalStackWidth) : 1

  // Compute plate rects (left and right mirrored)
  let leftCursor = (leftSleeveInnerX + collarW / 2 + 2) - plateGap * scale
  const leftRects = plates.map((w) => {
    const { width, height, fill, stroke } = plateStyle(w, unit)
    const scaledW = width * scale
    const x = leftCursor - scaledW
    leftCursor = x - plateGap * scale
    return { x, y: cy - height / 2, width: scaledW, height, fill, stroke }
  })

  let rightCursor = (rightSleeveInnerX - collarW / 2 - 2) + plateGap * scale
  const rightRects = plates.map((w) => {
    const { width, height, fill, stroke } = plateStyle(w, unit)
    const scaledW = width * scale
    const x = rightCursor
    rightCursor = x + scaledW + plateGap * scale
    return { x, y: cy - height / 2, width: scaledW, height, fill, stroke }
  })

  // compute max plate height for positioning the total label just above plates
  const maxPlateH = plates.length > 0 ? Math.max(...plates.map((w) => plateStyle(w, unit).height)) : 0

  // Determine outermost plate edges
  const leftOuterEdge = leftRects.length ? Math.min(...leftRects.map(r => r.x)) : defaultLeftOuter + 6
  const rightOuterEdge = rightRects.length ? Math.max(...rightRects.map(r => r.x + r.width)) : defaultRightOuter - 6
  const clipGap = 6 * scale
  const leftClipX = leftOuterEdge - clipGap
  const rightClipX = rightOuterEdge + clipGap

  return (
    <div className="w-full bg-slate-800 rounded-xl p-4">
      <div className="w-full overflow-x-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* subtle floor gradient */}
            <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1220" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#0b1220" stopOpacity="0.35" />
            </linearGradient>
            {/* metal gradients */}
            <linearGradient id="shaftGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#e5e7eb" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
            <linearGradient id="sleeveGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7788a1" />
              <stop offset="50%" stopColor="#9aa8b9" />
              <stop offset="100%" stopColor="#7788a1" />
            </linearGradient>
          </defs>

          {/* total label fixed just above the shaft, independent of plate height */}
          <text x={cx} y={shaftY - shaftH / 2 - 16} fill="#ffffff" fontSize="56" fontWeight={900} textAnchor="middle" stroke="#000" strokeWidth={4} strokeOpacity={0.45} style={{ paintOrder: 'stroke fill' }}>
            {total} {unit}
          </text>

          {/* subtle floor shadow */}
          <ellipse cx={cx} cy={H - 24} rx={W * 0.38} ry={12} fill="url(#floorGrad)" />

          {/* bar shaft runs only between sleeve inner edges */}
          <rect x={leftSleeveInnerX} y={shaftY - shaftH / 2} width={rightSleeveInnerX - leftSleeveInnerX} height={shaftH} rx={0} fill="url(#shaftGrad)" />

          {/* knurl bands removed per design */}

          {/* left sleeve */}
          <rect x={leftSleeveOuterX} y={cy - sleeveH / 2} width={sleeveLen} height={sleeveH} rx={2} fill="url(#sleeveGrad)" />

          {/* left collar outside plates */}
          {showCollars && (
            <g>
              <rect x={leftClipX - collarW / 2} y={cy - collarH / 2} width={collarW} height={collarH} fill="#64748b" />
              {/* spring clip left (approximation) */}
              <path d={`M ${leftClipX - 10} ${cy - 6} q -6 -12 6 -18 q 10 -4 14 6 q 4 10 -4 16`} fill="none" stroke="#d1d5db" strokeWidth={2}/>
              <circle cx={leftClipX + 8} cy={cy - 2} r={3} fill="#d1d5db" />
            </g>
          )}

          {/* right sleeve */}
          <rect x={rightSleeveInnerX} y={cy - sleeveH / 2} width={sleeveLen} height={sleeveH} rx={2} fill="url(#sleeveGrad)" />

          {/* right collar outside plates */}
          {showCollars && (
            <g>
              <rect x={rightClipX - collarW / 2} y={cy - collarH / 2} width={collarW} height={collarH} fill="#64748b" />
              {/* spring clip right (mirror) */}
              <path d={`M ${rightClipX + 10} ${cy - 6} q 6 -12 -6 -18 q -10 -4 -14 6 q -4 10 4 16`} fill="none" stroke="#d1d5db" strokeWidth={2}/>
              <circle cx={rightClipX - 8} cy={cy - 2} r={3} fill="#d1d5db" />
            </g>
          )}

          {/* left plates (from collar outward) */}
          {leftRects.map((r, i) => (
            <g key={`L-${i}`}> 
              {/* plate body */}
              <rect x={r.x} y={r.y} width={r.width} height={r.height} fill={r.fill} stroke={r.stroke} strokeWidth={2} rx={4} />
              {/* lighter front face */}
              <rect x={r.x + 3} y={r.y + 3} width={r.width - 6} height={r.height - 6} fill={r.fill} opacity={0.85} rx={3} />
              {/* highlight */}
              <rect x={r.x + r.width - 4} y={r.y + 8} width={2} height={r.height - 16} fill="#ffffff" opacity={0.18} />
            </g>
          ))}

          {/* right plates (from collar outward) */}
          {rightRects.map((r, i) => (
            <g key={`R-${i}`}>
              <rect x={r.x} y={r.y} width={r.width} height={r.height} fill={r.fill} stroke={r.stroke} strokeWidth={2} rx={4} />
              <rect x={r.x + 3} y={r.y + 3} width={r.width - 6} height={r.height - 6} fill={r.fill} opacity={0.85} rx={3} />
              <rect x={r.x + 2} y={r.y + 8} width={2} height={r.height - 16} fill="#ffffff" opacity={0.18} />
            </g>
          ))}
        </svg>
      </div>

      {/* footer note removed per request */}
    </div>
  )
}
