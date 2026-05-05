/**
 * CoherenceValidator - Validador de coherència entre bessons físics i digital
 * 
 * Detecta conflictes entre:
 * - Bessons físics que escriuen/llegeixen els mateixos bits
 * - Bits usats per bessons físics però no llegits pel digital
 * - Bits escrits pel digital però no llegits per bessons físics
 */

const CoherenceValidator = {
    /**
     * Validar coherència completa
     * @param {Array} physicalTwins - Configuracions de bessons físics
     * @param {Object} digitalTwin - Configuració de preset vertebrae
     * @returns {Object} { valid: boolean, errors: [], warnings: [], conflicts: {} }
     */
    validate(physicalTwins, digitalTwin) {
        const errors = [];
        const warnings = [];
        const conflicts = {
            writeConflicts: [],
            readConflicts: [],
            unusedPhysicalBits: [],
            unusedDigitalBits: []
        };
        
        // Extreure bits usats per bessons físics
        const physicalUsage = this._extractPhysicalBitUsage(physicalTwins);
        
        // Extreure bits usats pel bessó digital
        const digitalUsage = this._extractDigitalBitUsage(digitalTwin);
        
        // CONFLICTE 1: Dos bessons físics escriuen al mateix bit (output)
        const writeConflicts = this._findWriteConflicts(physicalUsage.outputs);
        writeConflicts.forEach(conflict => {
            errors.push(
                `⚠️ CONFLICTE D'ESCRIPTURA: Bit ${conflict.bit} (${conflict.vertebra}:${conflict.costella}) ` +
                `escrit per múltiples bessons: ${conflict.twins.join(', ')}`
            );
            conflicts.writeConflicts.push(conflict);
        });
        
        // CONFLICTE 2: Dos bessons físics llegeixen del mateix bit (input)
        const readConflicts = this._findReadConflicts(physicalUsage.inputs);
        readConflicts.forEach(conflict => {
            errors.push(
                `⚠️ CONFLICTE DE LECTURA: Bit ${conflict.bit} (${conflict.vertebra}:${conflict.costella}) ` +
                `llegit per múltiples bessons: ${conflict.twins.join(', ')}`
            );
            conflicts.readConflicts.push(conflict);
        });
        
        // WARNING 1: Bessó físic usa bit (output) que el digital no llegeix (input)
        const unusedPhysicalOutputs = this._findUnusedPhysicalOutputs(
            physicalUsage.outputs,
            digitalUsage.inputs
        );
        unusedPhysicalOutputs.forEach(unused => {
            warnings.push(
                `⚠️ Bit ${unused.bit} (${unused.vertebra}:${unused.costella}) escrit per "${unused.twin}" ` +
                `però no llegit pel bessó digital`
            );
            conflicts.unusedPhysicalBits.push(unused);
        });
        
        // WARNING 2: Bessó digital escriu bit (output) que cap físic llegeix (input)
        const unusedDigitalOutputs = this._findUnusedDigitalOutputs(
            digitalUsage.outputs,
            physicalUsage.inputs
        );
        unusedDigitalOutputs.forEach(unused => {
            warnings.push(
                `⚠️ Bit ${unused.bit} (${unused.vertebra}:${unused.costella}) escrit pel bessó digital ` +
                `però no llegit per cap bessó físic`
            );
            conflicts.unusedDigitalBits.push(unused);
        });
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            conflicts
        };
    },
    
    /**
     * Extreure ús de bits per bessons físics
     */
    _extractPhysicalBitUsage(physicalTwins) {
        const outputs = {}; // { 'vertebra:costella:bit': ['twin1', 'twin2'] }
        const inputs = {};  // { 'vertebra:costella:bit': ['twin1', 'twin2'] }
        
        if (!physicalTwins || !Array.isArray(physicalTwins)) {
            return { outputs, inputs };
        }
        
        physicalTwins.forEach(twin => {
            // Saltar bessons de tipus twin (usen format fromPLC/toPLC, no outputMap/inputMap)
            if (twin.type === 'twin') return;
            
            const ioConfig = twin.ioConfig;
            const defaultVertebra = this._normalizeAddress(ioConfig.vertebra);
            
            // Outputs (bessó físic escriu)
            if (ioConfig.outputMap) {
                Object.values(ioConfig.outputMap).forEach(mapping => {
                    const vertebra = mapping.vertebra 
                        ? this._normalizeAddress(mapping.vertebra)
                        : defaultVertebra;
                    const key = `${vertebra}:${mapping.costella}:${mapping.bit}`;
                    
                    if (!outputs[key]) {
                        outputs[key] = [];
                    }
                    outputs[key].push(twin.name);
                });
            }
            
            // Inputs (bessó físic llegeix)
            if (ioConfig.inputMap) {
                Object.values(ioConfig.inputMap).forEach(mapping => {
                    const vertebra = mapping.vertebra 
                        ? this._normalizeAddress(mapping.vertebra)
                        : defaultVertebra;
                    const key = `${vertebra}:${mapping.costella}:${mapping.bit}`;
                    
                    if (!inputs[key]) {
                        inputs[key] = [];
                    }
                    inputs[key].push(twin.name);
                });
            }
        });
        
        return { outputs, inputs };
    },
    
    /**
     * Extreure ús de bits pel bessó digital
     */
    _extractDigitalBitUsage(digitalTwin) {
        const outputs = new Set(); // 'vertebra:costella:bit'
        const inputs = new Set();  // 'vertebra:costella:bit'
        
        if (!digitalTwin || !digitalTwin.vertebrae) {
            return { outputs, inputs };
        }
        
        digitalTwin.vertebrae.forEach(vertebra => {
            const addr = this._normalizeAddress(vertebra.addr);
            
            // Només processem vèrtebres digitals
            if (vertebra.type !== 'digital') {
                return;
            }
            
            // CostellaA
            if (vertebra.costellaA === 'output') {
                // Bessó digital escriu a tots els bits de costellaA
                for (let bit = 0; bit <= 7; bit++) {
                    outputs.add(`${addr}:a:${bit}`);
                }
            } else if (vertebra.costellaA === 'input') {
                // Bessó digital llegeix de tots els bits de costellaA
                for (let bit = 0; bit <= 7; bit++) {
                    inputs.add(`${addr}:a:${bit}`);
                }
            }
            
            // CostellaB
            if (vertebra.costellaB === 'output') {
                // Bessó digital escriu a tots els bits de costellaB
                for (let bit = 0; bit <= 7; bit++) {
                    outputs.add(`${addr}:b:${bit}`);
                }
            } else if (vertebra.costellaB === 'input') {
                // Bessó digital llegeix de tots els bits de costellaB
                for (let bit = 0; bit <= 7; bit++) {
                    inputs.add(`${addr}:b:${bit}`);
                }
            }
        });
        
        return { outputs, inputs };
    },
    
    /**
     * Trobar conflictes d'escriptura (dos bessons físics escriuen al mateix bit)
     */
    _findWriteConflicts(outputs) {
        const conflicts = [];
        
        Object.entries(outputs).forEach(([key, twins]) => {
            if (twins.length > 1) {
                const [vertebra, costella, bit] = key.split(':');
                conflicts.push({
                    vertebra,
                    costella,
                    bit: parseInt(bit),
                    twins,
                    key
                });
            }
        });
        
        return conflicts;
    },
    
    /**
     * Trobar conflictes de lectura (dos bessons físics llegeixen del mateix bit)
     */
    _findReadConflicts(inputs) {
        const conflicts = [];
        
        Object.entries(inputs).forEach(([key, twins]) => {
            if (twins.length > 1) {
                const [vertebra, costella, bit] = key.split(':');
                conflicts.push({
                    vertebra,
                    costella,
                    bit: parseInt(bit),
                    twins,
                    key
                });
            }
        });
        
        return conflicts;
    },
    
    /**
     * Trobar outputs de bessons físics no llegits pel digital
     */
    _findUnusedPhysicalOutputs(physicalOutputs, digitalInputs) {
        const unused = [];
        
        Object.entries(physicalOutputs).forEach(([key, twins]) => {
            if (!digitalInputs.has(key)) {
                const [vertebra, costella, bit] = key.split(':');
                twins.forEach(twin => {
                    unused.push({
                        vertebra,
                        costella,
                        bit: parseInt(bit),
                        twin,
                        key
                    });
                });
            }
        });
        
        return unused;
    },
    
    /**
     * Trobar outputs del digital no llegits per cap físic
     */
    _findUnusedDigitalOutputs(digitalOutputs, physicalInputs) {
        const unused = [];
        
        digitalOutputs.forEach(key => {
            if (!physicalInputs[key] || physicalInputs[key].length === 0) {
                const [vertebra, costella, bit] = key.split(':');
                unused.push({
                    vertebra,
                    costella,
                    bit: parseInt(bit),
                    key
                });
            }
        });
        
        return unused;
    },
    
    /**
     * Normalitzar adreça
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
     * Generar resum visual de conflictes
     */
    generateConflictSummary(validationResult) {
        const summary = {
            total: 0,
            errors: 0,
            warnings: 0,
            categories: {}
        };
        
        // Comptar errors
        if (validationResult.conflicts.writeConflicts.length > 0) {
            summary.errors += validationResult.conflicts.writeConflicts.length;
            summary.categories.writeConflicts = validationResult.conflicts.writeConflicts.length;
        }
        
        if (validationResult.conflicts.readConflicts.length > 0) {
            summary.errors += validationResult.conflicts.readConflicts.length;
            summary.categories.readConflicts = validationResult.conflicts.readConflicts.length;
        }
        
        // Comptar warnings
        if (validationResult.conflicts.unusedPhysicalBits.length > 0) {
            summary.warnings += validationResult.conflicts.unusedPhysicalBits.length;
            summary.categories.unusedPhysicalBits = validationResult.conflicts.unusedPhysicalBits.length;
        }
        
        if (validationResult.conflicts.unusedDigitalBits.length > 0) {
            summary.warnings += validationResult.conflicts.unusedDigitalBits.length;
            summary.categories.unusedDigitalBits = validationResult.conflicts.unusedDigitalBits.length;
        }
        
        summary.total = summary.errors + summary.warnings;
        
        return summary;
    }
};

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.CoherenceValidator = CoherenceValidator;
}

console.log('✓ CoherenceValidator loaded');
