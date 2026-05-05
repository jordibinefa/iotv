/**
 * ProjectDialogs - Diàlegs per gestió de projectes
 * 
 * Gestiona:
 * - Diàleg d'informació del projecte (nou/editar/exportar)
 * - Diàleg de warning per nou projecte
 * - Diàleg de preview d'importació
 */

const ProjectDialogs = {
    
    /**
     * Mostrar diàleg d'informació del projecte
     * @param {Object} options - Opcions del diàleg
     * @returns {Promise<Object|null>} - Informació del projecte o null si cancel·lat
     */
    showProjectInfoDialog(options = {}) {
        return new Promise((resolve) => {
            const {
                title = window.t('dialog.project_info.title'),
                currentInfo = {},
                warnings = [],
                buttonText = window.t('dialog.project_info.save')
            } = options;
            
            // Crear overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 30000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Crear diàleg
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2c3e50;
                color: #ecf0f1;
                padding: 25px;
                border-radius: 8px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                font-family: 'Segoe UI', Arial, sans-serif;
            `;
            
            // Warnings HTML
            let warningsHtml = '';
            if (warnings.length > 0) {
                warningsHtml = `
                    <div style="background: #f39c12; color: #000; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                        ${warnings.map(w => `<div>⚠️ ${w}</div>`).join('')}
                    </div>
                `;
            }
            
            dialog.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #3498db; font-size: 22px;">
                    ${title}
                </h2>
                
                ${warningsHtml}
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                        ${window.t('dialog.project_info.name_required')}
                    </label>
                    <input 
                        type="text" 
                        id="project-name" 
                        value="${currentInfo.name || ''}"
                        maxlength="50"
                        style="
                            width: 100%;
                            padding: 10px;
                            background: #34495e;
                            color: #ecf0f1;
                            border: 1px solid #475869;
                            border-radius: 4px;
                            font-size: 14px;
                            box-sizing: border-box;
                        "
                    />
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                        ${window.t('dialog.project_info.version')}
                    </label>
                    <input 
                        type="text" 
                        id="project-version" 
                        value="${currentInfo.version || '1.0'}"
                        style="
                            width: 100%;
                            padding: 10px;
                            background: #34495e;
                            color: #ecf0f1;
                            border: 1px solid #475869;
                            border-radius: 4px;
                            font-size: 14px;
                            box-sizing: border-box;
                        "
                    />
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                        ${window.t('dialog.project_info.author')}
                    </label>
                    <input 
                        type="text" 
                        id="project-author" 
                        value="${currentInfo.author || ''}"
                        style="
                            width: 100%;
                            padding: 10px;
                            background: #34495e;
                            color: #ecf0f1;
                            border: 1px solid #475869;
                            border-radius: 4px;
                            font-size: 14px;
                            box-sizing: border-box;
                        "
                    />
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                        ${window.t('dialog.project_info.description')}
                    </label>
                    <textarea 
                        id="project-description" 
                        rows="4"
                        style="
                            width: 100%;
                            padding: 10px;
                            background: #34495e;
                            color: #ecf0f1;
                            border: 1px solid #475869;
                            border-radius: 4px;
                            font-size: 14px;
                            resize: vertical;
                            font-family: inherit;
                            box-sizing: border-box;
                        "
                    >${currentInfo.description || ''}</textarea>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        id="btn-cancel"
                        style="
                            padding: 10px 20px;
                            background: #7f8c8d;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        "
                    >
                        ${window.t('dialog.project_info.cancel')}
                    </button>
                    <button 
                        id="btn-confirm"
                        style="
                            padding: 10px 20px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        "
                    >
                        ${buttonText}
                    </button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Focus al primer input
            setTimeout(() => {
                const nameInput = dialog.querySelector('#project-name');
                if (nameInput) nameInput.focus();
            }, 100);
            
            // Event listeners
            const btnCancel = dialog.querySelector('#btn-cancel');
            const btnConfirm = dialog.querySelector('#btn-confirm');
            
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            
            btnCancel.onclick = () => {
                cleanup();
                resolve(null);
            };
            
            btnConfirm.onclick = () => {
                const name = dialog.querySelector('#project-name').value.trim();
                const version = dialog.querySelector('#project-version').value.trim();
                const author = dialog.querySelector('#project-author').value.trim();
                const description = dialog.querySelector('#project-description').value.trim();
                
                cleanup();
                resolve({
                    name,
                    version: version || '1.0',
                    author,
                    description
                });
            };
            
            // ESC per cancel·lar
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    },

    /**
     * Mostrar diàleg de warning per nou projecte
     */
    showNewProjectWarningDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 30000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2c3e50;
                color: #ecf0f1;
                padding: 25px;
                border-radius: 8px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                font-family: 'Segoe UI', Arial, sans-serif;
            `;
            
            dialog.innerHTML = `
                <h2 style="margin: 0 0 15px 0; color: #e74c3c; font-size: 22px;">
                    ⚠️ ${window.t('dialog.new_project.title')}
                </h2>
                
                <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
                    ${window.t('dialog.new_project.warning')}
                </p>
                
                <ul style="margin: 0 0 15px 0; padding-left: 25px; font-size: 14px; line-height: 1.8;">
                    <li>${window.t('dialog.new_project.clear_iotv')}</li>
                    <li>${window.t('dialog.new_project.clear_others')}</li>
                    <li>${window.t('dialog.new_project.clear_python')}</li>
                    <li>${window.t('dialog.new_project.clear_history')}</li>
                </ul>
                
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #e74c3c;">
                    ${window.t('dialog.new_project.confirm')}
                </p>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        id="btn-cancel"
                        style="
                            padding: 10px 20px;
                            background: #7f8c8d;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        "
                    >
                        ${window.t('dialog.project_info.cancel')}
                    </button>
                    <button 
                        id="btn-continue"
                        style="
                            padding: 10px 20px;
                            background: #e74c3c;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        "
                    >
                        ${window.t('dialog.new_project.continue')}
                    </button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            
            dialog.querySelector('#btn-cancel').onclick = () => {
                cleanup();
                resolve(false);
            };
            
            dialog.querySelector('#btn-continue').onclick = () => {
                cleanup();
                resolve(true);
            };
            
            // ESC per cancel·lar
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    },

    /**
     * Mostrar diàleg de preview d'importació
     */
    showImportPreviewDialog(options = {}) {
        return new Promise((resolve) => {
            const { projectInfo, stats, warnings = [] } = options;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 30000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2c3e50;
                color: #ecf0f1;
                padding: 25px;
                border-radius: 8px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                font-family: 'Segoe UI', Arial, sans-serif;
            `;
            
            // Generar HTML d'estadístiques
            let iotvStatsHtml = '';
            
            // Digitals
            if (stats.iotv.digital.length > 0) {
                const count = stats.iotv.digital.length;
                const label = count === 1 ? window.t('dialog.import.vertebra_digital') : window.t('dialog.import.vertebrae_digital');
                iotvStatsHtml += `<div style="margin-bottom: 8px;">• ${count} ${label}</div>`;
                
                stats.iotv.digital.forEach((v, idx) => {
                    const outputs = v.costellaA === 'output' ? 8 : 0;
                    const inputs = v.costellaB === 'input' ? 8 : 0;
                    iotvStatsHtml += `<div style="margin-left: 20px; font-size: 13px; color: #95a5a6;">
                        - ${window.t('dialog.import.rib_a')} ${outputs} ${window.t('dialog.import.rib_outputs')}<br/>
                        - ${window.t('dialog.import.rib_b')} ${inputs} ${window.t('dialog.import.rib_inputs')}
                    </div>`;
                });
            }
            
            // Analògiques
            if (stats.iotv.analog.length > 0) {
                const count = stats.iotv.analog.length;
                const label = count === 1 ? window.t('dialog.import.vertebra_analog') : window.t('dialog.import.vertebrae_analog');
                iotvStatsHtml += `<div style="margin-bottom: 8px; margin-top: 8px;">• ${count} ${label}</div>`;
                
                stats.iotv.analog.forEach((v, idx) => {
                    const outputs = v.costellaA === 'output' ? 4 : 0;
                    const inputs = v.costellaB === 'input' ? 4 : 0;
                    iotvStatsHtml += `<div style="margin-left: 20px; font-size: 13px; color: #95a5a6;">
                        - ${window.t('dialog.import.rib_a')} ${outputs} ${window.t('dialog.import.rib_outputs')}<br/>
                        - ${window.t('dialog.import.rib_b')} ${inputs} ${window.t('dialog.import.rib_inputs')}
                    </div>`;
                });
            }
            
            // Altres Bessons
            let othersHtml = '';
            if (stats.others.length > 0) {
                othersHtml = stats.others.map(b => `<div>• ${b.type} (${b.id})</div>`).join('');
            } else {
                othersHtml = `<div style="color: #95a5a6; font-style: italic;">${window.t('dialog.import.empty')}</div>`;
            }
            
            // Python
            let pythonHtml = '';
            if (stats.python.empty) {
                pythonHtml = `<div style="color: #95a5a6; font-style: italic;">${window.t('dialog.import.empty')}</div>`;
            } else {
                pythonHtml = `<div>• ${stats.python.lines} ${window.t('dialog.import.lines_of_code')}</div>`;
            }
            
            // Warnings HTML
            let warningsHtml = '';
            if (warnings.length > 0) {
                warningsHtml = `
                    <div style="background: #f39c12; color: #000; padding: 12px; border-radius: 4px; margin-top: 15px;">
                        ${warnings.map(w => `<div>⚠️ ${w}</div>`).join('')}
                    </div>
                `;
            }
            
            // Format data
            const dateStr = projectInfo.created ? new Date(projectInfo.created).toLocaleString() : 'N/A';
            
            dialog.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #3498db; font-size: 22px;">
                    📥 ${window.t('dialog.import.title')}
                </h2>
                
                <div style="margin-bottom: 20px; padding: 15px; background: #34495e; border-radius: 6px;">
                    <div style="margin-bottom: 8px;">
                        <strong>${window.t('dialog.import.project_label')}</strong> "${projectInfo.name || 'N/A'}"
                    </div>
                    <div style="margin-bottom: 8px; font-size: 14px; color: #95a5a6;">
                        <strong>${window.t('dialog.import.version_label')}</strong> ${projectInfo.version || 'N/A'}
                    </div>
                    <div style="margin-bottom: 8px; font-size: 14px; color: #95a5a6;">
                        <strong>${window.t('dialog.import.author_label')}</strong> ${projectInfo.author || 'N/A'}
                    </div>
                    <div style="font-size: 14px; color: #95a5a6;">
                        <strong>${window.t('dialog.import.date_label')}</strong> ${dateStr}
                    </div>
                </div>
                
                <div style="border-top: 2px solid #475869; padding-top: 15px; margin-bottom: 15px;">
                    <h3 style="margin: 0 0 10px 0; color: #3498db; font-size: 16px;">
                        📊 ${window.t('dialog.import.content_label')}
                    </h3>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: #ecf0f1; font-size: 14px;">
                        ${window.t('dialog.import.iotv_section')}
                    </h4>
                    <div style="font-size: 14px; line-height: 1.6;">
                        ${iotvStatsHtml || '<div style="color: #95a5a6; font-style: italic;">Cap vèrtebra</div>'}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: #ecf0f1; font-size: 14px;">
                        ${window.t('dialog.import.others_section')}
                    </h4>
                    <div style="font-size: 14px; line-height: 1.6;">
                        ${othersHtml}
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 8px 0; color: #ecf0f1; font-size: 14px;">
                        ${window.t('dialog.import.python_section')}
                    </h4>
                    <div style="font-size: 14px; line-height: 1.6;">
                        ${pythonHtml}
                    </div>
                </div>
                
                ${warningsHtml}
                
                <div style="background: #e74c3c; color: white; padding: 12px; border-radius: 4px; margin-top: 15px; margin-bottom: 20px;">
                    ⚠️ ${window.t('dialog.import.overwrite_warning')}
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button 
                        id="btn-cancel"
                        style="
                            padding: 10px 20px;
                            background: #7f8c8d;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        "
                    >
                        ${window.t('dialog.project_info.cancel')}
                    </button>
                    <button 
                        id="btn-import"
                        style="
                            padding: 10px 20px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        "
                    >
                        ${window.t('dialog.import.import_button')}
                    </button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            
            dialog.querySelector('#btn-cancel').onclick = () => {
                cleanup();
                resolve(false);
            };
            
            dialog.querySelector('#btn-import').onclick = () => {
                cleanup();
                resolve(true);
            };
            
            // ESC per cancel·lar
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    },

    /**
     * Mostrar diàleg modal d'exemples de projectes
     * @param {Array} examplesList - Llista completa d'exemples [{file, name, description}]
     * @param {string} currentLang - Idioma actiu ('ca', 'es', 'en')
     * @returns {Promise<string|null>} - Nom del fitxer (sense .zip) o null si cancel·lat
     */
    showExamplesDialog(examplesList, currentLang) {
        return new Promise((resolve) => {
            const t = window.t || (k => k);

            // Filtrar per idioma: els acabats en _ca/_es/_en només es mostren si coincideixen
            const langSuffixes = ['_ca', '_es', '_en'];
            const filtered = examplesList.filter(e => {
                const suffix = langSuffixes.find(s => e.file.endsWith(s));
                if (!suffix) return true; // sense sufix → sempre visible
                return e.file.endsWith('_' + currentLang);
            });

            // Crear overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 30000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Crear diàleg
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2c3e50;
                color: #ecf0f1;
                padding: 25px;
                border-radius: 8px;
                width: 520px;
                max-width: 95vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                font-family: 'Segoe UI', Arial, sans-serif;
            `;

            // Llista d'exemples HTML
            let listHtml = '';
            if (filtered.length === 0) {
                listHtml = `<p style="color: #888; text-align: center; margin-top: 20px;">${t('examples.empty')}</p>`;
            } else {
                listHtml = filtered.map(example => `
                    <div style="display: flex; align-items: center; justify-content: space-between;
                                padding: 12px 16px; margin-bottom: 8px;
                                background: #34495e; border: 1px solid #475869; border-radius: 6px;"
                         onmouseover="this.style.borderColor='#7f8c8d'"
                         onmouseout="this.style.borderColor='#475869'">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: bold; color: #f0f0f0; margin-bottom: 4px;">${example.name}</div>
                            <div style="font-size: 0.85em; color: #95a5a6;">${example.description}</div>
                        </div>
                        <button data-file="${example.file}"
                                style="margin-left: 16px; padding: 6px 16px;
                                       background: #2196F3; color: white; border: none;
                                       border-radius: 4px; cursor: pointer; font-size: 0.9em;
                                       white-space: nowrap;"
                                onmouseover="this.style.background='#1976D2'"
                                onmouseout="this.style.background='#2196F3'">
                            ${t('examples.open_btn')}
                        </button>
                    </div>
                `).join('');
            }

            dialog.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #3498db; font-size: 22px;">
                    ${t('examples.window_title')}
                </h2>
                <div style="overflow-y: auto; flex: 1; padding-right: 4px; margin-bottom: 16px;">
                    ${listHtml}
                </div>
                <div style="text-align: right;">
                    <button id="examples-cancel-btn"
                            style="padding: 8px 20px; background: #555; color: #ecf0f1;
                                   border: none; border-radius: 4px; cursor: pointer; font-size: 0.95em;"
                            onmouseover="this.style.background='#666'"
                            onmouseout="this.style.background='#555'">
                        ${t('examples.cancel_btn')}
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const cleanup = () => document.body.removeChild(overlay);

            // Botó Cancel·la
            dialog.querySelector('#examples-cancel-btn').onclick = () => {
                cleanup();
                resolve(null);
            };

            // Botons Obre (delegació d'events)
            dialog.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-file]');
                if (btn) {
                    cleanup();
                    resolve(btn.dataset.file);
                }
            });

            // ESC per cancel·lar
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleEsc);
                    cleanup();
                    resolve(null);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }
};

// Exportar globalment
window.ProjectDialogs = ProjectDialogs;
