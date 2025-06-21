// SafeWaters Background Script - Orquestador Principal
import { Logger, CONFIG } from '../utils/config.js';
import { ClickInterceptor } from './interceptors/click-interceptor.js';

Logger.info('SafeWaters Background Script iniciado');

class SafeWatersOrchestrator {
    constructor() {
        this.interceptors = {
            click: new ClickInterceptor()
            // navigation: new NavigationInterceptor(), // TODO: implementar después
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
        
        // Inicializar interceptores (solo clicks por ahora)
        // this.interceptors.navigation.init(); // TODO: cuando se implemente
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
            
            Logger.info('Click procesado', { url: request.url, result });
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
            await this.interceptors.click.handlePopupResponse({
                popupId: request.popupId,
                action: request.userAction,
                url: request.url,
                tabId: sender.tab.id
            });
            
            Logger.info('Respuesta de popup procesada', request);
            sendResponse({ success: true });
            
        } catch (error) {
            Logger.error('Error procesando respuesta de popup', { error: error.message });
            sendResponse({ success: false, error: error.message });
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
