// SafeWaters Navigation Interceptor - Intercepta navegación directa desde barra de direcciones
import { Logger, CONFIG, Validator } from '../../utils/config.js';
import { testUrl } from '../../utils/apis/api-client.js';
import { getExtAPI } from '../../utils/apis/ext-api.js';

export class NavigationInterceptor {
    constructor() {
        this.activeChecks = new Map();
        this.pendingNavigations = new Map();
        this.userApprovedUrls = new Map(); // URLs aprobadas temporalmente por el usuario
        this.stats = {
            navigationsProcessed: 0,
            pagesBlocked: 0,
            pagesRedirected: 0
        };
        this.initialized = false;
    }

    init() {
        if (this.initialized) {
            Logger.debug('Navigation interceptor ya inicializado');
            return;
        }

        try {
            // Interceptar antes de que la navegación inicie
            chrome.webNavigation.onBeforeNavigate.addListener(
                this.handleBeforeNavigate.bind(this),
                { url: [{ schemes: ['http', 'https'] }] }
            );

            // Interceptar cuando se confirma la navegación
            chrome.webNavigation.onCommitted.addListener(
                this.handleNavigationCommitted.bind(this),
                { url: [{ schemes: ['http', 'https'] }] }
            );

            // Limpiar navegaciones completadas
            chrome.webNavigation.onCompleted.addListener(
                this.handleNavigationCompleted.bind(this)
            );

            // Limpiar navegaciones con error
            chrome.webNavigation.onErrorOccurred.addListener(
                this.handleNavigationError.bind(this)
            );

            this.initialized = true;
            Logger.info('Navigation Interceptor inicializado correctamente');
            
        } catch (error) {
            Logger.error('Error inicializando Navigation Interceptor', { error: error.message });
        }
    }

    async handleBeforeNavigate(details) {
        const { url, tabId, frameId } = details;

        // Solo interceptar frame principal (no iframes)
        if (frameId !== 0) return;

        Logger.debug('Navegación interceptada antes de iniciar', { url, tabId });
        this.stats.navigationsProcessed++;

        // Verificar si debemos ignorar esta URL
        if (Validator.shouldIgnoreUrl(url) || this.isInternalPage(url) || this.isSearchEngine(url)) {
            Logger.debug('URL de navegación ignorada', { url });
            return;
        }

        // Verificar si el usuario ha confirmado la navegación a esta URL
        if (this.isUserApproved(url)) {
            Logger.info('URL aprobada por usuario detectada, permitiendo navegación', { url });
            this.clearUserApproval(url); // Limpiar la aprobación después de usarla
            return;
        }

        // Verificar que sea una URL válida (no búsquedas)
        if (!this.isDirectUrl(url)) {
            Logger.debug('URL ignorada - no es navegación directa', { url });
            return;
        }

        // Evitar verificaciones duplicadas
        const checkKey = `${tabId}-${url}`;
        if (this.activeChecks.has(checkKey) || this.pendingNavigations.has(checkKey)) {
            Logger.debug('Navegación ya siendo procesada', { url });
            return;
        }

        // Marcar como pendiente
        this.pendingNavigations.set(checkKey, {
            url,
            tabId,
            timestamp: Date.now(),
            status: 'checking'
        });

        try {
            // Verificar URL inmediatamente
            const securityResult = await this.checkUrlSecurity(url);
            const decision = this.makeNavigationDecision(securityResult, url);

            Logger.info('Decisión de navegación tomada', { url, decision });

            if (decision.block || decision.showPage) {
                // Bloquear navegación y mostrar página de seguridad
                await this.blockAndRedirect(tabId, url, decision);
                this.stats.pagesBlocked++;
            } else {
                // Permitir navegación
                Logger.debug('Navegación permitida', { url });
            }

        } catch (error) {
            Logger.error('Error verificando navegación', { url, error: error.message });
            // En caso de error, mostrar página de incertidumbre
            await this.showUncertainPage(tabId, url, 'Error de verificación');
        } finally {
            this.pendingNavigations.delete(checkKey);
        }
    }

    async handleNavigationCommitted(details) {
        const { url, tabId, frameId } = details;

        // Solo manejar frame principal
        if (frameId !== 0) return;

        const checkKey = `${tabId}-${url}`;
        const pendingNav = this.pendingNavigations.get(checkKey);

        if (pendingNav && pendingNav.status === 'checking') {
            Logger.debug('Navegación confirmada mientras se verificaba', { url, tabId });
            // La navegación se confirmó antes de que termináramos la verificación
            // Continuamos con la verificación pero ya no podemos bloquear
        }
    }

    handleNavigationCompleted(details) {
        const { url, tabId, frameId } = details;
        
        if (frameId !== 0) return;
        
        const checkKey = `${tabId}-${url}`;
        this.activeChecks.delete(checkKey);
        this.pendingNavigations.delete(checkKey);
        
        Logger.debug('Navegación completada, limpieza realizada', { url, tabId });
    }

    handleNavigationError(details) {
        const { url, tabId, frameId } = details;
        
        if (frameId !== 0) return;
        
        const checkKey = `${tabId}-${url}`;
        this.activeChecks.delete(checkKey);
        this.pendingNavigations.delete(checkKey);
        
        Logger.debug('Error en navegación, limpieza realizada', { url, tabId, error: details.error });
    }

    async checkUrlSecurity(url) {
        try {
            const token = await this.getStoredToken();
            
            if (!token) {
                Logger.warn('Sin token para verificación de navegación');
                return { 
                    safe: false, 
                    needsConfiguration: true,
                    reason: 'Extensión no configurada' 
                };
            }

            const result = await testUrl(url, token);
            
            Logger.debug('Resultado de verificación de navegación', { url, result });
            
            return {
                safe: !result.is_blocked_by_user_rule && !result.malicious,
                blocked: result.is_blocked_by_user_rule === true,
                malicious: result.malicious === true,
                reason: result.blocking_rule_details || result.info || 'Verificación de seguridad',
                needsConfiguration: false,
                apiData: result
            };

        } catch (error) {
            Logger.error('Error en verificación API de navegación', { url, error: error.message });
            
            return {
                safe: false,
                uncertain: true,
                reason: 'No se pudo verificar la seguridad del sitio',
                apiError: true
            };
        }
    }

    makeNavigationDecision(securityResult, url) {
        // Si necesita configuración, redirigir a welcome
        if (securityResult.needsConfiguration) {
            return {
                block: true,
                showPage: true,
                pageType: 'welcome',
                reason: 'Configuración requerida'
            };
        }

        // Si es segura, permitir navegación
        if (securityResult.safe) {
            return { 
                block: false,
                allow: true 
            };
        }

        // Determinar qué página mostrar según el tipo de problema
        let pageType;
        if (securityResult.blocked) {
            pageType = 'blocked';
        } else if (securityResult.malicious) {
            pageType = 'warning';
        } else if (securityResult.uncertain || securityResult.apiError) {
            pageType = 'uncertain';
        } else {
            pageType = 'uncertain'; // Fallback
        }

        return {
            block: true,
            showPage: true,
            pageType: pageType,
            reason: securityResult.reason || 'Verificación de seguridad requerida'
        };
    }

    async blockAndRedirect(tabId, originalUrl, decision) {
        try {
            let redirectUrl;
            const encodedUrl = encodeURIComponent(originalUrl);
            const encodedReason = encodeURIComponent(decision.reason);

            switch (decision.pageType) {
                case 'blocked':
                    redirectUrl = chrome.runtime.getURL('src/pages/blocked/blocked.html') + 
                                 `?url=${encodedUrl}&reason=${encodedReason}&source=navigation`;
                    break;
                
                case 'warning':
                    const domain = Validator.extractDomain(originalUrl);
                    redirectUrl = chrome.runtime.getURL('src/pages/warning/warning.html') + 
                                 `?url=${encodedUrl}&domain=${encodeURIComponent(domain)}&reason=${encodedReason}&source=navigation`;
                    break;
                
                case 'uncertain':
                    redirectUrl = chrome.runtime.getURL('src/pages/uncertain/uncertain.html') + 
                                 `?url=${encodedUrl}&reason=${encodedReason}&source=navigation`;
                    break;
                
                case 'welcome':
                    redirectUrl = chrome.runtime.getURL('src/pages/welcome/welcome.html') + 
                                 `?source=navigation&return_url=${encodedUrl}`;
                    break;
                
                default:
                    redirectUrl = chrome.runtime.getURL('src/pages/uncertain/uncertain.html') + 
                                 `?url=${encodedUrl}&reason=Error de verificación&source=navigation`;
            }

            // Redirigir la pestaña
            await chrome.tabs.update(tabId, { url: redirectUrl });
            this.stats.pagesRedirected++;
            
            Logger.info('Navegación bloqueada y redirigida', { 
                originalUrl, 
                redirectUrl, 
                pageType: decision.pageType 
            });

        } catch (error) {
            Logger.error('Error redirigiendo navegación bloqueada', { 
                tabId, 
                originalUrl, 
                error: error.message 
            });
        }
    }

    async showUncertainPage(tabId, originalUrl, reason) {
        const encodedUrl = encodeURIComponent(originalUrl);
        const encodedReason = encodeURIComponent(reason);
        
        const redirectUrl = chrome.runtime.getURL('src/pages/uncertain/uncertain.html') + 
                           `?url=${encodedUrl}&reason=${encodedReason}&source=navigation`;
        
        try {
            await chrome.tabs.update(tabId, { url: redirectUrl });
            Logger.info('Página de incertidumbre mostrada por error', { originalUrl, reason });
        } catch (error) {
            Logger.error('Error mostrando página de incertidumbre', { error: error.message });
        }
    }

    isInternalPage(url) {
        return url.startsWith(chrome.runtime.getURL(''));
    }

    isSearchEngine(url) {
        // Lista de motores de búsqueda populares que no deben interceptarse
        const searchEngines = [
            'google.com/search', 
            'bing.com/search',
            'duckduckgo.com',
            'yahoo.com/search',
            'yandex.com/search',
            'baidu.com/s'
        ];
        
        return searchEngines.some(engine => url.includes(engine));
    }

    isDirectUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Ignorar URLs con parámetros de búsqueda típicos
            const searchParams = ['q', 'query', 'search', 's'];
            const hasSearchParams = searchParams.some(param => urlObj.searchParams.has(param));
            
            if (hasSearchParams) {
                Logger.debug('URL ignorada - contiene parámetros de búsqueda', { url });
                return false;
            }
            
            // Solo interceptar URLs que parecen ser navegación directa
            // (no contienen parámetros de búsqueda complejos)
            const paramCount = Array.from(urlObj.searchParams.keys()).length;
            if (paramCount > 3) {
                Logger.debug('URL ignorada - demasiados parámetros de URL', { url, paramCount });
                return false;
            }
            
            return true;
            
        } catch (error) {
            Logger.warn('Error validando URL directa', { url, error: error.message });
            return false;
        }
    }

    isUserApproved(url) {
        try {
            const normalizedUrl = this.normalizeUrl(url);
            return this.userApprovedUrls.has(normalizedUrl);
        } catch (error) {
            Logger.warn('Error verificando aprobación de usuario', { url, error: error.message });
            return false;
        }
    }

    approveUserNavigation(url) {
        try {
            const normalizedUrl = this.normalizeUrl(url);
            const approvalData = {
                timestamp: Date.now(),
                originalUrl: url
            };
            
            this.userApprovedUrls.set(normalizedUrl, approvalData);
            
            // Limpiar automáticamente después de 30 segundos
            setTimeout(() => {
                this.userApprovedUrls.delete(normalizedUrl);
            }, 30000);
            
            Logger.info('Navegación aprobada por usuario', { url, normalizedUrl });
            return true;
        } catch (error) {
            Logger.error('Error aprobando navegación de usuario', { url, error: error.message });
            return false;
        }
    }

    clearUserApproval(url) {
        try {
            const normalizedUrl = this.normalizeUrl(url);
            this.userApprovedUrls.delete(normalizedUrl);
            Logger.debug('Aprobación de usuario limpiada', { url, normalizedUrl });
        } catch (error) {
            Logger.warn('Error limpiando aprobación de usuario', { url, error: error.message });
        }
    }

    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            // Normalizar removiendo fragmentos y algunos parámetros comunes
            return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}`;
        } catch (error) {
            Logger.warn('Error normalizando URL', { url, error: error.message });
            return url;
        }
    }

    async getStoredToken() {
        try {
            const extAPI = getExtAPI();
            const result = await extAPI.storage.get(['profileToken']);
            return result.profileToken;
        } catch (error) {
            Logger.error('Error obteniendo token para navegación', { error: error.message });
            return null;
        }
    }

    cleanup(maxAge = 60000) { // 1 minuto para navegación
        const now = Date.now();
        
        // Limpiar checks activos antiguos
        for (const [key, timestamp] of this.activeChecks.entries()) {
            if (now - timestamp > maxAge) {
                this.activeChecks.delete(key);
            }
        }

        // Limpiar navegaciones pendientes antiguas
        for (const [key, navData] of this.pendingNavigations.entries()) {
            if (now - navData.timestamp > maxAge) {
                this.pendingNavigations.delete(key);
            }
        }

        // Limpiar URLs aprobadas por usuario (más agresivo, 30 segundos)
        const approvalMaxAge = 30000;
        for (const [url, approvalData] of this.userApprovedUrls.entries()) {
            if (now - approvalData.timestamp > approvalMaxAge) {
                this.userApprovedUrls.delete(url);
            }
        }
        
        Logger.debug('Limpieza de navigation interceptor completada');
    }

    getStats() {
        return {
            ...this.stats,
            activeChecks: this.activeChecks.size,
            pendingNavigations: this.pendingNavigations.size,
            userApprovedUrls: this.userApprovedUrls.size,
            initialized: this.initialized
        };
    }
}
