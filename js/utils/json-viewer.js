/**
 * JsonViewer - Visor JSON interactiu amb taules imbricades
 * 
 * Adaptat de data.html per IoT-Vertebrae v2.
 * Renderitza JSON com a taules interactives amb tema fosc,
 * suport per objectes niuats, arrays, i highlight de cel·les.
 * 
 * Ús:
 *   window.JsonViewer.open(jsonString, titleKey)
 *   window.JsonViewer.openInContainer(container, jsonString, title)
 * 
 * 0 dependències externes.
 */

class JsonViewer {
    constructor() {
        this._tableSeq = 0;
    }

    // ─── Helpers ───────────────────────────────────────────

    _isPlainObject(o) {
        return o !== null && typeof o === 'object' && !Array.isArray(o);
    }

    _isNestedTable(val) {
        return Array.isArray(val) && val.length > 0 && val.every(v => this._isPlainObject(v));
    }

    _unionKeys(arr) {
        const s = new Set();
        for (const row of arr) {
            for (const k of Object.keys(row)) s.add(k);
        }
        return [...s];
    }

    _getExpectedColumns(arr, provided) {
        if (!Array.isArray(arr) || arr.length === 0) return provided ?? [];
        const all = this._unionKeys(arr);
        if (!provided) return all;
        const out = [...provided];
        for (const k of all) {
            if (!out.includes(k)) out.push(k);
        }
        return out;
    }

    _ensureArrayRows(input) {
        if (Array.isArray(input)) return input;
        if (this._isPlainObject(input)) return [input];
        throw new Error('JSON must be an array of objects or a single object.');
    }

    _normalizeValue(val, wrapSelf) {
        if (val === null || val === undefined) return val;
        if (Array.isArray(val)) {
            return val.map(item => this._normalizeValue(item, false));
        }
        if (this._isPlainObject(val)) {
            const obj = {};
            for (const [k, v] of Object.entries(val)) {
                obj[k] = this._normalizeValue(v, true);
            }
            return wrapSelf ? [obj] : obj;
        }
        return val;
    }

    _normalizeRows(rows) {
        if (!Array.isArray(rows)) return rows;
        return rows.map(row =>
            this._isPlainObject(row) ? this._normalizeValue(row, false) : row
        );
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // ─── Styles (injected once) ───────────────────────────

    _injectStyles(container) {
        if (container.querySelector('.jv-styles-injected')) return;
        const style = document.createElement('style');
        style.className = 'jv-styles-injected';
        style.textContent = `
            .jv-wrap {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                font-size: 13px;
                color: #ecf0f1;
                overflow: auto;
                height: 100%;
                padding: 12px;
                box-sizing: border-box;
            }
            .jv-title {
                font-size: 16px;
                font-weight: 700;
                color: #3498db;
                margin-bottom: 12px;
                display: block;
            }
            .jv-table {
                border-collapse: collapse;
                table-layout: auto;
                width: auto;
                font-size: 13px;
            }
            @supports (width: max-content) {
                .jv-table { width: max-content; min-width: 10%; }
            }
            .jv-table thead th {
                background: #2c3e50;
                font-weight: 600;
                text-align: left;
                border: 1px solid #4a5568;
                padding: 6px 10px;
                white-space: nowrap;
                color: #ecf0f1;
                position: sticky;
                top: 0;
                z-index: 1;
            }
            .jv-table td {
                border: 1px solid #4a5568;
                padding: 6px 10px;
                vertical-align: top;
                color: #c9d1d9;
            }
            .jv-table td.jv-multiline {
                white-space: pre-line;
                overflow-wrap: anywhere;
            }
            .jv-table.jv-nested {
                font-size: 12px;
                background: #1a1a2e;
            }
            .jv-table.jv-nested thead th {
                background: #2d2d44;
            }
            .jv-table td > .jv-table {
                margin: 4px;
            }
            .jv-table small.jv-muted {
                color: #6b7280;
            }
            .jv-table td.jv-clickable {
                cursor: pointer;
                transition: background 0.15s;
            }
            .jv-table td.jv-clickable:hover {
                background: rgba(52, 152, 219, 0.15);
            }
            .jv-table td.jv-selected {
                outline: 2px solid #3498db;
                outline-offset: -2px;
                background: rgba(52, 152, 219, 0.2);
            }
            .jv-table td .jv-val-null {
                color: #6b7280;
                font-style: italic;
            }
            .jv-table td .jv-val-bool {
                color: #e67e22;
                font-weight: 600;
            }
            .jv-table td .jv-val-number {
                color: #2ecc71;
            }
            .jv-table td .jv-val-string {
                color: #c9d1d9;
            }
            .jv-error {
                color: #e74c3c;
                font-weight: 600;
                padding: 20px;
                font-size: 14px;
            }
            .jv-error pre {
                background: #2c1810;
                border: 1px solid #e74c3c;
                border-radius: 6px;
                padding: 12px;
                margin-top: 10px;
                font-size: 12px;
                color: #e5a8a0;
                overflow-x: auto;
                white-space: pre-wrap;
            }
        `;
        container.prepend(style);
    }

    // ─── Table builder ────────────────────────────────────

    _createEmptyTable() {
        const t = document.createElement('table');
        t.className = 'jv-table jv-nested';
        const tb = document.createElement('tbody');
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.innerHTML = '<small class="jv-muted">(empty)</small>';
        tr.appendChild(td);
        tb.appendChild(tr);
        t.appendChild(tb);
        return t;
    }

    _buildTable(data, columns, level, path, rowPath) {
        if (!Array.isArray(data)) throw new Error('Data must be an array of objects');
        if (data.length === 0) return this._createEmptyTable();
        if (!data.every(d => this._isPlainObject(d))) throw new Error('Each item must be a plain object');

        const expectedCols = this._getExpectedColumns(data, columns);
        const table = document.createElement('table');
        const tableId = `jvt${++this._tableSeq}`;
        table.dataset.tableId = tableId;
        table.className = 'jv-table' + (level > 0 ? ' jv-nested' : '');

        // THEAD
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        expectedCols.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // TBODY
        const tbody = document.createElement('tbody');
        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            const currentRowPath = [...rowPath, rowIndex];

            expectedCols.forEach(colKey => {
                const td = document.createElement('td');
                let val = Object.prototype.hasOwnProperty.call(row, colKey) ? row[colKey] : undefined;
                const pathWithAttr = [...path, colKey];

                td.dataset.cell = '1';
                td.dataset.tableId = tableId;
                td.dataset.level = String(level);
                td.dataset.rowIndex = String(rowIndex);
                td.dataset.colKey = colKey;
                td.dataset.path = JSON.stringify(pathWithAttr);
                td.dataset.rowIndexPath = JSON.stringify(currentRowPath);
                td.classList.add('jv-clickable');

                // Store cell info for click events
                td.__cellInfo = {
                    tableId, level,
                    path: pathWithAttr,
                    rowIndex,
                    rowIndexPath: currentRowPath,
                    colKey,
                    value: val,
                    row,
                    columns: [...expectedCols]
                };

                if (this._isNestedTable(val)) {
                    td.appendChild(this._buildTable(val, null, level + 1, [...path, colKey], currentRowPath));
                } else if (Array.isArray(val)) {
                    const allPrimitive = val.every(v => v === null || typeof v !== 'object');
                    const s = allPrimitive ? val.join(', ') : JSON.stringify(val, null, 1);
                    td.textContent = s;
                    td.classList.add('jv-multiline');
                    td.__cellInfo.value = s;
                } else if (typeof val === 'string') {
                    td.innerHTML = `<span class="jv-val-string">${this._escapeHtml(val)}</span>`;
                    td.classList.add('jv-multiline');
                    td.__cellInfo.value = val;
                } else if (typeof val === 'number') {
                    td.innerHTML = `<span class="jv-val-number">${val}</span>`;
                    td.__cellInfo.value = val;
                } else if (typeof val === 'boolean') {
                    td.innerHTML = `<span class="jv-val-bool">${val}</span>`;
                    td.__cellInfo.value = val;
                } else if (this._isPlainObject(val) && Object.keys(val || {}).length > 0) {
                    const s = JSON.stringify(val, null, 1);
                    td.textContent = s;
                    td.classList.add('jv-multiline');
                    td.__cellInfo.value = s;
                } else if (val === null || val === undefined) {
                    td.innerHTML = '<span class="jv-val-null">—</span>';
                    td.__cellInfo.value = null;
                } else {
                    td.textContent = String(val);
                    td.__cellInfo.value = String(val);
                }

                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        return table;
    }

    // ─── Public: render into a container ──────────────────

    /**
     * Renderitzar JSON dins un contenidor DOM
     * @param {HTMLElement} container - Element on renderitzar
     * @param {string} jsonString - JSON com a string
     * @param {string} title - Títol a mostrar
     */
    renderInContainer(container, jsonString, title) {
        container.style.cssText = `
            width: 100%;
            height: 100%;
            background: #1e1e1e;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        this._injectStyles(container);

        const wrap = document.createElement('div');
        wrap.className = 'jv-wrap';

        // Title
        if (title) {
            const titleEl = document.createElement('span');
            titleEl.className = 'jv-title';
            titleEl.textContent = title;
            wrap.appendChild(titleEl);
        }

        // Try to parse and render
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            wrap.innerHTML += `
                <div class="jv-error">
                    ❌ ${this._escapeHtml(t('bce.viewer.invalid_json'))}
                    <pre>${this._escapeHtml(e.message)}</pre>
                </div>
            `;
            container.appendChild(wrap);
            return;
        }

        try {
            const rows = this._ensureArrayRows(parsed);
            const normalizedData = this._normalizeRows(rows);
            const table = this._buildTable(normalizedData, null, 0, [], []);
            wrap.appendChild(table);
        } catch (e) {
            wrap.innerHTML += `
                <div class="jv-error">
                    ❌ ${this._escapeHtml(t('bce.viewer.render_error'))}
                    <pre>${this._escapeHtml(e.message)}</pre>
                </div>
            `;
            container.appendChild(wrap);
            return;
        }

        container.appendChild(wrap);

        // Click handler for highlight
        wrap.addEventListener('click', (event) => {
            const td = event.target.closest('td[data-cell="1"]');
            if (!td || !wrap.contains(td)) return;
            td.classList.toggle('jv-selected');
            setTimeout(() => td.classList.remove('jv-selected'), 2000);
        });
    }

    // ─── Public: open in a WindowManager window ──────────

    /**
     * Obrir visor JSON en una finestra nova
     * @param {string} jsonString - JSON com a string  
     * @param {string} titleKey - Clau i18n per al títol de la finestra
     */
    open(jsonString, titleKey) {
        const WM = window.windowManager || window.WindowManager;
        if (!WM) {
            console.error('[JsonViewer] WindowManager no disponible');
            return;
        }

        const windowTitle = titleKey ? t(titleKey) : '👁️ JSON Viewer';
        const windowId = 'json-viewer-' + Date.now();

        const viewerWindow = WM.createWindow({
            id: windowId,
            title: windowTitle,
            width: 850,
            height: 600,
            x: 130,
            y: 70
        });

        if (!viewerWindow) return;

        const container = viewerWindow.contentElement || viewerWindow.content || viewerWindow.body;
        if (!container) return;

        this.renderInContainer(container, jsonString, '');
    }
}

// Crear instància global
if (typeof window !== 'undefined') {
    window.JsonViewer = new JsonViewer();
}

console.log('✓ JsonViewer loaded');
