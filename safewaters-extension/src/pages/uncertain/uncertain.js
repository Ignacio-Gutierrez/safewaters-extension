// SafeWaters - Uncertain Page Script
document.addEventListener('DOMContentLoaded', function() {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const uncertainUrl = urlParams.get('url') || 'URL no disponible';
    const uncertainReason = urlParams.get('reason') || 'Unable to verify site security';
    
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
            console.log('SafeWaters: User chose to bypass uncertain URL:', uncertainUrl);
            
            // Enviar mensaje al background script para continuar
            chrome.runtime.sendMessage({
                action: 'continueAnyway',
                url: decodeURIComponent(uncertainUrl)
            }, (response) => {
                if (response && response.success) {
                    console.log('SafeWaters: Successfully bypassed uncertain URL');
                } else {
                    console.error('SafeWaters: Failed to bypass uncertain URL:', response?.error);
                    // Fallback: intentar navegación directa
                    const originalUrl = decodeURIComponent(uncertainUrl);
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
