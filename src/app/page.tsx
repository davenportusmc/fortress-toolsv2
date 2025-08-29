'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calculator, Dumbbell, ArrowLeftRight, Quote } from 'lucide-react'

export default function HomePage() {
  const [quotes, setQuotes] = useState<string[]>([])
  const [showQuote, setShowQuote] = useState(false)
  const [currentQuote, setCurrentQuote] = useState<string>('')
  const [party, setParty] = useState(false)
  const partyCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const partyRAF = useRef<number | null>(null)
  const stopPartyTimeout = useRef<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/MotivationalQuotes.txt')
        const text = await res.text()
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
        setQuotes(lines)
      } catch (e) {
        // ignore
      }
    }
    load()
  }, [])

  // Buttons now animate only while party is true; no hover handlers needed

  const getRandomQuote = () => {
    if (!quotes.length) return 'Keep going — you\'ve got this.'
    const idx = Math.floor(Math.random() * quotes.length)
    return quotes[idx]
  }

  const openMotivate = () => {
    setCurrentQuote(getRandomQuote())
    setShowQuote(true)
  }

  const anotherQuote = () => setCurrentQuote(getRandomQuote())
  const closeQuote = () => setShowQuote(false)

  const startParty = () => {
    if (party) return
    setParty(true)
    // Auto-stop after 10s
    if (stopPartyTimeout.current) window.clearTimeout(stopPartyTimeout.current)
    stopPartyTimeout.current = window.setTimeout(() => {
      setParty(false)
      if (stopPartyTimeout.current) {
        window.clearTimeout(stopPartyTimeout.current)
        stopPartyTimeout.current = null
      }
    }, 10000)
  }

  // Confetti + Fireworks animation on a fixed canvas overlay
  useEffect(() => {
    const canvas = partyCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    type P = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; rotate?: number; vr?: number; type: 'confetti' | 'spark' | 'item'; sprite?: 'barbell' | 'kettlebell' | 'plate' }
    const particles: P[] = []
    let lastSpawn = 0

    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a78bfa', '#f472b6']

    const spawnConfettiBurst = () => {
      const cx = rand(0, canvas.width)
      // Confetti near center band for mobile visibility
      const cy = rand(canvas.height * 0.35, canvas.height * 0.65)
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: cx,
          y: cy,
          vx: rand(-2.5, 2.5),
          vy: rand(0.5, 3.5),
          life: 0,
          maxLife: rand(60, 120),
          size: rand(6, 12),
          color: colors[Math.floor(rand(0, colors.length))],
          rotate: rand(0, Math.PI * 2),
          vr: rand(-0.2, 0.2),
          type: 'confetti',
        })
      }
    }

    const spawnFirework = () => {
      const cx = rand(canvas.width * 0.15, canvas.width * 0.85)
      const cy = rand(canvas.height * 0.35, canvas.height * 0.65)
      const count = 80
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const speed = rand(1.5, 3.5)
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: rand(40, 90),
          size: rand(2, 4),
          color: colors[Math.floor(rand(0, colors.length))],
          type: 'spark',
        })
      }
    }

    const spawnItems = () => {
      // Randomly choose side and sprite
      const fromLeft = Math.random() < 0.5
      const y = rand(canvas.height * 0.4, canvas.height * 0.6)
      const x = fromLeft ? -60 : canvas.width + 60
      const speed = rand(2, 4) * (fromLeft ? 1 : -1)
      const sprite: P['sprite'] = Math.random() < 0.5 ? 'barbell' : (Math.random() < 0.5 ? 'kettlebell' : 'plate')
      const size = sprite === 'barbell' ? rand(90, 130) : sprite === 'kettlebell' ? rand(44, 64) : rand(36, 52)
      particles.push({
        x,
        y,
        vx: speed,
        vy: rand(-0.5, 0.5),
        life: 0,
        maxLife: rand(140, 200),
        size,
        color: '#d1d5db',
        rotate: rand(-0.2, 0.2),
        vr: rand(-0.01, 0.01),
        type: 'item',
        sprite,
      })
    }

    const draw = (t: number) => {
      if (!party) {
        // Cleanup and stop drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (partyRAF.current) cancelAnimationFrame(partyRAF.current)
        partyRAF.current = null
        return
      }

      // Spawn every ~250ms alternating bursts
      if (t - lastSpawn > 250) {
        lastSpawn = t
        spawnConfettiBurst()
        if (Math.random() < 0.9) spawnFirework()
        if (Math.random() < 0.7) spawnItems()
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Subtle dark overlay for pop
      ctx.fillStyle = 'rgba(0,0,0,0.10)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const g = 0.05
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        // physics
        p.vy += p.type === 'confetti' ? g : g * 0.5
        p.x += p.vx
        p.y += p.vy
        p.life++

        // render
        if (p.type === 'confetti') {
          p.rotate! += p.vr!
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotate!)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
          ctx.restore()
        } else if (p.type === 'spark') {
          const alpha = 1 - p.life / p.maxLife
          ctx.fillStyle = `${p.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'item') {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotate || 0)
          // Draw barbells/kettlebells/plates with style closer to calculator
          if (p.sprite === 'barbell') {
            const barLen = p.size
            // bar (darker steel)
            ctx.fillStyle = '#6b7280'
            ctx.fillRect(-barLen / 2, -3, barLen, 6)
            // inner sleeves
            ctx.fillStyle = '#9ca3af'
            ctx.fillRect(-barLen / 2 - 18, -5, 12, 10)
            ctx.fillRect(barLen / 2 + 6, -5, 12, 10)
            // colored plates (pair)
            const plateColors = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e']
            const widths = [10, 8, 6, 5]
            let offsetL = -barLen / 2 - 30
            let offsetR = barLen / 2 + 18
            for (let i = 0; i < plateColors.length; i++) {
              ctx.fillStyle = plateColors[i]
              // left
              ctx.fillRect(offsetL - widths[i], -12, widths[i], 24)
              // right
              ctx.fillRect(offsetR, -12, widths[i], 24)
              offsetL -= widths[i] + 2
              offsetR += widths[i] + 2
            }
          } else if (p.sprite === 'kettlebell') {
            // bell body
            ctx.fillStyle = '#374151'
            ctx.beginPath()
            ctx.arc(0, 8, p.size / 2, 0, Math.PI * 2)
            ctx.fill()
            // flat base shadow
            ctx.fillStyle = '#111827'
            ctx.fillRect(-p.size * 0.3, p.size * 0.8, p.size * 0.6, 2)
            // handle
            ctx.strokeStyle = '#9ca3af'
            ctx.lineWidth = Math.max(4, p.size * 0.12)
            ctx.beginPath()
            ctx.arc(0, -p.size * 0.05, p.size * 0.42, Math.PI * 0.15, Math.PI * 0.85)
            ctx.stroke()
          } else {
            // bumper plate ring with hub
            const plateColor = ['#ef4444','#3b82f6','#f59e0b','#22c55e','#6b7280'][Math.floor(rand(0,5))]
            ctx.fillStyle = plateColor
            ctx.beginPath()
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
            ctx.fill()
            // inner rim
            ctx.fillStyle = 'rgba(0,0,0,0.2)'
            ctx.beginPath()
            ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2)
            ctx.fill()
            // hub
            ctx.fillStyle = '#d1d5db'
            ctx.beginPath()
            ctx.arc(0, 0, p.size * 0.12, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }

        // remove if dead or offscreen
        if (p.life > p.maxLife || p.y > canvas.height + 80 || p.x < -120 || p.x > canvas.width + 120) {
          particles.splice(i, 1)
        }
      }

      partyRAF.current = requestAnimationFrame(draw)
    }

    if (partyRAF.current) cancelAnimationFrame(partyRAF.current)
    if (party) partyRAF.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (partyRAF.current) cancelAnimationFrame(partyRAF.current)
      partyRAF.current = null
    }
  }, [party])

  // Clear timeout on unmount or when turning party off manually
  useEffect(() => {
    return () => {
      if (stopPartyTimeout.current) {
        window.clearTimeout(stopPartyTimeout.current)
        stopPartyTimeout.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 -mt-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div
            className={`mx-auto w-36 h-36 relative ${party ? 'animate-spin' : ''}`}
            style={party ? { animationDuration: '3s' } : undefined}
          >
            {/* Place your logo at public/ff.png */}
            <Image src="/ff.png" alt="Fortress Athlete logo" fill priority sizes="144px" className="object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Fortress Fitness</h1>
            <p className="text-slate-300 text-lg">Calculators</p>
          </div>
        </div>

        {/* Main Buttons */}
        <div className="space-y-4">
          <Link href="/percent-calculator" className="block">
            <Button
              className={`w-full fortress-button h-16 text-lg ${party ? 'party-shake party-color' : ''}`}
            >
              <Calculator className="w-6 h-6 mr-3" />
              Percent Calculator
            </Button>
          </Link>
          
          <Link href="/weight-calculator" className="block">
            <Button
              className={`w-full fortress-button h-16 text-lg ${party ? 'party-run party-color' : ''}`}
            >
              <Dumbbell className="w-6 h-6 mr-3" />
              Barbell Calculator
            </Button>
          </Link>

          <Link href="/conversion-calculator" className="block">
            <Button
              className={`w-full fortress-button h-16 text-lg ${party ? 'party-spin party-color' : ''}`}
            >
              <ArrowLeftRight className="w-6 h-6 mr-3" />
              Conversion Calculator
            </Button>
          </Link>

          {/* WOD Timer Hub temporarily hidden */}

          {/* EMOM standalone page removed */}

          <Button
            onClick={openMotivate}
            className={`w-full fortress-button h-16 text-lg ${party ? 'party-tilt party-color' : ''}`}
          >
            <Quote className="w-6 h-6 mr-3" />
            Chalk Talk
          </Button>

          <Button
            onClick={startParty}
            className={`w-full fortress-button h-16 text-lg ${party ? 'party-pulse party-color' : ''}`}
          >
            🎉 Party Time!
          </Button>
        </div>
      </div>

      {/* Motivational Quote Modal */}
      {showQuote && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closeQuote} />
          <div className="relative z-10 mx-auto max-w-md p-5 mt-24 md:mt-40">
            <div className="rounded-xl border border-slate-700 bg-slate-800/90 backdrop-blur p-5 shadow-2xl">
              <div className="text-slate-200 text-lg text-center leading-relaxed">
                {currentQuote}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <Button onClick={anotherQuote} className="px-4 h-10 fortress-button">Another</Button>
                <Button onClick={closeQuote} className="px-4 h-10 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600">Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Party overlay canvas */}
      <canvas
        ref={partyCanvasRef}
        className={`fixed inset-0 ${party ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 pointer-events-none z-30`}
      />
      <style jsx global>{`
        @keyframes btn-shake-kf {
          0%,100%{ transform: translateX(0) }
          20%{ transform: translateX(-6px) }
          40%{ transform: translateX(6px) }
          60%{ transform: translateX(-4px) }
          80%{ transform: translateX(4px) }
        }
        .btn-shake { animation: btn-shake-kf 0.6s ease-in-out; }

        @keyframes btn-spin-kf {
          from{ transform: rotate(0deg) }
          to{ transform: rotate(360deg) }
        }
        .btn-spin { animation: btn-spin-kf 0.8s linear; }

        @keyframes btn-run-kf {
          0%{ transform: translate(0,0) }
          25%{ transform: translate(12px,-6px) }
          50%{ transform: translate(0,-10px) }
          75%{ transform: translate(-12px,-6px) }
          100%{ transform: translate(0,0) }
        }
        .btn-run { animation: btn-run-kf 1.2s ease-in-out; }

        @keyframes btn-tilt-kf {
          0%,100%{ transform: rotate(0deg) }
          30%{ transform: rotate(-6deg) }
          60%{ transform: rotate(6deg) }
        }
        .btn-tilt { animation: btn-tilt-kf 0.7s ease-in-out; }

        @keyframes btn-pulse-kf {
          0%,100%{ transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0) }
          50%{ transform: scale(1.04); box-shadow: 0 0 24px 4px rgba(255,255,255,0.12) }
        }
        .btn-pulse-glow { animation: btn-pulse-kf 1s ease-in-out; }
        
        /* Party-time looping variants */
        .party-shake { animation: btn-shake-kf 0.6s ease-in-out infinite; }
        .party-run { animation: btn-run-kf 1.2s ease-in-out infinite; }
        .party-spin { animation: btn-spin-kf 1.2s linear infinite; }
        .party-tilt { animation: btn-tilt-kf 0.8s ease-in-out infinite; }
        .party-pulse { animation: btn-pulse-kf 1s ease-in-out infinite; }

        /* Color cycling / flashing while partying */
        @keyframes party-hue-kf {
          from { filter: hue-rotate(0deg) }
          to { filter: hue-rotate(360deg) }
        }
        @keyframes party-flash-kf {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0) }
          100% { box-shadow: 0 0 24px 6px rgba(255,255,255,0.2) }
        }
        .party-color {
          animation: party-hue-kf 1.5s linear infinite, party-flash-kf 0.9s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  )
}
