// SafeWaters Extension Background Script
import { validateToken } from '../utils/apis/api-client.js';
import { getExtAPI } from '../utils/apis/ext-api.js';

console.log('SafeWaters background script loaded');

// Inicializar API
const extAPI = getExtAPI();

// Abrir página de bienvenida al instalar la extensión
extAPI.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // Primera instalación - abrir página de bienvenida
        extAPI.tabs.create({
            url: extAPI.runtime.getURL('src/pages/welcome/welcome.html')
        });
    } else if (details.reason === 'update') {
        // Actualización - verificar si necesita reconfiguración
        checkConfigurationAfterUpdate();
    }
});

// Verificar configuración después de una actualización
async function checkConfigurationAfterUpdate() {
    try {
        const result = await extAPI.storage.get(['profileToken']);
        console.log('SafeWaters: Checking stored token');
        
        if (!result.profileToken) {
            // Si no tiene token, abrir página de bienvenida
            console.log('SafeWaters: No token found, opening welcome page');
            extAPI.tabs.create({
                url: extAPI.runtime.getURL('src/pages/welcome/welcome.html')
            });
        } else {
            // Token encontrado - mantener funcionando
            console.log('SafeWaters: Token found and persistent');
            
            // Solo validar si hay conectividad - no forzar si no hay API
            validateStoredToken(result.profileToken);
        }
    } catch (error) {
        console.error('Error checking configuration after update:', error);
    }
}

// Validar token almacenado usando el api-client
async function validateStoredToken(token) {
    console.log('Validating stored token...');
    
    const result = await validateToken(token);
    
    if (result.errorType === 'API_UNAVAILABLE') {
        // API no disponible - mantener configuración existente
        console.log('API not available - keeping existing configuration');
        return;
    }
    
    if (!result.valid) {
        console.log('Stored token is invalid, clearing configuration');
        // Token inválido - limpiar configuración y abrir bienvenida
        await extAPI.storage.remove(['profileToken']);
        extAPI.tabs.create({
            url: extAPI.runtime.getURL('src/pages/welcome/welcome.html')
        });
    } else {
        console.log('Stored token is valid');
    }
}

// Manejar mensajes de los content scripts
extAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkConfiguration') {
        checkConfiguration().then(sendResponse);
        return true; // Indica que la respuesta será asíncrona
    }
    
    if (request.action === 'validateToken') {
        validateToken(request.token).then(sendResponse);
        return true;
    }
    
    if (request.action === 'openWelcomePage') {
        extAPI.tabs.create({
            url: extAPI.runtime.getURL('src/pages/welcome/welcome.html')
        });
        sendResponse({ success: true });
    }
});

// Función para verificar configuración (usada por content scripts)
async function checkConfiguration() {
    try {
        const result = await extAPI.storage.get(['profileToken']);
        
        const hasToken = !!(result.profileToken);
        
        return {
            configured: hasToken,
            hasToken: hasToken
        };
    } catch (error) {
        console.error('Error checking configuration:', error);
        return {
            configured: false,
            hasToken: false
        };
    }
}

// Limpiar configuración (función de utilidad)
async function clearConfiguration() {
    try {
        await extAPI.storage.remove(['profileToken']);
        console.log('Token cleared');
    } catch (error) {
        console.error('Error clearing token:', error);
    }
}

// Exponer función para debugging (solo en development)
if (extAPI.runtime.getManifest().version.includes('dev')) {
    extAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'clearConfiguration') {
            clearConfiguration().then(() => sendResponse({ success: true }));
            return true;
        }
    });
}
