/**
 * Fixed-size rolling window of feature vectors, backed by one preallocated Float32Array.
 * Pushing never allocates. Lives in a ref, never in React state.
 */
export class FrameBuffer {
  constructor(windowSize, featureDim) {
    this.windowSize = windowSize
    this.featureDim = featureDim
    this.data = new Float32Array(windowSize * featureDim)
    this.presence = new Uint8Array(windowSize) // 1 if that frame contained a hand
    this.head = 0 // index the next frame will be written to (= oldest frame once full)
    this.size = 0
  }

  get isFull() {
    return this.size === this.windowSize
  }

  push(frame, hasHands) {
    this.data.set(frame, this.head * this.featureDim)
    this.presence[this.head] = hasHands ? 1 : 0
    this.head = (this.head + 1) % this.windowSize
    if (this.size < this.windowSize) this.size++
  }

  /** Share of frames in the window that contained at least one hand (0..1). */
  presenceRatio() {
    if (this.size === 0) return 0
    let sum = 0
    for (let i = 0; i < this.size; i++) sum += this.presence[i]
    return sum / this.size
  }

  /**
   * Copy the window out in chronological order (oldest first) as a NEW Float32Array of
   * length windowSize * featureDim. If not yet full, older slots are zero-padded.
   */
  snapshot() {
    const dim = this.featureDim
    const out = new Float32Array(this.windowSize * dim)
    const start = this.isFull ? this.head : 0
    const pad = this.windowSize - this.size
    for (let k = 0; k < this.size; k++) {
      const src = ((start + k) % this.windowSize) * dim
      out.set(this.data.subarray(src, src + dim), (pad + k) * dim)
    }
    return out
  }

  /**
   * Per-frame state in chronological order, for UI display:
   * 0 = empty slot, 1 = frame without hands, 2 = frame with hands.
   */
  timeline(out) {
    const pad = this.windowSize - this.size
    const start = this.isFull ? this.head : 0
    for (let k = 0; k < this.windowSize; k++) {
      out[k] = k < pad ? 0 : this.presence[(start + (k - pad)) % this.windowSize] ? 2 : 1
    }
    return out
  }

  clear() {
    this.data.fill(0)
    this.presence.fill(0)
    this.head = 0
    this.size = 0
  }
}
