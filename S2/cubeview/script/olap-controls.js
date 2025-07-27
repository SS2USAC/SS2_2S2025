/**
 * Clase para manejar la interfaz de usuario y controles
 * Conecta los elementos HTML con las operaciones OLAP
 */
class OLAPControls {
    constructor() {
        this.activeButtons = new Set();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedCell = null;
        
        this.initializeEventListeners();
        
        window.OLAP_UTILS.log('Sistema de controles OLAP inicializado');
    }

    /**
     * Inicializa todos los event listeners para los controles de la interfaz
     */
    initializeEventListeners() {
        // Controles de operaciones OLAP
        this.setupOLAPOperationControls();
        
        // Controles de visualización
        this.setupVisualizationControls();
        
        // Controles de datos
        this.setupDataControls();

        // Controles de interacción con el ratón para selección de celdas
        this.setupMouseInteraction();
        
        window.OLAP_UTILS.log('Event listeners configurados');
    }

    /**
     * Configura controles para operaciones OLAP principales
     */
    setupOLAPOperationControls() {
        // Controles de Slice
        document.getElementById('slice-x')?.addEventListener('click', () => {
            window.olapOperations.slice('x', 0);
            this.toggleButtonState('slice-x');
        });

        document.getElementById('slice-y')?.addEventListener('click', () => {
            window.olapOperations.slice('y', 0);
            this.toggleButtonState('slice-y');
        });

        document.getElementById('slice-z')?.addEventListener('click', () => {
            window.olapOperations.slice('z', 0);
            this.toggleButtonState('slice-z');
        });

        // Controles de Dice
        document.getElementById('dice-operation')?.addEventListener('click', () => {
            const sampleFilters = [
                { dimension: 'source', values: ['Asia', 'Europe'] },
                { dimension: 'time', values: ['Q1', 'Q2'] }
            ];
            window.olapOperations.dice(sampleFilters);
            this.toggleButtonState('dice-operation');
        });

        document.getElementById('reset-dice')?.addEventListener('click', () => {
            window.olapOperations.resetDice();
            this.clearButtonState('dice-operation');
        });

        // Controles de Drill
        document.getElementById('drill-down')?.addEventListener('click', () => {
            window.olapOperations.drillDown();
        });

        document.getElementById('drill-up')?.addEventListener('click', () => {
            window.olapOperations.drillUp();
        });

        document.getElementById('drill-through')?.addEventListener('click', () => {
            if (this.selectedCell && this.selectedCell.userData) {
                window.olapOperations.drillThrough(this.selectedCell.userData);
            } else {
                window.olapOperations.drillThrough();
            }
        });

        // Controles de Pivot
        document.getElementById('pivot-xy')?.addEventListener('click', () => {
            window.olapOperations.pivot('x', 'y');
            this.toggleButtonState('pivot-xy');
            setTimeout(() => this.clearButtonState('pivot-xy'), 1500);
        });

        document.getElementById('pivot-xz')?.addEventListener('click', () => {
            window.olapOperations.pivot('x', 'z');
            this.toggleButtonState('pivot-xz');
            setTimeout(() => this.clearButtonState('pivot-xz'), 1500);
        });

        document.getElementById('pivot-yz')?.addEventListener('click', () => {
            window.olapOperations.pivot('y', 'z');
            this.toggleButtonState('pivot-yz');
            setTimeout(() => this.clearButtonState('pivot-yz'), 1500);
        });
        
        window.OLAP_UTILS.log('Controles de operaciones OLAP configurados');
    }

    /**
     * Configura controles para opciones de visualización
     */
    setupVisualizationControls() {
        // Control de opacidad
        const opacitySlider = document.getElementById('cube-opacity');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', window.OLAP_UTILS.debounce((event) => {
                const opacity = parseFloat(event.target.value);
                window.olapRenderer.setCubeOpacity(opacity);
                window.OLAP_UTILS.log(`Opacidad ajustada a: ${opacity}`, 'debug');
            }, 100));
        }

        // Toggle wireframe
        document.getElementById('toggle-wireframe')?.addEventListener('click', () => {
            window.olapRenderer.toggleWireframe();
            this.toggleButtonState('toggle-wireframe');
        });

        // Toggle etiquetas
        document.getElementById('toggle-labels')?.addEventListener('click', () => {
            window.olapRenderer.toggleLabels();
            this.toggleButtonState('toggle-labels');
        });

        // Toggle grid
        document.getElementById('toggle-grid')?.addEventListener('click', () => {
            window.olapRenderer.toggleGrid();
            this.toggleButtonState('toggle-grid');
        });

        // Toggle auto-rotación
        document.getElementById('toggle-rotation')?.addEventListener('click', () => {
            window.OLAP_CONFIG.isAutoRotating = !window.OLAP_CONFIG.isAutoRotating;
            this.toggleButtonState('toggle-rotation');
            
            const status = window.OLAP_CONFIG.isAutoRotating ? 'habilitada' : 'deshabilitada';
            window.OLAP_UTILS.log(`Auto-rotación ${status}`);
        });

        // Reset cámara
        document.getElementById('reset-camera')?.addEventListener('click', () => {
            window.olapRenderer.resetCamera();
            window.OLAP_UTILS.log('Cámara reseteada');
        });
        
        window.OLAP_UTILS.log('Controles de visualización configurados');
    }

    /**
     * Configura controles para selección de dimensiones y medidas
     */
    setupDataControls() {
        // Controles de dimensiones
        document.getElementById('dim-source')?.addEventListener('click', () => {
            this.toggleDimension('source');
        });

        document.getElementById('dim-route')?.addEventListener('click', () => {
            this.toggleDimension('route');
        });

        document.getElementById('dim-time')?.addEventListener('click', () => {
            this.toggleDimension('time');
        });

        // Controles de medidas
        document.getElementById('measure-packages')?.addEventListener('click', () => {
            this.selectMeasure('packages');
        });

        document.getElementById('measure-revenue')?.addEventListener('click', () => {
            this.selectMeasure('revenue');
        });

        document.getElementById('measure-growth')?.addEventListener('click', () => {
            this.selectMeasure('growth');
        });
        
        window.OLAP_UTILS.log('Controles de datos configurados');
    }

    /**
     * Configura interacción con el ratón para selección de celdas
     */
    setupMouseInteraction() {
        const canvas = window.OLAP_CONFIG.renderer?.domElement;
        if (!canvas) {
            window.OLAP_UTILS.log('Canvas no disponible para interacción con mouse', 'warn');
            return;
        }

        canvas.addEventListener('click', (event) => {
            this.handleCanvasClick(event);
        });

        // Evento para mostrar información al hacer hover
        canvas.addEventListener('mousemove', window.OLAP_UTILS.debounce((event) => {
            this.handleCanvasHover(event);
        }, 50));
        
        window.OLAP_UTILS.log('Interacción con mouse configurada');
    }

    /**
     * Maneja clicks en el canvas para selección de celdas
     */
    handleCanvasClick(event) {
        const rect = event.target.getBoundingClientRect();
        
        // Calcular posición del mouse en coordenadas normalizadas
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Configurar raycaster
        this.raycaster.setFromCamera(this.mouse, window.OLAP_CONFIG.camera);

        // Detectar intersecciones con celdas del cubo
        const cubeGroup = window.OLAP_CONFIG.cube;
        if (cubeGroup) {
            const intersects = this.raycaster.intersectObjects(cubeGroup.children);
            
            if (intersects.length > 0) {
                const selectedCell = intersects[0].object;
                this.handleCellSelection(selectedCell);
                window.OLAP_UTILS.log('Celda seleccionada:', selectedCell.userData);
            } else {
                this.clearCellSelection();
            }
        }
    }

    /**
     * Maneja hover sobre el canvas para mostrar información
     */
    handleCanvasHover(event) {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, window.OLAP_CONFIG.camera);

        const cubeGroup = window.OLAP_CONFIG.cube;
        if (cubeGroup) {
            const intersects = this.raycaster.intersectObjects(cubeGroup.children);
            
            if (intersects.length > 0) {
                const hoveredCell = intersects[0].object;
                this.showCellTooltip(hoveredCell, event);
                event.target.style.cursor = 'pointer';
            } else {
                this.hideCellTooltip();
                event.target.style.cursor = 'default';
            }
        }
    }

    /**
     * Muestra tooltip con información de la celda
     */
    showCellTooltip(cell, event) {
        const userData = cell.userData;
        if (!userData) return;

        let tooltip = document.getElementById('cell-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'cell-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 11px;
                pointer-events: none;
                z-index: 2000;
                border: 1px solid rgba(79, 195, 247, 0.5);
                backdrop-filter: blur(5px);
            `;
            document.body.appendChild(tooltip);
        }

        const currentMeasure = window.OLAP_CONFIG.cubeData.currentMeasure;
        const measureLabels = {
            packages: 'paquetes',
            revenue: 'ingresos',
            growth: 'crecimiento %'
        };

        tooltip.innerHTML = `
            <strong>${userData.source}</strong><br>
            ${userData.route} • ${userData.time}<br>
            ${window.OLAP_UTILS.formatNumber(userData.value)} ${measureLabels[currentMeasure] || currentMeasure}
        `;

        tooltip.style.left = (event.clientX + 10) + 'px';
        tooltip.style.top = (event.clientY - 10) + 'px';
        tooltip.style.display = 'block';
    }

    /**
     * Oculta el tooltip de la celda
     */
    hideCellTooltip() {
        const tooltip = document.getElementById('cell-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Maneja la selección de una celda específica del cubo
     */
    handleCellSelection(cell) {
        // Destacar celda seleccionada
        this.selectedCell = cell;
        window.olapRenderer.highlightCell(cell);
        
        // Mostrar información de la celda
        this.showCellInfo(cell);
    }

    /**
     * Limpia la selección actual
     */
    clearCellSelection() {
        this.selectedCell = null;
        window.olapRenderer.highlightCell(null);
    }

    /**
     * Muestra información detallada de una celda seleccionada
     */
    showCellInfo(cell) {
        const userData = cell.userData;
        const infoElement = document.getElementById('cube-info');
        
        if (infoElement && userData) {
            const currentMeasure = window.OLAP_CONFIG.cubeData.currentMeasure;
            const measureLabels = {
                packages: 'Packages',
                revenue: 'Revenue ($)',
                growth: 'Growth (%)'
            };

            infoElement.innerHTML = `
                <strong>Celda Seleccionada:</strong><br>
                Source: ${userData.source}<br>
                Route: ${userData.route}<br>
                Time: ${userData.time}<br>
                ${measureLabels[currentMeasure]}: ${window.OLAP_UTILS.formatNumber(userData.value)}<br>
                Coordenadas: (${userData.sourceIndex}, ${userData.routeIndex}, ${userData.timeIndex})
            `;
        }
    }

    /**
     * Alterna el estado visual de un botón
     */
    toggleButtonState(buttonId) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (this.activeButtons.has(buttonId)) {
            button.classList.remove('active');
            this.activeButtons.delete(buttonId);
        } else {
            button.classList.add('active');
            this.activeButtons.add(buttonId);
        }
    }

    /**
     * Limpia el estado activo de un botón
     */
    clearButtonState(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.remove('active');
            this.activeButtons.delete(buttonId);
        }
    }

    /**
     * Alterna la visibilidad de una dimensión
     */
    toggleDimension(dimension) {
        const data = window.OLAP_CONFIG.cubeData;
        const currentDimensions = data.currentDimensions;
        
        if (currentDimensions.includes(dimension)) {
            // No permitir remover todas las dimensiones
            if (currentDimensions.length <= 1) {
                window.OLAP_UTILS.log('No se puede remover la última dimensión activa', 'warn');
                return;
            }
            
            // Remover dimensión si está activa
            const index = currentDimensions.indexOf(dimension);
            currentDimensions.splice(index, 1);
            this.clearButtonState(`dim-${dimension}`);
        } else {
            // Agregar dimensión si no está activa
            currentDimensions.push(dimension);
            document.getElementById(`dim-${dimension}`)?.classList.add('active');
        }

        window.OLAP_UTILS.log(`Dimensión ${dimension} alternada. Dimensiones activas:`, currentDimensions);
        this.updateCubeVisualization();
    }

    /**
     * Selecciona una medida específica para visualización
     */
    selectMeasure(measure) {
        // Limpiar selecciones anteriores de medidas
        ['packages', 'revenue', 'growth'].forEach(m => {
            this.clearButtonState(`measure-${m}`);
        });

        // Seleccionar nueva medida
        window.OLAP_CONFIG.cubeData.currentMeasure = measure;
        document.getElementById(`measure-${measure}`)?.classList.add('active');

        window.OLAP_UTILS.log(`Medida seleccionada: ${measure}`);
        this.updateCubeVisualization();
    }

    /**
     * Actualiza la visualización del cubo basada en dimensiones y medidas activas
     */
    updateCubeVisualization() {
        const currentMeasure = window.OLAP_CONFIG.cubeData.currentMeasure;
        
        // Actualizar visualización a través del renderer
        if (window.olapRenderer) {
            window.olapRenderer.updateCubeVisualization(currentMeasure);
        }
        
        // Actualizar información del panel
        if (window.olapOperations) {
            window.olapOperations.updateCubeInfo(`Visualización actualizada con medida: ${currentMeasure}`);
        }
    }

    /**
     * Configura filtros personalizados avanzados
     */
    setupAdvancedFilters() {
        // Filtro por valor mínimo
        const filterByMinValue = (minValue) => {
            window.olapOperations.applyAdvancedFilter((userData) => {
                return userData.value >= minValue;
            });
        };

        // Filtro por rango de valores
        const filterByRange = (minValue, maxValue) => {
            window.olapOperations.applyAdvancedFilter((userData) => {
                return userData.value >= minValue && userData.value <= maxValue;
            });
        };

        // Filtro por múltiples fuentes
        const filterBySources = (sources) => {
            window.olapOperations.applyAdvancedFilter((userData) => {
                return sources.includes(userData.source);
            });
        };

        // Exponer filtros para uso externo
        this.advancedFilters = {
            byMinValue: filterByMinValue,
            byRange: filterByRange,
            bySources: filterBySources
        };
    }

    /**
     * Exporta los datos actuales del cubo
     */
    exportCubeData() {
        const cubeState = window.olapOperations?.exportCubeState();
        
        if (cubeState) {
            const dataStr = JSON.stringify(cubeState, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `olap-cube-export-${new Date().toISOString().slice(0, 19)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            window.OLAP_UTILS.log('Datos del cubo exportados exitosamente');
        }
    }

    /**
     * Maneja atajos de teclado para operaciones rápidas
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Solo procesar atajos si no hay elementos de input activos
            if (document.activeElement.tagName === 'INPUT') return;
            
            switch(event.key.toLowerCase()) {
                case 'r':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        window.olapRenderer.resetCamera();
                        window.OLAP_UTILS.log('Atajo: Cámara reseteada');
                    }
                    break;
                    
                case 's':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.exportCubeData();
                        window.OLAP_UTILS.log('Atajo: Datos exportados');
                    }
                    break;
                    
                case 'c':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        window.olapOperations.clearAllOperations();
                        this.clearAllButtonStates();
                        window.OLAP_UTILS.log('Atajo: Operaciones limpiadas');
                    }
                    break;
                    
                case 'g':
                    window.olapRenderer.toggleGrid();
                    this.toggleButtonState('toggle-grid');
                    window.OLAP_UTILS.log('Atajo: Grid alternado');
                    break;
                    
                case 'w':
                    window.olapRenderer.toggleWireframe();
                    this.toggleButtonState('toggle-wireframe');
                    window.OLAP_UTILS.log('Atajo: Wireframe alternado');
                    break;
                    
                case 'l':
                    window.olapRenderer.toggleLabels();
                    this.toggleButtonState('toggle-labels');
                    window.OLAP_UTILS.log('Atajo: Etiquetas alternadas');
                    break;
                    
                case 'space':
                    event.preventDefault();
                    window.OLAP_CONFIG.isAutoRotating = !window.OLAP_CONFIG.isAutoRotating;
                    this.toggleButtonState('toggle-rotation');
                    window.OLAP_UTILS.log('Atajo: Auto-rotación alternada');
                    break;
                    
                case '1':
                    this.selectMeasure('packages');
                    window.OLAP_UTILS.log('Atajo: Medida packages seleccionada');
                    break;
                    
                case '2':
                    this.selectMeasure('revenue');
                    window.OLAP_UTILS.log('Atajo: Medida revenue seleccionada');
                    break;
                    
                case '3':
                    this.selectMeasure('growth');
                    window.OLAP_UTILS.log('Atajo: Medida growth seleccionada');
                    break;
            }
        });
        
        window.OLAP_UTILS.log('Atajos de teclado configurados');
    }

    /**
     * Muestra ayuda con los controles disponibles
     */
    showHelp() {
        // Remover modal existente si hay uno
        const existingModal = document.getElementById('help-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const helpModal = document.createElement('div');
        helpModal.id = 'help-modal';
        helpModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 4000;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(79, 195, 247, 0.3);
            margin: 20px;
            position: relative;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="color: #4fc3f7; margin: 0;">Guía de Controles OLAP</h2>
                <button id="help-close-btn" 
                        style="background: #ff5722; border: none; color: white; width: 30px; height: 30px; 
                               border-radius: 50%; cursor: pointer; font-size: 18px; font-weight: bold;
                               display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4fc3f7; margin-bottom: 10px;">Operaciones OLAP:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li><strong>Slice:</strong> Corta el cubo en un plano específico</li>
                    <li><strong>Dice:</strong> Aplica múltiples filtros para crear subcubos</li>
                    <li><strong>Drill-Down:</strong> Navega a niveles más detallados</li>
                    <li><strong>Drill-Up:</strong> Navega a niveles de resumen</li>
                    <li><strong>Drill-Through:</strong> Accede a datos transaccionales</li>
                    <li><strong>Pivot:</strong> Intercambia dimensiones del cubo</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4fc3f7; margin-bottom: 10px;">Atajos de Teclado:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li><strong>Ctrl+R:</strong> Resetear cámara</li>
                    <li><strong>Ctrl+S:</strong> Exportar datos</li>
                    <li><strong>Ctrl+C:</strong> Limpiar operaciones</li>
                    <li><strong>G:</strong> Toggle grid</li>
                    <li><strong>W:</strong> Toggle wireframe</li>
                    <li><strong>L:</strong> Toggle etiquetas</li>
                    <li><strong>Espacio:</strong> Toggle auto-rotación</li>
                    <li><strong>1/2/3:</strong> Cambiar medidas</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4fc3f7; margin-bottom: 10px;">Interacciones:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li><strong>Click:</strong> Seleccionar celda</li>
                    <li><strong>Arrastrar:</strong> Rotar cámara</li>
                    <li><strong>Rueda:</strong> Zoom in/out</li>
                    <li><strong>Hover:</strong> Mostrar información</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 25px;">
                <button id="help-close-footer-btn" 
                        style="padding: 12px 25px; background: #4fc3f7; border: none; 
                               border-radius: 6px; color: white; cursor: pointer; font-weight: 500;">
                    Cerrar
                </button>
            </div>
        `;

        // Añadir contenido al modal
        helpModal.appendChild(modalContent);
        document.body.appendChild(helpModal);

        // Función para cerrar el modal
        const closeModal = () => {
            if (helpModal && helpModal.parentElement) {
                helpModal.style.opacity = '0';
                helpModal.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    if (helpModal.parentElement) {
                        helpModal.remove();
                    }
                }, 300);
            }
        };

        // Event listeners para cerrar
        const closeBtn = modalContent.querySelector('#help-close-btn');
        const footerBtn = modalContent.querySelector('#help-close-footer-btn');
        
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

        // Cerrar al hacer click en el fondo
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
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
        helpModal.style.opacity = '0';
        helpModal.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            helpModal.style.opacity = '1';
        }, 10);
    }

    /**
     * Inicializa características avanzadas
     */
    initializeAdvancedFeatures() {
        // Configurar filtros avanzados
        this.setupAdvancedFilters();
        
        // Configurar atajos de teclado
        this.setupKeyboardShortcuts();
        
        // Añadir botón de ayuda
        this.addHelpButton();
        
        window.OLAP_UTILS.log('Características avanzadas inicializadas');
    }

    /**
     * Añade botón de ayuda al panel de control
     */
    addHelpButton() {
        const controlPanel = document.getElementById('control-panel');
        if (!controlPanel) return;

        const helpButton = document.createElement('button');
        helpButton.className = 'control-button';
        helpButton.textContent = 'Ayuda (?)';
        helpButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            font-size: 10px;
        `;
        
        helpButton.addEventListener('click', () => {
            this.showHelp();
        });

        controlPanel.appendChild(helpButton);
    }

    /**
     * Actualiza el estado de todos los controles basado en el estado actual
     */
    updateControlStates() {
        const data = window.OLAP_CONFIG.cubeData;
        
        // Actualizar botones de dimensiones
        data.currentDimensions.forEach(dim => {
            const button = document.getElementById(`dim-${dim}`);
            if (button) button.classList.add('active');
        });
        
        // Actualizar botón de medida actual
        const measureButton = document.getElementById(`measure-${data.currentMeasure}`);
        if (measureButton) measureButton.classList.add('active');
        
        // Actualizar slider de opacidad
        const opacitySlider = document.getElementById('cube-opacity');
        if (opacitySlider) {
            opacitySlider.value = '0.7'; // Valor por defecto
        }
    }

    /**
     * Limpia todos los estados de botones activos
     */
    clearAllButtonStates() {
        this.activeButtons.forEach(buttonId => {
            this.clearButtonState(buttonId);
        });
        
        window.OLAP_UTILS.log('Todos los estados de botones limpiados');
    }

    /**
     * Obtiene el estado actual de todos los controles
     */
    getControlsState() {
        return {
            activeButtons: Array.from(this.activeButtons),
            selectedCell: this.selectedCell ? this.selectedCell.userData : null,
            currentMeasure: window.OLAP_CONFIG.cubeData.currentMeasure,
            currentDimensions: window.OLAP_CONFIG.cubeData.currentDimensions,
            isAutoRotating: window.OLAP_CONFIG.isAutoRotating
        };
    }

    /**
     * Limpia recursos y event listeners
     */
    dispose() {
        // Limpiar tooltip
        const tooltip = document.getElementById('cell-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
        
        // Limpiar selección
        this.clearCellSelection();
        
        // Limpiar estados de botones
        this.clearAllButtonStates();
        
        window.OLAP_UTILS.log('Controles OLAP limpiados');
    }
}