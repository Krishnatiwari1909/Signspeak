export function argmax(values) {
  let best = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i
  }
  return best
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
