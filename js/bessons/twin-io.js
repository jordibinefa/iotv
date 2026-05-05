/**
 * TwinIO - Import/Export de bessons individuals
 * 
 * Exporta bessons com a _twin.zip (twin.json + twins/ overlay assets)
 * Importa bessons _twin.zip o paquets twinpackage.zip
 * Integra els bessons importats al catàleg (twins_config.json)
 */

class TwinIO {
    constructor() {
        this._dialogWindow = null;
    }

    // =========================================
    // EXPORTACIÓ
    // =========================================

    /**
     * Iniciar procés d'exportació
     * Mostra diàleg si hi ha >1 bessó, o exporta directament si n'hi ha 1
     */
    exportTwin() {
        const t = window.t || (k => k);
        const twins = this._getCurrentTwins();

        if (!twins || twins.length === 0) {
            window.showToast(t('twinio.export.no_twins'), 'warning');
            return;
        }

        // Mostrar diàleg d'exportació
        this._showExportDialog(twins);
    }

    /**
     * Obtenir bessons actuals del catàleg (twins_config.json)
     */
    _getCurrentTwins() {
        if (window.TwinsConfigManager) {
            return window.TwinsConfigManager.export() || [];
        }
        // Fallback: llegir del CM editor si existeix
        if (window.BessoConfigEditor && window.BessoConfigEditor._twinsCM) {
            try {
                return JSON.parse(window.BessoConfigEditor._twinsCM.getValue());
            } catch (e) { /* ignore */ }
        }
        return [];
    }

    /**
     * Mostrar diàleg d'exportació amb checkboxes i noms editables
     */
    _showExportDialog(twins) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        // Tancar diàleg anterior si existeix
        if (this._dialogWindow) {
            WM.closeWindow('twin-io-dialog');
        }

        const singleTwin = twins.length === 1;

        this._dialogWindow = WM.createWindow({
            id: 'twin-io-dialog',
            title: t('twinio.export.title'),
            x: Math.max(50, (window.innerWidth - 520) / 2),
            y: Math.max(50, (window.innerHeight - 450) / 2),
            width: 520,
            height: singleTwin ? 250 : Math.min(450, 200 + twins.length * 50),
            minWidth: 400,
            minHeight: 200,
            onClose: () => { this._dialogWindow = null; }
        });

        const container = this._dialogWindow.contentElement || this._dialogWindow.content || this._dialogWindow.body;
        if (!container) return;

        container.style.cssText = `
            display: flex; flex-direction: column; height: 100%;
            background: #1e1e1e; color: #ecf0f1; font-family: 'Segoe UI', Arial, sans-serif;
            padding: 15px; box-sizing: border-box;
        `;

        let twinListHtml = '';
        twins.forEach((tw, i) => {
            const twinId = tw.twinId || `twin-${i}`;
            const name = tw.meta?.name || twinId;
            twinListHtml += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; 
                            background: #2c3e50; border-radius: 6px; margin-bottom: 6px;">
                    <input type="checkbox" id="twin-exp-chk-${i}" checked 
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                        <span style="font-size: 11px; color: #95a5a6;">${twinId}</span>
                        <input type="text" id="twin-exp-name-${i}" value="${this._sanitizeName(twinId)}"
                               data-twin-id="${twinId}"
                               style="background: #34495e; border: 1px solid #4a6a8a; color: #ecf0f1;
                                      padding: 4px 8px; border-radius: 4px; font-size: 13px; width: 100%;">
                    </div>
                </div>
            `;
        });

        const packageNameSection = !singleTwin ? `
            <div style="margin-top: 10px; padding: 10px; background: #2c3e50; border-radius: 6px;">
                <label style="font-size: 12px; color: #95a5a6; display: block; margin-bottom: 4px;">
                    ${t('twinio.export.package_name')}
                </label>
                <input type="text" id="twin-exp-package-name" value="twinpackage"
                       style="background: #34495e; border: 1px solid #4a6a8a; color: #ecf0f1;
                              padding: 6px 10px; border-radius: 4px; font-size: 13px; width: 100%; box-sizing: border-box;">
            </div>
        ` : '';

        container.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 13px; color: #bdc3c7;">
                ${t('twinio.export.description')}
            </div>
            <div style="flex: 1; overflow-y: auto; margin-bottom: 10px;">
                ${twinListHtml}
            </div>
            ${packageNameSection}
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
                <button id="twin-exp-cancel" style="
                    padding: 8px 20px; background: #7f8c8d; color: white; border: none;
                    border-radius: 6px; cursor: pointer; font-size: 13px;">
                    ${t('twinio.cancel')}
                </button>
                <button id="twin-exp-confirm" style="
                    padding: 8px 20px; background: #27ae60; color: white; border: none;
                    border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    ${t('twinio.export.confirm')}
                </button>
            </div>
        `;

        // Events
        container.querySelector('#twin-exp-cancel').addEventListener('click', () => {
            WM.closeWindow('twin-io-dialog');
            this._dialogWindow = null;
        });

        container.querySelector('#twin-exp-confirm').addEventListener('click', () => {
            this._doExport(twins);
        });
    }

    /**
     * Executar l'exportació
     */
    async _doExport(twins) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;

        if (typeof JSZip === 'undefined') {
            window.showToast('JSZip not available', 'error');
            return;
        }

        // Recopilar selecció
        const selected = [];
        twins.forEach((tw, i) => {
            const chk = document.getElementById(`twin-exp-chk-${i}`);
            const nameInput = document.getElementById(`twin-exp-name-${i}`);
            if (chk && chk.checked) {
                selected.push({
                    twin: tw,
                    exportName: this._sanitizeName(nameInput ? nameInput.value : tw.twinId)
                });
            }
        });

        if (selected.length === 0) {
            window.showToast(t('twinio.export.none_selected'), 'warning');
            return;
        }

        try {
            // Crear zip individual per cada bessó
            const twinZips = [];
            for (const item of selected) {
                const twinZip = await this._createTwinZip(item.twin, item.exportName);
                twinZips.push({ name: item.exportName + '_twin.zip', blob: twinZip });
            }

            if (selected.length === 1) {
                // Descarregar directament
                this._downloadBlob(twinZips[0].blob, twinZips[0].name);
            } else {
                // Crear twinpackage.zip
                const packageNameInput = document.getElementById('twin-exp-package-name');
                const packageName = this._sanitizeName(
                    packageNameInput ? packageNameInput.value : 'twinpackage'
                );
                const packageZip = new JSZip();
                for (const tz of twinZips) {
                    packageZip.file(tz.name, tz.blob);
                }
                const packageBlob = await packageZip.generateAsync({ type: 'blob' });
                this._downloadBlob(packageBlob, packageName + '.zip');
            }

            window.showToast(t('twinio.export.success'), 'success');
        } catch (err) {
            console.error('[TwinIO] Export error:', err);
            window.showToast(t('twinio.export.error') + ': ' + err.message, 'error');
        }

        // Tancar diàleg
        if (WM) {
            WM.closeWindow('twin-io-dialog');
            this._dialogWindow = null;
        }
    }

    /**
     * Crear un _twin.zip per a un bessó individual
     */
    async _createTwinZip(twin, exportName) {
        const zip = new JSZip();

        // twin.json — la definició del bessó (un objecte)
        zip.file('twin.json', JSON.stringify(twin, null, 2));

        // twins/ folder — assets HTML overlay
        if (twin.overlay && twin.overlay.html && window._twinsAssets) {
            const htmlFile = twin.overlay.html;
            if (window._twinsAssets[htmlFile]) {
                const content = window._twinsAssets[htmlFile];
                if (content.startsWith('data:')) {
                    const parts = content.split(',');
                    const binary = atob(parts[1]);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    zip.file(`twins/${htmlFile}`, bytes);
                } else {
                    zip.file(`twins/${htmlFile}`, content);
                }
            }
        }

        // twins/ folder — foto del bessó
        if (twin.photo && window._twinsAssets) {
            const photoFile = twin.photo;
            if (window._twinsAssets[photoFile]) {
                const content = window._twinsAssets[photoFile];
                if (content.startsWith('data:')) {
                    const parts = content.split(',');
                    const binary = atob(parts[1]);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    zip.file(`twins/${photoFile}`, bytes);
                } else {
                    zip.file(`twins/${photoFile}`, content);
                }
            }
        }

        return await zip.generateAsync({ type: 'blob' });
    }

    // =========================================
    // IMPORTACIÓ
    // =========================================

    /**
     * Iniciar procés d'importació
     * Obre diàleg de selecció d'arxius (_twin.zip o twinpackage.zip)
     */
    importTwin() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.multiple = true;
        input.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            await this._processImportFiles(files);
        });
        input.click();
    }

    /**
     * Processar fitxers seleccionats per importar
     */
    async _processImportFiles(files) {
        const t = window.t || (k => k);

        if (typeof JSZip === 'undefined') {
            window.showToast('JSZip not available', 'error');
            return;
        }

        try {
            const twinsToImport = [];

            for (const file of files) {
                const zip = await JSZip.loadAsync(file);

                // Comprovar si és un _twin.zip individual (conté twin.json)
                if (zip.files['twin.json']) {
                    const twinData = await this._extractTwinFromZip(zip, file.name);
                    if (twinData) twinsToImport.push(twinData);
                } else {
                    // Pot ser un twinpackage.zip (conté múltiples _twin.zip)
                    const innerZips = Object.keys(zip.files).filter(f => f.endsWith('_twin.zip'));
                    if (innerZips.length > 0) {
                        for (const innerName of innerZips) {
                            const innerBlob = await zip.files[innerName].async('blob');
                            const innerZip = await JSZip.loadAsync(innerBlob);
                            if (innerZip.files['twin.json']) {
                                const twinData = await this._extractTwinFromZip(innerZip, innerName);
                                if (twinData) twinsToImport.push(twinData);
                            }
                        }
                    } else {
                        window.showToast(t('twinio.import.invalid_file', { name: file.name }), 'warning');
                    }
                }
            }

            if (twinsToImport.length === 0) {
                window.showToast(t('twinio.import.no_twins_found'), 'warning');
                return;
            }

            // Mostrar diàleg d'importació
            this._showImportDialog(twinsToImport);

        } catch (err) {
            console.error('[TwinIO] Import error:', err);
            window.showToast(t('twinio.import.error') + ': ' + err.message, 'error');
        }
    }

    /**
     * Extreure un bessó d'un zip
     */
    async _extractTwinFromZip(zip, sourceName) {
        try {
            const twinText = await zip.files['twin.json'].async('text');
            const twin = JSON.parse(twinText);

            // Extreure assets de twins/
            const assets = {};
            const twinsFiles = Object.keys(zip.files).filter(f => f.startsWith('twins/') && !f.endsWith('/'));
            for (const filePath of twinsFiles) {
                const filename = filePath.replace('twins/', '');
                const ext = filename.split('.').pop().toLowerCase();
                if (['html', 'htm', 'js', 'css', 'svg'].includes(ext)) {
                    assets[filename] = await zip.files[filePath].async('text');
                } else {
                    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
                    const binary = await zip.files[filePath].async('binarystring');
                    assets[filename] = `data:${mimeMap[ext] || 'image/png'};base64,${btoa(binary)}`;
                }
            }

            return { twin, assets, sourceName };
        } catch (err) {
            console.error(`[TwinIO] Error parsing ${sourceName}:`, err);
            return null;
        }
    }

    /**
     * Mostrar diàleg d'importació amb noms editables
     */
    _showImportDialog(twinsToImport) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        if (this._dialogWindow) {
            WM.closeWindow('twin-io-dialog');
        }

        const singleTwin = twinsToImport.length === 1;

        this._dialogWindow = WM.createWindow({
            id: 'twin-io-dialog',
            title: t('twinio.import.title'),
            x: Math.max(50, (window.innerWidth - 520) / 2),
            y: Math.max(50, (window.innerHeight - 450) / 2),
            width: 520,
            height: singleTwin ? 250 : Math.min(450, 200 + twinsToImport.length * 55),
            minWidth: 400,
            minHeight: 200,
            onClose: () => { this._dialogWindow = null; }
        });

        const container = this._dialogWindow.contentElement || this._dialogWindow.content || this._dialogWindow.body;
        if (!container) return;

        container.style.cssText = `
            display: flex; flex-direction: column; height: 100%;
            background: #1e1e1e; color: #ecf0f1; font-family: 'Segoe UI', Arial, sans-serif;
            padding: 15px; box-sizing: border-box;
        `;

        // Comprovar conflictes amb twins existents
        const existingTwins = this._getCurrentTwins();
        const existingIds = new Set(existingTwins.map(tw => tw.twinId));

        let twinListHtml = '';
        twinsToImport.forEach((item, i) => {
            const twinId = item.twin.twinId || `imported-${i}`;
            const name = item.twin.meta?.name || twinId;
            const hasConflict = existingIds.has(twinId);
            const conflictBadge = hasConflict ? 
                `<span style="background: #e74c3c; color: white; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 6px;">${t('twinio.import.conflict')}</span>` : '';

            twinListHtml += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px;
                            background: ${hasConflict ? '#3d2020' : '#2c3e50'}; border-radius: 6px; margin-bottom: 6px;
                            border: 1px solid ${hasConflict ? '#e74c3c44' : 'transparent'};">
                    <input type="checkbox" id="twin-imp-chk-${i}" checked
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 11px; color: #95a5a6;">${name}${conflictBadge}</span>
                        </div>
                        <input type="text" id="twin-imp-name-${i}" value="${twinId}"
                               style="background: #34495e; border: 1px solid ${hasConflict ? '#e74c3c88' : '#4a6a8a'}; color: #ecf0f1;
                                      padding: 4px 8px; border-radius: 4px; font-size: 13px; width: 100%;">
                        ${hasConflict ? `
                            <div style="display: flex; gap: 8px; margin-top: 4px; font-size: 11px;">
                                <label style="color: #e67e22; cursor: pointer;">
                                    <input type="radio" name="twin-imp-conflict-${i}" value="overwrite" checked
                                           style="margin-right: 3px;"> ${t('twinio.import.overwrite')}
                                </label>
                                <label style="color: #2ecc71; cursor: pointer;">
                                    <input type="radio" name="twin-imp-conflict-${i}" value="skip"
                                           style="margin-right: 3px;"> ${t('twinio.import.keep_existing')}
                                </label>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 13px; color: #bdc3c7;">
                ${t('twinio.import.description')}
            </div>
            <div style="flex: 1; overflow-y: auto; margin-bottom: 10px;">
                ${twinListHtml}
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
                <button id="twin-imp-cancel" style="
                    padding: 8px 20px; background: #7f8c8d; color: white; border: none;
                    border-radius: 6px; cursor: pointer; font-size: 13px;">
                    ${t('twinio.cancel')}
                </button>
                <button id="twin-imp-confirm" style="
                    padding: 8px 20px; background: #3498db; color: white; border: none;
                    border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    ${t('twinio.import.confirm')}
                </button>
            </div>
        `;

        container.querySelector('#twin-imp-cancel').addEventListener('click', () => {
            WM.closeWindow('twin-io-dialog');
            this._dialogWindow = null;
        });

        container.querySelector('#twin-imp-confirm').addEventListener('click', () => {
            this._doImport(twinsToImport, existingIds);
        });
    }

    /**
     * Executar la importació
     */
    _doImport(twinsToImport, existingIds) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;

        const currentTwins = this._getCurrentTwins();
        let importedCount = 0;

        // Preparar mapa d'assets actual
        if (!window._twinsAssets) {
            window._twinsAssets = {};
        }

        twinsToImport.forEach((item, i) => {
            const chk = document.getElementById(`twin-imp-chk-${i}`);
            if (!chk || !chk.checked) return;

            const nameInput = document.getElementById(`twin-imp-name-${i}`);
            const newTwinId = nameInput ? nameInput.value.trim() : item.twin.twinId;
            
            // Comprovar conflicte
            const originalId = item.twin.twinId;
            const hasConflict = existingIds.has(newTwinId);

            if (hasConflict) {
                const conflictRadio = document.querySelector(`input[name="twin-imp-conflict-${i}"]:checked`);
                const action = conflictRadio ? conflictRadio.value : 'overwrite';
                
                if (action === 'skip') return; // Mantenir existent

                // Sobreescriure: eliminar l'antic
                const idx = currentTwins.findIndex(tw => tw.twinId === newTwinId);
                if (idx !== -1) {
                    currentTwins.splice(idx, 1);
                }
            }

            // Actualitzar twinId si l'usuari l'ha canviat
            const twinCopy = JSON.parse(JSON.stringify(item.twin));
            twinCopy.twinId = newTwinId;

            currentTwins.push(twinCopy);

            // Carregar assets
            if (item.assets) {
                Object.entries(item.assets).forEach(([filename, content]) => {
                    window._twinsAssets[filename] = content;
                });
            }

            importedCount++;
        });

        // Actualitzar TwinsConfigManager
        if (window.TwinsConfigManager) {
            window.TwinsConfigManager.load(currentTwins);
        }

        // Actualitzar editor CM si està obert
        if (window.BessoConfigEditor && window.BessoConfigEditor._twinsCM) {
            window.BessoConfigEditor._twinsCM.setValue(JSON.stringify(currentTwins, null, 2));
        }

        window.showToast(t('twinio.import.success', { count: importedCount }), 'success');

        // Tancar diàleg
        if (WM) {
            WM.closeWindow('twin-io-dialog');
            this._dialogWindow = null;
        }
    }

    // =========================================
    // UTILITATS
    // =========================================

    _sanitizeName(name) {
        return (name || 'twin').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    }

    _downloadBlob(blob, filename) {
        if (typeof saveAs !== 'undefined') {
            saveAs(blob, filename);
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}

// Instància global
if (typeof window !== 'undefined') {
    window.TwinIO = new TwinIO();
}

console.log('✓ TwinIO loaded');
