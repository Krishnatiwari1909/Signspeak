const DOT = {
  ready: 'bg-emerald-400',
  loading: 'animate-pulse bg-amber-400',
  error: 'bg-rose-500',
}

function StatusChip({ label, status }) {
  return (
    <li className="flex items-center gap-2 rounded-full bg-slate-800/90 border border-slate-700/60 px-3 py-1 text-xs font-medium text-slate-300">
      <span className={`h-2 w-2 rounded-full ${DOT[status] ?? 'bg-slate-500'}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="sr-only">
        {status === 'ready' ? 'ready' : status === 'error' ? 'failed' : 'loading'}
      </span>
    </li>
  )
}

export function Header({
  cameraStatus,
  holisticStatus,
  signModelStatus,
  modelId,
  onSwitchModel,
  availableModels = {},
  signModelSource,
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-slate-800 pb-5">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-100">Sign Translator</h1>
          <span className="rounded-md bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-400 border border-sky-500/20">
            {availableModels[modelId]?.shortName ?? 'Active Model'}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          On-device isolated ASL sign & sentence recognition. 100% private, no video leaves your laptop.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Model Switcher */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-1">
          {Object.values(availableModels).map((m) => {
            const active = m.id === modelId
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSwitchModel(m.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title={m.description}
              >
                <span>{m.shortName}</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] ${
                    active ? 'bg-sky-700/60 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {m.id === 'gislr' ? '250w' : '100w'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Status Chips */}
        <ul className="flex flex-wrap gap-2 text-sm">
          <StatusChip label="Camera" status={cameraStatus} />
          <StatusChip label="Holistic" status={holisticStatus} />
          <StatusChip
            label={signModelSource ? `Model: ${signModelSource}` : 'Sign Model'}
            status={signModelStatus}
          />
        </ul>
      </div>
    </header>
  )
}
