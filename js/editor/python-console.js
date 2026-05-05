/**
 * PythonConsoleWindow - Finestra de Consola Python
 * 
 * Finestra independent amb editor CodeMirror + consola integrada.
 * Reutilitza ScriptEditorClass com a motor de transpilació/execució,
 * amb una instància pròpia de ConsoleOutputClass per a la sortida.
 * Comparteix PLCMemory amb l'Editor Python principal.
 */

class PythonConsoleWindow {
    constructor() {
        this.window = null;          // Referència a la finestra WindowManager
        this.scriptEditor = null;    // Instància de ScriptEditorClass
        this.consoleOutput = null;   // Instància pròpia de ConsoleOutputClass
        this.isRunning = false;

        // IDs únics per evitar conflictes amb l'editor principal
        this.IDS = {
            btnRun:   'pyconsole-btn-run',
            btnStop:  'pyconsole-btn-stop',
            btnClear: 'pyconsole-btn-clear',
            editor:   'pyconsole-editor-container',
            output:   'pyconsole-output-container',
            splitter: 'pyconsole-splitter'
        };
    }

    /**
     * Inicialitzar la finestra (cridat des de app.js)
     * @param {WindowManager} windowManager
     * @returns {Object} window reference
     */
    init(windowManager) {
        const t = window.t || (k => k);

        // Crear finestra
        this.window = windowManager.createWindow({
            id: 'pyconsole-window',
            title: t('window.pyconsole'),
            x: 50,
            y: 120,
            width: 620,
            height: 650,
            minWidth: 400,
            minHeight: 350,
            onClose: () => {
                // Aturar execució si estava corrent
                if (this.isRunning) {
                    this.stopScript();
                }
                // Amagar en comptes de destruir
                this.window.hide();
                if (window.app && window.app.menuBar) {
                    window.app.menuBar.setChecked('pyconsole', false);
                }
                return false; // Cancel·lar tancament real
            }
        });

        // Amagar per defecte (a diferència de les altres tres finestres)
        this.window.hide();

        // Construir UI interna
        this._buildUI();

        // Crear instàncies dels components
        this._initComponents();

        // Listeners de botons
        this._setupListeners();

        console.log('✓ PythonConsoleWindow inicialitzat');
        return this.window;
    }

    /* ─── UI ──────────────────────────────────────────────── */

    _buildUI() {
        const t = window.t || (k => k);
        const container = this.window.contentElement;
        container.style.padding = '0';
        container.style.overflow = 'hidden';

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%;">
                <!-- Toolbar -->
                <div style="padding:8px 10px; background:#2c3e50; border-bottom:1px solid #34495e; display:flex; gap:8px;">
                    <button id="${this.IDS.btnRun}"
                        style="flex:1; padding:8px; background:#2ecc71; color:#fff; border:none;
                               border-radius:4px; font-weight:bold; cursor:pointer;">
                        <span data-i18n="pyconsole.run">${t('pyconsole.run')}</span>
                    </button>
                    <button id="${this.IDS.btnStop}" disabled
                        style="flex:1; padding:8px; background:#e74c3c; color:#fff; border:none;
                               border-radius:4px; font-weight:bold; cursor:pointer;">
                        <span data-i18n="pyconsole.stop">${t('pyconsole.stop')}</span>
                    </button>
                    <button id="${this.IDS.btnClear}"
                        style="padding:8px 16px; background:#7f8c8d; color:#fff; border:none;
                               border-radius:4px; cursor:pointer;">
                        🗑️
                    </button>
                </div>

                <!-- Editor (60%) -->
                <div id="${this.IDS.editor}"
                     style="flex:6; overflow:hidden; min-height:60px;"></div>

                <!-- Splitter arrossegable -->
                <div id="${this.IDS.splitter}" class="pyconsole-splitter"></div>

                <!-- Consola integrada (40%) -->
                <div id="${this.IDS.output}"
                     style="flex:4; overflow:hidden; min-height:60px; background:#1a1a2e;"></div>
            </div>
        `;
    }

    _initComponents() {
        const editorContainer = document.getElementById(this.IDS.editor);
        const outputContainer = document.getElementById(this.IDS.output);

        // Crear editor (ScriptEditorClass sense selector d'exemples)
        this.scriptEditor = new window.ScriptEditorClass(editorContainer, null);
        this.scriptEditor._serialOwner = 'console'; // Identificar-se per a gestió de ports serial

        // Crear consola pròpia
        this.consoleOutput = new window.ConsoleOutputClass(outputContainer);

        // Inicialitzar splitter arrossegable
        this._initSplitter();
    }

    _setupListeners() {
        const btnRun  = document.getElementById(this.IDS.btnRun);
        const btnStop = document.getElementById(this.IDS.btnStop);
        const btnClear = document.getElementById(this.IDS.btnClear);

        if (btnRun)  btnRun.addEventListener('click', () => this.runScript());
        if (btnStop) btnStop.addEventListener('click', () => this.stopScript());
        if (btnClear) btnClear.addEventListener('click', () => {
            this.scriptEditor.clear();
            this.consoleOutput.clear();
        });
    }

    /* ─── Splitter arrossegable ──────────────────────────── */

    _initSplitter() {
        const splitter = document.getElementById(this.IDS.splitter);
        const editorEl = document.getElementById(this.IDS.editor);
        const outputEl = document.getElementById(this.IDS.output);
        if (!splitter || !editorEl || !outputEl) return;

        let startY = 0;
        let startEditorH = 0;
        let startOutputH = 0;

        const onMouseMove = (e) => {
            const dy = e.clientY - startY;
            const parentH = editorEl.parentElement.clientHeight;
            const toolbarH = editorEl.parentElement.firstElementChild.offsetHeight;
            const splitterH = splitter.offsetHeight;
            const available = parentH - toolbarH - splitterH;

            let newEditorH = startEditorH + dy;
            let newOutputH = startOutputH - dy;

            // Mínims
            if (newEditorH < 60) newEditorH = 60;
            if (newOutputH < 60) newOutputH = 60;

            // Recalcular flex
            const total = newEditorH + newOutputH;
            editorEl.style.flex = (newEditorH / total * 10).toFixed(2);
            outputEl.style.flex = (newOutputH / total * 10).toFixed(2);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        splitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            startEditorH = editorEl.offsetHeight;
            startOutputH = outputEl.offsetHeight;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    /* ─── Execució ───────────────────────────────────────── */

    async runScript() {
        if (this.isRunning) {
            this.consoleOutput.warn('⚠️ Ja hi ha un script executant-se');
            return;
        }

        const btnRun  = document.getElementById(this.IDS.btnRun);
        const btnStop = document.getElementById(this.IDS.btnStop);

        this.isRunning = true;
        if (btnRun)  btnRun.disabled = true;
        if (btnStop) btnStop.disabled = false;

        this.consoleOutput.clear();
        this.consoleOutput.success('▶️ Iniciant execució...');

        await this.scriptEditor.run({
            output: (text) => {
                // IMPORTANT: la sortida va NOMÉS a la consola pròpia
                this.consoleOutput.log(text);
            },
            error: (error) => {
                // El missatge ja ve formatat amb ❌ i número de línia des de ScriptEditor
                this.consoleOutput.error(error);
            },
            complete: () => {
                this.consoleOutput.success('✓ Execució completada');
                this.isRunning = false;
                if (btnRun)  btnRun.disabled = false;
                if (btnStop) btnStop.disabled = true;
            }
        });

        // Per si l'script acaba sense cridar complete (error directe)
        if (!this.scriptEditor.getIsRunning()) {
            this.isRunning = false;
            if (btnRun)  btnRun.disabled = false;
            if (btnStop) btnStop.disabled = true;
        }
    }

    stopScript() {
        this.scriptEditor.stop();
        this.consoleOutput.warn('⏹️ Execució aturada per l\'usuari');
        this.isRunning = false;

        const btnRun  = document.getElementById(this.IDS.btnRun);
        const btnStop = document.getElementById(this.IDS.btnStop);
        if (btnRun)  btnRun.disabled = false;
        if (btnStop) btnStop.disabled = true;
    }

    /* ─── API pública per ProjectManager ─────────────────── */

    /** Obtenir el codi actual */
    getCode() {
        return this.scriptEditor ? this.scriptEditor.getCode() : '';
    }

    /** Establir codi */
    setCode(code) {
        if (this.scriptEditor) {
            this.scriptEditor.setCode(code);
        }
    }

    /** Netejar editor + consola */
    clear() {
        if (this.scriptEditor) this.scriptEditor.clear();
        if (this.consoleOutput) this.consoleOutput.clear();
    }

    /** Mostrar / amagar finestra */
    show() {
        if (this.window) this.window.show();
    }

    hide() {
        if (this.window) this.window.hide();
    }

    get visible() {
        return this.window ? this.window.visible : false;
    }
}

// Exportar globalment
if (typeof window !== 'undefined') {
    window.PythonConsoleWindow = PythonConsoleWindow;
}

console.log('✓ PythonConsoleWindow loaded');
