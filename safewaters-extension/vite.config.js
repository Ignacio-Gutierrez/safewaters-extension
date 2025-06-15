import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Scripts principales
        background: resolve(__dirname, 'src/background/background.js'),
        content: resolve(__dirname, 'src/content/content.js'),
        'content-simple': resolve(__dirname, 'src/content/content-simple.js'),
        
        // Páginas HTML
        popup: resolve(__dirname, 'src/popup/popup.html'),
        welcome: resolve(__dirname, 'src/pages/welcome/welcome.html'),
        
        // Scripts de páginas
        'popup-script': resolve(__dirname, 'src/popup/popup.js'),
        'welcome-script': resolve(__dirname, 'src/pages/welcome/welcome.js'),
        
        // Scripts de componentes
        'confirm-popup-script': resolve(__dirname, 'src/components/confirm-popup/confirm-popup.js'),
        'confirm-popup-html': resolve(__dirname, 'src/components/confirm-popup/confirm-popup.html'),
        'confirm-popup-css': resolve(__dirname, 'src/components/confirm-popup/confirm-popup.css'),
      },
      external: (id) => {
        // No externalizar nada - incluir todas las dependencias
        return false;
      },
      output: {
        // Usar formato ES para módulos
        format: 'es',
        inlineDynamicImports: false,
        manualChunks: undefined,
        entryFileNames: (chunkInfo) => {
          // Mantener estructura para background y content scripts
          if (chunkInfo.name === 'background') {
            return 'src/background/background.js'
          }
          if (chunkInfo.name === 'content') {
            return 'src/content/content.js'
          }
          if (chunkInfo.name === 'content-simple') {
            return 'src/content/content-simple.js'
          }
          if (chunkInfo.name === 'welcome-script') {
            return 'src/pages/welcome/welcome.js'
          }
          if (chunkInfo.name === 'popup-script') {
            return 'src/popup/popup.js'
          }
          if (chunkInfo.name === 'confirm-popup-script') {
            return 'src/components/confirm-popup/confirm-popup.js'
          }
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          // Mantener estructura para archivos específicos
          if (assetInfo.name === 'welcome.html') {
            return 'src/pages/welcome/welcome.html'
          }
          if (assetInfo.name === 'popup.html') {
            return 'src/popup/popup.html'
          }
          if (assetInfo.name === 'welcome.css') {
            return 'src/pages/welcome/welcome.css'
          }
          if (assetInfo.name === 'popup.css') {
            return 'src/popup/popup.css'
          }
          if (assetInfo.name === 'confirm-popup.html') {
            return 'src/components/confirm-popup/confirm-popup.html'
          }
          if (assetInfo.name === 'confirm-popup.css' || assetInfo.name === 'confirm-popup-css.css') {
            return 'src/components/confirm-popup/confirm-popup.css'
          }
          return 'assets/[name][extname]'
        }
      }
    },
    target: 'esnext',
    minify: false,  // Deshabilitar minificación para debugging
    sourcemap: true  // Habilitar sourcemaps para debugging
  },
  publicDir: 'public'
})