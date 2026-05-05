/**
 * PLCMemory v2 - Sistema de memòria tipus PLC amb suport per costats A i B
 * 
 * CANVI PRINCIPAL: Cada vèrtebra té dos costats independents (A i B)
 * - Vèrtebres digitals: { a: {out, in}, b: {out, in} }
 * - Vèrtebres analògiques: { a: {out, in}, b: {out, in} }
 * 
 * Compatible amb API Python existent:
 * - dout/doutbit → escriu a memory[side].out
 * - din/dinbit → llegeix de memory[side].in
 * - aout → escriu a memory[side].out
 * - ain → llegeix de memory[side].in
 */

class PLCMemory {
    constructor() {
        // Maps d'adreces → memòria amb costats A i B
        // digital[addr] = { a: {out: Uint8Array(1), in: Uint8Array(1)}, b: {...} }
        this.digital = new Map();
        
        // analog[addr] = { a: {out: Float32Array(4), in: Float32Array(4)}, b: {...} }
        this.analog = new Map();
        
        // Històric de canvis (per debugging)
        this.history = [];
        this.maxHistorySize = 100;
        
        // Configuració
        this.enableHistory = false;
        this.enableAutoNotify = true;
    }

    // ============================================
    // GESTIÓ DE VÈRTEBRES
    // ============================================

    /**
     * Afegir vèrtebra digital amb dos costats (A i B)
     * @param {string} addr - Adreça hexadecimal '0x0' a '0xF' o binària '0000' a '1111'
     * @returns {boolean} True si s'ha afegit, false si ja existia
     */
    addDigitalVertebra(addr) {
        const normalizedAddr = this._normalizeAddress(addr);
        
        if (this.digital.has(normalizedAddr)) {
            return false;
        }

        // Crear estructura amb dos costats independents
        this.digital.set(normalizedAddr, {
            a: {
                out: new Uint8Array(1),  // 8 bits sortida costat A
                in: new Uint8Array(1)    // 8 bits entrada costat A
            },
            b: {
                out: new Uint8Array(1),  // 8 bits sortida costat B
                in: new Uint8Array(1)    // 8 bits entrada costat B
            }
        });

        if (this.enableAutoNotify && window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.VERTEBRA_ADDED, {
                type: 'digital',
                addr: normalizedAddr
            });
        }

        this._addToHistory('vertebra_added', { type: 'digital', addr: normalizedAddr });
        return true;
    }

    /**
     * Afegir vèrtebra analògica amb dos costats (A i B)
     * @param {string} addr - Adreça hexadecimal '0x0' a '0xF' o binària '0000' a '1111'
     * @returns {boolean} True si s'ha afegit, false si ja existia
     */
    addAnalogVertebra(addr) {
        const normalizedAddr = this._normalizeAddress(addr);
        
        if (this.analog.has(normalizedAddr)) {
            return false;
        }

        // Crear estructura amb dos costats independents
        this.analog.set(normalizedAddr, {
            a: {
                out: new Float32Array(4),  // 4 canals sortida costat A (0-10V)
                in: new Float32Array(4)    // 4 canals entrada costat A (-10V a +10V)
            },
            b: {
                out: new Float32Array(4),  // 4 canals sortida costat B (0-10V)
                in: new Float32Array(4)    // 4 canals entrada costat B (-10V a +10V)
            }
        });

        if (this.enableAutoNotify && window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.VERTEBRA_ADDED, {
                type: 'analog',
                addr: normalizedAddr
            });
        }

        this._addToHistory('vertebra_added', { type: 'analog', addr: normalizedAddr });
        return true;
    }

    /**
     * Eliminar vèrtebra
     */
    removeVertebra(type, addr) {
        const normalizedAddr = this._normalizeAddress(addr);
        const map = type === 'digital' ? this.digital : this.analog;
        
        if (map.delete(normalizedAddr)) {
            if (this.enableAutoNotify && window.EventBus) {
                window.EventBus.emit(window.EventBus.EVENTS.VERTEBRA_REMOVED, {
                    type,
                    addr: normalizedAddr
                });
            }
            
            this._addToHistory('vertebra_removed', { type, addr: normalizedAddr });
            return true;
        }
        
        return false;
    }

    /**
     * Comprovar si existeix una vèrtebra
     */
    hasVertebra(type, addr) {
        const normalizedAddr = this._normalizeAddress(addr);
        const map = type === 'digital' ? this.digital : this.analog;
        return map.has(normalizedAddr);
    }

    /**
     * Obtenir llista d'adreces actives
     */
    getActiveAddresses(type) {
        const map = type === 'digital' ? this.digital : this.analog;
        return Array.from(map.keys()).sort();
    }

    // ============================================
    // OPERACIONS DIGITALS - NIVELL BIT
    // ============================================

    /**
     * Escriure bit individual a sortida digital
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @param {number} bit - Bit 0-7
     * @param {number} value - 0 o 1
     */
    writeDigitalBit(addr, costella, bit, value) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.digital.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Digital vertebra ${normalizedAddr} not found`);
            return false;
        }

        // Determinar costat (a o b)
        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return false;
        }

        // Escriure sempre a .out (perquè és dout/doutbit)
        const oldValue = memory[side].out[0];
        
        if (value) {
            memory[side].out[0] |= (1 << bit);
        } else {
            memory[side].out[0] &= ~(1 << bit);
        }

        const newValue = memory[side].out[0];

        // Notificar canvi si ha canviat
        if (oldValue !== newValue && this.enableAutoNotify && window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.MEMORY_DIGITAL_CHANGED, {
                addr: normalizedAddr,
                side: side,
                bit: bit,
                oldValue: (oldValue >> bit) & 1,
                newValue: (newValue >> bit) & 1,
                byte: newValue
            });
        }

        this._addToHistory('digital_bit_write', {
            addr: normalizedAddr,
            side: side,
            bit: bit,
            value: value
        });

        return true;
    }
    
	/**
	 * Escriure bit individual digital d'ENTRADA (per bessons físics que simulen sensors)
	 */
	writeDigitalInputBit(addr, costella, bit, value) {
	    const normalizedAddr = this._normalizeAddress(addr);
	    const memory = this.digital.get(normalizedAddr);
	    
	    if (!memory) {
		console.warn(`[PLCMemory] Digital vertebra ${normalizedAddr} not found`);
		return false;
	    }

	    // Determinar costat (a o b)
	    const side = costella.toLowerCase();
	    if (!memory[side]) {
		console.warn(`[PLCMemory] Invalid side: ${costella}`);
		return false;
	    }

	    // Escriure a .in (perquè és una entrada DI des del punt de vista de l'IoT)
	    const oldValue = memory[side].in[0];
	    
	    if (value) {
		memory[side].in[0] |= (1 << bit);
	    } else {
		memory[side].in[0] &= ~(1 << bit);
	    }

	    const newValue = memory[side].in[0];

	    // Notificar canvi si ha canviat
	    if (oldValue !== newValue && this.enableAutoNotify && window.EventBus) {
		window.EventBus.emit(window.EventBus.EVENTS.MEMORY_DIGITAL_CHANGED, {
		    addr: normalizedAddr,
		    side: side,
		    bit: bit,
		    oldValue: (oldValue >> bit) & 1,
		    newValue: (newValue >> bit) & 1,
		    isInput: true
		});
	    }

	    return true;
	}    

    /**
     * Escriure canal analògic d'ENTRADA (per bessons que simulen sensors analògics)
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @param {number} channel - Canal 0-3
     * @param {number} voltage - Voltatge (-10V a +10V)
     */
    writeAnalogInputChannel(addr, costella, channel, voltage) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.analog.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Analog vertebra ${normalizedAddr} not found`);
            return false;
        }

        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return false;
        }

        if (channel < 0 || channel > 3) {
            console.warn(`[PLCMemory] Invalid channel: ${channel} (0-3)`);
            return false;
        }

        const oldValue = memory[side].in[channel];
        memory[side].in[channel] = Math.round(voltage * 100) / 100;
        const newValue = memory[side].in[channel];

        if (oldValue !== newValue && this.enableAutoNotify && window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.MEMORY_ANALOG_CHANGED, {
                addr: normalizedAddr,
                side: side,
                channel: channel,
                oldValue: oldValue,
                newValue: newValue,
                isInput: true
            });
        }

        return true;
    }

    /**
     * Llegir bit individual d'entrada digital
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @param {number} bit - Bit 0-7
     * @returns {number} 0 o 1
     */
    readDigitalBit(addr, costella, bit) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.digital.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Digital vertebra ${normalizedAddr} not found`);
            return 0;
        }

        // Determinar costat (a o b)
        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return 0;
        }

        // Llegir sempre de .in (perquè és din/dinbit)
        const byteValue = memory[side].in[0];
        return (byteValue >> bit) & 1;
    }

    // ============================================
    // OPERACIONS DIGITALS - NIVELL BYTE
    // ============================================

    /**
     * Escriure byte complet a sortida digital
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @param {number} value - Valor 0-255
     */
    writeDigitalByte(addr, costella, value) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.digital.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Digital vertebra ${normalizedAddr} not found`);
            return false;
        }

        // Determinar costat (a o b)
        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return false;
        }

        // Escriure sempre a .out
        const oldValue = memory[side].out[0];
        memory[side].out[0] = value & 0xFF;
        const newValue = memory[side].out[0];

        // Notificar canvi si ha canviat
        if (oldValue !== newValue && this.enableAutoNotify && window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.MEMORY_DIGITAL_CHANGED, {
                addr: normalizedAddr,
                side: side,
                oldValue: oldValue,
                newValue: newValue
            });
        }

        this._addToHistory('digital_byte_write', {
            addr: normalizedAddr,
            side: side,
            value: value
        });

        return true;
    }

    /**
     * Llegir byte complet d'entrada digital
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @returns {number} Valor 0-255
     */
    readDigitalByte(addr, costella) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.digital.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Digital vertebra ${normalizedAddr} not found`);
            return 0;
        }

        // Determinar costat (a o b)
        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return 0;
        }

        // Llegir sempre de .in
        return memory[side].in[0];
    }

    // ============================================
    // OPERACIONS ANALÒGIQUES
    // ============================================

    /**
     * Escriure canal analògic de sortida
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @param {number} channel - Canal 0-3
     * @param {number} voltage - Voltatge (0-10V per sortides)
     */
    writeAnalogChannel(addr, costella, channel, voltage) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.analog.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Analog vertebra ${normalizedAddr} not found`);
            return false;
        }

        // Determinar costat (a o b)
        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return false;
        }

        if (channel < 0 || channel > 3) {
            console.warn(`[PLCMemory] Invalid channel: ${channel} (0-3)`);
            return false;
        }

        // Escriure sempre a .out
        const oldValue = memory[side].out[channel];
        memory[side].out[channel] = Math.round(voltage * 100) / 100; // 2 decimals
        const newValue = memory[side].out[channel];

        // console.log('[PLCMemory] 📝 writeAnalogChannel:', {
        //     addr: normalizedAddr,
        //     side: side,
        //     channel: channel,
        //     oldValue: oldValue,
        //     newValue: newValue,
        //     changed: oldValue !== newValue,
        //     enableAutoNotify: this.enableAutoNotify,
        //     hasEventBus: !!window.EventBus
        // });

        // Notificar canvi si ha canviat
        if (oldValue !== newValue && this.enableAutoNotify && window.EventBus) {
            // console.log('[PLCMemory] 🔊 Emetent event MEMORY_ANALOG_CHANGED');
            window.EventBus.emit(window.EventBus.EVENTS.MEMORY_ANALOG_CHANGED, {
                addr: normalizedAddr,
                side: side,
                channel: channel,
                oldValue: oldValue,
                newValue: newValue
            });
        } // else {
        //     console.log('[PLCMemory] ❌ NO s\'emet event perquè:', {
        //         valueChanged: oldValue !== newValue,
        //         autoNotify: this.enableAutoNotify,
        //         eventBus: !!window.EventBus
        //     });
        // }

        this._addToHistory('analog_write', {
            addr: normalizedAddr,
            side: side,
            channel: channel,
            voltage: voltage
        });

        return true;
    }

    /**
     * Llegir canal analògic d'entrada
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @param {number} channel - Canal 0-3
     * @returns {number} Voltatge (-10V a +10V per entrades)
     */
    readAnalogChannel(addr, costella, channel) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.analog.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Analog vertebra ${normalizedAddr} not found`);
            return 0.0;
        }

        // Determinar costat (a o b)
        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return 0.0;
        }

        if (channel < 0 || channel > 3) {
            console.warn(`[PLCMemory] Invalid channel: ${channel} (0-3)`);
            return 0.0;
        }

        // Llegir de .in (entrades analògiques dels sensors/sliders)
        return memory[side].in[channel];
    }

    /**
     * Llegir tots els canals d'una costella analògica (batch)
     * @param {string} addr - Adreça vèrtebra
     * @param {string} costella - 'a' o 'b'
     * @returns {Object} {ch1: 2.5, ch2: 0.0, ch3: 7.3, ch4: -5.2}
     */
    readAnalogBatch(addr, costella) {
        const normalizedAddr = this._normalizeAddress(addr);
        const memory = this.analog.get(normalizedAddr);
        
        if (!memory) {
            console.warn(`[PLCMemory] Analog vertebra ${normalizedAddr} not found`);
            return null;
        }

        // Determinar costat (a o b)
        const side = costella.toLowerCase();
        if (!memory[side]) {
            console.warn(`[PLCMemory] Invalid side: ${costella}`);
            return null;
        }
        
        return {
            ch1: memory[side].in[0],
            ch2: memory[side].in[1],
            ch3: memory[side].in[2],
            ch4: memory[side].in[3]
        };
    }

    // ============================================
    // UTILITATS
    // ============================================

    /**
     * Normalitzar adreça a format estàndard '0x0' a '0xf' (minúscules)
     */
    _normalizeAddress(addr) {
        if (typeof addr === 'number') {
            return `0x${addr.toString(16)}`;
        }
        
        const str = addr.toString();
        
        // Si és binari '0000' a '1111'
        if (/^[01]{4}$/.test(str)) {
            const num = parseInt(str, 2);
            return `0x${num.toString(16)}`;
        }
        
        // Si és hexadecimal '0x0' a '0xF' o '0X0' a '0XF'
        if (/^0[xX][0-9A-Fa-f]$/.test(str)) {
            return str.toLowerCase();
        }
        
        // Si és només un dígit hex '0' a 'F'
        if (/^[0-9A-Fa-f]$/.test(str)) {
            return `0x${str.toLowerCase()}`;
        }
        
        console.warn(`[PLCMemory] Invalid address format: ${addr}`);
        return '0x0';
    }

    /**
     * Afegir a històric
     */
    _addToHistory(action, data) {
        if (!this.enableHistory) return;

        this.history.push({
            timestamp: Date.now(),
            action,
            data
        });

        // Limitar mida de l'històric
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Obtenir estadístiques de memòria
     */
    getStats() {
        return {
            digitalVertebrae: this.digital.size,
            analogVertebrae: this.analog.size,
            totalVertebrae: this.digital.size + this.analog.size,
            historySize: this.history.length
        };
    }

    /**
     * Reset complet de la memòria
     */
    reset() {
        this.digital.clear();
        this.analog.clear();
        this.history = [];
        
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.MEMORY_DIGITAL_CHANGED, { reset: true });
            window.EventBus.emit(window.EventBus.EVENTS.MEMORY_ANALOG_CHANGED, { reset: true });
        }
    }

    /**
     * Exportar estat complet de la memòria
     */
    export() {
        const data = {
            digital: {},
            analog: {}
        };

        // Exportar digitals
        for (const [addr, memory] of this.digital.entries()) {
            data.digital[addr] = {
                a: { out: memory.a.out[0], in: memory.a.in[0] },
                b: { out: memory.b.out[0], in: memory.b.in[0] }
            };
        }

        // Exportar analògics
        for (const [addr, memory] of this.analog.entries()) {
            data.analog[addr] = {
                a: {
                    out: Array.from(memory.a.out),
                    in: Array.from(memory.a.in)
                },
                b: {
                    out: Array.from(memory.b.out),
                    in: Array.from(memory.b.in)
                }
            };
        }

        return data;
    }

    /**
     * Importar estat complet
     */
    import(data) {
        this.reset();

        // Importar digitals
        if (data.digital) {
            for (const [addr, values] of Object.entries(data.digital)) {
                this.addDigitalVertebra(addr);
                const memory = this.digital.get(this._normalizeAddress(addr));
                if (memory) {
                    memory.a.out[0] = values.a?.out || 0;
                    memory.a.in[0] = values.a?.in || 0;
                    memory.b.out[0] = values.b?.out || 0;
                    memory.b.in[0] = values.b?.in || 0;
                }
            }
        }

        // Importar analògics
        if (data.analog) {
            for (const [addr, values] of Object.entries(data.analog)) {
                this.addAnalogVertebra(addr);
                const memory = this.analog.get(this._normalizeAddress(addr));
                if (memory) {
                    memory.a.out.set(values.a?.out || [0, 0, 0, 0]);
                    memory.a.in.set(values.a?.in || [0, 0, 0, 0]);
                    memory.b.out.set(values.b?.out || [0, 0, 0, 0]);
                    memory.b.in.set(values.b?.in || [0, 0, 0, 0]);
                }
            }
        }
    }

    /**
     * Reinicialitzar PLCMemory amb nova configuració de vèrtebres
     * @param {Object} config - Configuració VertebraeConfig amb array de vertebrae
     */
    reinitialize(config) {
        if (!config || !config.vertebrae) {
            console.warn('[PLCMemory] Configuració invàlida per reinitialize');
            return false;
        }
        
        console.log('[PLCMemory] Reinicialitzant amb nova configuració:', config.name || 'custom');
        
        // Reset complet
        this.reset();
        
        // Afegir cada vèrtebra de la configuració
        config.vertebrae.forEach(v => {
            if (v.type === 'digital') {
                this.addDigitalVertebra(v.addr);
            } else if (v.type === 'analog') {
                this.addAnalogVertebra(v.addr);
            }
        });
        
        console.log('[PLCMemory] Reinicialitzat:', {
            digital: this.digital.size,
            analog: this.analog.size
        });
        
        return true;
    }
}

// Crear instància global singleton
const plcMemory = new PLCMemory();

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.PLCMemory = plcMemory;
}

console.log('✓ PLCMemory v2 loaded (with A/B sides support)');
