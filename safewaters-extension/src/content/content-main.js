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
    this.isActive = true;
    this.initialize();
  }

  initialize() {
    if (!this.extAPI || !this.extAPI.storage || !this.extAPI.runtime) {
      console.error("SafeWaters: Extension APIs not available. Link interception will not work.");
      return;
    }

    this.loadInitialState();
    this.setupListeners();
    console.log("SafeWaters: Extension initialized");
  }

  loadInitialState() {
    this.extAPI.storage.get(['safewatersActive'], (result) => {
      const lastError = this.extAPI.runtime.lastError;
      if (lastError) {
        console.error(`SafeWaters: Error loading initial state: ${lastError.message}`);
        this.isActive = true;
      } else {
        this.isActive = typeof result.safewatersActive === "undefined" ? true : result.safewatersActive;
      }
      console.log(`SafeWaters: Initial activation state: ${this.isActive}`);
    });
  }

  setupListeners() {
    this.extAPI.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.safewatersActive) {
        this.isActive = changes.safewatersActive.newValue;
        console.log(`SafeWaters: Activation state changed to: ${this.isActive}`);
        if (!this.isActive) {
          hideSecurityPopup();
        }
      }
    });

    const boundClickHandler = this.handleLinkClick.bind(this);
    document.body.addEventListener('click', boundClickHandler, true);
  }

  async handleLinkClick(event) {
    console.log('SafeWaters: Link click handler activated');
    if (!this.isActive) {
      console.log('SafeWaters: Link interception inactive');
      return;
    }

    const linkElement = event.target.closest('a[href^="http"], a[href^="https"]');
    if (!linkElement || linkElement.classList.contains('safewaters-ignore-click')) {
      return;
    }

    // Previene la navegación por defecto
    event.preventDefault();
    const url = linkElement.href;
    console.log('SafeWaters: Link intercepted:', url);

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
    const apiResult = await testUrl(url);
    const securityInfo = this.processApiResult(url, apiResult);
    return securityInfo;
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
  new SafeWatersController();
  console.log('SafeWaters: Controller initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSafeWaters);
} else {
  bootSafeWaters();
}