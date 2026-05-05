/**
 * IoConfigEditor - Editor visual per configuració de cablatge IO
 * 
 * Permet editar, validar i gestionar les configuracions de cablatge
 * dels bessons digitals de manera visual i segura.
 * 
 * Funcionalitats:
 * - Editor JSON amb syntax highlighting
 * - Validació en temps real
 * - Detecció de conflictes
 * - Import/Export de configuracions
 * - Presets predefinits
 * - Persistència en localStorage
 */

class IoConfigEditor {
    constructor() {
        this.window = null;
        this.editorTextarea = null;
        this.statusElement = null;
        this.originalConfig = null;
        this.currentConfig = null;
        
        // Clau per localStorage
        this.storageKey = 'iotv-io-config';
        
        // Carregar configuració guardada o usar la del window.__ioCabling
        this.loadConfig();
    }

    /**
     * Carregar configuració (des de localStorage o default)
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.currentConfig = JSON.parse(saved);
                console.log('[IoConfigEditor] Configuration loaded from localStorage');
            } else {
                this.currentConfig = JSON.parse(JSON.stringify(window.__ioCabling || []));
            }
            this.originalConfig = JSON.parse(JSON.stringify(this.currentConfig));
        } catch (error) {
            console.error('[IoConfigEditor] Error loading config:', error);
            this.currentConfig = window.__ioCabling ? JSON.parse(JSON.stringify(window.__ioCabling)) : [];
            this.originalConfig = JSON.parse(JSON.stringify(this.currentConfig));
        }
    }

    /**
     * Obrir l'editor
     */
    open() {
        if (this.window) {
            window.windowManager.bringToFront('io-config-editor');
            return;
        }

        // Crear finestra
        this.window = window.windowManager.createWindow({
            id: 'io-config-editor',
            title: '⚙️ Editor de Configuració IO',
            width: 800,
            height: 600,
            x: 100,
            y: 100,
            minWidth: 600,
            minHeight: 500,
            onClose: () => {
                this.window = null;
            }
        });

        // Crear contingut
        this.createContent();
    }

    /**
     * Crear contingut de l'editor
     */
    createContent() {
        const content = this.window.contentElement;
        
        content.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%; background: #1e1e1e;">
                <!-- Toolbar -->
                <div style="padding: 12px; background: #2c3e50; border-bottom: 2px solid #34495e; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="btn-new" class="io-editor-btn" title="Nova configuració">
                        <span style="font-size: 16px;">📄</span> Nou
                    </button>
                    <button id="btn-load" class="io-editor-btn" title="Carregar configuració">
                        <span style="font-size: 16px;">📂</span> Carregar
                    </button>
                    <button id="btn-save" class="io-editor-btn btn-primary" title="Desar configuració">
                        <span style="font-size: 16px;">💾</span> Desar
                    </button>
                    <div style="width: 1px; background: #34495e; margin: 0 4px;"></div>
                    <button id="btn-export" class="io-editor-btn" title="Exportar JSON">
                        <span style="font-size: 16px;">📤</span> Exportar
                    </button>
                    <button id="btn-import" class="io-editor-btn" title="Importar JSON">
                        <span style="font-size: 16px;">📥</span> Importar
                    </button>
                    <div style="width: 1px; background: #34495e; margin: 0 4px;"></div>
                    <button id="btn-validate" class="io-editor-btn" title="Validar configuració">
                        <span style="font-size: 16px;">✓</span> Validar
                    </button>
                    <button id="btn-format" class="io-editor-btn" title="Formatejar JSON">
                        <span style="font-size: 16px;">🔧</span> Formatejar
                    </button>
                    <div style="flex: 1;"></div>
                    <button id="btn-presets" class="io-editor-btn" title="Carregar preset">
                        <span style="font-size: 16px;">⭐</span> Presets
                    </button>
                    <button id="btn-help" class="io-editor-btn" title="Ajuda">
                        <span style="font-size: 16px;">❓</span>
                    </button>
                </div>

                <!-- Editor area -->
                <div style="flex: 1; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
                    <div style="padding: 8px 12px; background: #252525; border-bottom: 1px solid #333; font-size: 11px; color: #888;">
                        <span style="color: #3498db;">💡 Consell:</span> Edita el JSON i prem "Desar" per aplicar els canvis. El format s'aplicarà automàticament.
                    </div>
                    
                    <div style="flex: 1; position: relative; overflow: hidden;">
                        <textarea id="io-config-textarea" 
                                  spellcheck="false"
                                  style="width: 100%; height: 100%; padding: 16px; 
                                         background: #1e1e1e; color: #ecf0f1; 
                                         border: none; outline: none; resize: none;
                                         font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                                         font-size: 13px; line-height: 1.6;
                                         tab-size: 2; -moz-tab-size: 2;"></textarea>
                    </div>
                </div>

                <!-- Status bar -->
                <div id="io-config-status" style="padding: 10px 12px; background: #2c3e50; border-top: 2px solid #34495e; 
                                                   display: flex; align-items: center; gap: 12px; font-size: 12px;">
                    <span id="status-icon" style="font-size: 16px;">⚪</span>
                    <span id="status-text" style="color: #ecf0f1;">Carregant...</span>
                    <div style="flex: 1;"></div>
                    <span id="status-info" style="color: #95a5a6;"></span>
                </div>
            </div>

            <style>
                .io-editor-btn {
                    padding: 8px 12px;
                    background: #34495e;
                    color: #ecf0f1;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .io-editor-btn:hover {
                    background: #3d566e;
                    transform: translateY(-1px);
                }

                .io-editor-btn:active {
                    transform: translateY(0);
                }

                .io-editor-btn.btn-primary {
                    background: #2ecc71;
                }

                .io-editor-btn.btn-primary:hover {
                    background: #27ae60;
                }

                #io-config-textarea::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                }

                #io-config-textarea::-webkit-scrollbar-track {
                    background: #1e1e1e;
                }

                #io-config-textarea::-webkit-scrollbar-thumb {
                    background: #555;
                    border-radius: 6px;
                }

                #io-config-textarea::-webkit-scrollbar-thumb:hover {
                    background: #666;
                }
            </style>
        `;

        // Guardar referències
        this.editorTextarea = content.querySelector('#io-config-textarea');
        this.statusElement = {
            icon: content.querySelector('#status-icon'),
            text: content.querySelector('#status-text'),
            info: content.querySelector('#status-info')
        };

        // Carregar contingut
        this.loadEditorContent();

        // Setup event listeners
        this.setupEventListeners(content);

        // Validar inicial
        this.validateConfig();
    }

    /**
     * Carregar contingut a l'editor
     */
    loadEditorContent() {
        const json = JSON.stringify(this.currentConfig, null, 2);
        this.editorTextarea.value = json;
        this.updateLineCount();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners(content) {
        // Botons toolbar
        content.querySelector('#btn-new').addEventListener('click', () => this.newConfig());
        content.querySelector('#btn-load').addEventListener('click', () => this.loadDialog());
        content.querySelector('#btn-save').addEventListener('click', () => this.saveConfig());
        content.querySelector('#btn-export').addEventListener('click', () => this.exportConfig());
        content.querySelector('#btn-import').addEventListener('click', () => this.importConfig());
        content.querySelector('#btn-validate').addEventListener('click', () => this.validateConfig());
        content.querySelector('#btn-format').addEventListener('click', () => this.formatJSON());
        content.querySelector('#btn-presets').addEventListener('click', () => this.showPresets());
        content.querySelector('#btn-help').addEventListener('click', () => this.showHelp());

        // Validar mentre s'escriu (amb debounce)
        let timeout;
        this.editorTextarea.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.validateConfig(), 500);
            this.updateLineCount();
        });

        // Suport per Tab
        this.editorTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.target.selectionStart;
                const end = e.target.selectionEnd;
                const value = e.target.value;
                e.target.value = value.substring(0, start) + '  ' + value.substring(end);
                e.target.selectionStart = e.target.selectionEnd = start + 2;
            }
        });
    }

    /**
     * Actualitzar comptador de línies
     */
    updateLineCount() {
        const lines = this.editorTextarea.value.split('\n').length;
        const chars = this.editorTextarea.value.length;
        this.statusElement.info.textContent = `${lines} línies • ${chars} caràcters`;
    }

    /**
     * Validar configuració
     */
    validateConfig() {
        try {
            const json = this.editorTextarea.value;
            const config = JSON.parse(json);

            // Validar estructura
            const validation = this.validateStructure(config);

            if (validation.valid) {
                this.showStatus('success', '✅ Configuració vàlida', validation.info);
                return true;
            } else {
                this.showStatus('error', '❌ Errors de validació', validation.errors.join(' • '));
                return false;
            }
        } catch (error) {
            this.showStatus('error', '❌ JSON invàlid', error.message);
            return false;
        }
    }

    /**
     * Validar estructura del JSON
     */
    validateStructure(config) {
        const errors = [];
        const warnings = [];
        let bessoCount = 0;
        const usedPins = new Map(); // Per detectar conflictes

        if (!Array.isArray(config)) {
            return { valid: false, errors: ['La configuració ha de ser un array'] };
        }

        config.forEach((besso, index) => {
            bessoCount++;

            // Validar name
            if (!besso.name || typeof besso.name !== 'string') {
                errors.push(`Bessó #${index + 1}: falta 'name' o no és string`);
            }

            // Validar ioConfig
            if (!besso.ioConfig || typeof besso.ioConfig !== 'object') {
                errors.push(`Bessó "${besso.name}": falta 'ioConfig'`);
                return;
            }

            const io = besso.ioConfig;

            // Validar vertebra
            if (!io.vertebra || !/^0x[0-9A-Fa-f]+$/.test(io.vertebra)) {
                errors.push(`Bessó "${besso.name}": vertebra invàlida (format: 0x0, 0x1...)`);
            }

            // Validar mapes
            ['outputMap', 'inputMap', 'analogOutputMap', 'analogInputMap'].forEach(mapName => {
                if (io[mapName] && typeof io[mapName] === 'object') {
                    Object.entries(io[mapName]).forEach(([pinName, pinConfig]) => {
                        // Validar costella
                        if (pinConfig.costella && !['a', 'b'].includes(pinConfig.costella.toLowerCase())) {
                            errors.push(`Bessó "${besso.name}", pin "${pinName}": costella ha de ser 'a' o 'b'`);
                        }

                        // Validar bit (0-7)
                        if (pinConfig.bit !== undefined) {
                            if (!Number.isInteger(pinConfig.bit) || pinConfig.bit < 0 || pinConfig.bit > 7) {
                                errors.push(`Bessó "${besso.name}", pin "${pinName}": bit ha de ser 0-7`);
                            }

                            // Detectar conflictes
                            const key = `${io.vertebra}_${pinConfig.costella}_${pinConfig.bit}`;
                            if (usedPins.has(key)) {
                                warnings.push(`Conflicte: ${key} usat a "${usedPins.get(key)}" i "${besso.name}.${pinName}"`);
                            } else {
                                usedPins.set(key, `${besso.name}.${pinName}`);
                            }
                        }

                        // Validar canal analògic (0-3)
                        if (pinConfig.canal !== undefined) {
                            if (!Number.isInteger(pinConfig.canal) || pinConfig.canal < 0 || pinConfig.canal > 3) {
                                errors.push(`Bessó "${besso.name}", pin "${pinName}": canal ha de ser 0-3`);
                            }
                        }
                    });
                }
            });
        });

        const info = `${bessoCount} bessó${bessoCount !== 1 ? 's' : ''} configurat${bessoCount !== 1 ? 's' : ''}`;

        if (warnings.length > 0) {
            return {
                valid: errors.length === 0,
                errors: [...errors, ...warnings.map(w => `⚠️ ${w}`)],
                info
            };
        }

        return {
            valid: errors.length === 0,
            errors,
            info
        };
    }

    /**
     * Mostrar estat
     */
    showStatus(type, message, detail = '') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        this.statusElement.icon.textContent = icons[type] || '⚪';
        this.statusElement.text.textContent = message;
        this.statusElement.text.style.color = colors[type] || '#ecf0f1';

        if (detail) {
            this.statusElement.text.textContent += ` - ${detail}`;
        }
    }

    /**
     * Desar configuració
     */
    saveConfig() {
        if (!this.validateConfig()) {
            this.showStatus('error', '❌ No es pot desar', 'Corregeix els errors primer');
            return;
        }

        try {
            const json = this.editorTextarea.value;
            const config = JSON.parse(json);

            // Guardar a localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(config));

            // Actualitzar window.__ioCabling
            window.__ioCabling = config;

            // Actualitzar configuració actual
            this.currentConfig = config;

            // Emetre esdeveniment
            if (window.EventBus) {
                window.EventBus.emit('IO_CONFIG_CHANGED', { config });
            }

            this.showStatus('success', '✅ Configuració desada correctament');

            // Mostrar notificació
            if (window.ConsoleOutput) {
                window.ConsoleOutput.log('✅ Configuració IO desada. Recarrega els bessons per aplicar els canvis.', 'success');
            }
        } catch (error) {
            this.showStatus('error', '❌ Error al desar', error.message);
        }
    }

    /**
     * Nova configuració
     */
    newConfig() {
        if (confirm('Crear una configuració buida? (Es perdrà el contingut actual sense desar)')) {
            this.currentConfig = [];
            this.loadEditorContent();
            this.showStatus('info', 'Nova configuració creada');
        }
    }

    /**
     * Carregar configuració
     */
    loadDialog() {
        const options = [
            { value: 'saved', label: '💾 Configuració desada' },
            { value: 'original', label: '🔄 Configuració original' },
            { value: 'current', label: '⚡ Configuració actual (window.__ioCabling)' }
        ];

        // Crear diàleg simple
        const choice = prompt('Carregar configuració:\n1 - Desada\n2 - Original\n3 - Actual\n\nTriar (1/2/3):');

        if (choice === '1') {
            this.loadConfig();
            this.loadEditorContent();
            this.showStatus('success', '💾 Configuració desada carregada');
        } else if (choice === '2') {
            this.currentConfig = JSON.parse(JSON.stringify(this.originalConfig));
            this.loadEditorContent();
            this.showStatus('success', '🔄 Configuració original carregada');
        } else if (choice === '3') {
            this.currentConfig = JSON.parse(JSON.stringify(window.__ioCabling || []));
            this.loadEditorContent();
            this.showStatus('success', '⚡ Configuració actual carregada');
        }
    }

    /**
     * Exportar configuració
     */
    exportConfig() {
        try {
            const json = this.editorTextarea.value;
            const config = JSON.parse(json);
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `io-config-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showStatus('success', '📤 Configuració exportada');
        } catch (error) {
            this.showStatus('error', '❌ Error a l\'exportar', error.message);
        }
    }

    /**
     * Importar configuració
     */
    importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = e.target.result;
                    const config = JSON.parse(json);
                    this.editorTextarea.value = JSON.stringify(config, null, 2);
                    this.validateConfig();
                    this.showStatus('success', '📥 Configuració importada');
                } catch (error) {
                    this.showStatus('error', '❌ Error a l\'importar', error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    /**
     * Formatejar JSON
     */
    formatJSON() {
        try {
            const json = this.editorTextarea.value;
            const config = JSON.parse(json);
            this.editorTextarea.value = JSON.stringify(config, null, 2);
            this.showStatus('success', '🔧 JSON formatejat');
            this.updateLineCount();
        } catch (error) {
            this.showStatus('error', '❌ No es pot formatejar', 'JSON invàlid');
        }
    }

    /**
     * Mostrar presets
     */
    showPresets() {
        const presets = this.getPresets();
        const options = presets.map((p, i) => `${i + 1} - ${p.name}: ${p.description}`).join('\n');
        const choice = prompt(`Presets disponibles:\n\n${options}\n\nTriar (número):`);

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < presets.length) {
            this.currentConfig = presets[index].config;
            this.loadEditorContent();
            this.showStatus('success', `⭐ Preset "${presets[index].name}" carregat`);
        }
    }

    /**
     * Obtenir presets
     */
    getPresets() {
        return [
            {
                name: 'Pont H bàsic',
                description: '1 pont H amb 2 motors',
                config: [
                    {
                        name: 'pont-h',
                        ioConfig: {
                            vertebra: '0x0',
                            outputMap: {
                                motor1A: { costella: 'a', bit: 0 },
                                motor1B: { costella: 'a', bit: 1 },
                                motor2A: { costella: 'a', bit: 2 },
                                motor2B: { costella: 'a', bit: 3 }
                            },
                            inputMap: {},
                            analogOutputMap: {},
                            analogInputMap: {}
                        }
                    }
                ]
            },
            {
                name: 'Cinta transportadora',
                description: 'Cinta amb motor, solenoide i sensors',
                config: [
                    {
                        name: 'cinta',
                        ioConfig: {
                            vertebra: '0x0',
                            outputMap: {
                                motorA: { costella: 'a', bit: 4 },
                                motorB: { costella: 'a', bit: 5 },
                                solenoide: { costella: 'a', bit: 6 }
                            },
                            inputMap: {
                                sensorE: { costella: 'b', bit: 5 },
                                sensorD: { costella: 'b', bit: 6 },
                                emergencia: { costella: 'b', bit: 7 }
                            },
                            analogOutputMap: {
                                velocitat: { costella: 'a', canal: 0 }
                            },
                            analogInputMap: {}
                        }
                    }
                ]
            },
            {
                name: 'Configuració completa',
                description: 'Tots els bessons disponibles',
                config: [
                    {
                        name: 'pont-h',
                        ioConfig: {
                            vertebra: '0x0',
                            outputMap: {
                                motor1A: { costella: 'a', bit: 0 },
                                motor1B: { costella: 'a', bit: 1 },
                                motor2A: { costella: 'a', bit: 2 },
                                motor2B: { costella: 'a', bit: 3 }
                            },
                            inputMap: {},
                            analogOutputMap: {},
                            analogInputMap: {}
                        }
                    },
                    {
                        name: 'pont-h2',
                        ioConfig: {
                            vertebra: '0x0',
                            outputMap: {
                                motor1A: { costella: 'a', bit: 4 },
                                motor1B: { costella: 'a', bit: 5 },
                                motor2A: { costella: 'a', bit: 6 },
                                motor2B: { costella: 'a', bit: 7 }
                            },
                            inputMap: {},
                            analogOutputMap: {},
                            analogInputMap: {}
                        }
                    },
                    {
                        name: 'cinta',
                        ioConfig: {
                            vertebra: '0x0',
                            outputMap: {
                                motorA: { costella: 'a', bit: 4 },
                                motorB: { costella: 'a', bit: 5 },
                                solenoide: { costella: 'a', bit: 6 }
                            },
                            inputMap: {
                                sensorE: { costella: 'b', bit: 5 },
                                sensorD: { costella: 'b', bit: 6 },
                                emergencia: { costella: 'b', bit: 7 }
                            },
                            analogOutputMap: {
                                velocitat: { costella: 'a', canal: 0 }
                            },
                            analogInputMap: {}
                        }
                    }
                ]
            }
        ];
    }

    /**
     * Mostrar ajuda
     */
    showHelp() {
        const helpWindow = window.windowManager.createWindow({
            id: 'io-config-help',
            title: '❓ Ajuda - Editor de Configuració IO',
            width: 600,
            height: 500,
            x: 150,
            y: 150
        });

        helpWindow.contentElement.innerHTML = `
            <div style="padding: 20px; background: #1e1e1e; color: #ecf0f1; overflow-y: auto; height: 100%; font-size: 13px; line-height: 1.6;">
                <h2 style="color: #3498db; margin-top: 0;">📘 Guia de l'Editor de Configuració IO</h2>
                
                <h3 style="color: #2ecc71;">Estructura del JSON</h3>
                <pre style="background: #2c3e50; padding: 12px; border-radius: 4px; overflow-x: auto;"><code>[
  {
    "name": "nom-del-besso",
    "ioConfig": {
      "vertebra": "0x0",
      "outputMap": { ... },
      "inputMap": { ... },
      "analogOutputMap": { ... },
      "analogInputMap": { ... }
    }
  }
]</code></pre>

                <h3 style="color: #2ecc71;">Camps obligatoris</h3>
                <ul>
                    <li><strong>name</strong>: Nom únic del bessó (string)</li>
                    <li><strong>vertebra</strong>: Adreça hexadecimal (ex: "0x0", "0x1")</li>
                    <li><strong>costella</strong>: 'a' o 'b'</li>
                    <li><strong>bit</strong>: 0-7 (per sortides/entrades digitals)</li>
                    <li><strong>canal</strong>: 0-3 (per sortides/entrades analògiques)</li>
                </ul>

                <h3 style="color: #2ecc71;">Exemple de configuració</h3>
                <pre style="background: #2c3e50; padding: 12px; border-radius: 4px; overflow-x: auto;"><code>{
  "name": "motor-esquerra",
  "ioConfig": {
    "vertebra": "0x0",
    "outputMap": {
      "forward": { "costella": "a", "bit": 0 },
      "reverse": { "costella": "a", "bit": 1 }
    },
    "inputMap": {
      "sensor": { "costella": "b", "bit": 0 }
    },
    "analogOutputMap": {
      "velocitat": { "costella": "a", "canal": 0 }
    },
    "analogInputMap": {}
  }
}</code></pre>

                <h3 style="color: #f39c12;">⚠️ Consells importants</h3>
                <ul>
                    <li>No assignis el mateix bit dues vegades (conflicte)</li>
                    <li>Usa noms descriptius pels pins</li>
                    <li>Desa sovint per no perdre canvis</li>
                    <li>Exporta configuracions importants</li>
                    <li>Prova amb "Validar" abans de desar</li>
                </ul>

                <h3 style="color: #2ecc71;">Dreceres de teclat</h3>
                <ul>
                    <li><kbd>Tab</kbd>: Afegir indentació</li>
                    <li><kbd>Ctrl+S</kbd>: Desar (des del menú)</li>
                </ul>
            </div>
        `;
    }
}

// Crear instància global
if (typeof window !== 'undefined') {
    window.IoConfigEditor = new IoConfigEditor();
}

console.log('✓ IoConfigEditor loaded');
