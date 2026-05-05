/**
 * GraphicalEditor - Editor Gràfic de Connexions IoT-Vertebrae
 *
 * Editor visual estil Node-RED per connectar senyals de bessons
 * als pins de la IoT-Vertebrae mitjançant cables (línies rectes).
 *
 * Funcionalitats:
 *   - Mostra bessons i IoT-Vertebrae com a blocs arrossegables (com GlobalOverview)
 *   - Permet crear connexions clicant un punt d'ancoratge i arrossegant fins a un altre
 *   - Selecció de cables amb clic (ressaltat) + eliminació amb Supr/Delete
 *   - Zoom (+/-), pan (Shift+clic esquerre)
 *   - Botó Desa: serialitza connexions al JSON others_config
 *   - Botó Surt: pregunta si desar canvis pendents
 *
 * Requereix: WindowManager, VertebraeConfig, getAllBessoConfigs, TwinsConfigManager, i18n
 */

class GraphicalEditor {
    constructor() {
        this.WIN_ID = 'graphical-editor';
        this.container = null;
        this.viewport = null;
        this.svgOverlay = null;

        // Posicions arrossegables { id: { x, y } }
        this.positions = {};
        this._drag = null;

        // Zoom / Pan
        this._scale = 1;
        this._panX = 0;
        this._panY = 0;
        this._isPanning = false;

        // Paleta de colors per bessó (instància)
        this.PALETTE = [
            '#e74c3c', '#3498db', '#2ecc71', '#9b59b6',
            '#f39c12', '#1abc9c', '#e67e22', '#00bcd4'
        ];

        // Ancoratges DOM: { anchorId: HTMLElement }
        this.anchors = {};
        // Connexions actives: [{ from, to, color, instIdx }]
        this.connections = [];
        // Connexió seleccionada (índex dins this.connections)
        this._selectedConn = -1;

        // Estat de cablejat (wiring): quan l'usuari està dibuixant un cable
        this._wiring = null; // { fromAnchor, fromEl, color, instIdx }
        this._wiringLine = null; // SVG line provisional

        // Dirty flag
        this._dirty = false;

        // Referència al BessoConfigEditor (per desar)
        this._bessoConfigEditor = null;

        // Dades originals
        this._othersConfig = [];
        this._iotvConfig = null;
        this._twinsConfig = [];
    }

    // ====================================================================
    //  OBERTURA
    // ====================================================================

    open(bessoConfigEditor) {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        this._bessoConfigEditor = bessoConfigEditor || null;

        const existing = WM.getWindow(this.WIN_ID);
        if (existing) {
            WM.bringToFront(this.WIN_ID);
            return;
        }

        const win = WM.createWindow({
            id: this.WIN_ID,
            title: t('graphical_editor.window_title'),
            width: Math.min(1200, window.innerWidth - 80),
            height: Math.min(800, window.innerHeight - 80),
            x: 50,
            y: 50,
            minimizable: true,
            maximizable: true,
            resizable: true,
            onClose: () => this._onCloseRequest(),
            onResize: () => this._redrawLines()
        });

        this.container = win.contentElement || win.content || win.body;
        if (!this.container) return;

        // Reset state
        this.positions = {};
        this.anchors = {};
        this.connections = [];
        this._selectedConn = -1;
        this._wiring = null;
        this._wiringLine = null;
        this._dirty = false;
        this._scale = 1;
        this._panX = 0;
        this._panY = 0;

        this._build();
    }

    // ====================================================================
    //  CONSTRUCCIÓ
    // ====================================================================

    _build() {
        const c = this.container;
        c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#141422;user-select:none;';
        c.setAttribute('tabindex', '0'); // Per rebre events de teclat

        // Viewport transformable
        this.viewport = document.createElement('div');
        this.viewport.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;transform-origin:0 0;';
        c.appendChild(this.viewport);

        // Llegir configuracions
        this._iotvConfig = this._getIotvConfig();
        this._othersConfig = this._getOthersConfig();
        this._twinsConfig = this._getTwinsConfig();

        if (!this._iotvConfig || !this._iotvConfig.vertebrae || this._iotvConfig.vertebrae.length === 0) {
            c.innerHTML = '<div style="color:#ecf0f1;padding:40px;text-align:center;font-size:16px;">⚠️ No hi ha configuració de vèrtebres definida.</div>';
            return;
        }

        // Comptar instàncies twin
        const twinInstances = [];
        this._othersConfig.forEach((o, idx) => {
            if (o.type === 'twin') twinInstances.push({ idx, other: o });
        });

        // Layout: IoT-Vertebrae a la dreta, bessons a l'esquerra
        const iotvX = 500 + Math.max(0, twinInstances.length) * 20;
        const iotvY = 30;
        this.positions['iotv'] = { x: iotvX, y: iotvY };

        twinInstances.forEach((inst, i) => {
            this.positions[`inst-${inst.idx}`] = { x: 30, y: 30 + i * 380 };
        });

        // Crear blocs
        this._createIotvBlock(this._iotvConfig);
        twinInstances.forEach(inst => {
            const twinDef = this._twinsConfig.find(t => t.twinId === inst.other.twinId);
            this._createTwinBlock(inst.other, twinDef, inst.idx);
        });

        // SVG overlay per línies
        this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgOverlay.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:100;overflow:visible;';
        this.viewport.appendChild(this.svgOverlay);

        // Controls
        this._createControls(c);

        // Events zoom/pan
        this._setupZoomPan(c);

        // Events teclat (Delete per esborrar cable seleccionat)
        this._setupKeyboard(c);

        // Generar connexions des del JSON existent
        this._buildConnectionsFromConfig();

        // Dibuixar
        this._redrawLines();
        const resObs = new ResizeObserver(() => this._redrawLines());
        resObs.observe(c);
        setTimeout(() => resObs.disconnect(), 1000);
    }

    // ====================================================================
    //  BLOC IoT-Vertebrae (idèntic a GlobalOverview)
    // ====================================================================

    _createIotvBlock(config) {
        const pos = this.positions['iotv'];
        const block = this._createDraggableBlock('iotv', pos.x, pos.y);
        block.style.minWidth = '420px';

        const header = document.createElement('div');
        header.style.cssText = 'background:#2c3e50;padding:10px 16px;border-radius:8px 8px 0 0;text-align:center;border:2px solid #4a6785;border-bottom:none;';
        header.innerHTML = `
            <div style="color:#ecf0f1;font-weight:bold;font-size:14px;">CAP IoT-Vertebrae</div>
            <div style="color:#7f8c8d;font-size:11px;">MQTT / Raspberry Pi</div>
            <div style="margin-top:4px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#2ecc71;"></span></div>
        `;
        block.appendChild(header);

        config.vertebrae.forEach((v, i) => {
            this._createVertebraRow(block, v, i);
        });

        this.viewport.appendChild(block);
    }

    _createVertebraRow(parent, vertebra, index) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:stretch;margin-top:2px;';

        const addr = this._normalizeAddr(vertebra.addr);
        const isDigital = vertebra.type === 'digital';
        const prefix = isDigital ? 'D' : 'A';
        const nBits = isDigital ? 8 : 4;
        const inLabel = isDigital ? 'DI' : 'AI';
        const outLabel = isDigital ? 'DO' : 'AO';

        // Costella A
        const costellaA = document.createElement('div');
        const funcA = vertebra.costellaA;
        const colorA = this._getCostellaColor(vertebra.type, funcA);
        costellaA.style.cssText = `background:${colorA};padding:6px 8px;border-radius:6px 0 0 6px;border:1px solid rgba(255,255,255,0.2);min-width:90px;`;

        if (funcA !== 'none') {
            const labA = funcA === 'input' ? inLabel : outLabel;
            const titleA = funcA === 'input' ? 'ENTRADES' : 'SORTIDES';
            costellaA.innerHTML = `<div style="color:#ecf0f1;font-size:9px;font-weight:bold;text-align:center;margin-bottom:3px;">A — ${titleA}</div>`;
            for (let bit = 0; bit < nBits; bit++) {
                const pinLabel = isDigital ? labA + bit : labA + (bit + 1);
                const pin = this._createPin(pinLabel, `iotv:${addr}:a:${bit}`, 'left', 'iotv');
                costellaA.appendChild(pin);
            }
        } else {
            costellaA.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:10px;text-align:center;padding:10px 0;">—</div>';
        }
        row.appendChild(costellaA);

        // Central
        const vert = document.createElement('div');
        const vertColor = isDigital ? '#2c3e50' : '#1a252f';
        vert.style.cssText = `background:${vertColor};padding:10px 16px;flex:0 0 auto;min-width:110px;text-align:center;border:1px solid rgba(255,255,255,0.15);display:flex;flex-direction:column;justify-content:center;align-items:center;`;
        vert.innerHTML = `
            <div style="color:#ecf0f1;font-weight:bold;font-size:13px;">VÈRTEBRA ${isDigital ? 'DIGITAL' : 'ANALÒGICA'}</div>
            <div style="color:#f39c12;font-size:16px;font-weight:bold;margin-top:2px;">${prefix} ${addr}</div>
            <div style="display:flex;gap:10px;margin-top:4px;">
                <span style="color:#7f8c8d;font-size:10px;">A</span>
                <span style="color:#7f8c8d;font-size:10px;">B</span>
            </div>
        `;
        row.appendChild(vert);

        // Costella B
        const costellaB = document.createElement('div');
        const funcB = vertebra.costellaB;
        const colorB = this._getCostellaColor(vertebra.type, funcB);
        costellaB.style.cssText = `background:${colorB};padding:6px 8px;border-radius:0 6px 6px 0;border:1px solid rgba(255,255,255,0.2);min-width:90px;`;

        if (funcB !== 'none') {
            const labB = funcB === 'input' ? inLabel : outLabel;
            const titleB = funcB === 'input' ? 'ENTRADES' : 'SORTIDES';
            costellaB.innerHTML = `<div style="color:#ecf0f1;font-size:9px;font-weight:bold;text-align:center;margin-bottom:3px;">B — ${titleB}</div>`;
            for (let bit = 0; bit < nBits; bit++) {
                const pinLabel = isDigital ? labB + bit : labB + (bit + 1);
                const pin = this._createPin(pinLabel, `iotv:${addr}:b:${bit}`, 'right', 'iotv');
                costellaB.appendChild(pin);
            }
        } else {
            costellaB.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:10px;text-align:center;padding:10px 0;">—</div>';
        }
        row.appendChild(costellaB);

        parent.appendChild(row);
    }

    // ====================================================================
    //  BLOC BESSÓ CONNECTABLE
    // ====================================================================

    _createTwinBlock(otherConfig, twinDef, instIdx) {
        const blockKey = `inst-${instIdx}`;
        const pos = this.positions[blockKey];
        const color = this.PALETTE[instIdx % this.PALETTE.length];
        const block = this._createDraggableBlock(blockKey, pos.x, pos.y);
        block.style.minWidth = '280px';
        block.style.maxWidth = '360px';

        // Títol
        const header = document.createElement('div');
        header.style.cssText = `background:${color};padding:8px 12px;border-radius:8px 8px 0 0;color:#fff;font-weight:bold;font-size:13px;text-align:center;`;
        header.textContent = otherConfig.name || otherConfig.twinId;
        block.appendChild(header);

        // Overlay (si existeix)
        if (twinDef && twinDef.overlay && twinDef.overlay.html) {
            const overlayContainer = document.createElement('div');
            const overlayH = twinDef.overlay.height || 150;
            overlayContainer.style.cssText = `width:100%;height:${overlayH}px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);overflow:hidden;`;

            const overlayHtml = this._getOverlayHtml(otherConfig.twinId, twinDef.overlay.html);
            if (overlayHtml) {
                const iframe = document.createElement('iframe');
                iframe.style.cssText = 'width:100%;height:100%;border:none;pointer-events:none;';
                iframe.sandbox = 'allow-scripts';
                overlayContainer.appendChild(iframe);
                block.appendChild(overlayContainer);
                requestAnimationFrame(() => {
                    try {
                        const doc = iframe.contentDocument || iframe.contentWindow.document;
                        doc.open();
                        doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;overflow:hidden;}</style></head><body>${overlayHtml}</body></html>`);
                        doc.close();
                    } catch (e) { /* sandbox */ }
                });
            } else {
                overlayContainer.innerHTML = `<div style="color:#7f8c8d;font-size:11px;text-align:center;padding:20px;">overlay: ${twinDef.overlay.html}</div>`;
                block.appendChild(overlayContainer);
            }
        }

        // FROM PLC i TO PLC — senyals del twin
        const ioBody = document.createElement('div');
        ioBody.style.cssText = 'display:flex;gap:0;background:#1e1e1e;border-radius:0 0 8px 8px;border:1px solid rgba(255,255,255,0.1);border-top:none;';

        const ioConfig = otherConfig.ioConfig || {};

        // Determinar senyals disponibles del twin (del twinDef.components bindings)
        const fromSignals = this._getTwinSignals(otherConfig, twinDef, 'from');
        const toSignals = this._getTwinSignals(otherConfig, twinDef, 'to');

        // Columna FROM PLC
        const fromCol = document.createElement('div');
        fromCol.style.cssText = 'flex:1;padding:6px 8px;border-right:1px solid rgba(255,255,255,0.05);';
        if (fromSignals.length > 0) {
            fromCol.innerHTML = '<div style="color:#3498db;font-size:10px;font-weight:bold;margin-bottom:4px;">◄ FROM PLC</div>';
            fromSignals.forEach(sig => {
                const pin = this._createPin(sig, `inst:${instIdx}:from:${sig}`, 'left', 'twin', instIdx);
                fromCol.appendChild(pin);
            });
        }
        ioBody.appendChild(fromCol);

        // Columna TO PLC
        const toCol = document.createElement('div');
        toCol.style.cssText = 'flex:1;padding:6px 8px;';
        if (toSignals.length > 0) {
            toCol.innerHTML = '<div style="color:#e67e22;font-size:10px;font-weight:bold;margin-bottom:4px;">► TO PLC</div>';
            toSignals.forEach(sig => {
                const pin = this._createPin(sig, `inst:${instIdx}:to:${sig}`, 'right', 'twin', instIdx);
                toCol.appendChild(pin);
            });
        }
        ioBody.appendChild(toCol);

        block.appendChild(ioBody);
        this.viewport.appendChild(block);
    }

    /**
     * Obtenir senyals d'un twin (des del JSON existent o des del twinDef)
     */
    _getTwinSignals(otherConfig, twinDef, direction) {
        const ioConfig = otherConfig.ioConfig || {};
        const signals = new Set();

        // Senyals ja configurades al JSON
        if (direction === 'from' && ioConfig.fromPLC) {
            Object.keys(ioConfig.fromPLC).forEach(s => signals.add(s));
        }
        if (direction === 'to' && ioConfig.toPLC) {
            Object.keys(ioConfig.toPLC).forEach(s => signals.add(s));
        }

        // Senyals del twinDef (components bindings)
        if (twinDef && twinDef.components) {
            twinDef.components.forEach(comp => {
                if (!comp.bindings) return;
                Object.entries(comp.bindings).forEach(([sig, binding]) => {
                    const dir = binding.direction || 'fromPLC';
                    if (direction === 'from' && dir === 'fromPLC') signals.add(sig);
                    if (direction === 'to' && dir === 'toPLC') signals.add(sig);
                });
            });
        }

        return [...signals];
    }

    // ====================================================================
    //  PIN D'ANCORATGE (punt de connexió) — amb lògica de wiring
    // ====================================================================

    _createPin(label, anchorId, side, blockType, instIdx) {
        const row = document.createElement('div');
        const isLeft = side === 'left';
        row.style.cssText = `display:flex;align-items:center;gap:4px;margin:2px 0;${isLeft ? '' : 'flex-direction:row-reverse;'}`;

        const dot = document.createElement('span');
        dot.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:50%;background:#ecf0f1;flex-shrink:0;border:2px solid rgba(0,0,0,0.3);cursor:crosshair;z-index:101;position:relative;transition:transform 0.1s;';
        dot.dataset.anchorId = anchorId;
        dot.dataset.blockType = blockType; // 'iotv' o 'twin'
        if (instIdx !== undefined) dot.dataset.instIdx = String(instIdx);

        // Hover visual
        dot.addEventListener('mouseenter', () => {
            dot.style.transform = 'scale(1.5)';
            dot.style.background = '#f1c40f';
        });
        dot.addEventListener('mouseleave', () => {
            dot.style.transform = 'scale(1)';
            dot.style.background = '#ecf0f1';
        });

        // Inici de wiring
        dot.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._startWiring(anchorId, dot, blockType, instIdx);
        });

        const text = document.createElement('span');
        text.style.cssText = 'color:#ecf0f1;font-size:11px;font-family:monospace;white-space:nowrap;';
        text.textContent = label;

        row.appendChild(dot);
        row.appendChild(text);

        this.anchors[anchorId] = dot;
        return row;
    }

    // ====================================================================
    //  WIRING — Creació de cables
    // ====================================================================

    _startWiring(anchorId, dotEl, blockType, instIdx) {
        // Determinar color del cable (color del bessó d'origen, o gris si IoT-Vertebrae)
        let color = '#95a5a6';
        let sourceInstIdx = null;

        if (blockType === 'twin' && instIdx !== undefined) {
            color = this.PALETTE[instIdx % this.PALETTE.length];
            sourceInstIdx = instIdx;
        }

        this._wiring = {
            fromAnchor: anchorId,
            fromEl: dotEl,
            fromBlockType: blockType,
            fromInstIdx: sourceInstIdx,
            color: color
        };

        // Crear línia provisional al SVG
        const pt = this._getAnchorCenter(dotEl);
        if (!pt) return;

        this._wiringLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this._wiringLine.setAttribute('x1', pt.x);
        this._wiringLine.setAttribute('y1', pt.y);
        this._wiringLine.setAttribute('x2', pt.x);
        this._wiringLine.setAttribute('y2', pt.y);
        this._wiringLine.setAttribute('stroke', color);
        this._wiringLine.setAttribute('stroke-width', '3');
        this._wiringLine.setAttribute('stroke-dasharray', '6,3');
        this._wiringLine.setAttribute('stroke-opacity', '0.9');
        this.svgOverlay.appendChild(this._wiringLine);

        // Listeners globals per moure i acabar
        const onMove = (ev) => {
            if (!this._wiring || !this._wiringLine) return;
            const rect = this.viewport.getBoundingClientRect();
            const mx = (ev.clientX - rect.left) / this._scale;
            const my = (ev.clientY - rect.top) / this._scale;
            this._wiringLine.setAttribute('x2', mx);
            this._wiringLine.setAttribute('y2', my);
        };

        const onUp = (ev) => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);

            // Trobar si hem acabat sobre un anchor
            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            if (target && target.dataset && target.dataset.anchorId) {
                this._finishWiring(target.dataset.anchorId, target);
            } else {
                this._cancelWiring();
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    _finishWiring(toAnchorId, toEl) {
        if (!this._wiring) { this._cancelWiring(); return; }

        const from = this._wiring.fromAnchor;
        const to = toAnchorId;
        const fromType = this._wiring.fromBlockType;
        const toType = toEl.dataset.blockType;

        // Validacions
        // 1) No connectar amb si mateix
        if (from === to) { this._cancelWiring(); return; }

        // 2) Cal que un extrem sigui twin i l'altre iotv
        if (fromType === toType) { this._cancelWiring(); return; }

        // 3) No duplicar connexions
        const exists = this.connections.some(c =>
            (c.from === from && c.to === to) || (c.from === to && c.to === from)
        );
        if (exists) { this._cancelWiring(); return; }

        // Normalitzar: sempre from=twin, to=iotv
        let finalFrom = from, finalTo = to;
        let instIdx = this._wiring.fromInstIdx;
        let color = this._wiring.color;

        if (fromType === 'iotv') {
            finalFrom = to;
            finalTo = from;
            // Prendre color i instIdx del twin
            instIdx = parseInt(toEl.dataset.instIdx);
            color = this.PALETTE[instIdx % this.PALETTE.length];
        }

        this.connections.push({ from: finalFrom, to: finalTo, color, instIdx });
        this._dirty = true;
        this._cancelWiring();
        this._redrawLines();
    }

    _cancelWiring() {
        if (this._wiringLine && this._wiringLine.parentNode) {
            this._wiringLine.parentNode.removeChild(this._wiringLine);
        }
        this._wiring = null;
        this._wiringLine = null;
    }

    // ====================================================================
    //  BLOC ARROSSEGABLE
    // ====================================================================

    _createDraggableBlock(id, x, y) {
        const block = document.createElement('div');
        block.dataset.blockId = id;
        block.style.cssText = `position:absolute;left:${x}px;top:${y}px;z-index:1;cursor:grab;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);`;

        block.addEventListener('mousedown', (e) => this._onDragStart(e, id, block));
        block.addEventListener('touchstart', (e) => this._onDragStart(e, id, block), { passive: false });

        return block;
    }

    _onDragStart(e, blockId, block) {
        if (e.target.tagName === 'IFRAME') return;
        if (e.shiftKey) return;
        // No arrossegar si estem sobre un anchor (cursor crosshair)
        if (e.target.dataset && e.target.dataset.anchorId) return;
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const pos = this.positions[blockId];

        this._drag = {
            blockId,
            block,
            startX: clientX - pos.x * this._scale,
            startY: clientY - pos.y * this._scale
        };

        block.style.cursor = 'grabbing';
        block.style.zIndex = 10;

        const onMove = (ev) => {
            if (!this._drag) return;
            const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
            const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
            const newX = (cx - this._drag.startX) / this._scale;
            const newY = (cy - this._drag.startY) / this._scale;
            this.positions[blockId].x = newX;
            this.positions[blockId].y = newY;
            block.style.left = newX + 'px';
            block.style.top = newY + 'px';
            this._redrawLines();
        };

        const onEnd = () => {
            if (this._drag) {
                this._drag.block.style.cursor = 'grab';
                this._drag.block.style.zIndex = 1;
                this._drag = null;
            }
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    // ====================================================================
    //  CONNEXIONS — Construcció des del JSON
    // ====================================================================

    _buildConnectionsFromConfig() {
        this.connections = [];

        this._othersConfig.forEach((other, idx) => {
            if (other.type !== 'twin') return;
            const color = this.PALETTE[idx % this.PALETTE.length];
            const ioConfig = other.ioConfig || {};

            // FROM PLC
            Object.entries(ioConfig.fromPLC || {}).forEach(([sig, m]) => {
                const bitOrChannel = (m.channel != null) ? (m.channel - 1) : (m.bit != null ? m.bit : 0);
                const iotvAnchor = `iotv:${this._normalizeAddr(m.vertebra)}:${m.rib}:${bitOrChannel}`;
                const twinAnchor = `inst:${idx}:from:${sig}`;
                this.connections.push({ from: twinAnchor, to: iotvAnchor, color, instIdx: idx });
            });

            // TO PLC
            Object.entries(ioConfig.toPLC || {}).forEach(([sig, m]) => {
                const bitOrChannel = (m.channel != null) ? (m.channel - 1) : (m.bit != null ? m.bit : 0);
                const iotvAnchor = `iotv:${this._normalizeAddr(m.vertebra)}:${m.rib}:${bitOrChannel}`;
                const twinAnchor = `inst:${idx}:to:${sig}`;
                this.connections.push({ from: twinAnchor, to: iotvAnchor, color, instIdx: idx });
            });
        });
    }

    // ====================================================================
    //  DIBUIX DE LÍNIES (SVG)
    // ====================================================================

    _redrawLines() {
        if (!this.svgOverlay || !this.viewport) return;

        // Preservar línia de wiring provisional
        const wiringLine = this._wiringLine;

        this.svgOverlay.innerHTML = '';

        let maxX = 2000, maxY = 2000;
        Object.values(this.positions).forEach(pos => {
            if (pos.x + 600 > maxX) maxX = pos.x + 600;
            if (pos.y + 800 > maxY) maxY = pos.y + 800;
        });
        this.svgOverlay.setAttribute('width', maxX);
        this.svgOverlay.setAttribute('height', maxY);
        this.svgOverlay.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);

        this.connections.forEach((conn, i) => {
            const fromEl = this.anchors[conn.from];
            const toEl = this.anchors[conn.to];
            if (!fromEl || !toEl) return;

            const fromPt = this._getAnchorCenter(fromEl);
            const toPt = this._getAnchorCenter(toEl);
            if (!fromPt || !toPt) return;

            const isSelected = (i === this._selectedConn);

            // Línia invisible ampla per facilitar clic
            const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hitLine.setAttribute('x1', fromPt.x);
            hitLine.setAttribute('y1', fromPt.y);
            hitLine.setAttribute('x2', toPt.x);
            hitLine.setAttribute('y2', toPt.y);
            hitLine.setAttribute('stroke', 'transparent');
            hitLine.setAttribute('stroke-width', '12');
            hitLine.style.pointerEvents = 'stroke';
            hitLine.style.cursor = 'pointer';
            hitLine.dataset.connIdx = String(i);
            hitLine.addEventListener('click', (e) => {
                e.stopPropagation();
                this._selectConnection(i);
            });
            this.svgOverlay.appendChild(hitLine);

            // Línia visible
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', fromPt.x);
            line.setAttribute('y1', fromPt.y);
            line.setAttribute('x2', toPt.x);
            line.setAttribute('y2', toPt.y);
            line.setAttribute('stroke', isSelected ? '#f1c40f' : conn.color);
            line.setAttribute('stroke-width', isSelected ? '4' : '2.5');
            line.setAttribute('stroke-opacity', isSelected ? '1' : '0.85');
            if (isSelected) {
                line.setAttribute('filter', 'drop-shadow(0 0 4px #f1c40f)');
            }
            line.style.pointerEvents = 'none';
            this.svgOverlay.appendChild(line);
        });

        // Re-afegir línia provisional de wiring
        if (wiringLine) {
            this.svgOverlay.appendChild(wiringLine);
            this._wiringLine = wiringLine;
        }
    }

    _selectConnection(idx) {
        if (this._selectedConn === idx) {
            this._selectedConn = -1; // Deseleccionar
        } else {
            this._selectedConn = idx;
        }
        this._redrawLines();
        // Assegurar focus al contenidor per rebre Delete
        if (this.container) this.container.focus();
    }

    _getAnchorCenter(el) {
        if (!el || !this.viewport) return null;
        const elRect = el.getBoundingClientRect();
        const vpRect = this.viewport.getBoundingClientRect();
        return {
            x: (elRect.left - vpRect.left + elRect.width / 2) / this._scale,
            y: (elRect.top - vpRect.top + elRect.height / 2) / this._scale
        };
    }

    // ====================================================================
    //  TECLAT — Delete per esborrar cable seleccionat
    // ====================================================================

    _setupKeyboard(container) {
        container.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && this._selectedConn >= 0) {
                e.preventDefault();
                this.connections.splice(this._selectedConn, 1);
                this._selectedConn = -1;
                this._dirty = true;
                this._redrawLines();
            }
            if (e.key === 'Escape') {
                if (this._wiring) {
                    this._cancelWiring();
                } else if (this._selectedConn >= 0) {
                    this._selectedConn = -1;
                    this._redrawLines();
                }
            }
        });

        // Deseleccionar al clicar fora d'un cable
        container.addEventListener('click', (e) => {
            // Només si el clic NO ve d'un hit-line del SVG
            if (!e.target.dataset || e.target.dataset.connIdx === undefined) {
                if (this._selectedConn >= 0) {
                    this._selectedConn = -1;
                    this._redrawLines();
                }
            }
        });
    }

    // ====================================================================
    //  ZOOM / PAN
    // ====================================================================

    _createControls(container) {
        const t = window.t || (k => k);
        const bar = document.createElement('div');
        bar.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:200;display:flex;gap:4px;align-items:center;';

        const mkBtn = (label, action, bg) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            const bgColor = bg || 'rgba(44,62,80,0.9)';
            btn.style.cssText = `padding:6px 12px;border:none;border-radius:4px;background:${bgColor};color:#ecf0f1;font-size:13px;cursor:pointer;font-weight:500;transition:opacity 0.2s;`;
            btn.addEventListener('click', action);
            btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.85'; });
            btn.addEventListener('mouseleave', () => { btn.style.opacity = '1'; });
            return btn;
        };

        bar.appendChild(mkBtn('🔍+', () => this._zoom(1.2)));
        bar.appendChild(mkBtn('🔍−', () => this._zoom(1 / 1.2)));
        bar.appendChild(mkBtn('↺', () => this._resetView()));

        // Separador
        const sep = document.createElement('div');
        sep.style.cssText = 'width:1px;height:24px;background:rgba(255,255,255,0.2);margin:0 8px;';
        bar.appendChild(sep);

        // Botó Desa
        const saveBtn = mkBtn('💾 ' + (t('graphical_editor.save_btn') || 'Desa'), () => this._onSave(), '#27ae60');
        bar.appendChild(saveBtn);

        // Botó Surt
        const exitBtn = mkBtn('🚪 ' + (t('graphical_editor.exit_btn') || 'Surt'), () => this._onExit(), '#c0392b');
        bar.appendChild(exitBtn);

        container.appendChild(bar);

        // Zoom label
        this._zoomLabel = document.createElement('div');
        this._zoomLabel.style.cssText = 'position:absolute;bottom:12px;left:250px;z-index:200;color:#7f8c8d;font-size:11px;';
        this._zoomLabel.textContent = '100%';
        container.appendChild(this._zoomLabel);

        // Instruccions
        const help = document.createElement('div');
        help.style.cssText = 'position:absolute;top:8px;right:12px;z-index:200;color:#7f8c8d;font-size:11px;text-align:right;line-height:1.6;pointer-events:none;';
        help.innerHTML = (t('graphical_editor.help_text') || 
            'Arrossega blocs • Clic punt → punt per connectar<br>Clic cable per seleccionar • Supr per esborrar<br>Shift+clic per desplaçar • Roda per zoom');
        container.appendChild(help);
    }

    _setupZoomPan(container) {
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            const rect = container.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            this._zoomAt(factor, cx, cy);
        }, { passive: false });

        container.addEventListener('mousedown', (e) => {
            if (!e.shiftKey) return;
            e.preventDefault();
            this._isPanning = true;
            this._panStartX = e.clientX - this._panX;
            this._panStartY = e.clientY - this._panY;
            container.style.cursor = 'move';
            const onMove = (ev) => {
                if (!this._isPanning) return;
                this._panX = ev.clientX - this._panStartX;
                this._panY = ev.clientY - this._panStartY;
                this._applyTransform();
            };
            const onUp = () => {
                this._isPanning = false;
                container.style.cursor = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    _zoom(factor) {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this._zoomAt(factor, rect.width / 2, rect.height / 2);
    }

    _zoomAt(factor, cx, cy) {
        const oldScale = this._scale;
        this._scale = Math.min(3, Math.max(0.2, this._scale * factor));
        const realFactor = this._scale / oldScale;
        this._panX = cx - realFactor * (cx - this._panX);
        this._panY = cy - realFactor * (cy - this._panY);
        this._applyTransform();
    }

    _resetView() {
        this._scale = 1;
        this._panX = 0;
        this._panY = 0;
        this._applyTransform();
    }

    _applyTransform() {
        if (!this.viewport) return;
        this.viewport.style.transform = `translate(${this._panX}px, ${this._panY}px) scale(${this._scale})`;
        if (this._zoomLabel) {
            this._zoomLabel.textContent = Math.round(this._scale * 100) + '%';
        }
        this._redrawLines();
    }

    // ====================================================================
    //  DESA — Serialitzar connexions a JSON others_config
    // ====================================================================

    _onSave() {
        const t = window.t || (k => k);
        try {
            const newConfig = this._serializeToConfig();
            const jsonStr = JSON.stringify(newConfig, null, 2);

            // Actualitzar el textarea del BessoConfigEditor
            if (this._bessoConfigEditor && this._bessoConfigEditor.editorTextarea) {
                this._bessoConfigEditor.editorTextarea.value = jsonStr;
            }

            this._dirty = false;
            this._showToast(t('graphical_editor.saved') || '✓ Connexions desades al JSON');
        } catch (e) {
            console.error('[GraphicalEditor] Error serialitzant:', e);
            this._showToast('⚠️ Error: ' + e.message);
        }
    }

    _serializeToConfig() {
        // Partir de la configuració original
        const config = JSON.parse(JSON.stringify(this._othersConfig));

        // Per cada twin, reconstruir ioConfig.fromPLC i ioConfig.toPLC
        config.forEach((entry, idx) => {
            if (entry.type !== 'twin') return;

            const fromPLC = {};
            const toPLC = {};

            // Trobar connexions d'aquesta instància
            this.connections.forEach(conn => {
                if (conn.instIdx !== idx) return;

                // conn.from és sempre twin, conn.to és sempre iotv
                const twinParts = conn.from.split(':'); // inst:IDX:from/to:SIGNAL
                const iotvParts = conn.to.split(':');   // iotv:ADDR:RIB:BIT

                if (twinParts.length < 4 || iotvParts.length < 4) return;

                const direction = twinParts[2]; // 'from' o 'to'
                const signal = twinParts.slice(3).join(':'); // senyal (pot contenir ':')
                const vertebra = iotvParts[1]; // adreça
                const rib = iotvParts[2];      // 'a' o 'b'
                const bitNum = parseInt(iotvParts[3]);

                // Determinar tipus (digital/analog) des del pin de la vèrtebra
                const vertDef = this._iotvConfig.vertebrae.find(v => this._normalizeAddr(v.addr) === vertebra);
                const isAnalog = vertDef && vertDef.type === 'analog';

                const mapping = {
                    type: isAnalog ? 'analog' : 'digital',
                    vertebra: vertebra,
                    rib: rib
                };

                if (isAnalog) {
                    mapping.channel = bitNum + 1; // Els canals analògics són 1-based
                } else {
                    mapping.bit = bitNum;
                }

                if (direction === 'from') {
                    fromPLC[signal] = mapping;
                } else {
                    toPLC[signal] = mapping;
                }
            });

            // Actualitzar ioConfig preservant altres camps (labelOverrides, etc.)
            if (!entry.ioConfig) entry.ioConfig = {};
            entry.ioConfig.fromPLC = fromPLC;
            entry.ioConfig.toPLC = toPLC;
        });

        return config;
    }

    // ====================================================================
    //  SURT — amb confirmació si dirty
    // ====================================================================

    _onExit() {
        if (this._dirty) {
            this._showConfirmDialog();
        } else {
            this._closeWindow();
        }
    }

    _onCloseRequest() {
        if (this._dirty) {
            // Impedir el tancament directe, mostrar diàleg
            this._showConfirmDialog();
            return false;
        }
        this._cleanup();
    }

    _showConfirmDialog() {
        const t = window.t || (k => k);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:#1e1e2e;border:1px solid #4a6785;border-radius:10px;padding:24px 28px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.6);';

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'color:#ecf0f1;font-weight:bold;font-size:15px;margin-bottom:12px;';
        titleEl.textContent = t('graphical_editor.unsaved_title') || 'Canvis sense desar';
        dialog.appendChild(titleEl);

        const msgEl = document.createElement('div');
        msgEl.style.cssText = 'color:#bdc3c7;font-size:13px;margin-bottom:20px;line-height:1.5;';
        msgEl.textContent = t('graphical_editor.unsaved_msg') || 'Hi ha modificacions no desades. Voleu desar abans de sortir?';
        dialog.appendChild(msgEl);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

        const closeOv = () => { if (overlay.parentNode) document.body.removeChild(overlay); };

        const mkB = (label, color, action) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `padding:8px 16px;border:none;border-radius:6px;background:${color};color:#fff;font-size:13px;cursor:pointer;font-weight:500;`;
            btn.addEventListener('click', () => { closeOv(); action(); });
            return btn;
        };

        btnRow.appendChild(mkB(t('graphical_editor.save_and_exit') || 'Desa i surt', '#27ae60', () => {
            this._onSave();
            this._closeWindow();
        }));
        btnRow.appendChild(mkB(t('graphical_editor.exit_no_save') || 'Surt sense desar', '#e74c3c', () => {
            this._dirty = false;
            this._closeWindow();
        }));
        btnRow.appendChild(mkB(t('graphical_editor.cancel') || 'Cancel·la', '#7f8c8d', () => {}));

        dialog.appendChild(btnRow);
        overlay.appendChild(dialog);

        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOv(); });
        document.body.appendChild(overlay);
    }

    _closeWindow() {
        this._cleanup();
        const WM = window.windowManager || window.WindowManager;
        if (WM) WM.closeWindow(this.WIN_ID);
    }

    _cleanup() {
        this.container = null;
        this.viewport = null;
        this.svgOverlay = null;
        this.anchors = {};
        this.connections = [];
        this._selectedConn = -1;
        this._wiring = null;
        this._wiringLine = null;
        this._scale = 1;
        this._panX = 0;
        this._panY = 0;
    }

    // ====================================================================
    //  UTILITATS
    // ====================================================================

    _getIotvConfig() {
        if (window.VertebraeConfig) return window.VertebraeConfig.getOrDefault();
        return null;
    }

    _getOthersConfig() {
        if (typeof window.getAllBessoConfigs === 'function') return window.getAllBessoConfigs() || [];
        return [];
    }

    _getTwinsConfig() {
        if (window.TwinsConfigManager) return window.TwinsConfigManager.export() || [];
        return [];
    }

    _getOverlayHtml(twinId, filename) {
        if (window._twinsAssets) {
            return window._twinsAssets[filename] ||
                   window._twinsAssets[`twins/${filename}`] ||
                   window._twinsAssets[`overlay_${twinId}.html`] || null;
        }
        return null;
    }

    _normalizeAddr(addr) {
        if (window.CanvasHelpers && window.CanvasHelpers.addrToHex) {
            return window.CanvasHelpers.addrToHex(addr);
        }
        const str = String(addr);
        if (/^0x[0-9a-fA-F]+$/.test(str)) return str.toLowerCase();
        const n = parseInt(str, 10);
        if (!isNaN(n)) return '0x' + n.toString(16);
        return str;
    }

    _getCostellaColor(type, funcio) {
        if (funcio === 'none') return '#2c3e50';
        if (type === 'digital') {
            return funcio === 'output' ? '#16a085' : '#27ae60';
        } else {
            return funcio === 'output' ? '#8e44ad' : '#9b59b6';
        }
    }

    _showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#2c3e50;color:#ecf0f1;padding:10px 24px;border-radius:8px;font-size:13px;z-index:10001;box-shadow:0 4px 16px rgba(0,0,0,0.4);transition:opacity 0.3s;';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { if (toast.parentNode) document.body.removeChild(toast); }, 300); }, 2500);
    }
}

// Singleton global
window.GraphicalEditor = new GraphicalEditor();
