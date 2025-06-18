// SafeWaters Navigation Configuration
// Configuraciones centralizadas para el interceptor de navegación

export const NavigationConfig = {
    // Patrones de búsqueda que deben ser ignorados
    searchPatterns: [
        'google.com/search',
        'bing.com/search', 
        'duckduckgo.com/',
        'search.yahoo.com',
        '/search?',
        'yandex.com/search',
        'baidu.com/s?',
        'ecosia.org/search',
        'startpage.com/search',
        'searx.org/search'
    ],

    // Protocolos especiales que deben ser ignorados
    specialProtocols: [
        'chrome://',
        'edge://',
        'about:',
        'moz-extension://',
        'chrome-extension://',
        'data:',
        'blob:',
        'file:',
        'ftp:'
    ],

    // Dominios de navegadores que deben ser ignorados
    browserDomains: [
        'chrome.google.com',
        'microsoftedge.microsoft.com',
        'addons.mozilla.org',
        'chrome.google.com/webstore'
    ],

    // Dominios confiables que no necesitan verificación
    trustedDomains: [
        'google.com',
        'www.google.com',
        'gmail.com',
        'youtube.com',
        'www.youtube.com',
        'github.com',
        'www.github.com',
        'stackoverflow.com',
        'www.stackoverflow.com',
        'microsoft.com',
        'www.microsoft.com',
        'apple.com',
        'www.apple.com',
        'wikipedia.org',
        'www.wikipedia.org',
        'mozilla.org',
        'www.mozilla.org'
    ],

    // Configuración de timeouts y delays
    timing: {
        navigationDelay: 0,        // Sin delay para navegación directa  
        redirectDelay: 0,          // Sin delay para redirección inmediata
        fallbackTimeout: 3000      // ms timeout reducido para verificaciones API
    },

    // Configuración de UI
    ui: {
        blockedPageColors: {
            primary: '#ff4757',
            secondary: '#ff3742'
        },
        warningPageColors: {
            primary: '#ff6b35', 
            secondary: '#ff8c42'
        },
        defaultPageColors: {
            primary: '#007acc',
            secondary: '#005fa3'
        }
    },

    // Configuración de logging
    logging: {
        enabled: true,
        verbose: true,            // logs extra detallados activados por defecto
        includeUrls: true,        // incluir URLs en logs
        includeTimestamps: true   // incluir timestamps
    },

    // Feature flags
    features: {
        enableSearchDetection: true,
        enableBrowserPageDetection: true,
        enableUrlValidation: true,
        enableFallbackRedirect: true,
        enableDebugMode: false
    },

    // Métodos helper para validaciones
    isSearchUrl(url) {
        return this.searchPatterns.some(pattern => url.includes(pattern));
    },

    isSpecialProtocol(url) {
        return this.specialProtocols.some(protocol => url.startsWith(protocol));
    },

    isBrowserDomain(url) {
        try {
            const urlObj = new URL(url);
            return this.browserDomains.some(domain => urlObj.hostname.includes(domain));
        } catch (e) {
            return false;
        }
    },

    isTrustedDomain(url) {
        try {
            const urlObj = new URL(url);
            return this.trustedDomains.some(domain => 
                urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
            );
        } catch (e) {
            return false;
        }
    },

    shouldIgnore(url) {
        return this.isSearchUrl(url) || 
               this.isSpecialProtocol(url) || 
               this.isBrowserDomain(url) ||
               this.isTrustedDomain(url);
    },

    log(message, level = 'info', data = null) {
        if (!this.logging.enabled) return;

        const prefix = 'SafeWaters Navigation:';
        const timestamp = this.logging.includeTimestamps ? new Date().toISOString() : '';
        
        const logMessage = `${prefix} ${timestamp} ${message}`;
        
        // Formatear data si existe
        let formattedData = '';
        if (data !== null && data !== undefined) {
            try {
                if (typeof data === 'object') {
                    formattedData = JSON.stringify(data, null, 2);
                } else {
                    formattedData = String(data);
                }
            } catch (e) {
                formattedData = '[Data formatting failed]';
            }
        }
        
        switch (level) {
            case 'error':
                if (formattedData) {
                    console.error(logMessage + '\n' + formattedData);
                } else {
                    console.error(logMessage);
                }
                break;
            case 'warn':
                if (formattedData) {
                    console.warn(logMessage + '\n' + formattedData);
                } else {
                    console.warn(logMessage);
                }
                break;
            case 'debug':
                if (this.logging.verbose || this.features.enableDebugMode) {
                    if (formattedData) {
                        console.debug(logMessage + '\n' + formattedData);
                    } else {
                        console.debug(logMessage);
                    }
                }
                break;
            default:
                if (formattedData) {
                    console.log(logMessage + '\n' + formattedData);
                } else {
                    console.log(logMessage);
                }
        }
    }
};

// Configuración específica para desarrollo
export const DevConfig = {
    ...NavigationConfig,
    
    logging: {
        ...NavigationConfig.logging,
        verbose: true,
        enabled: true
    },
    
    features: {
        ...NavigationConfig.features,
        enableDebugMode: true
    },
    
    // URLs de test para desarrollo
    testUrls: {
        safe: 'https://example.com',
        malicious: 'https://malicious-site.test',
        blocked: 'https://blocked-site.test'
    }
};

// Función para obtener configuración según el entorno
export function getNavigationConfig(isDev = false) {
    return isDev ? DevConfig : NavigationConfig;
}
