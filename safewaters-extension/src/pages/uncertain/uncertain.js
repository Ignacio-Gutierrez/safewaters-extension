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
        proceedButton.addEventListener('click', function() {
            // Permitir navegación a la URL original
            const originalUrl = decodeURIComponent(uncertainUrl);
            if (originalUrl && originalUrl !== 'URL no disponible') {
                window.location.href = originalUrl;
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
