import { WINDOW_SIZE } from '../config.js'
import { useStatsSnapshot } from '../hooks/useStatsSnapshot.js'

const CELL = {
  0: 'bg-dusk-800/60', // slot not filled yet
  1: 'bg-dusk-700', // frame captured, no hand in view
  2: 'bg-hand', // frame captured with a hand
}

/**
 * Shows the rolling window the model reads: one bar per frame, oldest on the left.
 * Blue bars had a hand in view. It's the temporal buffer made visible.
 */
export default function WindowStrip({ statsRef }) {
  const s = useStatsSnapshot(statsRef, 100)
  const filled = s.timeline.filter((v) => v > 0).length
  const withHands = s.timeline.filter((v) => v === 2).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <h2 className="font-semibold">Motion window</h2>
        <p className="text-mist-dim tabular-nums">
          {filled}/{WINDOW_SIZE} frames, {withHands} with hands
        </p>
      </div>
      <div className="flex h-8 gap-[3px]" aria-hidden="true">
        {Array.from(s.timeline, (state, i) => (
          <div key={i} className={`flex-1 rounded-sm ${CELL[state]}`} />
        ))}
      </div>
      <p className="text-sm text-mist-dim">
        {filled < WINDOW_SIZE
          ? 'Filling up. The model starts reading once the window is full.'
          : s.handsVisible === 0
            ? 'Show your hands to the camera to start signing.'
            : 'Each bar is one frame, oldest on the left. The model reads the whole window.'}
      </p>
    </div>
  )
}
