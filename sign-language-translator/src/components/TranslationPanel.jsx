const BUTTON =
  'rounded-full bg-dusk-800 px-4 py-1.5 text-sm font-medium text-mist transition-colors hover:bg-dusk-700 disabled:opacity-40 disabled:hover:bg-dusk-800'

export default function TranslationPanel({ words, speech, onClear }) {
  return (
    <section aria-labelledby="transcript-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="transcript-heading" className="text-xl font-bold">
          Transcript
        </h2>
        <div className="flex gap-2">
          {speech.supported && (
            <button
              type="button"
              onClick={speech.toggle}
              aria-pressed={speech.enabled}
              className={`${BUTTON} ${speech.enabled ? 'ring-2 ring-caption' : ''}`}
            >
              {speech.enabled ? 'Turn off voice' : 'Turn on voice'}
            </button>
          )}
          <button type="button" onClick={onClear} disabled={words.length === 0} className={BUTTON}>
            Clear transcript
          </button>
        </div>
      </div>

      <div aria-live="polite" className="max-h-64 min-h-28 overflow-y-auto rounded-2xl bg-dusk-900 p-5">
        {words.length === 0 ? (
          <p className="text-mist-dim">Signed words will appear here.</p>
        ) : (
          <p className="text-2xl font-semibold leading-relaxed text-caption">
            {words.map((w) => (
              <span key={w.id} className="mr-3 inline-block">
                {w.text}
              </span>
            ))}
          </p>
        )}
      </div>

      {!speech.supported && (
        <p className="text-sm text-warn">This browser can't speak text aloud. The transcript still works.</p>
      )}
    </section>
  )
}
