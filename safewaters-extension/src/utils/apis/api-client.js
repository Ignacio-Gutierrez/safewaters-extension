import { API_BASE_URL } from "../config.js";

function handleApiError(error, operation) {
    console.error(`Error en ${operation}:`, error);
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.log(`API no disponible para ${operation} - servidor posiblemente no está ejecutándose`);
        return { error: 'API_UNAVAILABLE', message: 'Servidor no disponible' };
    }
    
    return { error: 'UNKNOWN_ERROR', message: error.message };
}

export async function testUrl(url) {
    try {
        const response = await fetch(`${API_BASE_URL}/check`, {
            method: "POST",
            body: JSON.stringify({ url }),
            headers: { "Content-Type": "application/json" }
        });
        
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.detail || 'Error verificando URL');
        }
        
        return await response.json();
        
    } catch (error) {
        const errorInfo = handleApiError(error, 'verificación de URL');
        throw new Error(errorInfo.message);
    }
}

export async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/managed_profiles/validate-token`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json',},
            body: JSON.stringify({ token })
        });

        const result = await response.json();
        
        if (!response.ok) {
            return { 
                valid: false, 
                error: result.detail || 'Error de servidor',
                httpStatus: response.status
            };
        }
        
        return { valid: result.valid || false };
        
    } catch (error) {
        const errorInfo = handleApiError(error, 'validación de token');
        return { 
            valid: false, 
            error: errorInfo.message,
            errorType: errorInfo.error
        };
    }
}