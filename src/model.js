/**
 * weather_comfort.onnx — embedded as base64 so the app works
 * on Vercel with zero file-serving configuration.
 *
 * Model: MatMul(features, W) + b → Sigmoid → comfort_score
 * Input:  "features"       float32 [1, 5]
 * Output: "comfort_score"  float32 [1, 1]
 */

import * as ort from 'onnxruntime-web';

// ── Embedded model (285 bytes) ────────────────────────────────────────────
const MODEL_B64 =
  'CAdCBAoAEAsSACgBOo4CEgFHCiQKCGZlYXR1cmVzCgFXEgZtbV9vdXQaA21tMCIGTWF0' +
  'TXVsOgAKIAoGbW1fb3V0CgFCEgdhZGRfb3V0GgNhZDAiA0FkZDoACigKB2FkZF9vdXQS' +
  'DWNvbWZvcnRfc2NvcmUaA3NnMCIHU2lnbW9pZDoAKh8IBQgBEAFCAVdKFGZm5j8AAMA/' +
  'ZmamP5qZmT8AAABAKg8IAQgBEAFCAUJKBAAAkMBaGgoIZmVhdHVyZXMSDgoMCAESCAoC' +
  'CAEKAggFWhMKAVcSDgoMCAESCAoCCAUKAggBWhMKAUISDgoMCAESCAoCCAEKAggBYh8KDW' +
  'NvbWZvcnRfc2NvcmUSDgoMCAESCAoCCAEKAggB';

// ── Singleton session ─────────────────────────────────────────────────────
let _session = null;

function b64ToUint8Array(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function loadModel() {
  if (_session) return _session;
  ort.env.wasm.numThreads = 1;
  // Load from embedded base64 — no network request needed
  const modelBuffer = b64ToUint8Array(MODEL_B64).buffer;
  _session = await ort.InferenceSession.create(modelBuffer);
  return _session;
}

/**
 * Run inference.
 * @param {number[]} values - [temp_comfort, humidity_comfort, wind_comfort, uv_comfort, no_rain]
 * @returns {Promise<number>} comfort_score ∈ [0, 1]
 */
export async function predict(values) {
  const session = await loadModel();
  const tensor = new ort.Tensor('float32', Float32Array.from(values), [1, 5]);
  const feeds = { features: tensor };
  const results = await session.run(feeds);
  const output = results['comfort_score'];
  return output.data[0];
}
