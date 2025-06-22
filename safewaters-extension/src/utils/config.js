// SafeWaters - Configuración compartida
export const API_BASE_URL = "http://127.0.0.1:8000";

export const CONFIG = {
    // Configuración de API
    api: {
        baseUrl: API_BASE_URL,
        timeout: 10000 // 10 segundos
    },
    
    // Configuración de logging
    logging: {
        enabled: true,
        level: 'warn' // Solo warnings y errors en producción (era 'info' para desarrollo)
    },
    
    // URLs que deben ignorarse
    ignoredUrls: [
        'chrome://',
        'chrome-extension://',
        'moz-extension://',
        'about:',
        'data:',
        'blob:',
        'javascript:'
    ],
    
    // Configuración de timeouts
    timeouts: {
        popupShow: 30000,       // 30 segundos
        cleanupInterval: 120000 // 2 minutos
    },
    
    // Tipos de intercepción
    interceptionTypes: {
        CLICK: 'click',           // Clicks en enlaces -> popups
        NAVIGATION: 'navigation', // Barra navegación -> pages
        CONTEXT_MENU: 'context'   // Click derecho/nueva ventana -> pages
    },
    
    // Tipos de respuesta de seguridad
    securityStatus: {
        SAFE: 'safe',
        BLOCKED: 'blocked',
        WARNING: 'warning',
        UNCERTAIN: 'uncertain',
        MALICIOUS: 'malicious',
        ERROR: 'error'
    }
};

/**
 * Utilidad de logging
 */
export class Logger {
    static log(message, level = 'info', data = null) {
        if (!CONFIG.logging.enabled) return;
        
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(CONFIG.logging.level);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex >= currentLevelIndex) {
            const timestamp = new Date().toISOString();
            const prefix = `[SafeWaters ${timestamp}] ${level.toUpperCase()}:`;
            
            if (data) {
                console[level](prefix, message, data);
            } else {
                console[level](prefix, message);
            }
        }
    }
    
    static debug(message, data) { this.log(message, 'debug', data); }
    static info(message, data) { this.log(message, 'info', data); }
    static warn(message, data) { this.log(message, 'warn', data); }
    static error(message, data) { this.log(message, 'error', data); }
}

/**
 * Utilidades de validación
 */
export class Validator {
    static shouldIgnoreUrl(url) {
        if (!url || typeof url !== 'string') return true;
        
        return CONFIG.ignoredUrls.some(ignored => url.startsWith(ignored));
    }
    
    static extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (error) {
            Logger.warn('Error extracting domain', { url, error: error.message });
            return url;
        }
    }
    
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}