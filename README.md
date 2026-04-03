# Weather Comfort Index

An AI-powered weather comfort analyser built with React and ONNX Runtime Web. The neural network model (`weather_comfort.onnx`) runs **entirely in the browser** — no server, no API calls.

## Live Demo

Deploy instantly on Vercel — see below.

## Features

- 🧠 **Client-side ONNX inference** via `onnxruntime-web` — zero backend
- 🎛️ **5 interactive sliders** — temperature, humidity, wind, UV, rain
- ⚡ **6 quick scenario presets** — perfect spring day, tropical beach, scorching desert…
- 📊 **Real-time gauge** with confidence bar
- 🔬 **Feature breakdown** showing per-variable comfort contribution
- 📋 **Raw tensor display** — input [1,5] and output [1,1]
- 🕓 **Inference history** — last 5 readings

## Deploy to Vercel

```bash
# 1. Clone / download this folder
# 2. Push to GitHub

# 3. On Vercel:
#    Import repository → Framework: Create React App → Deploy
```

Or use the Vercel CLI:

```bash
npm i -g vercel
cd weather-app
vercel
```

## Local Development

```bash
npm install
npm start
# → http://localhost:3000
```

## Model Details

| Property     | Value                        |
|--------------|------------------------------|
| File         | `weather_comfort.onnx`       |
| Input        | `features` — float32 [1, 5] |
| Output       | `comfort_score` — float32 [1, 1] |
| Architecture | MatMul → Add → Sigmoid       |
| Threshold    | ≥ 0.5 → COMFORTABLE ☀️       |

### Input feature encoding

| Feature | Raw input | Comfort encoding |
|---------|-----------|-----------------|
| Temperature | °C | `1 − |temp − 22| / 22` |
| Humidity | % | `1 − humidity / 100` |
| Wind | km/h | `1 − wind / 50` |
| UV Index | 0–11 | `1 − uv / 11` |
| Clear sky | 0 or 1 | passed directly |

## Tech Stack

- React 18
- onnxruntime-web 1.17
- Syne + DM Mono (Google Fonts)
- Pure CSS animations
- Vercel (deployment)
