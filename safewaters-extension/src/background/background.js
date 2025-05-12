import { getExtAPI } from '../utils/apis/ext-api.js';
import { CACHE_KEY } from '../utils/config.js';

const extAPI = getExtAPI();

extAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_CACHE") {
    if (!extAPI.sessionStorage || typeof extAPI.sessionStorage.get !== 'function') {
      console.error("SafeWaters Background: sessionStorage.get no está disponible.");
      sendResponse({ error: "sessionStorage.get no está disponible en el background." });
      return false; // No se enviará respuesta asíncrona si hay error temprano
    }
    // El primer argumento de get debe ser null, una cadena o un array de cadenas.
    // CACHE_KEY es una cadena, así que la envolvemos en un array.
    extAPI.sessionStorage.get([request.key || CACHE_KEY], (result) => {
      if (extAPI.runtime.lastError) {
        console.error(`SafeWaters Background (GET_CACHE): Error: ${extAPI.runtime.lastError.message}`);
        sendResponse({ error: extAPI.runtime.lastError.message });
      } else {
        // Asegurarse de que result no sea undefined antes de acceder a result[request.key]
        const data = result && result[request.key || CACHE_KEY] ? result[request.key || CACHE_KEY] : {};
        sendResponse({ data: data });
      }
    });
    return true; // Indica que la respuesta se enviará asíncronamente.
  } 
  
  else if (request.type === "SAVE_CACHE") {
    if (!extAPI.sessionStorage || typeof extAPI.sessionStorage.set !== 'function') {
      console.error("SafeWaters Background: sessionStorage.set no está disponible.");
      sendResponse({ error: "sessionStorage.set no está disponible en el background." });
      return false;
    }
    extAPI.sessionStorage.set({ [request.key || CACHE_KEY]: request.cacheData }, () => {
      if (extAPI.runtime.lastError) {
        console.error(`SafeWaters Background (SAVE_CACHE): Error: ${extAPI.runtime.lastError.message}`);
        sendResponse({ error: extAPI.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Indica que la respuesta se enviará asíncronamente.
  }
  // Puedes añadir más manejadores de mensajes aquí si es necesario
  return false; // Para mensajes no reconocidos o si la respuesta no es asíncrona
});