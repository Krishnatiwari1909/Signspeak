const DOT = {
  ready: 'bg-ok',
  loading: 'animate-pulse bg-warn',
  error: 'bg-bad',
}

function StatusChip({ label, status }) {
  return (
    <li className="flex items-center gap-2 rounded-full bg-dusk-800 px-3 py-1">
      <span className={`h-2 w-2 rounded-full ${DOT[status]}`} aria-hidden="true" />
      <span>{label}</span>
      <span className="sr-only">
        {status === 'ready' ? 'ready' : status === 'error' ? 'failed' : 'loading'}
      </span>
    </li>
  )
}

export function Header({ cameraStatus, holisticStatus, signModelStatus }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sign translator</h1>
        <p className="mt-1 max-w-md text-sm text-mist-dim">
          Your camera stays on this device. Nothing is uploaded.
        </p>
      </div>
      <ul className="flex flex-wrap gap-2 text-sm">
        <StatusChip label="Camera" status={cameraStatus} />
        <StatusChip label="Holistic tracking" status={holisticStatus} />
        <StatusChip label="Sign model" status={signModelStatus} />
      </ul>
    </header>
  )
}
