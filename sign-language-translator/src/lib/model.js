import * as tf from '@tensorflow/tfjs'
import * as ort from 'onnxruntime-web'

// Configure ONNX Runtime Web: point WASM loader to /wasm/
if (typeof window !== 'undefined') {
  ort.env.wasm.wasmPaths = '/wasm/'
  // Single thread execution for universal browser compatibility (avoids SharedArrayBuffer COOP/COEP requirement)
  ort.env.wasm.numThreads = 1
}

export async function initBackend(modelConfig) {
  if (modelConfig.type === 'tfjs') {
    await tf.ready()
    return tf.getBackend() || 'tfjs'
  }
  return 'wasm-onnx'
}

export async function loadLabels(modelConfig) {
  const res = await fetch(modelConfig.labelsUrl)
  if (!res.ok) throw new Error(`Could not load ${modelConfig.labelsUrl} (HTTP ${res.status}).`)
  const labels = await res.json().catch(() => {
    throw new Error(`${modelConfig.labelsUrl} is not valid JSON.`)
  })
  if (!Array.isArray(labels) || labels.length < 2 || !labels.every((l) => typeof l === 'string')) {
    throw new Error('labels.json must be an array of at least two strings.')
  }
  return labels
}

export async function loadSignModel(modelConfig) {
  if (modelConfig.type === 'onnx') {
    try {
      const session = await ort.InferenceSession.create(modelConfig.modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })
      return {
        type: 'onnx',
        session,
        source: 'Google GISLR (ONNX)',
        dispose: () => {},
      }
    } catch (err) {
      throw new Error(`Failed to load ONNX model ${modelConfig.modelUrl}: ${err?.message}`)
    }
  } else {
    try {
      const model = await tf.loadLayersModel(modelConfig.modelUrl)
      return {
        type: 'tfjs',
        model,
        source: 'Conversational 100 (TFJS)',
        dispose: () => model.dispose(),
      }
    } catch (err) {
      throw new Error(`Failed to load TFJS model ${modelConfig.modelUrl}: ${err?.message}`)
    }
  }
}

export async function warmUp(modelMeta, modelConfig) {
  if (modelMeta.type === 'onnx') {
    const dummy = new Float32Array(modelConfig.windowSize * modelConfig.featureDim)
    dummy.fill(0.5)
    await predictSequence(modelMeta, dummy, modelConfig)
  } else {
    const inputTensor = tf.zeros([1, modelConfig.windowSize, modelConfig.numLandmarks, 3], 'float32')
    const out = modelMeta.model.predict(inputTensor)
    out.dataSync()
    inputTensor.dispose()
    out.dispose()
  }
}

/**
 * Computes softmax probabilities over raw logits.
 */
function softmax(logits) {
  let max = -Infinity
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i]
  }
  let sum = 0
  const probs = new Float32Array(logits.length)
  for (let i = 0; i < logits.length; i++) {
    const exp = Math.exp(logits[i] - max)
    probs[i] = exp
    sum += exp
  }
  for (let i = 0; i < probs.length; i++) {
    probs[i] /= sum
  }
  return probs
}

/**
 * Predicts the ASL sign for a temporal window of frames.
 * 
 * @param {Object} modelMeta Loaded model metadata (ONNX session or TFJS model).
 * @param {Float32Array} sequence Chronological flat array of feature frames.
 * @param {Object} modelConfig Model configuration object.
 * @returns {Promise<Float32Array>} Softmax probabilities across all classes.
 */
export async function predictSequence(modelMeta, sequence, modelConfig) {
  if (modelMeta.type === 'onnx') {
    const session = modelMeta.session
    const inputTensor = new ort.Tensor('float32', sequence, [modelConfig.windowSize, modelConfig.numLandmarks, 3])
    const feeds = { [session.inputNames[0]]: inputTensor }
    const results = await session.run(feeds)
    const logits = results[session.outputNames[0]].data
    return softmax(logits)
  } else {
    const inputTensor = tf.tensor(sequence, [1, modelConfig.windowSize, modelConfig.numLandmarks, 3], 'float32')
    const outputTensor = modelMeta.model.predict(inputTensor)
    try {
      return await outputTensor.data()
    } finally {
      inputTensor.dispose()
      outputTensor.dispose()
    }
  }
}
