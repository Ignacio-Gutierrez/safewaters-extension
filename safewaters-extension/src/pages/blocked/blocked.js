// SafeWaters - Blocked Page Script
document.addEventListener('DOMContentLoaded', function() {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const blockedUrl = urlParams.get('url') || 'URL no disponible';
    const blockedReason = urlParams.get('reason') || 'Blocked by security rules';
    
    // Mostrar información
    const urlElement = document.getElementById('blocked-url');
    const reasonElement = document.getElementById('blocked-reason');
    
    if (urlElement) {
        urlElement.textContent = decodeURIComponent(blockedUrl);
    }
    
    if (reasonElement) {
        reasonElement.textContent = decodeURIComponent(blockedReason);
    }
    
    // Actualizar título de la página
    try {
        const hostname = new URL(decodeURIComponent(blockedUrl) || 'https://example.com').hostname;
        document.title = `SafeWaters - Bloqueado: ${hostname}`;
    } catch (e) {
        document.title = 'SafeWaters - Acceso Bloqueado';
    }
});
