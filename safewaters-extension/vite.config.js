import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Scripts principales
        background: resolve(__dirname, 'src/background/background.js'),
        'content-script': resolve(__dirname, 'src/content/content-script.js'),
        
        // Interceptores
        'click-interceptor': resolve(__dirname, 'src/background/interceptors/click-interceptor.js'),
        'navigation-interceptor': resolve(__dirname, 'src/background/interceptors/navigation-interceptor.js'),
        
        // Páginas HTML
        popup: resolve(__dirname, 'src/popup/popup.html'),
        welcome: resolve(__dirname, 'src/pages/welcome/welcome.html'),
        blocked: resolve(__dirname, 'src/pages/blocked/blocked.html'),
        warning: resolve(__dirname, 'src/pages/warning/warning.html'),
        uncertain: resolve(__dirname, 'src/pages/uncertain/uncertain.html'),
        
        // Scripts de páginas
        'popup-script': resolve(__dirname, 'src/popup/popup.js'),
        'welcome-script': resolve(__dirname, 'src/pages/welcome/welcome.js'),
        'blocked-script': resolve(__dirname, 'src/pages/blocked/blocked.js'),
        'warning-script': resolve(__dirname, 'src/pages/warning/warning.js'),
        'uncertain-script': resolve(__dirname, 'src/pages/uncertain/uncertain.js'),
      },
      output: {
        // Usar formato ES para módulos
        format: 'es',
        inlineDynamicImports: false,
        entryFileNames: (chunkInfo) => {
          // Mantener estructura de extensión
          const scriptMap = {
            'background': 'src/background/background.js',
            'content-script': 'src/content/content-script.js',
            'popup-script': 'src/popup/popup.js',
            'welcome-script': 'src/pages/welcome/welcome.js',
            'blocked-script': 'src/pages/blocked/blocked.js',
            'warning-script': 'src/pages/warning/warning.js',
            'uncertain-script': 'src/pages/uncertain/uncertain.js'
          }
          
          return scriptMap[chunkInfo.name] || 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          // Mantener estructura para archivos específicos
          const assetMap = {
            'popup.html': 'src/popup/popup.html',
            'welcome.html': 'src/pages/welcome/welcome.html',
            'blocked.html': 'src/pages/blocked/blocked.html',
            'warning.html': 'src/pages/warning/warning.html',
            'uncertain.html': 'src/pages/uncertain/uncertain.html',
            'popup.css': 'src/popup/popup.css',
            'welcome.css': 'src/pages/welcome/welcome.css',
            'blocked.css': 'src/pages/blocked/blocked.css',
            'warning.css': 'src/pages/warning/warning.css',
            'uncertain.css': 'src/pages/uncertain/uncertain.css'
          }
          
          return assetMap[assetInfo.name] || 'assets/[name][extname]'
        }
      }
    },
    target: 'esnext',
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  publicDir: 'public'
})