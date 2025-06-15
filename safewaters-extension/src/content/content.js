import { getExtAPI } from '../utils/apis/ext-api.js';
import { testUrl } from '../utils/apis/api-client.js';
import { show as showSecurityPopup, hide as hideSecurityPopup } from '../components/confirm-popup/confirm-popup.js';

const SEVERITY = {
  SAFE: 'safe',
  MALICIOUS: 'malicious',
  UNCERTAIN: 'uncertain'
};

class SafeWatersController {
  constructor() {
    this.extAPI = getExtAPI();
    this.initialize();
  }

  initialize() {
    if (!this.extAPI || !this.extAPI.storage || !this.extAPI.runtime) {
      console.error("SafeWaters: Extension APIs not available. Link interception will not work.");
      return;
    }

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

    // Previene la navegación por defecto
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
    console.log('SafeWaters: Requesting security check from API');
    
    // Obtener el token de perfil almacenado
    try {
      const { profileToken } = await new Promise((resolve, reject) => {
        this.extAPI.storage.get(['profileToken'], (result) => {
          if (this.extAPI.runtime.lastError) {
            reject(this.extAPI.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });

      if (!profileToken) {
        console.error('SafeWaters: No profile token found');
        throw new Error('Token de perfil no encontrado');
      }

      const apiResult = await testUrl(url, profileToken);
      const securityInfo = this.processApiResult(url, apiResult);
      return securityInfo;
      
    } catch (error) {
      console.error('SafeWaters: Error getting profile token or checking URL:', error);
      throw error;
    }
  }

  processApiResult(url, apiResult) {
    const fallbackDomain = this.extractDomain(url);
    let severity = SEVERITY.SAFE;
    if (apiResult.malicious) {
      severity = SEVERITY.MALICIOUS;
    }
    return {
      url: url,
      domain: apiResult.domain || fallbackDomain,
      info: apiResult.info || "No additional information available",
      source: apiResult.source || "Unknown",
      malicious: apiResult.malicious || false,
      severity: severity
    };
  }

  handleNavigation(url, securityInfo) {
    if (securityInfo.severity === SEVERITY.SAFE) {
      console.log('SafeWaters: URL deemed safe, redirecting');
      window.location.href = url;
      return;
    }
    // Muestra el popup de advertencia para otros casos
    console.log(`SafeWaters: Showing warning popup for ${securityInfo.severity} URL`);
    const enhancedSecurityInfo = {
      ...securityInfo,
      info: securityInfo.source 
        ? `${securityInfo.info} (Source: ${securityInfo.source})`
        : securityInfo.info
    };
    showSecurityPopup(
      url,
      enhancedSecurityInfo,
      () => { window.location.href = url; }, // Callback si el usuario acepta
      () => { /* El popup se oculta solo si cancela */ }
    );
  }

  handleError(url, error) {
    const domain = this.extractDomain(url);
    showSecurityPopup(
      url,
      {
        domain: domain,
        info: `No se pudo verificar la seguridad de este enlace debido a un error. Proceda con precaución.`,
        severity: SEVERITY.UNCERTAIN
      },
      () => { window.location.href = url; },
      () => { /* El popup se oculta solo si cancela */ }
    );
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      console.error('SafeWaters: Error extracting domain:', e);
      return url;
    }
  }
}

function bootSafeWaters() {
  console.log('SafeWaters: Booting SafeWaters controller...');
  new SafeWatersController();
  console.log('SafeWaters: Controller initialized successfully');
}

console.log('SafeWaters: Document ready state:', document.readyState);

if (document.readyState === 'loading') {
  console.log('SafeWaters: Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', bootSafeWaters);
} else {
  console.log('SafeWaters: Document already loaded, booting immediately');
  bootSafeWaters();
}