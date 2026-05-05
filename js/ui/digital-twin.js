/**
 * DigitalTwin - Bessó Digital de IoT-Vertebrae
 * 
 * Visualitza l'estat d'una vèrtebra:
 * - 8 LEDs digitals sortida (costella A)
 * - 8 LEDs digitals sortida (costella B)
 * - 2 canals DAC (sortida analògica)
 * - 2 canals ADC (entrada analògica) amb controls
 */

class DigitalTwin {
    constructor(container, addr = '0x0') {
        this.container = container;
        this.addr = addr;
        this.element = null;
        
        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
        this.update();
    }

    createElement() {
        const twin = document.createElement('div');
        twin.className = 'digital-twin';
        twin.innerHTML = `
            <div class="twin-header">
                <h3>🔌 Vèrtebra ${this.addr}</h3>
                <div class="twin-status">
                    <span class="status-dot"></span>
                    <span class="status-text">Simulador</span>
                </div>
            </div>
            
            <!-- Sortides Digitals (DO) -->
            <div class="twin-section">
                <h4>💡 Sortides Digitals (DO)</h4>
                
                <div class="digital-group">
                    <div class="group-label">Costella A</div>
                    <div class="leds-container" id="leds-out-a-${this.addr}">
                        ${this.createLEDs('a', 'out')}
                    </div>
                </div>
                
                <div class="digital-group">
                    <div class="group-label">Costella B</div>
                    <div class="leds-container" id="leds-out-b-${this.addr}">
                        ${this.createLEDs('b', 'out')}
                    </div>
                </div>
            </div>
            
            <!-- Entrades Digitals (DI) -->
            <div class="twin-section">
                <h4>🔘 Entrades Digitals (DI)</h4>
                
                <div class="digital-group">
                    <div class="group-label">Costella A</div>
                    <div class="leds-container" id="leds-in-a-${this.addr}">
                        ${this.createLEDs('a', 'in')}
                    </div>
                </div>
                
                <div class="digital-group">
                    <div class="group-label">Costella B</div>
                    <div class="leds-container" id="leds-in-b-${this.addr}">
                        ${this.createLEDs('b', 'in')}
                    </div>
                </div>
            </div>
            
            <!-- Sortides Analògiques (DAC) -->
            <div class="twin-section">
                <h4>📊 Sortides Analògiques (DAC)</h4>
                <div class="analog-container">
                    ${this.createDAC(1)}
                    ${this.createDAC(2)}
                </div>
            </div>
            
            <!-- Entrades Analògiques (ADC) -->
            <div class="twin-section">
                <h4>📈 Entrades Analògiques (ADC)</h4>
                <div class="analog-container">
                    ${this.createADC(1)}
                    ${this.createADC(2)}
                </div>
            </div>
        `;
        
        this.container.appendChild(twin);
        this.element = twin;
    }

    createLEDs(side, type = 'out') {
        let html = '';
        for (let i = 0; i < 8; i++) {
            html += `
                <div class="led" data-side="${side}" data-bit="${i}" data-type="${type}">
                    <div class="led-light"></div>
                    <div class="led-label">${i}</div>
                </div>
            `;
        }
        return html;
    }

    createDAC(channel) {
        return `
            <div class="analog-channel dac" data-channel="${channel}">
                <div class="channel-header">
                    <span class="channel-label">DAC ${channel}</span>
                    <span class="channel-value" id="dac-${channel}-${this.addr}">0.00 V</span>
                </div>
                <div class="analog-bar">
                    <div class="analog-fill" id="dac-${channel}-bar-${this.addr}" style="width: 0%"></div>
                </div>
                <div class="analog-range">0V ← → 10V</div>
            </div>
        `;
    }

    createADC(channel) {
        return `
            <div class="analog-channel adc" data-channel="${channel}">
                <div class="channel-header">
                    <span class="channel-label">ADC ${channel}</span>
                    <span class="channel-value" id="adc-${channel}-${this.addr}">0.00 V</span>
                </div>
                <div class="adc-control">
                    <input type="range" 
                           class="adc-slider" 
                           id="adc-${channel}-slider-${this.addr}"
                           min="-10" 
                           max="10" 
                           step="0.1" 
                           value="0">
                    <button class="adc-reset" data-channel="${channel}">Reset</button>
                </div>
                <div class="analog-bar">
                    <div class="analog-fill" id="adc-${channel}-bar-${this.addr}" style="width: 50%"></div>
                </div>
                <div class="analog-range">-10V ← 0V → +10V</div>
            </div>
        `;
    }

    setupEventListeners() {
        // Escoltar canvis de PLCMemory
        if (window.EventBus) {
            console.log('[DigitalTwin] Subscrivint-se a esdeveniments...');
            
            // Canvis digitals
            window.EventBus.on(window.EventBus.EVENTS.MEMORY_DIGITAL_CHANGED, (data) => {
                console.log('[DigitalTwin] MEMORY_DIGITAL_CHANGED rebut:', data);
                // Comparar normalitzat (case-insensitive)
                if (!data.addr || data.addr.toUpperCase() === this.addr.toUpperCase()) {
                    console.log('[DigitalTwin] Actualitzant LEDs...');
                    this.updateDigitalOutputs('a');
                    this.updateDigitalOutputs('b');
                    this.updateDigitalInputs('a');
                    this.updateDigitalInputs('b');
                }
            });
            
            // Canvis analògics
            window.EventBus.on(window.EventBus.EVENTS.MEMORY_ANALOG_CHANGED, (data) => {
                console.log('[DigitalTwin] MEMORY_ANALOG_CHANGED rebut:', data);
                // Comparar normalitzat (case-insensitive)
                if (!data.addr || data.addr.toUpperCase() === this.addr.toUpperCase()) {
                    console.log('[DigitalTwin] Actualitzant DAC/ADC...');
                    this.updateDAC(1);
                    this.updateDAC(2);
                    this.updateADCDisplay(1);
                    this.updateADCDisplay(2);
                }
            });
            
            console.log('[DigitalTwin] Subscripcions completades');
        } else {
            console.warn('[DigitalTwin] EventBus no disponible!');
        }

        // Controls ADC (sliders)
        const sliders = this.element.querySelectorAll('.adc-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const channel = parseInt(e.target.id.match(/adc-(\d+)/)[1]);
                const voltage = parseFloat(e.target.value);
                this.setADCVoltage(channel, voltage);
            });
        });

        // Botons reset ADC
        const resetButtons = this.element.querySelectorAll('.adc-reset');
        resetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const channel = parseInt(e.target.dataset.channel);
                this.resetADC(channel);
            });
        });
    }

    /**
     * Actualitzar visualització des de PLCMemory
     */
    update() {
        if (!window.PLCMemory) return;

        // Actualitzar LEDs digitals (sortides)
        this.updateDigitalOutputs('a');
        this.updateDigitalOutputs('b');
        
        // Actualitzar LEDs digitals (entrades)
        this.updateDigitalInputs('a');
        this.updateDigitalInputs('b');

        // Actualitzar DAC
        this.updateDAC(1);
        this.updateDAC(2);

        // Actualitzar visualització ADC (no el valor, només la barra)
        this.updateADCDisplay(1);
        this.updateADCDisplay(2);
    }

    updateDigitalOutputs(side) {
        const value = window.iotv.dout(this.addr, side);
        const leds = this.element.querySelectorAll(`.led[data-side="${side}"][data-type="out"]`);
        
        leds.forEach((led, index) => {
            const bitValue = (value >> index) & 1;
            const light = led.querySelector('.led-light');
            
            if (bitValue) {
                light.classList.add('on');
            } else {
                light.classList.remove('on');
            }
        });
    }

    updateDigitalInputs(side) {
        const value = window.iotv.din(this.addr, side);
        if (value === null) return;
        
        const byteValue = parseInt(value, 2);
        const leds = this.element.querySelectorAll(`.led[data-side="${side}"][data-type="in"]`);
        
        leds.forEach((led, index) => {
            const bitValue = (byteValue >> index) & 1;
            const light = led.querySelector('.led-light');
            
            if (bitValue) {
                light.classList.add('on');
            } else {
                light.classList.remove('on');
            }
        });
    }

    updateDAC(channel) {
        console.log(`[DigitalTwin] updateDAC(${channel}) - addr: ${this.addr}`);
        
        // Llegir voltatge directament de PLCMemory
        let voltage = 0;
        if (window.PLCMemory) {
            const vertebra = window.PLCMemory.analog.get(this.addr.toUpperCase());
            console.log(`[DigitalTwin] Vèrtebra analògica:`, vertebra);
            
            if (vertebra && vertebra.out) {
                voltage = vertebra.out[channel - 1] || 0;  // channel 1-2 → index 0-1
                console.log(`[DigitalTwin] DAC ${channel} voltatge: ${voltage}V`);
            } else {
                console.warn(`[DigitalTwin] No s'ha trobat vertebra.out per canal ${channel}`);
            }
        }
        
        // Actualitzar text
        const valueElement = this.element.querySelector(`#dac-${channel}-${this.addr}`);
        if (valueElement) {
            valueElement.textContent = voltage.toFixed(2) + ' V';
            console.log(`[DigitalTwin] Text actualitzat: ${voltage.toFixed(2)}V`);
        }
        
        // Actualitzar barra (0V a 10V = 0% a 100%)
        const barElement = this.element.querySelector(`#dac-${channel}-bar-${this.addr}`);
        if (barElement) {
            const percentage = (voltage / 10) * 100;  // 0-10V → 0-100%
            barElement.style.width = percentage + '%';
            console.log(`[DigitalTwin] Barra DAC ${channel}: ${percentage}%`);
            
            // Color verd sempre (DAC només positiu)
            barElement.style.background = '#2ecc71';
        } else {
            console.warn(`[DigitalTwin] No s'ha trobat element barra #dac-${channel}-bar-${this.addr}`);
        }
    }

    updateADCDisplay(channel) {
        // Llegir voltatge directament de PLCMemory
        let voltage = 0;
        if (window.PLCMemory) {
            const vertebra = window.PLCMemory.analog.get(this.addr.toUpperCase());
            if (vertebra && vertebra.in) {
                voltage = vertebra.in[channel - 1] || 0;  // channel 1-2 → index 0-1
            }
        }
        
        // Actualitzar només la barra (el slider ja té el valor)
        const barElement = this.element.querySelector(`#adc-${channel}-bar-${this.addr}`);
        if (barElement) {
            const percentage = ((voltage + 10) / 20) * 100;
            barElement.style.width = percentage + '%';
            
            if (voltage > 0) {
                barElement.style.background = '#3498db'; // Blau positiu
            } else if (voltage < 0) {
                barElement.style.background = '#e67e22'; // Taronja negatiu
            } else {
                barElement.style.background = '#95a5a6'; // Gris zero
            }
        }
    }

    /**
     * Establir voltatge ADC des del slider
     */
    setADCVoltage(channel, voltage) {
        // Escriure directament a PLCMemory
        if (window.PLCMemory) {
            const vertebra = window.PLCMemory.analog.get(this.addr.toUpperCase());
            if (vertebra && vertebra.in) {
                // Limitar a -10V +10V
                const limitedVoltage = Math.max(-10, Math.min(10, voltage));
                vertebra.in[channel - 1] = Math.round(limitedVoltage * 100) / 100;
            }
        }
        
        // Actualitzar visualització
        const valueElement = this.element.querySelector(`#adc-${channel}-${this.addr}`);
        if (valueElement) {
            valueElement.textContent = voltage.toFixed(2) + ' V';
        }
        
        this.updateADCDisplay(channel);
    }

    /**
     * Reset ADC a 0V
     */
    resetADC(channel) {
        const slider = this.element.querySelector(`#adc-${channel}-slider-${this.addr}`);
        if (slider) {
            slider.value = 0;
            this.setADCVoltage(channel, 0);
        }
    }

    /**
     * Destruir component
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Exportar globalment
if (typeof window !== 'undefined') {
    window.DigitalTwinClass = DigitalTwin;
}

console.log('✓ DigitalTwin loaded');
