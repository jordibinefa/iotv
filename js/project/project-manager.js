/**
 * ProjectManager - Gestió d'exportació i importació de projectes IoT-Vertebrae
 * 
 * Gestiona:
 * - Exportació de projectes a .zip
 * - Importació de projectes des de .zip
 * - Creació de nous projectes
 * - Gestió de metadades del projecte
 * - Validacions de configuracions
 */

class ProjectManager {
    constructor() {
        this.currentProjectInfo = null;
        this.loadProjectInfoFromStorage();
    }

    /**
     * Carregar metadades del projecte des de localStorage
     */
    loadProjectInfoFromStorage() {
        try {
            const storedInfo = localStorage.getItem('iotv2_project_meta');
            if (storedInfo) {
                this.currentProjectInfo = JSON.parse(storedInfo);
            } else {
                this.currentProjectInfo = this.getDefaultProjectInfo();
            }
        } catch (error) {
            console.error('Error carregant informació del projecte:', error);
            this.currentProjectInfo = this.getDefaultProjectInfo();
        }
    }

    /**
     * Obtenir informació per defecte del projecte
     */
    getDefaultProjectInfo() {
        return {
            name: '',
            version: '1.0',
            author: '',
            description: '',
            iotv_version: '2.0',
            created: new Date().toISOString(),
            exported: null
        };
    }

    /**
     * Obtenir informació del projecte actual
     */
    getProjectInfo() {
        return { ...this.currentProjectInfo };
    }

    /**
     * Actualitzar informació del projecte
     */
    setProjectInfo(info) {
        this.currentProjectInfo = {
            ...this.currentProjectInfo,
            ...info,
            iotv_version: '2.0', // Sempre versió 2.0
            exported: new Date().toISOString()
        };
        
        // Desar a localStorage si autodesar està activat
        if (window.autosaveManager && window.autosaveManager.isEnabled()) {
            localStorage.setItem('iotv2_project_meta', JSON.stringify(this.currentProjectInfo));
        }
        
        return this.currentProjectInfo;
    }

    /**
     * Validar configuració IoT-Vertebrae
     */
    validateIotvConfig(config) {
        try {
            // Intentar parsejar si és string
            const cfg = typeof config === 'string' ? JSON.parse(config) : config;
            
            // Validacions bàsiques
            if (!cfg) {
                return { valid: false, error: 'Configuració buida' };
            }
            
            if (!Array.isArray(cfg.vertebrae)) {
                return { valid: false, error: 'Falta array vertebrae' };
            }
            
            // Validar cada vèrtebra
            for (const v of cfg.vertebrae) {
                if (!v.addr || !v.type) {
                    return { valid: false, error: 'Vèrtebra amb dades incompletes' };
                }
                if (!['digital', 'analog'].includes(v.type)) {
                    return { valid: false, error: `Tipus invàlid: ${v.type}` };
                }
            }
            
            return { valid: true, config: cfg };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Validar configuració Altres Bessons
     */
    validateOthersConfig(config) {
        try {
            // Intentar parsejar si és string
            const cfg = typeof config === 'string' ? JSON.parse(config) : config;
            
            // Pot ser array buit
            if (!cfg) {
                return { valid: true, config: [] };
            }
            
            if (!Array.isArray(cfg)) {
                return { valid: false, error: 'La configuració ha de ser un array' };
            }
            
            return { valid: true, config: cfg };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Obtenir configuració actual IoT-Vertebrae
     */
    getCurrentIotvConfig() {
        try {
            if (window.VertebraeConfig && window.VertebraeConfig.current) {
                return window.VertebraeConfig.current;
            }
            // Fallback: intentar obtenir del preset bàsic
            if (window.VertebraeConfig && window.VertebraeConfig.PRESETS) {
                return window.VertebraeConfig.PRESETS.basic;
            }
            return null;
        } catch (error) {
            console.error('Error obtenint configuració IoTv:', error);
            return null;
        }
    }

    /**
     * Obtenir configuració actual Altres Bessons
     */
    getCurrentOthersConfig() {
        try {
            // Cridar la funció global que retorna les configuracions
            if (typeof window.getAllBessoConfigs === 'function') {
                const configs = window.getAllBessoConfigs();
                return configs || [];
            }
            return [];
        } catch (error) {
            console.error('Error obtenint configuració Altres Bessons:', error);
            return [];
        }
    }

    /**
     * Obtenir codi Python actual
     */
    getCurrentPythonScript() {
        try {
            if (window.app && window.app.scriptEditor && window.app.scriptEditor.getCode) {
                return window.app.scriptEditor.getCode();
            }
            if (window.scriptEditor && window.scriptEditor.getCode) {
                return window.scriptEditor.getCode();
            }
            if (window.scriptEditor && window.scriptEditor.getValue) {
                return window.scriptEditor.getValue();
            }
            return '';
        } catch (error) {
            console.error('Error obtenint script Python:', error);
            return '';
        }
    }

    /**
     * Obtenir codi de la Consola Python
     */
    getCurrentConsoleScript() {
        try {
            if (window.app && window.app.pythonConsole && window.app.pythonConsole.getCode) {
                return window.app.pythonConsole.getCode();
            }
            return '';
        } catch (error) {
            console.error('Error obtenint script consola Python:', error);
            return '';
        }
    }

    /**
     * Sanititzar nom de fitxer
     */
    sanitizeName(name) {
        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Eliminar accents
            .replace(/[^a-zA-Z0-9]/g, '')     // Només alfanumèrics
            .substring(0, 50);                 // Màxim 50 caràcters
    }

    /**
     * Obtenir la llengua actual de la UI
     */
    getCurrentLanguage() {
        if (window.i18n && window.i18n.currentLanguage) {
            return window.i18n.currentLanguage;
        }
        if (window.ConfigManager && window.ConfigManager.getLanguage) {
            return window.ConfigManager.getLanguage();
        }
        return 'ca';
    }

    /**
     * Obtenir l'estat de totes les finestres obertes/amagades
     * Retorna un array ordenat per zOrder (de baix a dalt)
     */
    getWindowsState() {
        const WM = window.windowManager || window.WindowManager;
        if (!WM || !WM.windows) return [];

        const windowsState = [];
        const excludeIds = ['besso-config-editor']; // Finestres a excloure

        WM.windows.forEach((win, id) => {
            if (excludeIds.includes(id)) return;

            const zIndex = parseInt(win.element.style.zIndex) || 0;
            windowsState.push({
                id: id,
                x: win.x,
                y: win.y,
                width: win.width,
                height: win.height,
                visible: win.visible !== false && win.element.style.display !== 'none',
                isMinimized: win.isMinimized || false,
                isMaximized: win.isMaximized || false,
                zIndex: zIndex
            });
        });

        // Ordenar per zIndex per calcular zOrder relatiu
        windowsState.sort((a, b) => a.zIndex - b.zIndex);
        windowsState.forEach((ws, index) => {
            ws.zOrder = index + 1;
            delete ws.zIndex; // No cal guardar el zIndex absolut
        });

        return windowsState;
    }

    /**
     * Aplicar l'estat de les finestres restaurades des d'un projecte
     * @param {string} language - Idioma del projecte
     * @param {Array} windowsState - Estat de les finestres
     */
    applyProjectUIState(language, windowsState) {
        // 1. Aplicar llengua
        if (language && ['ca', 'es', 'en'].includes(language)) {
            if (window.ConfigManager && window.ConfigManager.setLanguage) {
                window.ConfigManager.setLanguage(language);
            }
            if (window.i18n && window.i18n.setLanguage) {
                window.i18n.setLanguage(language);
            }
            // Actualitzar tick del menú Language directament (sense dependre d'events)
            if (window.MenuBar && window.MenuBar.setChecked) {
                window.MenuBar.setChecked(`lang-${language}`, true);
            }
            console.log(`✓ Llengua del projecte aplicada: ${language}`);
        }

        // 2. Aplicar estat de finestres
        if (!windowsState || !Array.isArray(windowsState) || windowsState.length === 0) return;

        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        // Ordenar per zOrder ascendent (la darrera serà la que queda al davant)
        const sorted = [...windowsState].sort((a, b) => (a.zOrder || 0) - (b.zOrder || 0));

        sorted.forEach(ws => {
            const win = WM.getWindow(ws.id);
            if (!win) return;

            // Aplicar posició i mida (només si no està maximitzada)
            if (!ws.isMaximized) {
                win.x = ws.x;
                win.y = ws.y;
                win.width = Math.max(win.config.minWidth || 200, ws.width);
                win.height = Math.max(win.config.minHeight || 150, ws.height);
                win.updatePosition();
            }

            // Aplicar estat de maximització
            if (ws.isMaximized && !win.isMaximized) {
                win.maximize();
            } else if (!ws.isMaximized && win.isMaximized) {
                win.restore();
            }

            // Aplicar visibilitat
            if (ws.visible) {
                win.visible = true;
                win.isMinimized = false;
                win.element.style.display = '';
                WM.removeFromTaskbar(ws.id);
            } else if (ws.isMinimized) {
                WM.minimizeWindow(ws.id);
            } else {
                win.hide();
            }
        });

        // Aplicar zOrder: fer bringToFront en ordre ascendent de zOrder
        // (només per les finestres visibles)
        sorted
            .filter(ws => ws.visible)
            .forEach(ws => {
                WM.bringToFront(ws.id);
            });

        console.log(`✓ Estat de ${windowsState.length} finestres restaurat`);
    }

    /**
     * Exportar projecte com a .zip
     */
    async exportProject() {
        try {
            console.log('🔄 Iniciant exportació del projecte...');
            
            // 1. Validar configuracions
            const iotvConfig = this.getCurrentIotvConfig();
            const othersConfig = this.getCurrentOthersConfig();
            const pythonScript = this.getCurrentPythonScript();
            
            // Validar IoTv
            const iotvValidation = this.validateIotvConfig(iotvConfig);
            if (!iotvValidation.valid) {
                throw new Error(window.t('dialog.export.error_iotv_invalid') + ': ' + iotvValidation.error);
            }
            
            // Validar Others
            const othersValidation = this.validateOthersConfig(othersConfig);
            if (!othersValidation.valid) {
                throw new Error(window.t('dialog.export.error_others_invalid') + ': ' + othersValidation.error);
            }
            
            // Warnings (no bloquegen)
            const warnings = [];
            if (!pythonScript || pythonScript.trim() === '') {
                warnings.push(window.t('dialog.export.warning_python_empty'));
            }
            
            // 2. Mostrar dialog per emplenar metadades
            const projectInfo = await window.ProjectDialogs.showProjectInfoDialog({
                title: window.t('dialog.project_info.title'),
                currentInfo: this.currentProjectInfo,
                warnings: warnings,
                buttonText: window.t('dialog.project_info.export')
            });
            
            if (!projectInfo) {
                console.log('Exportació cancel·lada per l\'usuari');
                return;
            }
            
            // Validar que hi ha nom
            if (!projectInfo.name || projectInfo.name.trim() === '') {
                throw new Error(window.t('dialog.export.error_name_empty'));
            }
            
            // 3. Actualitzar metadades
            this.setProjectInfo(projectInfo);
            
            // 3b. Afegir llengua i estat de finestres a les metadades
            const projectData = {
                ...this.currentProjectInfo,
                language: this.getCurrentLanguage(),
                windowsState: this.getWindowsState()
            };
            
            // 4. Preparar fitxers per al .zip
            const files = {
                'project.json': JSON.stringify(projectData, null, 2),
                'iotv_config.json': JSON.stringify(iotvValidation.config, null, 2),
                'others_config.json': JSON.stringify(othersValidation.config, null, 2),
                'script.py': pythonScript
            };
            
            // Afegir console_script.py si hi ha contingut a la Consola Python
            const consoleScript = this.getCurrentConsoleScript();
            if (consoleScript && consoleScript.trim() !== '') {
                files['console_script.py'] = consoleScript;
            }
            
            // Afegir sch.png si existeix (esquema de connexió)
            if (window._schematicImage) {
                try {
                    const dataUrl = window._schematicImage;
                    const parts = dataUrl.split(',');
                    const binary = atob(parts[1]);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    files['sch.png'] = bytes;
                } catch (e) {
                    console.warn('⚠ Error afegint sch.png a l\'exportació:', e);
                }
            }
            
            // Afegir twins_config.json si existeix (s9a)
            if (window.TwinsConfigManager) {
                const twinsData = window.TwinsConfigManager.export();
                if (twinsData && twinsData.length > 0) {
                    files['twins_config.json'] = JSON.stringify(twinsData, null, 2);
                }
            }
            
            // Afegir assets de bessons (twins/ folder)
            if (window._twinsAssets) {
                Object.entries(window._twinsAssets).forEach(([filename, content]) => {
                    if (content.startsWith('data:')) {
                        // Imatge base64 → binari
                        const parts = content.split(',');
                        const binary = atob(parts[1]);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                        files[`twins/${filename}`] = bytes;
                    } else {
                        // Text (HTML, JS, CSS)
                        files[`twins/${filename}`] = content;
                    }
                });
            }
            
            // 5. Crear .zip amb JSZip
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip no està disponible. Assegura\'t que està carregat.');
            }
            
            const zip = new JSZip();
            
            // Afegir cada fitxer al zip
            for (const [filename, content] of Object.entries(files)) {
                zip.file(filename, content);
            }
            
            // 6. Generar el blob del .zip
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // 7. Descarregar el fitxer
            const zipFilename = this.sanitizeName(projectInfo.name) + '.zip';
            
            if (typeof saveAs !== 'undefined') {
                // Utilitzar FileSaver.js
                saveAs(zipBlob, zipFilename);
            } else {
                // Fallback manual
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = zipFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            // 8. Mostrar notificació d'èxit
            window.showToast(window.t('dialog.export.success') + ' ' + zipFilename, 'success');
            
            console.log('✅ Projecte exportat correctament:', zipFilename);
            
        } catch (error) {
            console.error('❌ Error exportant projecte:', error);
            window.showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Importar projecte des de .zip
     */
    async importProject() {
        try {
            // 0. Aturar script Python si està en execució
            if (window.app && window.app.isRunning) {
                console.log('⏹ Aturant script Python abans d\'importar...');
                window.app.stopScript();
                // Petit delay per assegurar que l'execució s'ha aturat
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 1. File picker
            const file = await this.selectZipFile();
            if (!file) {
                console.log('Importació cancel·lada per l\'usuari');
                return;
            }
            
            console.log('🔄 Iniciant importació del projecte:', file.name);
            
            // 2. Llegir i validar .zip
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip no està disponible. Assegura\'t que està carregat.');
            }
            
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            
            // 3. Validar que conté els fitxers necessaris
            if (!zipContent.files['project.json']) {
                throw new Error(window.t('dialog.import.error_no_project_json'));
            }
            
            if (!zipContent.files['iotv_config.json']) {
                throw new Error(window.t('dialog.import.error_no_iotv_config'));
            }
            
            // 4. Llegir i parsejar fitxers
            const projectJsonText = await zipContent.files['project.json'].async('text');
            const projectInfo = JSON.parse(projectJsonText);
            
            const iotvConfigText = await zipContent.files['iotv_config.json'].async('text');
            const iotvConfig = JSON.parse(iotvConfigText);
            
            // Fitxers opcionals
            let othersConfig = [];
            if (zipContent.files['others_config.json']) {
                const othersText = await zipContent.files['others_config.json'].async('text');
                othersConfig = JSON.parse(othersText);
            }
            
            // twins_config.json (catàleg de definicions, s9a)
            let twinsConfig = [];
            if (zipContent.files['twins_config.json']) {
                const twinsText = await zipContent.files['twins_config.json'].async('text');
                twinsConfig = JSON.parse(twinsText);
            }
            
            // twins/ folder (HTML overlays + imatges)
            let twinsAssets = {};
            const twinsFiles = Object.keys(zipContent.files).filter(f => f.startsWith('twins/') && !f.endsWith('/'));
            for (const filePath of twinsFiles) {
                const filename = filePath.replace('twins/', '');
                const ext = filename.split('.').pop().toLowerCase();
                if (['html', 'htm', 'js', 'css', 'svg'].includes(ext)) {
                    twinsAssets[filename] = await zipContent.files[filePath].async('text');
                } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                    const arrayBuf = await zipContent.files[filePath].async('arraybuffer');
                    const bytes = new Uint8Array(arrayBuf);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                    const mimeMap = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp' };
                    twinsAssets[filename] = `data:${mimeMap[ext] || 'image/png'};base64,${btoa(binary)}`;
                }
            }
            if (Object.keys(twinsAssets).length > 0) {
                console.log(`✓ Assets bessons carregats: ${Object.keys(twinsAssets).join(', ')}`);
            }
            
            let pythonScript = '';
            if (zipContent.files['script.py']) {
                pythonScript = await zipContent.files['script.py'].async('text');
            }
            
            let consoleScript = '';
            if (zipContent.files['console_script.py']) {
                consoleScript = await zipContent.files['console_script.py'].async('text');
            }
            
            // sch.png (esquema de connexió, opcional)
            let schematicImage = null;
            if (zipContent.files['sch.png']) {
                try {
                    const arrayBuf = await zipContent.files['sch.png'].async('arraybuffer');
                    const bytes = new Uint8Array(arrayBuf);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                    schematicImage = `data:image/png;base64,${btoa(binary)}`;
                    console.log('✓ Esquema de connexió (sch.png) carregat');
                } catch (e) {
                    console.warn('⚠ Error carregant sch.png:', e);
                }
            }
            
            // 5. Validar configuracions
            const iotvValidation = this.validateIotvConfig(iotvConfig);
            if (!iotvValidation.valid) {
                throw new Error(window.t('dialog.import.error_invalid_iotv_config') + ': ' + iotvValidation.error);
            }
            
            const othersValidation = this.validateOthersConfig(othersConfig);
            if (!othersValidation.valid) {
                throw new Error(window.t('dialog.import.error_invalid_others_config') + ': ' + othersValidation.error);
            }
            
            // 6. Generar estadístiques
            const stats = this.generateProjectStats(iotvValidation.config, othersValidation.config, pythonScript);
            
            // 7. Mostrar dialog preview
            const confirmed = await window.ProjectDialogs.showImportPreviewDialog({
                projectInfo: projectInfo,
                stats: stats,
                warnings: projectInfo.iotv_version !== '2.0' ? [
                    window.t('dialog.import.version_warning').replace('{version}', projectInfo.iotv_version)
                ] : []
            });
            
            if (!confirmed) {
                console.log('Importació cancel·lada per l\'usuari');
                return;
            }
            
            // 8. Aplicar la importació
            await this.applyImport(projectInfo, iotvValidation.config, othersValidation.config, pythonScript, twinsConfig, twinsAssets, consoleScript, schematicImage);
            
            // 9. Notificació d'èxit
            window.showToast(window.t('dialog.import.success') + ' ' + projectInfo.name, 'success');
            
            // 10. Actualitzar nom del projecte a la UI
            if (window.app && window.app.updateProjectNameDisplay) {
                window.app.updateProjectNameDisplay(projectInfo.name);
            }
            
            console.log('✅ Projecte importat correctament');
            
        } catch (error) {
            console.error('❌ Error important projecte:', error);
            window.showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Importar projecte des d'una URL
     * @param {string} url - URL del fitxer .zip
     * @param {Object} options
     * @param {boolean} options.skipDialog - Si true, importa sense diàleg de confirmació (mode load/run)
     * @param {boolean} options.autoRun - Si true, executa l'script Python després d'importar (mode run)
     */
    async importFromUrl(url, options = {}) {
        const { skipDialog = false, autoRun = false } = options;
        try {
            // 0. Aturar script Python si està en execució
            if (window.app && window.app.isRunning) {
                console.log('⏹ Aturant script Python abans d\'importar...');
                window.app.stopScript();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log('🔄 Important projecte des de URL:', url);

            // 1. Extreure nom del fitxer per mostrar-lo al toast de càrrega
            const filename = url.split('/').pop() || 'projecte.zip';
            window.showToast(window.t('dialog.import.url_loading').replace('{filename}', filename), 'info');

            // 2. Fetch del .zip
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();

            // 3. Llegir i validar .zip
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip no està disponible.');
            }

            const zip = new JSZip();
            const zipContent = await zip.loadAsync(arrayBuffer);

            // 4. Validar fitxers necessaris
            if (!zipContent.files['project.json']) {
                throw new Error(window.t('dialog.import.error_no_project_json'));
            }
            if (!zipContent.files['iotv_config.json']) {
                throw new Error(window.t('dialog.import.error_no_iotv_config'));
            }

            // 5. Llegir i parsejar fitxers
            const projectJsonText = await zipContent.files['project.json'].async('text');
            const projectInfo = JSON.parse(projectJsonText);

            const iotvConfigText = await zipContent.files['iotv_config.json'].async('text');
            const iotvConfig = JSON.parse(iotvConfigText);

            let othersConfig = [];
            if (zipContent.files['others_config.json']) {
                const othersText = await zipContent.files['others_config.json'].async('text');
                othersConfig = JSON.parse(othersText);
            }

            let twinsConfig = [];
            if (zipContent.files['twins_config.json']) {
                const twinsText = await zipContent.files['twins_config.json'].async('text');
                twinsConfig = JSON.parse(twinsText);
            }

            let twinsAssets = {};
            const twinsFiles = Object.keys(zipContent.files).filter(f => f.startsWith('twins/') && !f.endsWith('/'));
            for (const filePath of twinsFiles) {
                const filename = filePath.replace('twins/', '');
                const ext = filename.split('.').pop().toLowerCase();
                if (['html', 'htm', 'js', 'css', 'svg'].includes(ext)) {
                    twinsAssets[filename] = await zipContent.files[filePath].async('text');
                } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                    const arrayBuf = await zipContent.files[filePath].async('arraybuffer');
                    const bytes = new Uint8Array(arrayBuf);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                    const mimeMap = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp' };
                    twinsAssets[filename] = `data:${mimeMap[ext] || 'image/png'};base64,${btoa(binary)}`;
                }
            }

            let pythonScript = '';
            if (zipContent.files['script.py']) {
                pythonScript = await zipContent.files['script.py'].async('text');
            }

            let consoleScript = '';
            if (zipContent.files['console_script.py']) {
                consoleScript = await zipContent.files['console_script.py'].async('text');
            }

            // sch.png (esquema de connexió, opcional)
            let schematicImage = null;
            if (zipContent.files['sch.png']) {
                try {
                    const arrayBuf = await zipContent.files['sch.png'].async('arraybuffer');
                    const bytes = new Uint8Array(arrayBuf);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                    schematicImage = `data:image/png;base64,${btoa(binary)}`;
                    console.log('✓ Esquema de connexió (sch.png) carregat');
                } catch (e) {
                    console.warn('⚠ Error carregant sch.png:', e);
                }
            }

            // 6. Validar configuracions
            const iotvValidation = this.validateIotvConfig(iotvConfig);
            if (!iotvValidation.valid) {
                throw new Error(window.t('dialog.import.error_invalid_iotv_config') + ': ' + iotvValidation.error);
            }

            const othersValidation = this.validateOthersConfig(othersConfig);
            if (!othersValidation.valid) {
                throw new Error(window.t('dialog.import.error_invalid_others_config') + ': ' + othersValidation.error);
            }

            // 7. Si cal diàleg de confirmació (mode 'open')
            if (!skipDialog) {
                // Generar estadístiques
                const stats = this.generateProjectStats(iotvValidation.config, othersValidation.config, pythonScript);

                // Construir warnings
                const warnings = [];
                if (projectInfo.iotv_version !== '2.0') {
                    warnings.push(window.t('dialog.import.version_warning').replace('{version}', projectInfo.iotv_version));
                }
                // Avís d'origen URL extern
                try {
                    const urlHost = new URL(url).host;
                    warnings.push(window.t('dialog.import.url_source_warning').replace('{host}', urlHost));
                } catch (e) {
                    warnings.push(window.t('dialog.import.url_source_warning').replace('{host}', url));
                }

                // Mostrar preview dialog
                const confirmed = await window.ProjectDialogs.showImportPreviewDialog({
                    projectInfo: projectInfo,
                    stats: stats,
                    warnings: warnings
                });

                if (!confirmed) {
                    console.log('Importació des de URL cancel·lada per l\'usuari');
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                    return;
                }
            }

            // 8. Aplicar la importació
            await this.applyImport(projectInfo, iotvValidation.config, othersValidation.config, pythonScript, twinsConfig, twinsAssets, consoleScript, schematicImage);

            // 9. Notificació d'èxit
            window.showToast(window.t('dialog.import.success') + ' ' + projectInfo.name, 'success');

            if (window.app && window.app.updateProjectNameDisplay) {
                window.app.updateProjectNameDisplay(projectInfo.name);
            }

            // 10. Netejar el hash per evitar re-importació al recarregar
            history.replaceState(null, '', window.location.pathname + window.location.search);

            // 11. Auto-executar script si mode 'run'
            if (autoRun && window.app && window.app.runScript) {
                console.log('[importFromUrl] Mode run: executant script Python...');
                // Delay per assegurar que l'editor ha carregat el codi
                await new Promise(resolve => setTimeout(resolve, 300));
                window.app.runScript();
            }

            console.log('✅ Projecte importat correctament des de URL');

        } catch (error) {
            console.error('❌ Error important projecte des de URL:', error);
            window.showToast(window.t('dialog.import.url_error') + ': ' + error.message, 'error');
            // Netejar el hash també en cas d'error
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    /**
     * Seleccionar fitxer .zip
     */
    selectZipFile() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                resolve(file);
            };
            
            input.oncancel = () => {
                resolve(null);
            };
            
            input.click();
        });
    }

    /**
     * Generar estadístiques del projecte
     */
    generateProjectStats(iotvConfig, othersConfig, pythonScript) {
        const stats = {
            iotv: {
                digital: [],
                analog: []
            },
            others: [],
            python: {
                lines: pythonScript ? pythonScript.split('\n').length : 0,
                empty: !pythonScript || pythonScript.trim() === ''
            }
        };
        
        // Analitzar vèrtebres
        if (iotvConfig && iotvConfig.vertebrae) {
            for (const v of iotvConfig.vertebrae) {
                const info = {
                    addr: v.addr,
                    costellaA: v.costellaA,
                    costellaB: v.costellaB
                };
                
                if (v.type === 'digital') {
                    stats.iotv.digital.push(info);
                } else if (v.type === 'analog') {
                    stats.iotv.analog.push(info);
                }
            }
        }
        
        // Analitzar altres bessons
        if (othersConfig && Array.isArray(othersConfig)) {
            stats.others = othersConfig.map(b => ({
                type: b.type || 'unknown',
                id: b.id || 'unknown'
            }));
        }
        
        return stats;
    }

    /**
     * Aplicar importació (carregar configuracions)
     */
    async applyImport(projectInfo, iotvConfig, othersConfig, pythonScript, twinsConfig, twinsAssets, consoleScript, schematicImage = null) {
        try {
            // 0. Tancar finestra BessoConfigEditor si està oberta (per forçar re-lectura al reobrir)
            if (window.BessoConfigEditor && window.BessoConfigEditor.window) {
                const WM = window.windowManager || window.WindowManager;
                if (WM) {
                    WM.closeWindow('besso-config-editor');
                }
                window.BessoConfigEditor._closeWindow();
            }

            // 0b. Aplicar llengua del projecte (si n'hi ha)
            const projectLanguage = projectInfo.language;
            if (projectLanguage) {
                this.applyProjectUIState(projectLanguage, null);
            }

            // 1. Actualitzar metadades del projecte
            this.currentProjectInfo = {
                ...projectInfo,
                exported: null // Reset export date
            };
            
            // 2. Carregar configuració IoT-Vertebrae
            if (window.VertebraeConfig && window.VertebraeConfig.loadCustom) {
                window.VertebraeConfig.loadCustom(iotvConfig);
            } else {
                window.VertebraeConfig.current = iotvConfig;
            }
            
            // 3. Reinicialitzar PLCMemory amb nova configuració
            if (window.PLCMemory && window.PLCMemory.reinitialize) {
                window.PLCMemory.reinitialize(iotvConfig);
            }
            
            // 3b. Carregar catàleg de bessons (twins_config.json, s9a)
            if (twinsConfig && twinsConfig.length > 0 && window.TwinsConfigManager) {
                window.TwinsConfigManager.load(twinsConfig);
                console.log(`✓ Catàleg bessons carregat: ${twinsConfig.length} definicions`);
                const twinsTextarea = document.getElementById('twins-config-textarea');
                if (twinsTextarea) {
                    twinsTextarea.value = JSON.stringify(twinsConfig, null, 2);
                }
            }
            
            // 3c. Carregar assets de bessons (HTML overlays + imatges)
            if (twinsAssets && Object.keys(twinsAssets).length > 0) {
                window._twinsAssets = twinsAssets;
            } else {
                window._twinsAssets = {};
            }
            
            // 3d. Esquema de connexió (sch.png)
            window._schematicImage = schematicImage;
            
            // 4. Carregar configuració Altres Bessons
		// Actualitzar textarea de configuració bessons
		const bessoTextarea = document.getElementById('besso-config-textarea');
		if (bessoTextarea) {
		    bessoTextarea.value = JSON.stringify(othersConfig, null, 2);
		}
		// Recarregar bessons
		if (window.updateIoCabling) {
		    window.updateIoCabling(othersConfig);
		}
		if (window.BessoManager && window.BessoManager.reloadFromConfig) {
		    window.BessoManager.reloadFromConfig();
		}
		// Carregar (obrir finestres) de tots els bessons
		if (window.BessoManager && othersConfig && othersConfig.length > 0) {
		    // Petit delay per assegurar que la configuració s'ha aplicat
		    setTimeout(() => {
			othersConfig.forEach((config, index) => {
			    setTimeout(() => {
				try {
				    window.BessoManager.load(config.name);
				    console.log(`✓ Bessó carregat: ${config.name}`);
				} catch (error) {
				    console.error(`Error carregant ${config.name}:`, error);
				}
			    }, index * 100); // 100ms entre cada bessó per evitar sobrecàrrega
			});
		    }, 200);
		}		
			    
            // 5. Carregar script Python
            if (window.app && window.app.scriptEditor && window.app.scriptEditor.setCode) {
                window.app.scriptEditor.setCode(pythonScript);
            } else if (window.scriptEditor && window.scriptEditor.setCode) {
                window.scriptEditor.setCode(pythonScript);
            } else if (window.scriptEditor && window.scriptEditor.setValue) {
                window.scriptEditor.setValue(pythonScript);
            } else {
                console.warn('[ProjectManager] No s\'ha pogut establir l\'script Python');
            }
            
            // 5b. Carregar script Consola Python
            if (consoleScript && consoleScript.trim() !== '') {
                if (window.app && window.app.pythonConsole && window.app.pythonConsole.setCode) {
                    window.app.pythonConsole.setCode(consoleScript);
                    console.log('✓ Console script carregat');
                }
            } else {
                // Netejar si no hi ha script de consola
                if (window.app && window.app.pythonConsole && window.app.pythonConsole.clear) {
                    window.app.pythonConsole.clear();
                }
            }
            
            // 6. Actualitzar UI
            // Refrescar canvas bessó digital
		if (window.app && window.app.canvasTwin && window.app.canvasTwin.setVertebraeConfig) {
		    window.app.canvasTwin.setVertebraeConfig(iotvConfig);
		}
            
            // Refrescar altres bessons
            // if (window.BessoManager && window.BessoManager.refreshAll) {
            //     window.BessoManager.refreshAll();
            // }
            
            // 7. Restaurar estat de finestres (posició, mida, zOrder)
            // Ha d'executar-se després que els bessons s'hagin carregat (amb els seus setTimeout)
            const windowsState = projectInfo.windowsState;
            if (windowsState && Array.isArray(windowsState) && windowsState.length > 0) {
                // Calcular el delay necessari: 200ms base + 100ms * nombre de bessons + 300ms marge
                const numBessons = (othersConfig && othersConfig.length) || 0;
                const delayMs = 200 + (numBessons * 100) + 300;
                
                setTimeout(() => {
                    this.applyProjectUIState(null, windowsState);
                }, delayMs);
            }
            
            // 8. Desar a localStorage si autoguardar està activat
            if (window.autosaveManager && window.autosaveManager.isEnabled()) {
                window.autosaveManager.saveNow();
            }
            
        } catch (error) {
            console.error('Error aplicant importació:', error);
            throw error;
        }
    }

    /**
     * Crear nou projecte
     */
    async newProject() {
        try {
            // 1. Mostrar warning de confirmació
            const confirmed = await window.ProjectDialogs.showNewProjectWarningDialog();
            if (!confirmed) {
                console.log('Creació de nou projecte cancel·lada');
                return;
            }
            
            // 2. Mostrar dialog per metadades del nou projecte
            const projectInfo = await window.ProjectDialogs.showProjectInfoDialog({
                title: window.t('dialog.project_info.title_new'),
                currentInfo: this.getDefaultProjectInfo(),
                warnings: [],
                buttonText: window.t('dialog.project_info.create')
            });
            
            if (!projectInfo) {
                console.log('Creació de nou projecte cancel·lada');
                return;
            }
            
            // Validar nom
            if (!projectInfo.name || projectInfo.name.trim() === '') {
                throw new Error(window.t('dialog.export.error_name_empty'));
            }
            
            // 3. Netejar tot
            await this.clearAll();
            
            // 4. Crear projecte amb metadades
            this.currentProjectInfo = {
                ...projectInfo,
                iotv_version: '2.0',
                created: new Date().toISOString(),
                exported: null
            };
            
            // 5. Desar a localStorage si autoguardar està activat
            if (window.autosaveManager && window.autosaveManager.isEnabled()) {
                window.autosaveManager.saveNow();
            }
            
            // 6. Notificació d'èxit
            window.showToast(window.t('toast.project_created') + ' ' + projectInfo.name, 'success');
            
            console.log('✅ Nou projecte creat:', projectInfo.name);
            
        } catch (error) {
            console.error('❌ Error creant nou projecte:', error);
            window.showToast('Error: ' + error.message, 'error');
        }
    }

    /**
     * Netejar tot (per nou projecte)
     */
    async clearAll() {
        try {
            // 0. Tancar finestra BessoConfigEditor si està oberta
            if (window.BessoConfigEditor && window.BessoConfigEditor.window) {
                const WM = window.windowManager || window.WindowManager;
                if (WM) {
                    WM.closeWindow('besso-config-editor');
                }
                window.BessoConfigEditor._closeWindow();
            }

            // 1. Reset VertebraeConfig al preset bàsic via loadPreset (mètode oficial)
            let basicConfig = null;
            if (window.VertebraeConfig) {
                if (window.VertebraeConfig.loadPreset) {
                    basicConfig = window.VertebraeConfig.loadPreset('basic');
                } else if (window.VertebraeConfig.PRESETS) {
                    // Fallback: assignació directa si no hi ha loadPreset
                    window.VertebraeConfig.current = JSON.parse(JSON.stringify(window.VertebraeConfig.PRESETS.basic));
                    basicConfig = window.VertebraeConfig.current;
                }
            }
            // Fallback garantit: si basicConfig és null, forçar config mínima
            if (!basicConfig) {
                basicConfig = window.VertebraeConfig && window.VertebraeConfig.current;
            }
            
            // 2. Reset i reinitialize PLCMemory amb la nova config bàsica
            if (window.PLCMemory) {
                if (window.PLCMemory.reinitialize && basicConfig) {
                    window.PLCMemory.reinitialize(basicConfig);
                } else if (window.PLCMemory.reset) {
                    window.PLCMemory.reset();
                }
            }
            
            // 3. Netejar Altres Bessons
            if (window.BessoManager && window.BessoManager.clearAll) {
                window.BessoManager.clearAll();
            }
            
            // 4. Netejar Editor Python
            if (window.app && window.app.scriptEditor && window.app.scriptEditor.clear) {
                window.app.scriptEditor.clear();
            } else if (window.scriptEditor && window.scriptEditor.clear) {
                window.scriptEditor.clear();
            }
            
            // 4b. Netejar Consola Python
            if (window.app && window.app.pythonConsole && window.app.pythonConsole.clear) {
                window.app.pythonConsole.clear();
            }
            
            // 5. Reconstruir canvas amb la configuració bàsica.
            //    Estratègia: primer intentem setVertebraeConfig (eficient),
            //    si no funciona o canvasTwin no existeix, recreem el component complet.
            if (basicConfig) {
                const ct = window.app && window.app.canvasTwin;
                if (ct && ct.setVertebraeConfig) {
                    // Cas normal: reconstruir les plaques amb la config bàsica
                    ct.setVertebraeConfig(basicConfig);
                } else if (window.app && window.app.switchTwinView) {
                    // Fallback: recrear completament el CanvasTwin
                    // (VertebraeConfig.current ja és 'basic' del pas 1, el constructor l'agafarà)
                    const currentMode = window.app.twinViewMode || 'canvas';
                    window.app.twinViewMode = null; // Reset per forçar re-creació
                    window.app.switchTwinView(currentMode);
                    // Assegurar que el nou canvasTwin rep la config explícitament
                    if (window.app.canvasTwin && window.app.canvasTwin.setVertebraeConfig) {
                        window.app.canvasTwin.setVertebraeConfig(basicConfig);
                    }
                }
            }

            // 6. Tancar totes les finestres de bessons obertes (excepte el config editor)
            if (window.windowManager) {
                const WM = window.windowManager;
                if (window.BessoManager && window.BessoManager.getOpenWindows) {
                    const openWins = window.BessoManager.getOpenWindows();
                    openWins.forEach(winId => WM.closeWindow(winId));
                } else {
                    // Fallback: tancar finestres amb prefix 'besso-' (excloent config editor)
                    document.querySelectorAll('.window[id^="besso-"]').forEach(win => {
                        if (win.id !== 'besso-config-editor') {
                            WM.closeWindow(win.id);
                        }
                    });
                }
            }

            // 7. Buidar pestanyes "Configura Bessons" i "Connexió Bessons"
            const twinsTextarea = document.getElementById('twins-config-textarea');
            if (twinsTextarea) twinsTextarea.value = '[]';
            const bessoTextarea = document.getElementById('besso-config-textarea');
            if (bessoTextarea) bessoTextarea.value = '[]';
            window._twinsAssets = {};
            window._schematicImage = null;

        } catch (error) {
            console.error('Error netejant projecte:', error);
            throw error;
        }
    }

    /**
     * Editar informació del projecte
     */
    async editProjectInfo() {
        try {
            const projectInfo = await window.ProjectDialogs.showProjectInfoDialog({
                title: window.t('dialog.project_info.title'),
                currentInfo: this.currentProjectInfo,
                warnings: [],
                buttonText: window.t('dialog.project_info.save')
            });
            
            if (!projectInfo) {
                console.log('Edició cancel·lada');
                return;
            }
            
            // Actualitzar metadades
            this.setProjectInfo(projectInfo);
            
            // Notificació
            window.showToast(window.t('toast.project_info_saved'), 'success');
            
        } catch (error) {
            console.error('Error editant informació del projecte:', error);
            window.showToast('Error: ' + error.message, 'error');
        }
    }
}

// Exportar globalment
window.ProjectManager = ProjectManager;
