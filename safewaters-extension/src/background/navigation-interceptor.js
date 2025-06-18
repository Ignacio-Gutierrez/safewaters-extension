// SafeWaters Navigation Interceptor
// Módulo dedicado para interceptar navegación directa (barra de direcciones)

import { getExtAPI } from '../utils/apis/ext-api.js';
import { getNavigationConfig } from './navigation-config.js';

class NavigationInterceptor {
    constructor(urlChecker, isDev = false) {
        this.extAPI = getExtAPI();
        this.checkUrl = urlChecker;
        this.config = getNavigationConfig(isDev);
        this.disabled = false;
        this.initialize();
    }

    initialize() {
        this.setupNavigationListener();
        this.config.log('Navigation interceptor initialized');
    }

    setupNavigationListener() {
        // Usar webNavigation.onCommitted para interceptar navegación después de que inicia
        // pero antes de que la página se cargue completamente
        this.extAPI.webNavigation.onCommitted.addListener(
            this.handleNavigation.bind(this)
        );
        this.config.log('webNavigation.onCommitted listener configured');
    }

    async handleNavigation(details) {
        // Verificar si está deshabilitado
        if (this.disabled) {
            this.config.log('Navigation interceptor disabled, ignoring', 'debug');
            return;
        }

        this.config.log('Navigation interceptor triggered', 'debug', {
            url: this.config.logging.includeUrls ? details.url : '[URL_HIDDEN]',
            tabId: details.tabId,
            frameId: details.frameId,
            transitionType: details.transitionType,
            transitionQualifiers: details.transitionQualifiers
        });

        // Solo procesar navegación principal (frame principal)
        if (details.frameId !== 0) {
            return;
        }

        // Verificar si es navegación directa (usuario escribió URL)
        const isDirectNavigation = this.isDirectNavigation(details);
        
        if (!isDirectNavigation) {
            this.config.log('Ignoring non-direct navigation', 'debug');
            return;
        }

        // Aplicar filtros de exclusión usando configuración
        if (this.shouldIgnoreNavigation(details.url)) {
            return;
        }

        this.config.log('Processing DIRECT navigation', 'warn', {
            url: this.config.logging.includeUrls ? details.url : '[URL_HIDDEN]',
            transitionType: details.transitionType
        });

        // SIN delay para navegación directa - procesamiento inmediato
        // if (this.config.timing.navigationDelay > 0) {
        //     await new Promise(resolve => setTimeout(resolve, this.config.timing.navigationDelay));
        // }

        try {
            // Verificar URL usando el checker proporcionado
            const result = await this.checkUrl(details.url);
            
            this.config.log('Navigation check result', 'debug', {
                hasResult: !!result,
                needsConfiguration: result?.needsConfiguration,
                isBlocked: result?.is_blocked_by_user_rule,
                isMalicious: result?.malicious
            });
            
            // Procesar resultado y tomar acción si es necesario
            await this.processNavigationResult(details, result);
            
        } catch (error) {
            this.config.log('Error checking navigation', 'error', error);
            // En caso de error de API, mostrar página de incertidumbre
            this.redirectToUncertain(details.url, details.tabId, 'Error de conexión con la API');
        }
    }

    shouldIgnoreNavigation(url) {
        // Usar configuración centralizada para determinar si ignorar
        if (this.config.shouldIgnore(url)) {
            this.config.log('Ignoring URL due to configured patterns', 'debug');
            return true;
        }

        // Ignorar navegación a páginas internas de la extensión
        if (url.startsWith(this.extAPI.runtime.getURL(''))) {
            this.config.log('Ignoring extension page', 'debug');
            return true;
        }

        // Ignorar nuestras propias páginas de bloqueo/advertencia (data URLs y extension pages)
        if (url.startsWith('data:text/html;charset=utf-8,') && url.includes('SafeWaters')) {
            this.config.log('Ignoring SafeWaters block/warning page (data URL)', 'debug');
            return true;
        }
        
        // Ignorar páginas de bloqueo y advertencia de la extensión
        if (url.includes('/blocked/blocked.html') || url.includes('/warning/warning.html') || url.includes('/uncertain/uncertain.html')) {
            this.config.log('Ignoring SafeWaters block/warning/uncertain page (extension page)', 'debug');
            return true;
        }

        // Validar que es una URL HTTP/HTTPS válida (si está habilitado)
        if (this.config.features.enableUrlValidation) {
            try {
                const urlObj = new URL(url);
                if (!urlObj.protocol.startsWith('http')) {
                    this.config.log('Ignoring non-HTTP URL', 'debug');
                    return true;
                }
            } catch (e) {
                this.config.log('Invalid URL format, ignoring', 'debug');
                return true;
            }
        }

        return false;
    }

    isDirectNavigation(details) {
        // Detectar si es navegación directa basándose en transitionType
        const directTransitionTypes = [
            'typed',        // Usuario escribió la URL
            'generated',    // URL generada por script (a veces búsquedas)
            'auto_bookmark' // Bookmark o URL sugerida
        ];

        // Verificar transition type principal
        if (directTransitionTypes.includes(details.transitionType)) {
            return true;
        }

        // Verificar qualifiers adicionales que indican navegación directa
        if (details.transitionQualifiers) {
            const directQualifiers = ['from_address_bar'];
            return details.transitionQualifiers.some(q => directQualifiers.includes(q));
        }

        return false;
    }

    async processNavigationResult(details, result) {
        // Solo bloquear/advertir si hay problemas de seguridad
        if (result && (result.needsConfiguration || result.is_blocked_by_user_rule || result.malicious)) {
            this.config.log('🚫 BLOCKING direct navigation due to security issues', 'error', {
                url: this.config.logging.includeUrls ? details.url : '[URL_HIDDEN]',
                reasons: {
                    needsConfiguration: !!result.needsConfiguration,
                    is_blocked_by_user_rule: !!result.is_blocked_by_user_rule,
                    malicious: !!result.malicious
                },
                info: result.info || 'No additional info',
                tabId: details.tabId
            });
            
            // Determinar tipo de redirección necesaria
            const redirectUrl = this.createRedirectUrl(details.url, result);
            
            this.config.log('🔧 DEBUG: Redirect URL created', 'warn', {
                redirectUrlLength: redirectUrl.length,
                redirectUrlStart: redirectUrl.substring(0, 150),
                resultType: result.needsConfiguration ? 'CONFIG' : 
                           result.is_blocked_by_user_rule ? 'BLOCKED' : 'WARNING'
            });
            
            // Redirigir INMEDIATAMENTE sin delay
            this.config.log('🔄 Redirecting tab immediately', 'warn', {
                tabId: details.tabId,
                from: this.config.logging.includeUrls ? details.url : '[URL_HIDDEN]',
                toType: result.needsConfiguration ? 'CONFIGURATION' : 
                        result.is_blocked_by_user_rule ? 'BLOCKED' : 'WARNING',
                redirectUrl: redirectUrl.substring(0, 100) + '...'
            });
            
            try {
                // Verificar que la pestaña aún existe antes de redirigir
                this.config.log('🔧 DEBUG: Checking tab before redirect', 'warn', {
                    tabId: details.tabId
                });
                
                const tab = await this.extAPI.tabs.get(details.tabId);
                this.config.log('🔧 DEBUG: Tab found, proceeding with redirect', 'warn', {
                    tabId: details.tabId,
                    currentUrl: tab.url,
                    tabStatus: tab.status
                });
                
                // Usar chrome.tabs.update para redirigir inmediatamente
                await this.extAPI.tabs.update(details.tabId, { 
                    url: redirectUrl
                });
                
                this.config.log('✅ Tab redirected successfully', 'info', {
                    tabId: details.tabId,
                    success: true
                });
                
            } catch (error) {
                this.config.log('❌ Failed to redirect tab', 'error', {
                    tabId: details.tabId,
                    error: error.message || String(error),
                    errorName: error.name,
                    attempting: 'fallback redirect'
                });
                
                // Fallback: intentar cerrar y abrir nueva pestaña
                try {
                    this.config.log('🔧 DEBUG: Attempting fallback redirect', 'warn', {
                        method: 'create_new_and_close_old'
                    });
                    
                    // Primero obtener información de la pestaña actual
                    const currentTab = await this.extAPI.tabs.get(details.tabId);
                    
                    // Crear nueva pestaña en la misma posición
                    const newTab = await this.extAPI.tabs.create({ 
                        url: redirectUrl,
                        index: currentTab.index,
                        active: currentTab.active
                    });
                    
                    // Esperar un momento antes de cerrar la pestaña original
                    setTimeout(async () => {
                        try {
                            await this.extAPI.tabs.remove(details.tabId);
                            this.config.log('✅ Fallback redirect successful', 'info', {
                                method: 'create_new_tab_and_remove_old',
                                newTabId: newTab.id,
                                removedTabId: details.tabId
                            });
                        } catch (closeError) {
                            this.config.log('⚠️ Could not close original tab, but redirect succeeded', 'warn', {
                                newTabId: newTab.id,
                                originalTabId: details.tabId,
                                closeError: closeError.message
                            });
                        }
                    }, 100);
                    
                } catch (fallbackError) {
                    this.config.log('❌ Fallback redirect also failed', 'error', {
                        fallbackError: fallbackError.message || String(fallbackError),
                        fallbackErrorName: fallbackError.name,
                        originalError: error.message || String(error),
                        tabId: details.tabId
                    });
                }
            }
            
        } else {
            this.config.log('✅ Direct navigation allowed - URL is safe', 'info', {
                url: this.config.logging.includeUrls ? details.url : '[URL_HIDDEN]',
                tabId: details.tabId,
                reason: 'passed_security_check'
            });
        }
    }

    createRedirectUrl(originalUrl, result) {
        if (result.needsConfiguration) {
            return this.extAPI.runtime.getURL('src/pages/welcome/welcome.html');
        } else if (result.is_blocked_by_user_rule) {
            return this.createBlockedPageUrl(originalUrl, result.info || 'Bloqueado por reglas del perfil');
        } else if (result.malicious) {
            return this.createWarningPageUrl(originalUrl, result.info || 'Sitio potencialmente malicioso');
        } else if (result.uncertain) {
            return this.createUncertainPageUrl(originalUrl, result.info || 'No se pudo verificar la seguridad del sitio');
        }
        
        // Fallback - no debería llegar aquí
        return this.extAPI.runtime.getURL('src/pages/welcome/welcome.html');
    }

    // Función para crear URL de página de bloqueo usando extension page
    createBlockedPageUrl(originalUrl, reason) {
        const baseUrl = this.extAPI.runtime.getURL('src/pages/blocked/blocked.html');
        const params = new URLSearchParams({
            url: originalUrl,
            reason: reason
        });
        return `${baseUrl}?${params.toString()}`;
    }

    // Función para crear URL de página de advertencia usando extension page
    createWarningPageUrl(originalUrl, reason) {
        const baseUrl = this.extAPI.runtime.getURL('src/pages/warning/warning.html');
        const params = new URLSearchParams({
            url: originalUrl,
            reason: reason
        });
        return `${baseUrl}?${params.toString()}`;
    }

    // Función para crear URL de página de sitio incierto usando extension page
    createUncertainPageUrl(originalUrl, reason) {
        const baseUrl = this.extAPI.runtime.getURL('src/pages/uncertain/uncertain.html');
        const params = new URLSearchParams({
            url: originalUrl,
            reason: reason
        });
        return `${baseUrl}?${params.toString()}`;
    }

    // Función específica para redirigir a página de incertidumbre en caso de error
    async redirectToUncertain(originalUrl, tabId, reason) {
        try {
            const redirectUrl = this.createUncertainPageUrl(originalUrl, reason);
            
            this.config.log('🔄 Redirecting to uncertain page due to API error', 'warn', {
                tabId: tabId,
                from: this.config.logging.includeUrls ? originalUrl : '[URL_HIDDEN]',
                reason: reason
            });

            // Verificar que la pestaña aún existe antes de redirigir
            const tab = await this.extAPI.tabs.get(tabId);
            if (tab) {
                await this.extAPI.tabs.update(tabId, { url: redirectUrl });
                this.config.log('Successfully redirected to uncertain page', 'info', { tabId });
            }
        } catch (error) {
            this.config.log('Error redirecting to uncertain page', 'error', error);
            // Si no podemos redirigir, al menos loggeamos el error
        }
    }

    // Método para agregar patrones de búsqueda personalizados
    addSearchPattern(pattern) {
        if (!this.config.searchPatterns.includes(pattern)) {
            this.config.searchPatterns.push(pattern);
            this.config.log('Added search pattern', 'info', { pattern });
        }
    }

    // Método para remover patrones de búsqueda
    removeSearchPattern(pattern) {
        const index = this.config.searchPatterns.indexOf(pattern);
        if (index > -1) {
            this.config.searchPatterns.splice(index, 1);
            this.config.log('Removed search pattern', 'info', { pattern });
        }
    }

    // Método para desactivar temporalmente la interceptación
    disable() {
        this.disabled = true;
        this.config.log('Navigation interceptor disabled', 'warn');
    }

    enable() {
        this.disabled = false;
        this.config.log('Navigation interceptor enabled', 'info');
    }

    // Estado actual del interceptor
    isEnabled() {
        return !this.disabled;
    }

    // Método para actualizar configuración en tiempo real
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.config.log('Configuration updated', 'info');
    }

    // Método para obtener estadísticas
    getStats() {
        return {
            enabled: this.isEnabled(),
            searchPatternsCount: this.config.searchPatterns.length,
            specialProtocolsCount: this.config.specialProtocols.length,
            features: this.config.features
        };
    }
}

export { NavigationInterceptor };
