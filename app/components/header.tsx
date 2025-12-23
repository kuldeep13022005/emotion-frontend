"use client"

import Link from "next/link"
import { Brain } from "lucide-react"

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-sm bg-background/95">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Brain className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">Mood Classifier</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/live" className="text-sm hover:text-primary transition-colors">
              Live Detection
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
