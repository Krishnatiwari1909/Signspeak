/**
 * The camera view. The hidden <video> lives in App; this canvas shows the mirrored camera
 * frame with the hand skeleton drawn on top. A recognized word appears as a caption over
 * the bottom of the picture, the way subtitles do.
 */
export default function CameraStage({ canvasRef, message, caption }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-dusk-900 ring-1 ring-dusk-700">
      {/* Mirrored with CSS so it behaves like a mirror. The video and the skeleton are drawn
          on the same canvas, so they stay aligned with no coordinate math. */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        role="img"
        aria-label="Your camera view with hand tracking drawn on top"
        className="block h-auto w-full -scale-x-100"
      />

      {message && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-dusk-950/85 p-8 text-center"
        >
          <p
            className={`max-w-sm text-lg ${
              message.tone === 'error' ? 'text-bad' : 'animate-pulse text-mist-dim'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {caption && (
        <div
          key={caption.id}
          aria-hidden="true"
          className="caption-pop pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4"
        >
          <p className="rounded-xl bg-black/80 px-5 py-2 text-3xl font-bold text-caption sm:text-4xl">
            {caption.text}
          </p>
        </div>
      )}
    </div>
  )
}
