/**
 * EventBus - Sistema centralitzat d'esdeveniments amb debouncing
 * 
 * Gestiona la comunicació entre components amb suport per:
 * - Namespaces organitzats
 * - Debouncing configurable per tipus d'esdeveniment
 * - Prioritats d'esdeveniments
 * - Wildcards per subscripcions
 */

class EventBus {
    // Definició de tots els esdeveniments del sistema
    static EVENTS = {
        // Memòria PLC
        MEMORY_DIGITAL_CHANGED: 'memory:digital:changed',
        MEMORY_ANALOG_CHANGED: 'memory:analog:changed',
        
        // Vèrtebres
        VERTEBRA_ADDED: 'vertebra:added',
        VERTEBRA_REMOVED: 'vertebra:removed',
        VERTEBRA_CONFIG_CHANGED: 'vertebra:config:changed',
        VERTEBRA_ADDRESS_CHANGED: 'vertebra:address:changed',
        
        // Costelles
        COSTELLA_MODE_CHANGED: 'costella:mode:changed',
        
        // Bessons físics
        BESSO_LOADED: 'besso:loaded',
        BESSO_UNLOADED: 'besso:unloaded',
        BESSO_STATE_CHANGED: 'besso:state:changed',
        BESSO_ERROR: 'besso:error',
        
        // UI - Finestres
        WINDOW_OPENED: 'window:opened',
        WINDOW_CLOSED: 'window:closed',
        WINDOW_MINIMIZED: 'window:minimized',
        WINDOW_MAXIMIZED: 'window:maximized',
        
        // MQTT
        MQTT_CONNECTED: 'mqtt:connected',
        MQTT_DISCONNECTED: 'mqtt:disconnected',
        MQTT_MESSAGE: 'mqtt:message',
        MQTT_ERROR: 'mqtt:error',
        
        // Configuració
        CONFIG_CHANGED: 'config:changed',
        LANGUAGE_CHANGED: 'config:language:changed',
        
        // Projectes
        PROJECT_LOADED: 'project:loaded',
        PROJECT_SAVED: 'project:saved',
        
        // Scripts
        SCRIPT_STARTED: 'script:started',
        SCRIPT_STOPPED: 'script:stopped',
        SCRIPT_ERROR: 'script:error'
    };

    // Configuració de debouncing per tipus d'esdeveniment (en ms)
    static THROTTLE_CONFIG = {
        'memory:digital:changed': 0,        // Immediat (seguretat)
        'memory:analog:changed': 50,        // 50ms (suavitza sliders)
        'vertebra:config:changed': 100,     // 100ms
        'besso:state:changed': 100,         // 100ms
        'mqtt:message': 200,                // 200ms (estalvia bandwidth)
        'window:opened': 0,                 // Immediat
        'window:closed': 0,                 // Immediat
        'config:changed': 200,              // 200ms
        'script:started': 0,                // Immediat
        'script:stopped': 0                 // Immediat
    };

    constructor() {
        this.listeners = new Map(); // event -> Set of callbacks
        this.throttleTimers = new Map(); // event -> timeout ID
        this.throttleQueues = new Map(); // event -> últim payload pendent
        this.debugMode = false;
    }

    /**
     * Subscriure's a un esdeveniment
     * @param {string} event - Nom de l'esdeveniment (suporta wildcards: 'memory:*')
     * @param {Function} callback - Funció a executar
     * @param {Object} options - Opcions: {priority: 'high'|'normal', once: boolean}
     * @returns {Function} Funció per dessubscriure
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        // Crear entrada si no existeix
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        // Wrapper per opcions
        const wrappedCallback = {
            fn: callback,
            priority: options.priority || 'normal',
            once: options.once || false
        };

        this.listeners.get(event).add(wrappedCallback);

        if (this.debugMode) {
            console.log(`[EventBus] Subscribed to "${event}"`);
        }

        // Retornar funció per dessubscriure
        return () => this.off(event, callback);
    }

    /**
     * Subscriure's a un esdeveniment (només una vegada)
     */
    once(event, callback) {
        return this.on(event, callback, { once: true });
    }

    /**
     * Dessubscriure's d'un esdeveniment
     */
    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (!listeners) return;

        // Trobar i eliminar el callback
        for (const wrapper of listeners) {
            if (wrapper.fn === callback) {
                listeners.delete(wrapper);
                if (this.debugMode) {
                    console.log(`[EventBus] Unsubscribed from "${event}"`);
                }
                break;
            }
        }

        // Netejar si no queden listeners
        if (listeners.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * Emetre un esdeveniment
     * @param {string} event - Nom de l'esdeveniment
     * @param {*} payload - Dades a enviar
     */
    emit(event, payload = null) {
        const throttleTime = EventBus.THROTTLE_CONFIG[event] || 0;

        if (throttleTime > 0) {
            this._emitThrottled(event, payload, throttleTime);
        } else {
            this._emitImmediate(event, payload);
        }
    }

    /**
     * Emetre esdeveniment amb throttling
     */
    _emitThrottled(event, payload, throttleTime) {
        // Guardar últim payload
        this.throttleQueues.set(event, payload);

        // Si ja hi ha timer actiu, no fer res (s'enviarà el darrer payload)
        if (this.throttleTimers.has(event)) {
            return;
        }

        // Crear nou timer
        const timerId = setTimeout(() => {
            const queuedPayload = this.throttleQueues.get(event);
            this.throttleQueues.delete(event);
            this.throttleTimers.delete(event);
            this._emitImmediate(event, queuedPayload);
        }, throttleTime);

        this.throttleTimers.set(event, timerId);
    }

    /**
     * Emetre esdeveniment immediatament
     */
    _emitImmediate(event, payload) {
        if (this.debugMode) {
            console.log(`[EventBus] Emit "${event}"`, payload);
        }

        // Obtenir listeners exactes
        const exactListeners = this.listeners.get(event) || new Set();
        
        // Obtenir listeners amb wildcards (ex: 'memory:*' escolta 'memory:digital:changed')
        const wildcardListeners = this._getWildcardListeners(event);
        
        // Combinar tots els listeners
        const allListeners = new Set([...exactListeners, ...wildcardListeners]);

        if (allListeners.size === 0) return;

        // Ordenar per prioritat (high primer)
        const sortedListeners = Array.from(allListeners).sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (a.priority !== 'high' && b.priority === 'high') return 1;
            return 0;
        });

        // Executar callbacks
        const toRemove = [];
        for (const wrapper of sortedListeners) {
            try {
                wrapper.fn(payload, event);
                
                // Marcar per eliminar si és 'once'
                if (wrapper.once) {
                    toRemove.push({ event, wrapper });
                }
            } catch (error) {
                console.error(`[EventBus] Error in listener for "${event}":`, error);
            }
        }

        // Eliminar listeners 'once'
        toRemove.forEach(({ event, wrapper }) => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                listeners.delete(wrapper);
            }
        });
    }

    /**
     * Obtenir listeners amb wildcards
     */
    _getWildcardListeners(event) {
        const listeners = new Set();
        
        for (const [pattern, callbacks] of this.listeners.entries()) {
            if (this._matchWildcard(pattern, event)) {
                callbacks.forEach(cb => listeners.add(cb));
            }
        }
        
        return listeners;
    }

    /**
     * Comprovar si un pattern amb wildcard coincideix amb un event
     * Exemple: 'memory:*' coincideix amb 'memory:digital:changed'
     */
    _matchWildcard(pattern, event) {
        if (!pattern || !event) return false;
        if (!pattern.includes('*')) return false;
        
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(event);
    }

    /**
     * Netejar tots els listeners
     */
    clear() {
        // Cancel·lar tots els timers pendents
        for (const timerId of this.throttleTimers.values()) {
            clearTimeout(timerId);
        }
        
        this.listeners.clear();
        this.throttleTimers.clear();
        this.throttleQueues.clear();
        
        if (this.debugMode) {
            console.log('[EventBus] Cleared all listeners');
        }
    }

    /**
     * Obtenir estadístiques de l'EventBus
     */
    getStats() {
        const stats = {
            totalEvents: this.listeners.size,
            totalListeners: 0,
            pendingThrottled: this.throttleQueues.size,
            events: {}
        };

        for (const [event, listeners] of this.listeners.entries()) {
            stats.totalListeners += listeners.size;
            stats.events[event] = listeners.size;
        }

        return stats;
    }

    /**
     * Activar/desactivar mode debug
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[EventBus] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
}

// Exportar classe i crear instància global
if (typeof window !== 'undefined') {
    window.EventBusClass = EventBus;
    window.EventBus = new EventBus();  // Instància directament
    window.eventBus = window.EventBus; // Alias
    
    // Copiar propietats estàtiques a la instància per compatibilitat
    window.EventBus.EVENTS = EventBus.EVENTS;
    window.EventBus.THROTTLE_CONFIG = EventBus.THROTTLE_CONFIG;
}

console.log('✓ EventBus loaded');
