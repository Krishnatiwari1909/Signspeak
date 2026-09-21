import { CONFIG, FEATURE_DIM, WINDOW_SIZE } from '../config.js'

// TensorFlow.js is large, so it's loaded on demand (after the UI has painted) and kept here.
let tf = null

/** Load TensorFlow.js and pick a backend: WebGL if possible, CPU otherwise. */
export async function initBackend() {
  tf = await import('@tensorflow/tfjs')
  const webglOk = await tf.setBackend('webgl').catch(() => false)
  if (!webglOk) await tf.setBackend('cpu')
  await tf.ready()
  return tf.getBackend()
}

export async function loadLabels() {
  const res = await fetch(CONFIG.labelsUrl)
  if (!res.ok) throw new Error(`Could not load ${CONFIG.labelsUrl} (HTTP ${res.status}).`)
  const labels = await res.json().catch(() => {
    throw new Error(`${CONFIG.labelsUrl} is not valid JSON.`)
  })
  if (!Array.isArray(labels) || labels.length < 2 || !labels.every((l) => typeof l === 'string')) {
    throw new Error('labels.json must be an array of at least two strings.')
  }
  return labels
}

/**
 * PLACEHOLDER sequential model with random weights. It exists so the whole pipeline
 * (buffer -> tensor -> inference -> smoothing -> speech) runs end to end. Its output is
 * meaningless until you replace it with a trained model (see README).
 *
 * Input:  [batch, WINDOW_SIZE, FEATURE_DIM]
 * Output: [batch, numClasses] softmax probabilities
 */
export function buildPlaceholderModel(numClasses) {
  const model = tf.sequential({ name: 'placeholder_sign_model' })
  model.add(
    tf.layers.conv1d({
      inputShape: [WINDOW_SIZE, FEATURE_DIM],
      filters: 64,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu',
    })
  )
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }))
  model.add(tf.layers.lstm({ units: 64 }))
  model.add(tf.layers.dropout({ rate: 0.3 }))
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }))
  return model
}

function sameShape(actual, expected) {
  return actual.length === expected.length && expected.every((v, i) => actual[i] === v)
}

function validateModel(model, labels) {
  const input = model.inputs[0].shape
  const output = model.outputs[0].shape
  if (!sameShape(input, [null, WINDOW_SIZE, FEATURE_DIM])) {
    throw new Error(
      `The model expects input shape [${input}], but this app feeds [null,${WINDOW_SIZE},${FEATURE_DIM}]. ` +
        'Re-export the model with that input shape or change WINDOW_SIZE in src/config.js.'
    )
  }
  if (output[output.length - 1] !== labels.length) {
    throw new Error(
      `The model outputs ${output[output.length - 1]} classes but labels.json lists ${labels.length}.`
    )
  }
}

/**
 * Use a trained model from /models/asl/model.json if one exists; otherwise fall back to the
 * placeholder. A trained model that is present but incompatible is an error, not a fallback.
 */
export async function loadSignModel(labels) {
  let model
  try {
    model = await tf.loadLayersModel(CONFIG.modelUrl)
  } catch (err) {
    console.info(`[sign-model] No trained model at ${CONFIG.modelUrl}; using the placeholder.`, err?.message)
    return { model: buildPlaceholderModel(labels.length), source: 'placeholder' }
  }
  validateModel(model, labels)
  return { model, source: 'trained' }
}

/** Compile shaders / allocate buffers up front so the first real prediction isn't slow. */
export async function warmUp(model) {
  const out = tf.tidy(() => model.predict(tf.zeros([1, WINDOW_SIZE, FEATURE_DIM])))
  await out.data()
  out.dispose()
}

/**
 * Run the model on one window (Float32Array, length WINDOW_SIZE * FEATURE_DIM).
 * `await output.data()` reads the result back asynchronously, so the render loop keeps
 * running while the GPU works.
 */
export async function predictSequence(model, sequence) {
  const output = tf.tidy(() => model.predict(tf.tensor3d(sequence, [1, WINDOW_SIZE, FEATURE_DIM])))
  try {
    return await output.data()
  } finally {
    output.dispose()
  }
}
