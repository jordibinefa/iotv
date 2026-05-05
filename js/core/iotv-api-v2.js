/**
 * IOTV API v2 - Compatible amb PLCMemory
 * 
 * API compatible amb la versió Python de IoT-Vertebrae
 * Ara utilitza PLCMemory per gestionar l'estat
 * Manté compatibilitat amb codi existent
 */

const iotv = {
    // Versió de l'API
    version: '2.0.0',

    // ============================================
    // VERSIONS DE VÈRTEBRES
    // ============================================

    /**
     * Obtenir versió de vèrtebra analògica
     */
    aversion(addr) {
        if (!window.PLCMemory.hasVertebra('analog', addr)) {
            console.warn(`[iotv] Analog vertebra ${addr} not found`);
            return null;
        }
        // Versió 1.0 per a vèrtebres analògiques
        return '0000000100000000';
    },

    /**
     * Obtenir versió de vèrtebra digital
     */
    dversion(addr) {
        if (!window.PLCMemory.hasVertebra('digital', addr)) {
            console.warn(`[iotv] Digital vertebra ${addr} not found`);
            return null;
        }
        // Versió 1.2 per a vèrtebres digitals
        return '0000000100000010';
    },

    // ============================================
    // CONFIGURACIÓ DE VÈRTEBRES
    // ============================================

    /**
     * Obtenir configuració digital (no implementat en PLCMemory)
     * Retorna configuració per defecte: A=output, B=input
     */
    getdsetup(addr) {
        if (!window.PLCMemory.hasVertebra('digital', addr)) {
            return null;
        }
        // 00010010 = A output (bit 4), B input (bit 1)
        return '00010010';
    },

    /**
     * Obtenir configuració analògica (no implementat en PLCMemory)
     * Retorna configuració per defecte: A=DAC, B=ADC
     */
    getasetup(addr) {
        if (!window.PLCMemory.hasVertebra('analog', addr)) {
            return null;
        }
        // 00010001 = A DAC (bit 0), B ADC (bit 4)
        return '00010001';
    },

    /**
     * Configurar costelles digitals (simplificat)
     * En aquesta versió no canvia la configuració, només comprova compatibilitat
     */
    dsetup(addr, sideA, sideB) {
        if (!window.PLCMemory.hasVertebra('digital', addr)) {
            console.warn(`[iotv] Digital vertebra ${addr} not found`);
            return false;
        }

        // Validar modes (només acceptem out/in per ara)
        const validModes = ['aout', 'ain', 'bout', 'bin', 'aoutpwm', 'boutpwm'];
        if (!validModes.includes(sideA) || !validModes.includes(sideB)) {
            console.warn('[iotv] Invalid mode. Use: aout, ain, bout, bin, aoutpwm, boutpwm');
            return false;
        }

        // En v2, la configuració és fixa però acceptem la crida per compatibilitat
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.COSTELLA_MODE_CHANGED, {
                addr,
                sideA,
                sideB
            });
        }

        return true;
    },

    // ============================================
    // OPERACIONS DIGITALS
    // ============================================

    /**
     * Llegir entrada digital (byte complet)
     * @returns {string} String binari de 8 bits '00000000'
     */
    din(addr, side) {
        const byte = window.PLCMemory.readDigitalByte(addr, side);
        if (byte === null) return null;
        return byte.toString(2).padStart(8, '0');
    },

    /**
     * Llegir bit individual d'entrada digital
     * @param {string} addr - Adreça vèrtebra
     * @param {string} side - 'a' o 'b' 
     * @param {number} bit - Bit 0-7
     * @returns {number} 0 o 1
     */
    dinbit(addr, side, bit) {
        const byteStr = this.din(addr, side);
        if (byteStr === null) return 0;
        const byteVal = parseInt(byteStr, 2);
        return (byteVal >> bit) & 1;
    },

    /**
     * Llegir/Escriure sortida digital (byte complet)
     * Signatures:
     *   dout(addr, side, value) - Escriu value al costat side
     *   dout(addr, value)       - Escriu value al costat 'a' (compatibilitat)
     *   dout(addr, side)        - Llegeix del costat side (si side és 'a' o 'b')
     */
    dout(addr, sideOrValue, value) {
        let side, writeValue;
        
        if (value !== undefined) {
            // 3 arguments: dout(addr, side, value)
            side = sideOrValue;
            writeValue = value;
        } else if (sideOrValue === 'a' || sideOrValue === 'b') {
            // 2 arguments amb side: dout(addr, side) → mode lectura
            return window.PLCMemory.readDigitalByte(addr, sideOrValue) || 0;
        } else if (sideOrValue !== undefined) {
            // 2 arguments amb valor: dout(addr, value) → escriu a side 'a'
            side = 'a';
            writeValue = sideOrValue;
        } else {
            // 1 argument: dout(addr) → lectura de side 'a'
            return window.PLCMemory.readDigitalByte(addr, 'a') || 0;
        }
        
        // Convertir string binari a número si cal
        if (typeof writeValue === 'string') {
            writeValue = parseInt(writeValue, 2);
        }
        
        // Mode escriptura
        return window.PLCMemory.writeDigitalByte(addr, side, writeValue);
    },

    /**
     * Escriure bit individual digital
     * @param {number} bit - Bit 0-7
     * @param {number} value - 0 o 1
     */
    doutbit(addr, side, bit, value) {
        return window.PLCMemory.writeDigitalBit(addr, side, bit, value);
    },

    /**
     * Escriure PWM a tots els bits (mode PWM)
     * Nota: PWM visual proporcional al valor 0-255
     * @param {number} value - Valor PWM 0-255
     */
    doutpwm(addr, side, value) {
        // PWM proporcional: escriure el valor directament
        const result = window.PLCMemory.writeDigitalByte(addr, side, value);
        
        if (result && window.EventBus) {
            // Emetre esdeveniment especial per PWM (per renderitzat visual)
            window.EventBus.emit('costella:pwm:changed', {
                addr,
                side,
                pwmValue: value
            });
        }
        
        return result;
    },

    /**
     * Escriure PWM a bit individual (mode PWM)
     */
    doutbitpwm(addr, side, bit, value) {
        // PWM a bit: si value >= 128, bit=1, sinó bit=0
        const bitValue = value >= 128 ? 1 : 0;
        const result = window.PLCMemory.writeDigitalBit(addr, side, bit, bitValue);
        
        if (result && window.EventBus) {
            window.EventBus.emit('costella:pwm:changed', {
                addr,
                side,
                bit,
                pwmValue: value
            });
        }
        
        return result;
    },

    // ============================================
    // OPERACIONS ANALÒGIQUES
    // ============================================

    /**
     * Llegir entrada analògica (retorna valor digital 0-4095)
     * @param {string} side - 'a' o 'b'
     * @param {number} channel - Canal 1-4
     * @returns {number} Valor digital 0-4095
     */
    ain(addr, side, channel) {
        const voltage = window.PLCMemory.readAnalogChannel(addr, side, channel - 1);
        if (voltage === null) return null;
        
        // Convertir voltatge (-10 a +10) a digital (0-4095)
        return this.v2ain(voltage);
    },

    /**
     * Llegir entrada analògica amb informació verbose a consola
     */
    ainv(addr, side, channel) {
        const voltage = window.PLCMemory.readAnalogChannel(addr, side, channel - 1);
        if (voltage === null) return null;
        
        const digitalValue = this.v2ain(voltage);
        const normalizedAddr = window.PLCMemory._normalizeAddress(addr);
        
        // Log verbose (compatible amb versió original)
        const addrNum = parseInt(normalizedAddr.replace('0x', ''), 16);
        const i2cAddr = addrNum + 16;
        const addrChannel = ((channel - 1) << 5) | 1;
        
        // console.log(`i2cAddr: 0x${i2cAddr.toString(16).toUpperCase()}, addrChannel: 0x${addrChannel.toString(16).toUpperCase()}`);
        // console.log(`res: 0x${digitalValue.toString(16).toUpperCase()}: ${digitalValue}`);
        // console.log(`0x${digitalValue.toString(16).toUpperCase()} --> ${digitalValue} --> ${voltage.toFixed(2)}V`);
        
        return digitalValue;
    },

    /**
     * Escriure sortida analògica
     * @param {number} channel - Canal 1-4
     * @param {number} value - Valor digital 0-4095
     */
    aout(addr, side, channel, value) {
        // console.log('[iotv.aout] Paràmetres rebuts:', {addr, side, channel, value});
        
        // Convertir valor digital a voltatge
        const voltage = this.aout2v(value);
        // console.log('[iotv.aout] Voltatge calculat:', voltage, 'V');
        // console.log('[iotv.aout] Canal intern:', channel - 1);
        // console.log('[iotv.aout] PLCMemory existeix?', !!window.PLCMemory);
        
        if (!window.PLCMemory) {
            console.error('[iotv.aout] ❌ PLCMemory no existeix!');
            return false;
        }
        
        // console.log('[iotv.aout] Cridant writeAnalogChannel(', addr, side, channel - 1, voltage, ')');
        const result = window.PLCMemory.writeAnalogChannel(addr, side, channel - 1, voltage);
        // console.log('[iotv.aout] Resultat writeAnalogChannel:', result);
        
        if (result) {
            const normalizedAddr = window.PLCMemory._normalizeAddress(addr);
            const dacCommand = ((channel - 1) << 4) | 2;
            
            // console.log(`dacCommand: 0x${dacCommand.toString(16).toUpperCase()}`);
            // console.log(`It has been sent 0x${value.toString(16).toUpperCase()} (${voltage.toFixed(2)} volts) to DAC ${channel}`);
        } else {
            console.error('[iotv.aout] ❌ writeAnalogChannel ha retornat false!');
        }
        
        return result;
    },

    // ============================================
    // CONVERSIONS DE VOLTATGE
    // ============================================

    /**
     * Convertir valor ADC (0-4095) a voltatge (-10V a +10V)
     */
    ain2v(digitalValue) {
        // ADC de 12 bits: 0 = -10V, 2048 = 0V, 4095 = +10V
        const voltage = ((digitalValue / 4095) * 20) - 10;
        return parseFloat(voltage.toFixed(2));
    },

    /**
     * Convertir voltatge (-10V a +10V) a valor ADC (0-4095)
     */
    v2ain(voltage) {
        // Limitar rang
        voltage = Math.max(-10, Math.min(10, voltage));
        // Convertir: -10V = 0, 0V = 2048, +10V = 4095
        const digitalValue = Math.round(((voltage + 10) / 20) * 4095);
        return Math.max(0, Math.min(4095, digitalValue));
    },

    /**
     * Convertir valor DAC (0-4095) a voltatge (0V a 10V)
     */
    aout2v(digitalValue) {
        // DAC de 12 bits: 0 = 0V, 4095 = 10V
        const voltage = (digitalValue / 4095) * 10;
        return parseFloat(voltage.toFixed(2));
    },

    /**
     * Convertir voltatge (0V a 10V) a valor DAC (0-4095)
     */
    v2aout(voltage) {
        // Limitar rang
        voltage = Math.max(0, Math.min(10, voltage));
        // Convertir: 0V = 0, 10V = 4095
        const digitalValue = Math.round((voltage / 10) * 4095);
        return Math.max(0, Math.min(4095, digitalValue));
    },

    // ============================================
    // UTILITATS I HELPERS
    // ============================================

    /**
     * Inicialitzar vèrtebres per defecte
     * Crida aquesta funció per configurar el sistema inicial
     */
    init() {
        // Crear vèrtebres per defecte
        // 0x0: Mixed (digital + analog)
        window.PLCMemory.addDigitalVertebra('0x0');
        window.PLCMemory.addAnalogVertebra('0x0');
        
        // 0x1: Només analog
        window.PLCMemory.addAnalogVertebra('0x1');
        
        console.log('[iotv] Default vertebrae initialized (0x0 mixed, 0x1 analog)');
    },

    /**
     * Afegir vèrtebra digital addicional
     */
    addDigitalVertebra(addr) {
        return window.PLCMemory.addDigitalVertebra(addr);
    },

    /**
     * Afegir vèrtebra analògica addicional
     */
    addAnalogVertebra(addr) {
        return window.PLCMemory.addAnalogVertebra(addr);
    },

    /**
     * Eliminar vèrtebra
     */
    removeVertebra(type, addr) {
        return window.PLCMemory.removeVertebra(type, addr);
    },

    /**
     * Obtenir llista de vèrtebres actives
     */
    getActiveVertebrae() {
        return {
            digital: window.PLCMemory.getActiveAddresses('digital'),
            analog: window.PLCMemory.getActiveAddresses('analog')
        };
    },

    /**
     * Obtenir estat complet del sistema
     */
    getSystemState() {
        return window.PLCMemory.export();
    },

    /**
     * Restaurar estat del sistema
     */
    setSystemState(state) {
        return window.PLCMemory.import(state);
    },

    /**
     * Reset complet del sistema
     */
    reset() {
        window.PLCMemory.reset();
        this.init();
    },

    /**
     * Obtenir estadístiques
     */
    getStats() {
        return {
            api_version: this.version,
            memory: window.PLCMemory ? window.PLCMemory.getStats() : {},
            eventBus: window.EventBus ? window.EventBus.getStats() : {}
        };
    },

    /**
     * Mode debug
     */
    setDebugMode(enabled) {
        if (window.ConfigManager) {
            window.ConfigManager.setDebugMode(enabled);
        }
    },

    // ============================================
    // FUNCIONS BATCH (NOVES)
    // ============================================

    /**
     * Escriure múltiples canals analògics alhora
     * @param {Object} voltages - {ch1: 2.5, ch3: 7.5} o {0: 2.5, 2: 7.5}
     */
    aoutBatch(addr, side, voltages) {
        // Convertir voltatges a valors digitals si cal
        const digitalVoltages = {};
        
        for (const [key, value] of Object.entries(voltages)) {
            // Si el valor és > 10, assumim que és digital (0-4095)
            if (value > 10) {
                digitalVoltages[key] = this.aout2v(value);
            } else {
                digitalVoltages[key] = value;
            }
        }
        
        return window.PLCMemory.writeAnalogBatch(addr, side, digitalVoltages);
    },

    /**
     * Llegir múltiples canals analògics alhora
     * @returns {Object} {ch1: 2.5, ch2: 0.0, ch3: 7.3, ch4: -5.2}
     */
    ainBatch(addr, side) {
        return window.PLCMemory.readAnalogBatch(addr, side);
    },

    /**
     * Llegir múltiples canals analògics en format digital
     * @returns {Object} {ch1: 3048, ch2: 2048, ch3: 3500, ch4: 1024}
     */
    ainBatchDigital(addr, side) {
        const voltages = window.PLCMemory.readAnalogBatch(addr, side);
        if (!voltages) return null;
        
        const digital = {};
        for (const [key, voltage] of Object.entries(voltages)) {
            digital[key] = this.v2ain(voltage);
        }
        
        return digital;
    },
    
    // Al final de iotv-api-v2.js:

	/**
	 * Obtenir configuració actual de vèrtebres
	 */
	getConfig() {
		if (window.VertebraeConfig) {
			return window.VertebraeConfig.get();
		}
		return null;
	},

	/**
	 * Llistar presets disponibles
	 */
	listPresets() {
		if (window.VertebraeConfig) {
			return window.VertebraeConfig.getAvailablePresets();
		}
		return [];
	}
};

// Inicialitzar vèrtebres per defecte
iotv.init();

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.iotv = iotv;
}

console.log('✓ IOTV API v2 loaded');
