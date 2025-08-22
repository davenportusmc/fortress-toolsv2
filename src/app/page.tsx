'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calculator, Dumbbell, ArrowLeftRight, Quote } from 'lucide-react'

export default function HomePage() {
  const [quotes, setQuotes] = useState<string[]>([])
  const [showQuote, setShowQuote] = useState(false)
  const [currentQuote, setCurrentQuote] = useState<string>('')

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 -mt-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-36 h-36 relative">
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
            <Button className="w-full fortress-button h-16 text-lg">
              <Calculator className="w-6 h-6 mr-3" />
              Percent Calculator
            </Button>
          </Link>
          
          <Link href="/weight-calculator" className="block">
            <Button className="w-full fortress-button h-16 text-lg">
              <Dumbbell className="w-6 h-6 mr-3" />
              Barbell Calculator
            </Button>
          </Link>

          <Link href="/conversion-calculator" className="block">
            <Button className="w-full fortress-button h-16 text-lg">
              <ArrowLeftRight className="w-6 h-6 mr-3" />
              Conversion Calculator
            </Button>
          </Link>

          <Button onClick={openMotivate} className="w-full fortress-button h-16 text-lg">
            <Quote className="w-6 h-6 mr-3" />
            Motivate Me
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
    </div>
  )
}
