// SafeWaters - Uncertain Page Script
document.addEventListener('DOMContentLoaded', function() {
    console.log('SafeWaters Uncertain: Page loaded');
    
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const uncertainUrl = urlParams.get('url') || 'URL no disponible';
    const uncertainReason = urlParams.get('reason') || 'Unable to verify site security';
    
    console.log('SafeWaters Uncertain: URL params:', {
        rawUrl: uncertainUrl,
        decodedUrl: uncertainUrl !== 'URL no disponible' ? decodeURIComponent(uncertainUrl) : 'N/A',
        reason: uncertainReason,
        currentPageUrl: window.location.href,
        allParams: Object.fromEntries(urlParams.entries())
    });
    
    // Debugging extra
    console.log('SafeWaters Uncertain: Raw URL value:', JSON.stringify(uncertainUrl));
    console.log('SafeWaters Uncertain: Is URL available?', uncertainUrl !== 'URL no disponible' && uncertainUrl !== null);
    
    if (uncertainUrl && uncertainUrl !== 'URL no disponible') {
        try {
            const decoded = decodeURIComponent(uncertainUrl);
            console.log('SafeWaters Uncertain: Successfully decoded URL:', decoded);
            const testUrl = new URL(decoded);
            console.log('SafeWaters Uncertain: URL validation test passed:', testUrl.href);
        } catch (e) {
            console.error('SafeWaters Uncertain: URL test failed:', e);
        }
    }
    
    // Mostrar información
    const urlElement = document.getElementById('uncertain-url');
    const reasonElement = document.getElementById('uncertain-reason');
    
    if (urlElement) {
        urlElement.textContent = decodeURIComponent(uncertainUrl);
    }
    
    if (reasonElement) {
        reasonElement.textContent = decodeURIComponent(uncertainReason);
    }
    
    // Actualizar título de la página
    try {
        const hostname = new URL(decodeURIComponent(uncertainUrl) || 'https://example.com').hostname;
        document.title = `SafeWaters - Incierto: ${hostname}`;
    } catch (e) {
        document.title = 'SafeWaters - Sitio Incierto';
    }
    
    // Configurar event listeners para los botones
    const proceedButton = document.getElementById('proceed-button');
    const goBackButton = document.getElementById('go-back-button');
    
    if (proceedButton) {
        proceedButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('SafeWaters Uncertain: Proceed button clicked');
            
            const originalUrl = decodeURIComponent(uncertainUrl);
            console.log('SafeWaters Uncertain: Attempting to approve navigation to:', originalUrl);
            
            if (originalUrl && originalUrl !== 'URL no disponible') {
                try {
                    // Validar que la URL es válida
                    const urlObj = new URL(originalUrl);
                    console.log('SafeWaters Uncertain: URL validation successful for:', urlObj.href);
                    
                    // Deshabilitar botón mientras se procesa
                    proceedButton.disabled = true;
                    proceedButton.textContent = 'Procesando...';
                    
                    // Solicitar al background script que apruebe la navegación
                    chrome.runtime.sendMessage({
                        action: 'approveNavigation',
                        url: originalUrl
                    }, function(response) {
                        if (response && response.success) {
                            console.log('SafeWaters Uncertain: Navigation approved successfully');
                            // La navegación ya se ejecutó desde el background script
                        } else {
                            console.error('SafeWaters Uncertain: Failed to approve navigation:', response);
                            
                            // Fallback: intentar navegación directa
                            console.log('SafeWaters Uncertain: Attempting direct navigation as fallback');
                            window.location.href = originalUrl;
                            
                            // Re-habilitar botón
                            proceedButton.disabled = false;
                            proceedButton.textContent = 'Continue anyway';
                        }
                        
                        if (chrome.runtime.lastError) {
                            console.error('SafeWaters Uncertain: Chrome runtime error:', chrome.runtime.lastError);
                        }
                    });
                    
                } catch (urlError) {
                    console.error('SafeWaters Uncertain: Invalid URL for navigation:', originalUrl, urlError);
                    alert('Error: URL no válida. No se puede continuar.\nURL: ' + originalUrl + '\nError: ' + urlError.message);
                    
                    // Re-habilitar botón
                    proceedButton.disabled = false;
                    proceedButton.textContent = 'Continue anyway';
                }
            } else {
                console.error('SafeWaters Uncertain: Cannot navigate - URL not available or invalid');
                alert('Error: No se puede continuar - URL no disponible');
            }
        });
    } else {
        console.error('SafeWaters Uncertain: Proceed button not found!');
    }
    
    if (goBackButton) {
        goBackButton.addEventListener('click', function() {
            // Cerrar la ventana actual
            window.close();
        });
    }
});
