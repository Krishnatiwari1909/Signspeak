import { CONFIG } from '../config.js'
import { useStatsSnapshot } from '../hooks/useStatsSnapshot.js'
import { prettyLabel, topK } from '../lib/predictions.js'

function Row({ term, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-mist-dim">{term}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  )
}

const BACKENDS = { webgl: 'GPU (WebGL)', cpu: 'CPU' }

export default function PipelineDetails({ statsRef, modelInfo, threshold, onThresholdChange }) {
  const s = useStatsSnapshot(statsRef, 250)
  const guesses = s.probs && s.labels ? topK(s.probs, s.labels, 3) : []
  const percent = Math.round(threshold * 100)

  return (
    <details open className="group">
      <summary className="cursor-pointer select-none text-xl font-bold marker:text-mist-dim">
        Details
      </summary>

      <div className="mt-4 flex flex-col gap-6 text-sm">
        <dl className="flex flex-col gap-2">
          <Row term="Hands in view">{s.handsVisible}</Row>
          <Row term="Frame rate">{s.fps ? `${s.fps.toFixed(0)} fps` : 'n/a'}</Row>
          <Row term="Model run time">{s.inferenceMs ? `${s.inferenceMs.toFixed(0)} ms` : 'n/a'}</Row>
          <Row term="Model">
            {modelInfo.source === 'trained' ? 'Trained model' : 'Placeholder (random weights)'}
          </Row>
          <Row term="Runs on">{BACKENDS[modelInfo.backend] ?? modelInfo.backend ?? 'n/a'}</Row>
        </dl>

        <div>
          <h3 className="mb-2 font-semibold">Top guesses</h3>
          {guesses.length === 0 ? (
            <p className="text-mist-dim">Guesses appear once the motion window is full.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {guesses.map((g) => (
                <li key={g.label} className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-3">
                  <span className="truncate">
                    {g.label === CONFIG.idleLabel ? 'No sign' : prettyLabel(g.label)}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-dusk-800">
                    <span
                      className="block h-full rounded-full bg-caption"
                      style={{ width: `${Math.round(g.probability * 100)}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-mist-dim">
                    {Math.round(g.probability * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="threshold" className="mb-2 flex items-baseline justify-between font-semibold">
            <span>Confidence needed</span>
            <span className="tabular-nums text-mist-dim">{percent}%</span>
          </label>
          <input
            id="threshold"
            type="range"
            min="5"
            max="99"
            value={percent}
            onChange={(e) => onThresholdChange(Number(e.target.value) / 100)}
            className="w-full accent-caption"
          />
          <p className="mt-1 text-mist-dim">
            A guess only becomes a word when it is at least this confident and repeats a few times in a row.
          </p>
        </div>
      </div>
    </details>
  )
}
