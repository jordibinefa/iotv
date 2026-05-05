/**
 * BessoManager v2.0 - Gestió de múltiples instàncies de bessons externs
 * 
 * CANVIS RESPECTE A v1:
 * - Suporta múltiples instàncies del mateix tipus de bessó
 * - Usa Map per gestionar instàncies actives
 * - Cada instància té el seu propi window i estat
 * - Permet reload complet des de configuració JSON
 * - Genera títols de finestra amb informació de vèrtebres/bits
 * 
 * VERSIÓ: Adaptada a PLCMemory v2 amb costats A/B dinàmics
 */

// ─── CLASSE BASE ────────────────────────────────────────────────────────────

class BaseBesso {
    /**
     * @param {HTMLElement} container - Element dins el qual renderitzar
     * @param {object} config - Configuració del bessó
     * @param {string} config.vertebra - Adreça de la vèrtebra per defecte (ex '0x0')
     * @param {object} config.outputMap - Mapeig sortides: { nomLocal: { costella, bit, vertebra? } }
     * @param {object} config.inputMap  - Mapeig entrades: { nomLocal: { costella, bit, vertebra? } }
     * @param {object} config.analogOutputMap - Mapeig sortides analògiques: { nomLocal: { costella, canal, vertebra? } }
     * @param {object} config.analogInputMap  - Mapeig entrades analògiques: { nomLocal: { costella, canal, vertebra? } }
     */
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.defaultVertebra = config.vertebra || '0x0';
        this.outputMap = config.outputMap || {};
        this.inputMap = config.inputMap || {};
        this.analogOutputMap = config.analogOutputMap || {};
        this.analogInputMap = config.analogInputMap || {};

        // Construir set de vèrtebres utilitzades (per optimitzar EventBus)
        this.usedVertebrae = this._collectUsedVertebrae();

        // Estat intern dels inputs (sensors del bessó → entrades de PLCMemory)
        this.inputState = {};
        Object.keys(this.inputMap).forEach(nom => { this.inputState[nom] = 0; });

        // Estat intern dels outputs (scripts → sortides del bessó)
        this.outputState = {};
        Object.keys(this.outputMap).forEach(nom => { this.outputState[nom] = 0; });

        this._onDigitalChanged = null;
        this._onAnalogChanged = null;
    }

    /**
     * Recollir totes les vèrtebres utilitzades (per filtrar events)
     */
    _collectUsedVertebrae() {
        const vertebrae = new Set([this.defaultVertebra]);
        
        // Afegir vèrtebres amb override de outputMap
        Object.values(this.outputMap).forEach(mapping => {
            if (mapping.vertebra) vertebrae.add(mapping.vertebra);
        });
        
        // Afegir vèrtebres amb override de inputMap
        Object.values(this.inputMap).forEach(mapping => {
            if (mapping.vertebra) vertebrae.add(mapping.vertebra);
        });
        
        // Afegir vèrtebres amb override de analogOutputMap
        Object.values(this.analogOutputMap).forEach(mapping => {
            if (mapping.vertebra) vertebrae.add(mapping.vertebra);
        });
        
        // Afegir vèrtebres amb override de analogInputMap
        Object.values(this.analogInputMap).forEach(mapping => {
            if (mapping.vertebra) vertebrae.add(mapping.vertebra);
        });
        
        return vertebrae;
    }

    /**
     * Obtenir vèrtebra per un mapping (amb fallback a default)
     */
    _getVertebra(mapping) {
        return mapping.vertebra || this.defaultVertebra;
    }

    /**
     * Inicialitzar: renderitzar i subscrir a EventBus
     */
    init() {
        this.render();
        this.subscribeEvents();
        // Llegir estat inicial de PLCMemory
        this.syncFromMemory();
    }

    /**
     * Renderitzar el contenidor visual (abstracte - subclasses implementen)
     */
    render() {
        throw new Error('BaseBesso.render() must be implemented');
    }

    /**
     * Actualitzar visual quan canvien outputs (abstracte)
     * @param {string} nom - Nom local del output canviat
     * @param {number} value - Nou valor
     */
    onOutputChanged(nom, value) {
        throw new Error('BaseBesso.onOutputChanged() must be implemented');
    }

    // ─── MAPEIG IO ──────────────────────────────────────────────────────────

    /**
     * Escriu un valor d'entrada del bessó (sensor → PLCMemory)
     */
    setInput(nom, value) {
        const mapping = this.inputMap[nom];
        if (!mapping) return;

        this.inputState[nom] = value;
        const mem = window.PLCMemory;
        if (mem) {
            const vertebra = this._getVertebra(mapping);
            mem.writeDigitalBit(vertebra, mapping.costella, mapping.bit, value ? 1 : 0);
        }
    }

    /**
     * Llegir un valor d'entrada actual
     */
    getInput(nom) {
        return this.inputState[nom] || 0;
    }

    /**
     * Llegir un valor d'output actual (des de PLCMemory)
     */
    getOutput(nom) {
        return this.outputState[nom] || 0;
    }

    // ─── SUBSCRIPCIÓ EVENTBUS ───────────────────────────────────────────────

    subscribeEvents() {
        const EB = window.EventBus;
        if (!EB) return;

        // Handler per canvis digitals
        this._onDigitalChanged = (data) => {
            const dataAddr = (data.addr || '').toUpperCase();
            
            // Sortida ràpida: Si aquesta vèrtebra no l'usa aquest bessó, ignorar
            if (!Array.from(this.usedVertebrae).some(v => v.toUpperCase() === dataAddr)) {
                return;
            }

            const byteValue = data.byte !== undefined ? data.byte : data.newValue;
            if (byteValue === undefined) return;

            Object.entries(this.outputMap).forEach(([nom, mapping]) => {
                const vertebra = this._getVertebra(mapping);
                
                // Verificar si aquest pin específic està a la vèrtebra canviada
                if (vertebra.toUpperCase() === dataAddr && data.side === mapping.costella) {
                    const val = (byteValue >> mapping.bit) & 1;
                    if (this.outputState[nom] !== val) {
                        this.outputState[nom] = val;
                        this.onOutputChanged(nom, val);
                    }
                }
            });
        };

        // Handler per canvis analògics
        this._onAnalogChanged = (data) => {
            const dataAddr = (data.addr || '').toUpperCase();
            
            // Sortida ràpida: Si aquesta vèrtebra no l'usa aquest bessó, ignorar
            if (!Array.from(this.usedVertebrae).some(v => v.toUpperCase() === dataAddr)) {
                return;
            }

            Object.entries(this.analogOutputMap).forEach(([nom, mapping]) => {
                const vertebra = this._getVertebra(mapping);
                // Convertir de canal visual (1-4) a intern (0-3)
                const canalIntern = (mapping.canal || 1) - 1;
                
                // Verificar si aquest pin específic està a la vèrtebra canviada
                if (vertebra.toUpperCase() === dataAddr && 
                    data.side === mapping.costella && 
                    (data.channel === undefined || data.channel === canalIntern)) {
                    this.onOutputChanged(nom, data.newValue);
                }
            });
        };

        EB.on(EB.EVENTS.MEMORY_DIGITAL_CHANGED, this._onDigitalChanged);
        EB.on(EB.EVENTS.MEMORY_ANALOG_CHANGED, this._onAnalogChanged);
    }

    /**
     * Sincronitzar estat des de PLCMemory (per quan es monta)
     */
    syncFromMemory() {
        const mem = window.PLCMemory;
        if (!mem) return;

        // Sincronitzar outputs digitals
        Object.entries(this.outputMap).forEach(([nom, mapping]) => {
            const vertebra = this._getVertebra(mapping);
            const val = mem.readDigitalBit(vertebra, mapping.costella, mapping.bit);
            this.outputState[nom] = val;
            this.onOutputChanged(nom, val);
        });

        // Sincronitzar outputs analògics
        Object.entries(this.analogOutputMap).forEach(([nom, mapping]) => {
            const vertebra = this._getVertebra(mapping);
            // Convertir de canal visual (1-4) a intern (0-3)
            const canalIntern = (mapping.canal || 1) - 1;
            const voltage = mem.readAnalogChannel(vertebra, mapping.costella, canalIntern);
            this.onOutputChanged(nom, voltage);
        });
    }

    // ─── CLEANUP ────────────────────────────────────────────────────────────

    destroy() {
        const EB = window.EventBus;
        if (EB) {
            if (this._onDigitalChanged) EB.off(EB.EVENTS.MEMORY_DIGITAL_CHANGED, this._onDigitalChanged);
            if (this._onAnalogChanged) EB.off(EB.EVENTS.MEMORY_ANALOG_CHANGED, this._onAnalogChanged);
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// ─── BESSO MANAGER v2.0 ─────────────────────────────────────────────────────

class BessoManager {
    constructor() {
        // Registre de tipus de bessons disponibles: { type: BessoClass }
        this.bessoTypes = {};
        
        // Instàncies actives: Map<instanceName, { besso: BaseBesso, window: windowObj }>
        this.activeInstances = new Map();

        // Flag per evitar recursió durant unload
        this._unloadingInstances = new Set();

        this.registerDefaults();
    }

    /**
     * Registrar un tipus de bessó
     * @param {string} type - Tipus de bessó (ex: 'pont-h', 'cinta')
     * @param {class} BessoClass - Classe del bessó (subclasse de BaseBesso)
     */
    registerType(type, BessoClass) {
        this.bessoTypes[type] = BessoClass;
        console.log(`✓ Bessó registrat: ${type}`);
    }

    /**
     * Carregar una instància de bessó
     * @param {string} instanceName - Nom de la instància (ex: 'pont-h-00')
     */
    load(instanceName) {
        // Si ja està actiu, només mostrar la finestra
        if (this.activeInstances.has(instanceName)) {
            const instance = this.activeInstances.get(instanceName);
            if (instance.window) {
                instance.window.focus();
            }
            return;
        }

        // Obtenir configuració completa
        let config = window.getBessoConfig(instanceName);
        if (!config) {
            console.warn(`BessoManager: no s'ha trobat configuració per "${instanceName}"`);
            return;
        }

        // Obtenir classe del bessó
        const BessoClass = this.bessoTypes[config.type];
        
        // Verificar si és un bessó "twin" (nou sistema declaratiu s9a)
        const isTwin = config.type === 'twin';
        
        if (!BessoClass && !isTwin) {
            console.warn(`BessoManager: tipus "${config.type}" no registrat`);
            return;
        }

        // Resolució de definition: inline o per twinId des de TwinsConfigManager
        if (isTwin && !config.definition && config.twinId) {
            const twinsManager = window.TwinsConfigManager;
            if (twinsManager) {
                const twinDef = twinsManager.get(config.twinId);
                if (twinDef) {
                    config = JSON.parse(JSON.stringify(config));
                    config.definition = twinDef;
                } else {
                    console.warn(`BessoManager: twinId "${config.twinId}" no trobat al catàleg`);
                    return;
                }
            }
        }

        if (isTwin && !config.definition) {
            console.warn(`BessoManager: bessó twin "${instanceName}" sense definition ni twinId vàlid`);
            return;
        }

        // Generar títol de finestra
        const title = isTwin
            ? `🔧 ${config.name}${config.definition && config.definition.meta ? ' — ' + config.definition.meta.name : ''}`
            : (window.BessoConfigValidator 
                ? window.BessoConfigValidator.generateWindowTitle(config)
                : `${config.name}`);

        // Determinar mida finestra
        const winWidth = isTwin ? 420 : 400;
        let winHeight = isTwin ? 380 : 350;
        // Ampliar finestra si té overlay
        if (isTwin && config.definition && config.definition.overlay) {
            winHeight += (config.definition.overlay.height || 150);
        }
        // Ampliar finestra si té foto sense overlay
        if (isTwin && config.definition && config.definition.photo && !config.definition.overlay) {
            winHeight += 150;
        }
        // Espai extra per checkbox toggle si té foto + overlay
        if (isTwin && config.definition && config.definition.photo && config.definition.overlay) {
            winHeight += 28;
        }

        // Crear finestra via WindowManager
        const WM = window.windowManager || window.WindowManager;
        if (!WM) {
            console.warn('BessoManager: WindowManager no disponible');
            return;
        }

        const win = WM.createWindow({
            id: `besso-${instanceName}`,
            title: title,
            width: winWidth,
            height: winHeight,
            x: 200 + (this.activeInstances.size * 30),
            y: 150 + (this.activeInstances.size * 30),
            onClose: () => {
                // Minimitzar a la taskbar en comptes de destruir
                const WM2 = window.windowManager || window.WindowManager;
                if (WM2) {
                    WM2.minimizeWindow(`besso-${instanceName}`);
                }
                return false; // Cancel·lar tancament real
            }
        });

        if (!win) {
            console.warn('BessoManager: no s\'ha pogut crear la finestra');
            return;
        }

        // Crear instància del bessó
        const container = win.contentElement || win.content || win.body || win;
        let besso;
        
        if (isTwin) {
            // Nou sistema declaratiu s9a
            besso = new window.TwinEngine(container, config.definition, config.ioConfig);
        } else {
            // Sistema clàssic (pont-h, cinta)
            besso = new BessoClass(container, instanceName);
        }
        besso.init();

        // Guardar instància activa
        this.activeInstances.set(instanceName, {
            besso: besso,
            window: win,
            config: config
        });

        // Notificar via EventBus
        const EB = window.EventBus;
        if (EB) {
            EB.emit('BESSO_LOADED', { instanceName, type: config.type });
        }

        console.log(`✓ Bessó carregat: ${instanceName} (${config.type})`);
    }

    /**
     * Desmuntar una instància específica
     * @param {string} instanceName - Nom de la instància
     */
    unload(instanceName) {
        // Guard: evitar recursió
        if (this._unloadingInstances.has(instanceName)) {
            return;
        }
        
        if (!this.activeInstances.has(instanceName)) return;
        
        // Marcar com "en procés d'unload"
        this._unloadingInstances.add(instanceName);
        
        const instance = this.activeInstances.get(instanceName);

        try {
            // 1. Destruir bessó (neteja EventBus, DOM intern)
            if (instance.besso) {
                instance.besso.destroy();
            }

            // 2. Tancar finestra (si encara existeix)
            if (instance.window) {
                const WM = window.windowManager || window.WindowManager;
                if (WM && WM.closeWindow) {
                    // Eliminar temporalment onClose per evitar recursió
                    const originalOnClose = instance.window.config?.onClose;
                    if (instance.window.config) {
                        instance.window.config.onClose = null;
                    }
                    
                    WM.closeWindow(instance.window.id || `besso-${instanceName}`);
                    
                    // Restaurar onClose (per si de cas)
                    if (instance.window.config && originalOnClose) {
                        instance.window.config.onClose = originalOnClose;
                    }
                }
            }

            // 3. Eliminar de instàncies actives
            this.activeInstances.delete(instanceName);

            // 4. Notificar
            const EB = window.EventBus;
            if (EB) {
                EB.emit('BESSO_UNLOADED', { instanceName });
            }

            console.log(`✓ Bessó desmuntat: ${instanceName}`);
        } finally {
            // Treure de la llista "en procés"
            this._unloadingInstances.delete(instanceName);
        }
    }

    /**
     * Desmuntar TOTES les instàncies actives
     */
    unloadAll() {
        console.log('🔄 Desmuntant tots els bessons...');
        
        const instanceNames = Array.from(this.activeInstances.keys());
        instanceNames.forEach(name => this.unload(name));
        
        console.log('✓ Tots els bessons desmuntats');
    }

    /**
     * Recarregar tots els bessons des de la configuració actual
     */
    reloadFromConfig() {
        console.log('🔄 Recarregant bessons des de configuració...');
        
        // 1. Desmuntar tots els bessons actius
        this.unloadAll();
        
        // 2. Obtenir configuració actual
        const configs = window.getAllBessoConfigs();
        if (!configs || configs.length === 0) {
            console.warn('⚠️ No hi ha configuracions per carregar');
            return { success: false, message: 'No hi ha configuracions definides' };
        }
        
        // 3. Validar configuració
        const validation = window.BessoConfigValidator.validate(configs);
        if (!validation.valid) {
            console.error('❌ Configuració invàlida:', validation.errors);
            return {
                success: false,
                message: 'Configuració invàlida',
                errors: validation.errors,
                warnings: validation.warnings
            };
        }
        
        if (validation.warnings.length > 0) {
            console.warn('⚠️ Warnings:', validation.warnings);
        }
        
        // 4. Carregar cada bessó (SENSE obrir finestres automàticament)
        // Les finestres s'obriran quan l'usuari cliqui al menú
        console.log(`✓ Configuració recarregada: ${configs.length} bessons disponibles`);
        
        return {
            success: true,
            message: `Configuració recarregada correctament (${configs.length} bessons)`,
            warnings: validation.warnings
        };
    }

    /**
     * Obtenir llista de bessons disponibles (per menú)
     */
    getAvailable() {
        const configs = window.getAllBessoConfigs();
        return configs.map(config => ({
            instanceName: config.name,
            type: config.type,
            title: window.BessoConfigValidator 
                ? window.BessoConfigValidator.generateWindowTitle(config)
                : config.name
        }));
    }

    /**
     * Obtenir instàncies actives
     */
    getActiveInstances() {
        return Array.from(this.activeInstances.keys());
    }

    /**
     * Verificar si una instància està activa
     */
    isActive(instanceName) {
        return this.activeInstances.has(instanceName);
    }

    /**
     * Registrar bessons per defecte
     */
    registerDefaults() {
        // Els bessons es registren des dels seus fitxers individuals
        // Aquesta funció es manté per compatibilitat
    }
}

// ─── INSTÀNCIA GLOBAL ───────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.BaseBesso = BaseBesso;
    window.BessoManager = new BessoManager();
    window.bessoManager = window.BessoManager; // alias
}

console.log('✓ BessoManager v2.0 loaded - Suport per múltiples instàncies');
