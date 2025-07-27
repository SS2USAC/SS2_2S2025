/**
 * Configuración global de la aplicación OLAP
 * Define constantes, datos del cubo y configuraciones del sistema
 */
window.OLAP_CONFIG = {
    // Referencias a objetos Three.js principales
    scene: null,
    camera: null,
    renderer: null,
    cube: null,
    controls: null,
    animationId: null,
    
    // Estado de la aplicación
    isAutoRotating: false,
    currentOperation: null,
    
    // Configuración del cubo de datos basada en la imagen proporcionada
    cubeData: {
        dimensions: {
            source: ['Africa', 'Asia', 'Australia', 'Europe', 'North America', 'South America'],
            route: ['ground', 'rail', 'sea', 'air'],
            time: ['Q1', 'Q2', 'Q3', 'Q4']
        },
        
        // Datos de medidas basados en la tabla de la imagen original
        measures: {
            packages: [
                [100, 215, 160, 240], // Africa por trimestre
                [310, 410, 250, 390], // Asia por trimestre  
                [210, 240, 300, 410], // Australia por trimestre
                [500, 470, 464, 690], // Europe por trimestre
                [400, 380, 420, 512], // North America por trimestre
                [600, 490, 515, 580]  // South America por trimestre
            ],
            
            // Datos sintéticos adicionales para otras medidas
            revenue: [
                [1550, 3333, 2480, 3720], // Africa revenue
                [4805, 6355, 3875, 6045], // Asia revenue
                [3255, 3720, 4650, 6355], // Australia revenue
                [7750, 7285, 7192, 10695], // Europe revenue
                [6200, 5890, 6510, 7936], // North America revenue
                [9300, 7595, 7983, 8990]  // South America revenue
            ],
            
            growth: [
                [5, 12, 8, 15], // Africa growth %
                [18, 23, 10, 20], // Asia growth %
                [12, 15, 18, 23], // Australia growth %
                [25, 22, 21, 35], // Europe growth %
                [20, 18, 22, 28], // North America growth %
                [30, 24, 26, 32]  // South America growth %
            ]
        },
        
        // Configuración activa del cubo
        currentDimensions: ['source', 'route', 'time'],
        currentMeasure: 'packages'
    },
    
    // Configuración de jerarquías para drill operations
    hierarchies: {
        time: {
            levels: [
                {
                    name: 'half',
                    values: ['1st half', '2nd half'],
                    aggregationMap: {
                        '1st half': ['Q1', 'Q2'],
                        '2nd half': ['Q3', 'Q4']
                    }
                },
                {
                    name: 'quarter',
                    values: ['Q1', 'Q2', 'Q3', 'Q4'],
                    aggregationMap: {
                        'Q1': ['Feb-17-99', 'Mar-13-99', 'Mar-05-99', 'Mar-07-99', 'Mar-30-99', 'Feb-27-99'],
                        'Q2': ['Apr-22-99', 'May-31-99', 'May-19-99', 'Jun-20-99', 'Jun-28-99', 'Jun-03-99'],
                        'Q3': ['Sep-07-99', 'Sep-18-99', 'Aug-09-99', 'Sep-11-99', 'Sep-30-99', 'Aug-21-99'],
                        'Q4': ['Dec-01-99', 'Dec-22-99', 'Nov-27-99', 'Dec-15-99', 'Dec-29-99', 'Nov-30-99']
                    }
                },
                {
                    name: 'date',
                    values: [
                        'Feb-17-99', 'Apr-22-99', 'Sep-07-99', 'Dec-01-99', // Africa dates
                        'Mar-13-99', 'May-31-99', 'Sep-18-99', 'Dec-22-99', // Asia dates
                        'Mar-05-99', 'May-19-99', 'Aug-09-99', 'Nov-27-99', // Australia dates
                        'Mar-07-99', 'Jun-20-99', 'Sep-11-99', 'Dec-15-99', // Europe dates
                        'Mar-30-99', 'Jun-28-99', 'Sep-30-99', 'Dec-29-99', // North America dates
                        'Feb-27-99', 'Jun-03-99', 'Aug-21-99', 'Nov-30-99'  // South America dates
                    ],
                    aggregationMap: null // Nivel más bajo, no se puede agregar más
                }
            ],
            currentLevel: 1 // Empezar en 'quarter'
        },
        
        source: {
            levels: [
                {
                    name: 'hemisphere',
                    values: ['Eastern Hemisphere', 'Western Hemisphere'],
                    aggregationMap: {
                        'Eastern Hemisphere': ['Africa', 'Asia', 'Australia', 'Europe'],
                        'Western Hemisphere': ['North America', 'South America']
                    }
                },
                {
                    name: 'region',
                    values: ['Africa', 'Asia', 'Australia', 'Europe', 'North America', 'South America'],
                    aggregationMap: null
                }
            ],
            currentLevel: 1 // Empezar en 'region'
        },
        
        route: {
            levels: [
                {
                    name: 'transport_type',
                    values: ['ground', 'nonground'],
                    aggregationMap: {
                        'ground': ['road', 'rail'],
                        'nonground': ['sea', 'air']
                    }
                },
                {
                    name: 'method',
                    values: ['road', 'rail', 'sea', 'air'],
                    aggregationMap: null
                }
            ],
            currentLevel: 1 // Empezar en 'method'
        }
    },
    
    // Configuración de renderizado 3D
    renderConfig: {
        cellSize: 1.5,
        spacing: 0.1,
        cameraDistance: 15,
        fov: 60,
        near: 0.1,
        far: 1000
    },
    
    // Configuración de colores y materiales
    colorConfig: {
        background: 0x0a0a0a,
        ambientLight: 0x404040,
        directionalLight: 0xffffff,
        pointLight: 0x4fc3f7,
        slicePlane: 0xff4444,
        highlight: 0x444444,
        wireframe: 0xffffff
    },
    
    // Configuración de animaciones
    animationConfig: {
        pivotDuration: 1000,
        cameraEasing: 0.1,
        rotationSpeed: 0.005,
        highlightDuration: 300
    },
    
    // Mensajes y textos de la interfaz
    messages: {
        loading: 'Cargando cubo OLAP...',
        initialized: 'Aplicación OLAP Cube inicializada correctamente',
        error: 'Error al inicializar la aplicación OLAP',
        noData: 'No hay datos disponibles para esta configuración',
        operationComplete: 'Operación completada exitosamente'
    },
    
    // Configuración de debugging
    debug: {
        enabled: true,
        logOperations: true,
        showPerformance: false,
        verboseLogging: false
    }
};

/**
 * Constantes globales para operaciones OLAP
 */
window.OLAP_CONSTANTS = {
    // Tipos de operaciones OLAP
    OPERATIONS: {
        SLICE: 'slice',
        DICE: 'dice',
        DRILL_DOWN: 'drill_down',
        DRILL_UP: 'drill_up',
        DRILL_THROUGH: 'drill_through',
        PIVOT: 'pivot',
        ROLL_UP: 'roll_up'
    },
    
    // Ejes del cubo
    AXES: {
        X: 'x',
        Y: 'y', 
        Z: 'z'
    },
    
    // Niveles de drill
    DRILL_LEVELS: {
        SUMMARY: 0,
        DETAIL: 1,
        MAX_DETAIL: 2
    },
    
    // Estados de visualización
    DISPLAY_STATES: {
        VISIBLE: 'visible',
        HIDDEN: 'hidden',
        HIGHLIGHTED: 'highlighted',
        FILTERED: 'filtered'
    }
};

/**
 * Utilidades globales para la aplicación OLAP
 */
window.OLAP_UTILS = {
    /**
     * Registra mensajes en consola con formato consistente
     */
    log: function(message, type = 'info') {
        if (!window.OLAP_CONFIG.debug.enabled) return;
        
        // Asegurar que type sea string
        const logType = typeof type === 'string' ? type : 'info';
        const timestamp = new Date().toISOString();
        const prefix = `[OLAP-${logType.toUpperCase()}] ${timestamp}:`;
        
        // Si message es un objeto, convertirlo a string
        const logMessage = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
        
        switch(logType) {
            case 'error':
                console.error(prefix, logMessage);
                break;
            case 'warn':
                console.warn(prefix, logMessage);
                break;
            case 'debug':
                if (window.OLAP_CONFIG.debug.verboseLogging) {
                    console.debug(prefix, logMessage);
                }
                break;
            default:
                console.log(prefix, logMessage);
        }
    },
    
    /**
     * Calcula el valor normalizado de una medida para colorización
     */
    normalizeValue: function(value, measure = 'packages') {
        const maxValues = {
            packages: 700,
            revenue: 11000,
            growth: 35
        };
        
        const maxValue = maxValues[measure] || 700;
        return Math.min(value / maxValue, 1);
    },
    
    /**
     * Genera color HSL basado en valor de datos
     */
    generateColor: function(normalizedValue) {
        return {
            h: 0.6 - normalizedValue * 0.4, // Hue: de cyan a rojo
            s: 0.8, // Saturación
            l: 0.3 + normalizedValue * 0.4 // Luminosidad basada en valor
        };
    },
    
    /**
     * Formatea números para visualización
     */
    formatNumber: function(number, decimals = 0) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    },
    
    /**
     * Valida coordenadas del cubo
     */
    validateCoordinates: function(sourceIdx, routeIdx, timeIdx) {
        const data = window.OLAP_CONFIG.cubeData;
        return (
            sourceIdx >= 0 && sourceIdx < data.dimensions.source.length &&
            routeIdx >= 0 && routeIdx < data.dimensions.route.length &&
            timeIdx >= 0 && timeIdx < data.dimensions.time.length
        );
    },
    
    /**
     * Obtiene valor de medida para coordenadas específicas
     */
    getMeasureValue: function(sourceIdx, routeIdx, timeIdx, measure = 'packages') {
        if (!this.validateCoordinates(sourceIdx, routeIdx, timeIdx)) {
            return 0;
        }
        
        const data = window.OLAP_CONFIG.cubeData.measures[measure];
        if (!data || !data[sourceIdx]) {
            return 0;
        }
        
        return data[sourceIdx][timeIdx] || 0;
    },
    
    /**
     * Genera datos sintéticos para drill-through
     */
    generateDrillThroughData: function(cellData) {
        const baseValue = cellData.value || 0;
        const transactions = [];
        
        // Generar entre 2-5 transacciones que sumen al total
        const numTransactions = Math.floor(Math.random() * 4) + 2;
        let remaining = baseValue;
        
        for (let i = 0; i < numTransactions - 1; i++) {
            const amount = Math.floor(remaining * (0.2 + Math.random() * 0.4));
            transactions.push({
                id: `TXN-${String(i + 1).padStart(3, '0')}`,
                amount: amount,
                date: this.generateRandomDate(),
                type: 'Package Shipment'
            });
            remaining -= amount;
        }
        
        // Última transacción con el valor restante
        transactions.push({
            id: `TXN-${String(numTransactions).padStart(3, '0')}`,
            amount: remaining,
            date: this.generateRandomDate(),
            type: 'Package Shipment'
        });
        
        return transactions;
    },
    
    /**
     * Genera fecha aleatoria para datos sintéticos
     */
    generateRandomDate: function() {
        const start = new Date(2024, 0, 1);
        const end = new Date(2024, 11, 31);
        const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
        return new Date(randomTime).toLocaleDateString('es-ES');
    },
    
    /**
     * Calcula estadísticas básicas de un conjunto de datos
     */
    calculateStatistics: function(values) {
        if (!Array.isArray(values) || values.length === 0) {
            return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
        }
        
        const sum = values.reduce((acc, val) => acc + val, 0);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = sum / values.length;
        
        return {
            min: min,
            max: max,
            avg: Math.round(avg * 100) / 100,
            sum: sum,
            count: values.length
        };
    },
    
    /**
     * Debounce function para optimizar eventos frecuentes
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};