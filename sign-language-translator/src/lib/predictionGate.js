/**
 * Turns a stream of per-window predictions into discrete, intentional words.
 *
 * update(label, confidence, now):
 *   `label` is a confident, non-idle label, or null when there is nothing to report
 *   (idle, low confidence, or no hands in view).
 *
 * A word is committed when:
 *   1. the same label wins `votesRequired` predictions in a row, AND
 *   2. we're not inside the cooldown that follows a commit, AND
 *   3. it's a different word than the last one, OR the signer paused (a null update was
 *      seen) since it was committed. That is how a deliberate repeat ("no, no") works,
 *      while a sign that is still lingering in the window doesn't fire twice.
 */
export function createPredictionGate({ votesRequired, cooldownMs, onCommit }) {
  let candidate = null
  let votes = 0
  let lastCommitted = null
  let lockedUntil = 0
  let released = true

  return {
    update(label, confidence, now) {
      if (label == null) {
        candidate = null
        votes = 0
        released = true
        return null
      }
      if (now < lockedUntil) return null

      if (label === candidate) {
        votes++
      } else {
        candidate = label
        votes = 1
      }

      if (votes >= votesRequired && (label !== lastCommitted || released)) {
        lastCommitted = label
        lockedUntil = now + cooldownMs
        released = false
        candidate = null
        votes = 0
        onCommit(label, confidence)
        return label
      }
      return null
    },
  }
}
