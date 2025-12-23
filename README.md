This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Mood Classifier Frontend

This app lets you upload or capture an image and sends it to a Flask backend for emotion (mood) detection.

### New UI (multi-page)

- Home: Overview and quick links
- Live: Webcam-based continuous detection (Start/Stop, adjustable interval)
- Upload: Single-image or captured-frame analysis
- About: Backend info and tips

### Configure the backend URL

Set the Flask server base URL (same network) in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.36:5000
```

The frontend will POST to `${NEXT_PUBLIC_API_BASE_URL}/detect-emotion` with JSON body:

```json
{ "image": "<base64ImageString>" }
```

Make sure your Flask backend is reachable from the device running this frontend (both on the same Wi‑Fi/LAN) and it enables CORS.

Example Flask CORS setup:

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow cross-origin requests from the frontend
```

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Open `http://localhost:3000` and choose Live or Upload. The page auto-updates as you edit the code (see `app/components/EmotionDetector.tsx`).

### Live mode performance

- Default interval is 1.2s (configurable to 0.5–2.0s)
- For faster updates, consider reducing JPEG quality or adding client-side downscaling
- For very low latency, consider moving to a WebSocket endpoint

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
