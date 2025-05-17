/**
 * @fileoverview
 * Script de contenido que carga dinámicamente el archivo principal de lógica (`content-main.js`)
 * en el contexto de la página, utilizando la API de extensiones disponible.
 *
 * @module content/content
 */

(async () => {
    // Intenta obtener la API del navegador (chrome o browser)
    const runtimeAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;

    /**
     * Si la API de extensión está disponible, importa dinámicamente el script principal.
     * Si ocurre un error, lo muestra en la consola.
     */
    if (runtimeAPI && runtimeAPI.getURL) {
        try {
            const src = runtimeAPI.getURL('assets/content-main.js');
            await import(src);
            // console.log('SafeWaters: content-main.js cargado.');
        } catch (e) {
            console.error('SafeWaters: Error al cargar content-main.js:', e);
        }
    } else {
        console.error('SafeWaters: No se pudo encontrar la API de tiempo de ejecución de la extensión.');
    }
})();