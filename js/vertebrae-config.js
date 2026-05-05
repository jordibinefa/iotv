/**
 * VertebraeConfig - Sistema de configuració de vèrtebres IoT-Vertebrae
 * 
 * Gestiona presets, validació i configuració dinàmica de vèrtebres
 * amb suport per costats A i B independents.
 * 
 * Format JSON:
 * {
 *   "name": "preset-name",
 *   "version": "1.0",
 *   "vertebrae": [
 *     {
 *       "addr": "0000",           // Binari 4 bits o hex "0x0"
 *       "type": "digital",        // "digital" o "analog"
 *       "costellaA": "output",    // "output", "input", "none"
 *       "costellaB": "input"
 *     }
 *   ]
 * }
 */

const VertebraeConfig = {
    // Configuració actual carregada
    current: null,
    
    // ============================================
    // PRESETS PREDEFINITS
    // ============================================
    
    PRESETS: {
        /**
         * BASIC - Configuració per defecte (actual)
         * 1 digital (A=output, B=input) + 1 analog (A=output, B=input)
         */
        basic: {
            name: "basic",
            description: "Configuració bàsica: 1 digital + 1 analògica",
            version: "1.0",
            vertebrae: [
                {
                    addr: "0x0",
                    type: "digital",
                    costellaA: "output",
                    costellaB: "input"
                },
                {
                    addr: "0x0",
                    type: "analog",
                    costellaA: "output",
                    costellaB: "input"
                }
            ]
        },
        
        /**
         * INDUSTRIAL - Setup industrial mitjà
         * 2 digitals + 1 analògica
         */
        industrial: {
            name: "industrial",
            description: "Setup industrial: 2 digitals + 1 analògica",
            version: "1.0",
            vertebrae: [
                {
                    addr: "0x0",
                    type: "digital",
                    costellaA: "output",
                    costellaB: "input"
                },
                {
                    addr: "0x1",
                    type: "digital",
                    costellaA: "output",
                    costellaB: "input"
                },
                {
                    addr: "0x0",
                    type: "analog",
                    costellaA: "output",
                    costellaB: "input"
                }
            ]
        },
        
        /**
         * ASCENSOR - Configuració complexa real
         * 17 DI + 10 DO + 2 AI + 1 AO
         * 3 vèrtebres digitals + 1 analògica
         */
        ascensor: {
            name: "ascensor",
            description: "Ascensor: 17DI + 10DO + 2AI + 1AO",
            version: "1.0",
            vertebrae: [
                {
                    addr: "0x0",
                    type: "digital",
                    costellaA: "input",   // 8 DI
                    costellaB: "input"    // 8 DI (total 16)
                },
                {
                    addr: "0x1",
                    type: "digital",
                    costellaA: "input",   // 1 DI (total 17)
                    costellaB: "output"   // 8 DO
                },
                {
                    addr: "0x2",
                    type: "digital",
                    costellaA: "output",  // 2 DO usats (total 10)
                    costellaB: "none"     // No hi ha costella
                },
                {
                    addr: "0x0",
                    type: "analog",
                    costellaA: "input",   // 2 AI usats (4 canals disponibles)
                    costellaB: "output"   // 1 AO usat (4 canals disponibles)
                }
            ]
        },
        
        /**
         * DIGITAL_ONLY - Només vèrtebres digitals
         * 3 vèrtebres amb diferents configuracions
         */
        digitalOnly: {
            name: "digitalOnly",
            description: "Només digitals: 3 vèrtebres",
            version: "1.0",
            vertebrae: [
                {
                    addr: "0x0",
                    type: "digital",
                    costellaA: "output",
                    costellaB: "input"
                },
                {
                    addr: "0x1",
                    type: "digital",
                    costellaA: "input",
                    costellaB: "output"
                },
                {
                    addr: "0x2",
                    type: "digital",
                    costellaA: "output",
                    costellaB: "output"
                }
            ]
        },
        
        /**
         * ANALOG_ONLY - Només vèrtebres analògiques
         * 2 vèrtebres amb diferents configuracions
         */
        analogOnly: {
            name: "analogOnly",
            description: "Només analògiques: 2 vèrtebres",
            version: "1.0",
            vertebrae: [
                {
                    addr: "0x0",
                    type: "analog",
                    costellaA: "output",
                    costellaB: "input"
                },
                {
                    addr: "0x1",
                    type: "analog",
                    costellaA: "input",
                    costellaB: "output"
                }
            ]
        },
        
        /**
         * ASIMETRIC - Configuració amb costelles "none"
         * Demostra que les costelles poden estar buides
         */
        asimetric: {
            name: "asimetric",
            description: "Configuració asimètrica amb costelles 'none'",
            version: "1.0",
            vertebrae: [
                {
                    addr: "0x0",
                    type: "digital",
                    costellaA: "output",
                    costellaB: "none"     // Només costat A
                },
                {
                    addr: "0x1",
                    type: "digital",
                    costellaA: "none",    // Només costat B
                    costellaB: "input"
                },
                {
                    addr: "0x0",
                    type: "analog",
                    costellaA: "none",    // Només costat B
                    costellaB: "input"
                }
            ]
        }
    },
    
    // ============================================
    // VALIDACIÓ
    // ============================================
    
    /**
     * Validar configuració completa
     * @param {Object} config - Configuració a validar
     * @returns {Object} { valid: boolean, errors: [], warnings: [] }
     */
    validate(config) {
        const errors = [];
        const warnings = [];
        
        // Validar estructura bàsica
        if (!config || typeof config !== 'object') {
            errors.push('Configuració invàlida: no és un objecte');
            return { valid: false, errors, warnings };
        }
        
        if (!config.vertebrae || !Array.isArray(config.vertebrae)) {
            errors.push('Configuració invàlida: "vertebrae" ha de ser un array');
            return { valid: false, errors, warnings };
        }
        
        if (config.vertebrae.length === 0) {
            errors.push('Configuració buida: cal almenys una vèrtebra');
            return { valid: false, errors, warnings };
        }
        
        // Validar cada vèrtebra
        const digitalAddrs = [];
        const analogAddrs = [];
        
        config.vertebrae.forEach((vertebra, index) => {
            // Validar tipus
            if (!vertebra.type || !['digital', 'analog'].includes(vertebra.type)) {
                errors.push(`Vèrtebra ${index}: tipus invàlid (ha de ser "digital" o "analog")`);
                return;
            }
            
            // Validar adreça
            if (!vertebra.addr) {
                errors.push(`Vèrtebra ${index}: adreça mancant`);
                return;
            }
            
            const normalizedAddr = this._normalizeAddress(vertebra.addr);
            if (!normalizedAddr) {
                errors.push(`Vèrtebra ${index}: adreça invàlida "${vertebra.addr}"`);
                return;
            }
            
            // Recopilar adreces per detectar duplicats
            if (vertebra.type === 'digital') {
                digitalAddrs.push({ addr: normalizedAddr, index });
            } else {
                analogAddrs.push({ addr: normalizedAddr, index });
            }
            
            // Validar costelles
            const validCostella = ['output', 'input', 'none'];
            if (!validCostella.includes(vertebra.costellaA)) {
                errors.push(`Vèrtebra ${index}: costellaA invàlida (ha de ser "output", "input" o "none")`);
            }
            if (!validCostella.includes(vertebra.costellaB)) {
                errors.push(`Vèrtebra ${index}: costellaB invàlida (ha de ser "output", "input" o "none")`);
            }
            
            // Warning si ambdues costelles són "none"
            if (vertebra.costellaA === 'none' && vertebra.costellaB === 'none') {
                warnings.push(`Vèrtebra ${index} (${normalizedAddr}): ambdues costelles són "none"`);
            }
        });
        
        // Detectar adreces digitals duplicades
        const digitalDuplicates = this._findDuplicateAddresses(digitalAddrs);
        digitalDuplicates.forEach(dup => {
            errors.push(`Adreça digital duplicada: ${dup.addr} (vèrtebres ${dup.indices.join(', ')})`);
        });
        
        // Detectar adreces analògiques duplicades
        const analogDuplicates = this._findDuplicateAddresses(analogAddrs);
        analogDuplicates.forEach(dup => {
            errors.push(`Adreça analògica duplicada: ${dup.addr} (vèrtebres ${dup.indices.join(', ')})`);
        });
        
        // Validar límits (màxim 16 adreces de cada tipus: 0x0 a 0xf)
        if (digitalAddrs.length > 16) {
            errors.push(`Massa vèrtebres digitals: ${digitalAddrs.length} (màxim 16, adreces 0x0-0xf)`);
        }
        if (analogAddrs.length > 16) {
            errors.push(`Massa vèrtebres analògiques: ${analogAddrs.length} (màxim 16, adreces 0x0-0xf)`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    },
    
    /**
     * Trobar adreces duplicades
     */
    _findDuplicateAddresses(addrList) {
        const addrMap = {};
        const duplicates = [];
        
        addrList.forEach(item => {
            if (!addrMap[item.addr]) {
                addrMap[item.addr] = [];
            }
            addrMap[item.addr].push(item.index);
        });
        
        Object.keys(addrMap).forEach(addr => {
            if (addrMap[addr].length > 1) {
                duplicates.push({
                    addr: addr,
                    indices: addrMap[addr]
                });
            }
        });
        
        return duplicates;
    },
    
    // ============================================
    // GESTIÓ DE CONFIGURACIÓ
    // ============================================
    
    /**
     * Carregar preset per nom
     * @param {string} name - Nom del preset
     * @returns {Object|null} Configuració carregada o null si no existeix
     */
    loadPreset(name) {
        if (!this.PRESETS[name]) {
            console.error(`[VertebraeConfig] Preset "${name}" no existeix`);
            return null;
        }
        
        const config = JSON.parse(JSON.stringify(this.PRESETS[name])); // Deep copy
        const validation = this.validate(config);
        
        if (!validation.valid) {
            console.error(`[VertebraeConfig] Preset "${name}" invàlid:`, validation.errors);
            return null;
        }
        
        if (validation.warnings.length > 0) {
            console.warn(`[VertebraeConfig] Preset "${name}" warnings:`, validation.warnings);
        }
        
        this.current = config;
        console.log(`[VertebraeConfig] Preset "${name}" carregat`);
        
        return config;
    },
    
    /**
     * Carregar configuració custom
     * @param {Object} config - Configuració personalitzada
     * @returns {Object|null} Configuració carregada o null si invàlida
     */
    loadCustom(config) {
        const validation = this.validate(config);
        
        if (!validation.valid) {
            console.error('[VertebraeConfig] Configuració invàlida:', validation.errors);
            return null;
        }
        
        if (validation.warnings.length > 0) {
            console.warn('[VertebraeConfig] Configuració warnings:', validation.warnings);
        }
        
        this.current = JSON.parse(JSON.stringify(config)); // Deep copy
        console.log('[VertebraeConfig] Configuració custom carregada');
        
        return this.current;
    },
    
    /**
     * Obtenir configuració actual
     * @returns {Object|null} Configuració actual o null
     */
    get() {
        return this.current;
    },
    
    /**
     * Obtenir configuració actual o carregar preset per defecte
     * @returns {Object} Configuració garantida (carrega "basic" si no n'hi ha)
     */
    getOrDefault() {
        if (!this.current) {
            console.log('[VertebraeConfig] No hi ha configuració, carregant preset "basic"');
            this.loadPreset('basic');
        }
        return this.current;
    },
    
    /**
     * Obtenir llista de presets disponibles
     * @returns {Array} [{name, description}, ...]
     */
    getAvailablePresets() {
        return Object.keys(this.PRESETS).map(key => ({
            name: this.PRESETS[key].name,
            description: this.PRESETS[key].description
        }));
    },
    
    /**
     * Obtenir estadístiques de la configuració actual
     * @returns {Object|null} Estadístiques o null
     */
    getStats() {
        if (!this.current) {
            return null;
        }
        
        const stats = {
            totalVertebrae: this.current.vertebrae.length,
            digital: 0,
            analog: 0,
            costelles: {
                total: 0,
                output: 0,
                input: 0,
                none: 0
            }
        };
        
        this.current.vertebrae.forEach(v => {
            if (v.type === 'digital') stats.digital++;
            else stats.analog++;
            
            [v.costellaA, v.costellaB].forEach(c => {
                if (c !== 'none') stats.costelles.total++;
                if (c === 'output') stats.costelles.output++;
                else if (c === 'input') stats.costelles.input++;
                else if (c === 'none') stats.costelles.none++;
            });
        });
        
        return stats;
    },
    
    // ============================================
    // UTILITATS
    // ============================================
    
    /**
     * Normalitzar adreça (binari o hex a hex minúscules)
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
        
        return null; // Invàlid
    },
    
    /**
     * Exportar configuració actual a JSON
     */
    exportJSON() {
        if (!this.current) {
            return null;
        }
        return JSON.stringify(this.current, null, 2);
    },
    
    /**
     * Importar configuració des de JSON string
     */
    importJSON(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            return this.loadCustom(config);
        } catch (error) {
            console.error('[VertebraeConfig] Error parsejant JSON:', error);
            return null;
        }
    }
};

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.VertebraeConfig = VertebraeConfig;
}

console.log('✓ VertebraeConfig loaded (6 presets available)');
