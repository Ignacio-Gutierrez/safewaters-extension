// SafeWaters Background Script - Orquestador Principal
import { Logger, CONFIG } from '../utils/config.js';
import { ClickInterceptor } from './interceptors/click-interceptor.js';
import { NavigationInterceptor } from './interceptors/navigation-interceptor.js';

Logger.info('SafeWaters Background Script iniciado');

class SafeWatersOrchestrator {
    constructor() {
        this.interceptors = {
            click: new ClickInterceptor(),
            navigation: new NavigationInterceptor()
            // contextMenu: new ContextMenuInterceptor() // TODO: implementar después
        };
        
        this.stats = {
            clicksProcessed: 0,
            navigationsProcessed: 0,
            contextMenusProcessed: 0
        };
        
        this.init();
    }
    
    init() {
        Logger.info('Inicializando orquestador SafeWaters');
        
        // Configurar event listeners
        this.setupMessageListener();
        this.setupInstallListener();
        this.setupCleanupTimer();
        
        // Inicializar interceptores
        this.interceptors.navigation.init();
        // this.interceptors.contextMenu.init(); // TODO: cuando se implemente
        
        Logger.info('Orquestador SafeWaters inicializado correctamente');
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            Logger.debug('Mensaje recibido', { action: request.action, sender: sender.tab?.id });
            
            // Manejar diferentes tipos de mensajes
            switch (request.action) {
                case 'checkClickUrl':
                    this.handleClickCheck(request, sender, sendResponse);
                    return true; // Mantener canal abierto
                    
                case 'popupResponse':
                    this.handlePopupResponse(request, sender, sendResponse);
                    return true;
                
                case 'approveNavigation':
                    this.handleNavigationApproval(request, sender, sendResponse);
                    return true;
                
                case 'openWelcomePage':
                    this.handleOpenWelcomePage(request, sender, sendResponse);
                    return true;
                    
                case 'getConfig':
                    sendResponse({ success: true, config: CONFIG });
                    break;
                    
                case 'getStats':
                    sendResponse({ success: true, stats: this.getStats() });
                    break;
                    
                default:
                    Logger.warn('Acción desconocida', { action: request.action });
                    sendResponse({ success: false, error: 'Acción desconocida' });
            }
        });
    }
    
    setupInstallListener() {
        chrome.runtime.onInstalled.addListener((details) => {
            Logger.info('Extensión instalada/actualizada', details);
            
            if (details.reason === 'install') {
                // Primera instalación - mostrar página de bienvenida
                chrome.tabs.create({
                    url: chrome.runtime.getURL('src/pages/welcome/welcome.html')
                });
                Logger.info('Página de bienvenida abierta para nueva instalación');
            }
        });
    }
    
    setupCleanupTimer() {
        // Limpiar datos antiguos cada 2 minutos
        setInterval(() => {
            try {
                Object.values(this.interceptors).forEach(interceptor => {
                    if (interceptor.cleanup) {
                        interceptor.cleanup();
                    }
                });
                Logger.debug('Limpieza periódica completada');
            } catch (error) {
                Logger.error('Error en limpieza periódica', { error: error.message });
            }
        }, CONFIG.timeouts.cleanupInterval);
    }
    
    async handleClickCheck(request, sender, sendResponse) {
        try {
            this.stats.clicksProcessed++;
            
            const result = await this.interceptors.click.handleClick({
                url: request.url,
                tabId: sender.tab.id
            });
            
            Logger.debug('Click procesado', { url: request.url, result });
            sendResponse({ success: true, result });
            
        } catch (error) {
            Logger.error('Error procesando click', { url: request.url, error: error.message });
            sendResponse({ 
                success: false, 
                error: error.message,
                fallback: { action: 'allow' } // Permitir navegación como fallback
            });
        }
    }
    
    async handlePopupResponse(request, sender, sendResponse) {
        try {
            const popupInfo = await this.interceptors.click.handlePopupResponse({
                popupId: request.popupId,
                action: request.userAction,
                url: request.url,
                tabId: sender.tab.id
            });
            
            // Si el usuario eligió proceder, pre-aprobar la URL en el navigation interceptor
            if (request.userAction === 'proceed' && popupInfo && popupInfo.url) {
                Logger.debug('Usuario eligió proceder desde popup, pre-aprobando URL', { 
                    url: popupInfo.url, 
                    tabId: sender.tab.id 
                });
                
                // Pre-aprobar la URL para evitar que el navigation interceptor la bloquee
                this.interceptors.navigation.approveUserNavigation(popupInfo.url);
                
                // Ahora navegar a la URL
                await chrome.tabs.update(sender.tab.id, { url: popupInfo.url });
                Logger.debug('Navegación ejecutada después de aprobación de popup', { url: popupInfo.url });
            }
            
            Logger.debug('Respuesta de popup procesada', request);
            sendResponse({ success: true });
            
        } catch (error) {
            Logger.error('Error procesando respuesta de popup', { error: error.message });
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleNavigationApproval(request, sender, sendResponse) {
        try {
            const { url } = request;
            
            if (!url) {
                throw new Error('URL requerida para aprobación de navegación');
            }
            
            // Aprobar la navegación en el interceptor
            const approved = this.interceptors.navigation.approveUserNavigation(url);
            
            if (approved) {
                Logger.debug('Navegación aprobada por usuario', { url, tabId: sender.tab.id });
                
                // Navegar directamente a la URL
                await chrome.tabs.update(sender.tab.id, { url: url });
                
                sendResponse({ success: true, message: 'Navegación aprobada y ejecutada' });
            } else {
                throw new Error('Error aprobando navegación');
            }
            
        } catch (error) {
            Logger.error('Error procesando aprobación de navegación', { error: error.message });
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleOpenWelcomePage(request, sender, sendResponse) {
        try {
            Logger.info('Solicitud para abrir página de bienvenida', { 
                updateToken: request.updateToken,
                sender: sender.tab?.id 
            });
            
            // Crear nueva pestaña con la página de bienvenida
            const welcomeUrl = chrome.runtime.getURL('src/pages/welcome/welcome.html');
            
            // Si es para actualizar token, siempre empezar desde step 1
            const queryParams = request.updateToken ? '?source=popup&update_token=true&step=1' : '';
            const fullUrl = welcomeUrl + queryParams;
            
            const tab = await chrome.tabs.create({ url: fullUrl });
            
            Logger.info('Página de bienvenida abierta', { 
                tabId: tab.id, 
                url: fullUrl,
                updateToken: request.updateToken,
                startFromStep1: request.updateToken 
            });
            
            sendResponse({ 
                success: true, 
                message: 'Página de bienvenida abierta correctamente',
                tabId: tab.id 
            });
            
        } catch (error) {
            Logger.error('Error abriendo página de bienvenida', { error: error.message });
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }
    
    getStats() {
        return {
            ...this.stats,
            interceptors: Object.fromEntries(
                Object.entries(this.interceptors).map(([key, interceptor]) => [
                    key, 
                    interceptor.getStats ? interceptor.getStats() : { active: 'unknown' }
                ])
            )
        };
    }
}

// Inicializar orquestador
const orchestrator = new SafeWatersOrchestrator();

// Exportar para testing si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = orchestrator;
}
