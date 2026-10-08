import { useRef } from 'react'

// --- Components ---
import CameraStage from './components/CameraStage.jsx'
import PipelineDetails from './components/PipelineDetails.jsx'
import TranslationPanel from './components/TranslationPanel.jsx'
import WindowStrip from './components/WindowStrip.jsx'
import { Header } from './components/Header.jsx'

// --- Hooks ---
import { useCamera } from './hooks/useCamera.js'
import { useHolistic } from './hooks/useHolistic.js'
import { useSignModel } from './hooks/useSignModel.js'
import { useSignPipeline } from './hooks/useSignPipeline.js'
import { useTranslator } from './hooks/useTranslator.js'


/** What to show over the camera while something isn't ready yet. */
function stageMessage(camera, holistic, signModel) {
  for (const part of [camera, holistic, signModel]) {
    if (part.status === 'error') return { tone: 'error', text: part.error }
  }
  if (camera.status !== 'ready') return { tone: 'loading', text: 'Starting the camera...' }
  if (holistic.status !== 'ready') return { tone: 'loading', text: 'Loading holistic tracking...' }
  if (signModel.status !== 'ready') return { tone: 'loading', text: 'Loading the sign model...' }
  return null
}

export default function App() {
  const canvasRef = useRef(null)

  // Each piece of the system is initialized in its own hook, separate from the UI.
  const camera = useCamera()
  const holistic = useHolistic()
  const signModel = useSignModel()
  const translator = useTranslator()

  const ready =
    camera.status === 'ready' && holistic.status === 'ready' && signModel.status === 'ready'

  const { statsRef } = useSignPipeline({
    videoRef: camera.videoRef,
    canvasRef,
    holisticRef: holistic.holisticRef,
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

      <Header
        cameraStatus={camera.status}
        holisticStatus={holistic.status}
        signModelStatus={signModel.status}
      />

      <main className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Camera" className="flex flex-col gap-5">
          <CameraStage
            canvasRef={canvasRef}
            message={stageMessage(camera, holistic, signModel)}
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
