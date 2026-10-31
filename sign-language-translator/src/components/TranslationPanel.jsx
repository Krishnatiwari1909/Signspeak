import { useState } from 'react'

const BUTTON =
  'rounded-full bg-dusk-800 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-mist transition-colors hover:bg-dusk-700 disabled:opacity-40 disabled:hover:bg-dusk-800'
const ACTIVE_BUTTON =
  'rounded-full bg-cyan-600 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-cyan-500'

export default function TranslationPanel({
  mode,
  onModeChange,
  words,
  sentences,
  activeGlosses,
  onRemoveGloss,
  onRemoveLastGloss,
  isTranslating,
  onFinishSentence,
  apiKey,
  onApiKeyChange,
  speech,
  onClear,
}) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <section aria-labelledby="transcript-heading" className="flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="transcript-heading" className="text-xl font-bold">
            Translation
          </h2>
          {/* Mode Switcher */}
          <div className="flex rounded-full bg-dusk-900 p-1">
            <button
              type="button"
              onClick={() => onModeChange('sentence')}
              className={mode === 'sentence' ? ACTIVE_BUTTON : BUTTON}
            >
              Sentence Mode
            </button>
            <button
              type="button"
              onClick={() => onModeChange('live')}
              className={mode === 'live' ? ACTIVE_BUTTON : BUTTON}
            >
              Live Words
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {speech.supported && (
            <button
              type="button"
              onClick={speech.toggle}
              aria-pressed={speech.enabled}
              className={`${BUTTON} ${speech.enabled ? 'ring-2 ring-caption' : ''}`}
            >
              {speech.enabled ? 'Voice: On' : 'Voice: Off'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={BUTTON}
            title="Configure Grammar AI"
          >
            ⚙️ AI
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={words.length === 0 && sentences.length === 0 && activeGlosses.length === 0}
            className={BUTTON}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Optional AI Settings Bar */}
      {showSettings && (
        <div className="flex flex-col gap-2 rounded-xl bg-dusk-900/90 p-3.5 border border-dusk-700 text-xs text-mist">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Grammar Engine Settings</span>
            <span className="text-[11px] text-cyan-400">
              {apiKey ? 'Mode: Gemini AI' : 'Mode: Built-in Offline Rules'}
            </span>
          </div>
          <p className="text-mist-dim text-[11px]">
            Leave blank to use the built-in fast offline grammar engine. Or paste a Gemini API key for advanced contextual translation.
          </p>
          <input
            type="password"
            placeholder="Optional Gemini API Key (e.g. AIzaSy...)"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="w-full rounded-lg bg-dusk-950 px-3 py-1.5 text-xs text-white placeholder-dusk-500 border border-dusk-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      )}

      {/* Mode 1: Sentence Mode UI */}
      {mode === 'sentence' ? (
        <div className="flex flex-col gap-3">
          {/* Active in-progress sentence queue */}
          <div className="rounded-2xl border border-cyan-800/40 bg-dusk-900/90 p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-cyan-300">
                Active Signs Queue ({activeGlosses.length})
              </span>
              {activeGlosses.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onRemoveLastGloss}
                    className="rounded-lg bg-dusk-800 px-2.5 py-1 text-xs font-medium text-mist hover:text-white hover:bg-dusk-700 transition-colors"
                    title="Undo last sign (or press Backspace)"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={onFinishSentence}
                    disabled={isTranslating}
                    className="rounded-lg bg-cyan-700 px-3 py-1 font-semibold text-white hover:bg-cyan-600 transition-colors"
                  >
                    {isTranslating ? 'Translating...' : 'Translate Now (Space)'}
                  </button>
                </div>
              )}
            </div>

            {activeGlosses.length === 0 ? (
              <p className="text-sm text-mist-dim italic">
                Sign 1 or more words. When you pause or rest your hands, the grammar engine will synthesize the full English sentence.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeGlosses.map((g, idx) => (
                  <span
                    key={idx}
                    className="group inline-flex items-center gap-1.5 rounded-lg bg-cyan-950 px-2.5 py-1 font-mono text-sm font-semibold text-cyan-200 border border-cyan-700/50"
                  >
                    <span>{g}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveGloss?.(idx)}
                      className="text-cyan-400/60 hover:text-red-400 transition-colors text-xs ml-0.5"
                      title="Remove this sign"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {isTranslating && (
                  <span className="inline-flex items-center text-xs text-cyan-400 animate-pulse">
                    Synthesizing grammar...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Translated Sentence Log */}
          <div
            aria-live="polite"
            className="max-h-72 min-h-36 overflow-y-auto rounded-2xl bg-dusk-900 p-4 flex flex-col gap-3"
          >
            {sentences.length === 0 ? (
              <p className="text-mist-dim text-sm">Translated sentences will appear here.</p>
            ) : (
              sentences.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-dusk-700 bg-dusk-950/70 p-3.5 flex flex-col gap-1.5 shadow-sm"
                >
                  <p className="text-lg font-bold text-white tracking-wide">{s.text}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-mist-dim">
                    <span className="text-[11px] uppercase tracking-wider text-dusk-400">Signs:</span>
                    {s.glosses.map((g, i) => (
                      <span
                        key={i}
                        className="rounded bg-dusk-800 px-1.5 py-0.5 font-mono text-[11px] text-mist"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Mode 2: Live Words Mode UI */
        <div aria-live="polite" className="max-h-64 min-h-28 overflow-y-auto rounded-2xl bg-dusk-900 p-5">
          {words.length === 0 ? (
            <p className="text-mist-dim">Signed words will appear here immediately as you sign.</p>
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
      )}

      {!speech.supported && (
        <p className="text-sm text-warn">This browser can't speak text aloud. The transcript still works.</p>
      )}
    </section>
  )
}
