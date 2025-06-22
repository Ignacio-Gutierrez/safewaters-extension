// SafeWaters Click Interceptor - Maneja clicks en enlaces y decide si mostrar popups
import { Logger, CONFIG, Validator } from '../../utils/config.js';
import { testUrl } from '../../utils/apis/api-client.js';
import { PopupHandler } from '../handlers/popup-handler.js';

export class ClickInterceptor {
    constructor() {
        this.popupHandler = new PopupHandler();
        this.activeChecks = new Map();
        this.stats = {
            clicksProcessed: 0,
            popupsShown: 0,
            allowedDirectly: 0
        };
    }

    async handleClick(options) {
        const { url, tabId } = options;
        
        Logger.debug('Procesando click', { url, tabId });
        this.stats.clicksProcessed++;

        // Verificar si debemos ignorar esta URL
        if (Validator.shouldIgnoreUrl(url)) {
            Logger.debug('URL ignorada', { url });
            return { action: 'allow' };
        }

        // Evitar verificaciones duplicadas
        const checkKey = `${tabId}-${url}`;
        if (this.activeChecks.has(checkKey)) {
            Logger.debug('Click ya siendo procesado', { url });
            return { action: 'allow' };
        }

        this.activeChecks.set(checkKey, Date.now());

        try {
            // Verificar URL con la API
            const securityResult = await this.checkUrlSecurity(url);
            
            // Procesar resultado
            const decision = this.makeDecision(securityResult, url);
            
            if (decision.showPopup) {
                // Mostrar popup inmediatamente
                await this.showSecurityPopup(tabId, url, decision);
                this.stats.popupsShown++;
                // Retornar que se está mostrando popup (no permitir navegación automática)
                return { action: 'popup', popupType: decision.type, popupShown: true };
            } else if (decision.redirect) {
                // Redirigir para configuración
                return { action: 'redirect', redirectUrl: decision.redirectUrl };
            } else {
                // Permitir navegación directa
                this.stats.allowedDirectly++;
                return { action: 'allow' };
            }

        } catch (error) {
            Logger.error('Error procesando click', { url, error: error.message });
            return { action: 'allow' }; // Fallback seguro
        } finally {
            this.activeChecks.delete(checkKey);
        }
    }

    async checkUrlSecurity(url) {
        try {
            const token = await this.getStoredToken();
            
            if (!token) {
                Logger.warn('Sin token para verificación');
                return { 
                    safe: false, 
                    needsConfiguration: true,
                    reason: 'Extensión no configurada' 
                };
            }

            const result = await testUrl(url, token);
            
            Logger.debug('Resultado de verificación API', { url, result });
            
            return {
                safe: !result.is_blocked_by_user_rule && !result.malicious,
                blocked: result.is_blocked_by_user_rule === true,
                malicious: result.malicious === true,
                reason: result.blocking_rule_details || result.info || 'Verificación de seguridad',
                needsConfiguration: false,
                apiData: result
            };

        } catch (error) {
            Logger.error('Error en verificación API', { url, error: error.message });
            
            return {
                safe: false,
                uncertain: true,
                reason: 'No se pudo verificar la seguridad del enlace',
                apiError: true
            };
        }
    }

    makeDecision(securityResult, url) {
        // Si necesita configuración, redirigir
        if (securityResult.needsConfiguration) {
            return {
                showPopup: false,
                redirect: true,
                redirectUrl: chrome.runtime.getURL('src/pages/welcome/welcome.html')
            };
        }

        // Si es segura, permitir directamente
        if (securityResult.safe) {
            return { showPopup: false };
        }

        // Determinar tipo de popup usando CONFIG
        let popupType;
        if (securityResult.blocked) {
            popupType = CONFIG.securityStatus.BLOCKED;
        } else if (securityResult.malicious) {
            popupType = CONFIG.securityStatus.MALICIOUS;
        } else if (securityResult.uncertain || securityResult.apiError) {
            popupType = CONFIG.securityStatus.UNCERTAIN;
        } else {
            popupType = CONFIG.securityStatus.UNCERTAIN; // Fallback
        }

        return {
            showPopup: true,
            type: popupType,
            message: securityResult.reason || 'Se requiere verificación de seguridad',
            canProceed: popupType !== CONFIG.securityStatus.BLOCKED // Solo blocked no permite continuar
        };
    }

    async showSecurityPopup(tabId, url, decision) {
        try {
            const popupId = await this.popupHandler.showPopup({
                type: decision.type,
                message: decision.message,
                url: url,
                tabId: tabId
            });

            Logger.debug('Popup mostrado', { popupId, type: decision.type, url });
            return popupId;

        } catch (error) {
            Logger.error('Error mostrando popup', { error: error.message });
            throw error;
        }
    }

    async handlePopupResponse(options) {
        const { popupId, action, url, tabId } = options;
        
        Logger.debug('Procesando respuesta de popup', { popupId, action, url });

        // Delegar al popup handler
        const popupInfo = this.popupHandler.handlePopupResponse(popupId, action);
        
        if (!popupInfo) {
            Logger.warn('Información de popup no encontrada', { popupId });
            return null;
        }

        // Procesar acción del usuario
        switch (action) {
            case 'proceed':
                Logger.debug('Usuario eligió proceder', { url: popupInfo.url });
                // La navegación se maneja desde el background script
                break;
                
            case 'cancel':
                Logger.debug('Usuario canceló navegación', { url: popupInfo.url });
                // No hacer nada, mantener en la página actual
                break;
                
            case 'understood':
                Logger.debug('Usuario entendió el bloqueo', { url: popupInfo.url });
                // No hacer nada para URLs bloqueadas
                break;
                
            default:
                Logger.warn('Acción desconocida', { action });
        }
        
        // Retornar la información del popup para que el background script pueda usarla
        return popupInfo;
    }

    async getStoredToken() {
        try {
            const result = await chrome.storage.local.get(['profileToken']);
            return result.profileToken;
        } catch (error) {
            Logger.error('Error obteniendo token', { error: error.message });
            return null;
        }
    }

    cleanup(maxAge = 30000) {
        const now = Date.now();
        
        // Limpiar checks activos antiguos
        for (const [key, timestamp] of this.activeChecks.entries()) {
            if (now - timestamp > maxAge) {
                this.activeChecks.delete(key);
            }
        }

        // Limpiar popups del handler
        this.popupHandler.cleanup(maxAge);
        
        Logger.debug('Limpieza de click interceptor completada');
    }

    getStats() {
        return {
            ...this.stats,
            activeChecks: this.activeChecks.size,
            popupHandler: this.popupHandler.getStats()
        };
    }
}
