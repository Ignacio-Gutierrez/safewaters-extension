/**
 * @fileoverview
 * Script de contenido que carga dinámicamente el archivo principal de lógica (`content-main.js`)
 * en el contexto de la página, utilizando la API de extensiones de Chrome.
 *
 * @module content/content
 */

(async () => {
    if (chrome.runtime && chrome.runtime.getURL) {
        try {
            const src = chrome.runtime.getURL('assets/content-main.js');
            await import(src);
            // console.log('SafeWaters: content-main.js cargado.');
        } catch (e) {
            console.error('SafeWaters: Error al cargar content-main.js:', e);
        }
    } else {
        console.error('SafeWaters: No se pudo encontrar la API de tiempo de ejecución de la extensión.');
    }
})();