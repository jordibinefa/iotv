/**
 * Tests per CoherenceValidator
 * 
 * Exemples de conflictes:
 * 1. Dos bessons físics escriuen al mateix bit
 * 2. Dos bessons físics llegeixen del mateix bit
 * 3. Bessó físic escriu a bit que el digital no llegeix
 * 4. Bessó digital escriu a bit que cap físic llegeix
 */

const CoherenceValidatorTests = {
    /**
     * Executar tots els tests
     */
    runAll() {
        console.log('========================================');
        console.log('TESTS DE VALIDACIÓ DE COHERÈNCIA');
        console.log('========================================\n');
        
        this.testNoConflicts();
        this.testWriteConflict();
        this.testReadConflict();
        this.testUnusedPhysicalOutput();
        this.testUnusedDigitalOutput();
        this.testMultipleConflicts();
        
        console.log('========================================');
        console.log('TESTS COMPLETATS');
        console.log('========================================');
    },
    
    /**
     * TEST 1: Sense conflictes
     */
    testNoConflicts() {
        console.log('TEST 1: Configuració sense conflictes');
        
        const physicalTwins = [
            {
                type: 'pont-h',
                name: 'pont-h-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {
                        motor1A: { costella: 'a', bit: 0 },
                        motor1B: { costella: 'a', bit: 1 }
                    },
                    inputMap: {
                        sensor1: { costella: 'b', bit: 0 }
                    },
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            },
            {
                type: 'cinta',
                name: 'cinta-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {
                        motor2A: { costella: 'a', bit: 2 },
                        motor2B: { costella: 'a', bit: 3 }
                    },
                    inputMap: {
                        sensor2: { costella: 'b', bit: 1 }
                    },
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            }
        ];
        
        const digitalTwin = {
            name: 'basic',
            vertebrae: [
                {
                    addr: '0x0',
                    type: 'digital',
                    costellaA: 'output',  // Escriu a tots els bits de 'a' (físics llegeixen)
                    costellaB: 'input'    // Llegeix de tots els bits de 'b' (físics escriuen)
                }
            ]
        };
        
        const result = window.CoherenceValidator.validate(physicalTwins, digitalTwin);
        
        console.log('  Resultat:');
        console.log(`    Valid: ${result.valid}`);
        console.log(`    Errors: ${result.errors.length}`);
        console.log(`    Warnings: ${result.warnings.length}`);
        
        if (!result.valid || result.warnings.length > 0) {
            console.log('  ❌ TEST FALLIT (hauria de ser vàlid sense warnings)');
        } else {
            console.log('  ✅ TEST PASSAT');
        }
        console.log('');
    },
    
    /**
     * TEST 2: Conflicte d'escriptura (dos bessons físics escriuen al mateix bit)
     */
    testWriteConflict() {
        console.log('TEST 2: Conflicte d\'escriptura');
        
        const physicalTwins = [
            {
                type: 'pont-h',
                name: 'pont-h-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {
                        motor1A: { costella: 'a', bit: 0 }  // Escriu a 0x0:a:0
                    },
                    inputMap: {},
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            },
            {
                type: 'cinta',
                name: 'cinta-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {
                        motor2A: { costella: 'a', bit: 0 }  // També escriu a 0x0:a:0 ❌
                    },
                    inputMap: {},
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            }
        ];
        
        const digitalTwin = {
            name: 'basic',
            vertebrae: [
                {
                    addr: '0x0',
                    type: 'digital',
                    costellaA: 'input',   // Llegeix de 'a'
                    costellaB: 'output'
                }
            ]
        };
        
        const result = window.CoherenceValidator.validate(physicalTwins, digitalTwin);
        
        console.log('  Resultat:');
        console.log(`    Valid: ${result.valid}`);
        console.log(`    Errors: ${result.errors.length}`);
        console.log(`    Write Conflicts: ${result.conflicts.writeConflicts.length}`);
        
        if (result.valid || result.conflicts.writeConflicts.length === 0) {
            console.log('  ❌ TEST FALLIT (hauria de detectar conflicte d\'escriptura)');
        } else {
            console.log('  ✅ TEST PASSAT');
            console.log(`    Conflicte detectat: ${result.errors[0]}`);
        }
        console.log('');
    },
    
    /**
     * TEST 3: Conflicte de lectura (dos bessons físics llegeixen del mateix bit)
     */
    testReadConflict() {
        console.log('TEST 3: Conflicte de lectura');
        
        const physicalTwins = [
            {
                type: 'pont-h',
                name: 'pont-h-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {},
                    inputMap: {
                        sensor1: { costella: 'b', bit: 0 }  // Llegeix de 0x0:b:0
                    },
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            },
            {
                type: 'cinta',
                name: 'cinta-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {},
                    inputMap: {
                        sensor2: { costella: 'b', bit: 0 }  // També llegeix de 0x0:b:0 ❌
                    },
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            }
        ];
        
        const digitalTwin = {
            name: 'basic',
            vertebrae: [
                {
                    addr: '0x0',
                    type: 'digital',
                    costellaA: 'input',
                    costellaB: 'output'   // Escriu a 'b'
                }
            ]
        };
        
        const result = window.CoherenceValidator.validate(physicalTwins, digitalTwin);
        
        console.log('  Resultat:');
        console.log(`    Valid: ${result.valid}`);
        console.log(`    Errors: ${result.errors.length}`);
        console.log(`    Read Conflicts: ${result.conflicts.readConflicts.length}`);
        
        if (result.valid || result.conflicts.readConflicts.length === 0) {
            console.log('  ❌ TEST FALLIT (hauria de detectar conflicte de lectura)');
        } else {
            console.log('  ✅ TEST PASSAT');
            console.log(`    Conflicte detectat: ${result.errors[0]}`);
        }
        console.log('');
    },
    
    /**
     * TEST 4: Bessó físic escriu a bit que el digital no llegeix
     */
    testUnusedPhysicalOutput() {
        console.log('TEST 4: Bessó físic escriu a bit no llegit pel digital');
        
        const physicalTwins = [
            {
                type: 'pont-h',
                name: 'pont-h-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {
                        motor1A: { costella: 'a', bit: 0 }  // Escriu a 0x0:a:0
                    },
                    inputMap: {},
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            }
        ];
        
        const digitalTwin = {
            name: 'basic',
            vertebrae: [
                {
                    addr: '0x0',
                    type: 'digital',
                    costellaA: 'output',  // Escriu a 'a' (no llegeix) ⚠️
                    costellaB: 'input'
                }
            ]
        };
        
        const result = window.CoherenceValidator.validate(physicalTwins, digitalTwin);
        
        console.log('  Resultat:');
        console.log(`    Valid: ${result.valid}`);
        console.log(`    Warnings: ${result.warnings.length}`);
        console.log(`    Unused Physical Bits: ${result.conflicts.unusedPhysicalBits.length}`);
        
        if (result.warnings.length === 0 || result.conflicts.unusedPhysicalBits.length === 0) {
            console.log('  ❌ TEST FALLIT (hauria de generar warning)');
        } else {
            console.log('  ✅ TEST PASSAT');
            console.log(`    Warning detectat: ${result.warnings[0]}`);
        }
        console.log('');
    },
    
    /**
     * TEST 5: Bessó digital escriu a bit que cap físic llegeix
     */
    testUnusedDigitalOutput() {
        console.log('TEST 5: Bessó digital escriu a bit no llegit per cap físic');
        
        const physicalTwins = [
            {
                type: 'pont-h',
                name: 'pont-h-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {},
                    inputMap: {
                        sensor1: { costella: 'b', bit: 0 }  // Llegeix només de 0x0:b:0
                    },
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            }
        ];
        
        const digitalTwin = {
            name: 'basic',
            vertebrae: [
                {
                    addr: '0x0',
                    type: 'digital',
                    costellaA: 'output',  // Escriu a tots els bits de 'a' (cap físic llegeix) ⚠️
                    costellaB: 'output'   // Escriu a 'b' (físic només llegeix bit 0)
                }
            ]
        };
        
        const result = window.CoherenceValidator.validate(physicalTwins, digitalTwin);
        
        console.log('  Resultat:');
        console.log(`    Valid: ${result.valid}`);
        console.log(`    Warnings: ${result.warnings.length}`);
        console.log(`    Unused Digital Bits: ${result.conflicts.unusedDigitalBits.length}`);
        
        if (result.warnings.length === 0 || result.conflicts.unusedDigitalBits.length === 0) {
            console.log('  ❌ TEST FALLIT (hauria de generar warnings)');
        } else {
            console.log('  ✅ TEST PASSAT');
            console.log(`    Warnings detectats: ${result.warnings.length}`);
            result.warnings.slice(0, 2).forEach(w => console.log(`      - ${w}`));
        }
        console.log('');
    },
    
    /**
     * TEST 6: Múltiples conflictes alhora
     */
    testMultipleConflicts() {
        console.log('TEST 6: Múltiples conflictes');
        
        const physicalTwins = [
            {
                type: 'pont-h',
                name: 'pont-h-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {
                        motor1A: { costella: 'a', bit: 0 }  // Escriu a 0x0:a:0
                    },
                    inputMap: {
                        sensor1: { costella: 'b', bit: 0 }  // Llegeix de 0x0:b:0
                    },
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            },
            {
                type: 'cinta',
                name: 'cinta-00',
                ioConfig: {
                    vertebra: '0x0',
                    outputMap: {
                        motor2A: { costella: 'a', bit: 0 }  // També escriu a 0x0:a:0 ❌
                    },
                    inputMap: {
                        sensor2: { costella: 'b', bit: 0 }  // També llegeix de 0x0:b:0 ❌
                    },
                    analogOutputMap: {},
                    analogInputMap: {}
                }
            }
        ];
        
        const digitalTwin = {
            name: 'basic',
            vertebrae: [
                {
                    addr: '0x0',
                    type: 'digital',
                    costellaA: 'output',  // Escriu a 'a' (físics també escriuen)
                    costellaB: 'output'   // Escriu a 'b' (físics llegeixen)
                }
            ]
        };
        
        const result = window.CoherenceValidator.validate(physicalTwins, digitalTwin);
        
        console.log('  Resultat:');
        console.log(`    Valid: ${result.valid}`);
        console.log(`    Errors: ${result.errors.length}`);
        console.log(`    Warnings: ${result.warnings.length}`);
        console.log(`    Write Conflicts: ${result.conflicts.writeConflicts.length}`);
        console.log(`    Read Conflicts: ${result.conflicts.readConflicts.length}`);
        console.log(`    Unused Physical: ${result.conflicts.unusedPhysicalBits.length}`);
        console.log(`    Unused Digital: ${result.conflicts.unusedDigitalBits.length}`);
        
        if (result.valid) {
            console.log('  ❌ TEST FALLIT (hauria de detectar múltiples conflictes)');
        } else {
            console.log('  ✅ TEST PASSAT');
            console.log(`    Total conflictes: ${result.errors.length + result.warnings.length}`);
            
            const summary = window.CoherenceValidator.generateConflictSummary(result);
            console.log(`    Resum: ${summary.errors} errors, ${summary.warnings} warnings`);
        }
        console.log('');
    }
};

// Funció global per executar tests
if (typeof window !== 'undefined') {
    window.runCoherenceTests = () => {
        CoherenceValidatorTests.runAll();
    };
}

console.log('✓ CoherenceValidator tests loaded');
console.log('  Executa: window.runCoherenceTests()');
