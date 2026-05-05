/**
 * Cinta - Bessó extern: Cinta transportadora amb control de motor
 * 
 * Visualitza una cinta transportadora horitzontal amb:
 * - Motor controlat per pont H (endavant/endarrere)
 * - Solenoide per spawn de caixes
 * - 2 sensors fotocèl·lics (esquerre i dret)
 * - Control de velocitat via DAC
 * - Botó d'emergència amb enclavament
 * 
 * Mapeig IO (vèrtebra 0x0):
 * Sortides digitals (costella A):
 *   bit 4 → Motor sentit A (endavant/dreta)
 *   bit 5 → Motor sentit B (endarrere/esquerra)
 *   bit 6 → Solenoide (spawn caixa)
 * 
 * Entrades digitals (costella B):
 *   bit 5 → Sensor esquerre
 *   bit 6 → Sensor dret
 *   bit 7 → Botó emergència (1=premut/clavat)
 * 
 * Sortides analògiques (costella A):
 *   canal 0 → Velocitat motor DAC (0V=0%, 5V=50%, 10V=100%)
 */

class Cinta extends BaseBesso {
    constructor(container, bessoName) {
        // Configuració del mapeig IO
		const ioConfig = window.getIoConfig(bessoName);
        super(container, ioConfig);

        // Estat del motor
        this.motor = {
            direction: 0,      // 1=dreta, -1=esquerra, 0=aturat
            speed: 0,          // 0-1 (percentatge velocitat)
        };

        // Caixes a la cinta
        this.boxes = [];  // { x, y, width, height, id }
        this.boxIdCounter = 0;
        this.maxBoxes = 10;

        // Sensors (coordenades LOCALS dins grup ct-conveyor, no globals)
        // Cinta dins grup: x=0 a x=600 (600px ample)
        // Rodets: diàmetre 30px → separació 2×diàmetre = 60px de cada vora
        this.sensorLeftPos = 60;    // 60px des de x=0 (vora esquerra LOCAL)
        this.sensorRightPos = 540;  // 60px des de x=600 (vora dreta LOCAL: 600-60)
        this.sensorZone = 30;       // Radi detecció

        // Botó emergència
        this.emergencyActive = false;
        this.emergencyButtonPressed = false;  // Visual: clavat o no

        // Solenoide - detecció flanc
        this.prevSolenoide = 0;

        // Animació
        this.animationId = null;
        this.svg = null;

        // Zoom/Pan (com CanvasTwin)
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        
        // Subscriure's a event script started per netejar caixes
        if (window.EventBus) {
            window.EventBus.on('SCRIPT_STARTED', () => this.clearBoxes());
        }
    }
    
    clearBoxes() {
        this.boxes = [];
        this.boxIdCounter = 0;
    }

    render() {
        this.container.style.cssText = 'width:100%;height:100%;overflow:hidden;background:#1e1e1e;position:relative;';

        // Wrapper per zoom/pan
        this.wrapper = document.createElement('div');
        this.wrapper.style.cssText = 'width:100%;height:100%;overflow:hidden;position:relative;cursor:grab;';
        this.container.appendChild(this.wrapper);

        // Controls zoom
        const controls = document.createElement('div');
        controls.style.cssText = 'position:absolute;bottom:8px;left:8px;z-index:10;display:flex;gap:4px;';
        controls.innerHTML = `
            <button class="zoom-btn" data-action="in" style="padding:4px 8px;border:none;border-radius:4px;background:rgba(44,62,80,0.85);color:#ecf0f1;font-size:12px;cursor:pointer;">🔍+</button>
            <button class="zoom-btn" data-action="out" style="padding:4px 8px;border:none;border-radius:4px;background:rgba(44,62,80,0.85);color:#ecf0f1;font-size:12px;cursor:pointer;">🔍−</button>
            <button class="zoom-btn" data-action="reset" style="padding:4px 8px;border:none;border-radius:4px;background:rgba(44,62,80,0.85);color:#ecf0f1;font-size:12px;cursor:pointer;">↺</button>
        `;
        controls.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'in') this.zoomIn();
                else if (action === 'out') this.zoomOut();
                else this.resetView();
            });
        });
        this.wrapper.appendChild(controls);

        // SVG principal
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '800');
        this.svg.setAttribute('height', '400');
        this.svg.setAttribute('viewBox', '0 0 800 400');
        this.svg.style.cssText = 'transform-origin:0 0;transition:transform 0.05s ease-out;';

        this.svg.innerHTML = `
            <defs>
                <!-- Gradient cinta -->
                <linearGradient id="ct-belt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#34495e"/>
                    <stop offset="50%" style="stop-color:#2c3e50"/>
                    <stop offset="100%" style="stop-color:#34495e"/>
                </linearGradient>
                <!-- Gradient caixa -->
                <linearGradient id="ct-box-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#d35400"/>
                    <stop offset="100%" style="stop-color:#e67e22"/>
                </linearGradient>
                <!-- Glow sensor -->
                <filter id="ct-sensor-glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <!-- Fons -->
            <rect width="800" height="400" fill="#1e1e1e"/>

            <!-- Botó emergència (centre superior) -->
            <g id="ct-emergency-btn" transform="translate(400, 30)" style="cursor:pointer;">
                <!-- Base -->
                <circle cx="0" cy="0" r="25" fill="#2c3e50" stroke="#ecf0f1" stroke-width="2"/>
                <!-- Botó bolet -->
                <circle id="ct-emergency-mushroom" cx="0" cy="0" r="18" fill="#27ae60" stroke="#ecf0f1" stroke-width="2"/>
                <!-- Text estat -->
                <text id="ct-emergency-text" x="0" y="40" text-anchor="middle" fill="#ecf0f1" font-size="12">Emergency Button Not Pressed</text>
            </g>

            <!-- Cinta transportadora -->
            <g id="ct-conveyor" transform="translate(100, 200)">
                <!-- Base cinta -->
                <rect x="0" y="-30" width="600" height="60" fill="url(#ct-belt-grad)" stroke="#7f8c8d" stroke-width="2" rx="5"/>
                
                <!-- Rodets esquerra -->
                <circle id="ct-roller-left" cx="20" cy="0" r="15" fill="#7f8c8d" stroke="#95a5a6" stroke-width="2"/>
                
                <!-- Rodets dreta -->
                <circle id="ct-roller-right" cx="580" cy="0" r="15" fill="#7f8c8d" stroke="#95a5a6" stroke-width="2"/>
                
                <!-- Marca rodets (per veure rotació) -->
                <line id="ct-roller-left-mark" x1="20" y1="0" x2="20" y2="-15" stroke="#34495e" stroke-width="3"/>
                <line id="ct-roller-right-mark" x1="580" y1="0" x2="580" y2="-15" stroke="#34495e" stroke-width="3"/>

                <!-- Sensor esquerre -->
                <g transform="translate(60, 0)">
                    <rect x="-3" y="-40" width="6" height="30" fill="#95a5a6"/>
                    <circle id="ct-sensor-left-led" cx="0" cy="-45" r="5" fill="#555"/>
                    <line id="ct-sensor-left-beam" x1="0" y1="-10" x2="0" y2="10" stroke="#e74c3c" stroke-width="2" opacity="0.5"/>
                    <text x="0" y="-55" text-anchor="middle" fill="#ecf0f1" font-size="10">SE</text>
                </g>

                <!-- Sensor dret -->
                <g transform="translate(540, 0)">
                    <rect x="-3" y="-40" width="6" height="30" fill="#95a5a6"/>
                    <circle id="ct-sensor-right-led" cx="0" cy="-45" r="5" fill="#555"/>
                    <line id="ct-sensor-right-beam" x1="0" y1="-10" x2="0" y2="10" stroke="#e74c3c" stroke-width="2" opacity="0.5"/>
                    <text x="0" y="-55" text-anchor="middle" fill="#ecf0f1" font-size="10">SD</text>
                </g>

                <!-- Contenidor caixes (es pintaran dinàmicament) -->
                <g id="ct-boxes"></g>
            </g>

            <!-- Solenoide/dipositador (centre superior de la cinta) -->
            <g id="ct-solenoide" transform="translate(400, 140)">
                <rect x="-20" y="-30" width="40" height="30" fill="#7f8c8d" stroke="#95a5a6" stroke-width="2"/>
                <polygon id="ct-solenoide-arrow" points="0,-30 -10,-40 10,-40" fill="#555"/>
                <text x="0" y="-45" text-anchor="middle" fill="#ecf0f1" font-size="10">SOLENOIDE</text>
            </g>

            <!-- Indicador motor (esquerra inferior) -->
            <g id="ct-motor-status" transform="translate(50, 300)">
                <rect x="0" y="0" width="150" height="40" fill="#2c3e50" stroke="#7f8c8d" stroke-width="2" rx="5"/>
                <text x="75" y="15" text-anchor="middle" fill="#ecf0f1" font-size="11">MOTOR</text>
                <text id="ct-motor-state" x="75" y="32" text-anchor="middle" fill="#95a5a6" font-size="14" font-weight="bold">ATURAT</text>
            </g>

            <!-- Indicador velocitat (dreta inferior) -->
            <g id="ct-speed-status" transform="translate(600, 300)">
                <rect x="0" y="0" width="150" height="40" fill="#2c3e50" stroke="#7f8c8d" stroke-width="2" rx="5"/>
                <text x="75" y="15" text-anchor="middle" fill="#ecf0f1" font-size="11">VELOCITAT</text>
                <text id="ct-speed-value" x="75" y="32" text-anchor="middle" fill="#3498db" font-size="14" font-weight="bold">0%</text>
            </g>
        `;

        this.wrapper.appendChild(this.svg);

        // Event listeners
        this.setupInteraction();
        this.animate();
    }

    setupInteraction() {
        // Botó emergència
        const emergencyBtn = this.svg.querySelector('#ct-emergency-btn');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', () => this.toggleEmergency());
        }

        // Zoom amb roda
        this.wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.5, Math.min(3, this.zoom * delta));
            
            // Zoom cap al cursor
            const scale = newZoom / this.zoom;
            this.panX = mouseX - (mouseX - this.panX) * scale;
            this.panY = mouseY - (mouseY - this.panY) * scale;
            this.zoom = newZoom;
            
            this.applyTransform();
        });

        // Pan amb Shift+drag
        this.wrapper.addEventListener('mousedown', (e) => {
            if (e.shiftKey) {
                this.isPanning = true;
                this.panStartX = e.clientX - this.panX;
                this.panStartY = e.clientY - this.panY;
                this.wrapper.style.cursor = 'grabbing';
            }
        });

        this.wrapper.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.panStartX;
                this.panY = e.clientY - this.panStartY;
                this.applyTransform();
            }
        });

        this.wrapper.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.wrapper.style.cursor = 'grab';
            }
        });

        this.wrapper.addEventListener('mouseleave', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.wrapper.style.cursor = 'grab';
            }
        });
    }

    applyTransform() {
        this.svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }

    zoomIn() {
        this.zoom = Math.min(3, this.zoom * 1.2);
        this.applyTransform();
    }

    zoomOut() {
        this.zoom = Math.max(0.5, this.zoom / 1.2);
        this.applyTransform();
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    toggleEmergency() {
        this.emergencyButtonPressed = !this.emergencyButtonPressed;
        
        // Escriure a PLCMemory entrada emergència
        const mem = window.PLCMemory;
        if (mem) {
            const emergenciaMapping = this.inputMap.emergencia;
            if (emergenciaMapping) {
                const vertebra = this._getVertebra(emergenciaMapping);
                mem.writeDigitalInputBit(vertebra, emergenciaMapping.costella, emergenciaMapping.bit, this.emergencyButtonPressed ? 1 : 0);
            }
        }

        // Actualitzar visual del botó
        this.updateEmergencyButton();
    }

    updateEmergencyButton() {
        const mushroom = this.svg.querySelector('#ct-emergency-mushroom');
        const text = this.svg.querySelector('#ct-emergency-text');
        
        if (this.emergencyButtonPressed) {
            // Botó clavat
            if (mushroom) {
                mushroom.setAttribute('cy', '3');  // Baixat
                mushroom.setAttribute('fill', '#e74c3c');
            }
            if (text) {
                text.textContent = 'Emergency Button PRESSED';
                text.setAttribute('fill', '#e74c3c');
            }
        } else {
            // Botó normal
            if (mushroom) {
                mushroom.setAttribute('cy', '0');
                mushroom.setAttribute('fill', '#27ae60');
            }
            if (text) {
                text.textContent = 'Emergency Button Not Pressed';
                text.setAttribute('fill', '#ecf0f1');
            }
        }
    }

    onOutputChanged(nom, value) {
        if (nom === 'motorA' || nom === 'motorB') {
            this.updateMotor();
        } else if (nom === 'solenoide') {
            // Detectar flanc 0→1
            if (value === 1 && this.prevSolenoide === 0) {
                this.spawnBox();
            }
            this.prevSolenoide = value;
            this.updateSolenoide(value);
        } else if (nom === 'velocitat') {
            // Value és voltatge DAC (0-10V)
            this.motor.speed = value / 10;  // 0-1
            this.updateSpeedDisplay();
        }
    }

    updateMotor() {
        const valA = this.getOutput('motorA');
        const valB = this.getOutput('motorB');
        const emergency = this.emergencyActive;

        // Si emergència activa, motor aturat
        if (emergency) {
            this.motor.direction = 0;
            this.setMotorStatus('ATURAT', '#95a5a6');
            return;
        }

        // Determinar direcció: 01→dreta, 10→esquerra, 00/11→aturat
        if (valA && !valB) {
            this.motor.direction = 1;
            this.setMotorStatus('ENDAVANT →', '#2ecc71');
        } else if (!valA && valB) {
            this.motor.direction = -1;
            this.setMotorStatus('← ENDARRERE', '#e67e22');
        } else {
            this.motor.direction = 0;
            this.setMotorStatus('ATURAT', '#95a5a6');
        }
    }

    setMotorStatus(text, color) {
        const el = this.svg.querySelector('#ct-motor-state');
        if (el) {
            el.textContent = text;
            el.setAttribute('fill', color);
        }
    }

    updateSpeedDisplay() {
        const el = this.svg.querySelector('#ct-speed-value');
        if (el) {
            const percent = Math.round(this.motor.speed * 100);
            el.textContent = `${percent}%`;
        }
    }

    updateSolenoide(active) {
        const arrow = this.svg.querySelector('#ct-solenoide-arrow');
        if (arrow) {
            arrow.setAttribute('fill', active ? '#2ecc71' : '#555');
        }
    }

    spawnBox() {
        if (this.boxes.length >= this.maxBoxes) return;

        const box = {
            id: this.boxIdCounter++,
            x: 300,        // Centre de la cinta
            y: -80,        // Spawn 50px sobre la cinta (animació visible)
            width: 30,
            height: 30,
            falling: true,
            velocityY: 0,  // Velocitat inicial vertical
            gravity: 0.5,  // Acceleració gravetat
            targetY: -25,  // 5px sobre superfície cinta (y=-30)
        };

        this.boxes.push(box);
    }

    animate() {
        const step = () => {
            // Actualitzar emergència des de PLCMemory
            const mem = window.PLCMemory;
            if (mem) {
                const emergenciaMapping = this.inputMap.emergencia;
                if (emergenciaMapping) {
                    const vertebra = this._getVertebra(emergenciaMapping);
                    const emergencyBit = mem.readDigitalBit(vertebra, emergenciaMapping.costella, emergenciaMapping.bit);
                    const prevEmergency = this.emergencyActive;
                    this.emergencyActive = emergencyBit === 1;
                    
                    // Si emergència canvia (true→false o false→true), actualitzar motor
                    if (prevEmergency !== this.emergencyActive) {
                        this.updateMotor();
                    }
                }
            }

            // Rotar rodets si motor actiu i no emergència
            if (this.motor.direction !== 0 && !this.emergencyActive) {
                const speed = this.motor.speed * 4;  // Graus/frame
                const angle = (parseFloat(this.svg.querySelector('#ct-roller-left').dataset.angle || 0) + this.motor.direction * speed) % 360;
                
                this.svg.querySelector('#ct-roller-left').dataset.angle = angle;
                this.svg.querySelector('#ct-roller-right').dataset.angle = angle;
                
                const radians = (angle * Math.PI) / 180;
                const markX1 = 20;
                const markY1 = 0;
                const markX2 = 20 + 15 * Math.sin(radians);
                const markY2 = 0 - 15 * Math.cos(radians);
                
                this.svg.querySelector('#ct-roller-left-mark').setAttribute('x2', markX2 - 20 + 20);
                this.svg.querySelector('#ct-roller-left-mark').setAttribute('y2', markY2);
                this.svg.querySelector('#ct-roller-right-mark').setAttribute('x2', markX2 - 20 + 580);
                this.svg.querySelector('#ct-roller-right-mark').setAttribute('y2', markY2);
            }

            // Actualitzar caixes
            this.updateBoxes();
            this.renderBoxes();
            this.updateSensors();

            this.animationId = requestAnimationFrame(step);
        };

        step();
    }

    updateBoxes() {
        const pixelsPerFrame = this.motor.speed * 3;  // Velocitat màxima 3px/frame

        this.boxes.forEach(box => {
            if (box.falling) {
                // Animació caiguda amb acceleració
                box.velocityY += box.gravity;
                box.y += box.velocityY;
                if (box.y >= box.targetY) {
                    box.y = box.targetY;
                    box.falling = false;
                    box.velocityY = 0;
                }
            } else if (this.motor.direction !== 0 && !this.emergencyActive) {
                // Moviment horitzontal
                box.x += this.motor.direction * pixelsPerFrame;
            }
        });

        // Eliminar caixes fora de la cinta (coordenades LOCALS dins grup)
        this.boxes = this.boxes.filter(box => box.x >= 0 && box.x <= 600);
    }

    renderBoxes() {
        const container = this.svg.querySelector('#ct-boxes');
        if (!container) return;

        container.innerHTML = '';
        this.boxes.forEach(box => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.innerHTML = `
                <rect x="${box.x - box.width/2}" y="${box.y - box.height/2}" 
                      width="${box.width}" height="${box.height}" 
                      fill="url(#ct-box-grad)" stroke="#c0392b" stroke-width="2" rx="2"/>
            `;
            container.appendChild(g);
        });
    }

    updateSensors() {
        const mem = window.PLCMemory;
        if (!mem) return;

        // Sensor esquerre
        const leftDetected = this.boxes.some(box => 
            Math.abs(box.x - this.sensorLeftPos) < this.sensorZone && !box.falling
        );
        
        const sensorEMapping = this.inputMap.sensorE;
        if (sensorEMapping) {
            const vertebraE = this._getVertebra(sensorEMapping);
            // console.log('[CINTA DEBUG E] vertebra:', vertebraE, 'costella:', sensorEMapping.costella, 'bit:', sensorEMapping.bit, 'value:', leftDetected ? 1 : 0);
            mem.writeDigitalInputBit(vertebraE, sensorEMapping.costella, sensorEMapping.bit, leftDetected ? 1 : 0);
        }
        
        const leftLed = this.svg.querySelector('#ct-sensor-left-led');
        if (leftLed) {
            leftLed.setAttribute('fill', leftDetected ? '#2ecc71' : '#555');
            leftLed.style.filter = leftDetected ? 'url(#ct-sensor-glow)' : 'none';
        }

        // Sensor dret
        const rightDetected = this.boxes.some(box => 
            Math.abs(box.x - this.sensorRightPos) < this.sensorZone && !box.falling
        );
        
        const sensorDMapping = this.inputMap.sensorD;
        if (sensorDMapping) {
            const vertebraD = this._getVertebra(sensorDMapping);
            // console.log('[CINTA DEBUG D] vertebra:', vertebraD, 'costella:', sensorDMapping.costella, 'bit:', sensorDMapping.bit, 'value:', rightDetected ? 1 : 0);
            mem.writeDigitalInputBit(vertebraD, sensorDMapping.costella, sensorDMapping.bit, rightDetected ? 1 : 0);
        }
        
        const rightLed = this.svg.querySelector('#ct-sensor-right-led');
        if (rightLed) {
            rightLed.setAttribute('fill', rightDetected ? '#2ecc71' : '#555');
            rightLed.style.filter = rightDetected ? 'url(#ct-sensor-glow)' : 'none';
        }
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        super.destroy();
    }
}

// ─── REGISTRAR AL BESSO MANAGER ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.Cinta = Cinta;

    // Registrar tipus de bessó en BessoManager v2.0
    if (window.BessoManager && window.BessoManager.registerType) {
        window.BessoManager.registerType('cinta', Cinta);
    }
}

console.log('✓ Cinta loaded');
