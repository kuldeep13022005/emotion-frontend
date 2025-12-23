export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-4">About</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p>
          Mood Classifier showcases emotion detection using a Flask backend and a Next.js frontend.
          Use <strong>Live</strong> for continuous webcam detection, or <strong>Upload</strong> for single images.
        </p>
        <ul>
          <li><strong>Backend URL:</strong> <code>{process.env.NEXT_PUBLIC_API_BASE_URL}</code></li>
          <li>Ensure both machines are on the same network (LAN/Wi‑Fi).</li>
          <li>If you see CORS errors, enable <code>flask-cors</code> on the backend.</li>
        </ul>
        <p>
          Health check endpoint (optional): <code>/health</code>
        </p>
      </div>
    </div>
  );
}
