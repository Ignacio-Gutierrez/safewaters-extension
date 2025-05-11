import { getExtAPI } from '../utils/apis/ext-api.js';
import { testUrl } from '../utils/apis/api-client.js';
import { getUrlCache, setUrlCache } from '../utils/storage/url-cache.js';
import { show as showSecurityPopup, hide as hideSecurityPopup } from '../confirm-popup/confirm-popup.js';

// Constants for severity levels
const SEVERITY = {
  SAFE: 'safe',
  MALICIOUS: 'malicious',
  UNCERTAIN: 'uncertain'
};

// Main controller class
class SafeWatersController {
  constructor() {
    this.extAPI = getExtAPI();
    this.isActive = true;
    this.initialize();
  }

  /**
   * Initialize the extension functionality
   */
  initialize() {
    if (!this.extAPI || !this.extAPI.storage || !this.extAPI.runtime) {
      console.error("SafeWaters: Extension APIs not available. Link interception will not work.");
      return;
    }

    this.loadInitialState();
    this.setupListeners();
    
    // Log initialization
    console.log("SafeWaters: Extension initialized");
  }

  /**
   * Load the initial activation state from storage
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
   * Set up event listeners
   */
  setupListeners() {
    // Listen for state changes
    this.extAPI.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.safewatersActive) {
        this.isActive = changes.safewatersActive.newValue;
        console.log(`SafeWaters: Activation state changed to: ${this.isActive}`);
        
        if (!this.isActive) {
          hideSecurityPopup();
        }
      }
    });

    // Attach click handler with proper binding
    const boundClickHandler = this.handleLinkClick.bind(this);
    document.body.addEventListener('click', boundClickHandler, true);
  }

  /**
   * Handle link click events
   * @param {MouseEvent} event - The click event
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

    // Prevent default navigation
    event.preventDefault();
    const url = linkElement.href;
    console.log('SafeWaters: Link intercepted:', url);

    try {
      // Check if we have a cached result
      const securityInfo = await this.getSecurityInfo(url);
      
      // Handle navigation based on security info
      this.handleNavigation(url, securityInfo);
    } catch (error) {
      console.error('SafeWaters: Error analyzing URL:', error);
      this.handleError(url, error);
    }
  }

  /**
   * Get security information for a URL (from cache or API)
   * @param {string} url - The URL to check
   * @returns {Promise<Object>} - Security information
   */
  async getSecurityInfo(url) {
    // Check cache first
    const cachedData = await getUrlCache(url);
    
    if (cachedData) {
      console.log('SafeWaters: Using cached response:', cachedData);
      return cachedData;
    }

    // Call API if not in cache
    console.log('SafeWaters: Requesting security check from API');
    const apiResult = await testUrl(url);
    
    // Process API result into consistent format
    const securityInfo = this.processApiResult(url, apiResult);
    
    // Store in cache for future use
    await setUrlCache(url, securityInfo);
    
    return securityInfo;
  }

  /**
   * Process API result into a consistent security info format
   * @param {string} url - The checked URL
   * @param {Object} apiResult - Raw API result with the shape:
   *                 {domain: string, malicious: boolean, info: string, source: string}
   * @returns {Object} - Processed security information
   */
  processApiResult(url, apiResult) {
    // Extract domain from URL as fallback
    const fallbackDomain = this.extractDomain(url);
    
    // Determine severity level based on API response
    let severity = SEVERITY.SAFE;
    
    if (apiResult.malicious) {
      severity = SEVERITY.MALICIOUS;
    }

    return {
      domain: apiResult.domain || fallbackDomain,
      info: apiResult.info || "No additional information available",
      source: apiResult.source || "Unknown",
      malicious: apiResult.malicious || false, // Keep original boolean for compatibility
      severity: severity
    };
  }

  /**
   * Handle navigation based on security info
   * @param {string} url - The target URL
   * @param {Object} securityInfo - Security information
   */
  handleNavigation(url, securityInfo) {
    // Allow immediate navigation for safe URLs
    if (securityInfo.severity === SEVERITY.SAFE) {
      console.log('SafeWaters: URL deemed safe, redirecting');
      window.location.href = url;
      return;
    }
    
    // Show warning popup for other cases
    console.log(`SafeWaters: Showing warning popup for ${securityInfo.severity} URL`);
    
    // Prepare user-friendly info with source attribution if available
    const enhancedSecurityInfo = {
      ...securityInfo,
      info: securityInfo.source 
        ? `${securityInfo.info} (Source: ${securityInfo.source})`
        : securityInfo.info
    };
    
    showSecurityPopup(
      url,
      enhancedSecurityInfo,
      () => { window.location.href = url; }, // Proceed callback
      () => { /* Popup will hide itself on cancel */ }
    );
  }

  /**
   * Handle errors during URL verification
   * @param {string} url - The target URL
   * @param {Error} error - The error that occurred
   */
  handleError(url, error) {
    const domain = this.extractDomain(url);
    
    showSecurityPopup(
      url,
      {
        domain: domain,
        info: `Could not verify the security of this link due to an error: ${error.message}. Proceed with caution.`,
        severity: SEVERITY.UNCERTAIN
      },
      () => { window.location.href = url; },
      () => { /* Popup will hide itself on cancel */ }
    );
  }

  /**
   * Extract domain from URL
   * @param {string} url - The URL
   * @returns {string} - The domain
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      console.error('SafeWaters: Error extracting domain:', e);
      return url; // Fallback to full URL if parsing fails
    }
  }
}

// Initialize the controller when the DOM is ready
function bootSafeWaters() {
  new SafeWatersController();
  console.log('SafeWaters: Controller initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSafeWaters);
} else {
  bootSafeWaters();
}