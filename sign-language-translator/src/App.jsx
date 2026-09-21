import { useRef } from 'react'
import CameraStage from './components/CameraStage.jsx'
import PipelineDetails from './components/PipelineDetails.jsx'
import TranslationPanel from './components/TranslationPanel.jsx'
import WindowStrip from './components/WindowStrip.jsx'
import { useCamera } from './hooks/useCamera.js'
import { useHandLandmarker } from './hooks/useHandLandmarker.js'
import { useSignModel } from './hooks/useSignModel.js'
import { useSignPipeline } from './hooks/useSignPipeline.js'
import { useTranslator } from './hooks/useTranslator.js'

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
      <span className="sr-only">{status === 'ready' ? 'ready' : status === 'error' ? 'failed' : 'loading'}</span>
    </li>
  )
}

/** What to show over the camera while something isn't ready yet. */
function stageMessage(camera, landmarker, signModel) {
  for (const part of [camera, landmarker, signModel]) {
    if (part.status === 'error') return { tone: 'error', text: part.error }
  }
  if (camera.status !== 'ready') return { tone: 'loading', text: 'Starting the camera…' }
  if (landmarker.status !== 'ready') return { tone: 'loading', text: 'Loading hand tracking…' }
  if (signModel.status !== 'ready') return { tone: 'loading', text: 'Loading the sign model…' }
  return null
}

export default function App() {
  const canvasRef = useRef(null)

  // Each piece of the system is initialized in its own hook, separate from the UI.
  const camera = useCamera()
  const landmarker = useHandLandmarker()
  const signModel = useSignModel()
  const translator = useTranslator()

  const ready =
    camera.status === 'ready' && landmarker.status === 'ready' && signModel.status === 'ready'

  const { statsRef } = useSignPipeline({
    videoRef: camera.videoRef,
    canvasRef,
    landmarkerRef: landmarker.landmarkerRef,
    modelRef: signModel.modelRef,
    labelsRef: signModel.labelsRef,
    enabled: ready,
    onPrediction: translator.onPrediction,
  })

  const lastWord = translator.words[translator.words.length - 1] ?? null

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      {/* The camera feed is decoded here but never shown directly. It is drawn to the canvas
          (with the skeleton) by the pipeline. It stays rendered, just invisible, because some
          browsers stop decoding a display:none video. */}
      <video
        ref={camera.videoRef}
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        autoPlay
        muted
        playsInline
        tabIndex={-1}
        aria-hidden="true"
      />

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sign translator</h1>
          <p className="mt-1 max-w-md text-sm text-mist-dim">
            Your camera stays on this device. Nothing is uploaded.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm">
          <StatusChip label="Camera" status={camera.status} />
          <StatusChip label="Hand tracking" status={landmarker.status} />
          <StatusChip label="Sign model" status={signModel.status} />
        </ul>
      </header>

      {signModel.source === 'placeholder' && (
        <div role="note" className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn ring-1 ring-warn/40">
          You're running the placeholder model. Its weights are random, so its guesses mean nothing.
          Put a trained model in <code className="font-semibold">public/models/asl/</code> to translate real
          signs, or lower the confidence threshold under Details to watch the pipeline run.
        </div>
      )}

      <main className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Camera" className="flex flex-col gap-5">
          <CameraStage
            canvasRef={canvasRef}
            message={stageMessage(camera, landmarker, signModel)}
            caption={lastWord}
          />
          <WindowStrip statsRef={statsRef} />
        </section>

        <div className="flex flex-col gap-8">
          <TranslationPanel words={translator.words} speech={translator.speech} onClear={translator.clear} />
          <PipelineDetails
            statsRef={statsRef}
            modelInfo={{ source: signModel.source, backend: signModel.backend }}
            threshold={translator.threshold}
            onThresholdChange={translator.setThreshold}
          />
        </div>
      </main>
    </div>
  )
}
