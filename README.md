# 🤟 SignSpeak: Real-Time Browser-Based ASL Translator

[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-orange.svg)](https://www.tensorflow.org/js)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Holistic-teal.svg)](https://developers.google.com/mediapipe)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)
[![Accuracy](https://img.shields.io/badge/Validation%20Accuracy-84.25%25-brightgreen.svg)](#model-performance)

> **Foundational Project (Semester 5)**  
> **SignSpeak** is a real-time American Sign Language (ASL) translator that converts continuous sign gestures into text and spoken audio entirely inside your web browser. Video never leaves your device.

---

## 📖 Complete Technical Documentation
For a deep dive into the mathematical formulation, neural network architecture, dataflow diagrams, and viva Q&A, please refer to:
👉 **[PROJECT_DOCUMENTATION.md](file:///c:/Foundational%20Project%20sem%205/PROJECT_DOCUMENTATION.md)**

---

## ⚡ Quick Start

### 1. Prerequisites
* **Node.js** (v18 or higher recommended)
* A modern web browser with webcam access (e.g., Google Chrome)

### 2. Run Locally
```powershell
# Navigate into the frontend application directory
cd sign-language-translator

# Install dependencies (if running for the first time)
npm install

# Start the Vite development server
npm run dev
```

Open your browser to:
> **http://localhost:5173/**

Grant camera permissions, position your upper body and hands in frame, and begin signing!

---

## 🧠 Model & Dataset Overview

* **Vision Pipeline:** MediaPipe Holistic tracks **135 3D landmarks** (Pose, Hands, Face), normalized relative to the user's shoulder midpoint (405 features per frame).
* **Architecture:** Spatial `TimeDistributed(Conv1D)` layers feeding into a 2-stage `Bidirectional GRU` operating on a 30-frame temporal window (~1.0s of motion).
* **Model Performance:** **84.25% Validation Accuracy** across high-frequency conversational sign classes + an **`_idle`** background rejection class.
* **Debouncing & Voice:** Uses a deterministic prediction gate (60% confidence, 2-frame agreement, 1200ms cooldown) and the **Web Speech API** for voice synthesis.

---

## 📂 Repository Structure

| Folder / File | Description |
| :--- | :--- |
| **`PROJECT_DOCUMENTATION.md`** | Comprehensive technical and architectural project report |
| **`sign-language-translator/`** | Production React 19 + TensorFlow.js web application |
| **`ASL_Training/`** | Python training pipeline, dataset preparation, and Keras models |
| **`ASL_Training/archive_2000_words_model/`** | Preserved original 2,000-class training files and checkpoints |
| **`sign-language-translator/models_archive/`**| Preserved original 2,000-class web model shards |

---

## 🧪 Unit Tests
To run automated tests for the circular feature buffer, landmark normalizer, and prediction gating:
```powershell
cd sign-language-translator
npm test
```
*(13/13 passing tests)*
