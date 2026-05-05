/**
 * GlobalOverview - Visió General del sistema IoT-Vertebrae
 *
 * Mostra una finestra amb:
 *   - Representació esquemàtica de la IoT-Vertebrae (CAP + vèrtebres + costelles)
 *   - Bessons connectables amb overlay + FROM PLC / TO PLC
 *   - Línies de connexió SVG entre els punts del bessó i els punts de la IoT-Vertebrae
 *   - Tot arrossegable, amb les línies que segueixen el moviment (estil Node-RED)
 *
 * Requereix: WindowManager, VertebraeConfig, getAllBessoConfigs, TwinsConfigManager, i18n, CanvasHelpers
 *
 * NOTA: Les claus de bessons usen instanceKey (idx del othersConfig) per suportar
 *       múltiples instàncies del mateix twinId (ex: h-bridge-00, h-bridge-01).
 */

class GlobalOverview {
    constructor() {
        this.WIN_ID = 'global-overview';
        this.container = null;
        this.viewport = null;     // Div transformable (zoom/pan)
        this.svgOverlay = null;   // SVG absolut per les línies de connexió

        // Posicions arrossegables de cada bloc { id: { x, y } }
        this.positions = {};
        // Dades de drag actiu
        this._drag = null;

        // Zoom / Pan
        this._scale = 1;
        this._panX = 0;
        this._panY = 0;
        this._isPanning = false;

        // Paleta de colors per bessó
        this.PALETTE = [
            '#e74c3c', '#3498db', '#2ecc71', '#9b59b6',
            '#f39c12', '#1abc9c', '#e67e22', '#00bcd4'
        ];

        // Mapes de punts d'ancoratge per les línies
        // Format: { 'iotv:0x0:b:3': HTMLElement, 'inst:0:from:R': HTMLElement, ... }
        this.anchors = {};
        // Connexions a dibuixar: [{ from, to, color }]
        this.connections = [];
    }

    // ====================================================================
    //  OBERTURA
    // ====================================================================

    open() {
        const t = window.t || (k => k);
        const WM = window.windowManager || window.WindowManager;
        if (!WM) return;

        // Si ja existeix, portar al davant
        const existing = WM.getWindow(this.WIN_ID);
        if (existing) {
            WM.bringToFront(this.WIN_ID);
            return;
        }

        const win = WM.createWindow({
            id: this.WIN_ID,
            title: t('menu.help.overview.window_title'),
            width: Math.min(1200, window.innerWidth - 80),
            height: Math.min(800, window.innerHeight - 80),
            x: 40,
            y: 40,
            minimizable: true,
            maximizable: true,
            resizable: true,
            onClose: () => { this.container = null; this.viewport = null; this.anchors = {}; this.connections = []; this._scale = 1; this._panX = 0; this._panY = 0; },
            onResize: () => this._redrawLines()
        });

        this.container = win.contentElement || win.content || win.body;
        if (!this.container) return;

        this._build();
    }

    // ====================================================================
    //  CONSTRUCCIÓ
    // ====================================================================

    _build() {
        const c = this.container;
        c.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;background:#141422;user-select:none;';

        // Viewport transformable (zoom/pan)
        this.viewport = document.createElement('div');
        this.viewport.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;transform-origin:0 0;';
        c.appendChild(this.viewport);

        // Llegir configuracions
        const iotvConfig = this._getIotvConfig();
        const othersConfig = this._getOthersConfig();
        const twinsConfig = this._getTwinsConfig();

        if (!iotvConfig || !iotvConfig.vertebrae || iotvConfig.vertebrae.length === 0) {
            c.innerHTML = '<div style="color:#ecf0f1;padding:40px;text-align:center;font-size:16px;">⚠️ No hi ha configuració de vèrtebres definida.</div>';
            return;
        }

        // --- Calcular layout inicial ---
        // Comptar instàncies twin (pot haver-hi múltiples amb el mateix twinId)
        const twinInstances = [];
        othersConfig.forEach((o, idx) => {
            if (o.type === 'twin') twinInstances.push({ idx, other: o });
        });
        const nTwins = twinInstances.length;

        // IoT-Vertebrae a la dreta
        const iotvX = 500 + Math.max(0, nTwins) * 20;
        const iotvY = 30;
        this.positions['iotv'] = { x: iotvX, y: iotvY };

        // Bessons a l'esquerra, repartits verticalment — clau per instància (idx)
        twinInstances.forEach((inst, i) => {
            this.positions[`inst-${inst.idx}`] = {
                x: 30,
                y: 30 + i * 380
            };
        });

        // --- Crear blocs (dins viewport) ---
        this._createIotvBlock(iotvConfig);

        twinInstances.forEach((inst) => {
            const twinDef = twinsConfig.find(t => t.twinId === inst.other.twinId);
            this._createTwinBlock(inst.other, twinDef, inst.idx);
        });

        // --- SVG overlay per línies — AL FINAL per quedar per sobre dels blocs ---
        this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgOverlay.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:100;overflow:visible;';
        this.viewport.appendChild(this.svgOverlay);

        // --- Controls de zoom (fora del viewport, fixes a la cantonada) ---
        this._createZoomControls(c);

        // --- Events de zoom/pan ---
        this._setupZoomPan(c);

        // --- Generar connexions ---
        this._buildConnections(othersConfig);

        // --- Dibuixar línies ---
        // Usar ResizeObserver per detectar quan el contenidor ha estabilitzat el layout
        this._redrawLines();
        const resObs = new ResizeObserver(() => {
            this._redrawLines();
        });
        resObs.observe(c);
        // Desconnectar després d'un temps raonable (el layout ja s'haurà estabilitzat)
        setTimeout(() => resObs.disconnect(), 1000);
    }

    // ====================================================================
    //  BLOC IoT-Vertebrae
    // ====================================================================

    _createIotvBlock(config) {
        const pos = this.positions['iotv'];
        const block = this._createDraggableBlock('iotv', pos.x, pos.y);
        block.style.minWidth = '420px';

        // Títol CAP
        const header = document.createElement('div');
        header.dataset.iotvHeader = 'true';
        header.style.cssText = 'background:#2c3e50;padding:10px 16px;border-radius:8px 8px 0 0;text-align:center;border:2px solid #4a6785;border-bottom:none;';
        header.innerHTML = `
            <div style="color:#ecf0f1;font-weight:bold;font-size:14px;">CAP IoT-Vertebrae</div>
            <div style="color:#7f8c8d;font-size:11px;">MQTT / Raspberry Pi</div>
            <div style="margin-top:4px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#2ecc71;"></span></div>
        `;
        block.appendChild(header);

        // Vèrtebres
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

        // --- Costella A (esquerra) ---
        const costellaA = document.createElement('div');
        const funcA = vertebra.costellaA; // 'input', 'output' o 'none'
        const colorA = this._getCostellaColor(vertebra.type, funcA);
        costellaA.style.cssText = `background:${colorA};padding:6px 8px;border-radius:6px 0 0 6px;border:1px solid rgba(255,255,255,0.2);min-width:90px;`;

        if (funcA !== 'none') {
            const labA = funcA === 'input' ? inLabel : outLabel;
            const titleA = funcA === 'input' ? 'ENTRADES' : 'SORTIDES';
            costellaA.innerHTML = `<div style="color:#ecf0f1;font-size:9px;font-weight:bold;text-align:center;margin-bottom:3px;">A — ${titleA}</div>`;
            for (let bit = 0; bit < nBits; bit++) {
                const pinLabel = isDigital ? labA + bit : labA + (bit + 1);
                const pin = this._createPin(pinLabel, `iotv:${addr}:a:${bit}`, 'left');
                costellaA.appendChild(pin);
            }
        } else {
            costellaA.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:10px;text-align:center;padding:10px 0;">—</div>';
        }
        row.appendChild(costellaA);

        // --- Vèrtebra central ---
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

        // --- Costella B (dreta) ---
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
                const pin = this._createPin(pinLabel, `iotv:${addr}:b:${bit}`, 'right');
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

    /**
     * Crear bloc de bessó connectable
     * @param {Object} otherConfig - Configuració de la instància (others_config)
     * @param {Object} twinDef - Definició del bessó (twins_config)
     * @param {number} instIdx - Índex únic de la instància dins othersConfig
     */
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

            const tid = otherConfig.twinId;
            const overlayHtml = this._getOverlayHtml(tid, twinDef.overlay.html);
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
                    } catch (e) { /* sandbox restriction */ }
                });
            } else {
                overlayContainer.innerHTML = `<div style="color:#7f8c8d;font-size:11px;text-align:center;padding:20px;">overlay: ${twinDef.overlay.html}</div>`;
                block.appendChild(overlayContainer);
            }
        }

        // FROM PLC i TO PLC
        const ioBody = document.createElement('div');
        ioBody.style.cssText = 'display:flex;gap:0;background:#1e1e1e;border-radius:0 0 8px 8px;border:1px solid rgba(255,255,255,0.1);border-top:none;';

        const ioConfig = otherConfig.ioConfig || {};
        const fromPLC = ioConfig.fromPLC || {};
        const toPLC = ioConfig.toPLC || {};

        // Columna FROM PLC
        const fromCol = document.createElement('div');
        fromCol.style.cssText = 'flex:1;padding:6px 8px;border-right:1px solid rgba(255,255,255,0.05);';
        if (Object.keys(fromPLC).length > 0) {
            fromCol.innerHTML = '<div style="color:#3498db;font-size:10px;font-weight:bold;margin-bottom:4px;">◄ FROM PLC</div>';
            Object.keys(fromPLC).forEach(sig => {
                const pin = this._createPin(sig, `inst:${instIdx}:from:${sig}`, 'left');
                fromCol.appendChild(pin);
            });
        }
        ioBody.appendChild(fromCol);

        // Columna TO PLC
        const toCol = document.createElement('div');
        toCol.style.cssText = 'flex:1;padding:6px 8px;';
        if (Object.keys(toPLC).length > 0) {
            toCol.innerHTML = '<div style="color:#e67e22;font-size:10px;font-weight:bold;margin-bottom:4px;">► TO PLC</div>';
            Object.keys(toPLC).forEach(sig => {
                const pin = this._createPin(sig, `inst:${instIdx}:to:${sig}`, 'right');
                toCol.appendChild(pin);
            });
        }
        ioBody.appendChild(toCol);

        block.appendChild(ioBody);
        this.viewport.appendChild(block);
    }

    // ====================================================================
    //  PIN D'ANCORATGE (punt de connexió)
    // ====================================================================

    _createPin(label, anchorId, side) {
        const row = document.createElement('div');
        const isLeft = side === 'left';
        row.style.cssText = `display:flex;align-items:center;gap:4px;margin:2px 0;${isLeft ? '' : 'flex-direction:row-reverse;'}`;

        const dot = document.createElement('span');
        dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:#ecf0f1;flex-shrink:0;border:1px solid rgba(0,0,0,0.3);';
        dot.dataset.anchorId = anchorId;

        const text = document.createElement('span');
        text.style.cssText = 'color:#ecf0f1;font-size:11px;font-family:monospace;white-space:nowrap;';
        text.textContent = label;

        row.appendChild(dot);
        row.appendChild(text);

        // Registrar ancoratge
        this.anchors[anchorId] = dot;

        return row;
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
    //  CONNEXIONS
    // ====================================================================

    _buildConnections(othersConfig) {
        this.connections = [];

        othersConfig.forEach((other, idx) => {
            if (other.type !== 'twin') return;
            const color = this.PALETTE[idx % this.PALETTE.length];
            const ioConfig = other.ioConfig || {};

            // FROM PLC: PLC sortida → bessó entrada
            Object.entries(ioConfig.fromPLC || {}).forEach(([sig, m]) => {
                // Pins digitals usen 'bit' (0-based), analògics usen 'channel' (1-based al projecte, 0-based als anchors)
                const bitOrChannel = (m.channel != null) ? (m.channel - 1) : (m.bit != null ? m.bit : 0);
                const iotvAnchor = `iotv:${this._normalizeAddr(m.vertebra)}:${m.rib}:${bitOrChannel}`;
                const twinAnchor = `inst:${idx}:from:${sig}`;
                this.connections.push({ from: twinAnchor, to: iotvAnchor, color });
            });

            // TO PLC: bessó escriu → PLC entrada
            Object.entries(ioConfig.toPLC || {}).forEach(([sig, m]) => {
                const bitOrChannel = (m.channel != null) ? (m.channel - 1) : (m.bit != null ? m.bit : 0);
                const iotvAnchor = `iotv:${this._normalizeAddr(m.vertebra)}:${m.rib}:${bitOrChannel}`;
                const twinAnchor = `inst:${idx}:to:${sig}`;
                this.connections.push({ from: twinAnchor, to: iotvAnchor, color });
            });
        });
    }

    _redrawLines() {
        if (!this.svgOverlay || !this.viewport) return;

        this.svgOverlay.innerHTML = '';

        let maxX = 2000, maxY = 2000;
        Object.values(this.positions).forEach(pos => {
            if (pos.x + 600 > maxX) maxX = pos.x + 600;
            if (pos.y + 800 > maxY) maxY = pos.y + 800;
        });
        this.svgOverlay.setAttribute('width', maxX);
        this.svgOverlay.setAttribute('height', maxY);
        this.svgOverlay.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);

        this.connections.forEach(conn => {
            const fromEl = this.anchors[conn.from];
            const toEl = this.anchors[conn.to];
            if (!fromEl || !toEl) return;

            const fromPt = this._getAnchorCenter(fromEl);
            const toPt = this._getAnchorCenter(toEl);
            if (!fromPt || !toPt) return;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', fromPt.x);
            line.setAttribute('y1', fromPt.y);
            line.setAttribute('x2', toPt.x);
            line.setAttribute('y2', toPt.y);
            line.setAttribute('stroke', conn.color);
            line.setAttribute('stroke-width', '2.5');
            line.setAttribute('stroke-opacity', '0.85');
            this.svgOverlay.appendChild(line);
        });
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
    //  ZOOM / PAN
    // ====================================================================

    _createZoomControls(container) {
        const t = window.t || (k => k);
        const bar = document.createElement('div');
        bar.style.cssText = 'position:absolute;bottom:10px;left:10px;z-index:200;display:flex;gap:4px;';

        const mkBtn = (label, action) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = 'padding:5px 10px;border:none;border-radius:4px;background:rgba(44,62,80,0.9);color:#ecf0f1;font-size:13px;cursor:pointer;';
            btn.addEventListener('click', action);
            return btn;
        };

        bar.appendChild(mkBtn('\uD83D\uDD0D+', () => this._zoom(1.2)));
        bar.appendChild(mkBtn('\uD83D\uDD0D\u2212', () => this._zoom(1 / 1.2)));
        bar.appendChild(mkBtn('\u21BA', () => this._resetView()));

        const saveBtn = mkBtn('\uD83D\uDCBE ' + (t('overview.save_btn') || 'Desa'), () => this._onSaveClick());
        saveBtn.style.marginLeft = '12px';
        bar.appendChild(saveBtn);

        container.appendChild(bar);

        this._zoomLabel = document.createElement('div');
        this._zoomLabel.style.cssText = 'position:absolute;bottom:12px;left:200px;z-index:200;color:#7f8c8d;font-size:11px;';
        this._zoomLabel.textContent = '100%';
        container.appendChild(this._zoomLabel);
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
    //  DESA - Renderer Canvas 2D pur (sense foreignObject)
    //
    //  FIX: Calcula anchorPts a partir de la geometria del canvas
    //       (mateixa fórmula que el dibuix), no del DOM.
    //       Usa inst-{idx} com a clau de bloc (no twin-{twinId}).
    // ====================================================================

    _captureToDataUrl() {
        if (!this.viewport) return null;

        const MARGIN = 30;
        const PIN_H = 16;
        const iotvConfig = this._getIotvConfig();
        const othersConfig = this._getOthersConfig();
        const twinsConfig = this._getTwinsConfig();
        if (!iotvConfig || !iotvConfig.vertebrae) return null;

        // Temporalment resetejar zoom per mesurar blocs
        const savedTransform = this.viewport.style.transform;
        const savedScale = this._scale;
        this.viewport.style.transform = 'translate(0px, 0px) scale(1)';
        this._scale = 1;
        this.viewport.offsetHeight; // force reflow

        const vpRect = this.viewport.getBoundingClientRect();
        const blocks = this.viewport.querySelectorAll('[data-block-id]');
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const blockRects = {};

        blocks.forEach(b => {
            const id = b.dataset.blockId;
            const rect = b.getBoundingClientRect();
            const x = rect.left - vpRect.left;
            const y = rect.top - vpRect.top;
            const w = rect.width;
            const h = rect.height;
            blockRects[id] = { x, y, w, h };
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x + w > maxX) maxX = x + w;
            if (y + h > maxY) maxY = y + h;
        });

        // Mesurar headerH real del DOM (en comptes de hardcoded)
        let iotvHeaderH = 52; // fallback
        const iotvBlock = this.viewport.querySelector('[data-block-id="iotv"]');
        if (iotvBlock) {
            const hdrEl = iotvBlock.querySelector('[data-iotv-header]');
            if (hdrEl) {
                iotvHeaderH = hdrEl.getBoundingClientRect().height;
            }
        }

        // Mesurar tots els anchor points del DOM (font de veritat)
        const domAnchorPts = {};
        Object.entries(this.anchors).forEach(([aid, el]) => {
            const r = el.getBoundingClientRect();
            domAnchorPts[aid] = {
                x: r.left - vpRect.left + r.width / 2,
                y: r.top - vpRect.top + r.height / 2
            };
        });

        // Restaurar zoom
        this._scale = savedScale;
        this.viewport.style.transform = savedTransform;

        if (minX === Infinity) return null;

        const W = Math.ceil(maxX - minX + MARGIN * 2);
        const H = Math.ceil(maxY - minY + MARGIN * 2);
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const offX = MARGIN - minX;
        const offY = MARGIN - minY;

        ctx.fillStyle = '#141422';
        ctx.fillRect(0, 0, W, H);

        // ---- Mapa d'anchorPts calculats geomètricament (NO del DOM) ----
        const anchorPts = {};

        // --- Bloc IoT-Vertebrae ---
        const iotvR = blockRects['iotv'];
        if (iotvR) {
            const bx = iotvR.x + offX;
            const by = iotvR.y + offY;
            const headerH = iotvHeaderH;
            const ribW = 95;
            const vertW = iotvR.w - ribW * 2;

            this._drawRoundedRect(ctx, bx, by, iotvR.w, headerH, 8, 8, 0, 0);
            ctx.fillStyle = '#2c3e50'; ctx.fill();
            ctx.strokeStyle = '#4a6785'; ctx.lineWidth = 2; ctx.stroke();

            ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('CAP IoT-Vertebrae', bx + iotvR.w / 2, by + 18);
            ctx.fillStyle = '#7f8c8d'; ctx.font = '11px sans-serif';
            ctx.fillText('MQTT / Raspberry Pi', bx + iotvR.w / 2, by + 33);
            ctx.beginPath(); ctx.arc(bx + iotvR.w / 2, by + 46, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#2ecc71'; ctx.fill();

            let vertY = by + headerH + 2;
            iotvConfig.vertebrae.forEach(v => {
                const addr = this._normalizeAddr(v.addr);
                const isDigital = v.type === 'digital';
                const nBits = isDigital ? 8 : 4;
                const inLabel = isDigital ? 'DI' : 'AI';
                const outLabel = isDigital ? 'DO' : 'AO';
                const ribH = 22 + nBits * PIN_H + 8;

                // Costella A
                ctx.fillStyle = this._getCostellaColor(v.type, v.costellaA);
                this._drawRoundedRect(ctx, bx, vertY, ribW, ribH, 6, 0, 0, 6);
                ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
                if (v.costellaA !== 'none') {
                    const labA = v.costellaA === 'input' ? inLabel : outLabel;
                    ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText('A \u2014 ' + (v.costellaA === 'input' ? 'ENTRADES' : 'SORTIDES'), bx + ribW / 2, vertY + 14);
                    for (let bit = 0; bit < nBits; bit++) {
                        const anchorKey = `iotv:${addr}:a:${bit}`;
                        const domPt = domAnchorPts[anchorKey];
                        const dotX = domPt ? (domPt.x + offX) : (bx + 12);
                        const py = domPt ? (domPt.y + offY) : (vertY + 22 + bit * PIN_H + PIN_H / 2);
                        ctx.beginPath(); ctx.arc(dotX, py, 4, 0, Math.PI * 2); ctx.fillStyle = '#ecf0f1'; ctx.fill();
                        ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillText(labA + (isDigital ? bit : bit + 1), dotX + 8, py + 4);
                        anchorPts[anchorKey] = { x: dotX, y: py };
                    }
                }

                // Central
                ctx.fillStyle = isDigital ? '#2c3e50' : '#1a252f';
                ctx.fillRect(bx + ribW, vertY, vertW, ribH);
                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.strokeRect(bx + ribW, vertY, vertW, ribH);
                const vertCx = bx + ribW + vertW / 2;
                ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('V\u00c8RTEBRA ' + (isDigital ? 'DIGITAL' : 'ANAL\u00d2GICA'), vertCx, vertY + ribH / 2 - 8);
                ctx.fillStyle = '#f39c12'; ctx.font = 'bold 16px sans-serif';
                ctx.fillText((isDigital ? 'D' : 'A') + ' ' + addr, vertCx, vertY + ribH / 2 + 12);
                ctx.fillStyle = '#7f8c8d'; ctx.font = '10px sans-serif';
                ctx.fillText('A          B', vertCx, vertY + ribH / 2 + 28);

                // Costella B
                ctx.fillStyle = this._getCostellaColor(v.type, v.costellaB);
                this._drawRoundedRect(ctx, bx + ribW + vertW, vertY, ribW, ribH, 0, 6, 6, 0);
                ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
                if (v.costellaB !== 'none') {
                    const labB = v.costellaB === 'input' ? inLabel : outLabel;
                    ctx.fillStyle = '#ecf0f1'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText('B \u2014 ' + (v.costellaB === 'input' ? 'ENTRADES' : 'SORTIDES'), bx + ribW + vertW + ribW / 2, vertY + 14);
                    for (let bit = 0; bit < nBits; bit++) {
                        const anchorKey = `iotv:${addr}:b:${bit}`;
                        const domPt = domAnchorPts[anchorKey];
                        const dotX = domPt ? (domPt.x + offX) : (bx + ribW + vertW + ribW - 12);
                        const py = domPt ? (domPt.y + offY) : (vertY + 22 + bit * PIN_H + PIN_H / 2);
                        ctx.beginPath(); ctx.arc(dotX, py, 4, 0, Math.PI * 2); ctx.fillStyle = '#ecf0f1'; ctx.fill();
                        ctx.font = '11px monospace'; ctx.textAlign = 'right'; ctx.fillText(labB + (isDigital ? bit : bit + 1), dotX - 8, py + 4);
                        anchorPts[anchorKey] = { x: dotX, y: py };
                    }
                }

                vertY += ribH + 2;
            });
        }

        // --- Blocs bessons (per instància, no per twinId) ---
        othersConfig.forEach((other, idx) => {
            if (other.type !== 'twin') return;
            const blockKey = `inst-${idx}`;
            const r = blockRects[blockKey];
            if (!r) return;
            const bx = r.x + offX;
            const by = r.y + offY;
            const color = this.PALETTE[idx % this.PALETTE.length];
            const twinDef = twinsConfig.find(tw => tw.twinId === other.twinId);

            const hdrH = 32;
            this._drawRoundedRect(ctx, bx, by, r.w, hdrH, 8, 8, 0, 0);
            ctx.fillStyle = color; ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(other.name || other.twinId, bx + r.w / 2, by + 21);

            let ioStartY = by + hdrH;
            if (twinDef && twinDef.overlay && twinDef.overlay.html) {
                const overlayH = twinDef.overlay.height || 150;
                ctx.fillStyle = '#1a1a2e'; ctx.fillRect(bx, ioStartY, r.w, overlayH);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.strokeRect(bx, ioStartY, r.w, overlayH);
                ctx.fillStyle = '#7f8c8d'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('overlay: ' + twinDef.overlay.html, bx + r.w / 2, ioStartY + overlayH / 2 + 4);
                ioStartY += overlayH;
            }

            const ioConfig = other.ioConfig || {};
            const fromKeys = Object.keys(ioConfig.fromPLC || {});
            const toKeys = Object.keys(ioConfig.toPLC || {});
            const maxSigs = Math.max(fromKeys.length, toKeys.length, 1);
            const ioH = 24 + maxSigs * PIN_H + 8;

            this._drawRoundedRect(ctx, bx, ioStartY, r.w, ioH, 0, 0, 8, 8);
            ctx.fillStyle = '#1e1e1e'; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke();

            if (fromKeys.length > 0) {
                ctx.fillStyle = '#3498db'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
                ctx.fillText('\u25c4 FROM PLC', bx + 8, ioStartY + 16);
                fromKeys.forEach((sig, i) => {
                    const anchorKey = `inst:${idx}:from:${sig}`;
                    const domPt = domAnchorPts[anchorKey];
                    const dotX = domPt ? (domPt.x + offX) : (bx + 12);
                    const py = domPt ? (domPt.y + offY) : (ioStartY + 24 + i * PIN_H + PIN_H / 2);
                    ctx.beginPath(); ctx.arc(dotX, py, 4, 0, Math.PI * 2); ctx.fillStyle = '#ecf0f1'; ctx.fill();
                    ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.fillText(sig, dotX + 8, py + 4);
                    anchorPts[anchorKey] = { x: dotX, y: py };
                });
            }
            if (toKeys.length > 0) {
                ctx.fillStyle = '#e67e22'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'right';
                ctx.fillText('\u25ba TO PLC', bx + r.w - 8, ioStartY + 16);
                toKeys.forEach((sig, i) => {
                    const anchorKey = `inst:${idx}:to:${sig}`;
                    const domPt = domAnchorPts[anchorKey];
                    const dotX = domPt ? (domPt.x + offX) : (bx + r.w - 12);
                    const py = domPt ? (domPt.y + offY) : (ioStartY + 24 + i * PIN_H + PIN_H / 2);
                    ctx.beginPath(); ctx.arc(dotX, py, 4, 0, Math.PI * 2); ctx.fillStyle = '#ecf0f1'; ctx.fill();
                    ctx.font = '11px monospace'; ctx.textAlign = 'right'; ctx.fillText(sig, dotX - 8, py + 4);
                    anchorPts[anchorKey] = { x: dotX, y: py };
                });
            }
        });

        // --- Línies de connexió ---
        // Usar coordenades DOM (font de veritat) convertides a espai canvas
        this.connections.forEach(conn => {
            // Prioritzar domAnchorPts (mesurat del DOM), fallback a anchorPts (geomètric)
            let fromPt = domAnchorPts[conn.from];
            let toPt = domAnchorPts[conn.to];
            if (fromPt) fromPt = { x: fromPt.x + offX, y: fromPt.y + offY };
            else fromPt = anchorPts[conn.from];
            if (toPt) toPt = { x: toPt.x + offX, y: toPt.y + offY };
            else toPt = anchorPts[conn.to];
            if (!fromPt || !toPt) return;
            ctx.beginPath();
            ctx.moveTo(fromPt.x, fromPt.y);
            ctx.lineTo(toPt.x, toPt.y);
            ctx.strokeStyle = conn.color;
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.85;
            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        return canvas.toDataURL('image/png');
    }

    _drawRoundedRect(ctx, x, y, w, h, tlr, trr, brr, blr) {
        ctx.beginPath();
        ctx.moveTo(x + tlr, y);
        ctx.lineTo(x + w - trr, y);
        if (trr) ctx.arcTo(x + w, y, x + w, y + trr, trr); else ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h - brr);
        if (brr) ctx.arcTo(x + w, y + h, x + w - brr, y + h, brr); else ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + blr, y + h);
        if (blr) ctx.arcTo(x, y + h, x, y + h - blr, blr); else ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + tlr);
        if (tlr) ctx.arcTo(x, y, x + tlr, y, tlr); else ctx.lineTo(x, y);
        ctx.closePath();
    }

    _onSaveClick() {
        const t = window.t || (k => k);
        try {
            const dataUrl = this._captureToDataUrl();
            if (!dataUrl) { console.warn('[GlobalOverview] No s\'ha pogut capturar'); return; }
            this._showSaveDialog(dataUrl);
        } catch (e) { console.error('[GlobalOverview] Error capturant:', e); }
    }

    _showSaveDialog(dataUrl) {
        const t = window.t || (k => k);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;';
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:#1e1e2e;border:1px solid #4a6785;border-radius:10px;padding:24px 28px;max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.6);';

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'color:#ecf0f1;font-weight:bold;font-size:15px;margin-bottom:12px;';
        titleEl.textContent = t('overview.save_title') || 'Desar esquema (sch.png)';
        dialog.appendChild(titleEl);

        const msgEl = document.createElement('div');
        msgEl.style.cssText = 'color:#bdc3c7;font-size:13px;margin-bottom:20px;line-height:1.5;';
        msgEl.textContent = t('overview.save_msg') || "S'ha generat l'arxiu sch.png. On voleu desar-lo?";
        dialog.appendChild(msgEl);

        const preview = document.createElement('img');
        preview.src = dataUrl;
        preview.style.cssText = 'width:100%;max-height:150px;object-fit:contain;border-radius:6px;border:1px solid rgba(255,255,255,0.1);margin-bottom:20px;background:#141422;';
        dialog.appendChild(preview);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
        const closeOv = () => { if (overlay.parentNode) document.body.removeChild(overlay); document.removeEventListener('keydown', onKey); };
        const mkB = (label, color, action) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = 'padding:8px 16px;border:none;border-radius:6px;background:' + color + ';color:#fff;font-size:13px;cursor:pointer;font-weight:500;';
            btn.addEventListener('click', () => { closeOv(); action(); });
            return btn;
        };
        btnRow.appendChild(mkB(t('overview.save_project') || 'Desar al projecte', '#2980b9', () => { this._saveToProject(dataUrl); this._showToast(t('overview.saved_project') || '\u2713 sch.png desat al projecte'); }));
        btnRow.appendChild(mkB(t('overview.save_disk') || 'Desar a disc', '#27ae60', () => { this._saveToDisk(dataUrl); this._showToast(t('overview.saved_disk') || '\u2713 sch.png descarregat'); }));
        btnRow.appendChild(mkB(t('overview.save_both') || 'Ambdues', '#8e44ad', () => { this._saveToProject(dataUrl); this._saveToDisk(dataUrl); this._showToast(t('overview.saved_both') || '\u2713 sch.png desat al projecte i descarregat'); }));
        btnRow.appendChild(mkB(t('overview.save_cancel') || 'Cancel\u00b7la', '#7f8c8d', () => {}));
        dialog.appendChild(btnRow);
        overlay.appendChild(dialog);

        const onKey = (e) => { if (e.key === 'Escape') closeOv(); };
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOv(); });
        document.body.appendChild(overlay);
    }

    _saveToProject(dataUrl) { window._schematicImage = dataUrl; console.log('[GlobalOverview] sch.png desat al projecte'); }

    _saveToDisk(dataUrl) {
        const a = document.createElement('a'); a.href = dataUrl; a.download = 'sch.png';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }

    _showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#2c3e50;color:#ecf0f1;padding:10px 24px;border-radius:8px;font-size:13px;z-index:10001;box-shadow:0 4px 16px rgba(0,0,0,0.4);transition:opacity 0.3s;';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { if (toast.parentNode) document.body.removeChild(toast); }, 300); }, 2500);
    }

    //  UTILITATS
    // ====================================================================

    _getIotvConfig() {
        if (window.VertebraeConfig) {
            return window.VertebraeConfig.getOrDefault();
        }
        return null;
    }

    _getOthersConfig() {
        if (typeof window.getAllBessoConfigs === 'function') {
            return window.getAllBessoConfigs() || [];
        }
        return [];
    }

    _getTwinsConfig() {
        if (window.TwinsConfigManager) {
            return window.TwinsConfigManager.export() || [];
        }
        return [];
    }

    _getOverlayHtml(twinId, filename) {
        if (window._twinsAssets) {
            const asset = window._twinsAssets[filename] ||
                          window._twinsAssets[`twins/${filename}`] ||
                          window._twinsAssets[`overlay_${twinId}.html`];
            if (asset) return asset;
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
}

// Singleton global
window.GlobalOverview = new GlobalOverview();
