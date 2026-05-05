/**
 * PontH - Bessó extern: pont H amb 2 motors
 * 
 * Visualitza 2 motors amb control de sentit via pont H.
 * Cada motor té 2 relays (sentit positiu i negatiu).
 * 
 * Mapeig IO (costella A sortides, vèrtebra 0x0):
 *   bit 0 → Motor 1 sentit A (forward)
 *   bit 1 → Motor 1 sentit B (reverse)
 *   bit 2 → Motor 2 sentit A (forward)
 *   bit 3 → Motor 2 sentit B (reverse)
 * 
 * Regles de seguretat:
 *   - No es pot activar A i B del mateix motor alhora (curtcircuit)	
 *   - Si es detecta, el motor es marca en ERROR
 */


class PontH extends BaseBesso {
    constructor(container, bessoName) {
        // Configuració del mapeig IO
		const ioConfig = window.getIoConfig(bessoName);
        super(container, ioConfig);

        // Estat de rotació per als motors
        this.motors = {
            1: { angle: 0, direction: 0 },  // direction: 1=fwd, -1=rev, 0=stop
            2: { angle: 0, direction: 0 },
        };

        this.animationId = null;
        this.svg = null;
    }

    render() {
        this.container.style.cssText = 'width:100%;height:100%;overflow:hidden;background:#1e1e1e;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;';

        // Crear SVG
        const svgStr = `
            <svg id="ct-ponth-svg" width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet"
                 style="max-width:100%;max-height:100%;">
                <defs>
                    <!-- Gradient fons motor -->
                    <linearGradient id="ph-motor-bg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#2c3e50"/>
                        <stop offset="100%" style="stop-color:#34495e"/>
                    </linearGradient>
                    <!-- Glow relay actiu -->
                    <filter id="ph-glow-green">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="ph-glow-red">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <!-- Marker per arrows -->
                    <marker id="ph-arrow-fwd" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#2ecc71"/>
                    </marker>
                    <marker id="ph-arrow-rev" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#e74c3c"/>
                    </marker>
                </defs>

                <!-- Títol -->
                <text x="200" y="25" text-anchor="middle" fill="#ecf0f1" font-size="16" font-weight="bold">Pont H — 2 Motors</text>

                <!-- MOTOR 1 (esquerra) -->
                <g id="ph-motor1" transform="translate(40, 40)">
                    <!-- Fons motor -->
                    <rect x="0" y="0" width="140" height="220" rx="8" fill="url(#ph-motor-bg)" stroke="#7f8c8d" stroke-width="2"/>
                    <!-- Títol -->
                    <text x="70" y="22" text-anchor="middle" fill="#3498db" font-size="13" font-weight="bold">Motor 1</text>

                    <!-- Cercle del motor (rotor visual) -->
                    <circle cx="70" cy="85" r="32" fill="#2c3e50" stroke="#7f8c8d" stroke-width="3"/>
                    <!-- Marcador de posició (per veure la rotació) -->
                    <line id="ph-m1-marker" x1="70" y1="85" x2="70" y2="58" stroke="#ecf0f1" stroke-width="3" stroke-linecap="round"/>
                    <!-- Etiqueta M -->
                    <text x="70" y="90" text-anchor="middle" fill="#ecf0f1" font-size="18" font-weight="bold">M</text>

                    <!-- Arrows de sentit (esquerra i dreta del cercle) -->
                    <g id="ph-m1-arrows">
                        <!-- Arrow esquerra (reverse) -->
                        <path id="ph-m1-arrow-rev" d="M 25,75 Q 15,85 25,95" fill="none" stroke="#7f8c8d" stroke-width="2" marker-end="url(#ph-arrow-rev)" opacity="0.3"/>
                        <!-- Arrow dreta (forward) -->
                        <path id="ph-m1-arrow-fwd" d="M 115,75 Q 125,85 115,95" fill="none" stroke="#7f8c8d" stroke-width="2" marker-end="url(#ph-arrow-fwd)" opacity="0.3"/>
                    </g>

                    <!-- Relays -->
                    <!-- Relay A (forward) -->
                    <g id="ph-m1-relay-a">
                        <rect x="10" y="140" width="50" height="30" rx="4" fill="#333" stroke="#7f8c8d" stroke-width="1"/>
                        <circle id="ph-m1-led-a" cx="20" cy="155" r="6" fill="#440000"/>
                        <text x="40" y="160" text-anchor="middle" fill="#ecf0f1" font-size="11">A</text>
                    </g>
                    <!-- Relay B (reverse) -->
                    <g id="ph-m1-relay-b">
                        <rect x="80" y="140" width="50" height="30" rx="4" fill="#333" stroke="#7f8c8d" stroke-width="1"/>
                        <circle id="ph-m1-led-b" cx="90" cy="155" r="6" fill="#440000"/>
                        <text x="110" y="160" text-anchor="middle" fill="#ecf0f1" font-size="11">B</text>
                    </g>

                    <!-- Estat / Error -->
                    <text id="ph-m1-status" x="70" y="195" text-anchor="middle" fill="#7f8c8d" font-size="12">ATURAT</text>
                </g>

                <!-- MOTOR 2 (dreta) -->
                <g id="ph-motor2" transform="translate(220, 40)">
                    <rect x="0" y="0" width="140" height="220" rx="8" fill="url(#ph-motor-bg)" stroke="#7f8c8d" stroke-width="2"/>
                    <text x="70" y="22" text-anchor="middle" fill="#e67e22" font-size="13" font-weight="bold">Motor 2</text>

                    <circle cx="70" cy="85" r="32" fill="#2c3e50" stroke="#7f8c8d" stroke-width="3"/>
                    <line id="ph-m2-marker" x1="70" y1="85" x2="70" y2="58" stroke="#ecf0f1" stroke-width="3" stroke-linecap="round"/>
                    <text x="70" y="90" text-anchor="middle" fill="#ecf0f1" font-size="18" font-weight="bold">M</text>

                    <g id="ph-m2-arrows">
                        <path id="ph-m2-arrow-rev" d="M 25,75 Q 15,85 25,95" fill="none" stroke="#7f8c8d" stroke-width="2" marker-end="url(#ph-arrow-rev)" opacity="0.3"/>
                        <path id="ph-m2-arrow-fwd" d="M 115,75 Q 125,85 115,95" fill="none" stroke="#7f8c8d" stroke-width="2" marker-end="url(#ph-arrow-fwd)" opacity="0.3"/>
                    </g>

                    <g id="ph-m2-relay-a">
                        <rect x="10" y="140" width="50" height="30" rx="4" fill="#333" stroke="#7f8c8d" stroke-width="1"/>
                        <circle id="ph-m2-led-a" cx="20" cy="155" r="6" fill="#440000"/>
                        <text x="40" y="160" text-anchor="middle" fill="#ecf0f1" font-size="11">A</text>
                    </g>
                    <g id="ph-m2-relay-b">
                        <rect x="80" y="140" width="50" height="30" rx="4" fill="#333" stroke="#7f8c8d" stroke-width="1"/>
                        <circle id="ph-m2-led-b" cx="90" cy="155" r="6" fill="#440000"/>
                        <text x="110" y="160" text-anchor="middle" fill="#ecf0f1" font-size="11">B</text>
                    </g>

                    <text id="ph-m2-status" x="70" y="195" text-anchor="middle" fill="#7f8c8d" font-size="12">ATURAT</text>
                </g>

                <!-- Llegenda inferior -->
                <g transform="translate(40, 272)">
                    <circle cx="8" cy="0" r="5" fill="#2ecc71"/>
                    <text x="16" y="4" fill="#ecf0f1" font-size="10">Actiu</text>
                    <circle cx="80" cy="0" r="5" fill="#e74c3c"/>
                    <text x="88" y="4" fill="#ecf0f1" font-size="10">Error</text>
                    <text x="160" y="4" fill="#95a5a6" font-size="10">Shift+drag per pan · Scroll per zoom</text>
                </g>
            </svg>
        `;

        const tmp = document.createElement('div');
        tmp.innerHTML = svgStr;
        this.svg = tmp.firstElementChild;
        this.container.appendChild(this.svg);
    }

    // ─── CALLBACK: output canviat des de PLCMemory ─────────────────────────

    onOutputChanged(nom, value) {
        // Determinar motor i sentit
        let motorNum, sentit;
        if (nom === 'motor1A') { motorNum = 1; sentit = 'A'; }
        else if (nom === 'motor1B') { motorNum = 1; sentit = 'B'; }
        else if (nom === 'motor2A') { motorNum = 2; sentit = 'A'; }
        else if (nom === 'motor2B') { motorNum = 2; sentit = 'B'; }
        else return;

        const motor = this.motors[motorNum];
        const prefix = `ph-m${motorNum}`;

        // Actualitzar LED del relay
        const ledEl = this.svg.querySelector(`#${prefix}-led-${sentit.toLowerCase()}`);
        if (ledEl) {
            ledEl.setAttribute('fill', value ? '#2ecc71' : '#440000');
            ledEl.style.filter = value ? 'url(#ph-glow-green)' : 'none';
        }

        // Llegir els dos sentits actuals del motor
        const valA = this.outputState[`motor${motorNum}A`] || 0;
        const valB = this.outputState[`motor${motorNum}B`] || 0;

        // Determinar estat: 00 i 11 → ATURAT, 01 → ENDAVANT, 10 → ENDARRERE
        motor.error = false;
        
        if (valA && !valB) {
            motor.direction = 1;
            this.setMotorStatus(motorNum, 'ENDAVANT', '#2ecc71');
        } else if (!valA && valB) {
            motor.direction = -1;
            this.setMotorStatus(motorNum, 'ENDARRERA', '#e74c3c');
        } else {
            // 00 o 11 → ATURAT
            motor.direction = 0;
            this.setMotorStatus(motorNum, 'ATURAT', '#7f8c8d');
        }

        // Actualitzar arrows
        this.updateArrows(motorNum);

        // Iniciar/aturar animació si cal
        this.updateAnimation();
    }

    // ─── VISUALS ────────────────────────────────────────────────────────────

    setMotorStatus(motorNum, text, color) {
        const el = this.svg.querySelector(`#ph-m${motorNum}-status`);
        if (el) {
            el.textContent = text;
            el.setAttribute('fill', color);
        }
    }

    updateArrows(motorNum) {
        const motor = this.motors[motorNum];
        const prefix = `ph-m${motorNum}`;

        const arrowFwd = this.svg.querySelector(`#${prefix}-arrow-fwd`);
        const arrowRev = this.svg.querySelector(`#${prefix}-arrow-rev`);

        if (arrowFwd) {
            if (motor.direction === 1) {
                arrowFwd.setAttribute('stroke', '#2ecc71');
                arrowFwd.setAttribute('opacity', '1');
            } else {
                arrowFwd.setAttribute('stroke', '#7f8c8d');
                arrowFwd.setAttribute('opacity', '0.3');
            }
        }

        if (arrowRev) {
            if (motor.direction === -1) {
                arrowRev.setAttribute('stroke', '#e74c3c');
                arrowRev.setAttribute('opacity', '1');
            } else {
                arrowRev.setAttribute('stroke', '#7f8c8d');
                arrowRev.setAttribute('opacity', '0.3');
            }
        }
    }

    // ─── ANIMACIÓ ROTACIÓ ──────────────────────────────────────────────────

    updateAnimation() {
        const anyMoving = this.motors[1].direction !== 0 || this.motors[2].direction !== 0;

        if (anyMoving && !this.animationId) {
            this.animate();
        } else if (!anyMoving && this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        // Velocitat de rotació (graus per frame)
        const speed = 4;

        const step = () => {
            for (const [numStr, motor] of Object.entries(this.motors)) {
                if (motor.direction !== 0) {
                    motor.angle += motor.direction * speed;
                    if (motor.angle >= 360) motor.angle -= 360;
                    if (motor.angle < 0) motor.angle += 360;

                    // Moure el marker (la línia que indica posició)
                    const marker = this.svg.querySelector(`#ph-m${numStr}-marker`);
                    if (marker) {
                        const cx = 70, cy = 85, r = 27;
                        const rad = (motor.angle - 90) * Math.PI / 180;
                        const x2 = cx + r * Math.cos(rad);
                        const y2 = cy + r * Math.sin(rad);
                        marker.setAttribute('x2', x2);
                        marker.setAttribute('y2', y2);
                    }
                }
            }

            this.animationId = requestAnimationFrame(step);
        };

        this.animationId = requestAnimationFrame(step);
    }

    // ─── CLEANUP ────────────────────────────────────────────────────────────

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
    // Registrar tipus de bessó en BessoManager v2.0
    if (window.BessoManager && window.BessoManager.registerType) {
        window.BessoManager.registerType('pont-h', PontH);
    }
}

console.log('✓ PontH loaded');
