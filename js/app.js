/**
 * app.js - Bootstrap de IoT-Vertebrae v2
 * 
 * Inicialitza i connecta tots els components:
 * - MenuBar
 * - WindowManager
 * - ScriptEditor
 * - DigitalTwin
 * - ConsoleOutput
 */

class IoTVertebraeApp {
    constructor() {
        // Referències als components
        this.menuBar = null;
        this.windowManager = null;
        this.scriptEditor = null;
        this.digitalTwin = null;
        this.consoleOutput = null;
        this.pythonConsole = null;  // PythonConsoleWindow
        
        // Referències a finestres
        this.windows = {
            editor: null,
            twin: null,
            console: null,
            pyconsole: null
        };
        
        // Estat
        this.isRunning = false;
        this._examplesAvailable = false;
        this._examplesList = [];

        // Visualització del bessó digital: 'canvas' (v1) | 'schematic' (v2)
        // Inicialitza a null perquè switchTwinView('canvas') efectiva la primera vegada
        this.twinViewMode = null;
        // Instàncies de les dos visualitzacions
        this.canvasTwin = null;  // CanvasTwin (v1)
        // this.digitalTwin ja es crea a initComponents (v2 schematic)
    }

    /**
     * Inicialitzar aplicació
     */
    async init() {
        console.log('🚀 Inicialitzant IoT-Vertebrae v2...');
        
        // 1. Inicialitzar i18n
        this.initI18n();
        
        // 2. Inicialitzar WindowManager
        this.initWindowManager();
        
        // 3. Crear finestres
        this.createWindows();
        
        // 4. Inicialitzar components dins finestres
        this.initComponents();
        
        // 5. Carregar manifest d'exemples ABANS del menú
        await this.loadExamplesManifest();
        
        // 6. Inicialitzar MenuBar (ja sap si hi ha exemples)
        this.initMenuBar();
        
        // 7. Inicialitzar gestors de projectes
        this.initProjectManagers();
        
        // 8. Configurar event listeners globals
        this.setupGlobalListeners();
        
        // 9. Processar hash de la URL (#open:url, #load:url, #run:url)
        this.processUrlHash();
        
        console.log('✓ IoT-Vertebrae v2 inicialitzat correctament');
    }

    /**
     * Processar hash de la URL per importar projecte
     * Formats:
     *   #open:URL  → importa amb diàleg de confirmació
     *   #load:URL  → importa directament (sense diàleg)
     *   #run:URL   → importa directament i executa l'script Python
     */
    processUrlHash() {
        const hash = window.location.hash;
        if (!hash) return;
        
        // Detectar mode i extreure URL
        let mode = null;
        let url = null;
        
        if (hash.startsWith('#open:')) {
            mode = 'open';
            url = hash.substring(6);
        } else if (hash.startsWith('#load:')) {
            mode = 'load';
            url = hash.substring(6);
        } else if (hash.startsWith('#run:')) {
            mode = 'run';
            url = hash.substring(5);
        }
        
        if (!mode || !url) return;
        
        // Validar que sembla una URL vàlida
        try {
            new URL(url);
        } catch (e) {
            console.error('[app] URL invàlida al hash:', url);
            window.showToast(window.t('dialog.import.url_invalid'), 'error');
            history.replaceState(null, '', window.location.pathname + window.location.search);
            return;
        }
        
        // Validar que acaba en .zip
        if (!url.toLowerCase().endsWith('.zip')) {
            console.error('[app] URL no és un .zip:', url);
            window.showToast(window.t('dialog.import.url_not_zip'), 'error');
            history.replaceState(null, '', window.location.pathname + window.location.search);
            return;
        }
        
        console.log(`[app] Detectat #${mode}: al hash, important projecte des de:`, url);
        
        // Donar un petit delay per assegurar que tot està renderitzat
        setTimeout(() => {
            if (window.projectManager) {
                window.projectManager.importFromUrl(url, {
                    skipDialog: mode === 'load' || mode === 'run',
                    autoRun: mode === 'run'
                });
            } else {
                console.error('[app] ProjectManager no disponible');
            }
        }, 500);
    }

    /**
     * Inicialitzar gestors de projectes
     */
    initProjectManagers() {
        // Crear instàncies
        window.projectManager = new ProjectManager();
        window.autosaveManager = new AutosaveManager();
        
        // Intentar carregar projecte automàticament si autoguardar estava activat
        if (window.autosaveManager.isEnabled()) {
            const loaded = window.autosaveManager.load();
            if (loaded) {
                console.log('✓ Projecte carregat automàticament');
            }
        }
        
        console.log('✓ Gestors de projectes inicialitzats');
    }

    /**
     * Inicialitzar sistema i18n
     */
    initI18n() {
        if (window.i18n) {
            const lang = window.ConfigManager.getLanguage();
            window.i18n.setLanguage(lang);
            
            console.log(`✓ i18n inicialitzat (${lang})`);
        } else {
            console.warn('⚠️ i18n no disponible');
        }
    }

    /**
     * Inicialitzar WindowManager
     */
    initWindowManager() {
        this.windowManager = new WindowManager();
        window.windowManager = this.windowManager;  // Global per BessoManager
        console.log('✓ WindowManager creat');
    }

    /**
     * Crear finestres predefinides
     */
    createWindows() {
        // Finestra 1: Editor Python
        this.windows.editor = this.windowManager.createWindow({
            id: 'editor-window',
            title: window.t ? window.t('window.editor') : 'Editor Python',
            x: 20,
            y: 80,
            width: 650,
            height: 700,
            minWidth: 400,
            minHeight: 400,
            onClose: () => {
                // Amagar en comptes de destruir
                this.windows.editor.hide();
                if (this.menuBar) {
                    this.menuBar.setChecked('editor', false);
                }
                return false; // Cancel·lar tancament real
            }
        });

        // Finestra 2: Bessó Digital
        this.windows.twin = this.windowManager.createWindow({
            id: 'twin-window',
            title: window.t ? window.t('twin.window_title') : '🔌 Bessó Digital – IoT-Vertebrae',
            x: 690,
            y: 80,
            width: 630,
            height: 450,
            minWidth: 400,
            minHeight: 300,
            onClose: () => {
                // Amagar en comptes de destruir
                this.windows.twin.hide();
                if (this.menuBar) {
                    this.menuBar.setChecked('twin', false);
                }
                return false; // Cancel·lar tancament real
            }
        });

        // Finestra 3: Consola
        this.windows.console = this.windowManager.createWindow({
            id: 'console-window',
            title: window.t ? window.t('window.console') : 'Consola',
            x: 690,
            y: 550,
            width: 630,
            height: 320,
            minWidth: 400,
            minHeight: 200,
            onClose: () => {
                // Amagar en comptes de destruir
                this.windows.console.hide();
                if (this.menuBar) {
                    this.menuBar.setChecked('console', false);
                }
                return false; // Cancel·lar tancament real
            }
        });

        console.log('✓ Finestres creades');
    }

    /**
     * Inicialitzar components dins finestres
     */
    initComponents() {
        // 1. ScriptEditor
        const editorContainer = this.windows.editor.contentElement;
        const editorT = window.t || ((k) => k);
        editorContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 10px; background: #2c3e50; border-bottom: 1px solid #34495e;">
                    <select id="example-selector" style="width: 100%; padding: 8px; background: #1e1e1e; color: #ecf0f1; border: 1px solid #34495e; border-radius: 4px; font-size: 13px; margin-bottom: 10px;">
                        <option value="" data-i18n="editor.select_example">${editorT('editor.select_example')}</option>
                    </select>
                    <div style="display: flex; gap: 8px;">
                        <button id="btn-run" style="flex: 1; padding: 10px; background: #2ecc71; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: opacity 0.2s;">
                            <span data-i18n="editor.run_f5">${editorT('editor.run_f5')}</span>
                        </button>
                        <button id="btn-stop" style="flex: 1; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; opacity: 0.35; transition: opacity 0.2s;" disabled>
                            <span data-i18n="editor.stop_label">${editorT('editor.stop_label')}</span>
                        </button>
                        <button id="btn-validate" style="padding: 10px 14px; background: #3498db; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: opacity 0.2s;">
                            <span data-i18n="editor.validate">${editorT('editor.validate')}</span>
                        </button>
                        <button id="btn-clear" style="padding: 10px 20px; background: #7f8c8d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            🗑️
                        </button>
                    </div>
                </div>
                <div id="python-code-container" style="flex: 1; overflow: hidden;"></div>
            </div>
        `;
        
        const cmContainer = document.getElementById('python-code-container');
        this.scriptEditor = new window.ScriptEditorClass(cmContainer, null);
        
        // Carregar exemples al selector
        this.loadExamples();
        
        // Carregar configuració de vèrtebres i inicialitzar PLCMemory
        this.initPLCMemory();
                
        // 2. Visualització Bessó Digital — mode per defecte: canvas (v1)
        this.switchTwinView('canvas');
        
        // 3. ConsoleOutput
        this.consoleOutput = new window.ConsoleOutputClass(this.windows.console.contentElement);
        
        // 4. PythonConsoleWindow
        if (window.PythonConsoleWindow) {
            this.pythonConsole = new window.PythonConsoleWindow();
            this.windows.pyconsole = this.pythonConsole.init(this.windowManager);
        }
        
        console.log('✓ Components inicialitzats');
    }

    /**
     * Carregar exemples al selector
     */
    loadExamples() {
        const selector = document.getElementById('example-selector');
        if (!selector || !window.ScriptExamples) return;
        
        const categories = window.ScriptExamples.getCategories();
        
        categories.forEach(category => {
            const examples = window.ScriptExamples.getByCategory(category.id);
            
            const optgroup = document.createElement('optgroup');
            const catName = window.t ? window.t(`editor.cat.${category.id}`) : category.name;
            optgroup.label = `${category.icon} ${catName}`;
            optgroup.setAttribute('data-i18n-cat', category.id);
            
            examples.forEach(example => {
                const option = document.createElement('option');
                option.value = example.id;
                const exName = window.t ? window.t(`editor.ex.${example.id}`) : example.name;
                option.textContent = exName;
                option.setAttribute('data-i18n-ex', example.id);
                optgroup.appendChild(option);
            });
            
            selector.appendChild(optgroup);
        });
        
        // Event listener
        selector.addEventListener('change', (e) => {
            const exampleId = e.target.value;
            if (exampleId) {
                const example = window.ScriptExamples.getById(exampleId);
                if (example) {
                    this.scriptEditor.setCode(example.code);
                    this.consoleOutput.clear();
                    this.consoleOutput.success(`📂 Exemple carregat: ${example.name}`);
                    this.consoleOutput.info(`   ${example.description}`);
                }
            }
        });
    }
    
	/**
     * Inicialitzar PLCMemory segons configuració
     */
    initPLCMemory() {
        // Carregar configuració de vèrtebres
        let config = null;
        if (window.VertebraeConfig) {
            // Intentar carregar des de localStorage
            const savedPreset = localStorage.getItem('iotv-preset');
            if (savedPreset && window.VertebraeConfig.PRESETS[savedPreset]) {
                config = window.VertebraeConfig.loadPreset(savedPreset);
                console.log(`[App] Preset carregat: ${savedPreset}`);
            } else {
                // Carregar preset per defecte
                config = window.VertebraeConfig.loadPreset('basic');
                console.log('[App] Preset per defecte: basic');
            }
        } else {
            console.warn('[App] VertebraeConfig no disponible, usant configuració hardcoded');
        }

        // Inicialitzar PLCMemory segons configuració
        if (config && window.PLCMemory) {
            config.vertebrae.forEach(v => {
                if (v.type === 'digital') {
                    window.PLCMemory.addDigitalVertebra(v.addr);
                } else if (v.type === 'analog') {
                    window.PLCMemory.addAnalogVertebra(v.addr);
                }
            });
            console.log('[App] PLCMemory inicialitzat segons configuració');
        }
    }    

    /**
     * Inicialitzar MenuBar amb accions
     */
    initMenuBar() {
        // MenuBar ja està creat com a singleton
        this.menuBar = window.MenuBar;
        
        // Crear menú personalitzat amb accions connectades
        this.createMenu();
        
        // Afegir element per nom del projecte a la dreta del menu bar
        this._createProjectNameDisplay();
        
        console.log('✓ MenuBar inicialitzat');
    }

    /**
     * Crear display del nom del projecte a la barra de menú
     */
    _createProjectNameDisplay() {
        const menuBarEl = document.getElementById('menu-bar');
        if (!menuBarEl) return;
        
        const spacer = document.createElement('div');
        spacer.style.cssText = 'flex: 1;';
        menuBarEl.appendChild(spacer);
        
        this.projectNameEl = document.createElement('span');
        this.projectNameEl.id = 'project-name-display';
        this.projectNameEl.style.cssText = 'color: #ecf0f1; font-size: 13px; font-weight: 700; padding-right: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;';
        menuBarEl.appendChild(this.projectNameEl);
        // No cridem updateProjectNameDisplay aquí - projectManager encara no existeix
    }

    /**
     * Actualitzar el nom del projecte a la UI
     */
    updateProjectNameDisplay(name) {
        if (!this.projectNameEl) return;
        if (!name && window.projectManager) {
            try {
                const info = window.projectManager.getProjectInfo();
                name = info ? info.name : null;
            } catch(e) { /* projectManager may not be ready yet */ }
        }
        this.projectNameEl.textContent = name ? `📁 ${name}` : '';
    }

    /**
     * Crear menús amb accions reals
     */
    createMenu() {
        // Menú Projecte
        this.menuBar.addMenu({
            id: 'project',
            label: 'menu.project',
            items: [
                {
                    id: 'project-new',
                    label: 'menu.project.new',
                    icon: '🆕',
                    action: () => {
                        if (window.projectManager) {
                            window.projectManager.newProject();
                        }
                    }
                },
                {
                    id: 'project-info',
                    label: 'menu.project.info',
                    icon: 'ℹ️',
                    action: () => {
                        if (window.projectManager) {
                            window.projectManager.editProjectInfo();
                        }
                    }
                },
                { type: 'separator' },
                {
                    id: 'project-autosave',
                    label: 'menu.project.autosave',
                    icon: '💾',
                    checkable: true,
                    checked: window.autosaveManager ? window.autosaveManager.isEnabled() : false,
                    action: (item) => {
                        if (window.autosaveManager) {
                            window.autosaveManager.toggle();
                            item.checked = window.autosaveManager.isEnabled();
                        }
                    }
                },
                { type: 'separator' },
                {
                    id: 'project-export',
                    label: 'menu.project.export',
                    icon: '📤',
                    action: () => {
                        if (window.projectManager) {
                            window.projectManager.exportProject();
                        }
                    }
                },
                {
                    id: 'project-import',
                    label: 'menu.project.import',
                    icon: '📥',
                    action: () => {
                        if (window.projectManager) {
                            window.projectManager.importProject();
                        }
                    }
                }
            ]
        });

        // Menú Edita
        this.menuBar.addMenu({
            id: 'edit',
            label: 'menu.edit',
            items: [
                {
                    id: 'copy',
                    label: 'menu.edit.copy',
                    icon: '📋',
                    shortcut: 'Ctrl+C',
                    action: () => this.copyCode()
                },
                {
                    id: 'paste',
                    label: 'menu.edit.paste',
                    icon: '📄',
                    shortcut: 'Ctrl+V',
                    action: () => this.pasteCode()
                },
                {
                    id: 'cut',
                    label: 'menu.edit.cut',
                    icon: '✂️',
                    shortcut: 'Ctrl+X',
                    action: () => this.cutCode()
                },
                { type: 'separator' },
                {
                    id: 'find',
                    label: 'menu.edit.find',
                    icon: '🔍',
                    shortcut: 'Ctrl+F',
                    action: () => this.findText()
                }
            ]
        });

        // Menú Python (abans Scripts)
        this.menuBar.addMenu({
            id: 'scripts',
            label: 'menu.python',
            items: [
                {
                    id: 'run',
                    label: 'menu.scripts.run',
                    icon: '▶️',
                    shortcut: 'F5',
                    action: () => this.runScript()
                },
                {
                    id: 'stop',
                    label: 'menu.scripts.stop',
                    icon: '⏹️',
                    shortcut: 'Shift+F5',
                    action: () => this.stopScript()
                },
                {
                    id: 'clear',
                    label: 'menu.scripts.clear',
                    icon: '🗑️',
                    action: () => {
                        this.scriptEditor.clear();
                        this.consoleOutput.clear();
                        this.consoleOutput.info('Editor i consola netejats');
                    }
                },
                { type: 'separator' },
                {
                    id: 'ai-generator',
                    label: 'menu.scripts.ai_generator',
                    icon: '🤖',
                    action: () => this.openAIToolWindow('generator')
                },
                {
                    id: 'ai-translator',
                    label: 'menu.scripts.ai_translator',
                    icon: '🔄',
                    action: () => this.openAIToolWindow('translator')
                }
            ]
        });

        // Menú Vista
        this.menuBar.addMenu({
            id: 'view',
            label: 'menu.view',
            items: [
                {
                    id: 'editor',
                    label: 'menu.view.editor',
                    icon: '📝',
                    checkable: true,
                    checked: true,
                    action: (item) => this.toggleWindow('editor', item)
                },
                {
                    id: 'twin',
                    label: 'menu.view.twin',
                    icon: '🔌',
                    checkable: true,
                    checked: true,
                    action: (item) => this.toggleWindow('twin', item)
                },
                {
                    id: 'console',
                    label: 'menu.view.console',
                    icon: '📟',
                    checkable: true,
                    checked: true,
                    action: (item) => this.toggleWindow('console', item)
                },
                {
                    id: 'pyconsole',
                    label: 'menu.view.pyconsole',
                    icon: '🐍',
                    checkable: true,
                    checked: false,
                    action: (item) => this.toggleWindow('pyconsole', item)
                },
                { type: 'separator' },
                {
                    id: 'restore-windows',
                    label: 'menu.view.restore_windows',
                    icon: '🪟',
                    action: () => this.restoreWindows()
                },
                {
                    id: 'fullscreen',
                    label: 'menu.view.fullscreen',
                    icon: '⛶',
                    shortcut: 'F11',
                    action: () => this.toggleFullscreen()
                }
            ]
        });

        // Menú Bessons
        this.menuBar.addMenu({
            id: 'bessons',
            label: 'menu.bessons',
            items: [
                {
                    id: 'besso-io-config',
                    label: 'menu.bessons.ioconfig',
                    icon: '🔧',
                    shortcut: 'Ctrl+Shift+I',
                    action: () => {
                        if (window.BessoConfigEditor) {
                            window.BessoConfigEditor.open();
                        } else {
                            console.error('BessoConfigEditor not available');
                        }
                    }
                },
                {
                    id: 'besso-active',
                    label: 'menu.bessons.active',
                    icon: '✓',
                    action: () => this.showActiveTwins()
                }
            ]
        });

        // Menú Connexió (ocult fins implementació completa)
        this.menuBar.addMenu({
            id: 'connection',
            label: 'menu.connection',
            hidden: true,
            items: [
                {
                    id: 'local',
                    label: 'menu.connection.local',
                    icon: '🏠',
                    checkable: true,
                    checked: true,
                    radio: 'connection-mode',
                    action: (item) => this.setConnectionMode('local', item)
                },
                {
                    id: 'remote',
                    label: 'menu.connection.remote',
                    icon: '🌐',
                    checkable: true,
                    checked: false,
                    radio: 'connection-mode',
                    action: (item) => this.setConnectionMode('remote', item)
                },
                { type: 'separator' },
                {
                    id: 'config-mqtt',
                    label: 'menu.connection.configure',
                    icon: '⚙️',
                    action: () => this.configureMQTT()
                },
                {
                    id: 'status',
                    label: 'menu.connection.status',
                    icon: '📊',
                    action: () => this.showConnectionStatus()
                }
            ]
        });

        // Menú Idioma
        const currentLang = window.ConfigManager ? window.ConfigManager.getLanguage() : 'ca';
        this.menuBar.addMenu({
            id: 'language',
            label: 'Language',
            _skipTranslation: true,
            items: [
                {
                    id: 'lang-ca',
                    label: '[ca] Català',
                    _skipTranslation: true,
                    checkable: true,
                    checked: currentLang === 'ca',
                    radio: 'language',
                    action: (item) => this.changeLanguage('ca', item)
                },
                {
                    id: 'lang-es',
                    label: '[es] Castellano',
                    _skipTranslation: true,
                    checkable: true,
                    checked: currentLang === 'es',
                    radio: 'language',
                    action: (item) => this.changeLanguage('es', item)
                },
                {
                    id: 'lang-en',
                    label: '[en] English',
                    _skipTranslation: true,
                    checkable: true,
                    checked: currentLang === 'en',
                    radio: 'language',
                    action: (item) => this.changeLanguage('en', item)
                }
            ]
        });

        // Menú Finestra (dinàmic, estil macOS)
        this._windowMenuRef = this.menuBar.addMenu({
            id: 'window',
            label: 'menu.window',
            items: [],
            onOpen: (menu) => this._rebuildWindowMenu(menu)
        });

        // Menú Ajuda
        this.menuBar.addMenu({
            id: 'help',
            label: 'menu.help',
            items: [
                {
                    id: 'docs',
                    label: 'menu.help.docs',
                    icon: '📖',
                    action: () => this.openDocsUrl()
                },
                {
                    id: 'examples',
                    label: 'menu.help.examples',
                    icon: '📚',
                    disabled: !this._examplesAvailable,
                    action: () => this.showExamplesWindow()
                },
                {
                    id: 'shortcuts',
                    label: 'menu.help.shortcuts',
                    icon: '⌨️',
                    action: () => this.showShortcuts()
                },
                {
                    id: 'clear-data',
                    label: 'menu.help.clear_data',
                    icon: '🗑️',
                    action: () => this.clearLocalData()
                },
                { type: 'separator' },
                {
                    id: 'debug',
                    label: 'menu.help.debug',
                    icon: '🐛',
                    action: () => this.toggleDebug()
                },
                {
                    id: 'about',
                    label: 'menu.help.about',
                    icon: 'ℹ️',
                    action: () => this.showAbout()
                },
                { type: 'separator' },
                {
                    id: 'overview',
                    label: 'menu.help.overview',
                    icon: '🗺️',
                    action: () => this.showGlobalOverview()
                },
                {
                    id: 'photo',
                    label: 'menu.help.photo',
                    icon: '📷',
                    action: () => this.showHardwarePhoto()
                }
            ]
        });
    }

    /**
     * Executar script
     */
    async runScript() {
        if (this.isRunning) {
            this.consoleOutput.warn('⚠️ Ja hi ha un script executant-se');
            return;
        }

        const btnRun = document.getElementById('btn-run');
        const btnStop = document.getElementById('btn-stop');
        const btnValidate = document.getElementById('btn-validate');

        this.isRunning = true;
        // Visual: Executa apagat, Atura actiu
        if (btnRun) { btnRun.style.opacity = '0.35'; }
        if (btnStop) { btnStop.disabled = false; btnStop.style.opacity = '1'; }
        if (btnValidate) { btnValidate.style.opacity = '0.35'; }

        this.consoleOutput.clear();
        this.consoleOutput.success('▶️ Iniciant execució...');

        await this.scriptEditor.run({
            output: (text) => {
                this.consoleOutput.log(text);
            },
            error: (error) => {
                // El missatge ja ve formatat amb ❌ i número de línia des de ScriptEditor
                this.consoleOutput.error(error);
            },
            complete: () => {
                this.consoleOutput.success('✓ Execució completada');
                this.isRunning = false;
                if (btnRun) { btnRun.style.opacity = '1'; }
                if (btnStop) { btnStop.disabled = true; btnStop.style.opacity = '0.35'; }
                if (btnValidate) { btnValidate.style.opacity = '1'; }
            }
        });

        if (!this.scriptEditor.getIsRunning()) {
            this.isRunning = false;
            if (btnRun) { btnRun.style.opacity = '1'; }
            if (btnStop) { btnStop.disabled = true; btnStop.style.opacity = '0.35'; }
            if (btnValidate) { btnValidate.style.opacity = '1'; }
        }
    }

    /**
     * Aturar script
     */
    stopScript() {
        this.scriptEditor.stop();
        this.consoleOutput.warn('⏹️ Execució aturada per l\'usuari');
        
        this.isRunning = false;
        const btnRun = document.getElementById('btn-run');
        const btnStop = document.getElementById('btn-stop');
        const btnValidate = document.getElementById('btn-validate');
        if (btnRun) { btnRun.style.opacity = '1'; }
        if (btnStop) { btnStop.disabled = true; btnStop.style.opacity = '0.35'; }
        if (btnValidate) { btnValidate.style.opacity = '1'; }
    }

    /**
     * Validar sintaxi de l'script Python sense executar-lo
     */
    validateScript() {
        const code = this.scriptEditor.getCode ? this.scriptEditor.getCode() : '';
        if (!code || code.trim() === '') {
            this.consoleOutput.warn('⚠️ ' + (window.t ? window.t('editor.validate_error') : '❌ Error de validació:') + ' Editor buit.');
            return;
        }
        try {
            this.scriptEditor.convertToJS(code);
            this.consoleOutput.success(window.t ? window.t('editor.validate_ok') : '✅ Codi correcte, sense errors de sintaxi.');
        } catch (err) {
            this.consoleOutput.error((window.t ? window.t('editor.validate_error') : '❌ Error de validació:') + ' ' + err.message);
        }
    }

    /**
     * Obtenir descripció llegible de la configuració actual de vèrtebres per a prompts IA
     */
    _getVertebraeContextForAI() {
        const cfg = window.VertebraeConfig && window.VertebraeConfig.current;
        if (!cfg || !cfg.vertebrae || cfg.vertebrae.length === 0) {
            return 'No vertebrae configured.';
        }
        const lines = [];
        cfg.vertebrae.forEach(v => {
            const type = v.type === 'digital' ? 'Digital' : 'Analog';
            const addr = v.addr || '0x0';
            if (v.type === 'digital') {
                const sideA = v.costellaA === 'output' ? 'output (8 LEDs/relays)' : 'input (8 switches/sensors)';
                const sideB = v.costellaB === 'output' ? 'output (8 LEDs/relays)' : 'input (8 switches/sensors)';
                lines.push(`- Digital vertebra at ${addr}: side A = ${sideA}, side B = ${sideB}`);
            } else {
                const sideA = v.costellaA === 'output' ? 'output (4 DAC channels 0-4095)' : 'input (4 ADC channels 0-4095)';
                const sideB = v.costellaB === 'output' ? 'output (4 DAC channels 0-4095)' : 'input (4 ADC channels 0-4095)';
                lines.push(`- Analog vertebra at ${addr}: side A = ${sideA}, side B = ${sideB}`);
            }
        });
        return lines.join('\n');
    }

    /**
     * Generar la secció de l'API iotv per als prompts IA
     */
    _getIotvAPIDoc() {
        return `
## iotv API Functions
### Digital I/O
- iotv.din(addr, side) → str     : Read all 8 digital inputs as a byte string. side = 'A' or 'B'
- iotv.dinbit(addr, side, bit) → int : Read a single input bit (0-7)
- iotv.dout(addr, side, value)   : Write a byte (0-255) to digital outputs
- iotv.doutbit(addr, side, bit, val) : Write a single output bit
- iotv.doutpwm(addr, side, value): Write PWM value (0-255) to all outputs
- iotv.doutbitpwm(addr, side, bit, val): Write PWM to a single output bit
- iotv.dsetup(addr, sideA, sideB): Configure digital vertebra modes ('input'/'output')
- iotv.getdsetup(addr) → obj     : Get current digital configuration
- iotv.dversion(addr) → str      : Get digital vertebra firmware version

### Analog I/O
- iotv.ain(addr, side, ch) → int : Read analog input channel ch (0-3), returns 0-4095
- iotv.ainv(addr, side, ch) → float : Read analog input in volts
- iotv.aout(addr, side, ch, val) : Write analog output channel ch (0-3), value 0-4095
- iotv.ainBatch(addr, side) → array : Read all 4 analog input channels at once
- iotv.aoutBatch(addr, side, voltages): Write multiple analog channels as voltage array
- iotv.ain2v(digital) → float    : Convert raw ADC value to volts
- iotv.v2ain(voltage) → int      : Convert volts to raw ADC value (input range)
- iotv.aout2v(digital) → float   : Convert raw DAC value to volts
- iotv.v2aout(voltage) → int     : Convert volts to raw DAC value (output range)
- iotv.aversion(addr) → str      : Get analog vertebra firmware version

### System
- iotv.init()  : Re-initialize system
- iotv.reset() : Full system reset

### Timing
- time.sleep(seconds) : Pause execution for N seconds (supports float, e.g. 0.5)

### PLC Memory (optional)
- PLCMemory.set(key, value) : Store a value
- PLCMemory.get(key) → value : Read a value
`.trim();
    }

    /**
     * Generar les limitacions del transpilador per als prompts IA
     */
    _getTranspilerLimitations() {
        return `
## Transpiler Limitations (IMPORTANT)
The Python code will be transpiled to JavaScript. The following Python features are NOT supported:
- try/except/finally blocks (use if/else checks instead)
- Nested functions used as callbacks or closures
- Classes (class keyword)
- List comprehensions: [x for x in ...] (use explicit for loops)
- Dict comprehensions
- Generator expressions
- f-strings with complex expressions (use string concatenation instead)
- *args and **kwargs
- Lambda functions (use regular def instead)
- Global/nonlocal keywords
- yield / generators
- import statements (only iotv, time, math, random, string, PLCMemory are available)
- Decorators

## What IS supported
- def functions (top-level only, no nesting)
- for loops (range, lists)
- while loops
- if/elif/else
- Basic list operations (append, len, etc.)
- String concatenation and basic methods
- Arithmetic and comparison operators
- Async functions using await (for iotv calls that return promises)
`.trim();
    }

    /**
     * Obrir finestra de Generador IA o Traductor IA
     * @param {string} mode - 'generator' | 'translator'
     */
    openAIToolWindow(mode) {
        const t = window.t || (k => k);
        const isGenerator = mode === 'generator';
        const winId = isGenerator ? 'ai-generator-window' : 'ai-translator-window';
        const titleKey = isGenerator ? 'ai_tools.generator.title' : 'ai_tools.translator.title';

        // Si la finestra ja existeix, restaurar-la
        const existingWin = this.windowManager.getWindow(winId);
        if (existingWin) {
            this.windowManager.restoreWindow(winId);
            this.windowManager.bringToFront(winId);
            return;
        }

        const win = this.windowManager.createWindow({
            id: winId,
            title: t(titleKey),
            x: 100,
            y: 100,
            width: 580,
            height: isGenerator ? 420 : 480,
            minWidth: 420,
            minHeight: 300,
            onClose: () => true
        });

        // Construir contingut
        const container = win.contentElement;
        container.style.cssText = 'padding: 12px; display: flex; flex-direction: column; gap: 10px; height: 100%; box-sizing: border-box; overflow: hidden;';

        // Label + Textarea
        const labelEl = document.createElement('label');
        labelEl.style.cssText = 'font-size: 12px; color: #ccc; font-weight: bold;';
        labelEl.textContent = t(isGenerator ? 'ai_tools.generator.description_label' : 'ai_tools.translator.code_label');

        const textarea = document.createElement('textarea');
        textarea.style.cssText = 'flex: 1; width: 100%; background: #1a1a2e; color: #e0e0e0; border: 1px solid #444; border-radius: 4px; padding: 8px; font-family: monospace; font-size: 12px; resize: none; box-sizing: border-box;';
        textarea.placeholder = t(isGenerator ? 'ai_tools.generator.description_placeholder' : 'ai_tools.translator.code_placeholder');

        // Àrea d'error de validació
        const errorArea = document.createElement('div');
        errorArea.style.cssText = 'display: none; background: #3d1a1a; border: 1px solid #c0392b; border-radius: 4px; padding: 8px; font-family: monospace; font-size: 11px; color: #e74c3c; max-height: 80px; overflow-y: auto; white-space: pre-wrap;';

        // Instruccions
        const instrEl = document.createElement('div');
        instrEl.style.cssText = 'font-size: 11px; color: #7f8c8d; line-height: 1.4;';
        instrEl.textContent = t('ai_tools.instructions');

        // Botons
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 8px;';

        const btnPrompt = document.createElement('button');
        btnPrompt.textContent = '🧠 ' + t('ai_tools.btn_generate_prompt');
        btnPrompt.style.cssText = 'flex: 1; padding: 9px 12px; background: #8e44ad; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;';

        const btnPaste = document.createElement('button');
        btnPaste.textContent = '📋 ' + t('ai_tools.btn_paste_code');
        btnPaste.style.cssText = 'flex: 1; padding: 9px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;';

        btnRow.appendChild(btnPrompt);
        btnRow.appendChild(btnPaste);

        container.appendChild(labelEl);
        container.appendChild(textarea);
        container.appendChild(errorArea);
        container.appendChild(instrEl);
        container.appendChild(btnRow);

        // --- Acció: Generar prompt ---
        btnPrompt.addEventListener('click', () => {
            const userText = textarea.value.trim();
            if (!userText) {
                window.showToast && window.showToast(t(isGenerator ? 'ai_tools.error_no_description' : 'ai_tools.error_no_code'), 'warning');
                return;
            }

            const vertebraeCtx = this._getVertebraeContextForAI();
            const apiDoc = this._getIotvAPIDoc();
            const limitations = this._getTranspilerLimitations();

            let prompt;
            if (isGenerator) {
                prompt = `You are an expert in IoT-Vertebrae, a web-based PLC simulator. Generate Python code for the following task.

## User Request
${userText}

## Current Vertebrae Configuration
${vertebraeCtx}

${apiDoc}

${limitations}

## Instructions
- Write clean, readable Python code that is fully compatible with the transpiler limitations above.
- Use only iotv, time, and PLCMemory. Do NOT use import statements.
- Structure the code with a main() function and a run loop if appropriate.
- Add brief comments to explain the logic.
- Return ONLY the Python code block, no explanations outside the code.
`;
            } else {
                prompt = `You are an expert in IoT-Vertebrae, a web-based PLC simulator with a Python-to-JavaScript transpiler. Translate the following Python code to be compatible with the IoT-Vertebrae transpiler and iotv API.

## Source Code to Translate
\`\`\`python
${userText}
\`\`\`

## Current Vertebrae Configuration
${vertebraeCtx}

${apiDoc}

${limitations}

## Translation Instructions
- Make the code functionally equivalent but fully compatible with the transpiler limitations above.
- Replace try/except with if/else checks.
- Replace list comprehensions with explicit for loops.
- Replace f-strings with string concatenation.
- Replace classes with plain functions.
- Replace nested callback functions with top-level functions.
- Replace hardware access (GPIO, I2C, etc.) with the equivalent iotv API calls based on the vertebrae configuration.
- Replace any unsupported Python patterns with supported equivalents.
- Keep the logic and structure as close to the original as possible.
- Return ONLY the translated Python code block, no explanations outside the code.
`;
            }

            // Descarregar com .txt
            const blob = new Blob([prompt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = isGenerator ? 'iotv-generator-prompt.txt' : 'iotv-translator-prompt.txt';
            a.click();
            URL.revokeObjectURL(url);

            // Copiar al porta-retalls
            navigator.clipboard.writeText(prompt).then(() => {
                window.showToast && window.showToast(t('ai_tools.toast_prompt_ready'), 'success');
            }).catch(() => {
                window.showToast && window.showToast(t('ai_tools.toast_prompt_ready'), 'success');
            });
        });

        // --- Acció: Enganxa codi del porta-retalls ---
        btnPaste.addEventListener('click', async () => {
            errorArea.style.display = 'none';
            try {
                const text = await navigator.clipboard.readText();
                if (!text || text.trim() === '') {
                    window.showToast && window.showToast(t('ai_tools.error_clipboard_empty'), 'warning');
                    return;
                }
                // Validar amb el transpilador
                try {
                    this.scriptEditor.convertToJS(text);
                } catch (err) {
                    errorArea.style.display = 'block';
                    errorArea.textContent = t('ai_tools.error_validation') + '\n' + err.message;
                    return;
                }
                // Comprovar si l'editor ja té codi
                const currentCode = this.scriptEditor.getCode ? this.scriptEditor.getCode() : '';
                if (currentCode && currentCode.trim() !== '') {
                    if (!confirm(t('ai_tools.confirm_overwrite'))) {
                        return;
                    }
                }
                this.scriptEditor.setCode(text);
                window.showToast && window.showToast('✅ Codi enganxat a l\'editor', 'success');
            } catch (err) {
                window.showToast && window.showToast(t('ai_tools.error_clipboard') + ' ' + err.message, 'error');
            }
        });
    }

    /**
     * Canviar visualització del bessó digital entre Canvas v1 i Esquemàtic v2
     * @param {string} mode - 'canvas' | 'schematic'
     */
    switchTwinView(mode) {
        if (this.twinViewMode === mode) return;

        const container = this.windows.twin.contentElement;
        if (!container) return;

        // Desmuntar la visualitza actual
        if (this.canvasTwin) {
            this.canvasTwin.destroy();
            this.canvasTwin = null;
        }
        if (this.digitalTwin) {
            // DigitalTwin v2 usa innerHTML del container
            container.innerHTML = '';
            this.digitalTwin = null;
        }

        this.twinViewMode = mode;

        if (mode === 'canvas') {
            // Montar Canvas v1
            if (window.CanvasTwin) {
                this.canvasTwin = new window.CanvasTwin(container);
                console.log('✓ Visualitza canviada a Canvas (v1)');
            } else {
                console.warn('⚠️ CanvasTwin no disponible');
            }
        } else {
            // Montar Esquemàtic v2
            if (window.DigitalTwinClass) {
                this.digitalTwin = new window.DigitalTwinClass(container, '0x0');
                console.log('✓ Visualitza canviada a Esquemàtic (v2)');
            } else {
                console.warn('⚠️ DigitalTwinClass no disponible');
            }
        }

        // Log a consola
        if (this.consoleOutput) {
            this.consoleOutput.info(`🖼️ Visualitza: ${mode === 'canvas' ? 'Canvas (v1)' : 'Esquemàtic (v2)'}`);
        }
    }

    /**
     * Carregar/desmuntar un bessó extern
     * @param {string|null} id - ID del bessó o null per desmuntar
     */
    loadBesso(id) {
        const BM = window.BessoManager || window.bessoManager;
        if (!BM) {
            console.warn('⚠️ BessoManager no disponible');
            return;
        }

        if (id === null) {
            BM.unload();
            if (this.consoleOutput) {
                this.consoleOutput.info('○ Bessó desmuntat');
            }
        } else {
            BM.load(id);
            if (this.consoleOutput) {
                this.consoleOutput.info(`⚙️ Bessó carregat: ${id}`);
            }
        }
    }

    /**
     * Restaurar finestres principals
     * - Mostra totes les finestres principals si estan obertes
     * - Mostra tots els bessons físics configurats
     * - Distribueix tot en cascada
     */
    restoreWindows() {
        // 1. Mostrar totes les finestres principals si estan amagades
        const mainWindows = ['editor', 'twin', 'console'];
        for (const name of mainWindows) {
            const win = this.windows[name];
            if (win && !win.visible) {
                win.show();
                if (this.menuBar) {
                    this.menuBar.setChecked(name, true);
                }
            }
        }
        
        // Python console
        if (this.pythonConsole && this.pythonConsole.window && !this.pythonConsole.window.visible) {
            this.pythonConsole.window.show();
            if (this.menuBar) {
                this.menuBar.setChecked('pyconsole', true);
            }
        }

        // 2. Mostrar tots els bessons connectables si estan amagats
        if (window.BessoManager) {
            const instances = window.BessoManager.getActiveInstances();
            instances.forEach(instance => {
                const bessoWinId = `besso-${instance.instanceName}`;
                const win = this.windowManager.getWindow(bessoWinId);
                if (win && !win.visible) {
                    win.show();
                }
            });
        }

        // 3. Distribuir totes les finestres en cascada
        this.windowManager.restoreAllWindows();
        
        // 4. Missatge de confirmació
        if (this.consoleOutput) {
            this.consoleOutput.success('✓ Finestres restaurades');
        }
    }

    /**
     * Restaurar layout inicial (legacy - deprecat)
     */
    resetLayout() {
        // Mantenim per compatibilitat però ara crida restoreWindows
        this.restoreWindows();
    }

/**
     * Obrir selector de presets
     */
    openPresetSelector() {
        if (!window.VertebraeConfig) {
            this.consoleOutput.error('VertebraeConfig no disponible');
            return;
        }
        
        const presets = window.VertebraeConfig.getAvailablePresets();
        const current = window.VertebraeConfig.get()?.name || 'basic';
        
        // Crear finestra temporal per selector
        const selectorWin = this.windowManager.createWindow({
            title: 'Seleccionar Preset de Vèrtebres',
            width: 500,
            height: 400,
            x: window.innerWidth / 2 - 250,
            y: window.innerHeight / 2 - 200
        });
        
        let html = '<div style="padding:20px; color:#ecf0f1;">';
        html += '<h2 style="color:#3498db; margin-bottom:10px;">Selecciona Preset de Vèrtebres</h2>';
        html += `<p>Preset actual: <strong style="color:#2ecc71;">${current}</strong></p>`;
        html += '<ul style="list-style:none; padding:10px 0;">';
        
        presets.forEach(p => {
            const selected = p.name === current ? '✓ ' : '';
            const color = p.name === current ? '#2ecc71' : '#ecf0f1';
            html += `<li style="padding:8px; margin:5px 0; background:#34495e; border-radius:4px; cursor:pointer; border-left:4px solid ${color};" 
                         onclick="window.app.changePreset('${p.name}', this.parentElement.parentElement.parentElement.parentElement)">
                        ${selected}<strong>${p.name}</strong> - ${p.description}
                     </li>`;
        });
        
        html += '</ul></div>';
        
        selectorWin.contentElement.innerHTML = html;
    }

    /**
     * Canviar preset de vèrtebres
     */
    changePreset(presetName, windowElement = null) {
        if (!window.VertebraeConfig) return;
        
        const config = window.VertebraeConfig.loadPreset(presetName);
        if (!config) {
            this.consoleOutput.error(`Error carregant preset ${presetName}`);
            return;
        }
        
        // Guardar a localStorage
        localStorage.setItem('iotv-preset', presetName);
        
        // Reinicialitzar PLCMemory
        if (window.PLCMemory) {
            window.PLCMemory.reset();
            config.vertebrae.forEach(v => {
                if (v.type === 'digital') {
                    window.PLCMemory.addDigitalVertebra(v.addr);
                } else {
                    window.PLCMemory.addAnalogVertebra(v.addr);
                }
            });
        }
        
        // Actualitzar canvas
        if (this.canvasTwin && this.canvasTwin.setVertebraeConfig) {
            this.canvasTwin.setVertebraeConfig(config);
        }
        
        this.consoleOutput.success(`Preset canviat a: ${presetName}`);
        
        // Tancar finestra selector si existeix
        if (windowElement) {
            this.windowManager.closeWindow(windowElement.closest('.window').id);
        }
    }

    /**
     * Event listeners globals
     */
    setupGlobalListeners() {
        // Dreceres de teclat
        document.addEventListener('keydown', (e) => {
            // F5 per executar
            if (e.key === 'F5') {
                e.preventDefault();
                this.runScript();
            }
            
            // Shift+F5 per aturar
            if (e.key === 'F5' && e.shiftKey) {
                e.preventDefault();
                this.stopScript();
            }

            // Ctrl+S per desar
            if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                this.saveProject();
            }

            // Ctrl+O per obrir
            if (e.key === 'o' && e.ctrlKey) {
                e.preventDefault();
                this.openProject();
            }

            // Ctrl+N per nou
            if (e.key === 'n' && e.ctrlKey) {
                e.preventDefault();
                this.newProject();
            }

            // Ctrl+I per configuració IO
            if (e.key === 'i' && e.ctrlKey) {
                e.preventDefault();
                if (window.IoConfigEditor) {
                    window.IoConfigEditor.open();
                }
            }
        });

        // Event listeners botons
        const btnRun = document.getElementById('btn-run');
        const btnStop = document.getElementById('btn-stop');
        const btnClear = document.getElementById('btn-clear');
        const btnValidate = document.getElementById('btn-validate');

        if (btnRun) {
            btnRun.addEventListener('click', () => this.runScript());
        }

        if (btnStop) {
            btnStop.addEventListener('click', () => this.stopScript());
        }

        if (btnValidate) {
            btnValidate.addEventListener('click', () => this.validateScript());
        }

        if (btnClear) {
            btnClear.addEventListener('click', () => {
                this.scriptEditor.clear();
                this.consoleOutput.clear();
                this.consoleOutput.info('Editor i consola netejats');
            });
        }

        console.log('✓ Event listeners globals configurats');
    }

    // ============================================
    // ACCIONS MENÚ ARXIU
    // ============================================

    newProject() {
        if (confirm('Vols netejar tot i començar un projecte nou?')) {
            this.scriptEditor.clear();
            this.consoleOutput.clear();
            if (this.pythonConsole) this.pythonConsole.clear();
            window.PLCMemory.reset();
            window.iotv.init();
            this.consoleOutput.success('✓ Projecte nou creat');
        }
    }

    saveProject() {
        const project = {
            version: '2.0',
            code: this.scriptEditor.getCode(),
            timestamp: new Date().toISOString(),
            config: {
                vertebra: '0x0'
            }
        };

        try {
            localStorage.setItem('iotv-project', JSON.stringify(project));
            this.consoleOutput.success('💾 Projecte desat a LocalStorage');
        } catch (error) {
            this.consoleOutput.error('❌ Error desant projecte: ' + error.message);
        }
    }

    openProject() {
        try {
            const json = localStorage.getItem('iotv-project');
            if (!json) {
                this.consoleOutput.warn('⚠️ No hi ha cap projecte desat');
                return;
            }

            const project = JSON.parse(json);
            this.scriptEditor.setCode(project.code || '');
            this.consoleOutput.success('📂 Projecte carregat');
            this.consoleOutput.info(`   Desat: ${new Date(project.timestamp).toLocaleString('ca-ES')}`);
        } catch (error) {
            this.consoleOutput.error('❌ Error carregant projecte: ' + error.message);
        }
    }

    exportConfig() {
        const config = {
            version: '2.0',
            code: this.scriptEditor.getCode(),
            plcMemory: window.PLCMemory.export(),
            config: window.ConfigManager.getAll(),
            timestamp: new Date().toISOString()
        };

        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iotv-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.consoleOutput.success('📤 Configuració exportada');
    }

    importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target.result);
                    
                    if (config.code) {
                        this.scriptEditor.setCode(config.code);
                    }
                    if (config.config) {
                        window.ConfigManager.import(config.config);
                    }
                    if (config.plcMemory) {
                        window.PLCMemory.import(config.plcMemory);
                    }

                    this.consoleOutput.success('📥 Configuració importada');
                } catch (error) {
                    this.consoleOutput.error('❌ Error important: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ============================================
    // ACCIONS MENÚ EDITA
    // ============================================

    copyCode() {
        const code = this.scriptEditor.getCode();
        navigator.clipboard.writeText(code).then(() => {
            this.consoleOutput.success('📋 Codi copiat al porta-retalls');
        }).catch(err => {
            this.consoleOutput.error('❌ Error copiant: ' + err.message);
        });
    }

    pasteCode() {
        navigator.clipboard.readText().then(text => {
            this.scriptEditor.setCode(text);
            this.consoleOutput.success('📄 Codi enganxat');
        }).catch(err => {
            this.consoleOutput.error('❌ Error enganxant: ' + err.message);
        });
    }

    cutCode() {
        const code = this.scriptEditor.getCode();
        navigator.clipboard.writeText(code).then(() => {
            this.scriptEditor.clear();
            this.consoleOutput.success('✂️ Codi retallat');
        }).catch(err => {
            this.consoleOutput.error('❌ Error retallant: ' + err.message);
        });
    }

    findText() {
        const search = prompt('Cerca text:');
        if (search) {
            const code = this.scriptEditor.getCode();
            const index = code.indexOf(search);
            if (index !== -1) {
                this.consoleOutput.success(`🔍 Trobat a posició ${index}`);
            } else {
                this.consoleOutput.warn('⚠️ Text no trobat');
            }
        }
    }

    // ============================================
    // ACCIONS MENÚ SCRIPTS
    // ============================================

    loadExample(exampleId) {
        const example = window.ScriptExamples.getById(exampleId);
        if (example) {
            this.scriptEditor.setCode(example.code);
            this.consoleOutput.clear();
            this.consoleOutput.success(`📂 Exemple carregat: ${example.name}`);
            this.consoleOutput.info(`   ${example.description}`);
        }
    }

    // ============================================
    // ACCIONS MENÚ VISTA
    // ============================================

    toggleWindow(windowName, item) {
        const win = this.windows[windowName];
        if (!win) return;

        if (win.visible) {
            win.hide();
            item.checked = false;
        } else {
            win.show();
            item.checked = true;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // ============================================
    // ACCIONS MENÚ CONNEXIÓ
    // ============================================

    setConnectionMode(mode, item) {
        if (mode === 'local') {
            this.consoleOutput.info('🏠 Mode Local activat');
            this.consoleOutput.log('   Scripts s\'executen localment');
        } else {
            this.consoleOutput.info('🌐 Mode Remot (MQTT) activat');
            this.consoleOutput.log('   Preparant connexió MQTT...');
        }
    }

    configureMQTT() {
        this.consoleOutput.info('⚙️ Configuració MQTT');
        this.consoleOutput.log('   (Disponible a Sessió 7)');
    }

    showConnectionStatus() {
        this.consoleOutput.info('📊 Estat de connexió:');
        this.consoleOutput.log('   Mode: Local');
        this.consoleOutput.log('   MQTT: Desconnectat');
        this.consoleOutput.log('   Vèrtebra: 0x0');
    }

    // ============================================
    // ACCIONS MENÚ IDIOMA
    // ============================================

    changeLanguage(lang, item) {
        window.ConfigManager.setLanguage(lang);
        window.i18n.setLanguage(lang);
        this.consoleOutput.success(`🌐 Idioma canviat: ${lang.toUpperCase()}`);
        
        // Actualitzar selector d'exemples (optgroups i options)
        this._refreshExampleSelectorI18n();
    }

    /**
     * Refrescar i18n del selector d'exemples
     */
    _refreshExampleSelectorI18n() {
        const selector = document.getElementById('example-selector');
        if (!selector || !window.t) return;
        
        // Actualitzar optgroups (categories)
        const categories = window.ScriptExamples.getCategories();
        selector.querySelectorAll('optgroup[data-i18n-cat]').forEach(og => {
            const catId = og.getAttribute('data-i18n-cat');
            const cat = categories.find(c => c.id === catId);
            if (cat) {
                og.label = `${cat.icon} ${window.t(`editor.cat.${catId}`)}`;
            }
        });
        
        // Actualitzar options (exemples)
        selector.querySelectorAll('option[data-i18n-ex]').forEach(opt => {
            const exId = opt.getAttribute('data-i18n-ex');
            opt.textContent = window.t(`editor.ex.${exId}`);
        });
    }

    // ============================================
    // ACCIONS MENÚ AJUDA
    // ============================================

    /**
     * Obrir documentació en una nova pestanya segons l'idioma
     */
    openDocsUrl() {
        const lang = window.i18n ? window.i18n.getLanguage() : 'ca';
        const urls = {
            ca: 'https://www.binefa.com/index.php/IoT-Vertebrae',
            es: 'https://www.binefa.com/index.php/IoT-Vertebrae_es',
            en: 'https://www.binefa.com/index.php/IoT-Vertebrae_en'
        };
        const url = urls[lang] || urls.ca;
        window.open(url, '_blank');
    }

    /**
     * Carregar manifest d'exemples (examples/index.txt)
     */
    async loadExamplesManifest() {
        try {
            const response = await fetch('examples/index.txt');
            if (!response.ok) {
                console.log('ℹ️ No hi ha manifest d\'exemples (examples/index.txt)');
                this._examplesAvailable = false;
                this._examplesList = [];
                return;
            }
            const text = await response.text();
            const lines = text.trim().split('\n').filter(l => l.trim());
            this._examplesList = lines.map(line => {
                const parts = line.split(';');
                return {
                    file: (parts[0] || '').trim(),
                    name: (parts[1] || '').trim(),
                    description: (parts[2] || '').trim()
                };
            }).filter(e => e.file);
            this._examplesAvailable = this._examplesList.length > 0;
            console.log(`✓ Manifest d'exemples carregat: ${this._examplesList.length} exemples`);
        } catch (error) {
            console.log('ℹ️ No s\'ha pogut carregar el manifest d\'exemples:', error.message);
            this._examplesAvailable = false;
            this._examplesList = [];
        }
    }

    /**
     * Mostrar finestra d'exemples
     */
    /**
     * Mostrar diàleg modal d'exemples
     */
    async showExamplesWindow() {
        const filename = await window.ProjectDialogs.showExamplesDialog(
            this._examplesList || [],
            window.i18n ? window.i18n.currentLanguage : 'ca'
        );
        if (filename) {
            await this._loadExample(filename);
        }
    }

    /**
     * Carregar un exemple concret
     */
    async _loadExample(filename) {
        const t = window.t || (k => k);
        const url = `examples/${filename}.zip`;
        try {
            window.showToast(t('examples.loading'), 'info');
            await window.projectManager.importFromUrl(url);
        } catch (error) {
            console.error('Error carregant exemple:', error);
            window.showToast(t('examples.load_error') + ': ' + error.message, 'error');
        }
    }

    showShortcuts() {
        this.consoleOutput.info('⌨️ Dreceres de teclat:');
        this.consoleOutput.log('');
        this.consoleOutput.log('Scripts:');
        this.consoleOutput.log('  F5          - Executa');
        this.consoleOutput.log('  Shift+F5    - Atura');
        this.consoleOutput.log('');
        this.consoleOutput.log('Arxiu:');
        this.consoleOutput.log('  Ctrl+N      - Nou projecte');
        this.consoleOutput.log('  Ctrl+O      - Obre projecte');
        this.consoleOutput.log('  Ctrl+S      - Desa projecte');
        this.consoleOutput.log('');
        this.consoleOutput.log('Edita:');
        this.consoleOutput.log('  Ctrl+C      - Copia');
        this.consoleOutput.log('  Ctrl+V      - Enganxa');
        this.consoleOutput.log('  Ctrl+X      - Retalla');
        this.consoleOutput.log('  Ctrl+F      - Cerca');
        this.consoleOutput.log('');
        this.consoleOutput.log('Vista:');
        this.consoleOutput.log('  F11         - Pantalla completa');
    }

    /**
     * Reconstruir el menú Finestra amb la llista actual (estil macOS, dinàmic)
     */
    _rebuildWindowMenu(menu) {
        const t = window.t || (k => k);
        const WM = this.windowManager;
        const items = [];

        items.push({
            id: 'win-minimize-all',
            label: 'menu.window.minimize_all',
            icon: '🗕',
            action: () => this._minimizeAllWindows()
        });
        items.push({
            id: 'win-restore-all',
            label: 'menu.window.restore_all',
            icon: '🪟',
            action: () => this.restoreWindows()
        });
        items.push({ type: 'separator' });

        if (WM) {
            const allWins = Array.from(WM.windows.values());
            if (allWins.length === 0) {
                items.push({
                    id: 'win-empty',
                    label: 'menu.window.no_windows',
                    icon: '',
                    disabled: true,
                    action: () => {}
                });
            } else {
                allWins.forEach(win => {
                    const isMinimized = win.isMinimized || !win.visible;
                    items.push({
                        id: `win-focus-${win.id}`,
                        label: (isMinimized ? '🗕 ' : '🔲 ') + win.config.title,
                        icon: '',
                        _skipTranslation: true,
                        action: () => {
                            if (isMinimized) {
                                WM.restoreWindow(win.id);
                            } else {
                                WM.bringToFront(win.id);
                            }
                        }
                    });
                });
            }
        }

        menu.rebuildItems(items);
    }

    /**
     * Minimitzar totes les finestres visibles a la taskbar
     */
    _minimizeAllWindows() {
        const WM = this.windowManager;
        if (!WM) return;
        Array.from(WM.windows.keys()).forEach(id => {
            const win = WM.getWindow(id);
            if (win && win.visible && !win.isMinimized) {
                WM.minimizeWindow(id);
            }
        });
    }

    /**
     * Esborrar dades locals (localStorage) i recarregar
     */
    async clearLocalData() {
        // Diàleg de confirmació
        const confirmed = await new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 30000;
                display: flex; align-items: center; justify-content: center;
            `;
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2c3e50; color: #ecf0f1; padding: 25px; border-radius: 8px;
                max-width: 450px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: 'Segoe UI', Arial, sans-serif;
            `;
            const t = window.t || (k => k);
            dialog.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #e74c3c;">🗑️ ${t('dialog.clear_data.title')}</h3>
                <p style="margin: 0 0 20px 0; line-height: 1.5;">${t('dialog.clear_data.message')}</p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cd-cancel" style="padding: 8px 20px; background: #7f8c8d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ${t('dialog.clear_data.cancel')}
                    </button>
                    <button id="cd-confirm" style="padding: 8px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        ${t('dialog.clear_data.confirm')}
                    </button>
                </div>
            `;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            dialog.querySelector('#cd-cancel').onclick = () => { overlay.remove(); resolve(false); };
            dialog.querySelector('#cd-confirm').onclick = () => { overlay.remove(); resolve(true); };
            overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
        });

        if (!confirmed) return;

        // Esborrar tot el localStorage del domini
        try {
            localStorage.clear();
            console.log('✓ localStorage esborrat');
        } catch (e) {
            console.error('Error esborrant localStorage:', e);
        }

        // Recarregar la pàgina
        window.location.reload();
    }

    toggleDebug() {
        const currentDebug = window.ConfigManager.get('performance.debugMode');
        const newDebug = !currentDebug;
        
        window.ConfigManager.setDebugMode(newDebug);
        
        if (newDebug) {
            this.consoleOutput.success('🐛 Mode debug ACTIVAT');
            this.consoleOutput.log('   EventBus logs: Activats');
            this.consoleOutput.log('   PLCMemory history: Activat');
        } else {
            this.consoleOutput.info('🐛 Mode debug DESACTIVAT');
        }
    }

    showAbout() {
        this.consoleOutput.clear();
        this.consoleOutput.success('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.consoleOutput.success('🔌 IoT-Vertebrae v2.0');
        this.consoleOutput.success('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.consoleOutput.log('');
        this.consoleOutput.info('Simulador Educatiu d\'IoT');
        this.consoleOutput.log('Desenvolupat per: Jordi');
        this.consoleOutput.log('Any: 2026');
        this.consoleOutput.log('Versió: 2.0.0');
        this.consoleOutput.log('');
        this.consoleOutput.log('Components:');
        this.consoleOutput.log('  • EventBus - Sistema d\'esdeveniments');
        this.consoleOutput.log('  • PLCMemory - Memòria PLC simulada');
        this.consoleOutput.log('  • ScriptEditor - Editor Python');
        this.consoleOutput.log('  • DigitalTwin - Bessó digital');
        this.consoleOutput.log('  • WindowManager - Gestió finestres');
        this.consoleOutput.log('  • i18n - Internacionalització (ca/es/en)');
        this.consoleOutput.log('');
        this.consoleOutput.log('Tecnologies:');
        this.consoleOutput.log('  • Vanilla JavaScript (ES6+)');
        this.consoleOutput.log('  • 0 dependències externes');
        this.consoleOutput.log('  • 100% client-side');
        this.consoleOutput.log('');
        this.consoleOutput.success('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Mostrar Visió General del sistema
     */
    showGlobalOverview() {
        if (window.GlobalOverview) {
            window.GlobalOverview.open();
        } else {
            console.error('GlobalOverview no disponible');
        }
    }

    /**
     * Mostrar foto del hardware IoT-Vertebrae real
     */
    showHardwarePhoto() {
        const t = window.t || ((key) => key);
        const WIN_ID = 'iotv-hardware-photo';

        // Si ja existeix, portar al davant
        const existing = this.windowManager.getWindow(WIN_ID);
        if (existing) {
            this.windowManager.bringToFront(WIN_ID);
            return;
        }

        const content = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                background: #1a1a2e;
                box-sizing: border-box;
                padding: 12px;
            ">
                <picture>
                    <source srcset="js/assets/IoT-Vertebrae.webp" type="image/webp">
                    <img
                        src="js/assets/IoT-Vertebrae.png"
                        alt="IoT-Vertebrae hardware"
                        style="
                            width: 366px;
                            height: 360px;
                            object-fit: contain;
                            border-radius: 6px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.6);
                            display: block;
                        "
                    >
                </picture>
            </div>`;

        this.windowManager.createWindow({
            id: WIN_ID,
            title: t('menu.help.photo.window_title'),
            content: content,
            width: 410,
            height: 420,
            x: Math.round(window.innerWidth  / 2 - 205),
            y: Math.round(window.innerHeight / 2 - 210),
            resizable: false,
            minimizable: true,
            maximizable: false,
            modal: false
        });
        this.windowManager.bringToFront(WIN_ID);
    }

    /**
     * Mostrar bessons actius
     */
    showActiveTwins() {
        if (!window.app || !window.app.windowManager) {
            console.error('WindowManager no disponible');
            return;
        }

        // Obtenir bessons actius des del BessoManager
        const activeNames = window.BessoManager ? window.BessoManager.getActiveInstances() : [];
        
        // Obtenir finestra del bessó digital IoT-V (sempre actiu si obert)
        const allWindows = Array.from(window.app.windowManager.windows.values());
        const digitalTwinWindow = allWindows.find(win => {
            const title = win.config.title;
            return title.includes('Bessó Digital') || title.includes('Gemelo Digital') || title.includes('Digital Twin');
        });

        const t = window.t || ((key) => key);
        let content = `<div style="padding: 20px; background: #fff; color: #333;">`;
        content += `<h3 style="margin-top: 0;">${t('bessons.active.title')}</h3>`;
        
        const totalActive = activeNames.length + (digitalTwinWindow ? 1 : 0);
        
        if (totalActive === 0) {
            content += `<p style="color: #888;">${t('bessons.active.none')}</p>`;
        } else {
            content += `<p style="color: #333;">${t('bessons.active.list')}</p>`;
            content += `<ul style="list-style: none; padding-left: 0; margin: 10px 0;">`;
            
            // Bessó digital IoT-V
            if (digitalTwinWindow) {
                content += `<li style="padding: 8px; margin: 4px 0; background: #f5f5f5; border-left: 3px solid #2196F3; font-family: monospace;">`;
                content += `<span style="color: #2196F3;">🖥️</span> ${digitalTwinWindow.config.title}`;
                content += `</li>`;
            }
            
            // Bessons del BessoManager (clàssics + twins)
            activeNames.forEach(name => {
                const instance = window.BessoManager.activeInstances.get(name);
                const title = instance && instance.window ? instance.window.config.title : name;
                content += `<li style="padding: 8px; margin: 4px 0; background: #f5f5f5; border-left: 3px solid #4CAF50; font-family: monospace;">`;
                content += `<span style="color: #4CAF50;">▪</span> ${title}`;
                content += `</li>`;
            });
            
            content += `</ul>`;
        }
        
        content += `<div style="text-align: right; margin-top: 20px;">`;
        content += `<button onclick="document.getElementById('active-twins-dialog').querySelector('.window-close').click()"
 style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>`;
        content += `</div>`;
        content += `</div>`;

        window.WindowManager.createWindow({
            id: 'active-twins-dialog',
            title: t('bessons.active.title'),
            content: content,
            width: 500,
            height: 400,
            x: window.innerWidth / 2 - 250,
            y: window.innerHeight / 2 - 200,
            resizable: false,
            minimizable: false,
            maximizable: false,
            modal: true
        });
    }

    /**
     * Mostrar bessons disponibles
     */
    showAvailableTwins() {
        // Bessons disponibles detectats al sistema (arxius a /js/bessons/)
        const availableBessons = [
            { 
                id: 'pont-h', 
                file: 'pont-h.js',
                name: { 
                    ca: 'Pont H', 
                    es: 'Puente H', 
                    en: 'H-Bridge' 
                } 
            },
            { 
                id: 'cinta', 
                file: 'cinta.js',
                name: { 
                    ca: 'Cinta transportadora', 
                    es: 'Cinta transportadora', 
                    en: 'Conveyor belt' 
                } 
            }
        ];

        // Crear contingut del diàleg
        const t = window.t || ((key) => key);
        const lang = window.i18n ? window.i18n.currentLanguage : 'ca';
        
        let content = `<div style="padding: 20px;">`;
        content += `<h3 style="margin-top: 0;">${t('bessons.available.title')}</h3>`;
        
        if (availableBessons.length === 0) {
            content += `<p style="color: #888;">${t('bessons.available.none')}</p>`;
        } else {
            content += `<p>${t('bessons.available.list')}</p>`;
            content += `<ul style="list-style: none; padding-left: 0; margin: 10px 0;">`;
            availableBessons.forEach(besso => {
                const displayName = besso.name[lang] || besso.name.ca;
                content += `<li style="padding: 8px; margin: 4px 0; background: #f5f5f5; border-left: 3px solid #4CAF50; font-family: monospace;">`;
                content += `<span style="color: #4CAF50;">📦</span> <strong>${displayName}</strong>`;
                content += `<br><span style="color: #666; font-size: 0.9em; margin-left: 24px;">${besso.file}</span>`;
                content += `</li>`;
            });
            content += `</ul>`;
            content += `<p style="color: #666; font-size: 0.9em; margin-top: 15px;">`;
            content += `<em>Nota: Els bessons es carreguen des de la Configuració IO Bessons</em>`;
            content += `</p>`;
        }
        
        content += `<div style="text-align: right; margin-top: 20px;">`;
        content += `<button onclick="window.WindowManager.closeWindow('available-twins-dialog')" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>`;
        content += `</div>`;
        content += `</div>`;

        // Crear finestra de diàleg modal
        window.WindowManager.createWindow({
            id: 'available-twins-dialog',
            title: t('bessons.available.title'),
            content: content,
            width: 500,
            height: 450,
            x: window.innerWidth / 2 - 250,
            y: window.innerHeight / 2 - 225,
            resizable: false,
            minimizable: false,
            maximizable: false,
            modal: true
        });
    }
}

// Auto-inicialitzar quan el DOM estigui llest
if (typeof window !== 'undefined') {
    window.IoTVertebraeApp = IoTVertebraeApp;
    
    // Inicialitzar automàticament
    /*document.addEventListener('DOMContentLoaded', () => {
        const app = new IoTVertebraeApp();
        app.init();
        
        // Exposar globalment per debugging
        window.app = app;
    });*/
    // Inicialitzar app quan DOM estigui llest
	document.addEventListener('DOMContentLoaded', async () => {
		window.app = new IoTVertebraeApp();  // ✅ Accessible globalment
		await window.app.init();
		
        // Exposar globalment per debugging
        window.app = app;	
     });
}

console.log('✓ app.js loaded');
