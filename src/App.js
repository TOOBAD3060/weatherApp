import React, { useState, useEffect, useCallback, useRef } from 'react';
import { predict, loadModel } from './model';
import './App.css';

// ── Feature definitions ────────────────────────────────────────────────────
const FEATURES = [
  {
    key: 'temp',
    label: 'Temperature',
    unit: '°C',
    min: -10,
    max: 50,
    default: 22,
    icon: '🌡️',
    toComfort: (v) => Math.max(0, Math.min(1, 1 - Math.abs(v - 22) / 22)),
    description: 'Ideal around 22°C',
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    min: 0,
    max: 100,
    default: 45,
    icon: '💧',
    toComfort: (v) => Math.max(0, Math.min(1, 1 - v / 100)),
    description: 'Lower is more comfortable',
  },
  {
    key: 'wind',
    label: 'Wind Speed',
    unit: 'km/h',
    min: 0,
    max: 80,
    default: 10,
    icon: '🌬️',
    toComfort: (v) => Math.max(0, Math.min(1, 1 - v / 50)),
    description: 'Calm winds preferred',
  },
  {
    key: 'uv',
    label: 'UV Index',
    unit: '',
    min: 0,
    max: 11,
    default: 3,
    icon: '☀️',
    toComfort: (v) => Math.max(0, Math.min(1, 1 - v / 11)),
    description: 'Scale 0–11',
  },
  {
    key: 'rain',
    label: 'Clear Sky',
    unit: '',
    min: 0,
    max: 1,
    default: 1,
    step: 1,
    icon: '🌤️',
    toComfort: (v) => v,
    description: '1 = clear, 0 = raining',
  },
];

const PRESETS = [
  {
    name: 'Perfect Spring Day',
    emoji: '🌸',
    values: { temp: 22, humidity: 40, wind: 8, uv: 3, rain: 1 },
  },
  {
    name: 'Hot Humid Storm',
    emoji: '⛈️',
    values: { temp: 36, humidity: 92, wind: 45, uv: 2, rain: 0 },
  },
  {
    name: 'Overcast & Mild',
    emoji: '☁️',
    values: { temp: 18, humidity: 65, wind: 15, uv: 1, rain: 0 },
  },
  {
    name: 'Scorching Desert',
    emoji: '🏜️',
    values: { temp: 42, humidity: 10, wind: 5, uv: 11, rain: 1 },
  },
  {
    name: 'Crisp Winter Morning',
    emoji: '❄️',
    values: { temp: 2, humidity: 55, wind: 20, uv: 2, rain: 1 },
  },
  {
    name: 'Tropical Beach',
    emoji: '🏖️',
    values: { temp: 28, humidity: 72, wind: 18, uv: 8, rain: 1 },
  },
];

// ── Gauge component ────────────────────────────────────────────────────────
function Gauge({ score, animating }) {
  const angle = score * 180 - 90; // -90 to 90 degrees
  const comfortable = score >= 0.5;
  const intensity = comfortable ? score : 1 - score;

  const getColor = () => {
    if (score > 0.75) return '#4affc4';
    if (score > 0.5) return '#a8ff78';
    if (score > 0.35) return '#ffd166';
    return '#ff6b6b';
  };

  const arcPath = (pct, radius = 80) => {
    const startAngle = -Math.PI;
    const endAngle = startAngle + pct * Math.PI;
    const x1 = 100 + radius * Math.cos(startAngle);
    const y1 = 100 + radius * Math.sin(startAngle);
    const x2 = 100 + radius * Math.cos(endAngle);
    const y2 = 100 + radius * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className={`gauge-wrap ${animating ? 'gauge-pop' : ''}`}>
      <svg viewBox="0 0 200 110" className="gauge-svg">
        {/* Track */}
        <path d={arcPath(1)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round" />
        {/* Fill */}
        <path
          d={arcPath(score)}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          className="gauge-arc"
          style={{ filter: `drop-shadow(0 0 8px ${getColor()}88)` }}
        />
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const a = -Math.PI + t * Math.PI;
          const r1 = 90, r2 = 96;
          return (
            <line
              key={t}
              x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
              x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
              stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
            />
          );
        })}
        {/* Needle */}
        <g transform={`rotate(${angle}, 100, 100)`} className="needle-group">
          <line x1="100" y1="100" x2="100" y2="30" stroke={getColor()} strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill={getColor()} />
          <circle cx="100" cy="100" r="3" fill="#0a0f1e" />
        </g>
      </svg>

      <div className="gauge-labels">
        <span style={{ color: '#ff6b6b' }}>Uncomfortable</span>
        <span style={{ color: '#4affc4' }}>Comfortable</span>
      </div>

      <div className="gauge-score" style={{ color: getColor() }}>
        {(score * 100).toFixed(1)}
        <span className="gauge-pct">%</span>
      </div>

      <div className={`gauge-verdict ${comfortable ? 'verdict-good' : 'verdict-bad'}`}>
        <span className="verdict-icon">{comfortable ? '☀️' : '⛈️'}</span>
        <span>{comfortable ? 'COMFORTABLE' : 'UNCOMFORTABLE'}</span>
      </div>

      <div className="confidence-bar-wrap">
        <div className="confidence-label">Confidence</div>
        <div className="confidence-track">
          <div
            className="confidence-fill"
            style={{
              width: `${intensity * 100}%`,
              background: getColor(),
              boxShadow: `0 0 12px ${getColor()}66`,
            }}
          />
        </div>
        <div className="confidence-pct" style={{ color: getColor() }}>
          {(intensity * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

// ── Slider component ────────────────────────────────────────────────────────
function FeatureSlider({ feature, value, onChange }) {
  const comfort = feature.toComfort(value);
  const pct = (value - feature.min) / (feature.max - feature.min);

  const comfortColor = () => {
    if (comfort > 0.7) return '#4affc4';
    if (comfort > 0.4) return '#ffd166';
    return '#ff6b6b';
  };

  return (
    <div className="slider-row">
      <div className="slider-meta">
        <span className="slider-icon">{feature.icon}</span>
        <div className="slider-info">
          <div className="slider-label">{feature.label}</div>
          <div className="slider-desc">{feature.description}</div>
        </div>
        <div className="slider-value-wrap">
          <span className="slider-value">{feature.step === 1 ? (value === 1 ? 'Yes' : 'No') : value}</span>
          {feature.unit && <span className="slider-unit">{feature.unit}</span>}
        </div>
      </div>

      <div className="slider-track-wrap">
        <input
          type="range"
          min={feature.min}
          max={feature.max}
          step={feature.step || 1}
          value={value}
          onChange={(e) => onChange(feature.key, Number(e.target.value))}
          className="slider-input"
          style={{ '--fill-pct': `${pct * 100}%`, '--thumb-color': comfortColor() }}
        />
        <div className="comfort-pip" style={{ left: `${pct * 100}%`, background: comfortColor() }} />
      </div>

      <div className="comfort-mini-bar">
        <div
          className="comfort-mini-fill"
          style={{ width: `${comfort * 100}%`, background: comfortColor() }}
        />
        <span className="comfort-mini-label" style={{ color: comfortColor() }}>
          {(comfort * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(FEATURES.map((f) => [f.key, f.default]))
  );
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [history, setHistory] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const debounceRef = useRef(null);

  // Preload model on mount
  useEffect(() => {
    loadModel()
      .then(() => setModelReady(true))
      .catch(console.error);
  }, []);

  const runInference = useCallback(async (vals) => {
    if (!modelReady) return;
    setLoading(true);
    try {
      const input = FEATURES.map((f) => f.toComfort(vals[f.key]));
      const result = await predict(input);
      setScore(result);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);
      setHistory((h) => [
        { vals: { ...vals }, score: result, ts: new Date().toLocaleTimeString() },
        ...h.slice(0, 4),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [modelReady]);

  // Debounced auto-inference on slider change
  useEffect(() => {
    if (!modelReady) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runInference(values), 180);
    return () => clearTimeout(debounceRef.current);
  }, [values, modelReady, runInference]);

  const handleChange = (key, val) => {
    setValues((v) => ({ ...v, [key]: val }));
    setActivePreset(null);
  };

  const applyPreset = (preset) => {
    setValues(preset.values);
    setActivePreset(preset.name);
  };

  const computedInput = FEATURES.map((f) => f.toComfort(values[f.key]));

  return (
    <div className="app">
      {/* Background particles */}
      <div className="bg-grid" />
      <div className="bg-glow" />

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo-mark">WCI</div>
          <div className="header-text">
            <h1>Weather Comfort Index</h1>
            <p>Neural network inference · weather_comfort.onnx</p>
          </div>
          <div className={`model-status ${modelReady ? 'ready' : 'loading'}`}>
            <span className="status-dot" />
            {modelReady ? 'Model Ready' : 'Loading Model…'}
          </div>
        </div>
      </header>

      <main className="main">
        {/* Left panel — inputs */}
        <section className="panel panel-left">
          {/* Presets */}
          <div className="section-title">
            <span className="section-num">01</span> Quick Scenarios
          </div>
          <div className="presets-grid">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                className={`preset-btn ${activePreset === p.name ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                <span className="preset-emoji">{p.emoji}</span>
                <span className="preset-name">{p.name}</span>
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="section-title" style={{ marginTop: '2rem' }}>
            <span className="section-num">02</span> Adjust Conditions
          </div>
          <div className="sliders-list">
            {FEATURES.map((f) => (
              <FeatureSlider
                key={f.key}
                feature={f}
                value={values[f.key]}
                onChange={handleChange}
              />
            ))}
          </div>
        </section>

        {/* Right panel — output */}
        <section className="panel panel-right">
          {/* Gauge */}
          <div className="section-title">
            <span className="section-num">03</span> Comfort Analysis
          </div>

          <div className="gauge-container">
            {score !== null ? (
              <Gauge score={score} animating={animating} />
            ) : (
              <div className="gauge-placeholder">
                {modelReady ? 'Analysing…' : 'Loading ONNX model…'}
              </div>
            )}
          </div>

          {/* Feature breakdown */}
          {score !== null && (
            <div className="breakdown">
              <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                <span className="section-num">04</span> Feature Breakdown
              </div>
              <div className="breakdown-grid">
                {FEATURES.map((f, i) => {
                  const c = computedInput[i];
                  const col = c > 0.7 ? '#4affc4' : c > 0.4 ? '#ffd166' : '#ff6b6b';
                  return (
                    <div key={f.key} className="breakdown-item">
                      <div className="bi-header">
                        <span>{f.icon}</span>
                        <span className="bi-label">{f.label}</span>
                        <span className="bi-val" style={{ color: col }}>
                          {(c * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bi-track">
                        <div
                          className="bi-fill"
                          style={{ width: `${c * 100}%`, background: col, boxShadow: `0 0 8px ${col}55` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Raw tensor */}
          <div className="tensor-box">
            <div className="tensor-label">Input Tensor — float32 [1, 5]</div>
            <div className="tensor-values">
              [{computedInput.map((v) => v.toFixed(3)).join(', ')}]
            </div>
            {score !== null && (
              <>
                <div className="tensor-label" style={{ marginTop: '0.5rem' }}>
                  Output Tensor — float32 [1, 1]
                </div>
                <div className="tensor-values" style={{ color: '#4affc4' }}>
                  [{score.toFixed(6)}]
                </div>
              </>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="history-box">
              <div className="section-title" style={{ marginBottom: '0.5rem' }}>
                <span className="section-num">05</span> Recent Readings
              </div>
              {history.map((h, i) => {
                const comfortable = h.score >= 0.5;
                return (
                  <div key={i} className="history-row">
                    <span className="history-ts">{h.ts}</span>
                    <div className="history-bars">
                      {FEATURES.map((f) => {
                        const c = f.toComfort(h.vals[f.key]);
                        return (
                          <div
                            key={f.key}
                            className="history-pip"
                            style={{
                              background: c > 0.5 ? '#4affc4' : '#ff6b6b',
                              opacity: 0.5 + c * 0.5,
                            }}
                            title={`${f.label}: ${(c * 100).toFixed(0)}%`}
                          />
                        );
                      })}
                    </div>
                    <span
                      className="history-score"
                      style={{ color: comfortable ? '#4affc4' : '#ff6b6b' }}
                    >
                      {(h.score * 100).toFixed(1)}%
                    </span>
                    <span className="history-icon">{comfortable ? '☀️' : '⛈️'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>weather_comfort.onnx · ONNX Runtime Web · Inference runs entirely in your browser</span>
        <span className="footer-sep">·</span>
        <span>OpenGradient Model Hub</span>
      </footer>
    </div>
  );
}
