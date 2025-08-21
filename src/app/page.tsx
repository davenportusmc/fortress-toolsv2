'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Calculator, Dumbbell } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-36 h-36 relative">
            {/* Place your logo at public/fortress-logo.png */}
            <Image src="/fortress-logo.png" alt="Fortress Athlete logo" fill priority sizes="144px" className="object-contain" />
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
        </div>
      </div>
    </div>
  )
}
