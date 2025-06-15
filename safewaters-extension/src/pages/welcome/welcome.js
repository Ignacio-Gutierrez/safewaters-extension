import { validateToken as apiValidateToken } from '../../utils/apis/api-client.js';

document.addEventListener('DOMContentLoaded', function() {
    let currentStep = 1;
    const totalSteps = 3;
    
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
                // Guardar solo el token de forma permanente
                await chrome.storage.local.set({
                    profileToken: token
                });
                console.log('SafeWaters: Token saved permanently');

                showStatus(`¡Éxito! Token validado correctamente`, 'success');
                
                // Actualizar información del perfil
                profileInfo.textContent = `Token vinculado exitosamente`;
                
                // Avanzar al siguiente paso
                setTimeout(() => {
                    nextStep();
                }, 1500);
                
            } else {
                let errorMessage = 'Token inválido';
                
                if (result.errorType === 'API_UNAVAILABLE') {
                    errorMessage = 'Servidor no disponible. Verifica que la API esté ejecutándose en http://localhost:8000';
                } else if (result.error) {
                    errorMessage = `Token inválido: ${result.error}`;
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
            // Verificar si se está abriendo para actualizar token
            const urlParams = new URLSearchParams(window.location.search);
            const isUpdating = urlParams.get('update') === 'true';
            
            const result = await chrome.storage.local.get(['profileToken']);
            console.log('SafeWaters: Checking existing token');
            
            if (result.profileToken && !isUpdating) {
                // Ya tiene token y NO está actualizando, mostrar información y saltar al último paso
                profileInfo.textContent = `Token ya configurado`;
                
                // Mostrar mensaje de éxito
                showStatus('Token encontrado. Tu extensión ya está lista para usar.', 'success');
                
                goToStep(3);
            } else {
                if (isUpdating) {
                    console.log('SafeWaters: Opening for token update');
                    showStatus('Ingresa tu nuevo token para actualizar la configuración.', 'info');
                } else {
                    console.log('SafeWaters: No existing token found');
                }
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
            } else {
                showStatus('⚠️ Error: El token no se guardó correctamente. Por favor, intenta nuevamente.', 'error');
                return;
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            showStatus('Error verificando el token guardado.', 'error');
            return;
        }
        
        // Cerrar la ventana de configuración
        setTimeout(() => {
            window.close();
        }, 2000);
    }

    // Inicializar con el primer paso
    goToStep(1);
});

// Función para manejar errores de extensión
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'configurationError') {
        console.error('Configuration error:', request.error);
        showStatus('Error en la configuración. Por favor, intenta nuevamente.', 'error');
    }
});
