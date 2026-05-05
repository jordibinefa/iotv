/**
 * VertebraeConfigValidator - Validador de presets de vertebrae-config.js
 * 
 * Valida configuracions de bessó digital amb suport per:
 * - Validació de sintaxi JSON
 * - Validació d'estructura de preset
 * - Validació de vèrtebres i costelles
 * - Detecció d'adreces duplicades
 */

const VertebraeConfigValidator = {
    /**
     * Validar JSON string de preset
     * @param {string} jsonString - String JSON a validar
     * @returns {Object} { valid: boolean, parsed: object|null, errors: [], warnings: [] }
     */
    validateJSON(jsonString) {
        const errors = [];
        const warnings = [];
        
        // Intentar parsejar
        let parsed = null;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            errors.push(`Error de sintaxi JSON: ${e.message}`);
            return { valid: false, parsed: null, errors, warnings };
        }
        
        // Validar estructura
        const validation = this.validate(parsed);
        
        return {
            valid: validation.valid,
            parsed: parsed,
            errors: [...errors, ...validation.errors],
            warnings: [...warnings, ...validation.warnings]
        };
    },
    
    /**
     * Validar estructura de preset
     * @param {Object} config - Configuració de preset
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
        
        // Validar camps obligatoris
        if (!config.name) {
            errors.push('Camp "name" obligatori');
        }
        
        if (!config.vertebrae || !Array.isArray(config.vertebrae)) {
            errors.push('Camp "vertebrae" ha de ser un array');
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
            if (!vertebra.addr && vertebra.addr !== 0) {
                errors.push(`Vèrtebra ${index}: adreça mancant`);
                return;
            }
            
            const normalizedAddr = this._normalizeAddress(vertebra.addr);
            if (!normalizedAddr) {
                errors.push(
                    `Vèrtebra ${index}: adreça "${vertebra.addr}" invàlida. ` +
                    `Format vàlid: '0x0' a '0xF' o '0000' a '1111'`
                );
                return;
            }
            
            // Registrar adreça per detectar duplicats
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
    
    /**
     * Normalitzar adreça (binari o hex a hex minúscules)
     */
    _normalizeAddress(addr) {
        if (typeof addr === 'number') {
            if (addr < 0 || addr > 15) return null;
            return `0x${addr.toString(16)}`;
        }
        
        const str = addr.toString().trim();
        
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
    }
};

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.VertebraeConfigValidator = VertebraeConfigValidator;
}

console.log('✓ VertebraeConfigValidator loaded');
