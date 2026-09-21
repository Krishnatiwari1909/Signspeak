import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// MediaPipe fetches its WASM binaries from a CDN at runtime, and that version has to match
// the JS package exactly. Read the version of the package that is actually installed
// (not the semver range in package.json) and expose it to the app as a build-time constant.
function installedVersion(pkg) {
  try {
    const file = new URL(`./node_modules/${pkg}/package.json`, import.meta.url)
    return JSON.parse(readFileSync(file, 'utf8')).version
  } catch {
    return null
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(installedVersion('@mediapipe/tasks-vision')),
  },
  build: {
    // TensorFlow.js is large by nature; it is split out and loaded on demand.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          tfjs: ['@tensorflow/tfjs'],
          mediapipe: ['@mediapipe/tasks-vision'],
        },
      },
    },
  },
})
