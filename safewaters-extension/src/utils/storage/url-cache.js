import { getExtAPI } from "../apis/ext-api.js";
import { CACHE_KEY } from "../config.js";

const extAPI = getExtAPI();

/**
 * Guarda una URL en la caché con un tiempo de expiración.
 * @param {string} url - La URL a guardar.
 * @param {object} data - La respuesta de la API.
 */
export async function setUrlCache(url, data) {
  const cache = await getCache();
  cache[url] = { ...data };
  await saveCache(cache);
}

/**
 * Obtiene una URL de la caché.
 * @param {string} url - La URL a buscar.
 * @returns {object|null} - La respuesta de la API o `null` si no existe o expiró.
 */
export async function getUrlCache(url) {
  const cache = await getCache();
  const entry = cache[url];

  if (!entry) return null;

  return entry;
}

/**
 * Obtiene toda la caché.
 * @returns {object} - La caché completa.
 */
async function getCache() {
  return new Promise((resolve, reject) => {
    extAPI.runtime.sendMessage({ type: "GET_CACHE", key: CACHE_KEY }, (response) => {
      if (extAPI.runtime.lastError) {
        console.error(`SafeWaters Cache: Error enviando mensaje a background: ${extAPI.runtime.lastError.message}`);
        return reject(new Error(extAPI.runtime.lastError.message));
      }
      if (response.error) {
        console.error(`SafeWaters Cache: Error desde background al obtener caché: ${response.error}`);
        return reject(new Error(response.error));
      }
      resolve(response.data || {});
    });
  });
}

/**
 * Guarda toda la caché.
 * @param {object} cache - La caché completa.
 */
async function saveCache(cache) {
  return new Promise((resolve, reject) => {
    extAPI.runtime.sendMessage({ type: "SAVE_CACHE", key: CACHE_KEY, cacheData: cache }, (response) => {
      if (extAPI.runtime.lastError) {
        console.error(`SafeWaters Cache: Error enviando mensaje a background para guardar: ${extAPI.runtime.lastError.message}`);
        return reject(new Error(extAPI.runtime.lastError.message));
      }
      if (response.error) {
        console.error(`SafeWaters Cache: Error desde background al guardar caché: ${response.error}`);
        return reject(new Error(response.error));
      }
      if (response.success) {
        resolve();
      } else {
        // Esto podría ocurrir si la respuesta no tiene error pero tampoco success, aunque es improbable con el background.js actual
        reject(new Error("SafeWaters Cache: Falló el guardado de la caché en background por razón desconocida."));
      }
    });
  });
}