"use client"
import React, { useRef, useState, useEffect } from "react"
import EmotionDetector from "@/app/components/EmotionDetector"

export default function LivePage() {
  // 1. We create a reference to the video element so React can control it safely
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // 2. We use State to hold the camera stream. This ensures React "remembers" it.
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)

  // 3. This Effect runs automatically whenever 'currentStream' changes.
  // It connects the stream to the video player.
  useEffect(() => {
    if (videoRef.current && currentStream) {
      videoRef.current.srcObject = currentStream
    }
  }, [currentStream])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Live Detection
            </h1>
            <p className="text-sm text-muted-foreground">Real-time facial emotion analysis from your webcam feed</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Controls & Results */}
          <div className="flex flex-col gap-6">
            <EmotionDetector
              title="Live Detection"
              showFileControls={false}
              showLiveControls={true}
              defaultUseCamera={true}
              autoStartLive={false} // Note: You must click "Start" in the UI
              onStream={(stream) => {
                // When the detector gives us a stream, we save it to our State
                console.log("Stream received in LivePage:", stream)
                setCurrentStream(stream)
              }}
            />
          </div>

          {/* Right: Webcam Feed */}
          <div className="flex flex-col gap-4">
            <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card shadow-xl">
              <div className="absolute top-4 left-4 z-20">
                <div className="inline-block px-4 py-2 rounded-lg bg-primary/90 backdrop-blur-sm">
                  <span className="text-xs font-semibold text-primary-foreground">Live Feed</span>
                </div>
              </div>
              
              {/* VIDEO PLAYER */}
              <video
                ref={videoRef} // Connected to our ref above
                id="live-feed-video"
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover bg-foreground/10"
                style={{ minHeight: "380px" }}
              />
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <p className="text-xs text-muted-foreground">
                Position your face in the center of the frame for best emotion detection results. Ensure adequate
                lighting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}