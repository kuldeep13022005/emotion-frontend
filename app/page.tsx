"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, Video, Upload, Zap, BarChart3 } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-32">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Realtime Emotion Insight</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Mood Classifier
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Real-time and image-based emotion detection using your local backend. Detect moods instantly with your
            webcam or analyze still images with precision.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/live">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Video className="w-5 h-5" />
                Start Live Detection
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                <Upload className="w-5 h-5" />
                Upload Image
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <Card className="p-6 border-2 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Detection</h3>
            <p className="text-sm text-muted-foreground">
              Stream real-time emotion detection from your webcam with instant visual feedback and emotion history.
            </p>
          </Card>

          <Card className="p-6 border-2 hover:border-secondary/50 transition-all hover:shadow-lg hover:shadow-secondary/10">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Image Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Upload photos or capture frames to get detailed emotion analysis and confidence scores.
            </p>
          </Card>

          <Card className="p-6 border-2 hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/10">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track emotion patterns over time with detailed visualization and historical data.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-6 py-16 border-t">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to detect emotions?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Choose between live webcam detection for real-time analysis or upload an image for instant emotion
            detection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/live">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-secondary">
                <Video className="w-5 h-5" />
                Live Mode
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
