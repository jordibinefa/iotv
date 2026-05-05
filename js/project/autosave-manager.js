/**
 * AutosaveManager - Gestió d'autoguardat a localStorage
 * 
 * Gestiona:
 * - Autoguardat cada 30 segons
 * - Detecció de canvis
 * - Recuperació automàtica a l'inici
 * - Toggle activar/desactivar
 */

class AutosaveManager {
    constructor() {
        this.enabled = false;
        this.intervalId = null;
        this.lastSavedState = null;
        this.saveInterval = 30000; // 30 segons
        
        // Carregar estat de localStorage
        this.loadEnabledState();
        
        // Si estava activat, iniciar
        if (this.enabled) {
            this.enable();
        }
    }

    /**
     * Carregar estat enabled de localStorage
     */
    loadEnabledState() {
        try {
            const stored = localStorage.getItem('iotv2_autosave_enabled');
            this.enabled = stored === 'true';
        } catch (error) {
            console.error('Error carregant estat autoguardar:', error);
            this.enabled = false;
        }
    }

    /**
     * Desar estat enabled a localStorage
     */
    saveEnabledState() {
        try {
            localStorage.setItem('iotv2_autosave_enabled', this.enabled.toString());
        } catch (error) {
            console.error('Error desant estat autoguardar:', error);
        }
    }

    /**
     * Comprovar si autoguardar està activat
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Activar autoguardar
     */
    enable() {
        if (this.enabled) {
            console.log('⚠️ Autoguardar ja estava activat');
            return;
        }
        
        this.enabled = true;
        this.saveEnabledState();
        
        // Desar immediatament
        this.saveNow();
        
        // Iniciar interval
        this.intervalId = setInterval(() => {
            if (this.hasChanges()) {
                this.saveNow();
            }
        }, this.saveInterval);
        
        // Notificació
        window.showToast(window.t('toast.autosave_enabled'), 'info');
        
        console.log('✅ Autoguardar activat');
    }

    /**
     * Desactivar autoguardar
     */
    disable() {
        if (!this.enabled) {
            console.log('⚠️ Autoguardar ja estava desactivat');
            return;
        }
        
        this.enabled = false;
        this.saveEnabledState();
        
        // Aturar interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Notificació
        window.showToast(window.t('toast.autosave_disabled'), 'info');
        
        console.log('✅ Autoguardar desactivat');
    }

    /**
     * Toggle autoguardar
     */
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    /**
     * Obtenir estat actual del projecte
     */
    getCurrentState() {
        try {
            const state = {
                projectMeta: window.projectManager ? window.projectManager.getProjectInfo() : null,
                iotvConfig: window.projectManager ? window.projectManager.getCurrentIotvConfig() : null,
                othersConfig: window.projectManager ? window.projectManager.getCurrentOthersConfig() : [],
                pythonScript: window.projectManager ? window.projectManager.getCurrentPythonScript() : '',
                consoleScript: window.projectManager ? window.projectManager.getCurrentConsoleScript() : ''
            };
            
            return state;
        } catch (error) {
            console.error('Error obtenint estat actual:', error);
            return null;
        }
    }

    /**
     * Calcular hash simple d'un objecte
     */
    calculateHash(obj) {
        const str = JSON.stringify(obj);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    /**
     * Detectar si hi ha canvis
     */
    hasChanges() {
        try {
            const currentState = this.getCurrentState();
            if (!currentState) return false;
            
            const currentHash = this.calculateHash(currentState);
            
            // Si no hi ha estat previ, sempre hi ha canvis
            if (!this.lastSavedState) {
                return true;
            }
            
            const lastHash = this.calculateHash(this.lastSavedState);
            
            return currentHash !== lastHash;
        } catch (error) {
            console.error('Error detectant canvis:', error);
            return false;
        }
    }

    /**
     * Desar ara mateix
     */
    saveNow() {
        try {
            const state = this.getCurrentState();
            if (!state) {
                console.error('No s\'ha pogut obtenir l\'estat actual');
                return;
            }
            
            // Comprovar si l'estat és massa gran (límit localStorage ~5MB)
            const stateStr = JSON.stringify(state);
            const sizeInBytes = new Blob([stateStr]).size;
            const sizeInMB = sizeInBytes / (1024 * 1024);
            
            if (sizeInMB > 5) {
                console.error('⚠️ El projecte és massa gran per localStorage (>5MB)');
                window.showToast('Error: Projecte massa gran. Exporta a .zip.', 'error');
                this.disable();
                return;
            }
            
            // Desar cada part
            if (state.projectMeta) {
                localStorage.setItem('iotv2_project_meta', JSON.stringify(state.projectMeta));
            }
            
            if (state.iotvConfig) {
                localStorage.setItem('iotv2_project_iotv', JSON.stringify(state.iotvConfig));
            }
            
            if (state.othersConfig) {
                localStorage.setItem('iotv2_project_others', JSON.stringify(state.othersConfig));
            }
            
            if (state.pythonScript !== undefined) {
                localStorage.setItem('iotv2_project_script', state.pythonScript);
            }
            
            if (state.consoleScript !== undefined) {
                localStorage.setItem('iotv2_project_console_script', state.consoleScript);
            }
            
            // Actualitzar últim estat desat
            this.lastSavedState = state;
            
            // Notificació discreta
            window.showToast(window.t('toast.autosave_saved'), 'success', 2000);
            
            console.log('💾 Projecte desat automàticament');
            
        } catch (error) {
            console.error('❌ Error desant projecte:', error);
            
            // Si és un error de quota, desactivar autoguardar
            if (error.name === 'QuotaExceededError') {
                window.showToast('Error: Espai localStorage esgotat. Desactivant autoguardar.', 'error');
                this.disable();
            }
        }
    }

    /**
     * Carregar projecte de localStorage
     */
    load() {
        try {
            // Carregar metadades
            const metaStr = localStorage.getItem('iotv2_project_meta');
            if (!metaStr) {
                console.log('No hi ha projecte desat');
                return false;
            }
            
            const projectMeta = JSON.parse(metaStr);
            
            // Carregar configuracions
            const iotvStr = localStorage.getItem('iotv2_project_iotv');
            const othersStr = localStorage.getItem('iotv2_project_others');
            const pythonScript = localStorage.getItem('iotv2_project_script') || '';
            const consoleScript = localStorage.getItem('iotv2_project_console_script') || '';
            
            const iotvConfig = iotvStr ? JSON.parse(iotvStr) : null;
            const othersConfig = othersStr ? JSON.parse(othersStr) : [];
            
            // Aplicar configuracions
            if (window.projectManager) {
                window.projectManager.applyImport(projectMeta, iotvConfig, othersConfig, pythonScript, undefined, undefined, consoleScript);
            }
            
            // Actualitzar estat desat
            this.lastSavedState = {
                projectMeta,
                iotvConfig,
                othersConfig,
                pythonScript,
                consoleScript
            };
            
            console.log('✅ Projecte carregat de localStorage:', projectMeta.name);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error carregant projecte de localStorage:', error);
            return false;
        }
    }

    /**
     * Netejar localStorage
     */
    clear() {
        try {
            localStorage.removeItem('iotv2_project_meta');
            localStorage.removeItem('iotv2_project_iotv');
            localStorage.removeItem('iotv2_project_others');
            localStorage.removeItem('iotv2_project_script');
            
            this.lastSavedState = null;
            
            console.log('✅ localStorage netejat');
            
        } catch (error) {
            console.error('Error netejant localStorage:', error);
        }
    }
}

// Exportar globalment
window.AutosaveManager = AutosaveManager;
