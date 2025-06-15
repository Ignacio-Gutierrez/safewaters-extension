// Content script simplificado que funciona sin imports problemáticos
console.log('SafeWaters: Content script loading...');

const SEVERITY = {
  SAFE: 'safe',
  MALICIOUS: 'malicious',
  UNCERTAIN: 'uncertain'
};

class SafeWatersController {
  constructor() {
    this.initialize();
  }

  initialize() {
    this.setupListeners();
    console.log("SafeWaters: Extension initialized and active");
  }

  setupListeners() {
    console.log("SafeWaters: Setting up click listeners");
    const boundClickHandler = this.handleLinkClick.bind(this);
    document.body.addEventListener('click', boundClickHandler, true);
    console.log("SafeWaters: Click listener added to document.body");
  }

  async handleLinkClick(event) {
    console.log('SafeWaters: Click detected on:', event.target);
    console.log('SafeWaters: Event type:', event.type);

    const linkElement = event.target.closest('a[href^="http"], a[href^="https"]');
    
    if (!linkElement) {
      console.log('SafeWaters: No link element found');
      return;
    }
    
    if (linkElement.classList.contains('safewaters-ignore-click')) {
      console.log('SafeWaters: Link ignored due to safewaters-ignore-click class');
      return;
    }

    console.log('SafeWaters: Link intercepted:', linkElement.href);
    event.preventDefault();

    const url = linkElement.href;
    
    try {
      const securityInfo = await this.getSecurityInfo(url);
      this.handleNavigation(url, securityInfo);
    } catch (error) {
      console.error('SafeWaters: Error analyzing URL:', error);
      this.handleError(url, error);
    }
  }

  async getSecurityInfo(url) {
    console.log('SafeWaters: Requesting security check via background script');
    
    try {
      // Enviar mensaje al background script para verificar la URL
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'checkUrl',
          url: url
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return this.processApiResult(url, response.data);
    } catch (error) {
      console.error('SafeWaters: Error getting security info via background:', error);
      throw error;
    }
  }

  processApiResult(url, data) {
    const domain = this.extractDomain(url);
    let severity = SEVERITY.SAFE;
    
    if (data.malicious) {
      severity = SEVERITY.MALICIOUS;
    }

    return {
      url: url,
      domain: data.domain || domain,
      info: data.info || 'No additional information available',
      source: data.source || 'Unknown',
      malicious: data.malicious || false,
      severity: severity
    };
  }

  handleNavigation(url, securityInfo) {
    if (securityInfo.severity === SEVERITY.SAFE) {
      console.log('SafeWaters: URL deemed safe, redirecting');
      window.location.href = url;
      return;
    }

    console.log(`SafeWaters: Showing warning popup for ${securityInfo.severity} URL`);
    
    const enhancedInfo = {
      ...securityInfo,
      info: securityInfo.source ? 
        `${securityInfo.info} (Source: ${securityInfo.source})` : 
        securityInfo.info
    };

    this.showSecurityPopup(url, enhancedInfo, () => {
      window.location.href = url;
    }, () => {
      // Usuario canceló la navegación
    });
  }

  handleError(url, error) {
    const domain = this.extractDomain(url);
    
    this.showSecurityPopup(url, {
      domain: domain,
      info: 'No se pudo verificar la seguridad de este enlace debido a un error. Proceda con precaución.',
      severity: SEVERITY.UNCERTAIN
    }, () => {
      window.location.href = url;
    }, () => {
      // Usuario canceló la navegación
    });
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error('SafeWaters: Error extracting domain:', error);
      return url;
    }
  }

  // Mostrar popup usando el sistema modular existente
  async showSecurityPopup(url, securityInfo, onConfirm, onCancel) {
    try {
      // Importar dinámicamente el módulo del popup para evitar problemas de ES6
      const popupModule = await this.loadPopupModule();
      
      if (popupModule && popupModule.show) {
        // Usar el sistema de popup modular existente
        popupModule.show(url, securityInfo, onConfirm, onCancel);
      } else {
        // Fallback a popup inline si no se puede cargar el módulo
        this.showFallbackPopup(url, securityInfo, onConfirm, onCancel);
      }
    } catch (error) {
      console.warn('SafeWaters: Could not load popup module, using fallback:', error);
      this.showFallbackPopup(url, securityInfo, onConfirm, onCancel);
    }
  }

  // Cargar el módulo del popup dinámicamente
  async loadPopupModule() {
    try {
      // Intentar cargar el módulo usando import() dinámico
      const baseUrl = chrome.runtime.getURL('');
      const moduleUrl = baseUrl + 'src/components/confirm-popup/confirm-popup.js';
      
      console.log('SafeWaters: Loading popup module from:', moduleUrl);
      const module = await import(moduleUrl);
      return module;
    } catch (error) {
      console.warn('SafeWaters: Failed to load popup module:', error);
      return null;
    }
  }

  // Popup de fallback inline (simplificado)
  showFallbackPopup(url, securityInfo, onConfirm, onCancel) {
    console.log('SafeWaters: Using fallback popup');
    
    // Crear popup inline simplificado como fallback
    const popupHtml = `
      <div id="safewaters-popup-overlay" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 999999;
        display: flex; align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="
          background: white; padding: 30px; border-radius: 10px; max-width: 500px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center;
        ">
          <h2 style="color: #d32f2f; margin-bottom: 20px;">⚠️ Advertencia de Seguridad</h2>
          <p style="margin-bottom: 15px; color: #333;"><strong>Dominio:</strong> ${securityInfo.domain}</p>
          <p style="margin-bottom: 20px; color: #666; line-height: 1.5;">${securityInfo.info}</p>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="safewaters-cancel" style="
              background: #f44336; color: white; border: none; padding: 12px 25px;
              border-radius: 5px; cursor: pointer; font-size: 16px;
            ">🛡️ Cancelar</button>
            <button id="safewaters-continue" style="
              background: #ff9800; color: white; border: none; padding: 12px 25px;
              border-radius: 5px; cursor: pointer; font-size: 16px;
            ">⚡ Continuar</button>
          </div>
        </div>
      </div>
    `;

    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = popupHtml;
    document.body.appendChild(popupContainer);

    // Event listeners
    document.getElementById('safewaters-continue').addEventListener('click', () => {
      document.body.removeChild(popupContainer);
      onConfirm();
    });

    document.getElementById('safewaters-cancel').addEventListener('click', () => {
      document.body.removeChild(popupContainer);
      onCancel();
    });

    document.getElementById('safewaters-popup-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'safewaters-popup-overlay') {
        document.body.removeChild(popupContainer);
        onCancel();
      }
    });
  }
}

function bootSafeWaters() {
  console.log('SafeWaters: Booting SafeWaters controller...');
  new SafeWatersController();
  console.log('SafeWaters: Controller initialized successfully');
}

// Inicializar cuando el DOM esté listo
console.log('SafeWaters: Document ready state:', document.readyState);

if (document.readyState === 'loading') {
  console.log('SafeWaters: Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', bootSafeWaters);
} else {
  console.log('SafeWaters: Document already loaded, booting immediately');
  bootSafeWaters();
}
