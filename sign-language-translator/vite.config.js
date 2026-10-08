import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
