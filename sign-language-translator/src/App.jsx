import { useEffect, useRef } from 'react'

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
  if (signModel.status !== 'ready') return { tone: 'loading', text: `Loading ${signModel.activeConfig?.name ?? 'sign model'}...` }
  return null
}

export default function App() {
  const canvasRef = useRef(null)

  // Each piece of the system is initialized in its own hook, separate from the UI.
  const camera = useCamera()
  const holistic = useHolistic()
  const signModel = useSignModel()
  const translator = useTranslator(signModel.activeConfig)

  const ready =
    camera.status === 'ready' && holistic.status === 'ready' && signModel.status === 'ready'

  const { statsRef } = useSignPipeline({
    videoRef: camera.videoRef,
    canvasRef,
    holisticRef: holistic.holisticRef,
    modelRef: signModel.modelRef,
    labelsRef: signModel.labelsRef,
    activeConfig: signModel.activeConfig,
    enabled: ready,
    onPrediction: translator.onPrediction,
  })

  // Keyboard shortcuts: Space/Enter translates sentence, Backspace undos last sign
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        translator.finishSentence()
      } else if (e.code === 'Backspace' && translator.mode === 'sentence') {
        e.preventDefault()
        translator.undoLastSign()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [translator.finishSentence, translator.undoLastSign, translator.mode])

  const lastSentence = translator.sentences[translator.sentences.length - 1]
  const lastWord = translator.words[translator.words.length - 1]

  const lastCaption =
    translator.mode === 'sentence'
      ? translator.activeGlosses.length > 0
        ? { id: `active-${translator.activeGlosses.length}`, text: translator.activeGlosses.join(' + ') }
        : lastSentence
          ? { id: `s-${lastSentence.id}`, text: lastSentence.text }
          : null
      : lastWord ?? null

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
        modelId={signModel.modelId}
        onSwitchModel={signModel.switchModel}
        availableModels={signModel.availableModels}
        signModelSource={signModel.source}
      />

      <main className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Camera" className="flex flex-col gap-5">
          <CameraStage
            canvasRef={canvasRef}
            message={stageMessage(camera, holistic, signModel)}
            caption={lastCaption}
          />
          <WindowStrip statsRef={statsRef} />
        </section>

        <div className="flex flex-col gap-8">
          <TranslationPanel
            mode={translator.mode}
            onModeChange={translator.setMode}
            words={translator.words}
            sentences={translator.sentences}
            activeGlosses={translator.activeGlosses}
            countdown={translator.countdown}
            isTranslating={translator.isTranslating}
            onFinishSentence={translator.finishSentence}
            onUndoLastSign={translator.undoLastSign}
            apiKey={translator.apiKey}
            onApiKeyChange={translator.setApiKey}
            speech={translator.speech}
            onClear={translator.clear}
          />
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
