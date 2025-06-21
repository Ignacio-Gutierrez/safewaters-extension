import { validateToken as apiValidateToken } from '../../utils/apis/api-client.js';

document.addEventListener('DOMContentLoaded', function() {
    let currentStep = 1;
    const totalSteps = 3;
    
    // Obtener parámetros de la URL para detectar si viene de navegación
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    const returnUrl = urlParams.get('return_url');
    const stepParam = urlParams.get('step');
    const updateToken = urlParams.get('update_token');
    
    // Si se especifica un step en la URL, empezar desde ese step
    if (stepParam) {
        const requestedStep = parseInt(stepParam, 10);
        if (requestedStep >= 1 && requestedStep <= totalSteps) {
            currentStep = requestedStep;
        }
    }
    
    // Log para debugging
    console.log('SafeWaters Welcome: Loaded with params', { 
        source, 
        returnUrl, 
        stepParam, 
        updateToken, 
        currentStep 
    });
    
    // Elementos del DOM
    const tokenInput = document.getElementById('profileToken');
    const validateButton = document.getElementById('validateToken');
    const statusDiv = document.getElementById('status');
    const profileInfo = document.getElementById('profileInfo');
    const nextStepBtn = document.getElementById('nextStepBtn');
    const prevStepBtn = document.getElementById('prevStepBtn');
    const finishSetupBtn = document.getElementById('finishSetupBtn');

    // Event listeners
    if (validateButton) {
        validateButton.addEventListener('click', validateToken);
    }

    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', nextStep);
    }

    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', prevStep);
    }

    if (finishSetupBtn) {
        finishSetupBtn.addEventListener('click', finishSetup);
    }

    // Event listener para Enter en el input
    if (tokenInput) {
        tokenInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validateToken();
            }
        });
    }

    // Verificar si ya está configurado
    checkExistingConfiguration();
    
    // Si viene del popup para actualizar token, mostrar mensaje apropiado
    if (source === 'popup' && updateToken === 'true') {
        console.log('SafeWaters Welcome: Modo actualización de token activado');
        showStatus('Ingresa tu nuevo token. El anterior se mantendrá hasta confirmar que el nuevo es válido.', 'info');
    }

    async function validateToken() {
        const token = tokenInput.value.trim();
        
        if (!token) {
            showStatus('Por favor ingresa un token válido', 'error');
            return;
        }

        // Mostrar loading
        validateButton.textContent = 'Validando...';
        validateButton.disabled = true;
        showStatus('Verificando token con el servidor...', 'loading');

        try {
            // Usar api-client para validar token
            const result = await apiValidateToken(token);

            if (result.valid) {
                // Solo ahora que es válido, guardar el nuevo token (reemplazando el anterior)
                await chrome.storage.local.set({
                    profileToken: token
                });
                console.log('SafeWaters: Nuevo token validado y guardado, reemplazando el anterior');

                // Determinar mensaje según el contexto
                const successMessage = (source === 'popup' && updateToken === 'true') 
                    ? '¡Éxito! Token actualizado correctamente - Continuando...'
                    : '¡Éxito! Token validado correctamente - Continuando...';
                
                showStatus(successMessage, 'success');
                
                // Actualizar información del perfil
                profileInfo.textContent = `Token vinculado exitosamente`;
                
                // Avanzar al siguiente paso más rápido
                setTimeout(() => {
                    nextStep();
                }, 600);
                
            } else {
                let errorMessage = 'Token inválido';
                
                if (result.errorType === 'API_UNAVAILABLE') {
                    errorMessage = 'Servidor no disponible. Verifica que la API esté ejecutándose en http://localhost:8000';
                } else if (result.error) {
                    errorMessage = `Token inválido: ${result.error}`;
                }
                
                // Agregar mensaje sobre mantener token anterior si aplica
                if (source === 'popup' && updateToken === 'true') {
                    errorMessage += '. El token anterior se mantiene activo.';
                }
                
                showStatus(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Error validating token:', error);
            showStatus('Error de conexión. Verifica que el servidor esté funcionando en http://localhost:8000', 'error');
        } finally {
            validateButton.textContent = 'Validar y Configurar';
            validateButton.disabled = false;
        }
    }

    async function checkExistingConfiguration() {
        try {
            const result = await chrome.storage.local.get(['profileToken']);
            console.log('SafeWaters: Checking existing token');
            
            if (result.profileToken) {
                // Si está actualizando token, mostrar información pero no saltar al paso 3
                if (source === 'popup' && updateToken === 'true') {
                    console.log('SafeWaters: Opening for token update, current token exists');
                    profileInfo.textContent = `Token actual configurado (será reemplazado al validar uno nuevo)`;
                    showStatus('Tienes un token configurado. Ingresa el nuevo token para actualizarlo.', 'info');
                    // Mantener en step 1 para permitir ingresar nuevo token
                } else {
                    // Ya tiene token y NO está actualizando, mostrar información y saltar al último paso
                    profileInfo.textContent = `Token ya configurado`;
                    showStatus('Token encontrado. Tu extensión ya está lista para usar.', 'success');
                    goToStep(3);
                }
            } else {
                console.log('SafeWaters: No existing token found');
                showStatus('Configura tu token para comenzar a usar SafeWaters.', 'info');
            }
        } catch (error) {
            console.error('Error checking configuration:', error);
        }
    }

    function showStatus(message, type) {
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
            statusDiv.classList.remove('hidden');
        }
    }

    function nextStep() {
        if (currentStep < totalSteps) {
            currentStep++;
            goToStep(currentStep);
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            currentStep--;
            goToStep(currentStep);
        }
    }

    function goToStep(step) {
        // Ocultar todos los pasos
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        
        // Mostrar el paso actual
        const targetStep = document.getElementById(`step${step}`);
        if (targetStep) {
            targetStep.classList.add('active');
        }

        // Actualizar barra de progreso
        updateProgressBar(step);
        
        currentStep = step;
    }

    function updateProgressBar(step) {
        const progressSteps = document.querySelectorAll('.progress-step');
        const progressLines = document.querySelectorAll('.progress-line');

        progressSteps.forEach((stepEl, index) => {
            const stepNumber = index + 1;
            stepEl.classList.remove('active', 'completed');
            
            if (stepNumber < step) {
                stepEl.classList.add('completed');
            } else if (stepNumber === step) {
                stepEl.classList.add('active');
            }
        });

        progressLines.forEach((line, index) => {
            line.classList.remove('completed');
            if (index < step - 1) {
                line.classList.add('completed');
            }
        });
    }

    async function finishSetup() {
        // Verificar que el token esté guardado
        try {
            const savedConfig = await chrome.storage.local.get(['profileToken']);
            
            if (savedConfig.profileToken) {
                showStatus('✅ Token guardado permanentemente en Chrome. ¡SafeWaters está listo!', 'success');
                console.log('SafeWaters: Token verified and saved permanently');
                
                // Si viene de navegación y hay URL de retorno, redirigir
                if (source === 'navigation' && returnUrl) {
                    const originalUrl = decodeURIComponent(returnUrl);
                    console.log('SafeWaters: Redirecting to original URL after configuration:', originalUrl);
                    
                    showStatus('✅ Configuración completa. Redirigiendo al sitio solicitado...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = originalUrl;
                    }, 1000);
                    return;
                }
                
                // Comportamiento normal - cerrar la ventana
                setTimeout(() => {
                    window.close();
                }, 300);
                
            } else {
                showStatus('⚠️ Error: El token no se guardó correctamente. Por favor, intenta nuevamente.', 'error');
                return;
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            showStatus('Error verificando el token guardado.', 'error');
            return;
        }
    }

    // Inicializar con el paso correcto (desde URL o por defecto step 1)
    goToStep(currentStep);
});

// Función para manejar errores de extensión
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'configurationError') {
        console.error('Configuration error:', request.error);
        showStatus('Error en la configuración. Por favor, intenta nuevamente.', 'error');
    }
});
