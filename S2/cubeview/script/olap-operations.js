/**
 * Clase para manejar las operaciones OLAP específicas
 * Implementa slice, dice, drill-down, drill-up, pivot y drill-through
 */
class OLAPOperations {
    constructor() {
        this.currentSlices = { x: null, y: null, z: null };
        this.diceFilters = [];
        this.drillLevel = window.OLAP_CONSTANTS.DRILL_LEVELS.SUMMARY;
        this.pivotState = { x: 'source', y: 'route', z: 'time' };
        this.operationHistory = [];
        
        window.OLAP_UTILS.log('Motor de operaciones OLAP inicializado');
    }

    /**
     * Implementa operación Slice - corta el cubo en un plano específico
     */
    slice(axis, position = 0) {
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup) {
            window.OLAP_UTILS.log('Cubo no disponible para operación slice', 'error');
            return;
        }

        window.OLAP_UTILS.log(`Ejecutando operación Slice en eje ${axis} en posición ${position}`);
        
        // Remover slice anterior en este eje
        if (this.currentSlices[axis]) {
            window.OLAP_CONFIG.scene.remove(this.currentSlices[axis]);
            this.currentSlices[axis] = null;
        }

        // Crear plano de corte visual
        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: window.OLAP_CONFIG.colorConfig.slicePlane,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const slicePlane = new THREE.Mesh(planeGeometry, planeMaterial);
        
        // Posicionar plano según el eje
        switch(axis) {
            case 'x':
                slicePlane.position.x = position;
                slicePlane.rotation.y = Math.PI / 2;
                break;
            case 'y':
                slicePlane.position.y = position;
                slicePlane.rotation.x = Math.PI / 2;
                break;
            case 'z':
                slicePlane.position.z = position;
                break;
        }

        window.OLAP_CONFIG.scene.add(slicePlane);
        this.currentSlices[axis] = slicePlane;

        // Filtrar celdas visibles basado en la posición del slice
        let visibleCount = 0;
        cubeGroup.children.forEach(cell => {
            const pos = cell.position;
            let shouldShow = true;

            switch(axis) {
                case 'x':
                    shouldShow = Math.abs(pos.x - position) < 1;
                    break;
                case 'y':
                    shouldShow = Math.abs(pos.y - position) < 1;
                    break;
                case 'z':
                    shouldShow = Math.abs(pos.z - position) < 1;
                    break;
            }

            cell.visible = shouldShow;
            if (shouldShow) visibleCount++;
        });

        // Registrar operación
        this.addToHistory({
            operation: window.OLAP_CONSTANTS.OPERATIONS.SLICE,
            axis: axis,
            position: position,
            timestamp: new Date().toISOString()
        });

        this.updateCubeInfo(`Slice aplicado en eje ${axis.toUpperCase()} - ${visibleCount} celdas visibles`);
        window.OLAP_UTILS.log(`Slice completado: ${visibleCount} celdas visibles`);
    }

    /**
     * Implementa operación Dice - selecciona un subcubo con múltiples filtros
     */
    dice(filters = []) {
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup) {
            window.OLAP_UTILS.log('Cubo no disponible para operación dice', 'error');
            return;
        }

        window.OLAP_UTILS.log('Ejecutando operación Dice con filtros:', filters);
        
        this.diceFilters = filters;
        let visibleCount = 0;

        cubeGroup.children.forEach(cell => {
            let shouldShow = true;
            const userData = cell.userData;

            if (!userData) {
                shouldShow = false;
                cell.visible = shouldShow;
                return;
            }

            // Aplicar cada filtro
            filters.forEach(filter => {
                if (!shouldShow) return; // Skip si ya está filtrado

                switch(filter.dimension) {
                    case 'source':
                        if (filter.values && !filter.values.includes(userData.source)) {
                            shouldShow = false;
                        }
                        break;
                    case 'route':
                        if (filter.values && !filter.values.includes(userData.route)) {
                            shouldShow = false;
                        }
                        break;
                    case 'time':
                        if (filter.values && !filter.values.includes(userData.time)) {
                            shouldShow = false;
                        }
                        break;
                }
            });

            cell.visible = shouldShow;
            if (shouldShow) visibleCount++;
        });

        // Registrar operación
        this.addToHistory({
            operation: window.OLAP_CONSTANTS.OPERATIONS.DICE,
            filters: filters,
            timestamp: new Date().toISOString()
        });

        this.updateCubeInfo(`Dice aplicado con ${filters.length} filtros - ${visibleCount} celdas visibles`);
        window.OLAP_UTILS.log(`Dice completado: ${visibleCount} celdas visibles`);
    }

    /**
     * Resetea la operación dice, mostrando todas las celdas
     */
    resetDice() {
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup) return;

        window.OLAP_UTILS.log('Reseteando operación Dice');
        
        let totalCells = 0;
        cubeGroup.children.forEach(cell => {
            cell.visible = true;
            totalCells++;
        });

        this.diceFilters = [];
        
        // Registrar operación
        this.addToHistory({
            operation: 'reset_dice',
            timestamp: new Date().toISOString()
        });

        this.updateCubeInfo(`Dice reseteado - ${totalCells} celdas visibles`);
        window.OLAP_UTILS.log('Dice reseteado exitosamente');
    }

    /**
     * Implementa operación Drill-Down - navega a un nivel más detallado
     */
    drillDown() {
        window.OLAP_UTILS.log('Ejecutando operación Drill-Down con jerarquías');
        
        const hierarchies = window.OLAP_CONFIG.hierarchies;
        let canDrillDown = false;
        const changedDimensions = [];
        
        // Verificar si podemos hacer drill-down en alguna dimensión
        Object.keys(hierarchies).forEach(dimension => {
            const hierarchy = hierarchies[dimension];
            if (hierarchy.currentLevel < hierarchy.levels.length - 1) {
                canDrillDown = true;
                hierarchy.currentLevel++;
                changedDimensions.push(dimension);
            }
        });
        
        if (canDrillDown) {
            // Reconstruir el cubo con la nueva granularidad
            this.rebuildCubeWithNewGranularity();
            
            // Registrar operación
            this.addToHistory({
                operation: window.OLAP_CONSTANTS.OPERATIONS.DRILL_DOWN,
                changedDimensions: changedDimensions,
                hierarchyLevels: this.getCurrentHierarchyLevels(),
                timestamp: new Date().toISOString()
            });
            
            this.updateCubeInfo(`Drill-Down aplicado - ${this.getCurrentLevelDescription()}`);
            window.OLAP_UTILS.log('Drill-Down completado con nueva granularidad');
        } else {
            window.OLAP_UTILS.log('Ya está en el nivel máximo de detalle', 'warn');
            this.updateCubeInfo('Ya está en el nivel máximo de detalle');
        }
    }

    /**
     * Implementa operación Drill-Up - navega a un nivel menos detallado
     */
    drillUp() {
        window.OLAP_UTILS.log('Ejecutando operación Drill-Up con jerarquías');
        
        const hierarchies = window.OLAP_CONFIG.hierarchies;
        let canDrillUp = false;
        const changedDimensions = [];
        
        // Verificar si podemos hacer drill-up en alguna dimensión
        Object.keys(hierarchies).forEach(dimension => {
            const hierarchy = hierarchies[dimension];
            if (hierarchy.currentLevel > 0) {
                canDrillUp = true;
                hierarchy.currentLevel--;
                changedDimensions.push(dimension);
            }
        });
        
        if (canDrillUp) {
            // Reconstruir el cubo con la nueva granularidad
            this.rebuildCubeWithNewGranularity();
            
            // Registrar operación
            this.addToHistory({
                operation: window.OLAP_CONSTANTS.OPERATIONS.DRILL_UP,
                changedDimensions: changedDimensions,
                hierarchyLevels: this.getCurrentHierarchyLevels(),
                timestamp: new Date().toISOString()
            });
            
            this.updateCubeInfo(`Drill-Up aplicado - ${this.getCurrentLevelDescription()}`);
            window.OLAP_UTILS.log('Drill-Up completado con nueva granularidad');
        } else {
            window.OLAP_UTILS.log('Ya está en el nivel más alto de resumen', 'warn');
            this.updateCubeInfo('Ya está en el nivel más alto de resumen');
        }
    }

    /**
     * Reconstruye el cubo con nueva granularidad basada en jerarquías
     */
    rebuildCubeWithNewGranularity() {
        if (!window.olapRenderer) {
            window.OLAP_UTILS.log('Renderer no disponible para reconstrucción', 'error');
            return;
        }
        
        // Obtener nuevas dimensiones basadas en niveles actuales
        const newDimensions = this.getCurrentDimensionValues();
        
        // Reagregar datos según la nueva granularidad
        const aggregatedData = this.aggregateDataForCurrentLevel(newDimensions);
        
        // Notificar al renderer para reconstruir el cubo
        window.olapRenderer.rebuildCube(aggregatedData, newDimensions);
        
        window.OLAP_UTILS.log('Cubo reconstruido con nueva granularidad');
    }

    /**
     * Obtiene valores de dimensión actuales según jerarquías
     */
    getCurrentDimensionValues() {
        const hierarchies = window.OLAP_CONFIG.hierarchies;
        const dimensions = {};
        
        Object.keys(hierarchies).forEach(dimension => {
            const hierarchy = hierarchies[dimension];
            const currentLevel = hierarchy.currentLevel;
            const levelData = hierarchy.levels[currentLevel];
            dimensions[dimension] = levelData.values;
        });
        
        return dimensions;
    }

    /**
     * Agrega datos según el nivel jerárquico actual
     */
    aggregateDataForCurrentLevel(dimensions) {
        const originalData = window.OLAP_CONFIG.cubeData.measures[window.OLAP_CONFIG.cubeData.currentMeasure];
        const aggregatedData = [];
        
        dimensions.source.forEach((source, sourceIdx) => {
            dimensions.route.forEach((route, routeIdx) => {
                dimensions.time.forEach((time, timeIdx) => {
                    const aggregatedValue = this.calculateAggregatedValue(source, route, time, originalData);
                    
                    aggregatedData.push({
                        source: source,
                        route: route,
                        time: time,
                        value: aggregatedValue,
                        sourceIndex: sourceIdx,
                        routeIndex: routeIdx,
                        timeIndex: timeIdx
                    });
                });
            });
        });
        
        return aggregatedData;
    }

    /**
     * Calcula valor agregado para una combinación específica
     */
    calculateAggregatedValue(source, route, time, originalData) {
        const hierarchies = window.OLAP_CONFIG.hierarchies;
        
        // Si estamos en el nivel más detallado, buscar valor original o generar uno
        if (this.isAtMostDetailedLevel()) {
            return this.getOriginalValueOrGenerate(source, route, time, originalData);
        }
        
        // Agregar valores de elementos subordinados
        let aggregatedValue = 0;
        const sourceChildren = this.getChildrenForDimension('source', source);
        const routeChildren = this.getChildrenForDimension('route', route);
        const timeChildren = this.getChildrenForDimension('time', time);
        
        sourceChildren.forEach(childSource => {
            routeChildren.forEach(childRoute => {
                timeChildren.forEach(childTime => {
                    aggregatedValue += this.getOriginalValueOrGenerate(childSource, childRoute, childTime, originalData);
                });
            });
        });
        
        return aggregatedValue;
    }

    /**
     * Obtiene valor original o genera uno sintético si no existe
     */
    getOriginalValueOrGenerate(source, route, time, originalData) {
        const originalDimensions = window.OLAP_CONFIG.cubeData.dimensions;
        const sourceIdx = originalDimensions.source.indexOf(source);
        const timeIdx = originalDimensions.time.indexOf(time);
        
        // Si encontramos el valor original, usarlo
        if (sourceIdx >= 0 && timeIdx >= 0 && originalData[sourceIdx] && originalData[sourceIdx][timeIdx]) {
            return originalData[sourceIdx][timeIdx];
        }
        
        // Si no existe, generar valor sintético realista
        return this.generateSyntheticValue(source, route, time);
    }

    /**
     * Genera valores sintéticos realistas para celdas vacías
     */
    generateSyntheticValue(source, route, time) {
        const currentMeasure = window.OLAP_CONFIG.cubeData.currentMeasure;
        
        // Factores base según la medida
        const baseValues = {
            packages: { min: 50, max: 800, base: 200 },
            revenue: { min: 1000, max: 12000, base: 4000 },
            growth: { min: -5, max: 40, base: 15 }
        };
        
        const config = baseValues[currentMeasure] || baseValues.packages;
        
        // Factores por región (algunos son más productivos)
        const regionFactors = {
            'Africa': 0.6,
            'Asia': 1.4,
            'Australia': 0.8,
            'Europe': 1.3,
            'North America': 1.2,
            'South America': 0.9,
            'Eastern Hemisphere': 1.1,
            'Western Hemisphere': 1.05
        };
        
        // Factores por ruta (algunos métodos son más comunes)
        const routeFactors = {
            'ground': 1.2,
            'road': 1.2,
            'rail': 1.0,
            'sea': 1.5,
            'air': 0.8,
            'nonground': 1.15,
            'transport_type': 1.0
        };
        
        // Factores temporales (estacionalidad)
        const timeFactors = {
            'Q1': 0.9,
            'Q2': 1.1,
            'Q3': 1.3,
            'Q4': 1.4,
            '1st half': 1.0,
            '2nd half': 1.35,
            'half': 1.2
        };
        
        // También considerar fechas específicas si existen
        const dateFactors = {
            // Fechas de febrero-marzo (Q1)
            'Feb-17-99': 0.85, 'Mar-13-99': 0.95, 'Mar-05-99': 0.90, 'Mar-07-99': 0.88, 'Mar-30-99': 0.92, 'Feb-27-99': 0.87,
            // Fechas de abril-junio (Q2)
            'Apr-22-99': 1.05, 'May-31-99': 1.15, 'May-19-99': 1.10, 'Jun-20-99': 1.12, 'Jun-28-99': 1.08, 'Jun-03-99': 1.18,
            // Fechas de julio-septiembre (Q3)
            'Sep-07-99': 1.25, 'Sep-18-99': 1.35, 'Aug-09-99': 1.30, 'Sep-11-99': 1.28, 'Sep-30-99': 1.32, 'Aug-21-99': 1.22,
            // Fechas de octubre-diciembre (Q4)
            'Dec-01-99': 1.40, 'Dec-22-99': 1.50, 'Nov-27-99': 1.45, 'Dec-15-99': 1.42, 'Dec-29-99': 1.38, 'Nov-30-99': 1.35
        };
        
        // Calcular factores
        const regionFactor = regionFactors[source] || 1.0;
        const routeFactor = routeFactors[route] || 1.0;
        const timeFactor = timeFactors[time] || dateFactors[time] || 1.0;
        
        // Añadir variabilidad aleatoria pero consistente
        const seed = this.generateSeed(source, route, time);
        const randomFactor = 0.7 + (seed * 0.6); // Entre 0.7 y 1.3
        
        // Calcular valor final
        let value = config.base * regionFactor * routeFactor * timeFactor * randomFactor;
        
        // Asegurar que esté dentro del rango válido
        value = Math.max(config.min, Math.min(config.max, value));
        
        // Redondear según el tipo de medida
        if (currentMeasure === 'packages') {
            value = Math.round(value);
        } else if (currentMeasure === 'revenue') {
            value = Math.round(value / 10) * 10; // Redondear a decenas
        } else if (currentMeasure === 'growth') {
            value = Math.round(value * 10) / 10; // Un decimal
        }
        
        return value;
    }

    /**
     * Genera una semilla consistente para la aleatoriedad
     */
    generateSeed(source, route, time) {
        // Crear hash simple pero consistente
        const str = `${source}-${route}-${time}`;
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        
        // Normalizar a valor entre 0 y 1
        return Math.abs(hash % 1000) / 1000;
    }

    /**
     * Obtiene hijos de una dimensión específica
     */
    getChildrenForDimension(dimension, value) {
        const hierarchy = window.OLAP_CONFIG.hierarchies[dimension];
        const currentLevel = hierarchy.currentLevel;
        const levelData = hierarchy.levels[currentLevel];
        
        if (levelData.aggregationMap && levelData.aggregationMap[value]) {
            return levelData.aggregationMap[value];
        }
        
        return [value]; // Si no tiene hijos, retornar el mismo valor
    }

    /**
     * Verifica si estamos en el nivel más detallado
     */
    isAtMostDetailedLevel() {
        const hierarchies = window.OLAP_CONFIG.hierarchies;
        return Object.keys(hierarchies).every(dimension => {
            const hierarchy = hierarchies[dimension];
            return hierarchy.currentLevel === hierarchy.levels.length - 1;
        });
    }

    /**
     * Obtiene valor original de los datos base
     */
    getOriginalValue(source, route, time, originalData) {
        const originalDimensions = window.OLAP_CONFIG.cubeData.dimensions;
        const sourceIdx = originalDimensions.source.indexOf(source);
        const timeIdx = originalDimensions.time.indexOf(time);
        
        // Si encontramos índices válidos en los datos originales
        if (sourceIdx >= 0 && timeIdx >= 0 && originalData[sourceIdx]) {
            const value = originalData[sourceIdx][timeIdx];
            if (value && value > 0) {
                return value;
            }
        }
        
        // Si no encontramos datos originales, generar valor sintético
        return this.generateSyntheticValue(source, route, time);
    }

    /**
     * Obtiene niveles actuales de jerarquía
     */
    getCurrentHierarchyLevels() {
        const hierarchies = window.OLAP_CONFIG.hierarchies;
        const levels = {};
        
        Object.keys(hierarchies).forEach(dimension => {
            const hierarchy = hierarchies[dimension];
            levels[dimension] = {
                currentLevel: hierarchy.currentLevel,
                levelName: hierarchy.levels[hierarchy.currentLevel].name,
                totalLevels: hierarchy.levels.length
            };
        });
        
        return levels;
    }

    /**
     * Genera descripción del nivel actual
     */
    getCurrentLevelDescription() {
        const levels = this.getCurrentHierarchyLevels();
        const descriptions = Object.keys(levels).map(dim => 
            `${dim}: ${levels[dim].levelName} (${levels[dim].currentLevel + 1}/${levels[dim].totalLevels})`
        );
        return descriptions.join(', ');
    }

    /**
     * Anima la escala de un objeto suavemente
     */
    animateScale(object, targetScale, duration) {
        const startScale = object.scale.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Interpolación suave
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
            
            object.scale.lerpVectors(startScale, targetScale, easedProgress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Anima el zoom de la cámara suavemente
     */
    animateCameraZoom(camera, scale, duration) {
        const startPosition = camera.position.clone();
        const targetPosition = startPosition.clone().multiplyScalar(scale);
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
            
            camera.position.lerpVectors(startPosition, targetPosition, easedProgress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Implementa operación Drill-Through - accede a datos detallados subyacentes
     */
    drillThrough(cellData = null) {
        window.OLAP_UTILS.log('Ejecutando operación Drill-Through');
        
        let targetCellData = cellData;
        
        if (!targetCellData) {
            // Usar primera celda visible como ejemplo
            const cubeGroup = window.OLAP_CONFIG.cube;
            if (cubeGroup) {
                const visibleCell = cubeGroup.children.find(cell => cell.visible);
                if (visibleCell && visibleCell.userData) {
                    targetCellData = visibleCell.userData;
                }
            }
        }

        if (targetCellData) {
            const detailInfo = this.generateDetailData(targetCellData);
            this.showDrillThroughModal(detailInfo);
            
            // Registrar operación
            this.addToHistory({
                operation: window.OLAP_CONSTANTS.OPERATIONS.DRILL_THROUGH,
                cellData: {
                    source: targetCellData.source,
                    route: targetCellData.route,
                    time: targetCellData.time,
                    value: targetCellData.value
                },
                timestamp: new Date().toISOString()
            });
        } else {
            window.OLAP_UTILS.log('No hay datos disponibles para drill-through', 'warn');
        }

        this.updateCubeInfo('Drill-Through ejecutado - datos detallados mostrados');
    }

    /**
     * Genera datos detallados sintéticos para drill-through
     */
    generateDetailData(cellData) {
    const transactions = window.OLAP_UTILS.generateDrillThroughData(cellData);
    const stats = window.OLAP_UTILS.calculateStatistics(transactions.map(t => t.amount));

    // Generar información jerárquica de forma segura
    const hierarchicalData = this.generateHierarchicalBreakdown(cellData);

    return {
        summary: `${cellData.source} → ${cellData.route} → ${cellData.time}`,
        value: cellData.value,
        hierarchicalBreakdown: hierarchicalData, // Puede ser null si no hay jerarquías
        transactions: transactions,
        statistics: stats,
        metadata: {
            generatedAt: new Date().toISOString(),
            coordinates: `(${cellData.sourceIndex}, ${cellData.routeIndex}, ${cellData.timeIndex})`,
            granularity: hierarchicalData ? this.getCurrentLevelDescription() : 'Nivel básico'
        }
    };
}

    /**
     * Genera desglose jerárquico para drill-through
     */
    generateHierarchicalBreakdown(cellData) {
    // VALIDACIÓN: Si no hay jerarquías configuradas, retornar null
    const hierarchies = window.OLAP_CONFIG.hierarchies;
    if (!hierarchies) {
        window.OLAP_UTILS.log('Jerarquías no configuradas, usando modo simple', 'warn');
        return null;
    }
    
    const breakdown = {};
    
    Object.keys(hierarchies).forEach(dimension => {
        const hierarchy = hierarchies[dimension];
        if (!hierarchy || !hierarchy.levels || !Array.isArray(hierarchy.levels)) {
            window.OLAP_UTILS.log(`Jerarquía mal configurada para dimensión: ${dimension}`, 'warn');
            return;
        }
        
        const currentLevel = hierarchy.currentLevel || 0;
        const levelData = hierarchy.levels[currentLevel];
        
        if (!levelData) {
            window.OLAP_UTILS.log(`Nivel no encontrado para dimensión ${dimension}`, 'warn');
            return;
        }
        
        breakdown[dimension] = {
            currentLevel: levelData.name,
            currentValue: cellData[dimension],
            availableLevels: hierarchy.levels.map(level => level.name),
            canDrillDown: currentLevel < hierarchy.levels.length - 1,
            canDrillUp: currentLevel > 0,
            levelPosition: `${currentLevel + 1}/${hierarchy.levels.length}`
        };
        
        // Si hay elementos subordinados, mostrarlos
        if (levelData.aggregationMap && levelData.aggregationMap[cellData[dimension]]) {
            breakdown[dimension].children = levelData.aggregationMap[cellData[dimension]];
        }
    });
    
    return breakdown;
}

    /**
     * Muestra modal con información detallada de drill-through
     */
    showDrillThroughModal(detailInfo) {
        // Remover modal existente si hay uno
        const existingModal = document.getElementById('drill-through-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Crear modal temporal para mostrar datos detallados
        const modal = document.createElement('div');
        modal.id = 'drill-through-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 25px;
            border-radius: 12px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(79, 195, 247, 0.3);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            position: relative;
            margin: 20px;
        `;

        const transactionRows = detailInfo.transactions.map(transaction => 
            `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 8px; font-size: 11px;">${transaction.id}</td>
                <td style="padding: 8px; font-size: 11px; text-align: right;">${window.OLAP_UTILS.formatNumber(transaction.amount)}</td>
                <td style="padding: 8px; font-size: 11px;">${transaction.date}</td>
                <td style="padding: 8px; font-size: 11px;">${transaction.type}</td>
            </tr>`
        ).join('');

        // NUEVA SECCIÓN: Generar HTML para contexto jerárquico
        const hierarchySection = detailInfo.hierarchicalBreakdown ? `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #4fc3f7; font-size: 14px;">Contexto Jerárquico:</h4>
                ${Object.keys(detailInfo.hierarchicalBreakdown).map(dimension => {
                    const info = detailInfo.hierarchicalBreakdown[dimension];
                    const childrenInfo = info.children ? 
                        `<br><small style="color: #b0bec5;">Incluye: ${info.children.slice(0, 3).join(', ')}${info.children.length > 3 ? '...' : ''}</small>` : '';
                    
                    return `
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                            <strong>${dimension.toUpperCase()}:</strong> ${info.currentLevel} → ${info.currentValue}
                            <div style="font-size: 10px; color: #81c784; margin-top: 3px;">
                                Nivel ${info.levelPosition} ${info.canDrillUp ? '| ↑ Drill-Up disponible' : ''} ${info.canDrillDown ? '| ↓ Drill-Down disponible' : ''}
                            </div>
                            ${childrenInfo}
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #4fc3f7; margin: 0;">Drill-Through Details</h3>
                <button id="close-modal-btn" 
                        style="background: #ff5722; border: none; color: white; width: 30px; height: 30px; 
                            border-radius: 50%; cursor: pointer; font-size: 16px; font-weight: bold;
                            display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            
            <div style="background: rgba(79, 195, 247, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0; font-size: 14px;"><strong>Ruta:</strong> ${detailInfo.summary}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Total:</strong> ${window.OLAP_UTILS.formatNumber(detailInfo.value)} packages</p>
                <p style="margin: 0; font-size: 12px; color: #b0bec5;">Coordenadas: ${detailInfo.metadata.coordinates}</p>
            </div>
            
            ${hierarchySection}
            
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #4fc3f7; font-size: 14px;">Estadísticas:</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                    <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
                        <strong>Min:</strong> ${window.OLAP_UTILS.formatNumber(detailInfo.statistics.min)}
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
                        <strong>Max:</strong> ${window.OLAP_UTILS.formatNumber(detailInfo.statistics.max)}
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
                        <strong>Promedio:</strong> ${window.OLAP_UTILS.formatNumber(detailInfo.statistics.avg)}
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
                        <strong>Transacciones:</strong> ${detailInfo.statistics.count}
                    </div>
                </div>
            </div>
            
            <div>
                <h4 style="margin: 0 0 10px 0; color: #4fc3f7; font-size: 14px;">Transacciones Detalladas:</h4>
                <div style="max-height: 250px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead style="position: sticky; top: 0; background: rgba(79, 195, 247, 0.2);">
                            <tr>
                                <th style="padding: 10px 8px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.2);">ID</th>
                                <th style="padding: 10px 8px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.2);">Cantidad</th>
                                <th style="padding: 10px 8px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.2);">Fecha</th>
                                <th style="padding: 10px 8px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.2);">Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionRows}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 25px;">
                <button id="close-modal-footer-btn" 
                        style="padding: 12px 25px; background: #4fc3f7; border: none; 
                            border-radius: 6px; color: white; cursor: pointer; font-size: 14px; font-weight: 500;
                            transition: background 0.3s ease;">
                    Cerrar
                </button>
            </div>
        `;

        // Añadir contenido al modal
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Variable para el timer de auto-cierre
        let autoCloseTimer = null;

        // Función para cerrar el modal
        const closeModal = () => {
            // Limpiar timer si existe
            if (autoCloseTimer) {
                clearTimeout(autoCloseTimer);
                autoCloseTimer = null;
            }
            
            if (modal && modal.parentElement) {
                modal.style.opacity = '0';
                modal.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    if (modal.parentElement) {
                        modal.remove();
                    }
                }, 300);
            }
        };

        // Event listeners para cerrar
        const closeBtn = modalContent.querySelector('#close-modal-btn');
        const footerBtn = modalContent.querySelector('#close-modal-footer-btn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
        }
        
        if (footerBtn) {
            footerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
        }

        // Cerrar al hacer click en el fondo del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Cerrar con tecla Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Animación de entrada
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        // Auto-cerrar después de 60 segundos
        autoCloseTimer = setTimeout(() => {
            closeModal();
        }, 60000);

        window.OLAP_UTILS.log('Modal de drill-through mostrado con controles mejorados');
    }

    /**
     * Implementa operación Pivot - intercambia dimensiones del cubo
     */
    pivot(axis1, axis2) {
        window.OLAP_UTILS.log(`Ejecutando operación Pivot entre ${axis1} y ${axis2}`);
        
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup) {
            window.OLAP_UTILS.log('Cubo no disponible para operación pivot', 'error');
            return;
        }

        // Determinar ángulo de rotación basado en los ejes
        let rotationAxis = new THREE.Vector3(0, 0, 0);
        let angle = Math.PI / 2;

        switch(`${axis1}-${axis2}`) {
            case 'x-y':
                rotationAxis.z = 1;
                break;
            case 'x-z':
                rotationAxis.y = 1;
                break;
            case 'y-z':
                rotationAxis.x = 1;
                break;
            default:
                window.OLAP_UTILS.log(`Combinación de ejes no válida: ${axis1}-${axis2}`, 'warn');
                return;
        }

        // Animar la rotación del cubo
        this.animatePivot(cubeGroup, rotationAxis, angle);
        
        // Actualizar estado del pivot
        const temp = this.pivotState[axis1];
        this.pivotState[axis1] = this.pivotState[axis2];
        this.pivotState[axis2] = temp;

        // Registrar operación
        this.addToHistory({
            operation: window.OLAP_CONSTANTS.OPERATIONS.PIVOT,
            axes: [axis1, axis2],
            newState: { ...this.pivotState },
            timestamp: new Date().toISOString()
        });

        this.updateCubeInfo(`Pivot aplicado entre ${axis1.toUpperCase()} y ${axis2.toUpperCase()}`);
        window.OLAP_UTILS.log(`Pivot completado entre ejes ${axis1} y ${axis2}`);
    }

    /**
     * Anima la rotación del pivot de forma suave
     */
    animatePivot(cubeGroup, rotationAxis, targetAngle) {
        const duration = window.OLAP_CONFIG.animationConfig.pivotDuration;
        const startTime = Date.now();
        const initialRotation = cubeGroup.rotation.clone();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Interpolación suave usando función easing
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
            const currentAngle = targetAngle * easedProgress;

            if (rotationAxis.x) cubeGroup.rotation.x = initialRotation.x + currentAngle;
            if (rotationAxis.y) cubeGroup.rotation.y = initialRotation.y + currentAngle;
            if (rotationAxis.z) cubeGroup.rotation.z = initialRotation.z + currentAngle;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                window.OLAP_UTILS.log('Animación de pivot completada');
            }
        };

        animate();
    }

    /**
     * Limpia slices específicos
     */
    clearSlice(axis) {
        if (this.currentSlices[axis]) {
            window.OLAP_CONFIG.scene.remove(this.currentSlices[axis]);
            this.currentSlices[axis] = null;
            window.OLAP_UTILS.log(`Slice en eje ${axis} eliminado`);
        }
    }

    /**
     * Limpia todos los slices
     */
    clearAllSlices() {
        Object.keys(this.currentSlices).forEach(axis => {
            this.clearSlice(axis);
        });
        
        // Mostrar todas las celdas
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (cubeGroup) {
            cubeGroup.children.forEach(cell => {
                cell.visible = true;
            });
        }
        
        window.OLAP_UTILS.log('Todos los slices eliminados');
    }

    /**
     * Actualiza la información mostrada en el panel de información
     */
    updateCubeInfo(operation) {
        const infoElement = document.getElementById('cube-info');
        if (!infoElement) return;

        const cubeGroup = window.OLAP_CONFIG.cube;
        const stats = window.olapRenderer ? window.olapRenderer.getRenderStats() : null;
        
        const visibleCells = stats ? stats.visibleCells : 
            (cubeGroup ? cubeGroup.children.filter(cell => cell.visible).length : 0);

        infoElement.innerHTML = `
            Dimensiones: 3 (Source, Route, Time)<br>
            Celdas Visibles: ${visibleCells}<br>
            Operación Actual: ${operation}<br>
            Nivel de Detalle: ${this.getLevelName()}<br>
            Filtros Activos: ${this.diceFilters.length}
        `;
    }

    /**
     * Obtiene el nombre del nivel de drill actual
     */
    getLevelName() {
        switch(this.drillLevel) {
            case window.OLAP_CONSTANTS.DRILL_LEVELS.SUMMARY: 
                return 'Resumen';
            case window.OLAP_CONSTANTS.DRILL_LEVELS.DETAIL: 
                return 'Detalle';
            case window.OLAP_CONSTANTS.DRILL_LEVELS.MAX_DETAIL: 
                return 'Máximo Detalle';
            default: 
                return 'Desconocido';
        }
    }

    /**
     * Añade operación al historial
     */
    addToHistory(operation) {
        this.operationHistory.push(operation);
        
        // Mantener solo las últimas 50 operaciones
        if (this.operationHistory.length > 50) {
            this.operationHistory.shift();
        }
        
        if (window.OLAP_CONFIG.debug.logOperations) {
            window.OLAP_UTILS.log(`Operación registrada: ${operation.operation}`, 'debug');
        }
    }

    /**
     * Obtiene el historial de operaciones
     */
    getOperationHistory() {
        return [...this.operationHistory];
    }

    /**
     * Exporta el estado actual del cubo
     */
    exportCubeState() {
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup) return null;

        const visibleCells = cubeGroup.children
            .filter(cell => cell.visible)
            .map(cell => ({
                ...cell.userData,
                position: {
                    x: cell.position.x,
                    y: cell.position.y,
                    z: cell.position.z
                },
                scale: {
                    x: cell.scale.x,
                    y: cell.scale.y,
                    z: cell.scale.z
                }
            }));

        return {
            timestamp: new Date().toISOString(),
            drillLevel: this.drillLevel,
            pivotState: { ...this.pivotState },
            diceFilters: [...this.diceFilters],
            visibleCells: visibleCells,
            totalCells: cubeGroup.children.length,
            operationHistory: this.getOperationHistory(),
            currentMeasure: window.OLAP_CONFIG.cubeData.currentMeasure
        };
    }

    /**
     * Limpia todas las operaciones aplicadas
     */
    clearAllOperations() {
        window.OLAP_UTILS.log('Limpiando todas las operaciones OLAP');
        
        // Limpiar slices
        this.clearAllSlices();

        // Resetear dice
        this.resetDice();

        // Resetear niveles de jerarquía a valores iniciales
        if (window.OLAP_CONFIG.hierarchies) {
            Object.keys(window.OLAP_CONFIG.hierarchies).forEach(dimension => {
                const hierarchy = window.OLAP_CONFIG.hierarchies[dimension];
                // Restaurar a nivel inicial (generalmente nivel 1)
                hierarchy.currentLevel = 1;
            });
            
            // Reconstruir cubo con niveles iniciales
            this.rebuildCubeWithNewGranularity();
        } else {
            // Fallback si no hay jerarquías configuradas
            window.OLAP_UTILS.log('Jerarquías no disponibles, usando reseteo básico', 'warn');
            
            // Resetear drill level básico
            this.drillLevel = window.OLAP_CONSTANTS.DRILL_LEVELS.SUMMARY;
            
            // Si hay renderer disponible, resetear cubo básico
            if (window.olapRenderer) {
                window.olapRenderer.updateCubeVisualization();
            }
        }

        // Resetear pivot
        this.pivotState = { x: 'source', y: 'route', z: 'time' };
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (cubeGroup) {
            cubeGroup.rotation.set(0, 0, 0);
        }

        // NUEVO: Resetear colores a valores originales
        if (window.olapRenderer && typeof window.olapRenderer.resetCubeColors === 'function') {
            window.olapRenderer.resetCubeColors();
        } else {
            // Fallback: resetear colores manualmente
            this.resetColorsManually();
        }

        // NUEVO: Resetear cámara a posición original
        if (window.olapRenderer && typeof window.olapRenderer.resetCamera === 'function') {
            window.olapRenderer.resetCamera();
        }

        // Limpiar historial
        this.operationHistory = [];

        // Registrar operación de limpieza
        this.addToHistory({
            operation: 'clear_all',
            timestamp: new Date().toISOString()
        });

        this.updateCubeInfo('Todas las operaciones limpiadas - Cubo restaurado completamente');
        window.OLAP_UTILS.log('Todas las operaciones OLAP limpiadas exitosamente');
    }

    /**
     * Método fallback para resetear colores manualmente
     */
    resetColorsManually() {
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup) return;
        
        window.OLAP_UTILS.log('Reseteando colores manualmente');
        
        cubeGroup.children.forEach(cell => {
            const userData = cell.userData;
            if (!userData) return;
            
            // Recalcular color original
            const currentMeasure = window.OLAP_CONFIG.cubeData.currentMeasure;
            const value = window.OLAP_UTILS.getMeasureValue(
                userData.sourceIndex, 
                userData.routeIndex, 
                userData.timeIndex, 
                currentMeasure
            );
            
            const normalizedValue = window.OLAP_UTILS.normalizeValue(value, currentMeasure);
            const colorHSL = window.OLAP_UTILS.generateColor(normalizedValue);
            const originalColor = new THREE.Color().setHSL(colorHSL.h, colorHSL.s, colorHSL.l);
            
            // Restaurar propiedades del material
            if (cell.material) {
                cell.material.color.copy(originalColor);
                cell.material.opacity = 0.7;
                cell.material.emissive.setHex(0x000000);
                cell.material.wireframe = false;
                cell.material.transparent = true;
            }
            
            // Restaurar escala y visibilidad
            cell.scale.setScalar(1.0);
            cell.visible = true;
            
            // Restaurar rotación
            cell.rotation.set(0, 0, 0);
        });
    }

    /**
     * Aplica filtros avanzados al cubo
     */
    applyAdvancedFilter(filterFunction) {
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup || typeof filterFunction !== 'function') return;

        let visibleCount = 0;
        
        cubeGroup.children.forEach(cell => {
            if (cell.userData) {
                const shouldShow = filterFunction(cell.userData);
                cell.visible = shouldShow;
                if (shouldShow) visibleCount++;
            }
        });

        window.OLAP_UTILS.log(`Filtro avanzado aplicado: ${visibleCount} celdas visibles`);
        this.updateCubeInfo(`Filtro avanzado aplicado - ${visibleCount} celdas visibles`);
    }

    /**
     * Obtiene estadísticas del estado actual
     */
    getCurrentStatistics() {
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (!cubeGroup) return null;

        const visibleCells = cubeGroup.children.filter(cell => cell.visible);
        const values = visibleCells
            .map(cell => cell.userData ? cell.userData.value : 0)
            .filter(value => value > 0);

        return {
            totalCells: cubeGroup.children.length,
            visibleCells: visibleCells.length,
            hiddenCells: cubeGroup.children.length - visibleCells.length,
            statistics: window.OLAP_UTILS.calculateStatistics(values),
            drillLevel: this.drillLevel,
            activeFilters: this.diceFilters.length,
            activeSlices: Object.values(this.currentSlices).filter(slice => slice !== null).length
        };
    }
}