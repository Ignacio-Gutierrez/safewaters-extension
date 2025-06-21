// SafeWaters - Warning Page Script
document.addEventListener('DOMContentLoaded', function() {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const warningUrl = urlParams.get('url') || 'URL no disponible';
    const warningReason = urlParams.get('reason') || 'Potentially malicious content detected';
    
    // Mostrar información
    const urlElement = document.getElementById('warning-url');
    const reasonElement = document.getElementById('warning-reason');
    
    if (urlElement) {
        urlElement.textContent = decodeURIComponent(warningUrl);
    }
    
    if (reasonElement) {
        reasonElement.textContent = decodeURIComponent(warningReason);
    }
    
    // Actualizar título de la página
    try {
        const hostname = new URL(decodeURIComponent(warningUrl) || 'https://example.com').hostname;
        document.title = `SafeWaters - Advertencia: ${hostname}`;
    } catch (e) {
        document.title = 'SafeWaters - Sitio Peligroso';
    }
    
    // Configurar event listeners para los botones
    const proceedButton = document.getElementById('proceed-button');
    const goBackButton = document.getElementById('go-back-button');
    
    if (proceedButton) {
        proceedButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('SafeWaters Warning: Proceed button clicked');
            
            const originalUrl = decodeURIComponent(warningUrl);
            console.log('SafeWaters Warning: Attempting to approve navigation to:', originalUrl);
            
            if (originalUrl && originalUrl !== 'URL no disponible') {
                try {
                    // Validar que la URL es válida
                    const urlObj = new URL(originalUrl);
                    console.log('SafeWaters Warning: URL validation successful for:', urlObj.href);
                    
                    // Deshabilitar botón mientras se procesa
                    proceedButton.disabled = true;
                    proceedButton.textContent = 'Procesando...';
                    
                    // Solicitar al background script que apruebe la navegación
                    chrome.runtime.sendMessage({
                        action: 'approveNavigation',
                        url: originalUrl
                    }, function(response) {
                        if (response && response.success) {
                            console.log('SafeWaters Warning: Navigation approved successfully');
                            // La navegación ya se ejecutó desde el background script
                        } else {
                            console.error('SafeWaters Warning: Failed to approve navigation:', response);
                            
                            // Fallback: intentar navegación directa
                            console.log('SafeWaters Warning: Attempting direct navigation as fallback');
                            window.location.href = originalUrl;
                            
                            // Re-habilitar botón
                            proceedButton.disabled = false;
                            proceedButton.textContent = 'Continue anyway';
                        }
                        
                        if (chrome.runtime.lastError) {
                            console.error('SafeWaters Warning: Chrome runtime error:', chrome.runtime.lastError);
                        }
                    });
                    
                } catch (urlError) {
                    console.error('SafeWaters Warning: Invalid URL for navigation:', originalUrl, urlError);
                    alert('Error: URL no válida. No se puede continuar.\nURL: ' + originalUrl + '\nError: ' + urlError.message);
                    
                    // Re-habilitar botón
                    proceedButton.disabled = false;
                    proceedButton.textContent = 'Continue anyway';
                }
            } else {
                console.error('SafeWaters Warning: Cannot navigate - URL not available or invalid');
                alert('Error: No se puede continuar - URL no disponible');
            }
        });
    }
    
    if (goBackButton) {
        goBackButton.addEventListener('click', function() {
            // Cerrar la ventana actual
            window.close();
        });
    }
});
