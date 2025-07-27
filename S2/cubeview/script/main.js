/**
 * Archivo principal de inicialización de la aplicación OLAP
 * Coordina la carga y configuración de todos los módulos
 */

/**
 * Función para ocultar el loading una vez que todo esté cargado
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.opacity = '0';
        setTimeout(() => {
            loading.style.display = 'none';
        }, 300);
    }
}

/**
 * Función para mostrar errores críticos al usuario
 */
function showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(220, 53, 69, 0.95);
        color: white;
        padding: 30px;
        border-radius: 12px;
        z-index: 5000;
        text-align: center;
        backdrop-filter: blur(10px);
        border: 2px solid #dc3545;
    `;
    
    errorDiv.innerHTML = `
        <h3 style="margin: 0 0 15px 0;">Error Crítico</h3>
        <p style="margin: 0 0 20px 0;">${message}</p>
        <button onclick="location.reload()" 
                style="padding: 10px 20px; background: white; color: #dc3545; 
                       border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
            Recargar Aplicación
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Validación de dependencias críticas
 */
function validateDependencies() {
    const missingDependencies = [];
    
    // Verificar Three.js
    if (typeof THREE === 'undefined') {
        missingDependencies.push('Three.js');
    }
    
    // Verificar elementos DOM críticos
    const criticalElements = ['canvas-container', 'control-panel', 'info-panel'];
    criticalElements.forEach(elementId => {
        if (!document.getElementById(elementId)) {
            missingDependencies.push(`Elemento DOM: ${elementId}`);
        }
    });
    
    if (missingDependencies.length > 0) {
        const message = `Dependencias faltantes: ${missingDependencies.join(', ')}`;
        window.OLAP_UTILS.log(message, 'error');
        showCriticalError(message);
        return false;
    }
    
    return true;
}

/**
 * Función principal de inicialización del cubo OLAP
 */
function initializeOLAPCube() {
    try {
        window.OLAP_UTILS.log('Iniciando proceso de inicialización del cubo OLAP');
        
        // Validar dependencias antes de continuar
        if (!validateDependencies()) {
            return;
        }
        
        // Mostrar progreso de inicialización
        updateLoadingStatus('Inicializando motor de renderizado...');
        
        // Inicializar el motor de renderizado 3D
        window.olapRenderer = new OLAPRenderer();
        window.OLAP_UTILS.log('Renderer OLAP inicializado');
        
        updateLoadingStatus('Configurando operaciones OLAP...');
        
        // Inicializar el manejador de operaciones OLAP
        window.olapOperations = new OLAPOperations();
        window.OLAP_UTILS.log('Motor de operaciones OLAP inicializado');
        
        updateLoadingStatus('Configurando controles de interfaz...');
        
        // Inicializar los controles de la interfaz
        window.olapControls = new OLAPControls();
        window.OLAP_UTILS.log('Sistema de controles inicializado');
        
        updateLoadingStatus('Configurando características avanzadas...');
        
        // Inicializar características avanzadas
        window.olapControls.initializeAdvancedFeatures();
        window.olapControls.updateControlStates();
        
        updateLoadingStatus('Finalizando inicialización...');
        
        // Configurar manejadores globales de errores
        setupErrorHandlers();
        
        // Configurar eventos de limpieza al cerrar
        setupCleanupHandlers();
        
        // Mostrar información inicial
        showWelcomeMessage();
        
        // Ocultar loading con delay para mejor UX
        setTimeout(() => {
            hideLoading();
            window.OLAP_UTILS.log('Aplicación OLAP Cube inicializada completamente');
            
            // Mostrar estadísticas iniciales
            displayInitialStats();
        }, 500);
        
    } catch (error) {
        window.OLAP_UTILS.log('Error crítico durante la inicialización:', error);
        showCriticalError(`Error de inicialización: ${error.message}`);
    }
}

/**
 * Actualiza el mensaje de estado del loading
 */
function updateLoadingStatus(message) {
    const loading = document.getElementById('loading');
    if (loading) {
        let statusElement = loading.querySelector('.loading-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'loading-status';
            statusElement.style.cssText = `
                margin-top: 20px;
                font-size: 12px;
                color: #4fc3f7;
                text-align: center;
            `;
            loading.appendChild(statusElement);
        }
        statusElement.textContent = message;
    }
}

/**
 * Configurar manejadores globales de errores
 */
function setupErrorHandlers() {
    // Manejar errores de JavaScript no capturados
    window.addEventListener('error', (event) => {
        window.OLAP_UTILS.log(`Error no capturado: ${event.error}`, 'error');
        
        // No mostrar error crítico para errores menores
        if (event.error.stack && event.error.stack.includes('OLAP')) {
            console.warn('Error en componente OLAP detectado, pero la aplicación continúa funcionando');
        }
    });
    
    // Manejar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
        window.OLAP_UTILS.log(`Promesa rechazada: ${event.reason}`, 'error');
        event.preventDefault(); // Prevenir que se muestre en consola del navegador
    });
    
    window.OLAP_UTILS.log('Manejadores de errores configurados');
}

/**
 * Configurar eventos de limpieza al cerrar la aplicación
 */
function setupCleanupHandlers() {
    window.addEventListener('beforeunload', () => {
        window.OLAP_UTILS.log('Limpiando recursos antes de cerrar aplicación');
        
        // Limpiar animaciones
        if (window.OLAP_CONFIG.animationId) {
            cancelAnimationFrame(window.OLAP_CONFIG.animationId);
        }
        
        // Limpiar renderer
        if (window.olapRenderer) {
            window.olapRenderer.dispose();
        }
        
        // Limpiar controles
        if (window.olapControls) {
            window.olapControls.dispose();
        }
    });
}

/**
 * Muestra mensaje de bienvenida
 */
function showWelcomeMessage() {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(79, 195, 247, 0.9);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        z-index: 2000;
        font-size: 14px;
        font-weight: 500;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: opacity 0.5s ease;
    `;
    
    welcomeDiv.textContent = 'Cubo OLAP cargado exitosamente - Haz clic en una celda para comenzar';
    document.body.appendChild(welcomeDiv);
    
    // Mostrar con animación
    setTimeout(() => {
        welcomeDiv.style.opacity = '1';
    }, 100);
    
    // Ocultar después de unos segundos
    setTimeout(() => {
        welcomeDiv.style.opacity = '0';
        setTimeout(() => {
            if (welcomeDiv.parentElement) {
                welcomeDiv.remove();
            }
        }, 500);
    }, 4000);
}

/**
 * Muestra estadísticas iniciales del cubo
 */
function displayInitialStats() {
    if (!window.olapOperations) return;
    
    const stats = window.olapOperations.getCurrentStatistics();
    if (stats) {
        window.OLAP_UTILS.log(`Estadísticas iniciales del cubo:
            - Total de celdas: ${stats.totalCells}
            - Celdas visibles: ${stats.visibleCells}
            - Valor promedio: ${stats.statistics.avg}
            - Valor máximo: ${stats.statistics.max}
            - Valor mínimo: ${stats.statistics.min}`);
    }
}

/**
 * Función para reinicializar la aplicación
 */
function reinitializeOLAP() {
    window.OLAP_UTILS.log('Reinicializando aplicación OLAP');
    
    // Limpiar instancias existentes
    if (window.olapControls) {
        window.olapControls.dispose();
    }
    
    if (window.olapRenderer) {
        window.olapRenderer.dispose();
    }
    
    // Limpiar el contenedor del canvas
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.innerHTML = '';
    }
    
    // Reinicializar después de un breve delay
    setTimeout(() => {
        initializeOLAPCube();
    }, 100);
}

/**
 * Función de utilidad para obtener información del sistema
 */
function getSystemInfo() {
    return {
        userAgent: navigator.userAgent,
        screenSize: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        pixelRatio: window.devicePixelRatio,
        webGLSupport: (() => {
            try {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch (e) {
                return false;
            }
        })(),
        threejsVersion: typeof THREE !== 'undefined' ? THREE.REVISION : 'No disponible',
        timestamp: new Date().toISOString()
    };
}

/**
 * Inicialización cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', function() {
    window.OLAP_UTILS.log('DOM cargado, inicializando aplicación OLAP Cube');
    
    // Verificar soporte de WebGL
    const systemInfo = getSystemInfo();
    window.OLAP_UTILS.log('Información del sistema obtenida correctamente');
    
    if (window.OLAP_CONFIG.debug.verboseLogging) {
        console.log('Detalles del sistema:', systemInfo);
    }
    
    if (!systemInfo.webGLSupport) {
        showCriticalError('Su navegador no soporta WebGL, que es requerido para esta aplicación.');
        return;
    }
    
    // Esperar a que Three.js esté disponible
    const checkThreeJS = () => {
        if (typeof THREE !== 'undefined') {
            window.OLAP_UTILS.log(`Three.js cargado (Revisión: ${THREE.REVISION})`);
            initializeOLAPCube();
        } else {
            window.OLAP_UTILS.log('Esperando carga de Three.js...');
            setTimeout(checkThreeJS, 100);
        }
    };
    
    checkThreeJS();
});

/**
 * Exponer funciones útiles globalmente para debugging
 */
window.OLAP_DEBUG = {
    reinitialize: reinitializeOLAP,
    getSystemInfo: getSystemInfo,
    getConfig: () => window.OLAP_CONFIG,
    getStats: () => window.olapOperations?.getCurrentStatistics(),
    exportData: () => window.olapControls?.exportCubeData(),
    clearAll: () => {
        window.olapOperations?.clearAllOperations();
        window.olapControls?.clearAllButtonStates();
    }
};

// Mensaje de desarrollo
if (window.OLAP_CONFIG?.debug?.enabled) {
    console.log('%cOLAP Cube Debug Mode', 'color: #4fc3f7; font-size: 16px; font-weight: bold;');
    console.log('Usa window.OLAP_DEBUG para acceder a funciones de debugging');
    console.log('Comandos disponibles:', Object.keys(window.OLAP_DEBUG));
}