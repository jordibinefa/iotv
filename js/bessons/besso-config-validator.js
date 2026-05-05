/**
 * BessoConfigValidator - Validador de configuracions de bessons físics
 * 
 * Valida que les configuracions JSON de bessons compleixin amb l'estructura esperada
 * i no tinguin conflictes de bits/canals.
 */

const BessoConfigValidator = {
    // Tipus de bessó vàlids
    VALID_TYPES: ['pont-h', 'cinta', 'twin'],
    
    // Límits
    MAX_BIT: 7,
    MAX_ANALOG_CHANNEL: 3,
    
    /**
     * Validar configuració completa
     * @param {Array} config - Array de configuracions de bessons
     * @returns {Object} { valid: boolean, errors: [], warnings: [] }
     */
    validate(config) {
        const errors = [];
        const warnings = [];
        
        // Validar estructura bàsica
        if (!config) {
            errors.push('Configuració invàlida: és null o undefined');
            return { valid: false, errors, warnings };
        }
        
        if (!Array.isArray(config)) {
            errors.push('Configuració invàlida: ha de ser un array');
            return { valid: false, errors, warnings };
        }
        
        if (config.length === 0) {
            // Array buit és vàlid - no hi ha altres bessons configurats
            return { valid: true, errors, warnings };
        }
        
        // Validar cada entrada
        const usedNames = new Set();
        const bitUsage = {}; // { '0x0:a:0': 'pont-h-00', ... }
        const analogUsage = {}; // { '0x0:a:0': 'cinta-00', ... }
        
        config.forEach((entry, index) => {
            // Validar camps obligatoris
            if (!entry.type) {
                errors.push(`Entrada ${index}: camp "type" obligatori`);
                return;
            }
            
            if (!entry.name) {
                errors.push(`Entrada ${index}: camp "name" obligatori`);
                return;
            }
            
            if (!entry.ioConfig) {
                errors.push(`Entrada ${index} (${entry.name}): camp "ioConfig" obligatori`);
                return;
            }
            
            // Validar tipus
            if (!this.VALID_TYPES.includes(entry.type)) {
                errors.push(
                    `Entrada ${index} (${entry.name}): tipus "${entry.type}" invàlid. ` +
                    `Vàlids: ${this.VALID_TYPES.join(', ')}`
                );
            }
            
            // Validar noms únics
            if (usedNames.has(entry.name)) {
                errors.push(`Entrada ${index}: nom "${entry.name}" duplicat`);
            }
            usedNames.add(entry.name);
            
            // Validar ioConfig (només per tipus clàssics, no twin)
            if (entry.type !== 'twin') {
                const ioValidation = this._validateIoConfig(entry.ioConfig, entry.name, index);
                errors.push(...ioValidation.errors);
                warnings.push(...ioValidation.warnings);
                
                // Registrar ús de bits/canals per detectar conflictes
                if (ioValidation.valid) {
                    this._registerBitUsage(entry.ioConfig, entry.name, bitUsage, analogUsage, warnings);
                }
            } else {
                // Twin: validar que té definition o twinId
                if (!entry.definition && !entry.twinId) {
                    errors.push(`Entrada ${index} (${entry.name}): cal "definition" o "twinId" per tipus "twin"`);
                }
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    },
    
    /**
     * Validar estructura ioConfig
     */
    _validateIoConfig(ioConfig, bessoName, index) {
        const errors = [];
        const warnings = [];
        
        // Validar estructura
        if (typeof ioConfig !== 'object') {
            errors.push(`Entrada ${index} (${bessoName}): ioConfig ha de ser un objecte`);
            return { valid: false, errors, warnings };
        }
        
        // Validar vèrtebra
        if (!ioConfig.vertebra) {
            errors.push(`Entrada ${index} (${bessoName}): vèrtebra obligatòria`);
        } else {
            const normalizedVert = this._normalizeAddress(ioConfig.vertebra);
            if (!normalizedVert) {
                errors.push(
                    `Entrada ${index} (${bessoName}): vèrtebra "${ioConfig.vertebra}" invàlida. ` +
                    `Format vàlid: '0x0' a '0xF' o '0000' a '1111'`
                );
            }
        }
        
        // Validar mapes
        const mapsToValidate = ['outputMap', 'inputMap', 'analogOutputMap', 'analogInputMap'];
        mapsToValidate.forEach(mapName => {
            if (!ioConfig[mapName]) {
                errors.push(`Entrada ${index} (${bessoName}): camp "${mapName}" obligatori`);
            } else if (typeof ioConfig[mapName] !== 'object') {
                errors.push(`Entrada ${index} (${bessoName}): ${mapName} ha de ser un objecte`);
            }
        });
        
        // Validar contingut dels mapes digitals
        ['outputMap', 'inputMap'].forEach(mapName => {
            if (ioConfig[mapName]) {
                Object.entries(ioConfig[mapName]).forEach(([key, value]) => {
                    // Validar costella
                    if (!value.costella || !['a', 'b'].includes(value.costella)) {
                        errors.push(
                            `Entrada ${index} (${bessoName}): ${mapName}.${key}.costella ` +
                            `ha de ser 'a' o 'b'`
                        );
                    }
                    
                    // Validar bit
                    if (value.bit === undefined || value.bit < 0 || value.bit > this.MAX_BIT) {
                        errors.push(
                            `Entrada ${index} (${bessoName}): ${mapName}.${key}.bit ` +
                            `ha de ser 0-${this.MAX_BIT}`
                        );
                    }
                    
                    // Validar vertebra override si existeix
                    if (value.vertebra) {
                        const normalizedVert = this._normalizeAddress(value.vertebra);
                        if (!normalizedVert) {
                            errors.push(
                                `Entrada ${index} (${bessoName}): ${mapName}.${key}.vertebra ` +
                                `"${value.vertebra}" invàlida. Format vàlid: '0x0' a '0xF'`
                            );
                        }
                    }
                });
            }
        });
        
        // Validar contingut dels mapes analògics
        ['analogOutputMap', 'analogInputMap'].forEach(mapName => {
            if (ioConfig[mapName]) {
                Object.entries(ioConfig[mapName]).forEach(([key, value]) => {
                    // Validar costella
                    if (!value.costella || !['a', 'b'].includes(value.costella)) {
                        errors.push(
                            `Entrada ${index} (${bessoName}): ${mapName}.${key}.costella ` +
                            `ha de ser 'a' o 'b'`
                        );
                    }
                    
                    // Validar canal
                    if (value.canal === undefined || value.canal < 0 || value.canal > this.MAX_ANALOG_CHANNEL) {
                        errors.push(
                            `Entrada ${index} (${bessoName}): ${mapName}.${key}.canal ` +
                            `ha de ser 0-${this.MAX_ANALOG_CHANNEL}`
                        );
                    }
                    
                    // Validar vertebra override si existeix
                    if (value.vertebra) {
                        const normalizedVert = this._normalizeAddress(value.vertebra);
                        if (!normalizedVert) {
                            errors.push(
                                `Entrada ${index} (${bessoName}): ${mapName}.${key}.vertebra ` +
                                `"${value.vertebra}" invàlida. Format vàlid: '0x0' a '0xF'`
                            );
                        }
                    }
                });
            }
        });
        
        return { valid: errors.length === 0, errors, warnings };
    },
    
    /**
     * Registrar ús de bits i canals per detectar conflictes
     */
    _registerBitUsage(ioConfig, bessoName, bitUsage, analogUsage, warnings) {
        const defaultVertebra = this._normalizeAddress(ioConfig.vertebra);
        
        // Registrar bits digitals
        ['outputMap', 'inputMap'].forEach(mapName => {
            if (ioConfig[mapName]) {
                Object.values(ioConfig[mapName]).forEach(mapping => {
                    // Usar vertebra override si existeix, sinó la per defecte
                    const vertebra = mapping.vertebra 
                        ? this._normalizeAddress(mapping.vertebra)
                        : defaultVertebra;
                    
                    const key = `${vertebra}:${mapping.costella}:${mapping.bit}`;
                    if (bitUsage[key]) {
                        warnings.push(
                            `Conflicte de bit: ${key} usat per "${bitUsage[key]}" i "${bessoName}"`
                        );
                    }
                    bitUsage[key] = bessoName;
                });
            }
        });
        
        // Registrar canals analògics
        ['analogOutputMap', 'analogInputMap'].forEach(mapName => {
            if (ioConfig[mapName]) {
                Object.values(ioConfig[mapName]).forEach(mapping => {
                    // Usar vertebra override si existeix, sinó la per defecte
                    const vertebra = mapping.vertebra 
                        ? this._normalizeAddress(mapping.vertebra)
                        : defaultVertebra;
                    
                    const key = `${vertebra}:${mapping.costella}:AO${mapping.canal}`;
                    if (analogUsage[key]) {
                        warnings.push(
                            `Conflicte de canal analògic: ${key} usat per "${analogUsage[key]}" i "${bessoName}"`
                        );
                    }
                    analogUsage[key] = bessoName;
                });
            }
        });
    },
    
    /**
     * Normalitzar adreça de vèrtebra
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
    },
    
    /**
     * Generar títol de finestra per un bessó
     * @param {Object} config - Configuració completa del bessó (type + name + ioConfig)
     * @returns {string} Títol formatat
     */
    generateWindowTitle(config) {
        const icon = this._getIconForType(config.type);
        const name = config.name;
        
        // Twin type: format diferent
        if (config.type === 'twin') {
            const def = config.definition;
            const metaName = def && def.meta ? def.meta.name : '';
            return `${icon} ${name}${metaName ? ' — ' + metaName : ''}`;
        }
        
        // Extreure informació de vèrtebres i costelles
        const vertebrae = new Set();
        const costelles = new Set();
        const bits = [];
        const analogChannels = [];
        
        const ioConfig = config.ioConfig;
        const defaultVertebra = this._normalizeAddress(ioConfig.vertebra);
        
        // De outputMap i inputMap
        ['outputMap', 'inputMap'].forEach(mapName => {
            if (ioConfig[mapName]) {
                Object.values(ioConfig[mapName]).forEach(mapping => {
                    // Usar vertebra override si existeix, sinó la per defecte
                    const vertebra = mapping.vertebra 
                        ? this._normalizeAddress(mapping.vertebra)
                        : defaultVertebra;
                    vertebrae.add(vertebra);
                    costelles.add(mapping.costella);
                    bits.push(mapping.bit);
                });
            }
        });
        
        // De analogOutputMap i analogInputMap
        ['analogOutputMap', 'analogInputMap'].forEach(mapName => {
            if (ioConfig[mapName]) {
                Object.values(ioConfig[mapName]).forEach(mapping => {
                    // Usar vertebra override si existeix, sinó la per defecte
                    const vertebra = mapping.vertebra 
                        ? this._normalizeAddress(mapping.vertebra)
                        : defaultVertebra;
                    vertebrae.add(vertebra);
                    costelles.add(mapping.costella);
                    analogChannels.push(mapping.canal);
                });
            }
        });
        
        // Format títol
        const verts = Array.from(vertebrae).join(',');
        const costs = Array.from(costelles).sort().join(',');
        
        // Afegir informació de bits si són continus
        let bitInfo = '';
        if (bits.length > 0) {
            const sortedBits = bits.sort((a, b) => a - b);
            const minBit = sortedBits[0];
            const maxBit = sortedBits[sortedBits.length - 1];
            if (maxBit - minBit === sortedBits.length - 1) {
                // Bits continus
                bitInfo = `:${minBit}-${maxBit}`;
            }
        }
        
        // Afegir informació de canals analògics
        const analogInfo = analogChannels.length > 0 
            ? ` · AO${analogChannels.sort((a, b) => a - b).join(',')}` 
            : '';
        
        return `${icon} ${name} [${verts}:${costs}${bitInfo}${analogInfo}]`;
    },
    
    /**
     * Obtenir icona per tipus de bessó
     */
    _getIconForType(type) {
        const icons = {
            'pont-h': '🔌',
            'cinta': '📦',
            'twin': '🔧'
        };
        return icons[type] || '🔧';
    },
    
    /**
     * Validar JSON string
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
    }
};

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.BessoConfigValidator = BessoConfigValidator;
}

console.log('✓ BessoConfigValidator loaded');
