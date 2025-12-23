"use client";
import EmotionDetector from "../components/EmotionDetector";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">Upload Image</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">Upload an image file or switch on the camera and capture a single frame for analysis.</p>
      <EmotionDetector title="Upload / Single Frame Detection" showFileControls={true} showLiveControls={false} />
    </div>
  );
}
