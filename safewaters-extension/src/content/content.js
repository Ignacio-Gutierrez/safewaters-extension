(async () => {
    // Intenta obtener la API del navegador (chrome o browser)
    const runtimeAPI = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;
  
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