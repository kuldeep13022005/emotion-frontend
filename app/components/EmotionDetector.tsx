"use client";
import React, { useState, useRef, useCallback } from "react";

interface EmotionResult {
  emotion: string;
  confidence?: number;
  [key: string]: any;
}
interface TimedEmotionResult extends EmotionResult { ts: number }
interface BackendSuccessPayload {
  success: true;
  results: Array<{
    emotion: string;
    confidence?: number;
    face_location?: { x: number; y: number; width: number; height: number };
  }>;
}
interface BackendErrorPayload { success: false; error?: string }

const MAX_FILE_SIZE_MB = 5;
const MIN_LIVE_GAP_MS = 1000; // 🔹 CHANGED: hard throttle to max 1 req/sec

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type EmotionDetectorProps = {
  title?: string;
  showFileControls?: boolean;
  showLiveControls?: boolean;
  defaultUseCamera?: boolean;
  autoStartLive?: boolean;
  onStream?: (stream: MediaStream | null) => void;
};

export default function EmotionDetector({
  title = "Detection",
  showFileControls = true,
  showLiveControls = true,
  defaultUseCamera = false,
  autoStartLive = false,
  onStream,
}: EmotionDetectorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<BackendSuccessPayload | BackendErrorPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(defaultUseCamera);
  const [showDebug, setShowDebug] = useState(false);
  const [base64Length, setBase64Length] = useState<number | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [intervalMs, setIntervalMs] = useState(1200); // ui interval; backend still hard-throttled
  const [inFlight, setInFlight] = useState(false);
  const [history, setHistory] = useState<TimedEmotionResult[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef(0); // 🔹 CHANGED: remember last live request time
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setError(null);
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      onStream?.(stream);
    } catch {
      setError("Unable to access camera. Please allow permission or use file upload.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setUseCamera(false);
    onStream?.(null);
  };

  // 🔹 CHANGED: captureFrame can be used in "live" mode without constantly updating selectedFile
  const captureFrame = useCallback((forLive: boolean = false) => {
    if (!videoRef.current) return null;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      // camera not ready yet
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    // show preview for user
    setPreview(dataUrl);

    if (!forLive) {
      // for manual mode, we also maintain selectedFile
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
        });
    }

    return dataUrl;
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const submit = async () => {
    if (!selectedFile) {
      setError("Please select or capture an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const dataUrl = await fileToBase64(selectedFile);
      setBase64Length(dataUrl.length);
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"}/detect-emotion`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl })
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        // ignore parse error
      }
      if (!response.ok) {
        const serverError =
          (payload && typeof payload === "object" && "error" in payload)
            ? (payload as { error?: string }).error
            : undefined;
        throw new Error(serverError ? `Error ${response.status}: ${serverError}` : `Server responded ${response.status}`);
      }
      setResult(payload as BackendSuccessPayload | BackendErrorPayload);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHANGED: Live detection loop – harder throttling and lighter per-frame work
  const sendFrame = useCallback(async () => {
    if (!videoRef.current) return;
    if (inFlight) return;

    const now = Date.now();
    if (now - lastSentRef.current < MIN_LIVE_GAP_MS) {
      // too soon since last request – skip this tick
      return;
    }

    const frameDataUrl = captureFrame(true);
    if (!frameDataUrl) return;

    lastSentRef.current = now;
    setInFlight(true);
    setError(null);

    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"}/detect-emotion`;

      // it's very unlikely we have an in-flight request now because of inFlight guard,
      // so no need to abort previous one every time

      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frameDataUrl })
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const serverError =
          (payload && typeof payload === "object" && "error" in payload)
            ? (payload as BackendErrorPayload).error
            : undefined;
        setError(serverError ? `Live error ${response.status}: ${serverError}` : `Live error ${response.status}`);
        return;
      }

      const resultObj = payload as BackendSuccessPayload | BackendErrorPayload | null;
      setResult(resultObj);

      const successPayload = resultObj as BackendSuccessPayload;
      const first =
        successPayload &&
        successPayload.success === true &&
        Array.isArray(successPayload.results) &&
        successPayload.results.length > 0
          ? successPayload.results[0]
          : null;

      if (first) {
        const entry: TimedEmotionResult = {
          emotion: first.emotion,
          confidence: first.confidence,
          ts: Date.now(),
        };
        setHistory(h => [entry, ...h].slice(0, 25));
      }
    } catch (e: unknown) {
      if (typeof e === "object" && e && "name" in e && (e as { name?: string }).name === "AbortError") {
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInFlight(false);
    }
  }, [captureFrame, inFlight]);

  const startLive = async () => {
    setError(null);
    if (!useCamera) {
      await startCamera();
    }
    setLiveMode(true);
  };

  const stopLive = () => {
    setLiveMode(false);
    abortRef.current?.abort();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Manage interval
  React.useEffect(() => {
    if (liveMode) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        void sendFrame();
      }, intervalMs);
      // optionally send one initial frame – safe because of throttling
      void sendFrame();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveMode, intervalMs, sendFrame]);

  // Auto-start camera/live on mount if requested
  React.useEffect(() => {
    const run = async () => {
      if (defaultUseCamera && !useCamera) {
        await startCamera();
      }
      if (autoStartLive) {
        setLiveMode(true);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
      onStream?.(null);
    };
  }, [onStream]);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 p-6 rounded-xl bg-white/80 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow backdrop-blur">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Upload an image or use your webcam to detect emotion via the Flask backend.
      </p>

      <div className="flex flex-col gap-3">
        {showFileControls && (
          <>
            <label className="block text-sm font-medium">Choose Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
            />
          </>
        )}
        <div className="flex gap-2 flex-wrap">
          {!useCamera && (
            <button
              onClick={startCamera}
              className="px-3 py-2 text-sm rounded bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              Use Camera
            </button>
          )}
          {useCamera && (
            <>
              {showFileControls && (
                <button
                  onClick={() => captureFrame(false)}
                  className="px-3 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Capture Frame
                </button>
              )}
              <button
                onClick={stopCamera}
                className="px-3 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-500"
              >
                Stop Camera
              </button>
            </>
          )}
          {showFileControls && (
            <button
              onClick={submit}
              disabled={loading}
              className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
            >
              {loading ? "Detecting..." : "Detect Emotion"}
            </button>
          )}
          <button
            onClick={() => setShowDebug(d => !d)}
            className="px-3 py-2 text-sm rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600"
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </button>
          {showLiveControls && !liveMode && (
            <button
              onClick={startLive}
              disabled={!useCamera}
              className="px-3 py-2 text-sm rounded bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40"
            >
              Start Live
            </button>
          )}
          {showLiveControls && liveMode && (
            <button
              onClick={stopLive}
              className="px-3 py-2 text-sm rounded bg-orange-600 text-white hover:bg-orange-500"
            >
              Stop Live
            </button>
          )}
        </div>

        {showLiveControls && (
          <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-600 dark:text-zinc-400 mt-2">
            <label className="flex items-center gap-1">
              Interval:
              <select
                value={intervalMs}
                onChange={e => setIntervalMs(Number(e.target.value))}
                className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded px-1 py-0.5 text-xs"
              >
                {/* You can keep these, but backend is additionally hard-throttled by MIN_LIVE_GAP_MS */}
                <option value={800}>0.8s</option>
                <option value={1200}>1.2s</option>
                <option value={1600}>1.6s</option>
                <option value={2000}>2.0s</option>
                <option value={2500}>2.5s</option>
              </select>
            </label>
            <span>
              Status: {liveMode ? (inFlight ? "capturing…" : "idle") : "stopped"}
            </span>
          </div>
        )}
      </div>

      {useCamera && (
        <div className="relative w-full aspect-video bg-black overflow-hidden rounded block lg:hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="emotion-video-feed w-full h-full object-cover"
          />
        </div>
      )}

      {preview && !liveMode && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Preview</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="preview"
            className="rounded border border-zinc-200 dark:border-zinc-700 max-h-72 object-contain"
          />
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {showDebug && (
        <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 flex flex-col gap-1">
          <span className="font-medium">Debug Info</span>
          <span>
            File:{" "}
            {selectedFile
              ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
              : "none"}
          </span>
          <span>
            Base64 length:{" "}
            {base64Length ?? "n/a"}{" "}
          </span>
          <span>
            Endpoint:{" "}
            {process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"}/detect-emotion
          </span>
          <span>Camera active: {useCamera ? "yes" : "no"}</span>
        </div>
      )}

      {result && (
        <div className="card">
          <ResultPanel data={result} />
        </div>
      )}

      {history.length > 0 && (
        <div className="p-4 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
          <h3 className="font-medium mb-2">Recent Emotions (latest first)</h3>
          <ul className="space-y-1 max-h-40 overflow-auto">
            {history.map((h: TimedEmotionResult, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span>{new Date(h.ts).toLocaleTimeString()} – {h.emotion}</span>
                {h.confidence !== undefined && (
                  <span className="text-zinc-500">
                    {h.confidence.toFixed(1)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        Make sure the Flask backend has CORS enabled, e.g. using <code>flask-cors</code>:
        <pre className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded">
          from flask_cors import CORS{"\n"}CORS(app)
        </pre>
      </div>
    </div>
  );
}

// --- Presentational sub-component for results ---
const EMOJI_MAP: Record<string, string> = {
  angry: "😠",
  fear: "😨",
  happy: "😄",
  neutral: "😐",
  sad: "😢",
  surprise: "😲",
};

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function ResultPanel({ data }: { data: BackendSuccessPayload | BackendErrorPayload }) {
  if ((data as BackendErrorPayload).success === false) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-red-700 dark:text-red-300">
        <div className="font-medium mb-1">Error</div>
        <div className="text-sm">{(data as BackendErrorPayload).error || "Unknown server error"}</div>
      </div>
    );
  }

  const results = (data as BackendSuccessPayload).results || [];
  const primary = results.length > 0 ? results[0] : null;

  if (!primary) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm">
        No face detected. Try moving closer to the camera or improving lighting.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
        <div className="flex items-center gap-4">
          <div className="text-4xl" aria-hidden>
            {EMOJI_MAP[primary.emotion] || "🙂"}
          </div>
          <div>
            <div className="text-lg font-semibold">
              {capitalize(primary.emotion)}
              {typeof primary.confidence === "number" && (
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  {primary.confidence.toFixed(1)}%
                </span>
              )}
            </div>
            {typeof primary.confidence === "number" && (
              <div className="mt-2 h-2 w-56 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div
                  className="h-full bg-purple-600"
                  style={{
                    width: `${Math.max(0, Math.min(100, primary.confidence))}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {results.length > 1 && (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="text-sm font-medium mb-3">Other faces</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.slice(1).map((r, idx) => (
              <div key={idx} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>
                    {EMOJI_MAP[r.emotion] || "🙂"}
                  </span>
                  <div className="text-sm font-medium">{capitalize(r.emotion)}</div>
                  {typeof r.confidence === "number" && (
                    <div className="ml-auto text-xs text-zinc-500">
                      {r.confidence.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}