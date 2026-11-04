import { useState } from 'react'

const BUTTON =
  'rounded-full bg-slate-800 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 border border-slate-700/60'
const ACTIVE_BUTTON =
  'rounded-full bg-sky-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-sky-500'

export default function TranslationPanel({
  mode,
  onModeChange,
  words,
  sentences,
  activeGlosses,
  countdown,
  isTranslating,
  onFinishSentence,
  onUndoLastSign,
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
          <h2 id="transcript-heading" className="text-xl font-bold text-slate-100">
            Translation
          </h2>
          {/* Mode Switcher */}
          <div className="flex rounded-full bg-slate-900 border border-slate-800 p-1">
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
              className={`${BUTTON} ${speech.enabled ? 'ring-2 ring-sky-400 text-sky-300' : ''}`}
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
        <div className="flex flex-col gap-2 rounded-xl bg-slate-900 p-3.5 border border-slate-700 text-xs text-slate-300 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Grammar Engine Settings</span>
            <span className="text-[11px] text-sky-400 font-medium">
              {apiKey ? 'Mode: Gemini AI' : 'Mode: Built-in Offline Rules'}
            </span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Leave blank to use the built-in fast offline grammar engine. Or paste a Gemini API key for advanced contextual translation.
          </p>
          <input
            type="password"
            placeholder="Optional Gemini API Key (e.g. AIzaSy...)"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="w-full rounded-lg bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 border border-slate-700 focus:border-sky-500 focus:outline-none"
          />
        </div>
      )}

      {/* Mode 1: Sentence Mode UI */}
      {mode === 'sentence' ? (
        <div className="flex flex-col gap-3">
          {/* Active in-progress sentence queue */}
          <div className="rounded-2xl border border-sky-800/50 bg-slate-900/90 p-4 shadow-lg">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sky-300">
                  Active Sentence Signs ({activeGlosses.length})
                </span>
                {countdown && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30 animate-pulse">
                    ⏱️ Auto-translate in {countdown}s
                  </span>
                )}
              </div>

              {activeGlosses.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onUndoLastSign}
                    disabled={isTranslating}
                    className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                    title="Undo last added sign (or press Backspace)"
                  >
                    ↶ Undo
                  </button>
                  <button
                    type="button"
                    onClick={onFinishSentence}
                    disabled={isTranslating}
                    className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1 font-semibold text-white hover:bg-sky-500 transition-colors shadow-sm"
                    title="Translate sentence now (or press Space)"
                  >
                    <span>⚡ Translate Now</span>
                  </button>
                </div>
              )}
            </div>

            {activeGlosses.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Perform signs one after another to compose a full sentence (e.g. <span className="text-sky-300 font-semibold font-mono">HELLO</span> + <span className="text-sky-300 font-semibold font-mono">FRIEND</span>). When done, pause for 3.5s or press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300 font-sans border border-slate-700">Space</kbd> to translate.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {activeGlosses.map((g, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-950/80 px-2.5 py-1 font-mono text-sm font-semibold text-sky-200 border border-sky-700/60 shadow-sm"
                  >
                    <span>{g}</span>
                  </span>
                ))}
                {isTranslating && (
                  <span className="inline-flex items-center text-xs font-medium text-sky-400 animate-pulse ml-2">
                    Synthesizing sentence...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Translated Sentence Log */}
          <div
            aria-live="polite"
            className="max-h-72 min-h-36 overflow-y-auto rounded-2xl bg-slate-900 p-4 flex flex-col gap-3 border border-slate-800 shadow-md"
          >
            {sentences.length === 0 ? (
              <p className="text-slate-500 text-sm italic">Translated sentences will appear here.</p>
            ) : (
              sentences.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex flex-col gap-1.5 shadow-sm"
                >
                  <p className="text-lg font-bold text-white tracking-wide">{s.text}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Signs:</span>
                    {s.glosses.map((g, i) => (
                      <span
                        key={i}
                        className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-sky-300 border border-slate-700/50"
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
        <div aria-live="polite" className="max-h-64 min-h-28 overflow-y-auto rounded-2xl bg-slate-900 p-5 border border-slate-800 shadow-md">
          {words.length === 0 ? (
            <p className="text-slate-500 italic">Signed words will appear here immediately as you sign.</p>
          ) : (
            <p className="text-2xl font-semibold leading-relaxed text-sky-300">
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
        <p className="text-sm text-amber-400">This browser can't speak text aloud. The transcript still works.</p>
      )}
    </section>
  )
}
