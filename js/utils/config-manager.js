/**
 * ConfigManager - Gestor de configuració global
 * 
 * Gestiona tota la configuració de l'aplicació:
 * - Idioma (ca/es/en)
 * - Configuració MQTT
 * - Preferències UI
 * - Configuració de rendiment
 * - Persistència en LocalStorage
 */

class ConfigManager {
    constructor() {
        // Configuració per defecte
        this.defaults = {
            language: 'ca',
            theme: 'dark',
            
            mqtt: {
                broker: 'broker.emqx.io',
                port: 8084,
                protocol: 'wss',
                username: '',
                password: '',
                useAuth: false,
                reconnect: true,
                reconnectInterval: 5000
            },
            
            ui: {
                usePNGImages: false,           // Activar quan hi hagi PNG reals
                gridLayout: 'vertical',         // vertical | horizontal | grid
                autoSaveProjects: true,
                autoSaveInterval: 60000,        // 1 minut
                editorFontSize: 14,
                editorTheme: 'monokai',
                showLineNumbers: true,
                enableAutocomplete: true,
                windowPositions: {}             // Guardar posicions de finestres
            },
            
            performance: {
                mqttThrottle: 200,              // ms entre missatges MQTT
                canvasRefreshRate: 60,          // fps
                enableHistory: false,           // Històric de PLCMemory
                maxHistorySize: 100,
                debugMode: false
            },
            
            bessons: {
                lastUsed: null,                 // ID del darrer bessó usat
                defaultMappings: {}             // Mapatges per defecte per cada bessó
            }
        };

        // Configuració actual (copia profunda dels defaults)
        this.config = JSON.parse(JSON.stringify(this.defaults));
        
        // Clau per LocalStorage
        this.storageKey = 'iotv-config';
        
        // Carregar configuració guardada
        this.load();
    }

    /**
     * Obtenir valor de configuració
     * Suporta paths amb punts: get('mqtt.broker')
     */
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                console.warn(`[ConfigManager] Path not found: ${path}`);
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * Establir valor de configuració
     * Suporta paths amb punts: set('mqtt.broker', 'test.mosquitto.org')
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.config;
        
        // Navegar fins al penúltim nivell
        for (const key of keys) {
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }
        
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // Guardar automàticament
        this.save();
        
        // Emetre esdeveniment de canvi
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.CONFIG_CHANGED, {
                path,
                oldValue,
                newValue: value
            });
            
            // Eventi especial per canvi d'idioma
            if (path === 'language') {
                window.EventBus.emit(window.EventBus.EVENTS.LANGUAGE_CHANGED, {
                    oldLanguage: oldValue,
                    newLanguage: value
                });
            }
        }
        
        return true;
    }

    /**
     * Obtenir tota la configuració
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Establir múltiples valors alhora
     * @param {Object} updates - Objecte amb paths i valors
     */
    setMultiple(updates) {
        for (const [path, value] of Object.entries(updates)) {
            // Establir sense guardar (ho farem al final)
            const keys = path.split('.');
            const lastKey = keys.pop();
            let target = this.config;
            
            for (const key of keys) {
                if (!(key in target)) {
                    target[key] = {};
                }
                target = target[key];
            }
            
            target[lastKey] = value;
        }
        
        // Guardar una sola vegada
        this.save();
        
        // Emetre esdeveniment
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.CONFIG_CHANGED, {
                batch: true,
                updates
            });
        }
    }

    /**
     * Guardar configuració a LocalStorage
     */
    save() {
        try {
            const json = JSON.stringify(this.config);
            localStorage.setItem(this.storageKey, json);
            return true;
        } catch (error) {
            console.error('[ConfigManager] Error saving to LocalStorage:', error);
            return false;
        }
    }

    /**
     * Carregar configuració de LocalStorage
     */
    load() {
        try {
            const json = localStorage.getItem(this.storageKey);
            
            if (json) {
                const loaded = JSON.parse(json);
                
                // Merge amb defaults (per afegir noves opcions)
                this.config = this._deepMerge(this.defaults, loaded);
                
                console.log('[ConfigManager] Configuration loaded from LocalStorage');
                return true;
            }
        } catch (error) {
            console.error('[ConfigManager] Error loading from LocalStorage:', error);
        }
        
        return false;
    }

    /**
     * Reset a configuració per defecte
     */
    reset() {
        this.config = JSON.parse(JSON.stringify(this.defaults));
        this.save();
        
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.CONFIG_CHANGED, {
                reset: true
            });
        }
        
        console.log('[ConfigManager] Configuration reset to defaults');
    }

    /**
     * Exportar configuració a JSON
     */
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Importar configuració des de JSON
     */
    import(json) {
        try {
            const imported = typeof json === 'string' ? JSON.parse(json) : json;
            
            // Validar estructura bàsica
            if (typeof imported !== 'object') {
                throw new Error('Invalid configuration format');
            }
            
            // Merge amb defaults per seguretat
            this.config = this._deepMerge(this.defaults, imported);
            this.save();
            
            if (window.EventBus) {
                window.EventBus.emit(window.EventBus.EVENTS.CONFIG_CHANGED, {
                    imported: true
                });
            }
            
            console.log('[ConfigManager] Configuration imported');
            return true;
        } catch (error) {
            console.error('[ConfigManager] Error importing configuration:', error);
            return false;
        }
    }

    /**
     * Merge profund de dos objectes
     */
    _deepMerge(target, source) {
        const result = JSON.parse(JSON.stringify(target));
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * Obtenir configuració MQTT completa
     */
    getMQTTConfig() {
        const mqtt = this.get('mqtt');
        
        return {
            url: `${mqtt.protocol}://${mqtt.broker}:${mqtt.port}/mqtt`,
            options: {
                username: mqtt.useAuth ? mqtt.username : undefined,
                password: mqtt.useAuth ? mqtt.password : undefined,
                reconnect: mqtt.reconnect,
                reconnectPeriod: mqtt.reconnectInterval,
                clean: true,
                keepalive: 60
            }
        };
    }

    /**
     * Guardar posició de finestra
     */
    saveWindowPosition(windowId, position) {
        const positions = this.get('ui.windowPositions') || {};
        positions[windowId] = position;
        this.set('ui.windowPositions', positions);
    }

    /**
     * Obtenir posició guardada de finestra
     */
    getWindowPosition(windowId) {
        const positions = this.get('ui.windowPositions') || {};
        return positions[windowId] || null;
    }

    /**
     * Obtenir configuració d'idioma actual
     */
    getLanguage() {
        return this.get('language');
    }

    /**
     * Canviar idioma
     */
    setLanguage(lang) {
        if (['ca', 'es', 'en'].includes(lang)) {
            this.set('language', lang);
            return true;
        }
        console.warn(`[ConfigManager] Invalid language: ${lang}`);
        return false;
    }

    /**
     * Activar/desactivar mode debug
     */
    setDebugMode(enabled) {
        this.set('performance.debugMode', enabled);
        
        // Activar debug a EventBus i PLCMemory
        if (window.EventBus) {
            window.EventBus.setDebugMode(enabled);
        }
        if (window.PLCMemory) {
            window.PLCMemory.enableHistory = enabled;
        }
    }

    /**
     * Obtenir estadístiques
     */
    getStats() {
        return {
            language: this.get('language'),
            theme: this.get('theme'),
            mqttBroker: this.get('mqtt.broker'),
            debugMode: this.get('performance.debugMode'),
            autoSave: this.get('ui.autoSaveProjects'),
            storageSize: new Blob([this.export()]).size
        };
    }
}

// Crear instància global singleton
const configManager = new ConfigManager();

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.ConfigManager = configManager;
}

console.log('✓ ConfigManager loaded');
