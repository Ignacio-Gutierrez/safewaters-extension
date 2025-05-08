import { getExtAPI } from "../apis/ext-api.js";


const extAPI = getExtAPI();

/**
 * Guarda una URL en la caché con un tiempo de expiración.
 * @param {string} url - La URL a guardar.
 * @param {object} data - La respuesta de la API.
 */
export async function setUrlCache(url, data) {
  const cache = await getCache();
  cache[url] = { ...data, timestamp: Date.now() }; // Agrega un timestamp
  await saveCache(cache);
}

/**
 * Obtiene una URL de la caché, verificando si ha expirado.
 * @param {string} url - La URL a buscar.
 * @returns {object|null} - La respuesta de la API o `null` si no existe o expiró.
 */
export async function getUrlCache(url) {
  const cache = await getCache();
  const entry = cache[url];

  if (!entry) return null;

  // Verificar si la entrada ha expirado
  if (Date.now() - entry.timestamp > CACHE_EXPIRATION_MS) {
    console.log(`La entrada para ${url} ha expirado.`);
    delete cache[url];
    await saveCache(cache);
    return null;
  }

  return entry;
}

/**
 * Obtiene toda la caché.
 * @returns {object} - La caché completa.
 */
async function getCache() {
  return new Promise((resolve) => {
    extAPI.storage.get([CACHE_KEY], (result) => {
      resolve(result[CACHE_KEY] || {});
    });
  });
}

/**
 * Guarda toda la caché.
 * @param {object} cache - La caché completa.
 */
async function saveCache(cache) {
  return new Promise((resolve) => {
    extAPI.storage.set({ [CACHE_KEY]: cache }, () => resolve());
  });
}