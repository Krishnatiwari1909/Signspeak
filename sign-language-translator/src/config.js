// Central ML and application configuration. Times are in milliseconds.
const BASE_URL = import.meta.env?.BASE_URL ?? '/'

// --- Conversational Model Tensor Constants (used in unit tests and standard baseline) ---
export const NUM_LANDMARKS = 135
export const COORDINATES_PER_LANDMARK = 3 // (x, y, z)
export const FEATURE_DIM = NUM_LANDMARKS * COORDINATES_PER_LANDMARK // 405 floats per frame
export const WINDOW_SIZE = 30 // Frames in temporal window (~1 s at 30 fps)

export const AVAILABLE_MODELS = {
  gislr: {
    id: 'gislr',
    name: 'Google 250 Words (GISLR 1st Place)',
    shortName: 'Google 250 Signs',
    description: '250 ASL signs from Google Kaggle competition with 1D-CNN + Transformer architecture.',
    type: 'onnx',
    numLandmarks: 543,
    featureDim: 543 * 3, // 1629 floats per frame
    windowSize: 30, // 30 frames (~1 sec)
    modelUrl: `${BASE_URL}models/gislr/model.onnx`,
    labelsUrl: `${BASE_URL}models/gislr/labels.json`,
    idleLabel: null,
    minConfidence: 0.40, // Decisive threshold for 250 classes (uniform chance is 0.4%)
    minMargin: 0.06,     // Required margin between top-1 and top-2 candidate
    minHandPresence: 0.35, // 35% of frames have hand visible
    votesRequired: 2,
    cooldownMs: 800,
    inferenceStride: 3,
  },
  conversational: {
    id: 'conversational',
    name: 'Top 100 Conversational (Custom Bi-GRU)',
    shortName: 'Conversational 100',
    description: '100 high-utility daily conversational signs + _idle class, ultra-lightweight 817 KB.',
    type: 'tfjs',
    numLandmarks: 135,
    featureDim: 135 * 3, // 405 floats per frame
    windowSize: 30,
    modelUrl: `${BASE_URL}models/asl/model.json?v=100`,
    labelsUrl: `${BASE_URL}models/asl/labels.json?v=100`,
    idleLabel: '_idle',
    minConfidence: 0.45,
    minMargin: 0.08,
    minHandPresence: 0.35,
    votesRequired: 2,
    cooldownMs: 700,
    inferenceStride: 3,
  },
}

export const DEFAULT_MODEL_ID = 'gislr'

export const CONFIG = {
  sampleIntervalMs: 33, // Target ~30Hz sampling
  autoTranslateDelayMs: 3500, // 3.5 seconds pause before auto-translating full sentence
  ...AVAILABLE_MODELS[DEFAULT_MODEL_ID],
}
