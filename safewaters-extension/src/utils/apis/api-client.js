import { API_BASE_URL } from "../config.js";

export async function testUrl(url) {
    const response = await fetch(`${API_BASE_URL}/check`, {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" }
    });
    return response.json();
}