/**
 * BessoConfigEditor - Editor de configuració IO per bessó digital i altres bessons
 * 
 * Component UI que permet:
 * - PESTANYA 1: Editar altres bessons (pont-h, cinta, etc.) (JSON manual)
 * - PESTANYA 2: Editar bessó digital (IoT-Vertebrae) (preset selector + JSON)
 * - Validar configuració en temps real
 * - Validar coherència entre bessó digital i altres bessons
 * - Aplicar canvis amb reload de bessons
 * - Mostrar errors i warnings
 */

class BessoConfigEditor {
    constructor() {
        this.window = null;
        this.editorTextarea = null;
        this.currentConfig = null;
        this.currentTab = 'physical'; // 'digital', 'twins' o 'physical'
        this.currentTwinsConfig = '[]';
        this.presetEditor = null;
    }

    /**
     * Obrir finestra d'editor
     */
    open() {
        // Si ja està oberta, portar al front
        if (this.window) {
            const WM = window.windowManager || window.WindowManager;
            if (WM) {
                WM.bringToFront(this.window.id);
            }
            return;
        }

        const WM = window.windowManager || window.WindowManager;
        if (!WM) {
            console.error('WindowManager no disponible');
            return;
        }

        // Crear finestra
        this.window = WM.createWindow({
            id: 'besso-config-editor',
            title: t('bce.window_title'),
            width: 800,
            height: 700,
            x: 100,
            y: 50,
            onClose: () => {
                return this._handleClose();
            }
        });

        if (!this.window) {
            console.error('No s\'ha pogut crear la finestra');
            return;
        }

        // Renderitzar contingut
        this.render();
    }

    /**
     * Renderitzar editor amb pestanyes
     */
    render() {
        const container = this.window.contentElement || this.window.content || this.window.body;
        if (!container) return;

        // Obtenir configuració actual
        const currentConfigs = window.getAllBessoConfigs();
        this.currentConfig = JSON.stringify(currentConfigs, null, 2);
        
        // Obtenir catàleg de bessons (twins_config.json)
        if (window.TwinsConfigManager) {
            const twinsData = window.TwinsConfigManager.export();
            this.currentTwinsConfig = JSON.stringify(twinsData, null, 2);
        }

        container.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #1e1e1e;
            color: #ecf0f1;
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 0;
            box-sizing: border-box;
        `;

        container.innerHTML = `
            <!-- Pestanyes -->
            <div style="display: flex; background: #2c3e50; border-bottom: 2px solid #34495e;">
                <button 
                    id="tab-digital" 
                    class="editor-tab" 
                    data-tab="digital"
                    style="
                        flex: 1;
                        padding: 15px;
                        background: ${this.currentTab === 'digital' ? '#1e1e1e' : 'transparent'};
                        color: ${this.currentTab === 'digital' ? '#3498db' : '#95a5a6'};
                        border: none;
                        border-bottom: 3px solid ${this.currentTab === 'digital' ? '#3498db' : 'transparent'};
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s;
                    "
                >
                    ${t('bce.tab.digital')}
                </button>
                <button 
                    id="tab-twins" 
                    class="editor-tab" 
                    data-tab="twins"
                    style="
                        flex: 1;
                        padding: 15px;
                        background: ${this.currentTab === 'twins' ? '#1e1e1e' : 'transparent'};
                        color: ${this.currentTab === 'twins' ? '#3498db' : '#95a5a6'};
                        border: none;
                        border-bottom: 3px solid ${this.currentTab === 'twins' ? '#3498db' : 'transparent'};
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s;
                    "
                >
                    ${t('bce.tab.twins')}
                </button>
                <button 
                    id="tab-physical" 
                    class="editor-tab" 
                    data-tab="physical"
                    style="
                        flex: 1;
                        padding: 15px;
                        background: ${this.currentTab === 'physical' ? '#1e1e1e' : 'transparent'};
                        color: ${this.currentTab === 'physical' ? '#3498db' : '#95a5a6'};
                        border: none;
                        border-bottom: 3px solid ${this.currentTab === 'physical' ? '#3498db' : 'transparent'};
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.2s;
                    "
                >
                    ${t('bce.tab.physical')}
                </button>
            </div>

            <!-- Contingut pestanya Configura Bessons (twins_config.json) -->
            <div id="content-twins" style="flex: 1; display: ${this.currentTab === 'twins' ? 'flex' : 'none'}; flex-direction: column; overflow: hidden;">
                <div style="padding: 15px; border-bottom: 1px solid #34495e;">
                    <h3 style="margin: 0 0 10px 0; color: #3498db;">${t('bce.twins.title')}</h3>
                    <p style="margin: 0; font-size: 13px; color: #95a5a6;">
                        ${t('bce.twins.description')}
                    </p>
                </div>
                <!-- Editor JSON (flex: 1 per ocupar l'espai disponible) -->
                <div style="flex: 1; display: flex; flex-direction: column; padding: 15px; overflow: hidden;">
                    <label style="margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                        ${t('bce.twins.label')}
                    </label>
                    <div 
                        id="twins-config-cm-container" 
                        style="
                            flex: 1;
                            border: 1px solid #34495e;
                            border-radius: 6px;
                            overflow: hidden;
                        "
                    ></div>
                </div>

                <!-- Sortida de validació (fora del contenidor overflow:hidden) -->
                <div 
                    id="twins-validation-output" 
                    style="
                        display: none;
                        padding: 10px;
                        border-radius: 6px;
                        margin: 0 15px 10px 15px;
                        font-size: 13px;
                        max-height: 100px;
                        overflow-y: auto;
                        background: #2c3e50;
                        border: 1px solid #34495e;
                    "
                ></div>

                <!-- Botons: Importa + Exporta + Edita + Visor + Validació (sempre visibles a baix) -->
                <div style="padding: 0 15px 15px 15px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        id="twins-import-btn"
                        style="
                            padding: 10px 20px;
                            background: #16a085;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('twinio.import_btn')}
                    </button>
                    <button 
                        id="twins-export-btn"
                        style="
                            padding: 10px 20px;
                            background: #2980b9;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('twinio.export_btn')}
                    </button>
                    <button 
                        id="twins-preview-btn"
                        style="
                            padding: 10px 20px;
                            background: #d35400;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.twins.preview_btn')}
                    </button>
                    <button 
                        id="twins-editor-btn"
                        style="
                            padding: 10px 20px;
                            background: #e67e22;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.twins.editor_btn')}
                    </button>
                    <button 
                        id="twins-viewer-btn"
                        style="
                            padding: 10px 20px;
                            background: #8e44ad;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.viewer_btn')}
                    </button>
                    <button 
                        id="twins-validate-btn"
                        style="
                            padding: 10px 20px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.twins.validate_btn')}
                    </button>
                </div>
            </div>

            <!-- Contingut pestanya Connexió Bessons -->
            <div id="content-physical" style="flex: 1; display: ${this.currentTab === 'physical' ? 'flex' : 'none'}; flex-direction: column; overflow: hidden;">
                <div style="padding: 15px; border-bottom: 1px solid #34495e;">
                    <h3 style="margin: 0 0 10px 0; color: #3498db;">${t('bce.physical.title')}</h3>
                    <p style="margin: 0; font-size: 13px; color: #95a5a6;">
                        ${t('bce.physical.description')}
                    </p>
                </div>

                <!-- Editor JSON (flex: 1 per ocupar l'espai disponible) -->
                <div style="flex: 1; display: flex; flex-direction: column; padding: 15px; overflow: hidden;">
                    <label style="margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                        ${t('bce.physical.label')}
                    </label>
                    <div 
                        id="besso-config-cm-container" 
                        style="
                            flex: 1;
                            border: 1px solid #34495e;
                            border-radius: 6px;
                            overflow: hidden;
                        "
                    ></div>
                </div>

                <!-- Àrea de validació (fora del contenidor overflow:hidden) -->
                <div 
                    id="besso-validation-output" 
                    style="
                        max-height: 150px;
                        overflow-y: auto;
                        background: #2c3e50;
                        border: 1px solid #34495e;
                        border-radius: 6px;
                        padding: 10px;
                        margin: 0 15px 10px 15px;
                        font-size: 13px;
                        display: none;
                    "
                ></div>

                <!-- Opció de càrrega automàtica -->
                <div style="margin: 0 15px 10px 15px; padding: 10px; background: #1c2128; border-radius: 6px;">
                    <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
                        <input 
                            type="checkbox" 
                            id="besso-autoload-checkbox"
                            checked
                            style="
                                width: 18px;
                                height: 18px;
                                margin-right: 10px;
                                cursor: pointer;
                            "
                        />
                        <span style="font-size: 14px; color: #c9d1d9;">
                            ${t('bce.physical.autoload')}
                        </span>
                    </label>
                </div>

                <!-- Botons: Esquema Connexió + Edita + Visor + Validació (sempre visibles a baix) -->
                <div style="padding: 0 15px 15px 15px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        id="physical-schematic-btn"
                        style="
                            padding: 10px 20px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.physical.schematic_btn')}
                    </button>
                    <button 
                        id="physical-graphical-editor-btn"
                        style="
                            padding: 10px 20px;
                            background: #16a085;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.physical.graphical_editor_btn')}
                    </button>
                    <button 
                        id="physical-editor-btn"
                        style="
                            padding: 10px 20px;
                            background: #e67e22;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.physical.editor_btn')}
                    </button>
                    <button 
                        id="physical-viewer-btn"
                        style="
                            padding: 10px 20px;
                            background: #8e44ad;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.viewer_btn')}
                    </button>
                    <button 
                        id="besso-validate-btn"
                        style="
                            padding: 10px 20px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: background 0.2s;
                        "
                    >
                        ${t('bce.physical.validate_btn')}
                    </button>
                </div>
            </div>

            <!-- Contingut pestanya Bessó Digital -->
            <div id="content-digital" style="flex: 1; display: ${this.currentTab === 'digital' ? 'flex' : 'none'}; flex-direction: column; overflow: hidden;">
                <!-- Aquest contingut es renderitzarà dinàmicament -->
            </div>

            <!-- Botons "Valida Tot" i "Aplica Canvis" (fora de les pestanyes) -->
            <div style="padding: 15px; border-top: 2px solid #34495e; background: #1c2128; display: flex; gap: 10px;">
                <button 
                    id="validate-all-btn"
                    style="
                        flex: 1;
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 15px;
                        font-weight: 700;
                        transition: all 0.2s;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    "
                >
                    ${t('bce.validate_all_btn')}
                </button>
                <button 
                    id="besso-apply-btn"
                    style="
                        flex: 1;
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 15px;
                        font-weight: 700;
                        transition: all 0.2s;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    "
                >
                    ${t('bce.apply_btn')}
                </button>
            </div>
        `;

        // Inicialitzar components
        this._setupPhysicalTab(container);
        this._setupDigitalTab(container);
        this._setupTwinsTab(container);
        this._setupTabSwitching(container);
        this._setupValidateAll(container);
        this._setupApplyButton(container);
    }

    /**
     * Configurar pestanya d'altres bessons
     */
    _setupPhysicalTab(container) {
        // Referència a elements
        const cmContainer = container.querySelector('#besso-config-cm-container');
        this.autoloadCheckbox = container.querySelector('#besso-autoload-checkbox');
        const validateBtn = container.querySelector('#besso-validate-btn');
        const viewerBtn = container.querySelector('#physical-viewer-btn');
        const schematicBtn = container.querySelector('#physical-schematic-btn');
        const editorBtn = container.querySelector('#physical-editor-btn');
        const graphicalEditorBtn = container.querySelector('#physical-graphical-editor-btn');
        const validationOutput = container.querySelector('#besso-validation-output');

        // Inicialitzar CodeMirror per JSON
        this._initPhysicalCM(cmContainer);

        // Event listeners
        validateBtn.addEventListener('click', () => {
            this.validate(validationOutput);
        });
        
        viewerBtn.addEventListener('click', () => {
            const jsonText = this.editorTextarea ? this.editorTextarea.value : '[]';
            if (window.JsonViewer) {
                window.JsonViewer.open(jsonText, 'bce.viewer.window_title_physical');
            }
        });

        if (schematicBtn) {
            schematicBtn.addEventListener('click', () => this.showConnectionSchematic());
            schematicBtn.addEventListener('mouseenter', () => { schematicBtn.style.background = '#219a52'; });
            schematicBtn.addEventListener('mouseleave', () => { schematicBtn.style.background = '#27ae60'; });
        }

        if (graphicalEditorBtn) {
            graphicalEditorBtn.addEventListener('click', () => {
                if (window.GraphicalEditor) {
                    window.GraphicalEditor.open(this);
                }
            });
            graphicalEditorBtn.addEventListener('mouseenter', () => { graphicalEditorBtn.style.background = '#128a73'; });
            graphicalEditorBtn.addEventListener('mouseleave', () => { graphicalEditorBtn.style.background = '#16a085'; });
        }

        if (editorBtn) {
            editorBtn.addEventListener('click', () => {
                this._openPhysicalVisualEditor();
            });
            editorBtn.addEventListener('mouseenter', () => { editorBtn.style.background = '#cf6d17'; });
            editorBtn.addEventListener('mouseleave', () => { editorBtn.style.background = '#e67e22'; });
        }

        // Hover effects
        validateBtn.addEventListener('mouseenter', () => { validateBtn.style.background = '#2980b9'; });
        validateBtn.addEventListener('mouseleave', () => { validateBtn.style.background = '#3498db'; });
        viewerBtn.addEventListener('mouseenter', () => { viewerBtn.style.background = '#7d3c98'; });
        viewerBtn.addEventListener('mouseleave', () => { viewerBtn.style.background = '#8e44ad'; });
    }

    async _initPhysicalCM(cmContainer) {
        if (!window.CodeEditorManager) return;
        try {
            this._physicalCM = await window.CodeEditorManager.create(cmContainer, {
                language: 'json',
                initialValue: this.currentConfig || '[]',
                lint: true
            });
            // Compatibilitat: mantenir this.editorTextarea com a wrapper
            this.editorTextarea = {
                get value() { return this._cm.getValue(); },
                set value(v) { this._cm.setValue(v); },
                _cm: this._physicalCM
            };
        } catch (err) {
            console.error('[BessoConfigEditor] Error inicialitzant CM physical:', err);
        }
    }

    /**
     * Configurar pestanya de bessó digital
     */
    _setupDigitalTab(container) {
        const digitalContent = container.querySelector('#content-digital');
        
        // Crear component d'editor de preset
        this.presetEditor = new window.PresetEditorComponent();
        this.presetEditor.render(digitalContent);
    }

    /**
     * Configurar pestanya Configura Bessons (twins_config.json)
     */
    _setupTwinsTab(container) {
        const cmContainer = container.querySelector('#twins-config-cm-container');
        const validateBtn = container.querySelector('#twins-validate-btn');
        const viewerBtn = container.querySelector('#twins-viewer-btn');
        const editorBtn = container.querySelector('#twins-editor-btn');
        const importBtn = container.querySelector('#twins-import-btn');
        const exportBtn = container.querySelector('#twins-export-btn');
        const validationOutput = container.querySelector('#twins-validation-output');

        // Inicialitzar CodeMirror per JSON
        this._initTwinsCM(cmContainer);

        // Botó Importa Bessó
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                if (window.TwinIO) window.TwinIO.importTwin();
            });
            importBtn.addEventListener('mouseenter', () => { importBtn.style.background = '#138d75'; });
            importBtn.addEventListener('mouseleave', () => { importBtn.style.background = '#16a085'; });
        }

        // Botó Exporta Bessó
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (window.TwinIO) window.TwinIO.exportTwin();
            });
            exportBtn.addEventListener('mouseenter', () => { exportBtn.style.background = '#2176a8'; });
            exportBtn.addEventListener('mouseleave', () => { exportBtn.style.background = '#2980b9'; });
        }

        // Botó Vista Prèvia
        const previewBtn = container.querySelector('#twins-preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this._openTwinPreview();
            });
            previewBtn.addEventListener('mouseenter', () => { previewBtn.style.background = '#b84500'; });
            previewBtn.addEventListener('mouseleave', () => { previewBtn.style.background = '#d35400'; });
        }

        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                this.validateTwins(validationOutput);
            });
            validateBtn.addEventListener('mouseenter', () => { validateBtn.style.background = '#2980b9'; });
            validateBtn.addEventListener('mouseleave', () => { validateBtn.style.background = '#3498db'; });
        }
        
        if (viewerBtn) {
            viewerBtn.addEventListener('click', () => {
                const jsonText = this.twinsTextarea ? this.twinsTextarea.value : '[]';
                if (window.JsonViewer) {
                    window.JsonViewer.open(jsonText, 'bce.viewer.window_title_twins');
                }
            });
            viewerBtn.addEventListener('mouseenter', () => { viewerBtn.style.background = '#7d3c98'; });
            viewerBtn.addEventListener('mouseleave', () => { viewerBtn.style.background = '#8e44ad'; });
        }
        
        if (editorBtn) {
            editorBtn.addEventListener('click', () => {
                this._openTwinsVisualEditor();
            });
            editorBtn.addEventListener('mouseenter', () => { editorBtn.style.background = '#cf6d17'; });
            editorBtn.addEventListener('mouseleave', () => { editorBtn.style.background = '#e67e22'; });
        }
    }

    async _initTwinsCM(cmContainer) {
        if (!window.CodeEditorManager) return;
        try {
            this._twinsCM = await window.CodeEditorManager.create(cmContainer, {
                language: 'json',
                initialValue: this.currentTwinsConfig || '[]',
                lint: true
            });
            // Compatibilitat: mantenir this.twinsTextarea com a wrapper
            this.twinsTextarea = {
                get value() { return this._cm.getValue(); },
                set value(v) { this._cm.setValue(v); },
                _cm: this._twinsCM
            };
        } catch (err) {
            console.error('[BessoConfigEditor] Error inicialitzant CM twins:', err);
        }
    }

    /**
     * Validar JSON de twins_config
     */
    validateTwins(outputElement) {
        if (!outputElement) return { valid: false, errors: ['No output element'] };
        const jsonText = this.twinsTextarea ? this.twinsTextarea.value : '[]';
        
        outputElement.style.display = 'block';
        
        try {
            const parsed = JSON.parse(jsonText);
            
            if (!Array.isArray(parsed)) {
                outputElement.style.background = '#2c1810';
                outputElement.innerHTML = `<div style="color: #e74c3c; font-weight: 600;">❌ ${this.escapeHtml(t('bce.twins.err_not_array'))}</div>`;
                return { valid: false, errors: ['Not an array'] };
            }
            
            const errors = [];
            const warnings = [];
            const twinIds = new Set();
            
            parsed.forEach((entry, i) => {
                if (!entry.twinId) {
                    errors.push(t('bce.twins.err_missing_twinid', {index: i}));
                } else if (twinIds.has(entry.twinId)) {
                    errors.push(t('bce.twins.err_duplicate_twinid', {index: i, twinId: entry.twinId}));
                } else {
                    twinIds.add(entry.twinId);
                }
                
                if (!entry.meta || !entry.meta.name) {
                    warnings.push(t('bce.twins.warn_missing_name', {index: i, twinId: entry.twinId || '?'}));
                }
                
                if (!entry.components || !Array.isArray(entry.components) || entry.components.length === 0) {
                    errors.push(t('bce.twins.err_missing_components', {index: i, twinId: entry.twinId || '?'}));
                } else {
                    const validTypes = ['led', 'switch', 'gauge', 'slider'];
                    entry.components.forEach((comp, j) => {
                        if (!comp.id) errors.push(t('bce.twins.err_component_no_id', {compIndex: j, twinId: entry.twinId}));
                        if (!comp.type || !validTypes.includes(comp.type)) {
                            errors.push(t('bce.twins.err_component_invalid_type', {compIndex: j, twinId: entry.twinId, compType: comp.type, validTypes: validTypes.join(', ')}));
                        }
                        if (!comp.binding || (!comp.binding.fromPLC && !comp.binding.toPLC)) {
                            errors.push(t('bce.twins.err_component_no_binding', {compIndex: j, twinId: entry.twinId}));
                        }
                    });
                }
            });
            
            if (errors.length > 0) {
                let html = `<div style="color: #e74c3c; font-weight: 600;">❌ ${this.escapeHtml(t('bce.errors_label'))}</div>`;
                html += '<ul style="margin: 5px 0; padding-left: 20px;">';
                errors.forEach(e => html += `<li style="color: #e74c3c; margin: 3px 0;">${this.escapeHtml(e)}</li>`);
                html += '</ul>';
                if (warnings.length > 0) {
                    html += `<div style="color: #f39c12; font-weight: 600; margin-top:5px;">${this.escapeHtml(t('bce.warnings_label_short'))}</div><ul style="margin:5px 0;padding-left:20px;">`;
                    warnings.forEach(w => html += `<li style="color:#f39c12;margin:3px 0;">${this.escapeHtml(w)}</li>`);
                    html += '</ul>';
                }
                outputElement.style.background = '#2c1810';
                outputElement.innerHTML = html;
                return { valid: false, errors };
            }
            
            let html = `<div style="color: #27ae60; font-weight: 600;">${this.escapeHtml(t('bce.twins.valid_count', {count: parsed.length}))}</div>`;
            if (warnings.length > 0) {
                html += `<div style="color: #f39c12; margin-top:5px;">${this.escapeHtml(t('bce.warnings_label_short'))}</div><ul style="margin:5px 0;padding-left:20px;">`;
                warnings.forEach(w => html += `<li style="color:#f39c12;margin:3px 0;">${this.escapeHtml(w)}</li>`);
                html += '</ul>';
            }
            outputElement.style.background = '#1a2c1a';
            outputElement.innerHTML = html;
            return { valid: true, parsed, warnings };
            
        } catch (e) {
            outputElement.style.background = '#2c1810';
            outputElement.innerHTML = `<div style="color: #e74c3c; font-weight: 600;">${this.escapeHtml(t('bce.twins.err_invalid_json', {message: e.message}))}</div>`;
            return { valid: false, errors: [e.message] };
        }
    }

    /**
     * Configurar canvi de pestanyes
     */
    _setupTabSwitching(container) {
        const tabs = container.querySelectorAll('.editor-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchTab(targetTab);
            });
            
            // Hover effect
            tab.addEventListener('mouseenter', () => {
                if (tab.dataset.tab !== this.currentTab) {
                    tab.style.background = '#34495e';
                }
            });
            tab.addEventListener('mouseleave', () => {
                if (tab.dataset.tab !== this.currentTab) {
                    tab.style.background = 'transparent';
                }
            });
        });
    }

    /**
     * Canviar de pestanya
     */
    switchTab(tabName) {
        if (!this.window) return;
        this.currentTab = tabName;
        
        const container = this.window.contentElement || this.window.content || this.window.body;
        if (!container) return;
        
        const tabs = ['digital', 'twins', 'physical'];
        tabs.forEach(t => {
            const btn = container.querySelector(`#tab-${t}`);
            const content = container.querySelector(`#content-${t}`);
            if (btn) {
                const active = t === tabName;
                btn.style.background = active ? '#1e1e1e' : 'transparent';
                btn.style.color = active ? '#3498db' : '#95a5a6';
                btn.style.borderBottom = active ? '3px solid #3498db' : '3px solid transparent';
            }
            if (content) {
                content.style.display = t === tabName ? 'flex' : 'none';
            }
        });
    }

    /**
     * Configurar botó "Valida Tot"
     */
    _setupValidateAll(container) {
        const validateAllBtn = container.querySelector('#validate-all-btn');
        
        validateAllBtn.addEventListener('click', () => {
            this.validateAll();
        });
        
        // Hover effect
        validateAllBtn.addEventListener('mouseenter', () => {
            validateAllBtn.style.transform = 'translateY(-2px)';
            validateAllBtn.style.boxShadow = '0 6px 10px rgba(0,0,0,0.4)';
        });
        validateAllBtn.addEventListener('mouseleave', () => {
            validateAllBtn.style.transform = 'translateY(0)';
            validateAllBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        });
    }

    /**
     * Configurar botó "Aplica Canvis"
     */
    _setupApplyButton(container) {
        const applyBtn = container.querySelector('#besso-apply-btn');
        const validationOutput = container.querySelector('#besso-validation-output');
        
        applyBtn.addEventListener('click', () => {
            this.applyChanges(validationOutput);
        });
        
        // Hover effect
        applyBtn.addEventListener('mouseenter', () => {
            applyBtn.style.transform = 'translateY(-2px)';
            applyBtn.style.boxShadow = '0 6px 10px rgba(0,0,0,0.4)';
        });
        applyBtn.addEventListener('mouseleave', () => {
            applyBtn.style.transform = 'translateY(0)';
            applyBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        });
    }

    /**
     * Validar TOT: físics + digital + coherència
     */
    validateAll() {
        const results = {
            physical: null,
            digital: null,
            twins: null,
            coherence: null
        };
        
        // 1. Validar configuració bessons (twins_config.json)
        const twinsOutput = (this.window.contentElement || this.window.content || this.window.body).querySelector('#twins-validation-output');
        results.twins = this.validateTwins(twinsOutput);
        
        // 2. Validar connexió bessons (others_config.json)
        const physicalJSON = this.editorTextarea.value;
        results.physical = window.BessoConfigValidator.validateJSON(physicalJSON);
        
        // 3. Validar preset digital
        const container = this.window.contentElement || this.window.content || this.window.body;
        const digitalValidationOutput = container.querySelector('#preset-validation-output');
        results.digital = window.VertebraeConfigValidator.validateJSON(
            this.presetEditor.editorTextarea.value
        );
        
        // 4. Validar coherència (només si connexió i digital són vàlids)
        if (results.physical.valid && results.digital.valid) {
            results.coherence = window.CoherenceValidator.validate(
                results.physical.parsed,
                results.digital.parsed
            );
        } else {
            results.coherence = {
                valid: false,
                errors: [t('bce.coherence.cannot_validate')],
                warnings: [],
                conflicts: {}
            };
        }
        
        // Mostrar resultats en una finestra modal
        this._showValidationResults(results);
    }

    /**
     * Mostrar resultats de validació en finestra modal
     */
    _showValidationResults(results) {
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;
        
        // Crear finestra de resultats
        const resultsWindow = WM.createWindow({
            id: 'validation-results',
            title: t('bce.results.window_title'),
            width: 700,
            height: 600,
            x: 150,
            y: 100
        });
        
        if (!resultsWindow) return;
        
        const container = resultsWindow.contentElement || resultsWindow.content || resultsWindow.body;
        
        // Generar HTML de resultats
        let html = `
            <div style="
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #1e1e1e;
                color: #ecf0f1;
                font-family: 'Segoe UI', Arial, sans-serif;
                overflow-y: auto;
            ">
        `;
        
        // Resum general
        const allValid = results.physical.valid && results.digital.valid && results.coherence.valid;
        html += `
            <div style="padding: 20px; border-bottom: 2px solid #34495e; background: ${allValid ? '#1e4620' : '#4a1e1e'};">
                <h2 style="margin: 0; color: ${allValid ? '#27ae60' : '#e74c3c'};">
                    ${allValid ? this.escapeHtml(t('bce.results.all_valid')) : this.escapeHtml(t('bce.results.has_errors'))}
                </h2>
            </div>
        `;
        
        // Secció 1: Bessó Digital
        html += this._generateValidationSection(
            t('bce.results.section_digital'),
            results.digital,
            '#9b59b6'
        );

        // Secció 2: Configura Bessons
        html += this._generateValidationSection(
            t('bce.results.section_twins'),
            results.twins,
            '#e67e22'
        );
        
        // Secció 3: Connexió Bessons
        html += this._generateValidationSection(
            t('bce.results.section_physical'),
            results.physical,
            '#3498db'
        );
        
        // Secció 4: Coherència
        html += this._generateCoherenceSection(results.coherence);
        
        html += '</div>';
        
        container.innerHTML = html;
    }

    /**
     * Generar HTML per secció de validació
     */
    _generateValidationSection(title, validation, color) {
        let html = `
            <div style="padding: 20px; border-bottom: 1px solid #34495e;">
                <h3 style="margin: 0 0 15px 0; color: ${color};">${title}</h3>
        `;
        
        if (validation.valid) {
            html += `<div style="color: #27ae60; font-weight: 600; margin-bottom: 10px;">${this.escapeHtml(t('bce.config_valid'))}</div>`;
        } else {
            html += `<div style="color: #e74c3c; font-weight: 600; margin-bottom: 10px;">${this.escapeHtml(t('bce.config_invalid'))}</div>`;
            
            if (validation.errors && validation.errors.length > 0) {
                html += `<div style="margin-top: 10px;"><strong style="color: #e74c3c;">${this.escapeHtml(t('bce.errors_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
                validation.errors.forEach(err => {
                    html += `<li style="color: #e74c3c; margin: 3px 0;">${this.escapeHtml(err)}</li>`;
                });
                html += '</ul></div>';
            }
        }
        
        if (validation.warnings && validation.warnings.length > 0) {
            html += `<div style="margin-top: 10px;"><strong style="color: #f39c12;">${this.escapeHtml(t('bce.warnings_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
            validation.warnings.forEach(warn => {
                html += `<li style="color: #f39c12; margin: 3px 0;">${this.escapeHtml(warn)}</li>`;
            });
            html += '</ul></div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Generar HTML per secció de coherència
     */
    _generateCoherenceSection(coherence) {
        let html = `
            <div style="padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #e67e22;">${this.escapeHtml(t('bce.results.section_coherence'))}</h3>
        `;
        
        if (coherence.valid) {
            html += `<div style="color: #27ae60; font-weight: 600; margin-bottom: 10px;">${this.escapeHtml(t('bce.results.no_conflicts'))}</div>`;
        } else {
            html += `<div style="color: #e74c3c; font-weight: 600; margin-bottom: 10px;">${this.escapeHtml(t('bce.results.has_conflicts'))}</div>`;
        }
        
        // Errors
        if (coherence.errors && coherence.errors.length > 0) {
            html += `<div style="margin-top: 15px;"><strong style="color: #e74c3c;">${this.escapeHtml(t('bce.results.errors_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
            coherence.errors.forEach(err => {
                html += `<li style="color: #e74c3c; margin: 5px 0; line-height: 1.5;">${this.escapeHtml(err)}</li>`;
            });
            html += '</ul></div>';
        }
        
        // Warnings
        if (coherence.warnings && coherence.warnings.length > 0) {
            html += `<div style="margin-top: 15px;"><strong style="color: #f39c12;">${this.escapeHtml(t('bce.results.warnings_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
            coherence.warnings.forEach(warn => {
                html += `<li style="color: #f39c12; margin: 5px 0; line-height: 1.5;">${this.escapeHtml(warn)}</li>`;
            });
            html += '</ul></div>';
        }
        
        // Resum de conflictes
        if (coherence.conflicts) {
            const summary = window.CoherenceValidator.generateConflictSummary(coherence);
            
            if (summary.total > 0) {
                html += '<div style="margin-top: 20px; padding: 15px; background: #2c3e50; border-radius: 6px;">';
                html += `<strong style="color: #ecf0f1;">${this.escapeHtml(t('bce.results.conflict_summary'))}</strong><br/>`;
                html += `<div style="margin-top: 10px; font-size: 14px; color: #95a5a6;">`;
                html += `${this.escapeHtml(t('bce.results.total_conflicts', {total: summary.total}))}<br/>`;
                html += `${this.escapeHtml(t('bce.results.error_count', {count: summary.errors}))}<br/>`;
                html += `${this.escapeHtml(t('bce.results.warning_count', {count: summary.warnings}))}`;
                html += '</div></div>';
            }
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Validar configuració
     */
    validate(outputElement) {
        const jsonText = this.editorTextarea.value;
        
        // Validar JSON
        const validation = window.BessoConfigValidator.validateJSON(jsonText);
        
        // Mostrar resultats
        outputElement.style.display = 'block';
        
        if (validation.valid) {
            // Configuració vàlida
            let html = `<div style="color: #27ae60; font-weight: 600; margin-bottom: 8px;">${this.escapeHtml(t('bce.config_valid'))}</div>`;
            
            if (validation.warnings.length > 0) {
                html += `<div style="margin-top: 10px;"><strong style="color: #f39c12;">${this.escapeHtml(t('bce.warnings_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
                validation.warnings.forEach(warn => {
                    html += `<li style="color: #f39c12; margin: 3px 0;">${this.escapeHtml(warn)}</li>`;
                });
                html += '</ul></div>';
            }
            
            outputElement.innerHTML = html;
        } else {
            // Configuració invàlida
            let html = `<div style="color: #e74c3c; font-weight: 600; margin-bottom: 8px;">${this.escapeHtml(t('bce.config_invalid'))}</div>`;
            html += `<div><strong style="color: #e74c3c;">${this.escapeHtml(t('bce.errors_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
            
            validation.errors.forEach(err => {
                html += `<li style="color: #e74c3c; margin: 3px 0;">${this.escapeHtml(err)}</li>`;
            });
            html += '</ul></div>';
            
            if (validation.warnings.length > 0) {
                html += `<div style="margin-top: 10px;"><strong style="color: #f39c12;">${this.escapeHtml(t('bce.warnings_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
                validation.warnings.forEach(warn => {
                    html += `<li style="color: #f39c12; margin: 3px 0;">${this.escapeHtml(warn)}</li>`;
                });
                html += '</ul></div>';
            }
            
            outputElement.innerHTML = html;
        }
        
        return validation.valid;
    }

    /**
     * Aplicar canvis amb confirmació
     */
    applyChanges(outputElement) {
        const jsonText = this.editorTextarea.value;
        
        // Validar primer
        const validation = window.BessoConfigValidator.validateJSON(jsonText);
        
        if (!validation.valid) {
            // Mostrar errors
            this.validate(outputElement);
            return;
        }

        // Comprovar si s'ha modificat el bessó digital
        // Sempre aplicar el preset digital per garantir regeneració del canvas
        const digitalModified = true;
        
        // Verificar si s'ha de carregar automàticament
        const shouldAutoload = this.autoloadCheckbox && this.autoloadCheckbox.checked;

        // Mostrar popup de confirmació
        const confirmed = this.showConfirmationDialog(validation.warnings, shouldAutoload, digitalModified);
        
        if (!confirmed) {
            return;
        }

        // Si s'ha modificat el bessó digital, aplicar canvis
        if (digitalModified) {
            const digitalPreset = this.presetEditor.getEditedPreset();
            
            if (!digitalPreset) {
                outputElement.style.display = 'block';
                outputElement.innerHTML = `<div style="color: #e74c3c; font-weight: 600;">${this.escapeHtml(t('bce.apply.preset_invalid'))}</div>`;
                return;
            }
            
            // Validar preset digital
            const digitalValidation = window.VertebraeConfigValidator.validate(digitalPreset);
            
            if (!digitalValidation.valid) {
                outputElement.style.display = 'block';
                let html = `<div style="color: #e74c3c; font-weight: 600;">${this.escapeHtml(t('bce.apply.preset_errors'))}</div>`;
                html += '<ul style="margin: 5px 0; padding-left: 20px;">';
                digitalValidation.errors.forEach(err => {
                    html += `<li style="color: #e74c3c; margin: 3px 0;">${this.escapeHtml(err)}</li>`;
                });
                html += '</ul>';
                outputElement.innerHTML = html;
                return;
            }
            
            // Carregar preset digital
            const loaded = window.VertebraeConfig.loadCustom(digitalPreset);
            
            if (!loaded) {
                outputElement.style.display = 'block';
                outputElement.innerHTML = `<div style="color: #e74c3c; font-weight: 600;">${this.escapeHtml(t('bce.apply.preset_load_error'))}</div>`;
                return;
            }
            
            // Reinicialitzar PLCMemory amb la nova configuració
            if (window.PLCMemory) {
                window.PLCMemory.reset();
                digitalPreset.vertebrae.forEach(v => {
                    if (v.type === 'digital') {
                        window.PLCMemory.addDigitalVertebra(v.addr);
                    } else if (v.type === 'analog') {
                        window.PLCMemory.addAnalogVertebra(v.addr);
                    }
                });
                console.log('[BessoConfigEditor] PLCMemory reinicialitzat amb nova configuració');
            }
            
            // Actualitzar canvas del bessó digital si està obert
            if (window.app && window.app.canvasTwin && window.app.canvasTwin.setVertebraeConfig) {
                window.app.canvasTwin.setVertebraeConfig(digitalPreset);
            }
            
            // Tancar i reiniciar bessó digital si està actiu
            if (window.digitalTwinWindow) {
                try {
                    window.digitalTwinWindow.close();
                    window.digitalTwinWindow = null;
                } catch (e) {
                    console.warn('Error tancant bessó digital:', e);
                }
            }
            
            // Informar a l'usuari
            outputElement.style.display = 'block';
            outputElement.innerHTML = `
                <div style="color: #27ae60; font-weight: 600;">
                    ${this.escapeHtml(t('bce.apply.preset_updated'))}
                </div>
            `;
        }

        // Aplicar canvis al catàleg de bessons (twins_config.json)
        try {
            if (this.twinsTextarea && window.TwinsConfigManager) {
                const twinsData = JSON.parse(this.twinsTextarea.value);
                window.TwinsConfigManager.load(twinsData);
            }
        } catch (e) {
            console.warn('Error aplicant twins config:', e.message);
        }

        // Aplicar canvis als altres bessons
        try {
            // Actualitzar configuració global
            window.updateIoCabling(validation.parsed);
            
            // Recarregar bessons
            const result = window.BessoManager.reloadFromConfig();
            
            if (result.success) {
                // Èxit
                outputElement.style.display = 'block';
                let html = '<div style="color: #27ae60; font-weight: 600;">✅ ' + result.message + '</div>';
                
                if (result.warnings && result.warnings.length > 0) {
                    html += `<div style="margin-top: 10px;"><strong style="color: #f39c12;">${this.escapeHtml(t('bce.warnings_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
                    result.warnings.forEach(warn => {
                        html += `<li style="color: #f39c12; margin: 3px 0;">${this.escapeHtml(warn)}</li>`;
                    });
                    html += '</ul></div>';
                }
                
                // Carregar bessons automàticament si l'opció està activada
                if (shouldAutoload) {
                    const configs = window.getAllBessoConfigs();
                    const loadedCount = configs.length;
                    
                    html += `<div style="margin-top: 10px; color: #3498db;">${this.escapeHtml(t('bce.apply.loading_twins', {count: loadedCount}))}</div>`;
                    outputElement.innerHTML = html;
                    
                    // Carregar cada bessó amb un petit delay per evitar sobrecàrrega
                    configs.forEach((config, index) => {
                        setTimeout(() => {
                            try {
                                window.BessoManager.load(config.name);
                            } catch (error) {
                                console.error(`Error carregant ${config.name}:`, error);
                            }
                        }, index * 100); // 100ms de delay entre cada un
                    });
                    
                    // Actualitzar missatge després d'intentar carregar tots
                    setTimeout(() => {
                        const activeCount = window.BessoManager.getActiveInstances().length;
                        html += `<div style="margin-top: 5px; color: #27ae60;">${this.escapeHtml(t('bce.apply.twins_loaded', {active: activeCount, total: loadedCount}))}</div>`;
                        outputElement.innerHTML = html;
                    }, configs.length * 100 + 200);
                }
                
                outputElement.innerHTML = html;
                
                // Actualitzar textarea amb configuració aplicada
                this.currentConfig = jsonText;
            } else {
                // Error en reload
                outputElement.style.display = 'block';
                let html = `<div style="color: #e74c3c; font-weight: 600;">${this.escapeHtml(t('bce.apply.error'))}</div>`;
                
                if (result.errors && result.errors.length > 0) {
                    html += `<div><strong style="color: #e74c3c;">${this.escapeHtml(t('bce.errors_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
                    result.errors.forEach(err => {
                        html += `<li style="color: #e74c3c; margin: 3px 0;">${this.escapeHtml(err)}</li>`;
                    });
                    html += '</ul></div>';
                }
                
                outputElement.innerHTML = html;
            }
        } catch (error) {
            outputElement.style.display = 'block';
            outputElement.innerHTML = `<div style="color: #e74c3c; font-weight: 600;">${this.escapeHtml(t('bce.apply.error_generic', {message: error.message}))}</div>`;
        }
    }

    /**
     * Mostrar diàleg de confirmació
     */
    showConfirmationDialog(warnings, shouldAutoload = false, digitalModified = false) {
        let message = t('bce.confirm.reload_warning') + '\n\n';
        message += t('bce.confirm.state_loss') + '\n\n';
        
        if (digitalModified) {
            message += t('bce.confirm.digital_modified') + '\n';
            message += t('bce.confirm.digital_reopen') + '\n\n';
        }
        
        if (warnings.length > 0) {
            message += t('bce.confirm.warnings_detected') + '\n';
            warnings.forEach(warn => {
                message += `  • ${warn}\n`;
            });
            message += '\n';
        }
        
        if (shouldAutoload) {
            const configs = window.getAllBessoConfigs();
            message += t('bce.confirm.autoload_count', {count: configs.length}) + '\n\n';
        }
        
        message += t('bce.confirm.continue');
        
        return confirm(message);
    }

    /**
     * Escapar HTML per evitar XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // =====================================================================
    // Editor visual de Configura Bessons (twins_config.json)
    // =====================================================================

    /**
     * Obrir l'editor visual de twins_config en una finestra nova
     */
    _openTwinsVisualEditor() {
        const WM = window.windowManager || window.WindowManager;
        if (!WM) {
            console.error('[BessoConfigEditor] WindowManager no disponible');
            return;
        }

        // Intentar parsejar JSON actual del textarea
        let twinsData = null;
        let jsonWarning = false;
        try {
            const jsonText = this.twinsTextarea ? this.twinsTextarea.value : '[]';
            twinsData = JSON.parse(jsonText);
            if (!Array.isArray(twinsData)) {
                jsonWarning = true;
                twinsData = [];
            }
        } catch (e) {
            jsonWarning = true;
            twinsData = [];
        }

        const windowId = 'twins-visual-editor-' + Date.now();
        const editorWindow = WM.createWindow({
            id: windowId,
            title: t('bce.twins.editor.window_title'),
            width: 780,
            height: 620,
            x: 120,
            y: 60,
            resizable: true
        });

        if (!editorWindow) return;

        const container = editorWindow.contentElement || editorWindow.content || editorWindow.body;
        if (!container) return;

        this._buildTwinsEditorForm(container, twinsData, jsonWarning, windowId);
    }

    /**
     * Construir formulari visual per editar twins_config.json
     */
    _buildTwinsEditorForm(container, twinsData, jsonWarning, windowId) {
        const WM = window.windowManager || window.WindowManager;
        const self = this;

        // Estils comuns
        const inputStyle = `
            width: 100%; padding: 7px 10px; background: #2c3e50; color: #ecf0f1;
            border: 1px solid #34495e; border-radius: 4px; font-size: 13px; box-sizing: border-box;
        `;
        const selectStyle = `
            padding: 7px 10px; background: #2c3e50; color: #ecf0f1;
            border: 1px solid #34495e; border-radius: 4px; font-size: 13px; cursor: pointer;
        `;
        const labelStyle = `
            display: block; margin-bottom: 4px; font-weight: 600; font-size: 12px; color: #bdc3c7;
        `;
        const btnSmall = `
            padding: 5px 12px; color: white; border: none; border-radius: 4px;
            cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s;
        `;

        // Estat intern per fer tracking dels twins i els seus components
        let twinsList = twinsData.map((tw, i) => ({
            _uid: i,
            twinId: tw.twinId || '',
            meta: {
                name: (tw.meta && tw.meta.name) || '',
                href: (tw.meta && tw.meta.href) || '',
                width: (tw.visual && tw.visual.width) || (tw.meta && tw.meta.width) || 400,
                height: (tw.visual && tw.visual.height) || (tw.meta && tw.meta.height) || 350
            },
            components: (tw.components || []).map((c, j) => ({
                _uid: j,
                id: c.id || '',
                type: c.type || 'led',
                props: c.props ? JSON.parse(JSON.stringify(c.props)) : {},
                binding: { fromPLC: (c.binding && c.binding.fromPLC) || '', toPLC: (c.binding && c.binding.toPLC) || '' }
            })),
            overlay: tw.overlay ? { src: tw.overlay.html || tw.overlay.src || '', height: tw.overlay.height || 150 } : null,
            photo: tw.photo || null
        }));
        let nextTwinUid = twinsData.length;
        let nextCompUid = twinsData.reduce((s, tw) => s + (tw.components ? tw.components.length : 0), 0);

        // Referència al contenidor de la llista de bessons
        let listContainer = null;
        let selectedTwinUid = twinsList.length > 0 ? twinsList[0]._uid : null;

        // ---- Funcions de renderització ----

        const getPropsFields = (type, props) => {
            props = props || {};
            const colorOpts = ['red', 'green', 'yellow', 'blue', 'white'];
            switch (type) {
                case 'led':
                    return `
                        <div style="flex:1;min-width:100px;">
                            <label style="${labelStyle}">label</label>
                            <input type="text" class="cp-label" value="${self.escapeHtml(props.label || '')}" style="${inputStyle}" />
                        </div>
                        <div style="flex:0 0 100px;">
                            <label style="${labelStyle}">color</label>
                            <select class="cp-color" style="${selectStyle} width:100%;">
                                ${colorOpts.map(c => `<option value="${c}" ${props.color === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex:0 0 70px;">
                            <label style="${labelStyle}">size</label>
                            <input type="number" class="cp-size" value="${props.size || 20}" min="5" style="${inputStyle}" />
                        </div>
                    `;
                case 'switch':
                    return `
                        <div style="flex:1;">
                            <label style="${labelStyle}">label</label>
                            <input type="text" class="cp-label" value="${self.escapeHtml(props.label || '')}" style="${inputStyle}" />
                        </div>
                    `;
                case 'gauge':
                    return `
                        <div style="flex:1;min-width:80px;">
                            <label style="${labelStyle}">label</label>
                            <input type="text" class="cp-label" value="${self.escapeHtml(props.label || '')}" style="${inputStyle}" />
                        </div>
                        <div style="flex:0 0 60px;">
                            <label style="${labelStyle}">min</label>
                            <input type="number" class="cp-min" value="${props.min != null ? props.min : 0}" style="${inputStyle}" />
                        </div>
                        <div style="flex:0 0 60px;">
                            <label style="${labelStyle}">max</label>
                            <input type="number" class="cp-max" value="${props.max != null ? props.max : 100}" style="${inputStyle}" />
                        </div>
                        <div style="flex:0 0 60px;">
                            <label style="${labelStyle}">unit</label>
                            <input type="text" class="cp-unit" value="${self.escapeHtml(props.unit || '')}" style="${inputStyle}" />
                        </div>
                    `;
                case 'slider':
                    return `
                        <div style="flex:1;min-width:80px;">
                            <label style="${labelStyle}">label</label>
                            <input type="text" class="cp-label" value="${self.escapeHtml(props.label || '')}" style="${inputStyle}" />
                        </div>
                        <div style="flex:0 0 60px;">
                            <label style="${labelStyle}">min</label>
                            <input type="number" class="cp-min" value="${props.min != null ? props.min : 0}" style="${inputStyle}" />
                        </div>
                        <div style="flex:0 0 60px;">
                            <label style="${labelStyle}">max</label>
                            <input type="number" class="cp-max" value="${props.max != null ? props.max : 100}" style="${inputStyle}" />
                        </div>
                        <div style="flex:0 0 60px;">
                            <label style="${labelStyle}">step</label>
                            <input type="number" class="cp-step" value="${props.step != null ? props.step : 1}" style="${inputStyle}" />
                        </div>
                    `;
                default:
                    return '';
            }
        };

        const buildComponentRow = (comp) => {
            const typeOpts = ['led', 'switch', 'gauge', 'slider'];
            return `
                <div class="te-comp-row" data-uid="${comp._uid}" style="
                    padding: 8px; background: #1a1a2e; border-radius: 4px; margin-bottom: 6px;
                ">
                    <div style="display: flex; gap: 8px; align-items: flex-end; margin-bottom: 6px;">
                        <div style="flex: 1; min-width: 80px;">
                            <label style="${labelStyle}">id</label>
                            <input type="text" class="cp-id" value="${self.escapeHtml(comp.id)}" style="${inputStyle}" />
                        </div>
                        <div style="flex: 0 0 110px;">
                            <label style="${labelStyle}">type</label>
                            <select class="cp-type" style="${selectStyle} width:100%;">
                                ${typeOpts.map(t2 => `<option value="${t2}" ${comp.type === t2 ? 'selected' : ''}>${t2}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex: 0 0 32px;">
                            <button class="cp-remove-btn" title="${t('bce.twins.editor.remove_component')}" style="
                                background: #e74c3c; color: white; border: none; border-radius: 4px;
                                width: 32px; height: 34px; cursor: pointer; font-size: 16px; transition: background 0.2s;
                            ">✕</button>
                        </div>
                    </div>
                    <!-- Props dinàmics -->
                    <div class="cp-props-area" style="display: flex; gap: 8px; align-items: flex-end; margin-bottom: 6px;">
                        ${getPropsFields(comp.type, comp.props)}
                    </div>
                    <!-- Binding -->
                    <div style="display: flex; gap: 8px; align-items: flex-end;">
                        <div style="flex: 1;">
                            <label style="${labelStyle}">binding.fromPLC</label>
                            <input type="text" class="cp-fromPLC" value="${self.escapeHtml(comp.binding.fromPLC || '')}" placeholder="${t('bce.twins.editor.optional')}" style="${inputStyle}" />
                        </div>
                        <div style="flex: 1;">
                            <label style="${labelStyle}">binding.toPLC</label>
                            <input type="text" class="cp-toPLC" value="${self.escapeHtml(comp.binding.toPLC || '')}" placeholder="${t('bce.twins.editor.optional')}" style="${inputStyle}" />
                        </div>
                    </div>
                </div>
            `;
        };

        const buildTwinPanel = (twin) => {
            const hasOverlay = twin.overlay !== null;
            const hasPhoto = twin.photo !== null && twin.photo !== undefined;
            const photoFilename = hasPhoto ? twin.photo : '';
            return `
                <div class="te-twin-panel" data-uid="${twin._uid}" style="display: flex; flex-direction: column; height: 100%;">
                    <!-- Camps principals del bessó -->
                    <div style="padding: 10px; border-bottom: 1px solid #34495e;">
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <div style="flex: 2;">
                                <label style="${labelStyle}">twinId</label>
                                <input type="text" class="te-twinId" value="${self.escapeHtml(twin.twinId)}" style="${inputStyle}" />
                            </div>
                            <div style="flex: 2;">
                                <label style="${labelStyle}">meta.name</label>
                                <input type="text" class="te-metaName" value="${self.escapeHtml(twin.meta.name)}" style="${inputStyle}" />
                            </div>
                            <div style="flex: 1;">
                                <label style="${labelStyle}">width</label>
                                <input type="number" class="te-metaWidth" value="${twin.meta.width}" min="100" style="${inputStyle}" />
                            </div>
                            <div style="flex: 1;">
                                <label style="${labelStyle}">height</label>
                                <input type="number" class="te-metaHeight" value="${twin.meta.height}" min="100" style="${inputStyle}" />
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <div style="flex: 1;">
                                <label style="${labelStyle}">meta.href <span style="color:#7f8c8d;font-weight:400;">(opcional – URL)</span></label>
                                <input type="text" class="te-metaHref" value="${self.escapeHtml(twin.meta.href || '')}" placeholder="https://example.com" style="${inputStyle}" />
                            </div>
                        </div>
                    </div>
                    
                    <!-- Components -->
                    <div style="flex: 1; overflow-y: auto; padding: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <label style="font-weight: 600; font-size: 13px; color: #ecf0f1;">
                                ${t('bce.twins.editor.components_title')}
                            </label>
                            <button class="te-add-comp-btn" style="${btnSmall} background: #27ae60;">
                                + ${t('bce.twins.editor.add_component')}
                            </button>
                        </div>
                        <div class="te-comp-list">
                            ${twin.components.map(c => buildComponentRow(c)).join('')}
                        </div>
                    </div>
                    
                    <!-- Overlay -->
                    <div style="padding: 10px; border-top: 1px solid #34495e;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <label style="font-weight: 600; font-size: 13px; color: #ecf0f1;">
                                Overlay
                            </label>
                            <label style="font-size: 12px; color: #95a5a6; cursor: pointer; user-select: none;">
                                <input type="checkbox" class="te-overlay-check" ${hasOverlay ? 'checked' : ''} />
                                ${t('bce.twins.editor.overlay_enabled')}
                            </label>
                        </div>
                        <div class="te-overlay-fields" style="display: ${hasOverlay ? 'flex' : 'none'}; gap: 8px; align-items: flex-end; flex-wrap: wrap;">
                            <div style="flex: 2;">
                                <label style="${labelStyle}">src</label>
                                <input type="text" class="te-overlaySrc" value="${self.escapeHtml(hasOverlay ? twin.overlay.src : '')}" placeholder="${t('bce.twins.editor.overlay_src_hint')}" style="${inputStyle}" />
                            </div>
                            <div style="flex: 0 0 80px;">
                                <label style="${labelStyle}">height</label>
                                <input type="number" class="te-overlayHeight" value="${hasOverlay ? twin.overlay.height : 150}" min="50" style="${inputStyle}" />
                            </div>
                            <div style="flex: 0 0 auto;">
                                <button class="te-upload-asset-btn" style="${btnSmall} background: #8e44ad;" title="${t('bce.twins.editor.upload_asset')}">
                                    📁 ${t('bce.twins.editor.upload_btn')}
                                </button>
                            </div>
                            <div style="flex: 0 0 auto;">
                                <button class="te-paste-html-btn" style="${btnSmall} background: #2980b9;" title="${t('bce.twins.editor.paste_html')}">
                                    📋 ${t('bce.twins.editor.paste_html')}
                                </button>
                            </div>
                            <div style="flex: 0 0 auto;">
                                <button class="te-ai-prompt-btn" style="${btnSmall} background: #e67e22;" title="${t('bce.twins.editor.ai_prompt')}">
                                    🤖 ${t('bce.twins.editor.ai_prompt')}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Fotografia -->
                    <div style="padding: 10px; border-top: 1px solid #34495e;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <label style="font-weight: 600; font-size: 13px; color: #ecf0f1;">
                                ${t('bce.twins.editor.photo_label')}
                            </label>
                            <label style="font-size: 12px; color: #95a5a6; cursor: pointer; user-select: none;">
                                <input type="checkbox" class="te-photo-check" ${hasPhoto ? 'checked' : ''} />
                                ${t('bce.twins.editor.photo_enabled')}
                            </label>
                        </div>
                        <div class="te-photo-fields" style="display: ${hasPhoto ? 'flex' : 'none'}; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <div style="flex: 0 0 auto;">
                                <button class="te-photo-upload-btn" style="${btnSmall} background: #8e44ad;">
                                    📁 ${t('bce.twins.editor.photo_upload_btn')}
                                </button>
                            </div>
                            <div style="flex: 0 0 auto;">
                                <button class="te-photo-delete-btn" style="${btnSmall} background: #c0392b;">
                                    🗑️ ${t('bce.twins.editor.photo_delete_btn')}
                                </button>
                            </div>
                            <div class="te-photo-info" style="flex: 1; font-size: 12px; color: #95a5a6;">
                                ${hasPhoto && photoFilename ? `${t('bce.twins.editor.photo_current')} ${self.escapeHtml(photoFilename)}` : t('bce.twins.editor.photo_none')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        // ---- Render principal ----

        const renderAll = () => {
            container.innerHTML = `
                <div style="height: 100%; display: flex; flex-direction: column; background: #1e1e1e; color: #ecf0f1; font-family: 'Segoe UI', Arial, sans-serif;">
                    ${jsonWarning ? `
                        <div style="padding: 8px 15px; background: #7d3c0a; color: #fdebd0; font-size: 13px; border-bottom: 1px solid #e67e22;">
                            ⚠️ ${t('bce.twins.editor.json_warning')}
                        </div>
                    ` : ''}
                    
                    <!-- Layout: llista lateral + panell edició -->
                    <div style="flex: 1; display: flex; overflow: hidden;">
                        <!-- Llista de bessons (esquerra) -->
                        <div style="width: 200px; min-width: 160px; border-right: 1px solid #34495e; display: flex; flex-direction: column; background: #1a1a2e;">
                            <div style="padding: 8px; border-bottom: 1px solid #34495e;">
                                <button id="te-add-twin-btn" style="
                                    width: 100%; padding: 7px 10px; background: #27ae60; color: white;
                                    border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
                                    font-weight: 600; transition: background 0.2s;
                                ">+ ${t('bce.twins.editor.add_twin')}</button>
                            </div>
                            <div id="te-twins-list" style="flex: 1; overflow-y: auto; padding: 4px;">
                                ${twinsList.map(tw => `
                                    <div class="te-twin-item" data-uid="${tw._uid}" style="
                                        display: flex; justify-content: space-between; align-items: center;
                                        padding: 8px 10px; margin-bottom: 2px; border-radius: 4px; cursor: pointer;
                                        background: ${tw._uid === selectedTwinUid ? '#2c3e50' : 'transparent'};
                                        color: ${tw._uid === selectedTwinUid ? '#3498db' : '#bdc3c7'};
                                        font-weight: ${tw._uid === selectedTwinUid ? '600' : '400'};
                                        transition: background 0.15s;
                                    ">
                                        <span class="te-twin-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; font-size: 13px;">
                                            ${self.escapeHtml(tw.twinId || t('bce.twins.editor.unnamed'))}
                                        </span>
                                        <button class="te-remove-twin-btn" data-uid="${tw._uid}" title="${t('bce.twins.editor.remove_twin')}" style="
                                            background: transparent; color: #e74c3c; border: none; cursor: pointer;
                                            font-size: 14px; padding: 0 4px; opacity: 0.7; transition: opacity 0.2s;
                                        ">✕</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Panell d'edició del bessó seleccionat (dreta) -->
                        <div id="te-edit-panel" style="flex: 1; overflow-y: auto;">
                            ${selectedTwinUid !== null && twinsList.find(tw => tw._uid === selectedTwinUid)
                                ? buildTwinPanel(twinsList.find(tw => tw._uid === selectedTwinUid))
                                : `<div style="padding: 40px; text-align: center; color: #95a5a6; font-size: 14px;">
                                    ${twinsList.length === 0 ? t('bce.twins.editor.empty_hint') : t('bce.twins.editor.select_hint')}
                                  </div>`
                            }
                        </div>
                    </div>
                    
                    <!-- Botons Aplica / Cancel·la -->
                    <div style="padding: 10px 15px; border-top: 1px solid #34495e; display: flex; gap: 10px; justify-content: flex-end; background: #1c2128;">
                        <button id="te-cancel-btn" style="
                            padding: 10px 20px; background: #7f8c8d; color: white;
                            border: none; border-radius: 6px; cursor: pointer;
                            font-size: 14px; font-weight: 600; transition: background 0.2s;
                        ">${t('bce.twins.editor.cancel')}</button>
                        <button id="te-apply-btn" style="
                            padding: 10px 20px; background: #27ae60; color: white;
                            border: none; border-radius: 6px; cursor: pointer;
                            font-size: 14px; font-weight: 600; transition: background 0.2s;
                        ">${t('bce.twins.editor.apply')}</button>
                    </div>
                </div>
            `;

            // ---- Attach event listeners ----
            self._attachTwinsEditorEvents(container, windowId, {
                twinsList, selectedTwinUid, nextCompUid,
                buildComponentRow, buildTwinPanel, getPropsFields, renderAll,
                selectTwin: (uid) => { selectedTwinUid = uid; renderAll(); },
                setSelectedTwinUid: (uid) => { selectedTwinUid = uid; },
                getSelectedTwinUid: () => selectedTwinUid,
                nextTwinUid: () => nextTwinUid++,
                nextCompUidFn: () => nextCompUid++,
                inputStyle, selectStyle, labelStyle
            });
        };

        renderAll();
    }

    /**
     * Attach event listeners per l'editor visual de twins
     */
    _attachTwinsEditorEvents(container, windowId, ctx) {
        const WM = window.windowManager || window.WindowManager;
        const self = this;

        // Afegir bessó
        const addTwinBtn = container.querySelector('#te-add-twin-btn');
        if (addTwinBtn) {
            addTwinBtn.addEventListener('click', () => {
                // Guardar estat actual del panell editat ABANS de crear el nou
                self._saveTwinPanelState(container, ctx.twinsList, ctx.getSelectedTwinUid());
                const uid = ctx.nextTwinUid();
                ctx.twinsList.push({
                    _uid: uid,
                    twinId: '',
                    meta: { name: '', width: 400, height: 350 },
                    components: [],
                    overlay: null,
                    photo: null
                });
                ctx.selectTwin(uid);
            });
        }

        // Seleccionar bessó de la llista
        container.querySelectorAll('.te-twin-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.te-remove-twin-btn')) return;
                // Guardar estat del bessó actual abans de canviar
                self._saveTwinPanelState(container, ctx.twinsList, ctx.getSelectedTwinUid());
                const uid = parseInt(item.dataset.uid);
                ctx.selectTwin(uid);
            });
        });

        // Eliminar bessó
        container.querySelectorAll('.te-remove-twin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const uid = parseInt(btn.dataset.uid);
                const idx = ctx.twinsList.findIndex(tw => tw._uid === uid);
                if (idx >= 0) {
                    ctx.twinsList.splice(idx, 1);
                    if (ctx.getSelectedTwinUid() === uid) {
                        ctx.selectTwin(ctx.twinsList.length > 0 ? ctx.twinsList[0]._uid : null);
                    } else {
                        ctx.renderAll();
                    }
                }
            });
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
            btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.7'; });
        });

        // ---- Components del bessó seleccionat ----
        const panel = container.querySelector('.te-twin-panel');
        if (panel) {
            // Afegir component
            const addCompBtn = panel.querySelector('.te-add-comp-btn');
            if (addCompBtn) {
                addCompBtn.addEventListener('click', () => {
                    const selectedUid = ctx.getSelectedTwinUid();
                    const twin = ctx.twinsList.find(tw => tw._uid === selectedUid);
                    if (!twin) return;
                    // Guardar estat actual
                    self._saveTwinPanelState(container, ctx.twinsList, selectedUid);
                    const compUid = ctx.nextCompUidFn();
                    twin.components.push({
                        _uid: compUid,
                        id: '',
                        type: 'led',
                        props: {},
                        binding: { fromPLC: '', toPLC: '' }
                    });
                    ctx.renderAll();
                });
            }

            // Eliminar component
            panel.querySelectorAll('.cp-remove-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const row = btn.closest('.te-comp-row');
                    if (!row) return;
                    const compUid = parseInt(row.dataset.uid);
                    const selectedUid = ctx.getSelectedTwinUid();
                    const twin = ctx.twinsList.find(tw => tw._uid === selectedUid);
                    if (!twin) return;
                    // Guardar estat actual excloent el component que eliminem
                    self._saveTwinPanelState(container, ctx.twinsList, selectedUid);
                    twin.components = twin.components.filter(c => c._uid !== compUid);
                    ctx.renderAll();
                });
                btn.addEventListener('mouseenter', () => { btn.style.background = '#c0392b'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = '#e74c3c'; });
            });

            // Canvi de type -> regenerar props
            panel.querySelectorAll('.cp-type').forEach(sel => {
                sel.addEventListener('change', () => {
                    const row = sel.closest('.te-comp-row');
                    if (!row) return;
                    const propsArea = row.querySelector('.cp-props-area');
                    if (propsArea) {
                        propsArea.innerHTML = ctx.getPropsFields(sel.value, {});
                    }
                });
            });

            // Overlay toggle
            const overlayCheck = panel.querySelector('.te-overlay-check');
            const overlayFields = panel.querySelector('.te-overlay-fields');
            if (overlayCheck && overlayFields) {
                overlayCheck.addEventListener('change', () => {
                    overlayFields.style.display = overlayCheck.checked ? 'flex' : 'none';
                });
            }

            // Upload asset
            const uploadBtn = panel.querySelector('.te-upload-asset-btn');
            if (uploadBtn) {
                uploadBtn.addEventListener('click', () => {
                    self._uploadTwinAsset(panel);
                });
            }

            // Paste HTML from clipboard
            const pasteBtn = panel.querySelector('.te-paste-html-btn');
            if (pasteBtn) {
                pasteBtn.addEventListener('click', () => {
                    self._pasteHtmlFromClipboard(panel, ctx);
                });
            }

            // AI Prompt generator
            const aiPromptBtn = panel.querySelector('.te-ai-prompt-btn');
            if (aiPromptBtn) {
                aiPromptBtn.addEventListener('click', () => {
                    self._saveTwinPanelState(panel.closest('[style]').parentElement || container, ctx.twinsList, ctx.getSelectedTwinUid());
                    const twin = ctx.twinsList.find(tw => tw._uid === ctx.getSelectedTwinUid());
                    self._openAIPromptWindow(twin);
                });
            }

            // Photo toggle
            const photoCheck = panel.querySelector('.te-photo-check');
            const photoFields = panel.querySelector('.te-photo-fields');
            if (photoCheck && photoFields) {
                photoCheck.addEventListener('change', () => {
                    photoFields.style.display = photoCheck.checked ? 'flex' : 'none';
                });
            }

            // Photo upload
            const photoUploadBtn = panel.querySelector('.te-photo-upload-btn');
            if (photoUploadBtn) {
                photoUploadBtn.addEventListener('click', () => {
                    self._uploadTwinPhoto(panel, ctx);
                });
            }

            // Photo delete
            const photoDeleteBtn = panel.querySelector('.te-photo-delete-btn');
            if (photoDeleteBtn) {
                photoDeleteBtn.addEventListener('click', () => {
                    self._deleteTwinPhoto(panel, ctx);
                });
            }
        }

        // Cancel·la
        const cancelBtn = container.querySelector('#te-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                WM.closeWindow(windowId);
            });
            cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#6c7a7d'; });
            cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = '#7f8c8d'; });
        }

        // Aplica
        const applyBtn = container.querySelector('#te-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                // Guardar estat del panell actual
                self._saveTwinPanelState(container, ctx.twinsList, ctx.getSelectedTwinUid());
                // Generar JSON final
                const result = ctx.twinsList.map(tw => {
                    const meta = { name: tw.meta.name };
                    if (tw.meta.href) meta.href = tw.meta.href;
                    const obj = {
                        twinId: tw.twinId,
                        meta: meta,
                        visual: { width: parseInt(tw.meta.width) || 400, height: parseInt(tw.meta.height) || 350 },
                        components: tw.components.map(c => {
                            const comp = { id: c.id, type: c.type, props: c.props, binding: {} };
                            if (c.binding.fromPLC) comp.binding.fromPLC = c.binding.fromPLC;
                            if (c.binding.toPLC) comp.binding.toPLC = c.binding.toPLC;
                            return comp;
                        })
                    };
                    if (tw.overlay && tw.overlay.src) {
                        obj.overlay = { html: tw.overlay.src, height: parseInt(tw.overlay.height) || 150 };
                    }
                    if (tw.photo) {
                        obj.photo = tw.photo;
                    }
                    return obj;
                });
                const jsonStr = JSON.stringify(result, null, 2);
                if (self.twinsTextarea) {
                    self.twinsTextarea.value = jsonStr;
                }
                WM.closeWindow(windowId);
            });
            applyBtn.addEventListener('mouseenter', () => { applyBtn.style.background = '#219a52'; });
            applyBtn.addEventListener('mouseleave', () => { applyBtn.style.background = '#27ae60'; });
        }
    }

    /**
     * Guardar estat actual del panell d'edició d'un bessó al model intern
     */
    _saveTwinPanelState(container, twinsList, selectedUid) {
        if (selectedUid === null) return;
        const twin = twinsList.find(tw => tw._uid === selectedUid);
        if (!twin) return;

        const panel = container.querySelector('.te-twin-panel');
        if (!panel) return;

        // Camps principals
        const twinIdInput = panel.querySelector('.te-twinId');
        const metaNameInput = panel.querySelector('.te-metaName');
        const metaWidthInput = panel.querySelector('.te-metaWidth');
        const metaHeightInput = panel.querySelector('.te-metaHeight');
        const metaHrefInput = panel.querySelector('.te-metaHref');

        if (twinIdInput) twin.twinId = twinIdInput.value.trim();
        if (metaNameInput) twin.meta.name = metaNameInput.value.trim();
        if (metaWidthInput) twin.meta.width = parseInt(metaWidthInput.value) || 400;
        if (metaHeightInput) twin.meta.height = parseInt(metaHeightInput.value) || 350;
        if (metaHrefInput) twin.meta.href = metaHrefInput.value.trim();

        // Components
        const compRows = panel.querySelectorAll('.te-comp-row');
        const updatedComponents = [];
        compRows.forEach(row => {
            const uid = parseInt(row.dataset.uid);
            const existing = twin.components.find(c => c._uid === uid);
            const compId = row.querySelector('.cp-id');
            const compType = row.querySelector('.cp-type');
            const fromPLC = row.querySelector('.cp-fromPLC');
            const toPLC = row.querySelector('.cp-toPLC');

            const type = compType ? compType.value : (existing ? existing.type : 'led');
            const props = this._collectComponentProps(row, type);

            updatedComponents.push({
                _uid: uid,
                id: compId ? compId.value.trim() : '',
                type: type,
                props: props,
                binding: {
                    fromPLC: fromPLC ? fromPLC.value.trim() : '',
                    toPLC: toPLC ? toPLC.value.trim() : ''
                }
            });
        });
        twin.components = updatedComponents;

        // Overlay
        const overlayCheck = panel.querySelector('.te-overlay-check');
        if (overlayCheck) {
            if (overlayCheck.checked) {
                const srcInput = panel.querySelector('.te-overlaySrc');
                const heightInput = panel.querySelector('.te-overlayHeight');
                twin.overlay = {
                    src: srcInput ? srcInput.value.trim() : '',
                    height: heightInput ? parseInt(heightInput.value) || 150 : 150
                };
            } else {
                twin.overlay = null;
            }
        }

        // Photo
        const photoCheck = panel.querySelector('.te-photo-check');
        if (photoCheck) {
            if (!photoCheck.checked) {
                twin.photo = null;
            }
            // Si està activat però no té valor, mantenir l'existent (es puja amb el botó)
        }
    }

    /**
     * Recollir props d'un component segons el type
     */
    _collectComponentProps(row, type) {
        const props = {};
        const label = row.querySelector('.cp-label');
        if (label) props.label = label.value.trim();

        switch (type) {
            case 'led': {
                const color = row.querySelector('.cp-color');
                const size = row.querySelector('.cp-size');
                if (color) props.color = color.value;
                if (size) props.size = parseInt(size.value) || 20;
                break;
            }
            case 'switch':
                // Només label
                break;
            case 'gauge': {
                const min = row.querySelector('.cp-min');
                const max = row.querySelector('.cp-max');
                const unit = row.querySelector('.cp-unit');
                if (min) props.min = parseFloat(min.value) || 0;
                if (max) props.max = parseFloat(max.value) || 100;
                if (unit) props.unit = unit.value.trim();
                break;
            }
            case 'slider': {
                const min = row.querySelector('.cp-min');
                const max = row.querySelector('.cp-max');
                const step = row.querySelector('.cp-step');
                if (min) props.min = parseFloat(min.value) || 0;
                if (max) props.max = parseFloat(max.value) || 100;
                if (step) props.step = parseFloat(step.value) || 1;
                break;
            }
        }
        return props;
    }

    /**
     * Pujar fitxer de fotografia per al bessó
     */
    _uploadTwinPhoto(panel, ctx) {
        const t = window.t || (k => k);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.png,.jpg,.jpeg';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                if (!window._twinsAssets) window._twinsAssets = {};

                // Determinar nom: basat en overlay src (sense .html) o meta.name del bessó
                const twin = ctx.twinsList.find(tw => tw._uid === ctx.getSelectedTwinUid());
                let baseName = '';
                if (twin && twin.overlay && twin.overlay.src) {
                    baseName = twin.overlay.src.replace(/\.(html|htm)$/i, '');
                } else if (twin && twin.meta && twin.meta.name) {
                    baseName = twin.meta.name.replace(/[^a-zA-Z0-9_-]/g, '_');
                } else {
                    baseName = 'photo';
                }

                // Obtenir extensió original
                const ext = file.name.split('.').pop().toLowerCase();
                const photoFileName = `${baseName}.${ext}`;

                // Guardar com base64 a _twinsAssets
                window._twinsAssets[photoFileName] = ev.target.result;

                // Actualitzar model intern
                if (twin) {
                    twin.photo = photoFileName;
                }

                // Actualitzar info visual
                const photoInfo = panel.querySelector('.te-photo-info');
                if (photoInfo) {
                    photoInfo.textContent = `${t('bce.twins.editor.photo_current')} ${photoFileName}`;
                }

                window.showToast(t('bce.twins.editor.photo_uploaded', { name: photoFileName }), 'success');
                console.log(`✅ Foto pujada: ${photoFileName}`);
            };
            reader.readAsDataURL(file);
        });
        input.click();
    }

    /**
     * Esborrar fitxer de fotografia del bessó
     */
    _deleteTwinPhoto(panel, ctx) {
        const t = window.t || (k => k);
        const twin = ctx.twinsList.find(tw => tw._uid === ctx.getSelectedTwinUid());
        if (!twin || !twin.photo) {
            window.showToast(t('bce.twins.editor.photo_no_file'), 'warning');
            return;
        }

        // Eliminar de _twinsAssets
        if (window._twinsAssets && window._twinsAssets[twin.photo]) {
            delete window._twinsAssets[twin.photo];
        }

        twin.photo = null;

        // Actualitzar info visual
        const photoInfo = panel.querySelector('.te-photo-info');
        if (photoInfo) {
            photoInfo.textContent = t('bce.twins.editor.photo_none');
        }

        window.showToast(t('bce.twins.editor.photo_deleted'), 'success');
    }

    /**
     * Obrir vista prèvia d'un bessó
     */
    _openTwinPreview() {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        // Obtenir bessons del JSON actual
        let twins = [];
        try {
            const jsonText = this.twinsTextarea ? this.twinsTextarea.value : '[]';
            twins = JSON.parse(jsonText);
        } catch (e) {
            window.showToast('JSON invàlid', 'error');
            return;
        }

        if (!Array.isArray(twins) || twins.length === 0) {
            window.showToast(t('bce.twins.preview.no_twins'), 'warning');
            return;
        }

        if (twins.length === 1) {
            this._doTwinPreview(twins[0]);
        } else {
            // Mostrar diàleg de selecció
            this._showPreviewSelectDialog(twins);
        }
    }

    /**
     * Mostrar diàleg per seleccionar quin bessó previsualitzar
     */
    _showPreviewSelectDialog(twins) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        const dialogId = 'twin-preview-select';
        // Tancar anterior si existeix
        const existing = WM.getWindow ? WM.getWindow(dialogId) : null;
        if (existing) WM.closeWindow(dialogId);

        const dlg = WM.createWindow({
            id: dialogId,
            title: t('bce.twins.preview_btn'),
            width: 400,
            height: Math.min(350, 120 + twins.length * 45),
            x: Math.max(50, (window.innerWidth - 400) / 2),
            y: Math.max(50, (window.innerHeight - 350) / 2)
        });

        const container = dlg.contentElement || dlg.content || dlg.body;
        if (!container) return;

        container.style.cssText = `
            display: flex; flex-direction: column; height: 100%;
            background: #1e1e1e; color: #ecf0f1; font-family: 'Segoe UI', Arial, sans-serif;
            padding: 15px; box-sizing: border-box;
        `;

        let listHtml = '';
        twins.forEach((tw, i) => {
            const name = (tw.meta && tw.meta.name) || tw.twinId || `twin-${i}`;
            const twinId = tw.twinId || `twin-${i}`;
            listHtml += `
                <button class="twin-preview-item" data-index="${i}" style="
                    display: block; width: 100%; padding: 10px; margin-bottom: 6px;
                    background: #2c3e50; color: #ecf0f1; border: 1px solid #34495e;
                    border-radius: 6px; cursor: pointer; font-size: 13px; text-align: left;
                    transition: background 0.2s;
                ">
                    <strong>${this.escapeHtml(name)}</strong>
                    <span style="color: #95a5a6; margin-left: 8px;">(${this.escapeHtml(twinId)})</span>
                </button>
            `;
        });

        container.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 13px; color: #bdc3c7;">
                ${t('bce.twins.preview.select_twin')}
            </div>
            <div style="flex: 1; overflow-y: auto;">
                ${listHtml}
            </div>
        `;

        container.querySelectorAll('.twin-preview-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                WM.closeWindow(dialogId);
                this._doTwinPreview(twins[idx]);
            });
            btn.addEventListener('mouseenter', () => { btn.style.background = '#34495e'; });
            btn.addEventListener('mouseleave', () => { btn.style.background = '#2c3e50'; });
        });
    }

    /**
     * Executar la vista prèvia d'un bessó concret
     */
    _doTwinPreview(twinDef) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        const twinName = (twinDef.meta && twinDef.meta.name) || twinDef.twinId || 'Twin';
        const previewId = `twin-preview-${(twinDef.twinId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

        // Tancar anterior si existeix
        const existing = WM.getWindow ? WM.getWindow(previewId) : null;
        if (existing) WM.closeWindow(previewId);

        // Calcular mida
        const winWidth = (twinDef.visual && twinDef.visual.width) || 420;
        let winHeight = (twinDef.visual && twinDef.visual.height) || 380;
        if (twinDef.overlay) {
            winHeight += (twinDef.overlay.height || 150);
        }
        if (twinDef.photo && !twinDef.overlay) {
            winHeight += 150; // Espai per la foto si no hi ha overlay
        }

        const title = t('bce.twins.preview.window_title', { name: twinName });

        const win = WM.createWindow({
            id: previewId,
            title: title,
            width: winWidth,
            height: winHeight,
            x: 250 + Math.random() * 50,
            y: 100 + Math.random() * 50,
            onClose: () => {
                // Destruir l'engine de preview
                if (win._previewEngine) {
                    win._previewEngine.destroy();
                    win._previewEngine = null;
                }
            }
        });

        if (!win) return;

        const container = win.contentElement || win.content || win.body;
        if (!container) return;

        // Crear un ioConfig mock buit (sense PLCMemory real)
        const mockIoConfig = { fromPLC: {}, toPLC: {}, labelOverrides: {} };

        // Crear TwinEngine en mode preview (amb els components visuals però sense binding real)
        const engine = new window.TwinEngine(container, twinDef, mockIoConfig);
        engine.init();
        win._previewEngine = engine;
    }

    /**
     * Pujar fitxer asset per overlay
     */
    /**
     * Enganxar HTML del porta-retalls com a overlay asset
     */
    async _pasteHtmlFromClipboard(panel, ctx) {
        const t = window.t || (k => k);

        // Obtenir twinId del panell actual
        const twinIdInput = panel.querySelector('.te-twinId');
        const twinId = twinIdInput ? twinIdInput.value.trim() : '';

        // Generar nom per defecte
        const defaultName = twinId ? `overlay_${twinId.replace(/[^a-zA-Z0-9_-]/g, '_')}.html` : 'overlay.html';

        if (!twinId) {
            window.showToast(t('bce.twins.editor.paste_html_no_twinid'), 'warning');
        }

        // Demanar nom del fitxer
        const fileName = prompt(t('bce.twins.editor.paste_html_confirm_name'), defaultName);
        if (!fileName) return;

        // Assegurar extensió .html
        const finalName = fileName.endsWith('.html') || fileName.endsWith('.htm') ? fileName : fileName + '.html';

        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                window.showToast(t('bce.twins.editor.paste_html_empty'), 'warning');
                return;
            }

            // Guardar a _twinsAssets
            if (!window._twinsAssets) window._twinsAssets = {};
            window._twinsAssets[finalName] = text;

            // Actualitzar camp src i activar overlay
            const srcInput = panel.querySelector('.te-overlaySrc');
            if (srcInput) srcInput.value = finalName;

            const overlayCheck = panel.querySelector('.te-overlay-check');
            const overlayFields = panel.querySelector('.te-overlay-fields');
            if (overlayCheck && !overlayCheck.checked) {
                overlayCheck.checked = true;
                if (overlayFields) overlayFields.style.display = 'flex';
            }

            window.showToast(t('bce.twins.editor.paste_html_success'), 'success');
            console.log(`✅ HTML enganxat com a asset: ${finalName} (${text.length} bytes)`);
        } catch (err) {
            console.error('[BessoConfigEditor] Clipboard error:', err);
            window.showToast(t('bce.twins.editor.paste_html_error'), 'error');
        }
    }

    /**
     * Obrir finestra de generació de prompt IA per overlay
     */
    async _openAIPromptWindow(twin) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        // Carregar guia amb fetch
        let guideContent = '';
        try {
            const resp = await fetch('js/docs/OVERLAY_PROMPT_GUIDE.md');
            if (resp.ok) {
                guideContent = await resp.text();
            } else {
                window.showToast(t('bce.twins.editor.ai_prompt_guide_warning'), 'warning');
            }
        } catch (err) {
            console.warn('[BessoConfigEditor] Could not load OVERLAY_PROMPT_GUIDE.md:', err);
            window.showToast(t('bce.twins.editor.ai_prompt_guide_warning'), 'warning');
        }

        const windowId = 'ai-prompt-window-' + Date.now();
        const promptWindow = WM.createWindow({
            id: windowId,
            title: t('bce.twins.editor.ai_prompt_window_title'),
            width: 700,
            height: 520,
            x: Math.max(50, (window.innerWidth - 700) / 2),
            y: Math.max(50, (window.innerHeight - 520) / 2),
            resizable: true
        });

        if (!promptWindow) return;
        const container = promptWindow.contentElement || promptWindow.content || promptWindow.body;
        if (!container) return;

        // Preparar info del bessó
        const twinName = (twin && twin.meta && twin.meta.name) || '(unnamed)';
        const twinId = (twin && twin.twinId) || '';
        const overlayH = (twin && twin.overlay && twin.overlay.height) || 200;
        const components = (twin && twin.components) || [];

        let signalsInfo = '';
        components.forEach(c => {
            const sig = (c.binding && c.binding.fromPLC) || (c.binding && c.binding.toPLC) || '';
            const dir = c.binding && c.binding.fromPLC ? 'fromPLC' : 'toPLC';
            const label = (c.props && c.props.label) || c.id;
            if (sig) signalsInfo += `  - ${sig} (${dir}, ${c.type}): ${label}\n`;
        });

        const twinJson = twin ? JSON.stringify({
            twinId: twin.twinId,
            meta: { name: twin.meta.name },
            visual: { width: parseInt(twin.meta.width) || 400, height: parseInt(twin.meta.height) || 350 },
            components: twin.components.map(c => ({
                id: c.id, type: c.type, props: c.props,
                binding: { ...(c.binding.fromPLC ? { fromPLC: c.binding.fromPLC } : {}), ...(c.binding.toPLC ? { toPLC: c.binding.toPLC } : {}) }
            }))
        }, null, 2) : '{}';

        container.style.cssText = 'display:flex;flex-direction:column;height:100%;background:#1e1e1e;color:#ecf0f1;font-family:"Segoe UI",Arial,sans-serif;padding:15px;box-sizing:border-box;';
        container.innerHTML = `
            <div style="margin-bottom:10px;">
                <div style="font-size:13px;color:#95a5a6;margin-bottom:4px;">
                    <strong>${twinName}</strong> (${twinId}) — overlay: ${overlayH}px
                </div>
                <div style="font-size:11px;color:#7f8c8d;white-space:pre-line;">${signalsInfo || '(cap senyal definit)'}</div>
            </div>
            <div style="margin-bottom:8px;">
                <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px;">${t('bce.twins.editor.ai_prompt_description')}</label>
                <textarea id="ai-desc-input" rows="5" placeholder="${t('bce.twins.editor.ai_prompt_placeholder')}" style="
                    width:100%;background:#2c3e50;color:#ecf0f1;border:1px solid #34495e;border-radius:6px;
                    padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;font-family:inherit;
                "></textarea>
            </div>
            <div style="margin-bottom:10px;">
                <button id="ai-generate-btn" style="
                    padding:10px 24px;background:#e67e22;color:white;border:none;border-radius:6px;
                    font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s;
                ">${t('bce.twins.editor.ai_prompt_generate')}</button>
            </div>
            <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;">
                <label style="font-weight:600;font-size:12px;color:#95a5a6;margin-bottom:4px;">Prompt:</label>
                <textarea id="ai-prompt-output" readonly style="
                    flex:1;width:100%;background:#16213e;color:#ecf0f1;border:1px solid #2c3e50;border-radius:6px;
                    padding:10px;font-size:12px;font-family:monospace;resize:none;box-sizing:border-box;
                " placeholder="..."></textarea>
            </div>
        `;

        const self = this;
        const generateBtn = container.querySelector('#ai-generate-btn');
        generateBtn.addEventListener('click', async () => {
            const descInput = container.querySelector('#ai-desc-input');
            const outputArea = container.querySelector('#ai-prompt-output');
            const description = descInput ? descInput.value.trim() : '';

            if (!description) {
                window.showToast(t('bce.twins.editor.ai_prompt_no_desc'), 'warning');
                return;
            }

            // Construir prompt
            let prompt = t('bce.twins.editor.ai_prompt_intro') + '\n\n';

            // Afegir guia si disponible
            if (guideContent) {
                prompt += '--- REFERENCE GUIDE ---\n\n' + guideContent + '\n\n--- END GUIDE ---\n\n';
            }

            prompt += t('bce.twins.editor.ai_prompt_config_section') + '\n';
            prompt += `- Name: "${twinName}"\n`;
            prompt += `- Overlay height: ${overlayH}px\n`;
            prompt += `- Twin JSON:\n${twinJson}\n\n`;
            prompt += t('bce.twins.editor.ai_prompt_signals_section') + '\n';
            prompt += signalsInfo || '  (none defined)\n';
            prompt += '\n';
            prompt += t('bce.twins.editor.ai_prompt_user_section') + '\n';
            prompt += description + '\n\n';
            prompt += t('bce.twins.editor.ai_prompt_format_note') + '\n';

            // Mostrar al textarea
            if (outputArea) outputArea.value = prompt;

            // Copiar al porta-retalls i descarregar
            const blob = new Blob([prompt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'prompt.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            try {
                await navigator.clipboard.writeText(prompt);
                window.showToast(t('bce.twins.editor.ai_prompt_copied'), 'success');
            } catch (err) {
                window.showToast(t('bce.twins.editor.ai_prompt_copy_fail'), 'warning');
            }
        });

        generateBtn.addEventListener('mouseenter', () => { generateBtn.style.background = '#d35400'; });
        generateBtn.addEventListener('mouseleave', () => { generateBtn.style.background = '#e67e22'; });
    }

    _uploadTwinAsset(panel) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.htm,.png,.jpg,.jpeg';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                if (!window._twinsAssets) window._twinsAssets = {};

                if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                    window._twinsAssets[file.name] = ev.target.result;
                } else {
                    // Imatge: guardar com base64
                    window._twinsAssets[file.name] = ev.target.result;
                }

                // Actualitzar camp src
                const srcInput = panel.querySelector('.te-overlaySrc');
                if (srcInput) srcInput.value = file.name;

                console.log(`✅ Asset pujat: ${file.name}`);
            };

            if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
                reader.readAsText(file);
            } else {
                reader.readAsDataURL(file);
            }
        });
        input.click();
    }

    /**
    /**
     * Mostrar l'esquema de connexió (sch.png) del projecte actual
     */
    showConnectionSchematic() {
        const t = window.t || ((key) => key);
        const WIN_ID = 'connection-schematic-view';

        // Si ja existeix, portar al davant
        if (window.app && window.app.windowManager) {
            const existing = window.app.windowManager.getWindow(WIN_ID);
            if (existing) {
                window.app.windowManager.bringToFront(WIN_ID);
                return;
            }
        }

        // Obtenir nom del projecte
        const projectName = (window.ProjectManager && window.ProjectManager.currentProjectInfo)
            ? window.ProjectManager.currentProjectInfo.name || 'Project'
            : 'Project';

        // Obtenir la imatge sch.png del projecte carregat
        const schematicUrl = this._getSchematicUrl();

        let content;
        if (schematicUrl) {
            content = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    background: #1a1a2e;
                    box-sizing: border-box;
                    padding: 12px;
                    overflow: auto;
                ">
                    <img
                        src="${schematicUrl}"
                        alt="${t('bce.physical.schematic_alt')}"
                        style="
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                            border-radius: 6px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
                            display: block;
                        "
                    >
                </div>`;
        } else {
            content = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    background: #1a1a2e;
                    box-sizing: border-box;
                    padding: 40px;
                    text-align: center;
                ">
                    <p style="
                        color: #95a5a6;
                        font-size: 15px;
                        line-height: 1.5;
                        margin: 0;
                    ">${t('bce.physical.schematic_no_image')}</p>
                </div>`;
        }

        // Títol amb nom del projecte
        const titleTemplate = t('bce.physical.schematic_title');
        const title = titleTemplate.replace('{projectName}', projectName);

        if (window.app && window.app.windowManager) {
            window.app.windowManager.createWindow({
                id: WIN_ID,
                title: title,
                content: content,
                width: 600,
                height: 500,
                x: Math.round(window.innerWidth / 2 - 300),
                y: Math.round(window.innerHeight / 2 - 250),
                resizable: true,
                minimizable: true,
                maximizable: true,
                modal: false
            });
            window.app.windowManager.bringToFront(WIN_ID);
        }
    }

    /**
     * Obtenir la URL de l'esquema de connexió del projecte actual.
     * Busca a window._schematicImage (data URL guardada durant l'import del ZIP).
     * @returns {string|null} Data URL de la imatge, o null si no existeix
     */
    _getSchematicUrl() {
        if (window._schematicImage) {
            return window._schematicImage;
        }
        return null;
    }

    /**
     * Obrir editor visual per connexió bessons (pestanya physical)
     */
    _openPhysicalVisualEditor() {
        const WM = window.windowManager || window.WindowManager;
        if (!WM) {
            console.error('[BessoConfigEditor] WindowManager no disponible');
            return;
        }

        // Intentar parsejar JSON actual del textarea
        let physicalData = null;
        let jsonWarning = false;
        try {
            const jsonText = this.editorTextarea ? this.editorTextarea.value : '[]';
            physicalData = JSON.parse(jsonText);
            if (!Array.isArray(physicalData)) {
                jsonWarning = true;
                physicalData = [];
            }
        } catch (e) {
            jsonWarning = true;
            physicalData = [];
        }

        // Obtenir catàleg de twins (amb components i bindings)
        let twinsCatalog = [];
        try {
            const twinsJson = this.twinsTextarea ? this.twinsTextarea.value : '[]';
            const twinsData = JSON.parse(twinsJson);
            if (Array.isArray(twinsData)) {
                twinsCatalog = twinsData.filter(tw => tw.twinId);
            }
        } catch (e) { /* ignorar */ }

        // Obtenir vèrtebres disponibles de iotv_config (preset digital)
        let vertebrae = [];
        try {
            const iotvConfig = window.VertebraeConfig ? window.VertebraeConfig.get() : null;
            if (iotvConfig && iotvConfig.vertebrae) {
                vertebrae = iotvConfig.vertebrae;
            }
        } catch (e) { /* ignorar */ }
        // Si també hi ha al presetEditor, intentar agafar-ho d'allà
        if (vertebrae.length === 0 && this.presetEditor && this.presetEditor.editorTextarea) {
            try {
                const presetJson = JSON.parse(this.presetEditor.editorTextarea.value);
                if (presetJson.vertebrae) vertebrae = presetJson.vertebrae;
            } catch (e) { /* ignorar */ }
        }

        const windowId = 'physical-visual-editor-' + Date.now();
        const editorWindow = WM.createWindow({
            id: windowId,
            title: t('bce.physical.editor.window_title'),
            width: 820,
            height: 620,
            x: 120,
            y: 60,
            resizable: true
        });

        if (!editorWindow) return;

        const container = editorWindow.contentElement || editorWindow.content || editorWindow.body;
        if (!container) return;

        this._buildPhysicalEditorForm(container, physicalData, jsonWarning, twinsCatalog, vertebrae, windowId);
    }

    /**
     * Construir formulari visual per editar connexió bessons (others_config.json)
     * Gestiona instàncies twin amb ioConfig complet (fromPLC / toPLC → vèrtebres)
     */
    _buildPhysicalEditorForm(container, physicalData, jsonWarning, twinsCatalog, vertebrae, windowId) {
        const WM = window.windowManager || window.WindowManager;
        const self = this;

        // Estils comuns
        const inputStyle = `
            width: 100%; padding: 6px 8px; background: #2c3e50; color: #ecf0f1;
            border: 1px solid #34495e; border-radius: 4px; font-size: 12px; box-sizing: border-box;
        `;
        const selectStyle = `
            width: 100%; padding: 6px 8px; background: #2c3e50; color: #ecf0f1;
            border: 1px solid #34495e; border-radius: 4px; font-size: 12px; cursor: pointer; box-sizing: border-box;
        `;
        const labelStyle = `display: block; margin-bottom: 3px; font-weight: 600; font-size: 11px; color: #bdc3c7;`;
        const btnSmall = `
            padding: 4px 10px; color: white; border: none; border-radius: 4px;
            cursor: pointer; font-size: 11px; font-weight: 600; transition: background 0.2s;
        `;

        // Separar estàtics i twins
        const staticEntries = physicalData.filter(e => e.type !== 'twin');

        // Convertir cada twin entry a model intern amb senyals
        let twinEntries = physicalData.filter(e => e.type === 'twin').map((e, i) => {
            const signals = [];
            const io = e.ioConfig || {};
            const labelOverrides = io.labelOverrides || {};
            if (io.fromPLC) {
                Object.entries(io.fromPLC).forEach(([sig, m]) => {
                    signals.push({ _uid: signals.length, signalId: sig, direction: 'fromPLC', type: m.type || 'digital', vertebra: m.vertebra || '0x0', rib: m.rib || 'a', bit: m.bit != null ? m.bit : '', channel: m.channel != null ? m.channel : '', labelOverride: labelOverrides[sig] || '' });
                });
            }
            if (io.toPLC) {
                Object.entries(io.toPLC).forEach(([sig, m]) => {
                    signals.push({ _uid: signals.length, signalId: sig, direction: 'toPLC', type: m.type || 'digital', vertebra: m.vertebra || '0x0', rib: m.rib || 'b', bit: m.bit != null ? m.bit : '', channel: m.channel != null ? m.channel : '', labelOverride: labelOverrides[sig] || '' });
                });
            }
            return { _uid: i, name: e.name || '', twinId: e.twinId || '', signals };
        });
        let nextUid = twinEntries.length;
        let nextSigUid = twinEntries.reduce((s, e) => s + e.signals.length, 0) + 100;
        let selectedUid = twinEntries.length > 0 ? twinEntries[0]._uid : null;

        // Helpers per obtenir senyals del catàleg d'un twinId
        const getCatalogSignals = (twinId) => {
            const def = twinsCatalog.find(tw => tw.twinId === twinId);
            if (!def || !def.components) return [];
            return def.components
                .filter(c => c.binding && (c.binding.fromPLC || c.binding.toPLC))
                .map(c => ({
                    signalId: c.binding.fromPLC || c.binding.toPLC,
                    direction: c.binding.fromPLC ? 'fromPLC' : 'toPLC',
                    componentType: c.type,
                    label: (c.props && c.props.label) || c.id
                }));
        };

        // Opcions de vèrtebra (des de iotv_config)
        const vertebraOptions = vertebrae.map(v => v.addr);
        if (vertebraOptions.length === 0) vertebraOptions.push('0x0');

        // ---- Funcions de renderització ----

        const buildSignalRow = (sig, twinEntry) => {
            const catalogSigs = getCatalogSignals(twinEntry.twinId);
            const isDigital = sig.type === 'digital' || sig.type === '';
            const isAnalog = sig.type === 'analog';
            // Intentar determinar si és analògic pel catàleg
            const catSig = catalogSigs.find(cs => cs.signalId === sig.signalId);
            // Placeholder: etiqueta del catàleg original
            const catalogLabel = catSig ? catSig.label : '';

            return `
                <div class="pe-sig-row" data-uid="${sig._uid}" style="
                    display: flex; gap: 6px; align-items: flex-end; padding: 6px 8px;
                    background: #16213e; border: 1px solid #2c3e50; border-radius: 4px; margin-bottom: 4px; flex-wrap: wrap;
                ">
                    <div style="flex: 0 0 110px;">
                        <label style="${labelStyle}">${t('bce.physical.editor.signal')}</label>
                        <select class="pe-sig-id" style="${selectStyle}">
                            ${catalogSigs.length > 0 
                                ? catalogSigs.map(cs => 
                                    `<option value="${self.escapeHtml(cs.signalId)}" data-dir="${cs.direction}" ${sig.signalId === cs.signalId ? 'selected' : ''}>${self.escapeHtml(cs.signalId)}</option>`
                                  ).join('')
                                : `<option value="${self.escapeHtml(sig.signalId)}" selected>${self.escapeHtml(sig.signalId)}</option>`
                            }
                            ${catalogSigs.length > 0 && !catalogSigs.find(cs => cs.signalId === sig.signalId) && sig.signalId
                                ? `<option value="${self.escapeHtml(sig.signalId)}" selected>${self.escapeHtml(sig.signalId)}</option>`
                                : ''
                            }
                        </select>
                    </div>
                    <div style="flex: 0 0 100px;">
                        <label style="${labelStyle}">${t('bce.physical.editor.label_override')}</label>
                        <input type="text" class="pe-sig-label" value="${self.escapeHtml(sig.labelOverride || '')}" placeholder="${self.escapeHtml(catalogLabel || t('bce.physical.editor.label_override_hint'))}" style="${inputStyle}" />
                    </div>
                    <div style="flex: 0 0 80px;">
                        <label style="${labelStyle}">${t('bce.physical.editor.dir')}</label>
                        <select class="pe-sig-dir" style="${selectStyle}">
                            <option value="fromPLC" ${sig.direction === 'fromPLC' ? 'selected' : ''}>fromPLC</option>
                            <option value="toPLC" ${sig.direction === 'toPLC' ? 'selected' : ''}>toPLC</option>
                        </select>
                    </div>
                    <div style="flex: 0 0 80px;">
                        <label style="${labelStyle}">${t('bce.physical.editor.type')}</label>
                        <select class="pe-sig-type" style="${selectStyle}">
                            <option value="digital" ${sig.type === 'digital' ? 'selected' : ''}>digital</option>
                            <option value="analog" ${sig.type === 'analog' ? 'selected' : ''}>analog</option>
                        </select>
                    </div>
                    <div style="flex: 0 0 70px;">
                        <label style="${labelStyle}">${t('bce.physical.editor.vertebra')}</label>
                        <select class="pe-sig-vert" style="${selectStyle}">
                            ${vertebraOptions.map(v => `<option value="${v}" ${sig.vertebra === v ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex: 0 0 55px;">
                        <label style="${labelStyle}">${t('bce.physical.editor.rib')}</label>
                        <select class="pe-sig-rib" style="${selectStyle}">
                            <option value="a" ${sig.rib === 'a' ? 'selected' : ''}>a</option>
                            <option value="b" ${sig.rib === 'b' ? 'selected' : ''}>b</option>
                        </select>
                    </div>
                    <div class="pe-sig-bit-wrap" style="flex: 0 0 50px; ${isAnalog ? 'display:none;' : ''}">
                        <label style="${labelStyle}">bit</label>
                        <input type="number" class="pe-sig-bit" value="${sig.bit}" min="0" max="7" style="${inputStyle}" />
                    </div>
                    <div class="pe-sig-ch-wrap" style="flex: 0 0 50px; ${!isAnalog ? 'display:none;' : ''}">
                        <label style="${labelStyle}">ch</label>
                        <input type="number" class="pe-sig-ch" value="${sig.channel}" min="1" max="4" style="${inputStyle}" />
                    </div>
                    <div style="flex: 0 0 auto;">
                        <button class="pe-sig-remove" data-uid="${sig._uid}" title="${t('bce.physical.editor.remove_signal')}" style="
                            ${btnSmall} background: #e74c3c; width: 28px; height: 30px; font-size: 14px; padding: 0;
                        ">✕</button>
                    </div>
                </div>
            `;
        };

        const buildTwinPanel = (entry) => {
            const catalogSigs = getCatalogSignals(entry.twinId);
            return `
                <div class="pe-twin-panel" data-uid="${entry._uid}" style="display: flex; flex-direction: column; height: 100%;">
                    <!-- Camps principals -->
                    <div style="padding: 10px; border-bottom: 1px solid #34495e;">
                        <div style="display: flex; gap: 8px; margin-bottom: 0;">
                            <div style="flex: 1;">
                                <label style="${labelStyle}">name</label>
                                <input type="text" class="pe-name" value="${self.escapeHtml(entry.name)}" placeholder="${t('bce.physical.editor.name_placeholder')}" style="${inputStyle}" />
                            </div>
                            <div style="flex: 1;">
                                <label style="${labelStyle}">twinId</label>
                                <select class="pe-twinId" style="${selectStyle}">
                                    <option value="">${t('bce.physical.editor.select_twin')}</option>
                                    ${twinsCatalog.map(tw => 
                                        `<option value="${self.escapeHtml(tw.twinId)}" ${entry.twinId === tw.twinId ? 'selected' : ''}>${self.escapeHtml((tw.meta && tw.meta.name) || tw.twinId)} (${self.escapeHtml(tw.twinId)})</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Senyals ioConfig -->
                    <div style="flex: 1; overflow-y: auto; padding: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-weight: 600; font-size: 12px; color: #ecf0f1;">
                                ioConfig — ${t('bce.physical.editor.signals_title')}
                            </label>
                            <div style="display: flex; gap: 4px;">
                                <button class="pe-auto-map-btn" style="${btnSmall} background: #8e44ad;" title="${t('bce.physical.editor.auto_map_hint')}">
                                    ⚡ ${t('bce.physical.editor.auto_map')}
                                </button>
                                <button class="pe-add-sig-btn" style="${btnSmall} background: #27ae60;">
                                    + ${t('bce.physical.editor.add_signal')}
                                </button>
                            </div>
                        </div>
                        <div class="pe-sig-list">
                            ${entry.signals.length > 0
                                ? entry.signals.map(s => buildSignalRow(s, entry)).join('')
                                : `<div class="pe-sig-empty" style="padding: 15px; text-align: center; color: #7f8c8d; font-size: 12px;">
                                    ${t('bce.physical.editor.no_signals')}
                                  </div>`
                            }
                        </div>
                    </div>
                </div>
            `;
        };

        const buildStaticBadge = (entry) => `
            <div class="pe-static-item" style="
                display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 2px;
                border-radius: 4px; background: #1c2128; opacity: 0.6;
            ">
                <span style="
                    display: inline-block; padding: 2px 6px; background: #7f8c8d; color: white;
                    border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase;
                ">${self.escapeHtml(entry.type)}</span>
                <span style="color: #bdc3c7; font-size: 12px;">${self.escapeHtml(entry.name || '?')}</span>
                <span style="color: #7f8c8d; font-size: 10px; margin-left: auto;">${t('bce.physical.editor.static_badge')}</span>
            </div>
        `;

        // ---- Render principal ----
        const renderAll = () => {
            container.innerHTML = `
                <div style="height: 100%; display: flex; flex-direction: column; background: #1e1e1e; color: #ecf0f1; font-family: 'Segoe UI', Arial, sans-serif;">
                    ${jsonWarning ? `
                        <div style="padding: 8px 15px; background: #7d3c0a; color: #fdebd0; font-size: 12px; border-bottom: 1px solid #e67e22;">
                            ⚠️ ${t('bce.physical.editor.json_warning')}
                        </div>
                    ` : ''}
                    
                    <!-- Layout: llista lateral + panell edició -->
                    <div style="flex: 1; display: flex; overflow: hidden;">
                        <!-- Llista d'instàncies (esquerra) -->
                        <div style="width: 190px; min-width: 150px; border-right: 1px solid #34495e; display: flex; flex-direction: column; background: #1a1a2e;">
                            <div style="padding: 6px; border-bottom: 1px solid #34495e;">
                                <button id="pe-add-btn" style="
                                    width: 100%; padding: 6px 8px; background: #27ae60; color: white;
                                    border: none; border-radius: 4px; cursor: pointer; font-size: 12px;
                                    font-weight: 600; transition: background 0.2s;
                                ">+ ${t('bce.physical.editor.add_instance')}</button>
                            </div>
                            <div id="pe-instance-list" style="flex: 1; overflow-y: auto; padding: 4px;">
                                ${staticEntries.map(e => buildStaticBadge(e)).join('')}
                                ${twinEntries.map(tw => `
                                    <div class="pe-inst-item" data-uid="${tw._uid}" style="
                                        display: flex; justify-content: space-between; align-items: center;
                                        padding: 7px 8px; margin-bottom: 2px; border-radius: 4px; cursor: pointer;
                                        background: ${tw._uid === selectedUid ? '#2c3e50' : 'transparent'};
                                        color: ${tw._uid === selectedUid ? '#3498db' : '#bdc3c7'};
                                        font-weight: ${tw._uid === selectedUid ? '600' : '400'};
                                        transition: background 0.15s;
                                    ">
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; font-size: 12px;">
                                            🔧 ${self.escapeHtml(tw.name || t('bce.physical.editor.unnamed'))}
                                        </span>
                                        <button class="pe-remove-inst" data-uid="${tw._uid}" title="${t('bce.physical.editor.remove_instance')}" style="
                                            background: transparent; color: #e74c3c; border: none; cursor: pointer;
                                            font-size: 13px; padding: 0 3px; opacity: 0.7; transition: opacity 0.2s;
                                        ">✕</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Panell d'edició (dreta) -->
                        <div id="pe-edit-panel" style="flex: 1; overflow-y: auto;">
                            ${selectedUid !== null && twinEntries.find(tw => tw._uid === selectedUid)
                                ? buildTwinPanel(twinEntries.find(tw => tw._uid === selectedUid))
                                : `<div style="padding: 30px; text-align: center; color: #7f8c8d; font-size: 13px;">
                                    ${twinEntries.length === 0 ? t('bce.physical.editor.empty_hint') : t('bce.physical.editor.select_hint')}
                                  </div>`
                            }
                        </div>
                    </div>
                    
                    <!-- Botons Aplica / Cancel·la -->
                    <div style="padding: 10px 15px; border-top: 1px solid #34495e; display: flex; gap: 10px; justify-content: flex-end; background: #1c2128;">
                        <button id="pe-cancel-btn" style="
                            padding: 10px 20px; background: #7f8c8d; color: white;
                            border: none; border-radius: 6px; cursor: pointer;
                            font-size: 14px; font-weight: 600; transition: background 0.2s;
                        ">${t('bce.physical.editor.cancel')}</button>
                        <button id="pe-apply-btn" style="
                            padding: 10px 20px; background: #27ae60; color: white;
                            border: none; border-radius: 6px; cursor: pointer;
                            font-size: 14px; font-weight: 600; transition: background 0.2s;
                        ">${t('bce.physical.editor.apply')}</button>
                    </div>
                </div>
            `;

            // Attach events
            self._attachPhysicalEditorEvents(container, windowId, {
                twinEntries, staticEntries, twinsCatalog, vertebrae, vertebraOptions,
                buildTwinPanel, buildSignalRow, renderAll, getCatalogSignals,
                getSelectedUid: () => selectedUid,
                selectTwin: (uid) => { selectedUid = uid; renderAll(); },
                nextUidFn: () => nextUid++,
                nextSigUidFn: () => nextSigUid++,
                inputStyle, selectStyle, labelStyle, btnSmall
            });
        };

        renderAll();
    }

    /**
     * Guardar estat del panell d'edició actual al model intern
     */
    _savePhysicalPanelState(container, twinEntries, selectedUid) {
        if (selectedUid === null) return;
        const entry = twinEntries.find(e => e._uid === selectedUid);
        if (!entry) return;

        const panel = container.querySelector('.pe-twin-panel');
        if (!panel) return;

        const nameInput = panel.querySelector('.pe-name');
        const twinIdSelect = panel.querySelector('.pe-twinId');
        if (nameInput) entry.name = nameInput.value.trim();
        if (twinIdSelect) entry.twinId = twinIdSelect.value;

        // Recollir senyals
        const sigRows = panel.querySelectorAll('.pe-sig-row');
        const updatedSignals = [];
        sigRows.forEach(row => {
            const uid = parseInt(row.dataset.uid);
            const sigIdSel = row.querySelector('.pe-sig-id');
            const dirSel = row.querySelector('.pe-sig-dir');
            const typeSel = row.querySelector('.pe-sig-type');
            const vertSel = row.querySelector('.pe-sig-vert');
            const ribSel = row.querySelector('.pe-sig-rib');
            const bitInput = row.querySelector('.pe-sig-bit');
            const chInput = row.querySelector('.pe-sig-ch');
            const labelInput = row.querySelector('.pe-sig-label');
            updatedSignals.push({
                _uid: uid,
                signalId: sigIdSel ? sigIdSel.value : '',
                direction: dirSel ? dirSel.value : 'fromPLC',
                type: typeSel ? typeSel.value : 'digital',
                vertebra: vertSel ? vertSel.value : '0x0',
                rib: ribSel ? ribSel.value : 'a',
                bit: bitInput ? (bitInput.value !== '' ? parseInt(bitInput.value) : '') : '',
                channel: chInput ? (chInput.value !== '' ? parseInt(chInput.value) : '') : '',
                labelOverride: labelInput ? labelInput.value.trim() : ''
            });
        });
        entry.signals = updatedSignals;
    }

    /**
     * Attach event listeners per l'editor visual de connexió bessons
     */
    _attachPhysicalEditorEvents(container, windowId, ctx) {
        const WM = window.windowManager || window.WindowManager;
        const self = this;

        // Afegir instància
        const addBtn = container.querySelector('#pe-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                self._savePhysicalPanelState(container, ctx.twinEntries, ctx.getSelectedUid());
                const uid = ctx.nextUidFn();
                ctx.twinEntries.push({ _uid: uid, name: '', twinId: '', signals: [] });
                ctx.selectTwin(uid);
            });
        }

        // Seleccionar instància de la llista
        container.querySelectorAll('.pe-inst-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.pe-remove-inst')) return;
                self._savePhysicalPanelState(container, ctx.twinEntries, ctx.getSelectedUid());
                const uid = parseInt(item.dataset.uid);
                ctx.selectTwin(uid);
            });
        });

        // Eliminar instància
        container.querySelectorAll('.pe-remove-inst').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const uid = parseInt(btn.dataset.uid);
                const idx = ctx.twinEntries.findIndex(e => e._uid === uid);
                if (idx >= 0) {
                    ctx.twinEntries.splice(idx, 1);
                    if (ctx.getSelectedUid() === uid) {
                        ctx.selectTwin(ctx.twinEntries.length > 0 ? ctx.twinEntries[0]._uid : null);
                    } else {
                        ctx.renderAll();
                    }
                }
            });
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
            btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.7'; });
        });

        // ---- Events del panell d'edició ----
        const panel = container.querySelector('.pe-twin-panel');
        if (panel) {
            // Canvi de twinId → recarregar senyals des del catàleg
            const twinIdSelect = panel.querySelector('.pe-twinId');
            if (twinIdSelect) {
                twinIdSelect.addEventListener('change', () => {
                    self._savePhysicalPanelState(container, ctx.twinEntries, ctx.getSelectedUid());
                    ctx.renderAll();
                });
            }

            // Afegir senyal manualment
            const addSigBtn = panel.querySelector('.pe-add-sig-btn');
            if (addSigBtn) {
                addSigBtn.addEventListener('click', () => {
                    self._savePhysicalPanelState(container, ctx.twinEntries, ctx.getSelectedUid());
                    const entry = ctx.twinEntries.find(e => e._uid === ctx.getSelectedUid());
                    if (!entry) return;
                    entry.signals.push({
                        _uid: ctx.nextSigUidFn(),
                        signalId: '', direction: 'fromPLC', type: 'digital',
                        vertebra: ctx.vertebraOptions[0] || '0x0', rib: 'a', bit: 0, channel: ''
                    });
                    ctx.renderAll();
                });
            }

            // Auto-map: generar senyals des del catàleg per al twinId seleccionat
            const autoMapBtn = panel.querySelector('.pe-auto-map-btn');
            if (autoMapBtn) {
                autoMapBtn.addEventListener('click', () => {
                    self._savePhysicalPanelState(container, ctx.twinEntries, ctx.getSelectedUid());
                    const entry = ctx.twinEntries.find(e => e._uid === ctx.getSelectedUid());
                    if (!entry || !entry.twinId) return;

                    const catalogSigs = ctx.getCatalogSignals(entry.twinId);
                    if (catalogSigs.length === 0) return;

                    // Detectar tipus de vèrtebra: si hi ha algun slider/gauge → analog
                    const defaultVert = ctx.vertebraOptions[0] || '0x0';
                    // Determinar rib per direcció: fromPLC → costella A (output), toPLC → costella B (input)
                    let digitalBitCounter = { fromPLC: 0, toPLC: 0 };
                    let analogChCounter = { fromPLC: 1, toPLC: 1 };

                    const newSignals = catalogSigs.map(cs => {
                        const isAnalog = cs.componentType === 'slider' || cs.componentType === 'gauge';
                        const dir = cs.direction;
                        const rib = dir === 'fromPLC' ? 'a' : 'b';
                        const sig = {
                            _uid: ctx.nextSigUidFn(),
                            signalId: cs.signalId,
                            direction: dir,
                            type: isAnalog ? 'analog' : 'digital',
                            vertebra: defaultVert,
                            rib: rib,
                            bit: !isAnalog ? digitalBitCounter[dir]++ : '',
                            channel: isAnalog ? analogChCounter[dir]++ : ''
                        };
                        return sig;
                    });

                    entry.signals = newSignals;
                    ctx.renderAll();
                });
            }

            // Eliminar senyal
            panel.querySelectorAll('.pe-sig-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    self._savePhysicalPanelState(container, ctx.twinEntries, ctx.getSelectedUid());
                    const sigUid = parseInt(btn.dataset.uid);
                    const entry = ctx.twinEntries.find(e => e._uid === ctx.getSelectedUid());
                    if (entry) {
                        entry.signals = entry.signals.filter(s => s._uid !== sigUid);
                        ctx.renderAll();
                    }
                });
                btn.addEventListener('mouseenter', () => { btn.style.background = '#c0392b'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = '#e74c3c'; });
            });

            // Toggle digital/analog: mostrar bit o channel
            panel.querySelectorAll('.pe-sig-type').forEach(sel => {
                sel.addEventListener('change', () => {
                    const row = sel.closest('.pe-sig-row');
                    if (!row) return;
                    const bitWrap = row.querySelector('.pe-sig-bit-wrap');
                    const chWrap = row.querySelector('.pe-sig-ch-wrap');
                    if (sel.value === 'analog') {
                        if (bitWrap) bitWrap.style.display = 'none';
                        if (chWrap) chWrap.style.display = '';
                    } else {
                        if (bitWrap) bitWrap.style.display = '';
                        if (chWrap) chWrap.style.display = 'none';
                    }
                });
            });

            // Canvi de signal selector → auto-set direction
            panel.querySelectorAll('.pe-sig-id').forEach(sel => {
                sel.addEventListener('change', () => {
                    const opt = sel.options[sel.selectedIndex];
                    const dir = opt ? opt.dataset.dir : null;
                    if (dir) {
                        const row = sel.closest('.pe-sig-row');
                        const dirSel = row ? row.querySelector('.pe-sig-dir') : null;
                        if (dirSel) dirSel.value = dir;
                    }
                });
            });
        }

        // Cancel·la
        const cancelBtn = container.querySelector('#pe-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => { WM.closeWindow(windowId); });
            cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#6c7a7d'; });
            cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = '#7f8c8d'; });
        }

        // Aplica: generar JSON i posar al textarea
        const applyBtn = container.querySelector('#pe-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                self._savePhysicalPanelState(container, ctx.twinEntries, ctx.getSelectedUid());

                // Generar JSON final
                const twinResults = ctx.twinEntries.map(entry => {
                    const obj = { type: 'twin', twinId: entry.twinId, name: entry.name };
                    // Construir ioConfig des dels senyals
                    const ioConfig = {};
                    const labelOverrides = {};
                    entry.signals.forEach(sig => {
                        if (!sig.signalId) return;
                        const dir = sig.direction || 'fromPLC';
                        if (!ioConfig[dir]) ioConfig[dir] = {};
                        const mapping = { type: sig.type, vertebra: sig.vertebra, rib: sig.rib };
                        if (sig.type === 'analog') {
                            mapping.channel = typeof sig.channel === 'number' ? sig.channel : parseInt(sig.channel) || 1;
                        } else {
                            mapping.bit = typeof sig.bit === 'number' ? sig.bit : parseInt(sig.bit) || 0;
                        }
                        ioConfig[dir][sig.signalId] = mapping;
                        // Guardar labelOverride si existeix
                        if (sig.labelOverride) {
                            labelOverrides[sig.signalId] = sig.labelOverride;
                        }
                    });
                    if (Object.keys(ioConfig).length > 0) {
                        obj.ioConfig = ioConfig;
                        if (Object.keys(labelOverrides).length > 0) {
                            obj.ioConfig.labelOverrides = labelOverrides;
                        }
                    }
                    return obj;
                });

                const result = [...ctx.staticEntries, ...twinResults];
                const jsonStr = JSON.stringify(result, null, 2);
                if (self.editorTextarea) {
                    self.editorTextarea.value = jsonStr;
                }
                WM.closeWindow(windowId);
            });
            applyBtn.addEventListener('mouseenter', () => { applyBtn.style.background = '#219a52'; });
            applyBtn.addEventListener('mouseleave', () => { applyBtn.style.background = '#27ae60'; });
        }
    }

    /**
     * Gestionar tancament de finestra - tancar directament sense diàleg d'exportació
     */
    _handleClose() {
        this._closeWindow();
        return true;
    }

    /**
     * Mostrar diàleg d'exportació
     */
    _showExportDialog() {
        const WM = window.windowManager || window.WindowManager;
        if (!WM) {
            this._closeWindow();
            return;
        }
        
        // Crear finestra de diàleg
        const dialogWindow = WM.createWindow({
            id: 'export-dialog',
            title: t('bce.export.window_title'),
            width: 450,
            height: 220,
            x: 200,
            y: 200,
            modal: true
        });
        
        if (!dialogWindow) {
            this._closeWindow();
            return;
        }
        
        const container = dialogWindow.contentElement || dialogWindow.content || dialogWindow.body;
        
        container.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #1e1e1e;
            color: #ecf0f1;
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        container.innerHTML = `
            <div style="flex: 1;">
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #c9d1d9;">
                    ${t('bce.export.question')}
                </p>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px;">
                        ${t('bce.export.basename_label')}
                    </label>
                    <input 
                        type="text" 
                        id="export-basename" 
                        value="file"
                        style="
                            width: 100%;
                            padding: 10px;
                            background: #2c3e50;
                            color: #ecf0f1;
                            border: 1px solid #34495e;
                            border-radius: 6px;
                            font-size: 14px;
                            box-sizing: border-box;
                        "
                    />
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #95a5a6;">
                        ${t('bce.export.basename_hint')}
                    </p>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button 
                    id="export-discard-btn"
                    style="
                        padding: 10px 20px;
                        background: #7f8c8d;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                    "
                >
                    ${t('bce.export.discard')}
                </button>
                <button 
                    id="export-cancel-btn"
                    style="
                        padding: 10px 20px;
                        background: #95a5a6;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                    "
                >
                    ${t('bce.export.cancel')}
                </button>
                <button 
                    id="export-confirm-btn"
                    style="
                        padding: 10px 20px;
                        background: #27ae60;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                    "
                >
                    ${t('bce.export.confirm')}
                </button>
            </div>
        `;
        
        // Event listeners
        const basenameInput = container.querySelector('#export-basename');
        const confirmBtn = container.querySelector('#export-confirm-btn');
        const cancelBtn = container.querySelector('#export-cancel-btn');
        const discardBtn = container.querySelector('#export-discard-btn');
        
        confirmBtn.addEventListener('click', () => {
            const baseName = basenameInput.value.trim() || 'file';
            this._exportConfigs(baseName);
            WM.closeWindow('export-dialog');
            this._closeWindow();
        });
        
        cancelBtn.addEventListener('click', () => {
            WM.closeWindow('export-dialog');
        });
        
        discardBtn.addEventListener('click', () => {
            WM.closeWindow('export-dialog');
            this._closeWindow();
        });
        
        // Focus al input
        basenameInput.focus();
        basenameInput.select();
    }

    /**
     * Exportar configuracions com a JSON
     */
    _exportConfigs(baseName) {
        try {
            // 1. Exportar altres bessons
            const othersConfig = this.editorTextarea ? this.editorTextarea.value : '[]';
            
            // 2. Exportar bessó digital - guardar referència ABANS de setTimeout
            let digitalConfig = '{}';
            if (this.presetEditor && this.presetEditor.editorTextarea) {
                digitalConfig = this.presetEditor.editorTextarea.value;
            }
            
            // Baixar fitxers
            this._downloadJSON(othersConfig, `${baseName}_others.json`);
            
            setTimeout(() => {
                this._downloadJSON(digitalConfig, `${baseName}_iotv.json`);
            }, 200);
            
            console.log(`✅ Configuracions exportades: ${baseName}_others.json, ${baseName}_iotv.json`);
        } catch (error) {
            console.error('Error exportant configuracions:', error);
        }
    }

    /**
     * Baixar JSON com a fitxer
     */
    _downloadJSON(jsonContent, filename) {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Tancar finestra sense diàlegs
     */
    _closeWindow() {
        // Destruir instàncies CodeMirror
        if (this._physicalCM) {
            this._physicalCM.destroy();
            this._physicalCM = null;
        }
        if (this._twinsCM) {
            this._twinsCM.destroy();
            this._twinsCM = null;
        }
        this.window = null;
        this.editorTextarea = null;
        this.twinsTextarea = null;
        this.presetEditor = null;
    }
}

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.BessoConfigEditor = new BessoConfigEditor();
}

console.log('✓ BessoConfigEditor loaded');
