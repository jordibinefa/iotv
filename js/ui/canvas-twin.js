/**
 * CanvasTwin - Visualització SVG de la v1 adaptada per IoT-Vertebrae v2
 *
 * Monta el SVG amb plaques (CAP, vèrtebres, costelles) dins un container
 * proporcionat per WindowManager. Escolta EventBus per actualitzar
 * LEDs, switches, sliders i displays en temps real.
 *
 * Substitueix la dependència del `simulator` global de la v1 per usar
 * directament PLCMemory via EventBus.
 */

class CanvasTwin {
    constructor(container) {
        this.container = container;
        this.scale = 0.35;
        this.translateX = 0;
        this.translateY = 0;
        this.isPanning = false;
        this.lastX = 0;
        this.lastY = 0;
        this.draggingSlider = null;

        // Estat local dels switches (entrades digitals)
        // this.switchStates = new Array(8).fill(0);
        // Estat local dels sliders ADC (entrades analègiques)
        // this.sliderVoltages = new Array(4).fill(0.0);

        // CONFIGURACIÓ DINÀMICA
        this.vertebraeConfig = null;
        
        // Estat local per múltiples vèrtebres
        // Format: { 'addr-side': Array(8) } per digitals
        //         { 'addr-side': Array(4) } per analògics
        this.switchStates = {};
        this.sliderVoltages = {};

        // Toggle vista: SVG (default) vs imatges
        this.useImages = false;

        // Paths d'imatges (ajusta si cal)
        this.imageAssets = {
            cap: 'js/assets/cap.png',
            vertebraDigital: 'js/assets/vertebraDigital.png',
            vertebraAnalogica: 'js/assets/vertebraAnalogica.png',
            costellaDigitalA: 'js/assets/costellaDigitalA.png',
            costellaDigitalB: 'js/assets/costellaDigitalB.png',
            costellaAnalogicaA: 'js/assets/costellaAnalogicaA.png',
            costellaAnalogicaB: 'js/assets/costellaAnalogicaB.png',
        };

        // Crear el DOM dins el container
        this.buildDOM();
        // this.renderComponents();
        // Carregar configuració per defecte si VertebraeConfig està disponible
        if (window.VertebraeConfig) {
            const config = window.VertebraeConfig.getOrDefault();
            this.setVertebraeConfig(config);
        } else {
            // Fallback: renderització hardcoded original
            this.renderComponents();
        }        
        this.setupInteraction();
        this.subscribeEvents();

        // Centrar vista inicial
        requestAnimationFrame(() => this.resetView());
    }
    
    /**
     * Establir configuració dinàmica de vèrtebres
     * @param {Object} config - Configuració de VertebraeConfig
     */
    setVertebraeConfig(config) {
        if (!config || !config.vertebrae) {
            console.error('[CanvasTwin] Configuració invàlida');
            return false;
        }
        
        console.log(`[CanvasTwin] Aplicant configuració: ${config.name}`);
        this.vertebraeConfig = config;
        
        // Inicialitzar estats locals
        this._initializeStates();
        
        // Reconstruir plaques
        this.rebuildPlates();
        
        // Reposicionar vista a dalt-esquerra
        requestAnimationFrame(() => this.resetView());
        
        return true;
    }

    /**
     * Inicialitzar estats locals segons configuració
     */
    _initializeStates() {
        this.switchStates = {};
        this.sliderVoltages = {};
        
        if (!this.vertebraeConfig) return;
        
        this.vertebraeConfig.vertebrae.forEach(v => {
            const keyA = `${v.addr}-a`;
            const keyB = `${v.addr}-b`;
            
            if (v.type === 'digital') {
                if (v.costellaA === 'input') {
                    this.switchStates[keyA] = new Array(8).fill(0);
                }
                if (v.costellaB === 'input') {
                    this.switchStates[keyB] = new Array(8).fill(0);
                }
            } else if (v.type === 'analog') {
                if (v.costellaA === 'input') {
                    this.sliderVoltages[keyA] = new Array(4).fill(0.0);
                }
                if (v.costellaB === 'input') {
                    this.sliderVoltages[keyB] = new Array(4).fill(0.0);
                }
            }
        });
    }

    /**
     * Obtenir configuració per defecte (fallback)
     */
    _getDefaultConfig() {
        return {
            name: "default",
            vertebrae: [
                { addr: "0x0", type: "digital", costellaA: "output", costellaB: "input" },
                { addr: "0x0", type: "analog", costellaA: "output", costellaB: "input" }
            ]
        };
    }
    
    

    // ─── DOM ─────────────────────────────────────────────────────────────────

    buildDOM() {
        // Container intern amb overflow hidden per al zoom/pan
        this.wrapper = document.createElement('div');
        this.wrapper.id = 'ct-canvas-container';
        this.wrapper.style.cssText = 'width:100%;height:100%;overflow:hidden;background:#1e1e1e;position:relative;cursor:grab;';
        this.container.appendChild(this.wrapper);

        // Controls zoom (esquerra inferior)
        this.zoomControls = document.createElement('div');
        this.zoomControls.style.cssText = [
            'position:absolute;bottom:8px;left:8px;z-index:10;',
            'display:flex;gap:4px;'
        ].join('');
        this.zoomControls.innerHTML = `
            <button class="ct-zoom-btn" data-action="in">🔍+</button>
            <button class="ct-zoom-btn" data-action="out">🔍−</button>
            <button class="ct-zoom-btn" data-action="reset">↺</button>
        `;
        this.zoomControls.querySelectorAll('.ct-zoom-btn').forEach(btn => {
            btn.style.cssText = [
                'padding:4px 8px;border:none;border-radius:4px;',
                'background:rgba(44,62,80,0.85);color:#ecf0f1;',
                'font-size:12px;cursor:pointer;'
            ].join('');
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'in') this.zoomIn();
                else if (action === 'out') this.zoomOut();
                else this.resetView();
            });
        });
        this.wrapper.appendChild(this.zoomControls);

        // Toggle SVG / Imatge (a dalt-esquerra)
        this.viewToggle = document.createElement('label');
        this.viewToggle.style.cssText = [
            'position:absolute;top:8px;left:8px;z-index:10;',
            'display:flex;align-items:center;gap:6px;',
            'padding:6px 8px;border-radius:6px;',
            'background:rgba(44,62,80,0.85);color:#ecf0f1;',
            'font:12px sans-serif;user-select:none;'
        ].join('');
        this.viewToggle.innerHTML = `
            <input id="ct-toggle-images" type="checkbox" style="cursor:pointer"/>
            <span>Vista realista</span>
        `;
        this.wrapper.appendChild(this.viewToggle);

        this.viewToggle.querySelector('#ct-toggle-images').addEventListener('change', (e) => {
            this.useImages = e.target.checked;
            this.rebuildPlates();
        });

        // SVG principal
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('id', 'ct-main-canvas');
        this.svg.setAttribute('width', '5000');
        this.svg.setAttribute('height', '3000');
        this.svg.setAttribute('viewBox', '-1500 0 5000 3000');
        this.svg.style.cssText = 'transform-origin:0 0;transition:transform 0.05s ease-out;';

        // Defs (gradients per LEDs)
        this.svg.innerHTML = `
            <defs>
                <radialGradient id="ct-led-on">
                    <stop offset="0%" style="stop-color:#ff4444;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#ff0000;stop-opacity:1"/>
                </radialGradient>
                <radialGradient id="ct-led-off">
                    <stop offset="0%" style="stop-color:#440000;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#330000;stop-opacity:1"/>
                </radialGradient>
            </defs>
        `;

        // Construir plaques segons mode (SVG per defecte)
        this.rebuildPlates();

        this.wrapper.appendChild(this.svg);
    }

    /**
     * Regenera totes les plaques segons this.useImages.
     * Manté <defs> i re-renderitza components interactius.
     */
     
    /* rebuildPlates() {
        const defs = this.svg.querySelector('defs');
        this.svg.innerHTML = '';
        if (defs) this.svg.appendChild(defs);

        const img = this.useImages ? this.imageAssets : null;

        this.svg.appendChild(this.createPlacaCAP(img?.cap || null));

        this.svg.appendChild(this.createPlacaVertebra('digital', img?.vertebraDigital || null));
        this.svg.appendChild(this.createPlacaCostellaDigitalA(img?.costellaDigitalA || null));
        this.svg.appendChild(this.createPlacaCostellaDigitalB(img?.costellaDigitalB || null));

        this.svg.appendChild(this.createPlacaVertebra('analogica', img?.vertebraAnalogica || null));
        this.svg.appendChild(this.createPlacaCostellaAnalogicaA(img?.costellaAnalogicaA || null));
        this.svg.appendChild(this.createPlacaCostellaAnalogicaB(img?.costellaAnalogicaB || null));

        // Tornar a pintar components interactius
        this.renderComponents();
    } */
    
    rebuildPlates() {
        const defs = this.svg.querySelector('defs');
        this.svg.innerHTML = '';
        if (defs) this.svg.appendChild(defs);

        const img = this.useImages ? this.imageAssets : null;

        // CAP sempre fix
        this.svg.appendChild(this.createPlacaCAP(img?.cap || null));

        // Obtenir configuració o usar per defecte
        const config = this.vertebraeConfig || this._getDefaultConfig();
        
        // Ajustar viewBox dinàmicament segons nombre de vèrtebres
        const nVert = config.vertebrae ? config.vertebrae.length : 2;
        const H = window.CanvasHelpers;
        const totalHeight = H.CAP_HEIGHT + H.VERTEBRA_SPACING + 
            nVert * (H.VERTEBRA_HEIGHT + H.VERTEBRA_SPACING) + 100;
        const svgH = Math.max(3000, totalHeight);
        this.svg.setAttribute('height', svgH.toString());
        this.svg.setAttribute('viewBox', `-1500 0 5000 ${svgH}`);
        
        // Renderitzar cada vèrtebra segons configuració
        config.vertebrae.forEach((vertebra, index) => {
            const yPos = window.CanvasHelpers.calculateVertebraY(index);
            
            // Crear vèrtebra
            this.svg.appendChild(
                this.createPlacaVertebra(
                    vertebra.type,
                    yPos,
                    vertebra.addr,
                    img?.[vertebra.type === 'digital' ? 'vertebraDigital' : 'vertebraAnalogica'] || null
                )
            );
            
            // Crear costella A si no és "none"
            if (vertebra.costellaA !== 'none') {
                this.svg.appendChild(
                    this.createPlacaCostella(
                        vertebra.type,
                        'a',
                        yPos,
                        vertebra.addr,
                        vertebra.costellaA,
                        img
                    )
                );
            }
            
            // Crear costella B si no és "none"
            if (vertebra.costellaB !== 'none') {
                this.svg.appendChild(
                    this.createPlacaCostella(
                        vertebra.type,
                        'b',
                        yPos,
                        vertebra.addr,
                        vertebra.costellaB,
                        img
                    )
                );
            }
        });

        this.renderComponents();
    }    

    // ─── PLAQUES (estructura estàtica) ────────────────────────────────────────

    createPlacaCAP(imageHref = null) {
        const background = imageHref
            ? `
                <image x="0" y="0" width="800" height="600"
                       href="${imageHref}" preserveAspectRatio="none"/>
                <rect x="0" y="0" width="800" height="600"
                      fill="none" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `
            : `
                <rect x="0" y="0" width="800" height="600"
                      fill="#34495e" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `;

        return this.parseSVG(`
            <g id="ct-cap" transform="translate(-400, 0)">
                ${background}
                <text x="400" y="280" text-anchor="middle" fill="#ecf0f1" font-size="32" font-weight="bold">CAP IoT-Vertebrae</text>
                <text x="400" y="320" text-anchor="middle" fill="#95a5a6" font-size="18">MQTT / Raspberry Pi</text>
                <circle cx="400" cy="380" r="30" fill="#2ecc71" stroke="#ecf0f1" stroke-width="2"/>
                <text x="400" y="390" text-anchor="middle" fill="#ecf0f1" font-size="16">OK</text>
            </g>
        `);
    }

    /*createPlacaVertebra(tipus, imageHref = null) {
        const y = tipus === 'digital' ? 620 : 1240;
        const color = tipus === 'digital' ? '#3498db' : '#e67e22';
        const label = tipus === 'digital' ? 'VÈRTEBRA DIGITAL' : 'VÈRTEBRA ANALÒGICA';
        const addr = '0x0';
        const id = `ct-vertebra-${tipus}`;*/

    createPlacaVertebra(tipus, yPos, addr, imageHref = null) {
        const color = tipus === 'digital' ? '#3498db' : '#e67e22';
        const label = tipus === 'digital' ? 'VÈRTEBRA DIGITAL' : 'VÈRTEBRA ANALÒGICA';
        const id = `ct-vertebra-${tipus}-${addr}`;
        
        // Convertir adreça a binari per display
        const addrBinary = window.CanvasHelpers.addrToBinary(addr);


        const background = imageHref
            ? `
                <image x="0" y="0" width="600" height="600"
                       href="${imageHref}" preserveAspectRatio="none"/>
                <rect x="0" y="0" width="600" height="600"
                      fill="none" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `
            : `
                <rect x="0" y="0" width="600" height="600"
                      fill="#2c3e50" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `;

        /*return this.parseSVG(`
            <g id="${id}" transform="translate(-300, ${y})">*/
          return this.parseSVG(`
            <g id="${id}" transform="translate(-300, ${yPos})">

                ${background}
                <text x="300" y="260" text-anchor="middle" fill="#ecf0f1" font-size="28" font-weight="bold">${label}</text>
                <!-- <text x="300" y="300" text-anchor="middle" fill="${color}" font-size="24">${addr}</text> -->
                <text x="300" y="300" text-anchor="middle" fill="${color}" font-size="24">${tipus.charAt(0).toUpperCase()} ${addrBinary}</text>     
                <!-- Regletes A i B -->
                <rect x="20" y="320" width="80" height="240" fill="#7f8c8d" stroke="#ecf0f1" stroke-width="2"/>
                <text x="60" y="340" text-anchor="middle" fill="#ecf0f1" font-size="16" font-weight="bold">A</text>
                <rect x="500" y="320" width="80" height="240" fill="#7f8c8d" stroke="#ecf0f1" stroke-width="2"/>
                <text x="540" y="340" text-anchor="middle" fill="#ecf0f1" font-size="16" font-weight="bold">B</text>
            </g>
        `);
    }

    /**
     * Crear placa de costella genèrica (substitueix les 4 funcions individuals)
     */
    createPlacaCostella(tipus, side, yPos, addr, funcio, imageAssets = null) {
		// Normalitzar adreça
		const normalizedAddr = window.CanvasHelpers.addrToHex(addr);
    
        const xOffset = window.CanvasHelpers.getCostellaOffsetX(side);
        // const id = `ct-costella-${tipus.substring(0, 3)}-${side}-${addr}`;
        const id = `ct-costella-${tipus.substring(0, 3)}-${side}-${normalizedAddr}`;
        
        // Determinar imatge i rotació
        let imageHref = null;
        let rotation = 0;
        
        if (imageAssets) {
            const imageName = window.CanvasHelpers.getImageNameForCostella(tipus, funcio);
            imageHref = imageAssets[imageName.replace('.png', '')];
            rotation = window.CanvasHelpers.getImageRotation(side, funcio);
        }
        
        const color = window.CanvasHelpers.getCostellaColor(tipus, funcio);
        const label = window.CanvasHelpers.getCostellaLabel(tipus, funcio);
        const title = funcio === 'output' ? 'SORTIDES' : 'ENTRADES';
        const labelText = `COSTELLA ${tipus === 'digital' ? 'DIGITAL' : 'ANALÒGICA'} ${side.toUpperCase()}`;
        
        const background = imageHref
            ? window.CanvasHelpers.createPlateBackground(imageHref, 600, 600, color, rotation)
            : window.CanvasHelpers.createPlateBackground(null, 600, 600, color);
        
        // Container per components interactius
        const containerIdSuffix = tipus === 'digital' 
            ? (funcio === 'output' ? 'leds' : 'switches')
            : (funcio === 'output' ? 'displays' : 'sliders');
        // const containerId = `ct-${containerIdSuffix}-${addr}-${side}`;
        const containerId = `ct-${containerIdSuffix}-${normalizedAddr}-${side}`;
        
        return this.parseSVG(`
            <g id="${id}" transform="translate(${xOffset}, ${yPos})">
                ${background}
                <text x="300" y="50" text-anchor="middle" fill="#ecf0f1" 
                      font-size="20" font-weight="bold">${labelText}</text>
                <text x="300" y="80" text-anchor="middle" fill="#ecf0f1" 
                      font-size="16">${title} (${label})</text>
                <g id="${containerId}"></g>
            </g>
        `);
    }    

    createPlacaCostellaDigitalA(imageHref = null) {
        const background = imageHref
            ? `
                <image x="0" y="0" width="600" height="600"
                       href="${imageHref}" preserveAspectRatio="none"/>
                <rect x="0" y="0" width="600" height="600"
                      fill="none" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `
            : `
                <rect x="0" y="0" width="600" height="600"
                      fill="#16a085" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `;

        return this.parseSVG(`
            <g id="ct-costella-dig-a" transform="translate(-910, 620)">
                ${background}
                <text x="300" y="50" text-anchor="middle" fill="#ecf0f1" font-size="20" font-weight="bold">COSTELLA DIGITAL A</text>
                <text x="300" y="80" text-anchor="middle" fill="#ecf0f1" font-size="16">SORTIDES (OUTPUT)</text>
                <g id="ct-leds-out"></g>
            </g>
        `);
    }

    createPlacaCostellaDigitalB(imageHref = null) {
        const background = imageHref
            ? `
                <image x="0" y="0" width="600" height="600"
                       href="${imageHref}" preserveAspectRatio="none"/>
                <rect x="0" y="0" width="600" height="600"
                      fill="none" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `
            : `
                <rect x="0" y="0" width="600" height="600"
                      fill="#27ae60" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `;

        return this.parseSVG(`
            <g id="ct-costella-dig-b" transform="translate(310, 620)">
                ${background}
                <text x="300" y="50" text-anchor="middle" fill="#ecf0f1" font-size="20" font-weight="bold">COSTELLA DIGITAL B</text>
                <text x="300" y="80" text-anchor="middle" fill="#ecf0f1" font-size="16">ENTRADES (INPUT)</text>
                <g id="ct-switches-in"></g>
            </g>
        `);
    }

    createPlacaCostellaAnalogicaA(imageHref = null) {
        const background = imageHref
            ? `
                <image x="0" y="0" width="600" height="600"
                       href="${imageHref}" preserveAspectRatio="none"/>
                <rect x="0" y="0" width="600" height="600"
                      fill="none" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `
            : `
                <rect x="0" y="0" width="600" height="600"
                      fill="#8e44ad" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `;

        return this.parseSVG(`
            <g id="ct-costella-ana-a" transform="translate(-910, 1240)">
                ${background}
                <text x="300" y="50" text-anchor="middle" fill="#ecf0f1" font-size="20" font-weight="bold">COSTELLA ANALÈGICA A</text>
                <text x="300" y="80" text-anchor="middle" fill="#ecf0f1" font-size="16">SORTIDES DAC (0-10V)</text>
                <g id="ct-voltage-displays"></g>
            </g>
        `);
    }

    createPlacaCostellaAnalogicaB(imageHref = null) {
        const background = imageHref
            ? `
                <image x="0" y="0" width="600" height="600"
                       href="${imageHref}" preserveAspectRatio="none"/>
                <rect x="0" y="0" width="600" height="600"
                      fill="none" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `
            : `
                <rect x="0" y="0" width="600" height="600"
                      fill="#9b59b6" stroke="#ecf0f1" stroke-width="4" rx="10"/>
              `;

        return this.parseSVG(`
            <g id="ct-costella-ana-b" transform="translate(310, 1240)">
                ${background}
                <text x="300" y="50" text-anchor="middle" fill="#ecf0f1" font-size="20" font-weight="bold">COSTELLA ANALÈGICA B</text>
                <text x="300" y="80" text-anchor="middle" fill="#ecf0f1" font-size="16">ENTRADES ADC (±10V)</text>
                <g id="ct-voltage-sliders"></g>
            </g>
        `);
    }

    // ─── COMPONENTS INTERACTIUS ────────────────────────────────────────────────

    /*renderComponents() {
        this.renderLEDs();
        this.renderSwitches();
        this.renderVoltageDisplays();
        this.renderVoltageSliders();
    }*/
    renderComponents() {
        if (!this.vertebraeConfig) {
            // Compatibilitat: renderitzar com abans (hardcoded)
            this.renderLEDs();
            this.renderSwitches();
            this.renderVoltageDisplays();
            this.renderVoltageSliders();
            return;
        }
        
        // Nou: renderitzar segons configuració
        this.vertebraeConfig.vertebrae.forEach((vertebra, index) => {
            if (vertebra.type === 'digital') {
                // Renderitzar LEDs si hi ha sortides
                if (vertebra.costellaA === 'output') {
                    this.renderLEDsFor(vertebra.addr, 'a');
                }
                if (vertebra.costellaB === 'output') {
                    this.renderLEDsFor(vertebra.addr, 'b');
                }
                
                // Renderitzar switches si hi ha entrades
                if (vertebra.costellaA === 'input') {
                    this.renderSwitchesFor(vertebra.addr, 'a');
                }
                if (vertebra.costellaB === 'input') {
                    this.renderSwitchesFor(vertebra.addr, 'b');
                }
            } else if (vertebra.type === 'analog') {
                // Renderitzar displays si hi ha sortides
                if (vertebra.costellaA === 'output') {
                    this.renderVoltageDisplaysFor(vertebra.addr, 'a');
                }
                if (vertebra.costellaB === 'output') {
                    this.renderVoltageDisplaysFor(vertebra.addr, 'b');
                }
                
                // Renderitzar sliders si hi ha entrades
                if (vertebra.costellaA === 'input') {
                    this.renderVoltageSlidersFor(vertebra.addr, 'a');
                }
                if (vertebra.costellaB === 'input') {
                    this.renderVoltageSlidersFor(vertebra.addr, 'b');
                }
            }
        });
    }    

    /**
     * Renderitzar LEDs per una vèrtebra i costat específics
     */
    renderLEDsFor(addr, side) {
		// Normalitzar adreça
		const normalizedAddr = window.CanvasHelpers.addrToHex(addr);
		
        // const containerId = `ct-leds-${addr}-${side}`;
        const containerId = `ct-leds-${normalizedAddr}-${side}`;
        const container = this.svg.querySelector(`#${containerId}`);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Determinar posicions segons costat
        const isLeftSide = (side === 'a');
        const ledX = isLeftSide ? 100 : 500;
        const labelX = isLeftSide ? 40 : 440;
        const stateX = isLeftSide ? 130 : 530;
        
        for (let bit = 7; bit >= 0; bit--) {
            const y = 150 + (7 - bit) * 60;
            // Costat A: costelles girades 180°, ordre visual invertit (DO0 a dalt, DO7 a baix)
            // Costat B: ordre normal (DO7 a dalt, DO0 a baix)
            const displayBit = (side === 'a') ? (7 - bit) : bit;
            // const ledId = window.CanvasHelpers.generateComponentId('led', addr, side, bit);
            const ledId = window.CanvasHelpers.generateComponentId('led', normalizedAddr, side, displayBit);
            const stateId = `${ledId}-state`;
            
            const g = this.parseSVG(`
                <g>
                    <circle id="${ledId}" cx="${ledX}" cy="${y}" r="20"
                        fill="url(#ct-led-off)" stroke="#666" stroke-width="2"/>
                    <text x="${labelX}" y="${y + 5}" fill="#ecf0f1" font-size="14">DO${displayBit}</text>
                    <text id="${stateId}" x="${stateX}" y="${y + 5}" fill="#ecf0f1" font-size="14">0</text>
                </g>
            `);
            
            container.appendChild(g);
        }
    }

    /**
     * Renderitzar Switches per una vèrtebra i costat específics
     */
    renderSwitchesFor(addr, side) {
		// Normalitzar adreça
		const normalizedAddr = window.CanvasHelpers.addrToHex(addr);
        // const containerId = `ct-switches-${addr}-${side}`;
        const containerId = `ct-switches-${normalizedAddr}-${side}`;
        const container = this.svg.querySelector(`#${containerId}`);
        //if (!container) return;
        if (!container) {
			console.warn(`[CanvasTwin] Container ${containerId} no trobat!`); // ← AFEGIR
			return;
		}
        
        container.innerHTML = '';
        
        // Determinar posicions segons costat
        const isLeftSide = (side === 'a');
        const switchX = isLeftSide ? 40 : 500;
        const toggleCx = isLeftSide ? 53 : 513;
        const labelX = isLeftSide ? 10 : 470;
        const stateX = isLeftSide ? 110 : 570;
        
        for (let bit = 7; bit >= 0; bit--) {
            const y = 150 + (7 - bit) * 60;
            // Costat A: costelles girades 180°, ordre visual invertit (DI0 a dalt, DI7 a baix)
            // Costat B: ordre normal (DI7 a dalt, DI0 a baix)
            const displayBit = (side === 'a') ? (7 - bit) : bit;
            // const switchId = window.CanvasHelpers.generateComponentId('switch', addr, side, bit);
            const switchId = window.CanvasHelpers.generateComponentId('switch', normalizedAddr, side, displayBit);
            const toggleId = `${switchId}-toggle`;
            const stateId = `${switchId}-state`;
            
            // console.log(`[DEBUG] Creant switch ${switchId}`); 
            
            /*const g = this.parseSVG(`
                <g>
                    <rect id="${switchId}" x="${switchX}" y="${y - 15}" width="60" height="30" rx="15"
                        fill="#95a5a6" stroke="#333" stroke-width="2" class="ct-clickable"/>
                    <circle id="${toggleId}" cx="${toggleCx}" cy="${y}" r="12" fill="white"/>
                    <text x="${labelX}" y="${y + 5}" fill="#ecf0f1" font-size="14">DI${bit}</text>
                    <text id="${stateId}" x="${stateX}" y="${y + 5}" fill="#ecf0f1" font-size="14">0</text>
                </g>
            `);
            
            // Event listeners
            const switchRect = g.querySelector(`#${switchId}`);
            const switchToggle = g.querySelector(`#${toggleId}`);
            
            // ← AFEGIR LOGS PER DEBUG
			console.log(`[CanvasTwin] Afegint listener a switch ${addr}-${side}-${bit}`);
            
            switchRect.addEventListener('click', () => this.handleSwitchClick(addr, side, bit));
            switchToggle.addEventListener('click', () => this.handleSwitchClick(addr, side, bit));
            
            container.appendChild(g);*/
            /* const g = this.parseSVG(`
				<g>
					<rect id="${switchId}" x="${switchX}" y="${y - 15}" width="60" height="30" rx="15"
						fill="#95a5a6" stroke="#333" stroke-width="2" class="ct-clickable"/>
					<circle id="${toggleId}" cx="${toggleCx}" cy="${y}" r="12" fill="white"/>
					<text x="${labelX}" y="${y + 5}" fill="#ecf0f1" font-size="14">DI${bit}</text>
					<text id="${stateId}" x="${stateX}" y="${y + 5}" fill="#ecf0f1" font-size="14">0</text>
				</g>
			`);



			// AFEGIR AL DOM PRIMER
			container.appendChild(g);

			// DESPRÉS afegir event listeners (ara sí que existeixen al DOM)
			const switchRect = this.svg.querySelector(`#${switchId}`);  // ✅ Ara el troba!
			const switchToggle = this.svg.querySelector(`#${toggleId}`); */
			const g = this.parseSVG(`
				<g>
					<rect id="${switchId}" x="${switchX}" y="${y - 15}" width="60" height="30" rx="15"
						fill="#95a5a6" stroke="#333" stroke-width="2" class="ct-clickable"/>
					<circle id="${toggleId}" cx="${toggleCx}" cy="${y}" r="12" fill="white"/>
					<text x="${labelX}" y="${y + 5}" fill="#ecf0f1" font-size="14">DI${displayBit}</text>
					<text id="${stateId}" x="${stateX}" y="${y + 5}" fill="#ecf0f1" font-size="14">0</text>
				</g>
			`);

			// ✅ PRIMER: Afegir al DOM
			container.appendChild(g);
			// console.log(`[DEBUG] Afegit al DOM`);

			// ✅ DESPRÉS: Afegir event listeners (ara els elements existeixen)
			const switchRect = this.svg.querySelector(`#${switchId}`);
			const switchToggle = this.svg.querySelector(`#${toggleId}`);
			
			// console.log(`[DEBUG] switchRect:`, switchRect, 'switchToggle:', switchToggle);

			if (switchRect && switchToggle) {
				switchRect.addEventListener('click', () => this.handleSwitchClick(normalizedAddr, side, displayBit));
				switchToggle.addEventListener('click', () => this.handleSwitchClick(normalizedAddr, side, displayBit));
				// console.log(`[DEBUG] Listeners afegits per ${switchId}`);
			}

			/*if (switchRect && switchToggle) {
				switchRect.addEventListener('click', () => this.handleSwitchClick(addr, side, bit));
				switchToggle.addEventListener('click', () => this.handleSwitchClick(addr, side, bit));
			}*/ else {
				console.warn(`[CanvasTwin] No s'han trobat elements per switch ${normalizedAddr}-${side}-${bit}`);
			}
        }
    }

    /**
     * Renderitzar Displays analògics per una vèrtebra i costat específics
     */
    renderVoltageDisplaysFor(addr, side) {
		// Normalitzar adreça
		const normalizedAddr = window.CanvasHelpers.addrToHex(addr);
    
        // const containerId = `ct-displays-${addr}-${side}`;
        const containerId = `ct-displays-${normalizedAddr}-${side}`;
        const container = this.svg.querySelector(`#${containerId}`);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Determinar posicions segons costat
        const isLeftSide = (side === 'a');
        const displayX = isLeftSide ? 80 : 400;
        const textX = isLeftSide ? 90 : 410;
        const labelX = isLeftSide ? 40 : 550;
        
        for (let canal = 0; canal < 4; canal++) {
            const y = 150 + canal * 100;
            // Costat A: costelles girades 180°, ordre visual invertit (AO4 a dalt, AO1 a baix)
            // Costat B: ordre normal (AO1 a dalt, AO4 a baix)
            const displayCanal = (side === 'a') ? (3 - canal) : canal;
            // const displayId = window.CanvasHelpers.generateComponentId('vdisplay', addr, side, canal);
            const displayId = window.CanvasHelpers.generateComponentId('vdisplay', normalizedAddr, side, displayCanal);
            
            const g = this.parseSVG(`
                <g>
                    <rect x="${displayX}" y="${y - 20}" width="120" height="40" 
                          fill="#000" stroke="#2ecc71" stroke-width="2"/>
                    <text id="${displayId}" x="${textX}" y="${y + 8}" fill="#0f0" 
                          font-family="monospace" font-size="18" font-weight="bold">0.0V</text>
                    <text x="${labelX}" y="${y + 5}" fill="#ecf0f1" font-size="14">AO${displayCanal + 1}</text>
                </g>
            `);
            
            container.appendChild(g);
        }
    }

	/**
	 * Actualitzar display de voltatge
	 */
	updateVoltageDisplay(addr, side, channel, voltage) {
		const displayId = window.CanvasHelpers.generateComponentId('vdisplay', addr, side, channel);
		const display = this.svg.querySelector(`#${displayId}`);
		
		if (display) {
			display.textContent = `${voltage.toFixed(1)}V`;
		} else {
			console.warn(`[updateVoltageDisplay] Display no trobat: ${displayId}`);
		}
	}    

    /**
     * Renderitzar Sliders analògics per una vèrtebra i costat específics
     */
    renderVoltageSlidersFor(addr, side) {
		// Normalitzar adreça
		const normalizedAddr = window.CanvasHelpers.addrToHex(addr);
    
        // const containerId = `ct-sliders-${addr}-${side}`;
        const containerId = `ct-sliders-${normalizedAddr}-${side}`;
        const container = this.svg.querySelector(`#${containerId}`);
        if (!container) return;
        
        container.innerHTML = '';
        
        // Sliders SEMPRE centrats (igual per A i B)
        const trackX = 200;
        const thumbCx = 300;
        const labelX = 150;
        const valueX = 410;
        
        for (let canal = 0; canal < 4; canal++) {
            const y = 150 + canal * 100;
            // Costat A: costelles girades 180°, ordre visual invertit (AI4 a dalt, AI1 a baix)
            // Costat B: ordre normal (AI1 a dalt, AI4 a baix)
            const displayCanal = (side === 'a') ? (3 - canal) : canal;
            // const thumbId = window.CanvasHelpers.generateComponentId('slider-thumb', addr, side, canal);
            // const valueId = window.CanvasHelpers.generateComponentId('slider-value', addr, side, canal);
            const thumbId = window.CanvasHelpers.generateComponentId('slider-thumb', normalizedAddr, side, displayCanal);
            const valueId = window.CanvasHelpers.generateComponentId('slider-value', normalizedAddr, side, displayCanal);
            
            /*const g = this.parseSVG(`
                <g>
                    <rect x="${trackX}" y="${y - 4}" width="200" height="8" rx="4" 
                          fill="#7f8c8d" class="ct-slider-track" 
                          data-addr="${addr}" data-side="${side}" data-canal="${canal}"/>
                    <circle id="${thumbId}" cx="${thumbCx}" cy="${y}" r="12"
                        fill="#3498db" stroke="white" stroke-width="2" class="ct-draggable" 
                        data-addr="${addr}" data-side="${side}" data-canal="${canal}"/>
                    <text x="${labelX}" y="${y + 5}" fill="#ecf0f1" font-size="14">AI${canal + 1}</text>
                    <text id="${valueId}" x="${valueX}" y="${y + 5}" fill="#ecf0f1" font-size="14">0.0V</text>
                </g>
            `);
            
            container.appendChild(g);*/
            const g = this.parseSVG(`
				<g>
					<rect x="${trackX}" y="${y - 4}" width="200" height="8" rx="4" 
						  fill="#7f8c8d" class="ct-slider-track" 
						  data-addr="${addr}" data-side="${side}" data-canal="${displayCanal}"/>
					<circle id="${thumbId}" cx="${thumbCx}" cy="${y}" r="12"
						fill="#3498db" stroke="white" stroke-width="2" class="ct-draggable" 
						data-addr="${addr}" data-side="${side}" data-canal="${displayCanal}"/>
					<text x="${labelX}" y="${y + 5}" fill="#ecf0f1" font-size="14">AI${displayCanal + 1}</text>
					<text id="${valueId}" x="${valueX}" y="${y + 5}" fill="#ecf0f1" font-size="14">0.0V</text>
				</g>
			`);

			// ✅ PRIMER: Afegir al DOM
			container.appendChild(g);

			// ✅ DESPRÉS: Configurar arrossegament (si cal)
			// Nota: L'arrossegament es gestiona a setupInteraction() amb event delegation
			// No cal afegir listeners individuals aquí
        }
    }    

    renderLEDs() {
        const container = this.svg.querySelector('#ct-leds-out');
        if (!container) return;
        container.innerHTML = '';

        for (let bit = 7; bit >= 0; bit--) {
            const y = 150 + (7 - bit) * 60;
            const g = this.parseSVG(`
                <g>
                    <circle id="ct-led-${bit}" cx="80" cy="${y}" r="20"
                        fill="url(#ct-led-off)" stroke="#666" stroke-width="2" class="ct-clickable"/>
                    <text x="30" y="${y + 5}" fill="#ecf0f1" font-size="14">DO${bit}</text>
                    <text id="ct-led-state-${bit}" x="110" y="${y + 5}" fill="#ecf0f1" font-size="14">0</text>
                </g>
            `);
            const ledCircle = g.querySelector(`#ct-led-${bit}`);
            ledCircle.addEventListener('click', () => this.handleLEDClick(bit));
            container.appendChild(g);
        }
    }

    renderSwitches() {
        const container = this.svg.querySelector('#ct-switches-in');
        if (!container) return;
        container.innerHTML = '';

        for (let bit = 7; bit >= 0; bit--) {
            const y = 150 + (7 - bit) * 60;
            const g = this.parseSVG(`
                <g>
                    <rect id="ct-switch-${bit}" x="440" y="${y - 15}" width="60" height="30" rx="15"
                        fill="#95a5a6" stroke="#333" stroke-width="2" class="ct-clickable"/>
                    <circle id="ct-switch-toggle-${bit}" cx="453" cy="${y}" r="12" fill="white"/>
                    <text x="390" y="${y + 5}" fill="#ecf0f1" font-size="14">DI${bit}</text>
                    <text id="ct-switch-state-${bit}" x="510" y="${y + 5}" fill="#ecf0f1" font-size="14">0</text>
                </g>
            `);
            const switchRect = g.querySelector(`#ct-switch-${bit}`);
            const switchToggle = g.querySelector(`#ct-switch-toggle-${bit}`);
            switchRect.addEventListener('click', () => this.handleSwitchClick(bit));
            switchToggle.addEventListener('click', () => this.handleSwitchClick(bit));
            container.appendChild(g);
        }
    }

    renderVoltageDisplays() {
        const container = this.svg.querySelector('#ct-voltage-displays');
        if (!container) return;
        container.innerHTML = '';

        for (let canal = 0; canal < 4; canal++) {
            const y = 150 + canal * 100;
            const g = this.parseSVG(`
                <g>
                    <rect x="80" y="${y - 20}" width="120" height="40" fill="#000" stroke="#2ecc71" stroke-width="2"/>
                    <text id="ct-vdisplay-${canal}" x="90" y="${y + 8}" fill="#0f0" font-family="monospace" font-size="18" font-weight="bold">0.0V</text>
                    <text x="40" y="${y + 5}" fill="#ecf0f1" font-size="14">AO${canal + 1}</text>
                </g>
            `);
            container.appendChild(g);
        }
    }

    renderVoltageSliders() {
        const container = this.svg.querySelector('#ct-voltage-sliders');
        if (!container) return;
        container.innerHTML = '';

        for (let canal = 0; canal < 4; canal++) {
            const y = 150 + canal * 100;
            const g = this.parseSVG(`
                <g>
                    <rect x="80" y="${y - 4}" width="200" height="8" rx="4" fill="#7f8c8d" class="ct-slider-track" data-canal="${canal}"/>
                    <circle id="ct-slider-thumb-${canal}" cx="180" cy="${y}" r="12"
                        fill="#3498db" stroke="white" stroke-width="2" class="ct-draggable" data-canal="${canal}"/>
                    <text x="40" y="${y + 5}" fill="#ecf0f1" font-size="14">AI${canal + 1}</text>
                    <text id="ct-slider-value-${canal}" x="290" y="${y + 5}" fill="#ecf0f1" font-size="14">0.0V</text>
                </g>
            `);
            container.appendChild(g);
        }
    }

    // ─── INTERACCIÓ (click, drag, zoom/pan) ───────────────────────────────────

    setupInteraction() {
        // Zoom amb roda
        this.wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = -Math.sign(e.deltaY);
            this.zoom(delta, e.clientX, e.clientY);
        }, { passive: false });

        // Pan amb botó del mig o Shift+arrossegar
        this.wrapper.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                this.startPan(e);
            }
        });
        this.wrapper.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.wrapper.addEventListener('mouseup', () => this.stopPan());
        this.wrapper.addEventListener('mouseleave', () => this.stopPan());
        this.wrapper.addEventListener('contextmenu', (e) => { if (e.button === 1) e.preventDefault(); });

        // Sliders: mousedown sobre thumbs
        /*this.svg.addEventListener('mousedown', (e) => {
            const thumb = e.target.closest('.ct-draggable');
            if (thumb) {
                this.draggingSlider = parseInt(thumb.dataset.canal);
                e.stopPropagation();
            }
        });*/
            // Arrossegar sliders analògics
			this.svg.addEventListener('mousedown', (e) => {
				if (e.target.classList.contains('ct-draggable')) {
					this.draggingSlider = {
						element: e.target,
						addr: e.target.dataset.addr,
						side: e.target.dataset.side,
						canal: parseInt(e.target.dataset.canal)
					};
					e.preventDefault();
				}
			});
			
			/* this.svg.addEventListener('mousemove', (e) => {
				if (!this.draggingSlider) return;
				
				// Calcular nova posició i voltatge
				const track = this.svg.querySelector('.ct-slider-track');
				const rect = track.getBoundingClientRect();
				const x = Math.max(rect.left, Math.min(e.clientX, rect.right));
				const percent = (x - rect.left) / rect.width;
				const voltage = percent * 10.0; // 0-10V
				
				// Actualitzar PLCMemory
				if (window.PLCMemory) {
					window.PLCMemory.writeAnalogChannel(
						this.draggingSlider.addr,
						this.draggingSlider.side,
						this.draggingSlider.canal,
						voltage
					);
				}
				
				e.preventDefault();
			}); */
			/* this.svg.addEventListener('mousemove', (e) => {
				if (!this.draggingSlider) return;
				
				const slider = this.draggingSlider;
				
				// Buscar el track específic d'aquest slider
				const track = this.svg.querySelector(
					`.ct-slider-track[data-addr="${slider.addr}"][data-side="${slider.side}"][data-canal="${slider.canal}"]`
				);
				
				if (!track) {
					console.warn('[Slider] Track no trobat');
					return;
				}
				
				const rect = track.getBoundingClientRect();
				const x = Math.max(rect.left, Math.min(e.clientX, rect.right));
				const percent = (x - rect.left) / rect.width;
				// ADC: Rang -10V a +10V (entrades analògiques)
				const voltage = Math.max(-10, Math.min(10, (percent * 20.0) - 10));
				
				console.log('[Slider] Escrivint:', slider.addr, slider.side, slider.canal, voltage); 
				
				// Actualitzar estat local
				const key = `${slider.addr}-${slider.side}`;
				if (!this.sliderVoltages[key]) {
					this.sliderVoltages[key] = new Array(4).fill(0);
				}
				this.sliderVoltages[key][slider.canal] = voltage;
				
				// Actualitzar PLCMemory
				if (window.PLCMemory) {
					window.PLCMemory.writeAnalogChannel(slider.addr, slider.side, slider.canal, voltage);
				}
				
				// Actualitzar visual
				this.updateSliderVisual(slider.addr, slider.side, slider.canal, voltage);
				
				e.preventDefault();
			}); */
			this.svg.addEventListener('mousemove', (e) => {
				if (!this.draggingSlider) return;
				
				const slider = this.draggingSlider;
				
				// Buscar el track específic
				const track = this.svg.querySelector(
					`.ct-slider-track[data-addr="${slider.addr}"][data-side="${slider.side}"][data-canal="${slider.canal}"]`
				);
				
				if (!track) return;
				
				const rect = track.getBoundingClientRect();
				const x = Math.max(rect.left, Math.min(e.clientX, rect.right));
				const percent = (x - rect.left) / rect.width;
				// ADC: Rang -10V a +10V (entrades analògiques)
				const voltage = Math.max(-10, Math.min(10, (percent * 20.0) - 10));
				
				// console.log('[Slider] Escrivint:', slider.addr, slider.side, slider.canal, voltage);
				
				// ✅ Escriure DIRECTAMENT a memory.in (com els switches)
				if (window.PLCMemory) {
					const mem = window.PLCMemory.analog.get(slider.addr);
					if (mem && mem[slider.side]) {
						// Escriure a .in (entrada)
						mem[slider.side].in[slider.canal] = voltage;
						
						// console.log('[Slider] Escrit a memory.in[' + slider.canal + ']:', voltage);
						
						// Emetre esdeveniment per notificar canvi
						if (window.EventBus) {
							window.EventBus.emit(window.EventBus.EVENTS.MEMORY_ANALOG_CHANGED, {
								addr: slider.addr,
								side: slider.side,
								channel: slider.canal,
								newValue: voltage
							});
						}
					}
				}
				
				// Actualitzar visual
				this.updateSliderVisual(slider.addr, slider.side, slider.canal, voltage);
				
				e.preventDefault();
			});
			
			this.svg.addEventListener('mouseup', () => {
				this.draggingSlider = null;
			});

        // Mouseup global per aturar drag
        document.addEventListener('mouseup', () => { this.draggingSlider = null; });
    }

    handleMouseMove(e) {
        this.handlePan(e);

        // Drag slider
        /* if (this.draggingSlider !== null) {
            this.handleSliderDrag(e);
        } */
    }

    // ─── ZOOM / PAN ────────────────────────────────────────────────────────────

    zoom(delta, mouseX, mouseY) {
        const oldScale = this.scale;
        this.scale *= (1 + delta * 0.1);
        this.scale = Math.max(0.1, Math.min(5.0, this.scale));

        const rect = this.wrapper.getBoundingClientRect();
        const offsetX = mouseX - rect.left;
        const offsetY = mouseY - rect.top;
        const scaleChange = this.scale / oldScale;

        this.translateX = offsetX - (offsetX - this.translateX) * scaleChange;
        this.translateY = offsetY - (offsetY - this.translateY) * scaleChange;
        this.applyTransform();
    }

    zoomIn() {
        const cx = this.wrapper.clientWidth / 2;
        const cy = this.wrapper.clientHeight / 2;
        this.zoom(1, cx, cy);
    }

    zoomOut() {
        const cx = this.wrapper.clientWidth / 2;
        const cy = this.wrapper.clientHeight / 2;
        this.zoom(-1, cx, cy);
    }

    startPan(e) {
        this.isPanning = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.wrapper.style.cursor = 'grabbing';
    }

    handlePan(e) {
        if (!this.isPanning) return;
        this.translateX += (e.clientX - this.lastX);
        this.translateY += (e.clientY - this.lastY);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.applyTransform();
    }

    stopPan() {
        this.isPanning = false;
        this.wrapper.style.cursor = 'grab';
    }

    resetView() {
        // Calcular bounding box del contingut SVG
        // El CAP està a translate(-400, 0) amb mida 800x600
        // Les costelles A estan a x = -910 (offset esquerre)
        // Les costelles B estan a x = 310 + 600 = 910 (offset dret)
        const H = window.CanvasHelpers;
        const config = this.vertebraeConfig || this._getDefaultConfig();
        const nVert = config.vertebrae ? config.vertebrae.length : 2;
        
        // Bounding box del contingut en coordenades SVG
        // Nota: viewBox comença a -1500, però les coordenades reals del contingut són:
        const contentLeft = -910;   // Costella A (esquerra)
        const contentRight = 910;   // Costella B (dreta) = 310 + 600
        const contentTop = 0;       // CAP
        const contentBottom = H.CAP_HEIGHT + H.VERTEBRA_SPACING + 
            nVert * (H.VERTEBRA_HEIGHT + H.VERTEBRA_SPACING);
        
        const contentWidth = contentRight - contentLeft;   // 1820
        const contentHeight = contentBottom - contentTop;
        
        // Mida disponible de la finestra
        const wrapperW = this.wrapper.clientWidth;
        const wrapperH = this.wrapper.clientHeight;
        
        if (wrapperW <= 0 || wrapperH <= 0) {
            // Fallback si la finestra no té mida encara
            this.scale = 0.35;
            this.translateX = 20;
            this.translateY = 10;
            this.applyTransform();
            return;
        }
        
        // Marge en píxels de pantalla
        const margin = 15;
        const availW = wrapperW - margin * 2;
        const availH = wrapperH - margin * 2;
        
        // Calcular escala per encabir tot el contingut
        // Les coordenades SVG van amb viewBox offset de -1500
        // Però el transform del SVG element aplica translate+scale
        // La posició en pantalla d'un punt SVG (svgX, svgY) és:
        //   screenX = translateX + (svgX + 1500) * scale  [1500 és l'offset del viewBox]
        const viewBoxOffsetX = 1500;
        
        const scaleX = availW / contentWidth;
        const scaleY = availH / contentHeight;
        this.scale = Math.min(scaleX, scaleY);
        
        // Posicionar perquè la cantonada superior-esquerra del contingut
        // quedi al marge (margin, margin) de la finestra
        // screenX = translateX + (contentLeft + viewBoxOffsetX) * scale = margin
        this.translateX = margin - (contentLeft + viewBoxOffsetX) * this.scale;
        this.translateY = margin - contentTop * this.scale;
        
        this.applyTransform();
    }

    applyTransform() {
        this.svg.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }

    // Coordenades pantalla → SVG
    screenToSVG(screenX, screenY) {
        const rect = this.wrapper.getBoundingClientRect();
        const x = (screenX - rect.left - this.translateX) / this.scale - 1500;
        const y = (screenY - rect.top - this.translateY) / this.scale;
        return { x, y };
    }

    // ─── HANDLERS INTERACCIÓ COMPONENTS ───────────────────────────────────────

    handleLEDClick(bit) {
        const mem = window.PLCMemory;
        if (!mem) return;
        const current = mem.readDigitalBit('0x0', 'a', bit);
        const newVal = current ? 0 : 1;
        mem.writeDigitalBit('0x0', 'a', bit, newVal);
    }

    /*handleSwitchClick(bit) {
        const mem = window.PLCMemory;
        if (!mem) return;
        const newVal = this.switchStates[bit] ? 0 : 1;
        this.switchStates[bit] = newVal;
        mem.writeDigitalBit('0x0', 'b', bit, newVal);
        this.updateSwitch(bit, newVal);
    }*/
    /*handleSwitchClick(addr, side, bit) {
        const key = `${addr}-${side}`;
        
        // Inicialitzar si no existeix
        if (!this.switchStates[key]) {
            this.switchStates[key] = new Array(8).fill(0);
        }
        
        // Toggle
        this.switchStates[key][bit] = this.switchStates[key][bit] ? 0 : 1;
        
        console.log(`[handleSwitchClick] ${addr}-${side}-${bit} = ${this.switchStates[key][bit]}`);

        // Actualitzar PLCMemory
        if (window.PLCMemory) {
			console.log('[handleSwitchClick] Cridant PLCMemory.writeDigitalBit...');
            window.PLCMemory.writeDigitalBit(addr, side, bit, this.switchStates[key][bit]);
            console.log('[handleSwitchClick] PLCMemory actualitzat');
        } else {
			console.error('[handleSwitchClick] PLCMemory no disponible!'); 
		}
        
        // Actualitzar UI
        this.updateSwitchUI(addr, side, bit);
    }*/
    handleSwitchClick(addr, side, bit) {
		const key = `${addr}-${side}`;
		
		if (!this.switchStates[key]) {
			this.switchStates[key] = new Array(8).fill(0);
		}
		
		this.switchStates[key][bit] = this.switchStates[key][bit] ? 0 : 1;
		
		console.log(`[handleSwitchClick] ${addr}-${side}-${bit} = ${this.switchStates[key][bit]}`);
		
		if (window.PLCMemory) {
			// ✅ Escriure directament a memory.b.in (o .a.in)
			const mem = window.PLCMemory.digital.get(addr);
			if (mem && mem[side]) {
				mem[side].in[0] = this.calculateByteFromBits(this.switchStates[key]);
				console.log('[handleSwitchClick] Escrit a memory.in:', mem[side].in[0]);
				
				// Emetre event per notificar canvi
				if (window.EventBus) {
					window.EventBus.emit(window.EventBus.EVENTS.MEMORY_DIGITAL_CHANGED, {
						addr: addr,
						side: side,
						bit: bit,
						newValue: this.switchStates[key][bit]
					});
				}
			}
		}
		
		this.updateSwitchUI(addr, side, bit);
	}

	/**
	 * Calcular byte des d'array de bits
	 */
	calculateByteFromBits(bitsArray) {
		let byte = 0;
		for (let i = 0; i < 8; i++) {
			if (bitsArray[i]) {
				byte |= (1 << i);
			}
		}
		return byte;
	}

    updateSwitchUI(addr, side, bit) {
        const key = `${addr}-${side}`;
        const state = this.switchStates[key]?.[bit] || 0;
        
        const switchId = window.CanvasHelpers.generateComponentId('switch', addr, side, bit);
        const toggleId = `${switchId}-toggle`;
        const stateId = `${switchId}-state`;
        
        const switchRect = this.svg.querySelector(`#${switchId}`);
        const switchToggle = this.svg.querySelector(`#${toggleId}`);
        const switchState = this.svg.querySelector(`#${stateId}`);
        
        if (switchRect && switchToggle && switchState) {
            const isLeftSide = (side === 'a');
            const toggleCxOn = isLeftSide ? 87 : 547;
            const toggleCxOff = isLeftSide ? 53 : 513;
            
            if (state) {
                switchRect.setAttribute('fill', '#2ecc71');
                switchToggle.setAttribute('cx', toggleCxOn);
            } else {
                switchRect.setAttribute('fill', '#95a5a6');
                switchToggle.setAttribute('cx', toggleCxOff);
            }
            switchState.textContent = state;
        }
    }
    

    /* handleSliderDrag(e) {
        const canal = this.draggingSlider;
        const coords = this.screenToSVG(e.clientX, e.clientY);

        const sliderStartX = 310 + 80;
        const relX = coords.x - sliderStartX;
        const percentage = Math.max(0, Math.min(1, relX / 200));

        const voltage = -10 + percentage * 20;
        const rounded = Math.round(voltage * 10) / 10;
        this.sliderVoltages[canal] = rounded;

        const mem = window.PLCMemory;
        if (mem) {
            mem.writeAnalogChannel('0x0', 'b', canal, rounded);
        }

        this.updateSliderVisual(canal, rounded);
    } */

    // ─── ACTUALITZAR VISUALS ──────────────────────────────────────────────────

    /*updateLED(bit, state) {
        const led = this.svg.querySelector(`#ct-led-${bit}`);
        if (!led) return;
        led.setAttribute('fill', state ? 'url(#ct-led-on)' : 'url(#ct-led-off)');
        led.style.filter = state ? 'drop-shadow(0 0 8px #ff0000)' : 'none';

        const stateText = this.svg.querySelector(`#ct-led-state-${bit}`);
        if (stateText) stateText.textContent = state ? '1' : '0';
    }*/
    updateLED(addr, side, bit, state) {
        const ledId = window.CanvasHelpers.generateComponentId('led', addr, side, bit);
        const stateId = `${ledId}-state`;
        
        const led = this.svg.querySelector(`#${ledId}`);
        const stateText = this.svg.querySelector(`#${stateId}`);
        
        if (led && stateText) {
            led.setAttribute('fill', state ? 'url(#ct-led-on)' : 'url(#ct-led-off)');
            led.removeAttribute('data-pwm'); // Restaurar a mode binari
            stateText.textContent = state;
        }
    }

    /**
     * Actualitzar LED amb intensitat PWM proporcional (0-255)
     * Interpola visualment entre apagat (#440000) i encès (#ff4444)
     */
    updateLEDPwm(addr, side, bit, pwmValue) {
        const ledId = window.CanvasHelpers.generateComponentId('led', addr, side, bit);
        const stateId = `${ledId}-state`;

        const led = this.svg.querySelector(`#${ledId}`);
        const stateText = this.svg.querySelector(`#${stateId}`);

        if (led) {
            const t = Math.max(0, Math.min(255, pwmValue)) / 255;
            // Interpolar entre apagat (68,0,0) i encès (255,68,68)
            const r = Math.round(68 + (255 - 68) * t);
            const g = Math.round(0 + 68 * t);
            const b = Math.round(0 + 68 * t);
            const color = `rgb(${r},${g},${b})`;
            led.setAttribute('fill', color);
            led.setAttribute('data-pwm', pwmValue);
            if (t > 0) {
                const glowAlpha = (0.2 + 0.8 * t).toFixed(2);
                led.style.filter = `drop-shadow(0 0 ${Math.round(4 + 8 * t)}px rgba(255,0,0,${glowAlpha}))`;
            } else {
                led.style.filter = 'none';
            }
        }
        if (stateText) {
            stateText.textContent = pwmValue;
        }
    }

    /* updateVoltageDisplay(addr, side, channel, voltage) {
        const displayId = window.CanvasHelpers.generateComponentId('vdisplay', addr, side, channel);
        const display = this.svg.querySelector(`#${displayId}`);
        
        if (display) {
            display.textContent = `${voltage.toFixed(1)}V`;
        }
    } */
    updateVoltageDisplay(addr, side, channel, voltage) {
		const displayId = window.CanvasHelpers.generateComponentId('vdisplay', addr, side, channel);
		const display = this.svg.querySelector(`#${displayId}`);
		
		if (display) {
			display.textContent = `${voltage.toFixed(1)}V`;
			console.log(`[updateVoltageDisplay] Actualitzat ${displayId} a ${voltage.toFixed(1)}V`); // ← AFEGIR LOG
		} else {
			console.warn(`[updateVoltageDisplay] Display no trobat: ${displayId}`);
		}
	}

    resetAllLEDs() {
        if (!this.vertebraeConfig) return;
        
        this.vertebraeConfig.vertebrae.forEach(v => {
            if (v.type === 'digital') {
                if (v.costellaA === 'output') {
                    for (let bit = 0; bit < 8; bit++) {
                        this.updateLED(v.addr, 'a', bit, 0);
                    }
                }
                if (v.costellaB === 'output') {
                    for (let bit = 0; bit < 8; bit++) {
                        this.updateLED(v.addr, 'b', bit, 0);
                    }
                }
            }
        });
    }

    resetAllDisplays() {
        if (!this.vertebraeConfig) return;
        
        this.vertebraeConfig.vertebrae.forEach(v => {
            if (v.type === 'analog') {
                if (v.costellaA === 'output') {
                    for (let ch = 0; ch < 4; ch++) {
                        this.updateVoltageDisplay(v.addr, 'a', ch, 0.0);
                    }
                }
                if (v.costellaB === 'output') {
                    for (let ch = 0; ch < 4; ch++) {
                        this.updateVoltageDisplay(v.addr, 'b', ch, 0.0);
                    }
                }
            }
        });
    }
    

    updateSwitch(bit, state) {
        const switchRect = this.svg.querySelector(`#ct-switch-${bit}`);
        const toggle = this.svg.querySelector(`#ct-switch-toggle-${bit}`);
        const stateText = this.svg.querySelector(`#ct-switch-state-${bit}`);
        if (!switchRect || !toggle) return;

        switchRect.setAttribute('fill', state ? '#2ecc71' : '#95a5a6');

        toggle.setAttribute('cx', state ? 487 : 453);

        if (stateText) stateText.textContent = state ? '1' : '0';
    }

    /* updateVoltageDisplay(canal, voltage) {
        const display = this.svg.querySelector(`#ct-vdisplay-${canal}`);
        if (display) display.textContent = `${voltage.toFixed(1)}V`;
    } */
    updateVoltageDisplay(addr, side, channel, voltage) {
		const displayId = window.CanvasHelpers.generateComponentId('vdisplay', addr, side, channel);
		// console.log('[updateVoltageDisplay] Buscant:', displayId); // ← AFEGIR
		
		const display = this.svg.querySelector(`#${displayId}`);
		// console.log('[updateVoltageDisplay] Display trobat?', !!display); // ← AFEGIR
		
		if (display) {
			// console.log('[updateVoltageDisplay] Text abans:', display.textContent); // ← AFEGIR
			display.textContent = `${voltage.toFixed(1)}V`;
			// console.log('[updateVoltageDisplay] Text després:', display.textContent); // ← AFEGIR
		} else {
			console.warn(`[updateVoltageDisplay] Display no trobat: ${displayId}`);
		}
	}

    /*updateSliderVisual(canal, voltage) {
        const percentage = (voltage + 10) / 20;
        const newCx = 80 + percentage * 200;

        const thumb = this.svg.querySelector(`#ct-slider-thumb-${canal}`);
        if (thumb) thumb.setAttribute('cx', newCx);

        const valueText = this.svg.querySelector(`#ct-slider-value-${canal}`);
        if (valueText) valueText.textContent = `${voltage.toFixed(1)}V`;
    }*/
    updateSliderVisual(addr, side, canal, voltage) {  // ✅ Rep addr, side, canal
		const thumbId = window.CanvasHelpers.generateComponentId('slider-thumb', addr, side, canal);
		const valueId = window.CanvasHelpers.generateComponentId('slider-value', addr, side, canal);
		
		const thumb = this.svg.querySelector(`#${thumbId}`);
		const valueText = this.svg.querySelector(`#${valueId}`);
		
		if (!thumb || !valueText) {
			console.warn(`[updateSliderVisual] Elements no trobats: ${addr}-${side}-${canal}`);
			return;
		}
		
		// Calcular posició X del thumb amb rang -10V a +10V
		// voltage: -10V → 0%, 0V → 50%, +10V → 100%
		const trackStartX = 200;
		const trackWidth = 200;
		const percentage = (voltage + 10) / 20;  // Normalitzar a 0-1
		const newX = trackStartX + percentage * trackWidth;
		
		thumb.setAttribute('cx', newX);
		valueText.textContent = `${voltage.toFixed(1)}V`;
	}

    // ─── SUBSCRIPCIÓ EVENTBUS ─────────────────────────────────────────────────

    /*subscribeEvents() {
        const EB = window.EventBus;
        if (!EB) return;

        this._onDigitalChanged = (data) => {
            const addr = (data.addr || '').toUpperCase();
            if (addr === '0X0' && data.costella === 'out') {
                for (let bit = 0; bit < 8; bit++) {
                    const val = (data.byte >> bit) & 1;
                    this.updateLED(bit, val);
                }
            }
            if (addr === '0X0' && data.costella === 'in') {
                for (let bit = 0; bit < 8; bit++) {
                    const val = (data.byte >> bit) & 1;
                    this.switchStates[bit] = val;
                    this.updateSwitch(bit, val);
                }
            }
        };*/

		subscribeEvents() {
			window.EventBus.on(window.EventBus.EVENTS.MEMORY_DIGITAL_CHANGED, (data) => {
				if (data.reset) {
					this.resetAllLEDs();
					return;
				}
				
				// Si és una entrada (isInput), actualitzar switch en lloc de LED
				if (data.isInput) {
					if (data.addr && data.side !== undefined && data.bit !== undefined) {
						// Actualitzar switchStates
						const key = `${data.addr}-${data.side}`;
						if (!this.switchStates[key]) {
							this.switchStates[key] = new Array(8).fill(0);
						}
						this.switchStates[key][data.bit] = data.newValue;
						
						// Actualitzar UI del switch
						this.updateSwitchUI(data.addr, data.side, data.bit);
					}
					return;
				}
				
				// Actualitzar LED(s) segons el tipus d'event (sortides)
				if (data.addr && data.side !== undefined) {
					if (data.bit !== undefined) {
						// Event de bit individual (doutbit)
						this.updateLED(data.addr, data.side, data.bit, data.newValue);
					} else if (data.newValue !== undefined) {
						// Event de byte complet (dout) - actualitzar tots els 8 bits
						const byteValue = data.newValue;
						for (let bit = 0; bit < 8; bit++) {
							const bitValue = (byteValue >> bit) & 1;
							this.updateLED(data.addr, data.side, bit, bitValue);
						}
					}
				}
			});

			// Listener per PWM: actualitza LEDs amb intensitat proporcional
			window.EventBus.on('costella:pwm:changed', (data) => {
				if (!data || !data.addr || data.side === undefined) return;
				if (data.bit !== undefined) {
					// doutbitpwm: un sol bit amb intensitat PWM
					this.updateLEDPwm(data.addr, data.side, data.bit, data.pwmValue);
				} else {
					// doutpwm: tots els 8 bits amb la mateixa intensitat PWM
					for (let bit = 0; bit < 8; bit++) {
						this.updateLEDPwm(data.addr, data.side, bit, data.pwmValue);
					}
				}
			});
			
			/* window.EventBus.on(window.EventBus.EVENTS.MEMORY_ANALOG_CHANGED, (data) => {
				if (data.reset) {
					this.resetAllDisplays();
					return;
				}
				
				// Actualitzar display específic amb addr i side
				if (data.addr && data.side !== undefined && data.channel !== undefined) {
					this.updateVoltageDisplay(data.addr, data.side, data.channel, data.newValue);
				}
			}); */
			window.EventBus.on(window.EventBus.EVENTS.MEMORY_ANALOG_CHANGED, (data) => {
				if (data.reset) {
					this.resetAllDisplays();
					return;
				}
				
				// Només actualitzar displays si el canvi és a una SORTIDA (.out)
				if (data.addr && data.side !== undefined && data.channel !== undefined) {
					// Verificar si aquest costat té displays (sortides)
					const config = this.vertebraeConfig;
					if (config) {
						const vertebra = config.vertebrae.find(v => 
							v.addr === data.addr && v.type === 'analog'
						);
						
						if (vertebra) {
							const costellaKey = data.side === 'a' ? 'costellaA' : 'costellaB';
							if (vertebra[costellaKey] === 'output') {
								// És una sortida, actualitzar display
								this.updateVoltageDisplay(data.addr, data.side, data.channel, data.newValue);
							} else {
								// És una entrada (slider), actualitzar slider visual
								this.updateSliderVisual(data.addr, data.side, data.channel, data.newValue);
							}
						}
					}
				}
			});
            this.startAnalogOutputPolling();
		}
        
        // ─── UTILITAT ─────────────────────────────────────────────────────────────

        /**
         * Polling periòdic per sincronitzar displays de sortida analògica
         * Soluciona desfasaments quan hi ha escriptures molt ràpides
         */
        startAnalogOutputPolling() {
            // Polling cada 100ms (10Hz) només per sortides analògiques
            if (this.analogPollInterval) {
                clearInterval(this.analogPollInterval);
            }
            
            this.analogPollInterval = setInterval(() => {
                if (!window.PLCMemory || !this.vertebraeConfig) return;
                
                this.vertebraeConfig.vertebrae.forEach(vertebra => {
                    if (vertebra.type !== 'analog') return;
                    
                    const addr = vertebra.addr;
                    const memory = window.PLCMemory.analog.get(addr);
                    if (!memory) return;
                    
                    // Sincronitzar sortides (displays)
                    if (vertebra.costellaA === 'output' && memory.a) {
                        for (let ch = 0; ch < 4; ch++) {
                            const value = memory.a.out[ch];
                            this.updateVoltageDisplay(addr, 'a', ch, value);
                        }
                    }
                    
                    if (vertebra.costellaB === 'output' && memory.b) {
                        for (let ch = 0; ch < 4; ch++) {
                            const value = memory.b.out[ch];
                            this.updateVoltageDisplay(addr, 'b', ch, value);
                        }
                    }
                });
            }, 100); // 100ms = 10Hz
        }

        // ─── CLEANUP ──────────────────────────────────────────────────────────────

        destroy() {
            const EB = window.EventBus;
            if (EB) {
                if (this._onDigitalChanged) EB.off(EB.EVENTS.MEMORY_DIGITAL_CHANGED, this._onDigitalChanged);
                if (this._onAnalogChanged) EB.off(EB.EVENTS.MEMORY_ANALOG_CHANGED, this._onAnalogChanged);
            }
            
            // Aturar polling
            if (this.analogPollInterval) {
                clearInterval(this.analogPollInterval);
            }
            
            if (this.wrapper && this.wrapper.parentNode) {
                this.wrapper.parentNode.removeChild(this.wrapper);
            }
        }

    // ─── UTILITAT ─────────────────────────────────────────────────────────────

    parseSVG(svgString) {
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tmp.innerHTML = svgString.trim();
        return tmp.firstElementChild;
    }
}

// Exportar global
if (typeof window !== 'undefined') {
    window.CanvasTwin = CanvasTwin;
}

console.log('✓ CanvasTwin loaded');

