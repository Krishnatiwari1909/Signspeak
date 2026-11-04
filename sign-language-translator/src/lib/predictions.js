export function argmax(values) {
  let best = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i
  }
  return best
}

/**
 * Finds top-1 and top-2 probabilities and their difference (margin) in a single O(N) pass.
 * Useful for filtering ambiguous predictions when multiple classes have similar scores.
 */
export function top2Margin(values) {
  if (!values || values.length < 2) {
    return { best: 0, bestProb: values?.[0] ?? 0, second: 0, secondProb: 0, margin: values?.[0] ?? 0 }
  }
  let best = 0
  let second = 1
  if (values[1] > values[0]) {
    best = 1
    second = 0
  }
  for (let i = 2; i < values.length; i++) {
    const v = values[i]
    if (v > values[best]) {
      second = best
      best = i
    } else if (v > values[second]) {
      second = i
    }
  }
  return {
    best,
    bestProb: values[best],
    second,
    secondProb: values[second],
    margin: values[best] - values[second],
  }
}

export function topK(probs, labels, k = 3) {
  return Array.from(probs, (probability, i) => ({ label: labels[i], probability }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, k)
}

/** "THANK_YOU" -> "Thank you" */
export function prettyLabel(label) {
  if (!label) return ''
  const text = label.replaceAll('_', ' ').trim().toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
