import { useEffect, useState } from 'react'

const snapshot = (stats) => ({ ...stats, timeline: stats.timeline.slice() })

/**
 * The render loop writes telemetry into a plain object (a ref) at ~30 Hz.
 * UI panels sample it a few times per second, so only those small panels re-render,
 * and the high-frequency data never passes through React state.
 */
export function useStatsSnapshot(statsRef, intervalMs) {
  const [snap, setSnap] = useState(() => snapshot(statsRef.current))

  useEffect(() => {
    const id = setInterval(() => setSnap(snapshot(statsRef.current)), intervalMs)
    return () => clearInterval(id)
  }, [statsRef, intervalMs])

  return snap
}
