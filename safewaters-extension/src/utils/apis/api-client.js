import { API_BASE_URL } from "../config.js";

/**
 * Envía una URL al endpoint `/check` para validación.
 *
 * @async
 * @function testUrl
 * @param {string} url - La URL que se desea verificar.
 * @returns {Promise<Object>} La respuesta JSON del servidor.
 * @throws {Error} Si ocurre un error en la petición.
 *
 * @example
 * const result = await testUrl("https://ejemplo.com");
 * console.log(result);
 */
export async function testUrl(url) {
    const response = await fetch(`${API_BASE_URL}/check`, {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" }
    });
    return response.json();
}