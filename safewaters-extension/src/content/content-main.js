import { getExtAPI } from '../utils/apis/ext-api.js';
import { testUrl } from '../utils/apis/api-client.js';
import { show as showSecurityPopup, hide as hideSecurityPopup } from '../components/confirm-popup/confirm-popup.js';

/**
 * Constantes para los niveles de severidad de la URL.
 * @readonly
 * @enum {string}
 */
const SEVERITY = {
  SAFE: 'safe',
  MALICIOUS: 'malicious',
  UNCERTAIN: 'uncertain'
};

/**
 * Controlador principal de SafeWaters para interceptar y analizar enlaces.
 * @class
 */
class SafeWatersController {
  /**
   * Inicializa el controlador y la extensión.
   * @constructor
   */
  constructor() {
    /**
     * API de la extensión.
     * @type {Object}
     */
    this.extAPI = getExtAPI();
    /**
     * Estado de activación de la protección.
     * @type {boolean}
     */
    this.isActive = true;
    this.initialize();
  }

  /**
   * Inicializa la funcionalidad de la extensión.
   * @returns {void}
   */
  initialize() {
    if (!this.extAPI || !this.extAPI.storage || !this.extAPI.runtime) {
      console.error("SafeWaters: Extension APIs not available. Link interception will not work.");
      return;
    }

    this.loadInitialState();
    this.setupListeners();
    console.log("SafeWaters: Extension initialized");
  }

  /**
   * Carga el estado inicial de activación desde el almacenamiento.
   * @returns {void}
   */
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

  /**
   * Configura los listeners para cambios de estado y clicks en enlaces.
   * @returns {void}
   */
  setupListeners() {
    /**
     * Listener para cambios en el almacenamiento.
     */
    this.extAPI.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.safewatersActive) {
        this.isActive = changes.safewatersActive.newValue;
        console.log(`SafeWaters: Activation state changed to: ${this.isActive}`);
        if (!this.isActive) {
          hideSecurityPopup();
        }
      }
    });

    /**
     * Listener para clicks en enlaces.
     */
    const boundClickHandler = this.handleLinkClick.bind(this);
    document.body.addEventListener('click', boundClickHandler, true);
  }

  /**
   * Maneja los eventos de click en enlaces.
   * @param {MouseEvent} event - El evento de click.
   * @returns {Promise<void>}
   */
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

  /**
   * Obtiene información de seguridad para una URL consultando la API.
   * @param {string} url - La URL a verificar.
   * @returns {Promise<Object>} Información de seguridad procesada.
   */
  async getSecurityInfo(url) {
    console.log('SafeWaters: Requesting security check from API');
    const apiResult = await testUrl(url);
    const securityInfo = this.processApiResult(url, apiResult);
    return securityInfo;
  }

  /**
   * Procesa el resultado de la API en un formato consistente.
   * @param {string} url - La URL verificada.
   * @param {Object} apiResult - Resultado crudo de la API.
   * @param {string} apiResult.domain - Dominio analizado.
   * @param {boolean} apiResult.malicious - Si es malicioso.
   * @param {string} apiResult.info - Información adicional.
   * @param {string} apiResult.source - Fuente de la información.
   * @returns {Object} Información de seguridad procesada.
   */
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

  /**
   * Maneja la navegación según la información de seguridad.
   * @param {string} url - La URL objetivo.
   * @param {Object} securityInfo - Información de seguridad.
   * @returns {void}
   */
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

  /**
   * Maneja los errores durante la verificación de la URL.
   * @param {string} url - La URL objetivo.
   * @param {Error} error - El error ocurrido.
   * @returns {void}
   */
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

  /**
   * Extrae el dominio de una URL.
   * @param {string} url - La URL.
   * @returns {string} El dominio extraído o la URL original si falla.
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      console.error('SafeWaters: Error extracting domain:', e);
      return url;
    }
  }
}

/**
 * Inicializa el controlador SafeWaters cuando el DOM está listo.
 * @function
 * @returns {void}
 */
function bootSafeWaters() {
  new SafeWatersController();
  console.log('SafeWaters: Controller initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSafeWaters);
} else {
  bootSafeWaters();
}