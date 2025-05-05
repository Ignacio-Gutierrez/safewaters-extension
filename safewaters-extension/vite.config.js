import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        background: 'src/background/background.js',
        content: 'src/content/content-script.js'
      }
    }
  }
})