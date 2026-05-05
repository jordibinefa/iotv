/**
 * PresetEditorComponent - Component per editar presets de bessó digital
 * 
 * Funcionalitat:
 * - Dropdown de selecció de preset
 * - Editor JSON del preset seleccionat
 * - Validació de sintaxi i estructura
 * - Gestió de canvis amb confirmació
 * - Tots els textos internacionalitzats (ca/es/en)
 */

class PresetEditorComponent {
    constructor() {
        this.currentPresetName = null;
        this.currentPresetData = null;
        this.editorTextarea = null;
        this.presetSelector = null;
        this.hasUnsavedChanges = false;
        this.originalPresetJSON = null; // Per detectar canvis
    }
    
    /**
     * Renderitzar component
     * @param {HTMLElement} container - Contenidor on renderitzar
     * @returns {HTMLElement} Element renderitzat
     */
    render(container) {
        // Obtenir presets disponibles
        const presets = window.VertebraeConfig.getAvailablePresets();
        
        // Obtenir preset actual carregat
        const currentConfig = window.VertebraeConfig.get();
        this.currentPresetName = currentConfig ? currentConfig.name : presets[0].name;
        
        // Si el preset actual no és un dels presets coneguts, afegir-lo com a opció "custom"
        const isKnownPreset = presets.some(p => p.name === this.currentPresetName);
        if (!isKnownPreset && currentConfig) {
            presets.push({
                name: this.currentPresetName,
                description: currentConfig.description || 'Configuració importada'
            });
        }
        
        // Carregar dades del preset actual
        this._loadPreset(this.currentPresetName);
        
        container.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column;">
                <!-- Header amb selector -->
                <div style="padding: 15px; border-bottom: 1px solid #34495e;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #ecf0f1;">
                            ${t('bce.digital.preset_label')}
                        </label>
                        <select 
                            id="preset-selector" 
                            style="
                                width: 100%;
                                padding: 10px;
                                background: #2c3e50;
                                color: #ecf0f1;
                                border: 1px solid #34495e;
                                border-radius: 6px;
                                font-size: 14px;
                                cursor: pointer;
                            "
                        >
                            ${presets.map(preset => `
                                <option 
                                    value="${preset.name}" 
                                    ${preset.name === this.currentPresetName ? 'selected' : ''}
                                >
                                    ${preset.name} - ${preset.description}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <p style="margin: 10px 0 0 0; font-size: 13px; color: #95a5a6;">
                        ${t('bce.digital.description')}
                    </p>
                </div>
                
                <!-- Editor JSON -->
                <div style="flex: 1; display: flex; flex-direction: column; padding: 15px; overflow: hidden;">
                    <label style="margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #ecf0f1;">
                        ${t('bce.digital.json_label')}
                    </label>
                    <div 
                        id="preset-editor-cm-container" 
                        style="
                            flex: 1;
                            border: 1px solid #34495e;
                            border-radius: 6px;
                            overflow: hidden;
                        "
                    ></div>
                </div>
                
                <!-- Àrea de validació -->
                <div 
                    id="preset-validation-output" 
                    style="
                        max-height: 150px;
                        overflow-y: auto;
                        background: #2c3e50;
                        border: 1px solid #34495e;
                        border-radius: 6px;
                        padding: 10px;
                        margin: 0 15px 15px 15px;
                        font-size: 13px;
                        display: none;
                    "
                ></div>
                
                <!-- Botons: Edita + Visor + Validació -->
                <div style="padding: 0 15px 15px 15px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        id="preset-editor-visual-btn"
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
                        ${t('bce.digital.editor_btn')}
                    </button>
                    <button 
                        id="preset-viewer-btn"
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
                        id="preset-validate-btn"
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
                        ${t('bce.digital.validate_btn')}
                    </button>
                </div>
            </div>
        `;
        
        // Obtenir referències
        const cmContainer = container.querySelector('#preset-editor-cm-container');
        this.presetSelector = container.querySelector('#preset-selector');
        const validateBtn = container.querySelector('#preset-validate-btn');
        const viewerBtn = container.querySelector('#preset-viewer-btn');
        const editorVisualBtn = container.querySelector('#preset-editor-visual-btn');
        const validationOutput = container.querySelector('#preset-validation-output');
        
        // Inicialitzar CodeMirror
        this._initPresetCM(cmContainer, validationOutput);
        
        // Event listeners
        this.presetSelector.addEventListener('change', (e) => {
            this._onPresetChange(e.target.value, validationOutput);
        });
        
        validateBtn.addEventListener('click', () => {
            this.validate(validationOutput);
        });
        
        viewerBtn.addEventListener('click', () => {
            const jsonText = this.editorTextarea ? this.editorTextarea.value : '{}';
            if (window.JsonViewer) {
                window.JsonViewer.open(jsonText, 'bce.viewer.window_title_digital');
            }
        });
        
        editorVisualBtn.addEventListener('click', () => {
            this._openVisualEditor();
        });
        
        // Hover effects
        validateBtn.addEventListener('mouseenter', () => { validateBtn.style.background = '#2980b9'; });
        validateBtn.addEventListener('mouseleave', () => { validateBtn.style.background = '#3498db'; });
        viewerBtn.addEventListener('mouseenter', () => { viewerBtn.style.background = '#7d3c98'; });
        viewerBtn.addEventListener('mouseleave', () => { viewerBtn.style.background = '#8e44ad'; });
        editorVisualBtn.addEventListener('mouseenter', () => { editorVisualBtn.style.background = '#cf6d17'; });
        editorVisualBtn.addEventListener('mouseleave', () => { editorVisualBtn.style.background = '#e67e22'; });
        
        return container;
    }
    
    async _initPresetCM(cmContainer, validationOutput) {
        if (!window.CodeEditorManager) return;
        try {
            this._presetCM = await window.CodeEditorManager.create(cmContainer, {
                language: 'json',
                initialValue: this._formatJSON(this.currentPresetData),
                lint: true,
                onChange: () => {
                    this.hasUnsavedChanges = true;
                    this._detectCustomPreset();
                }
            });
            
            // Guardar JSON original del preset carregat
            this.originalPresetJSON = this._presetCM.getValue();
            
            // Compatibilitat: wrapper per this.editorTextarea
            this.editorTextarea = {
                get value() { return this._cm.getValue(); },
                set value(v) { this._cm.setValue(v); },
                addEventListener: (event, cb) => {
                    if (event === 'input') {
                        this._presetCM.onchange(cb);
                    }
                },
                _cm: this._presetCM
            };
        } catch (err) {
            console.error('[PresetEditorComponent] Error inicialitzant CM:', err);
        }
    }
    
    /**
     * Carregar preset
     * Prioritza la configuració activa (pot ser importada) sobre els PRESETS estàtics
     */
    _loadPreset(presetName) {
        // Prioritzar la configuració activa (pot haver estat importada)
        const currentConfig = window.VertebraeConfig.get();
        if (currentConfig && currentConfig.name === presetName) {
            this.currentPresetData = JSON.parse(JSON.stringify(currentConfig));
            this.hasUnsavedChanges = false;
            return;
        }
        
        // Fallback: carregar des dels PRESETS estàtics
        const preset = window.VertebraeConfig.PRESETS[presetName];
        if (preset) {
            this.currentPresetData = JSON.parse(JSON.stringify(preset));
            this.hasUnsavedChanges = false;
        }
    }
    
    /**
     * Gestionar canvi de preset
     */
    _onPresetChange(newPresetName, validationOutput) {
        // Advertir si hi ha canvis no guardats
        if (this.hasUnsavedChanges) {
            const confirmed = confirm(t('bce.digital.confirm_unsaved'));
            
            if (!confirmed) {
                // Restaurar selector al preset anterior
                const selector = document.querySelector('#preset-selector');
                if (selector) {
                    selector.value = this.currentPresetName;
                }
                return;
            }
        }
        
        // Carregar nou preset
        this.currentPresetName = newPresetName;
        this._loadPreset(newPresetName);
        
        // Actualitzar editor
        if (this.editorTextarea) {
            this.editorTextarea.value = this._formatJSON(this.currentPresetData);
            this.originalPresetJSON = this.editorTextarea.value; // Guardar com a referència
        } else if (this._presetCM) {
            this._presetCM.setValue(this._formatJSON(this.currentPresetData));
            this.originalPresetJSON = this._presetCM.getValue();
        }
        
        // IMPORTANT: Marcar com a modificat per forçar actualització del canvas
        // Quan es canvia de preset, s'ha de considerar com un canvi que requereix aplicar
        this.hasUnsavedChanges = true;
        
        // Restaurar estil normal del selector
        if (this.presetSelector) {
            this.presetSelector.style.color = '';
            this.presetSelector.style.fontWeight = '';
        }
        
        // Netejar validació
        if (validationOutput) {
            validationOutput.style.display = 'none';
            validationOutput.innerHTML = '';
        }
    }
    
    /**
     * Validar preset actual
     */
    validate(outputElement) {
        const jsonText = this.editorTextarea.value;
        
        // Validar JSON
        const validation = window.VertebraeConfigValidator.validateJSON(jsonText);
        
        // Mostrar resultats
        outputElement.style.display = 'block';
        
        if (validation.valid) {
            let html = `<div style="color: #27ae60; font-weight: 600; margin-bottom: 8px;">${this._escapeHtml(t('bce.config_valid'))}</div>`;
            
            if (validation.warnings.length > 0) {
                html += `<div style="margin-top: 10px;"><strong style="color: #f39c12;">${this._escapeHtml(t('bce.warnings_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
                validation.warnings.forEach(warn => {
                    html += `<li style="color: #f39c12; margin: 3px 0;">${this._escapeHtml(warn)}</li>`;
                });
                html += '</ul></div>';
            }
            
            outputElement.innerHTML = html;
        } else {
            let html = `<div style="color: #e74c3c; font-weight: 600; margin-bottom: 8px;">${this._escapeHtml(t('bce.config_invalid'))}</div>`;
            html += `<div><strong style="color: #e74c3c;">${this._escapeHtml(t('bce.errors_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
            
            validation.errors.forEach(err => {
                html += `<li style="color: #e74c3c; margin: 3px 0;">${this._escapeHtml(err)}</li>`;
            });
            html += '</ul></div>';
            
            if (validation.warnings.length > 0) {
                html += `<div style="margin-top: 10px;"><strong style="color: #f39c12;">${this._escapeHtml(t('bce.warnings_label'))}</strong><ul style="margin: 5px 0; padding-left: 20px;">`;
                validation.warnings.forEach(warn => {
                    html += `<li style="color: #f39c12; margin: 3px 0;">${this._escapeHtml(warn)}</li>`;
                });
                html += '</ul></div>';
            }
            
            outputElement.innerHTML = html;
        }
        
        return validation.valid;
    }
    
    /**
     * Obtenir dades del preset editades
     */
    getEditedPreset() {
        try {
            const jsonText = this.editorTextarea.value;
            return JSON.parse(jsonText);
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Comprovar si hi ha canvis
     */
    isDirty() {
        if (!this.editorTextarea || !this.originalPresetJSON) return false;
        return this.editorTextarea.value.trim() !== this.originalPresetJSON.trim();
    }
    
    /**
     * Formatar JSON
     */
    _formatJSON(data) {
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Escapar HTML
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Obrir l'editor visual de preset en una finestra nova
     */
    _openVisualEditor() {
        const WM = window.windowManager || window.WindowManager;
        if (!WM) {
            console.error('[PresetEditorComponent] WindowManager no disponible');
            return;
        }

        // Intentar parsejar JSON actual
        let presetData = null;
        let jsonWarning = false;
        try {
            const jsonText = this.editorTextarea ? this.editorTextarea.value : '{}';
            presetData = JSON.parse(jsonText);
        } catch (e) {
            jsonWarning = true;
            presetData = { name: '', description: '', version: '1.0', vertebrae: [] };
        }

        const windowId = 'preset-visual-editor-' + Date.now();
        const editorWindow = WM.createWindow({
            id: windowId,
            title: t('bce.digital.editor.window_title'),
            width: 700,
            height: 550,
            x: 150,
            y: 80
        });

        if (!editorWindow) return;

        const container = editorWindow.contentElement || editorWindow.content || editorWindow.body;
        if (!container) return;

        this._buildEditorForm(container, presetData, jsonWarning, windowId);
    }

    /**
     * Construir el formulari visual dins del contenidor de la finestra
     */
    _buildEditorForm(container, presetData, jsonWarning, windowId) {
        const WM = window.windowManager || window.WindowManager;
        
        // Estils comuns per inputs
        const inputStyle = `
            width: 100%;
            padding: 8px 10px;
            background: #2c3e50;
            color: #ecf0f1;
            border: 1px solid #34495e;
            border-radius: 4px;
            font-size: 13px;
            box-sizing: border-box;
        `;
        const selectStyle = `
            padding: 8px 10px;
            background: #2c3e50;
            color: #ecf0f1;
            border: 1px solid #34495e;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
        `;
        const labelStyle = `
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            font-size: 13px;
            color: #ecf0f1;
        `;

        // Generar HTML de vèrtebres existents
        const vertebrae = presetData.vertebrae || [];
        
        const buildVertebraRow = (v, index) => {
            const typeOpts = ['digital', 'analog'].map(val =>
                `<option value="${val}" ${v.type === val ? 'selected' : ''}>${val}</option>`
            ).join('');
            const ribOpts = (selected) => ['output', 'input', 'none'].map(val =>
                `<option value="${val}" ${selected === val ? 'selected' : ''}>${val}</option>`
            ).join('');

            return `
                <div class="vertebra-row" data-index="${index}" style="
                    display: flex; gap: 8px; align-items: center; padding: 8px;
                    background: #1a1a2e; border-radius: 4px; margin-bottom: 6px;
                ">
                    <div style="flex: 1; min-width: 70px;">
                        <label style="${labelStyle}">addr</label>
                        <input type="text" class="v-addr" value="${this._escapeHtml(v.addr || '')}" style="${inputStyle}" />
                    </div>
                    <div style="flex: 0 0 100px;">
                        <label style="${labelStyle}">type</label>
                        <select class="v-type" style="${selectStyle} width:100%;">${typeOpts}</select>
                    </div>
                    <div style="flex: 0 0 100px;">
                        <label style="${labelStyle}">costellaA</label>
                        <select class="v-costellaA" style="${selectStyle} width:100%;">${ribOpts(v.costellaA)}</select>
                    </div>
                    <div style="flex: 0 0 100px;">
                        <label style="${labelStyle}">costellaB</label>
                        <select class="v-costellaB" style="${selectStyle} width:100%;">${ribOpts(v.costellaB)}</select>
                    </div>
                    <div style="flex: 0 0 32px; align-self: flex-end; padding-bottom: 2px;">
                        <button class="v-remove-btn" title="${t('bce.digital.editor.remove_vertebra')}" style="
                            background: #e74c3c; color: white; border: none; border-radius: 4px;
                            width: 32px; height: 34px; cursor: pointer; font-size: 16px;
                            transition: background 0.2s;
                        ">✕</button>
                    </div>
                </div>
            `;
        };

        container.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column; background: #1e1e1e; color: #ecf0f1;">
                ${jsonWarning ? `
                    <div style="padding: 10px 15px; background: #7d3c0a; color: #fdebd0; font-size: 13px; border-bottom: 1px solid #e67e22;">
                        ⚠️ ${t('bce.digital.editor.json_warning')}
                    </div>
                ` : ''}
                
                <!-- Camps principals -->
                <div style="padding: 15px; border-bottom: 1px solid #34495e;">
                    <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                        <div style="flex: 2;">
                            <label style="${labelStyle}">${t('bce.digital.editor.name')}</label>
                            <input type="text" id="ve-name" value="${this._escapeHtml(presetData.name || '')}" style="${inputStyle}" />
                        </div>
                        <div style="flex: 1;">
                            <label style="${labelStyle}">${t('bce.digital.editor.version')}</label>
                            <input type="text" id="ve-version" value="${this._escapeHtml(presetData.version || '')}" style="${inputStyle}" />
                        </div>
                    </div>
                    <div>
                        <label style="${labelStyle}">${t('bce.digital.editor.description')}</label>
                        <input type="text" id="ve-description" value="${this._escapeHtml(presetData.description || '')}" style="${inputStyle}" />
                    </div>
                </div>
                
                <!-- Llista de vèrtebres -->
                <div style="flex: 1; overflow-y: auto; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <label style="font-weight: 600; font-size: 14px; color: #ecf0f1;">
                            ${t('bce.digital.editor.vertebrae_title')}
                        </label>
                        <button id="ve-add-vertebra" style="
                            padding: 6px 14px; background: #27ae60; color: white;
                            border: none; border-radius: 4px; cursor: pointer;
                            font-size: 13px; font-weight: 600; transition: background 0.2s;
                        ">+ ${t('bce.digital.editor.add_vertebra')}</button>
                    </div>
                    <div id="ve-vertebrae-list">
                        ${vertebrae.map((v, i) => buildVertebraRow(v, i)).join('')}
                    </div>
                </div>
                
                <!-- Botons Aplica / Cancel·la -->
                <div style="padding: 12px 15px; border-top: 1px solid #34495e; display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="ve-cancel-btn" style="
                        padding: 10px 20px; background: #7f8c8d; color: white;
                        border: none; border-radius: 6px; cursor: pointer;
                        font-size: 14px; font-weight: 600; transition: background 0.2s;
                    ">${t('bce.digital.editor.cancel')}</button>
                    <button id="ve-apply-btn" style="
                        padding: 10px 20px; background: #27ae60; color: white;
                        border: none; border-radius: 6px; cursor: pointer;
                        font-size: 14px; font-weight: 600; transition: background 0.2s;
                    ">${t('bce.digital.editor.apply')}</button>
                </div>
            </div>
        `;

        // --- Event listeners ---

        // Afegir vèrtebra
        const addBtn = container.querySelector('#ve-add-vertebra');
        const listEl = container.querySelector('#ve-vertebrae-list');
        let vertebraIndex = vertebrae.length;

        addBtn.addEventListener('click', () => {
            const newV = { addr: '0x0', type: 'digital', costellaA: 'output', costellaB: 'input' };
            const wrapper = document.createElement('div');
            wrapper.innerHTML = buildVertebraRow(newV, vertebraIndex++);
            const row = wrapper.firstElementChild;
            listEl.appendChild(row);
            this._attachRemoveHandler(row);
            // Scroll al final
            listEl.scrollTop = listEl.scrollHeight;
        });
        addBtn.addEventListener('mouseenter', () => { addBtn.style.background = '#219a52'; });
        addBtn.addEventListener('mouseleave', () => { addBtn.style.background = '#27ae60'; });

        // Eliminar vèrtebra (files existents)
        container.querySelectorAll('.vertebra-row').forEach(row => {
            this._attachRemoveHandler(row);
        });

        // Cancel·la
        const cancelBtn = container.querySelector('#ve-cancel-btn');
        cancelBtn.addEventListener('click', () => {
            WM.closeWindow(windowId);
        });
        cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#6c7a7d'; });
        cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = '#7f8c8d'; });

        // Aplica
        const applyBtn = container.querySelector('#ve-apply-btn');
        applyBtn.addEventListener('click', () => {
            const result = this._collectFormData(container);
            const jsonStr = JSON.stringify(result, null, 2);
            if (this.editorTextarea) {
                this.editorTextarea.value = jsonStr;
            }
            this.hasUnsavedChanges = true;
            this._detectCustomPreset();
            WM.closeWindow(windowId);
        });
        applyBtn.addEventListener('mouseenter', () => { applyBtn.style.background = '#219a52'; });
        applyBtn.addEventListener('mouseleave', () => { applyBtn.style.background = '#27ae60'; });
    }

    /**
     * Adjuntar handler d'eliminar a una fila de vèrtebra
     */
    _attachRemoveHandler(row) {
        const removeBtn = row.querySelector('.v-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                row.remove();
            });
            removeBtn.addEventListener('mouseenter', () => { removeBtn.style.background = '#c0392b'; });
            removeBtn.addEventListener('mouseleave', () => { removeBtn.style.background = '#e74c3c'; });
        }
    }

    /**
     * Recollir dades del formulari visual
     */
    _collectFormData(container) {
        const name = container.querySelector('#ve-name').value.trim();
        const description = container.querySelector('#ve-description').value.trim();
        const version = container.querySelector('#ve-version').value.trim();

        const vertebrae = [];
        container.querySelectorAll('.vertebra-row').forEach(row => {
            vertebrae.push({
                addr: row.querySelector('.v-addr').value.trim(),
                type: row.querySelector('.v-type').value,
                costellaA: row.querySelector('.v-costellaA').value,
                costellaB: row.querySelector('.v-costellaB').value
            });
        });

        return { name, description, version, vertebrae };
    }

    /**
     * Detectar si el preset s'ha modificat (custom)
     */
    _detectCustomPreset() {
        if (!this.presetSelector || !this.editorTextarea) return;
        
        const currentPresetName = this.presetSelector.value;
        
        if (currentPresetName === 'custom') {
            return; // Ja està marcat com a custom
        }
        
        // Comparar JSON actual amb l'original
        const currentJSON = this.editorTextarea.value.trim();
        const originalJSON = (this.originalPresetJSON || '').trim();
        
        if (currentJSON !== originalJSON) {
            // Ha canviat! Marcar com a custom
            this.presetSelector.value = 'custom';
            this.presetSelector.style.color = '#f39c12'; // Taronja
            this.presetSelector.style.fontWeight = '700';
        } else {
            // Tornar al color normal
            this.presetSelector.style.color = '';
            this.presetSelector.style.fontWeight = '';
        }
    }
}

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.PresetEditorComponent = PresetEditorComponent;
}

console.log('✓ PresetEditorComponent loaded');
