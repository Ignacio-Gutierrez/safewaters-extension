// SafeWaters - Uncertain Page Script
document.addEventListener('DOMContentLoaded', function() {
    // console.log('SafeWaters Uncertain: Page loaded'); // DEBUG: Comentado para producción
    
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const uncertainUrl = urlParams.get('url') || 'URL no disponible';
    const uncertainReason = urlParams.get('reason') || 'Unable to verify site security';
    
    // DEBUG: Comentado para producción - logs de debugging
    
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
            // console.log('SafeWaters Uncertain: Proceed button clicked'); // DEBUG: Comentado para producción
            
            const originalUrl = decodeURIComponent(uncertainUrl);
            // console.log('SafeWaters Uncertain: Attempting to approve navigation to:', originalUrl); // DEBUG: Comentado para producción
            
            if (originalUrl && originalUrl !== 'URL no disponible') {
                try {
                    // Validar que la URL es válida
                    const urlObj = new URL(originalUrl);
                    // console.log('SafeWaters Uncertain: URL validation successful for:', urlObj.href); // DEBUG: Comentado para producción
                    
                    // Deshabilitar botón mientras se procesa
                    proceedButton.disabled = true;
                    proceedButton.textContent = 'Procesando...';
                    
                    // Solicitar al background script que apruebe la navegación
                    chrome.runtime.sendMessage({
                        action: 'approveNavigation',
                        url: originalUrl
                    }, function(response) {
                        if (response && response.success) {
                            // console.log('SafeWaters Uncertain: Navigation approved successfully'); // DEBUG: Comentado para producción
                            // La navegación ya se ejecutó desde el background script
                        } else {
                            console.error('SafeWaters Uncertain: Failed to approve navigation:', response);
                            
                            // Fallback: intentar navegación directa
                            // console.log('SafeWaters Uncertain: Attempting direct navigation as fallback'); // DEBUG: Comentado para producción
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
