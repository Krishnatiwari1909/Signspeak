# Sign translator

A real-time, browser-based sign language translator. It tracks your hands with MediaPipe,
buffers their motion over about one second, classifies that window with a TensorFlow.js
sequence model, and shows the result as text and (optionally) spoken audio.

Everything runs in the browser. Video never leaves your device.

> **Important:** the app ships with a **placeholder model with random weights**. It exists so
> the full pipeline runs end to end, but its predictions are meaningless. To translate real
> signs you need to train a model and drop it in (see [Bringing a real model](#bringing-a-real-model)).

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for the buffer, feature encoding and word gating
npm run build    # production build in dist/
```

Requires Node 18+ (20+ recommended). Camera access needs `localhost` or HTTPS.

On first load the browser downloads the MediaPipe WASM files (jsDelivr) and the hand
landmarker model (Google Cloud Storage). Both are cached afterwards. To run fully offline,
copy `node_modules/@mediapipe/tasks-vision/wasm` and the `.task` file into `public/` and point
`WASM_URL` (in `src/hooks/useHandLandmarker.js`) and `handLandmarkerUrl` (in `src/config.js`) at them.

## How it works

```
hidden <video> ──► HandLandmarker ──┬──► <canvas>: camera frame + skeleton
   (getUserMedia)   (MediaPipe)     │
                                    └──► encodeFrame ──► rolling buffer (ref, 30 x 130)
                                                              │  every 5 frames, once full
                                                              ▼
                                        TensorFlow.js sequential model (async, non-blocking)
                                                              │  softmax over labels
                                                              ▼
                                        prediction gate (confidence + votes + cooldown)
                                                              │  committed word
                                                              ▼
                                            transcript + caption + Web Speech API
```

- **rAF loop** (`useSignPipeline`): samples at a fixed ~30 Hz so the window always spans about
  one second, skips duplicate camera frames, and never holds more than one inference in flight.
  Inference reads results back with `await tensor.data()`, so drawing continues while it runs.
- **Nothing per-frame is in React state.** The video, canvas, recognizer, model and the 30-frame
  buffer are all refs. Telemetry is written to a plain object and sampled by small UI panels a few
  times per second. React state changes only when a word is committed.
- **Hooks are separate from UI:** `useCamera`, `useHandLandmarker`, `useSignModel`,
  `useSignPipeline`, `useTranslator`, `useSpeech`. Pure logic lives in `src/lib` and is tested.
- **Voice:** browsers block speech until the user interacts, so it's off until you press
  "Turn on voice".

### Feature vector (one frame = 130 numbers)

Two hand slots (slot 0 = "Left", slot 1 = "Right" as reported by MediaPipe), 65 values each:

| Values | Meaning |
|---|---|
| 0–62 | 21 landmarks × (x, y, z), relative to the wrist, divided by hand size (wrist → middle knuckle). x and z are aspect-ratio corrected. Describes hand *shape*, independent of position and distance. |
| 63–64 | Wrist position (x, y) in image coordinates 0–1. Keeps *where* the sign happens. |

A missing hand is all zeros. See `src/lib/features.js`.

## Bringing a real model

The loader looks for `public/models/asl/model.json` (plus weight shards) and
`public/models/asl/labels.json`. If `model.json` is absent it falls back to the placeholder.

**Model contract**

- Input: `[batch, 30, 130]` float32, a window of 30 frames encoded exactly as `features.js` does.
  Training data must use the same encoding, the same ~30 fps sampling, and zeros for missing hands.
- Output: `[batch, N]` softmax, where N is the length of `labels.json`.
- `labels.json`: a JSON array of strings in output order, e.g. `["HELLO", "THANK_YOU", "_idle"]`.
  Underscores display as spaces. Include an **`_idle`** class ("no sign / transitions") in your
  training data. Without one, the model will be forced to name a sign for every window.
  Labels equal to `_idle` are never turned into words.

If the model's input shape or class count doesn't match, the app shows a clear error instead of
silently falling back.

**Suggested path**

1. Record labeled sequences using this pipeline (capture `buffer.snapshot()` output and a label),
   many people, lighting conditions and camera positions per sign. Data diversity matters more
   than model size.
2. Train a small Conv1D/LSTM/GRU classifier in Keras on `[30, 130]` inputs.
3. Export for the browser with the TensorFlow.js converter (`pip install tensorflowjs`), for a
   Keras `.h5` model: `tensorflowjs_converter --input_format=keras model.h5 public/models/asl`.
   For newer Keras `.keras` files, see the converter docs for the matching `--input_format`.
4. Write `public/models/asl/labels.json` and reload.

## Tuning (`src/config.js`)

| Setting | Effect |
|---|---|
| `WINDOW_SIZE` | Frames per window. Must match the model's input. |
| `sampleIntervalMs` | Sampling period (33 ≈ 30 Hz). Must match your training data's rate. |
| `inferenceStride` | Run the model every N frames. Higher = lighter on weak devices. |
| `minHandPresence` | Skip windows where hands were visible in fewer than this share of frames. |
| `minConfidence` | Initial confidence threshold (adjustable in the UI). |
| `votesRequired` | Consecutive agreeing predictions needed before a word is committed. |
| `cooldownMs` | Quiet period after a word. Keep it a bit longer than the window. |

## Limitations

- ASL is more than hands: facial expression, mouth shapes, head and body movement carry meaning.
  This pipeline sees hands only, so it will never cover everything.
- Accuracy depends entirely on the model you train. Expect to need substantial, varied data.
- Two-hand signs where the hands overlap can make tracking unstable.
- Inference runs on the main thread. It's a small model and asynchronous readback keeps the UI
  smooth, but if you need more headroom, move inference into a Web Worker.

## Project layout

```
public/models/asl/labels.json      class labels (add model.json + shards here)
src/config.js                      window size, feature size, tuning knobs
src/lib/features.js                HandLandmarker result -> feature vector
src/lib/FrameBuffer.js             rolling window (typed array ring buffer)
src/lib/predictionGate.js          predictions -> committed words
src/lib/model.js                   TF.js backend, placeholder model, loading, inference
src/hooks/                         camera, MediaPipe, model, pipeline loop, translator, speech
src/components/                    CameraStage, WindowStrip, TranslationPanel, PipelineDetails
tests/pipeline.test.mjs            node:test suite (no extra dependencies)
```
