# SignSpeak: Real-Time Browser-Based ASL Translator

> **Foundational Project (Semester 5)**  
> **Author / Repository:** [Krishnatiwari1909/Signspeak](https://github.com/Krishnatiwari1909/Signspeak)

---

## 1. Executive Summary

**SignSpeak** is a real-time, privacy-first American Sign Language (ASL) recognition and speech synthesis application that operates entirely inside the client's web browser. By combining **MediaPipe Holistic** computer vision tracking, custom spatial-temporal deep learning (**Convolutional Neural Networks + Bidirectional Gated Recurrent Units**), and **TensorFlow.js**, SignSpeak converts dynamic continuous sign gestures into written text and audible speech in real time with low latency.

### Key Highlights
* **Zero Cloud Latency & Total Privacy:** Video frames never leave the user's local device. Hand, face, and pose landmarks are extracted in-browser, and inference runs locally on the GPU/CPU via WebGL/WASM.
* **Spatial-Temporal Architecture:** Uses a `TimeDistributed Conv1D` spatial feature extractor combined with a 2-stage `Bidirectional GRU` temporal model operating over a 30-frame rolling window (~1 second of motion).
* **High Real-Time Accuracy:** Achieves **84.25% validation accuracy** across high-frequency conversational sign classes, complete with an **`_idle`** rejection class that prevents false positives when resting.
* **Deterministic Prediction Gating:** Employs an temporal debouncing and voting gate to eliminate flickering, ensuring only deliberate signs are committed and spoken aloud via the **Web Speech API**.

---

## 2. System Architecture & Data Flow

```
                                      CLIENT BROWSER (100% Local)
 ┌───────────────┐
 │ Webcam Stream │ ──(30 FPS)──► ┌──────────────────────────────────────────────┐
 └───────────────┘               │ MediaPipe Holistic Vision Pipeline           │
                                 │ Extracts 135 landmarks across Pose, Hands,   │
                                 │ and Face relative to the video frame         │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                                        ▼
                                 ┌──────────────────────────────────────────────┐
                                 │ Landmark Normalization (features.js)         │
                                 │ Calculates shoulder midpoint (origin)        │
                                 │ Generates 135 x 3 = 405 invariant coordinates│
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                                        ▼
                                 ┌──────────────────────────────────────────────┐
                                 │ Circular FrameBuffer (30 x 405 floats)       │
                                 │ Rolling window captures ~1.0 second of motion│
                                 └──────────────────────┬───────────────────────┘
                                                        │  (Inference every 5 frames)
                                                        ▼
                                 ┌──────────────────────────────────────────────┐
                                 │ TensorFlow.js Sequential Model               │
                                 │ Input: [1, 30, 135, 3]                       │
                                 │ Spatial Conv1D -> Bi-GRU -> Dense Softmax    │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                                        ▼  (Softmax Probabilities)
                                 ┌──────────────────────────────────────────────┐
                                 │ Prediction Gate & Debounce Filter            │
                                 │ - Confidence Threshold (>= 60%)              │
                                 │ - Vote Agreement (>= 2 consecutive frames)   │
                                 │ - Cooldown Lockout (1200 ms)                 │
                                 │ - Ignores '_idle' background class           │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                                        ▼
                                 ┌──────────────────────────────────────────────┐
                                 │ User Interface & Feedback Loop               │
                                 │ - Live Skeleton Canvas Overlay               │
                                 │ - Real-Time Subtitle Caption Strip           │
                                 │ - Continuous Transcript History Panel        │
                                 │ - Web Speech API Text-to-Speech Engine       │
                                 └──────────────────────────────────────────────┘
```

---

## 3. Computer Vision & Feature Engineering

Traditional sign language models attempt to pass raw camera pixels (e.g., $224 \times 224 \times 3$) directly into 3D-CNNs. This approach suffers from extreme sensitivity to background clutter, room lighting, skin tone variations, and clothing.

SignSpeak decouples **geometry** from **pixels** by operating exclusively on skeletal landmarks:

### 3.1 Landmark Composition (135 Keypoints per Frame)
For every frame, MediaPipe Holistic tracks:
1. **Body Pose (33 points):** Tracks shoulders, elbows, wrists, and head position.
2. **Left Hand (21 points):** Full 3D articulation from wrist to each fingertip.
3. **Right Hand (21 points):** Full 3D articulation for two-handed signing.
4. **Face Outline (60 points):** Sub-sampled facial mesh to capture crucial grammatical markers in ASL (head tilt, eyebrows, mouth position).

$$\text{Total Features per Frame} = 135 \text{ landmarks} \times 3 \text{ coordinates } (x, y, z) = 405 \text{ numerical values}$$

### 3.2 Invariant Normalization (Shoulder Midpoint Origin)
Signs must be recognized whether the user sits 1 meter or 2 meters from the camera, or whether they sit slightly to the left or right of center.

In `ASL_Training/extract_optimized.py` and `sign-language-translator/src/lib/features.js`:
$$\text{origin}_x = \frac{L_{\text{shoulder}, x} + R_{\text{shoulder}, x}}{2}, \quad \text{origin}_y = \frac{L_{\text{shoulder}, y} + R_{\text{shoulder}, y}}{2}, \quad \text{origin}_z = \frac{L_{\text{shoulder}, z} + R_{\text{shoulder}, z}}{2}$$

Every coordinate is translated relative to this origin:
$$P_{\text{normalized}} = (P_x - \text{origin}_x, \; P_y - \text{origin}_y, \; P_z - \text{origin}_z)$$
If hands are not visible in the camera frame, their corresponding slots are filled with zeros.

---

## 4. Deep Learning Model Architecture

The classifier is designed to understand both **spatial hand shape** and **temporal motion trajectories**.

```
Input Shape: [Batch, 30 frames, 135 landmarks, 3 coordinates]
  │
  ├──► TimeDistributed(Conv1D(64, kernel=3, padding='same', activation='relu'))
  │      └── TimeDistributed(BatchNormalization())
  │      └── TimeDistributed(MaxPooling1D(pool=2))
  │      └── TimeDistributed(Dropout(0.2))
  │
  ├──► TimeDistributed(Conv1D(128, kernel=3, padding='same', activation='relu'))
  │      └── TimeDistributed(BatchNormalization())
  │      └── TimeDistributed(MaxPooling1D(pool=2))
  │      └── TimeDistributed(Flatten())
  │
  ├──► Bidirectional(GRU(128, return_sequences=True, reset_after=False))
  │      └── Dropout(0.3)
  │
  ├──► Bidirectional(GRU(64, return_sequences=False, reset_after=False))
  │      └── Dropout(0.3)
  │
  ├──► Dense(128, activation='relu')
  │      └── BatchNormalization()
  │      └── Dropout(0.4)
  │
  └──► Dense(51, activation='softmax')  ==> Class Probabilities
```

### Architectural Decisions:
1. **TimeDistributed Conv1D:** Extracts spatial relationships between neighboring joints within each discrete frame without collapsing temporal order.
2. **Bidirectional GRU:** Evaluates gesture motion forward in time (preparation phase) and backward in time (retraction phase). GRUs were selected over LSTMs because they train 30% faster and require fewer memory allocations during browser inference while maintaining equivalent sequence modeling capacity.
3. **Dropout & Batch Normalization:** Prevents overfitting on specific signer idiosyncrasies.

---

## 5. Dataset Engineering: WLASL & The 50-Class Pivot

### 5.1 The 2,000-Class Pitfall (Why it Failed)
The project initially trained on the full **WLASL (World-Level American Sign Language) 2,000** dataset (11,979 total video clips). 

* Across 2,000 signs, the median number of video samples per sign was **only 6 clips** (many signs had only 2 clips).
* With only 4 training clips per class, a neural network cannot generalize across diverse camera angles, sign speeds, and hand proportions.
* Softmax probability across 2,000 classes diluted the winning class score down to ~15%–30%, meaning the frontend threshold rejected every prediction as noise.

### 5.2 The High-Density Top 50 Subset
To build an accurate system, the dataset was refactored to focus on the **Top 50 signs with the highest training sample density** (11 to 16 distinct video clips each, covering common conversational vocabulary):
* **Everyday Essentials:** `YES`, `NO`, `HELP`, `WHO`, `WHAT`, `GO`, `DRINK`, `BEFORE`, `LATER`, `COMPUTER`, `FAMILY`, `MOTHER`, `BROTHER`, `MAN`, etc.
* **Sample Count:** 1,228 real-world training instances.
* **Data Augmentation:** Real-time geometric scaling ($0.9\times$ to $1.1\times$) and Gaussian joint jitter ($\sigma = 0.005$) to simulate posture distance and hand tremors.
* **The `_idle` Class:** 40 synthetic neutral sequences (resting arms, subtle breathing sway, hands off-camera) to train the model to output `_idle` when no sign is actively being performed.

### 5.3 Training Results
* **Training Time:** ~17 minutes on CPU (80 epochs, Adam optimizer, learning rate schedule with ReduceLROnPlateau).
* **Final Validation Accuracy:** **`84.25%`** (Validation Loss: `0.7088`).

---

## 6. Frontend Pipeline & Prediction Gating

To turn continuous frame-by-frame probabilities into discrete, readable sentences, `sign-language-translator` implements a multi-stage software gate:

```
Raw Softmax Vector
       │
       ▼
[Confidence Filter] ── (Probability < 60%?) ──────────────► Drop / Reset
       │  (>= 60%)
       ▼
[Idle Filter] ─────── (Label == '_idle'?) ────────────────► Drop (User is resting)
       │  (Action Label)
       ▼
[Voting Buffer] ───── (Has the same sign won 2 frames?) ──► Wait for agreement
       │  (Agreed)
       ▼
[Cooldown Lock] ───── (In 1200ms cooldown?) ──────────────► Lock duplicate repeats
       │  (Passed)
       ▼
Commit Word ───────► Append to Transcript & Trigger Web Speech API
```

* **Zero-Allocation Circular Buffer (`FrameBuffer.js`):** Preallocates a typed `Float32Array(30 * 405)` so pushing frames during the 60 FPS animation loop incurs zero garbage collection pauses.
* **Decoupled Render Architecture:** The webcam, canvas, and tracking pipelines live completely outside of React's state tree in refs. React re-renders only when a confirmed word is committed.

---

## 7. Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Deep Learning** | Python 3.11, TensorFlow 2.x, Keras | Spatial-temporal model training, validation, callbacks |
| **Computer Vision** | MediaPipe Holistic | Real-time 3D landmark tracking (Pose, Hands, Face) |
| **Model Serving** | TensorFlow.js (Layers API) | Client-side in-browser neural network inference |
| **Frontend Framework** | React 19, Vite 6 | Component lifecycle, responsive layout, development server |
| **Styling** | Vanilla CSS, TailwindCSS | Modern dark-mode interface, responsive telemetry panels |
| **Audio Output** | Web Speech API (`speechSynthesis`) | Automatic vocalization of translated words |

---

## 8. Repository Structure

```
c:\Foundational Project sem 5\
│
├── PROJECT_DOCUMENTATION.md             # Complete technical documentation
├── fix_model.js                         # TFJS weight/layer topology remapper script
│
├── ASL_Training/                        # Python Machine Learning Pipeline
│   ├── prepare_top50_dataset.py         # Slices Top 50 subset + synthesizes _idle data
│   ├── train_model.py                   # Keras CNN + Bi-GRU training script
│   ├── extract_optimized.py             # Multiprocessing MediaPipe feature extractor
│   ├── organize_wlasl.py                # WLASL directory mapper
│   ├── asl_model.h5                     # Trained 50-class Keras model (84.25% acc)
│   ├── labels.json                      # 51-class label index
│   ├── X.npy & y.npy                    # Extracted training tensors (50 classes + idle)
│   └── archive_2000_words_model/        # Archive containing original 2000-word model
│
└── sign-language-translator/            # Production React + TFJS Web Application
    ├── package.json                     # Node.js dependencies & scripts
    ├── vite.config.js                   # Vite configuration
    ├── index.html                       # Entry HTML (MediaPipe & TFJS CDN tags)
    ├── public/
    │   └── models/asl/                  # Active Web Model (model.json + 4 weight shards)
    ├── models_archive/                  # Archive of original 2000-word TFJS web model
    ├── src/
    │   ├── config.js                    # ML threshold & sampling parameters
    │   ├── lib/
    │   │   ├── FrameBuffer.js           # Low-level 30-frame circular typed buffer
    │   │   ├── features.js              # Landmark normalization & shoulder centering
    │   │   ├── model.js                 # TFJS model loader & sequence prediction
    │   │   └── predictionGate.js        # Confidence voting & debounce gating logic
    │   ├── hooks/                       # Custom React lifecycle hooks (useCamera, etc.)
    │   └── components/                  # UI components (CameraStage, PipelineDetails, etc.)
    └── tests/
        └── pipeline.test.mjs            # 13/13 passing automated unit tests
```

---

## 9. How to Run the Project

### Running the Web Application
```powershell
# 1. Open terminal and enter frontend folder
cd "sign-language-translator"

# 2. Start the local server
npm run dev
```
Open **`http://localhost:5173/`** in Google Chrome.

### Retraining or Re-extracting (Python)
```powershell
# 1. Activate python environment
cd "ASL_Training"
.\asl_env\Scripts\activate

# 2. Prepare dataset
python prepare_top50_dataset.py

# 3. Train the model
python train_model.py
```

---

## 10. Frequently Asked Questions (Viva / Presentation Prep)

**Q1: Why did you use landmark extraction instead of training directly on video pixels with 3D-CNNs (like I3D)?**  
*Answer:* Video pixels contain massive amounts of irrelevant variance (background, lighting, skin tone, shirts). Extracting 3D skeletal coordinates makes the model invariant to lighting and background, reduces the data dimension from millions of pixels to just 405 floats per frame, and allows the neural network to execute in real-time inside a standard web browser on ordinary laptops without requiring a discrete GPU.

**Q2: What is the purpose of the `_idle` class?**  
*Answer:* Without an `_idle` class, a softmax classifier is mathematically forced to distribute 100% of its probability across action classes. When the user rests their hands or talks, the model would output arbitrary signs. Training the model on neutral postures allows it to identify when no sign is taking place, suppressing false positives.

**Q3: How does the app prevent duplicate or stuttering predictions?**  
*Answer:* Through the `PredictionGate`: it requires a sign to win majority votes across 2 consecutive prediction windows, enforces a 1200ms cooldown lockout after each committed word, and requires a brief return to `_idle` before repeating the same word.
