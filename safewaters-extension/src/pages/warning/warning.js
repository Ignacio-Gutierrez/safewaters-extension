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
            console.log('SafeWaters: User chose to bypass warning for URL:', warningUrl);
            
            // Enviar mensaje al background script para continuar
            chrome.runtime.sendMessage({
                action: 'continueAnyway',
                url: decodeURIComponent(warningUrl)
            }, (response) => {
                if (response && response.success) {
                    console.log('SafeWaters: Successfully bypassed warning');
                } else {
                    console.error('SafeWaters: Failed to bypass warning:', response?.error);
                    // Fallback: intentar navegación directa
                    const originalUrl = decodeURIComponent(warningUrl);
                    if (originalUrl && originalUrl !== 'URL no disponible') {
                        window.location.href = originalUrl;
                    }
                }
            });
        });
    }
    
    if (goBackButton) {
        goBackButton.addEventListener('click', function() {
            // Cerrar la ventana actual
            window.close();
        });
    }
});
