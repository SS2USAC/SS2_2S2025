/**
 * Clase principal para el renderizado 3D del cubo OLAP
 * Maneja la inicialización de Three.js, la creación del cubo y el loop de renderizado
 */
class OLAPRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cubeGroup = null;
        this.controls = null;
        this.gridHelper = null;
        this.labels = [];
        this.slicePlanes = [];
        
        // Configuración de controles de cámara
        this.mouseControls = {
            isMouseDown: false,
            mouseX: 0,
            mouseY: 0,
            targetRotationX: 0,
            targetRotationY: 0,
            currentRotationX: 0,
            currentRotationY: 0
        };
        
        this.init();
        this.createCube();
        this.setupLighting();
        this.setupControls();
        this.animate();
        
        // Almacenar referencias globales
        window.OLAP_CONFIG.renderer = this.renderer;
        window.OLAP_CONFIG.scene = this.scene;
        window.OLAP_CONFIG.camera = this.camera;
        
        window.OLAP_UTILS.log('Renderer OLAP inicializado correctamente');
    }

    /**
     * Inicializa la escena, cámara y renderer de Three.js
     */
    init() {
        const container = document.getElementById('canvas-container');
        const config = window.OLAP_CONFIG.renderConfig;
        
        // Configurar escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(window.OLAP_CONFIG.colorConfig.background);

        // Configurar cámara con perspectiva optimizada para visualización de datos
        this.camera = new THREE.PerspectiveCamera(
            config.fov,
            window.innerWidth / window.innerHeight,
            config.near,
            config.far
        );
        this.camera.position.set(config.cameraDistance, config.cameraDistance, config.cameraDistance);
        this.camera.lookAt(0, 0, 0);

        // Configurar renderer con anti-aliasing para mejor calidad visual
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        container.appendChild(this.renderer.domElement);

        // Manejar redimensionamiento de ventana
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        window.OLAP_UTILS.log('Escena Three.js inicializada');
    }

    /**
     * Configura la iluminación de la escena para óptima visualización del cubo
     */
    setupLighting() {
        const colors = window.OLAP_CONFIG.colorConfig;
        
        // Luz ambiental suave para iluminación general
        const ambientLight = new THREE.AmbientLight(colors.ambientLight, 0.6);
        this.scene.add(ambientLight);

        // Luz direccional principal para definir formas y sombras
        const directionalLight = new THREE.DirectionalLight(colors.directionalLight, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);

        // Luz puntual para destacar elementos específicos
        const pointLight = new THREE.PointLight(colors.pointLight, 0.5, 50);
        pointLight.position.set(-10, 10, 10);
        this.scene.add(pointLight);
        
        window.OLAP_UTILS.log('Sistema de iluminación configurado');
    }

    /**
     * Configura controles de cámara para navegación intuitiva
     */
    setupControls() {
        const canvas = this.renderer.domElement;
        const controls = this.mouseControls;

        canvas.addEventListener('mousedown', (event) => {
            controls.isMouseDown = true;
            controls.mouseX = event.clientX;
            controls.mouseY = event.clientY;
        });

        canvas.addEventListener('mousemove', (event) => {
            if (!controls.isMouseDown) return;

            const deltaX = event.clientX - controls.mouseX;
            const deltaY = event.clientY - controls.mouseY;

            controls.targetRotationY += deltaX * 0.01;
            controls.targetRotationX += deltaY * 0.01;

            // Limitar rotación vertical
            controls.targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, controls.targetRotationX));

            controls.mouseX = event.clientX;
            controls.mouseY = event.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            controls.isMouseDown = false;
        });

        canvas.addEventListener('mouseleave', () => {
            controls.isMouseDown = false;
        });

        // Zoom con rueda del mouse
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const scale = event.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(scale);
            this.camera.position.clampLength(5, 50);
        });
        
        window.OLAP_UTILS.log('Controles de cámara configurados');
    }

    /**
     * Actualiza la rotación de la cámara suavemente
     */
    updateCameraRotation() {
        const controls = this.mouseControls;
        const easing = window.OLAP_CONFIG.animationConfig.cameraEasing;
        
        controls.currentRotationX += (controls.targetRotationX - controls.currentRotationX) * easing;
        controls.currentRotationY += (controls.targetRotationY - controls.currentRotationY) * easing;

        const distance = this.camera.position.length();
        this.camera.position.x = distance * Math.sin(controls.currentRotationY) * Math.cos(controls.currentRotationX);
        this.camera.position.y = distance * Math.sin(controls.currentRotationX);
        this.camera.position.z = distance * Math.cos(controls.currentRotationY) * Math.cos(controls.currentRotationX);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Crea el cubo OLAP 3D con datos de ejemplo basados en la imagen proporcionada
     */
    createCube() {
        this.cubeGroup = new THREE.Group();
        const data = window.OLAP_CONFIG.cubeData;
        const config = window.OLAP_CONFIG.renderConfig;
        
        // Dimensiones del cubo basadas en los datos
        const sourceCount = data.dimensions.source.length; // 6
        const routeCount = data.dimensions.route.length;   // 4
        const timeCount = data.dimensions.time.length;     // 4

        const totalSize = config.cellSize + config.spacing;

        window.OLAP_UTILS.log(`Creando cubo OLAP: ${sourceCount}x${routeCount}x${timeCount} celdas`);

        // Crear celdas individuales del cubo
        for (let i = 0; i < sourceCount; i++) {
            for (let j = 0; j < routeCount; j++) {
                for (let k = 0; k < timeCount; k++) {
                    const cell = this.createDataCell(i, j, k, config.cellSize);
                    
                    // Posicionar celda en el espacio 3D
                    cell.position.set(
                        (i - sourceCount/2 + 0.5) * totalSize,
                        (j - routeCount/2 + 0.5) * totalSize,
                        (k - timeCount/2 + 0.5) * totalSize
                    );
                    
                    // Almacenar coordenadas para referencia
                    cell.userData = {
                        sourceIndex: i,
                        routeIndex: j,
                        timeIndex: k,
                        source: data.dimensions.source[i],
                        route: data.dimensions.route[j],
                        time: data.dimensions.time[k],
                        value: window.OLAP_UTILS.getMeasureValue(i, j, k, data.currentMeasure)
                    };
                    
                    this.cubeGroup.add(cell);
                }
            }
        }

        this.scene.add(this.cubeGroup);
        window.OLAP_CONFIG.cube = this.cubeGroup;

        // Crear etiquetas para las dimensiones
        this.createDimensionLabels();

        // Crear grid helper
        this.gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
        this.gridHelper.visible = false;
        this.scene.add(this.gridHelper);
        
        window.OLAP_UTILS.log('Cubo OLAP 3D creado exitosamente');
    }

    /**
     * Crea una celda individual del cubo con valor de datos
     */
    createDataCell(sourceIdx, routeIdx, timeIdx, size) {
        const data = window.OLAP_CONFIG.cubeData;
        const value = window.OLAP_UTILS.getMeasureValue(sourceIdx, routeIdx, timeIdx, data.currentMeasure);

        // Geometría básica del cubo
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Material con color basado en el valor de los datos
        const normalizedValue = window.OLAP_UTILS.normalizeValue(value, data.currentMeasure);
        const colorHSL = window.OLAP_UTILS.generateColor(normalizedValue);
        
        const color = new THREE.Color().setHSL(colorHSL.h, colorHSL.s, colorHSL.l);

        const material = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });

        const cell = new THREE.Mesh(geometry, material);
        cell.castShadow = true;
        cell.receiveShadow = true;

        // Añadir wireframe para mejor definición
        const wireframeGeometry = new THREE.EdgesGeometry(geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: window.OLAP_CONFIG.colorConfig.wireframe, 
            opacity: 0.3,
            transparent: true 
        });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        cell.add(wireframe);

        return cell;
    }

    /**
     * Crea etiquetas para identificar las dimensiones del cubo
     */
    createDimensionLabels() {
        // Crear canvas para texto con mejor resolución
        const createTextTexture = (text, color = '#4fc3f7') => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 128;
            
            // Fondo semitransparente
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Borde
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            // Texto
            context.fillStyle = color;
            context.font = 'bold 36px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            
            return new THREE.CanvasTexture(canvas);
        };

        // Crear material base para etiquetas que siempre miran a la cámara
        const createLabelMaterial = (text, color) => {
            return new THREE.MeshBasicMaterial({
                map: createTextTexture(text, color),
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
        };

        // Grupo para las etiquetas que rotará con el cubo
        this.labelGroup = new THREE.Group();

        // Etiqueta para eje X (Source) - posición derecha
        const sourceLabel = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 1),
            createLabelMaterial('SOURCE', '#ff6b6b')
        );
        sourceLabel.position.set(6, 0, 0);
        sourceLabel.userData = { 
            type: 'label', 
            axis: 'x', 
            text: 'SOURCE',
            originalPosition: new THREE.Vector3(6, 0, 0)
        };
        this.labelGroup.add(sourceLabel);
        this.labels.push(sourceLabel);

        // Etiqueta para eje Y (Route) - posición arriba
        const routeLabel = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 1),
            createLabelMaterial('ROUTE', '#4ecdc4')
        );
        routeLabel.position.set(0, 6, 0);
        routeLabel.userData = { 
            type: 'label', 
            axis: 'y', 
            text: 'ROUTE',
            originalPosition: new THREE.Vector3(0, 6, 0)
        };
        this.labelGroup.add(routeLabel);
        this.labels.push(routeLabel);

        // Etiqueta para eje Z (Time) - posición frente
        const timeLabel = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 1),
            createLabelMaterial('TIME', '#45b7d1')
        );
        timeLabel.position.set(0, 0, 6);
        timeLabel.userData = { 
            type: 'label', 
            axis: 'z', 
            text: 'TIME',
            originalPosition: new THREE.Vector3(0, 0, 6)
        };
        this.labelGroup.add(timeLabel);
        this.labels.push(timeLabel);

        // Añadir el grupo de etiquetas a la escena
        this.scene.add(this.labelGroup);

        // Crear etiquetas de valores en los ejes (estas no rotan)
        this.createAxisValueLabels();
        
        window.OLAP_UTILS.log('Etiquetas de dimensiones creadas con sistema de rotación sincronizado');
    }

    /**
     * Crea etiquetas de valores en los ejes
     */
    createAxisValueLabels() {
        const data = window.OLAP_CONFIG.cubeData;
        const createSmallTextTexture = (text) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            context.fillStyle = '#ffffff';
            context.font = 'bold 18px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            
            return new THREE.CanvasTexture(canvas);
        };

        // Grupo para etiquetas de valores que también rota
        this.axisValueGroup = new THREE.Group();

        // Etiquetas para valores de Source (eje X)
        data.dimensions.source.forEach((source, index) => {
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 0.5),
                new THREE.MeshBasicMaterial({
                    map: createSmallTextTexture(source),
                    transparent: true,
                    side: THREE.DoubleSide
                })
            );
            
            const config = window.OLAP_CONFIG.renderConfig;
            const totalSize = config.cellSize + config.spacing;
            const sourceCount = data.dimensions.source.length;
            
            label.position.set(
                (index - sourceCount/2 + 0.5) * totalSize,
                -4,
                -6
            );
            label.userData = { 
                type: 'axisValue', 
                axis: 'x', 
                value: source,
                originalPosition: label.position.clone()
            };
            this.axisValueGroup.add(label);
            this.labels.push(label);
        });

        // Etiquetas para valores de Route (eje Y)
        data.dimensions.route.forEach((route, index) => {
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 0.5),
                new THREE.MeshBasicMaterial({
                    map: createSmallTextTexture(route),
                    transparent: true,
                    side: THREE.DoubleSide
                })
            );
            
            const config = window.OLAP_CONFIG.renderConfig;
            const totalSize = config.cellSize + config.spacing;
            const routeCount = data.dimensions.route.length;
            
            label.position.set(
                -6,
                (index - routeCount/2 + 0.5) * totalSize,
                -6
            );
            label.userData = { 
                type: 'axisValue', 
                axis: 'y', 
                value: route,
                originalPosition: label.position.clone()
            };
            this.axisValueGroup.add(label);
            this.labels.push(label);
        });

        // Etiquetas para valores de Time (eje Z)
        data.dimensions.time.forEach((time, index) => {
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 0.5),
                new THREE.MeshBasicMaterial({
                    map: createSmallTextTexture(time),
                    transparent: true,
                    side: THREE.DoubleSide
                })
            );
            
            const config = window.OLAP_CONFIG.renderConfig;
            const totalSize = config.cellSize + config.spacing;
            const timeCount = data.dimensions.time.length;
            
            label.position.set(
                -6,
                -4,
                (index - timeCount/2 + 0.5) * totalSize
            );
            label.userData = { 
                type: 'axisValue', 
                axis: 'z', 
                value: time,
                originalPosition: label.position.clone()
            };
            this.axisValueGroup.add(label);
            this.labels.push(label);
        });

        // Añadir grupo de valores a la escena
        this.scene.add(this.axisValueGroup);
    }

    /**
     * Actualiza la orientación de las etiquetas para que siempre miren hacia la cámara
     * y sincroniza su rotación con el cubo
     */
    updateLabelOrientation() {
        if (!this.camera || !this.cubeGroup) return;
        
        // Sincronizar rotación de etiquetas con el cubo
        if (this.labelGroup) {
            this.labelGroup.rotation.copy(this.cubeGroup.rotation);
        }
        
        if (this.axisValueGroup) {
            this.axisValueGroup.rotation.copy(this.cubeGroup.rotation);
        }
        
        // Hacer que las etiquetas principales miren hacia la cámara
        // pero respetando la rotación del grupo
        this.labels.forEach(label => {
            // Aplicar rotación para mirar hacia la cámara
            label.lookAt(this.camera.position);
            if (label.userData && label.userData.type === 'label') {
                // Calcular la posición mundial de la etiqueta
                const worldPosition = new THREE.Vector3();
                label.getWorldPosition(worldPosition);
                
                // Calcular dirección hacia la cámara
                const direction = new THREE.Vector3();
                direction.subVectors(this.camera.position, worldPosition).normalize();
            }
        });
    }

    /**
     * Sincroniza la rotación de las etiquetas cuando el cubo rota por operaciones OLAP
     */
    syncLabelsWithCube() {
        if (!this.cubeGroup) return;
        
        // Sincronizar grupos de etiquetas con la rotación del cubo
        if (this.labelGroup) {
            this.labelGroup.rotation.copy(this.cubeGroup.rotation);
        }
        
        if (this.axisValueGroup) {
            this.axisValueGroup.rotation.copy(this.cubeGroup.rotation);
        }
        
        window.OLAP_UTILS.log('Etiquetas sincronizadas con rotación del cubo', 'debug');
    }

    /**
     * Actualiza el cubo completo con nueva medida o configuración
     */
    updateCubeVisualization(measure = null) {
        if (!this.cubeGroup) return;
        
        const currentMeasure = measure || window.OLAP_CONFIG.cubeData.currentMeasure;
        window.OLAP_CONFIG.cubeData.currentMeasure = currentMeasure;
        
        this.cubeGroup.children.forEach(cell => {
            const userData = cell.userData;
            if (!userData) return;
            
            // Actualizar valor y color
            const value = window.OLAP_UTILS.getMeasureValue(
                userData.sourceIndex, 
                userData.routeIndex, 
                userData.timeIndex, 
                currentMeasure
            );
            
            userData.value = value;
            
            const normalizedValue = window.OLAP_UTILS.normalizeValue(value, currentMeasure);
            const colorHSL = window.OLAP_UTILS.generateColor(normalizedValue);
            const color = new THREE.Color().setHSL(colorHSL.h, colorHSL.s, colorHSL.l);
            
            if (cell.material) {
                cell.material.color = color;
            }
        });
        
        window.OLAP_UTILS.log(`Cubo actualizado con medida: ${currentMeasure}`);
    }

    /**
     * Maneja el redimensionamiento de la ventana
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        window.OLAP_UTILS.log('Ventana redimensionada', 'debug');
    }

    /**
     * Loop principal de animación y renderizado
     */
    animate() {
        window.OLAP_CONFIG.animationId = requestAnimationFrame(() => this.animate());

        // Actualizar controles de cámara
        this.updateCameraRotation();

        // Actualizar orientación de etiquetas para que siempre miren hacia la cámara
        this.updateLabelOrientation();

        // Auto-rotación si está habilitada
        if (window.OLAP_CONFIG.isAutoRotating && this.cubeGroup) {
            this.cubeGroup.rotation.y += window.OLAP_CONFIG.animationConfig.rotationSpeed;
        }

        // Renderizar escena
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Alternar visibilidad del grid helper
     */
    toggleGrid() {
        if (this.gridHelper) {
            this.gridHelper.visible = !this.gridHelper.visible;
            window.OLAP_UTILS.log(`Grid helper ${this.gridHelper.visible ? 'mostrado' : 'ocultado'}`);
        }
    }

    /**
     * Alternar visibilidad de etiquetas
     */
    toggleLabels() {
        // Alternar grupos completos
        if (this.labelGroup) {
            this.labelGroup.visible = !this.labelGroup.visible;
        }
        
        if (this.axisValueGroup) {
            this.axisValueGroup.visible = !this.axisValueGroup.visible;
        }
        
        const visible = this.labelGroup ? this.labelGroup.visible : false;
        window.OLAP_UTILS.log(`Etiquetas ${visible ? 'mostradas' : 'ocultadas'}`);
    }

    /**
     * Alternar solo las etiquetas principales de dimensiones
     */
    toggleDimensionLabels() {
        if (this.labelGroup) {
            this.labelGroup.visible = !this.labelGroup.visible;
        }
    }

    /**
     * Alternar solo las etiquetas de valores de ejes
     */
    toggleAxisValueLabels() {
        if (this.axisValueGroup) {
            this.axisValueGroup.visible = !this.axisValueGroup.visible;
        }
    }

    /**
     * Resetear posición de la cámara
     */
    resetCamera() {
        const distance = window.OLAP_CONFIG.renderConfig.cameraDistance;
        this.camera.position.set(distance, distance, distance);
        this.camera.lookAt(0, 0, 0);
        
        // Resetear controles de mouse
        const controls = this.mouseControls;
        controls.targetRotationX = 0;
        controls.targetRotationY = 0;
        controls.currentRotationX = 0;
        controls.currentRotationY = 0;
        
        window.OLAP_UTILS.log('Cámara reseteada a posición inicial');
    }

    /**
     * Alternar modo wireframe en todas las celdas
     */
    toggleWireframe() {
        if (!this.cubeGroup) return;
        
        let wireframeEnabled = false;
        
        this.cubeGroup.children.forEach(cell => {
            if (cell.material) {
                cell.material.wireframe = !cell.material.wireframe;
                wireframeEnabled = cell.material.wireframe;
            }
        });
        
        window.OLAP_UTILS.log(`Wireframe ${wireframeEnabled ? 'habilitado' : 'deshabilitado'}`);
    }

    /**
     * Ajustar opacidad del cubo completo
     */
    setCubeOpacity(opacity) {
        if (!this.cubeGroup) return;
        
        this.cubeGroup.children.forEach(cell => {
            if (cell.material) {
                cell.material.opacity = opacity;
            }
        });
        
        window.OLAP_UTILS.log(`Opacidad del cubo ajustada a: ${opacity}`, 'debug');
    }

    /**
     * Resaltar una celda específica
     */
    highlightCell(cell) {
        // Limpiar resaltados anteriores
        if (this.cubeGroup) {
            this.cubeGroup.children.forEach(c => {
                if (c.material && c.material.emissive) {
                    c.material.emissive.setHex(0x000000);
                }
            });
        }

        // Resaltar celda seleccionada
        if (cell && cell.material && cell.material.emissive) {
            cell.material.emissive.setHex(window.OLAP_CONFIG.colorConfig.highlight);
        }
    }

    /**
     * Obtener estadísticas de renderizado
     */
    getRenderStats() {
        const cubeGroup = this.cubeGroup;
        if (!cubeGroup) return null;
        
        const totalCells = cubeGroup.children.length;
        const visibleCells = cubeGroup.children.filter(cell => cell.visible).length;
        const hiddenCells = totalCells - visibleCells;
        
        return {
            totalCells,
            visibleCells,
            hiddenCells,
            renderCalls: this.renderer.info.render.calls,
            triangles: this.renderer.info.render.triangles
        };
    }

    /**
     * Crear efectos de partículas para transiciones
     */
    createParticleEffect(position, count = 20) {
        const particles = new THREE.Group();
        
        for (let i = 0; i < count; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: window.OLAP_CONFIG.colorConfig.pointLight,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ));
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Animar partículas
        let startTime = Date.now();
        const duration = 2000;
        
        const animateParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                particles.children.forEach((particle, index) => {
                    particle.position.y += 0.02;
                    particle.material.opacity = 0.8 * (1 - progress);
                    particle.rotation.y += 0.1;
                });
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particles);
            }
        };
        
        animateParticles();
    }

    /**
     * Crear líneas de conexión entre celdas relacionadas
     */
    createConnectionLines(sourceCell, targetCell, color = 0x4fc3f7) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            sourceCell.position,
            targetCell.position
        ]);
        
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            this.scene.remove(line);
        }, 3000);
        
        return line;
    }

    /**
     * Animar transición suave entre estados del cubo
     */
    animateStateTransition(duration = 1000) {
        if (!this.cubeGroup) return;
        
        const startTime = Date.now();
        const initialPositions = [];
        
        // Guardar posiciones iniciales
        this.cubeGroup.children.forEach(cell => {
            initialPositions.push(cell.position.clone());
        });
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
            
            this.cubeGroup.children.forEach((cell, index) => {
                // Efecto de pulsación durante la transición
                const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
                cell.scale.setScalar(scale);
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Restaurar escala normal
                this.cubeGroup.children.forEach(cell => {
                    cell.scale.setScalar(1);
                });
            }
        };
        
        animate();
    }

    /**
     * Aplicar efecto de explosión al cubo
     */
    explodeCube(factor = 2, duration = 2000) {
        if (!this.cubeGroup) return;
        
        const startTime = Date.now();
        const originalPositions = [];
        
        // Guardar posiciones originales
        this.cubeGroup.children.forEach(cell => {
            originalPositions.push(cell.position.clone());
        });
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = progress < 0.5 ? 
                2 * progress * progress : 
                1 - Math.pow(-2 * progress + 2, 3) / 2;
            
            this.cubeGroup.children.forEach((cell, index) => {
                const originalPos = originalPositions[index];
                const direction = originalPos.clone().normalize();
                const explodedPos = originalPos.clone().add(
                    direction.multiplyScalar(factor * easedProgress * 5)
                );
                
                cell.position.copy(explodedPos);
                cell.rotation.x += 0.02;
                cell.rotation.y += 0.02;
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Restaurar posiciones originales
                this.implodeCube(originalPositions, 1000);
            }
        };
        
        animate();
    }

    /**
     * Implotar cubo de vuelta a posiciones originales
     */
    implodeCube(originalPositions, duration = 1000) {
        const startTime = Date.now();
        const currentPositions = [];
        
        this.cubeGroup.children.forEach(cell => {
            currentPositions.push(cell.position.clone());
        });
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
            
            this.cubeGroup.children.forEach((cell, index) => {
                const currentPos = currentPositions[index];
                const originalPos = originalPositions[index];
                
                cell.position.lerpVectors(currentPos, originalPos, easedProgress);
                cell.rotation.x *= (1 - easedProgress);
                cell.rotation.y *= (1 - easedProgress);
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    /**
     * Reconstruye completamente el cubo con nuevos datos y dimensiones
     */
    rebuildCube(aggregatedData, newDimensions) {
        window.OLAP_UTILS.log('Reconstruyendo cubo con nueva granularidad');
        window.OLAP_UTILS.log('Nuevas dimensiones:', newDimensions);
        window.OLAP_UTILS.log(`Datos agregados: ${aggregatedData.length} celdas`);
        
        // Limpiar cubo existente
        if (this.cubeGroup) {
            // Limpiar geometrías y materiales del cubo anterior
            this.cubeGroup.children.forEach(cell => {
                if (cell.geometry) cell.geometry.dispose();
                if (cell.material) {
                    if (Array.isArray(cell.material)) {
                        cell.material.forEach(mat => mat.dispose());
                    } else {
                        cell.material.dispose();
                    }
                }
            });
            
            // Remover cubo de la escena
            this.scene.remove(this.cubeGroup);
        }
        
        // Crear nuevo grupo para el cubo
        this.cubeGroup = new THREE.Group();
        const config = window.OLAP_CONFIG.renderConfig;
        
        // Calcular dimensiones del nuevo cubo
        const sourceCount = newDimensions.source.length;
        const routeCount = newDimensions.route.length; 
        const timeCount = newDimensions.time.length;
        
        const totalSize = config.cellSize + config.spacing;
        
        window.OLAP_UTILS.log(`Creando nuevo cubo: ${sourceCount}x${routeCount}x${timeCount} celdas`);
        
        // Crear celdas del nuevo cubo basadas en datos agregados
        aggregatedData.forEach(cellData => {
            const cell = this.createDataCellFromAggregatedData(cellData, config.cellSize);
            
            // Posicionar celda en el espacio 3D
            cell.position.set(
                (cellData.sourceIndex - sourceCount/2 + 0.5) * totalSize,
                (cellData.routeIndex - routeCount/2 + 0.5) * totalSize,
                (cellData.timeIndex - timeCount/2 + 0.5) * totalSize
            );
            
            // Almacenar datos de la celda
            cell.userData = {
                sourceIndex: cellData.sourceIndex,
                routeIndex: cellData.routeIndex,
                timeIndex: cellData.timeIndex,
                source: cellData.source,
                route: cellData.route,
                time: cellData.time,
                value: cellData.value
            };
            
            this.cubeGroup.add(cell);
        });
        
        // Añadir nuevo cubo a la escena
        this.scene.add(this.cubeGroup);
        window.OLAP_CONFIG.cube = this.cubeGroup;
        
        // Actualizar etiquetas para reflejar nuevas dimensiones
        this.updateDimensionLabelsForNewHierarchy(newDimensions);
        
        // Aplicar animación de transición
        this.animateStateTransition(1500);
        
        window.OLAP_UTILS.log('Cubo reconstruido exitosamente');
    }

    /**
     * Crea una celda individual del cubo con datos agregados
     */
    createDataCellFromAggregatedData(cellData, size) {
        // Geometría básica del cubo
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Material con color basado en el valor agregado
        const currentMeasure = window.OLAP_CONFIG.cubeData.currentMeasure;
        const normalizedValue = window.OLAP_UTILS.normalizeValue(cellData.value, currentMeasure);
        const colorHSL = window.OLAP_UTILS.generateColor(normalizedValue);
        
        const color = new THREE.Color().setHSL(colorHSL.h, colorHSL.s, colorHSL.l);

        const material = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });

        const cell = new THREE.Mesh(geometry, material);
        cell.castShadow = true;
        cell.receiveShadow = true;

        // Añadir wireframe para mejor definición
        const wireframeGeometry = new THREE.EdgesGeometry(geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: window.OLAP_CONFIG.colorConfig.wireframe, 
            opacity: 0.3,
            transparent: true 
        });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        cell.add(wireframe);

        return cell;
    }

    /**
     * Actualiza las etiquetas de dimensiones para reflejar nuevas jerarquías
     */
    updateDimensionLabelsForNewHierarchy(newDimensions) {
        // Limpiar etiquetas de valores existentes
        if (this.axisValueGroup) {
            this.axisValueGroup.children.forEach(label => {
                if (label.geometry) label.geometry.dispose();
                if (label.material) {
                    if (label.material.map) label.material.map.dispose();
                    label.material.dispose();
                }
            });
            this.scene.remove(this.axisValueGroup);
        }
        
        // Recrear etiquetas de valores con nuevas dimensiones
        this.createAxisValueLabelsForHierarchy(newDimensions);
        
        // Actualizar etiquetas principales con información de jerarquía
        this.updateMainDimensionLabels();
    }

    /**
     * Crea etiquetas de valores en los ejes para nuevas jerarquías
     */
    createAxisValueLabelsForHierarchy(dimensions) {
        const createSmallTextTexture = (text) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            context.fillStyle = '#ffffff';
            context.font = 'bold 16px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);
            
            return new THREE.CanvasTexture(canvas);
        };

        // Grupo para nuevas etiquetas de valores
        this.axisValueGroup = new THREE.Group();

        // Etiquetas para valores de Source (eje X)
        dimensions.source.forEach((source, index) => {
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(2.5, 0.6),
                new THREE.MeshBasicMaterial({
                    map: createSmallTextTexture(source),
                    transparent: true,
                    side: THREE.DoubleSide
                })
            );
            
            const config = window.OLAP_CONFIG.renderConfig;
            const totalSize = config.cellSize + config.spacing;
            const sourceCount = dimensions.source.length;
            
            label.position.set(
                (index - sourceCount/2 + 0.5) * totalSize,
                -4,
                -6
            );
            label.userData = { 
                type: 'axisValue', 
                axis: 'x', 
                value: source,
                originalPosition: label.position.clone()
            };
            this.axisValueGroup.add(label);
        });

        // Etiquetas para valores de Route (eje Y)
        dimensions.route.forEach((route, index) => {
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(2.5, 0.6),
                new THREE.MeshBasicMaterial({
                    map: createSmallTextTexture(route),
                    transparent: true,
                    side: THREE.DoubleSide
                })
            );
            
            const config = window.OLAP_CONFIG.renderConfig;
            const totalSize = config.cellSize + config.spacing;
            const routeCount = dimensions.route.length;
            
            label.position.set(
                -6,
                (index - routeCount/2 + 0.5) * totalSize,
                -6
            );
            label.userData = { 
                type: 'axisValue', 
                axis: 'y', 
                value: route,
                originalPosition: label.position.clone()
            };
            this.axisValueGroup.add(label);
        });

        // Etiquetas para valores de Time (eje Z)
        dimensions.time.forEach((time, index) => {
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(2.5, 0.6),
                new THREE.MeshBasicMaterial({
                    map: createSmallTextTexture(time),
                    transparent: true,
                    side: THREE.DoubleSide
                })
            );
            
            const config = window.OLAP_CONFIG.renderConfig;
            const totalSize = config.cellSize + config.spacing;
            const timeCount = dimensions.time.length;
            
            label.position.set(
                -6,
                -4,
                (index - timeCount/2 + 0.5) * totalSize
            );
            label.userData = { 
                type: 'axisValue', 
                axis: 'z', 
                value: time,
                originalPosition: label.position.clone()
            };
            this.axisValueGroup.add(label);
        });

        // Añadir grupo de valores a la escena
        this.scene.add(this.axisValueGroup);
        
        // Actualizar array de etiquetas
        this.labels = this.labels.filter(label => label.userData.type !== 'axisValue');
        this.axisValueGroup.children.forEach(label => {
            this.labels.push(label);
        });
    }

    /**
     * Actualiza las etiquetas principales de dimensiones con información de jerarquía
     */
    updateMainDimensionLabels() {
        if (!window.OLAP_CONFIG.hierarchies) return;
        
        const createHierarchyTextTexture = (text, levelInfo, color = '#4fc3f7') => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 128;
            
            // Fondo semitransparente
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Borde
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            // Texto principal
            context.fillStyle = color;
            context.font = 'bold 32px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2 - 15);
            
            // Información de nivel
            context.fillStyle = '#ffffff';
            context.font = 'bold 16px Arial';
            context.fillText(levelInfo, canvas.width / 2, canvas.height / 2 + 20);
            
            return new THREE.CanvasTexture(canvas);
        };
        
        const hierarchies = window.OLAP_CONFIG.hierarchies;
        
        // Actualizar etiqueta SOURCE
        if (this.labelGroup && hierarchies.source) {
            const sourceLabel = this.labelGroup.children.find(child => 
                child.userData && child.userData.axis === 'x'
            );
            if (sourceLabel) {
                const hierarchy = hierarchies.source;
                const currentLevel = hierarchy.levels[hierarchy.currentLevel];
                const levelInfo = `${currentLevel.name} (${hierarchy.currentLevel + 1}/${hierarchy.levels.length})`;
                
                if (sourceLabel.material.map) sourceLabel.material.map.dispose();
                sourceLabel.material.map = createHierarchyTextTexture('SOURCE', levelInfo, '#ff6b6b');
                sourceLabel.material.needsUpdate = true;
            }
        }
        
        // Actualizar etiqueta ROUTE
        if (this.labelGroup && hierarchies.route) {
            const routeLabel = this.labelGroup.children.find(child => 
                child.userData && child.userData.axis === 'y'
            );
            if (routeLabel) {
                const hierarchy = hierarchies.route;
                const currentLevel = hierarchy.levels[hierarchy.currentLevel];
                const levelInfo = `${currentLevel.name} (${hierarchy.currentLevel + 1}/${hierarchy.levels.length})`;
                
                if (routeLabel.material.map) routeLabel.material.map.dispose();
                routeLabel.material.map = createHierarchyTextTexture('ROUTE', levelInfo, '#4ecdc4');
                routeLabel.material.needsUpdate = true;
            }
        }
        
        // Actualizar etiqueta TIME
        if (this.labelGroup && hierarchies.time) {
            const timeLabel = this.labelGroup.children.find(child => 
                child.userData && child.userData.axis === 'z'
            );
            if (timeLabel) {
                const hierarchy = hierarchies.time;
                const currentLevel = hierarchy.levels[hierarchy.currentLevel];
                const levelInfo = `${currentLevel.name} (${hierarchy.currentLevel + 1}/${hierarchy.levels.length})`;
                
                if (timeLabel.material.map) timeLabel.material.map.dispose();
                timeLabel.material.map = createHierarchyTextTexture('TIME', levelInfo, '#45b7d1');
                timeLabel.material.needsUpdate = true;
            }
        }
    }

    /**
     * Resetea todos los colores del cubo a sus valores originales
     */
    resetCubeColors() {
        if (!this.cubeGroup) return;
        
        window.OLAP_UTILS.log('Reseteando colores del cubo a valores originales');
        
        this.cubeGroup.children.forEach(cell => {
            const userData = cell.userData;
            if (!userData) return;
            
            // Recalcular color original basado en el valor de la celda
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
            
            // Restaurar color original
            if (cell.material) {
                cell.material.color.copy(originalColor);
                cell.material.opacity = 0.7; // Opacidad original
                cell.material.emissive.setHex(0x000000); // Quitar highlight
                cell.material.wireframe = false; // Quitar wireframe si estaba activo
            }
            
            // Restaurar escala original
            cell.scale.setScalar(1.0);
            
            // Asegurar que la celda sea visible
            cell.visible = true;
        });
        
        window.OLAP_UTILS.log('Colores del cubo reseteados exitosamente');
    }
    /**
     * Limpiar recursos y detener animación
     */
    dispose() {
        if (window.OLAP_CONFIG.animationId) {
            cancelAnimationFrame(window.OLAP_CONFIG.animationId);
        }
        
        // Limpiar geometrías y materiales del cubo
        if (this.cubeGroup) {
            this.cubeGroup.children.forEach(cell => {
                if (cell.geometry) cell.geometry.dispose();
                if (cell.material) {
                    if (Array.isArray(cell.material)) {
                        cell.material.forEach(mat => mat.dispose());
                    } else {
                        cell.material.dispose();
                    }
                }
            });
        }
        
        // Limpiar etiquetas de dimensiones
        if (this.labelGroup) {
            this.labelGroup.children.forEach(label => {
                if (label.geometry) label.geometry.dispose();
                if (label.material) label.material.dispose();
            });
            this.scene.remove(this.labelGroup);
        }
        
        // Limpiar etiquetas de valores
        if (this.axisValueGroup) {
            this.axisValueGroup.children.forEach(label => {
                if (label.geometry) label.geometry.dispose();
                if (label.material) label.material.dispose();
            });
            this.scene.remove(this.axisValueGroup);
        }
        
        // Limpiar etiquetas individuales (por si acaso)
        this.labels.forEach(label => {
            if (label.geometry) label.geometry.dispose();
            if (label.material) label.material.dispose();
        });
        
        // Limpiar renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        window.OLAP_UTILS.log('Renderer OLAP limpiado completamente');
    }
}