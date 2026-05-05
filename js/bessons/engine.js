/**
 * TwinEngine s9a - Motor genèric per bessons digitals declaratius
 * 
 * Canals analògics: JSON usa 1-4 (serigrafia), intern 0-3
 * fromPLC: llegeix .out (sortides PLC → bessó)
 * toPLC: escriu .in (bessó → entrades PLC)
 */

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

class TwinComponent {
    constructor(def, engine) {
        this.id = def.id;
        this.type = def.type;
        this.props = def.props || {};
        this.binding = def.binding || {};
        this.position = def.position || null;
        this.engine = engine;
        this.element = null;
    }
    render(parent, x, y) {}
    updateState(value) {}
}

class LedComponent extends TwinComponent {
    constructor(def, engine) { super(def, engine); this.state = 0; }

    render(parent, x, y) {
        const label = this.props.label || this.id;
        const g = this.engine._svg('g', { transform: `translate(${x},${y})` });
        this.led = this.engine._svg('circle', { cx:25, cy:25, r:18, fill: this.props.color_off||'#440000', stroke:'#666', 'stroke-width':2 });
        g.appendChild(this.led);
        g.appendChild(this.engine._svg('text', { x:60, y:30, fill:'#ecf0f1', 'font-size':13, 'font-weight':600 }, label));
        this.txt = this.engine._svg('text', { x:25, y:55, fill:'#7f8c8d', 'font-size':10, 'text-anchor':'middle' }, 'OFF');
        g.appendChild(this.txt);
        parent.appendChild(g);
        this.element = g;
    }

    updateState(value) {
        this.state = value ? 1 : 0;
        const on = this.props.color_on || '#ff4444', off = this.props.color_off || '#440000';
        if (this.led) {
            this.led.setAttribute('fill', this.state ? on : off);
            this.led.style.filter = this.state ? `drop-shadow(0 0 6px ${on})` : 'none';
        }
        if (this.txt) {
            this.txt.textContent = this.state ? 'ON' : 'OFF';
            this.txt.setAttribute('fill', this.state ? '#2ecc71' : '#7f8c8d');
        }
    }
}

class SwitchComponent extends TwinComponent {
    constructor(def, engine) {
        super(def, engine);
        this.state = 0;
        this.isMomentary = (this.props.style === 'momentary');
    }

    render(parent, x, y) {
        const label = this.props.label || this.id;
        const g = this.engine._svg('g', { transform: `translate(${x},${y})` });
        g.style.cursor = 'pointer';
        this.track = this.engine._svg('rect', { x:0, y:10, width:50, height:28, rx:14, fill:'#95a5a6', stroke:'#333', 'stroke-width':2 });
        g.appendChild(this.track);
        this.toggle = this.engine._svg('circle', { cx:14, cy:24, r:10, fill:'white' });
        g.appendChild(this.toggle);
        g.appendChild(this.engine._svg('text', { x:60, y:30, fill:'#ecf0f1', 'font-size':13, 'font-weight':600 }, label));
        this.txt = this.engine._svg('text', { x:25, y:55, fill:'#7f8c8d', 'font-size':10, 'text-anchor':'middle' }, '0');
        g.appendChild(this.txt);

        if (this.isMomentary) {
            g.addEventListener('mousedown', () => this._set(1));
            g.addEventListener('mouseup', () => this._set(0));
            g.addEventListener('mouseleave', () => { if (this.state) this._set(0); });
        } else {
            g.addEventListener('click', () => this._set(this.state ? 0 : 1));
        }
        parent.appendChild(g);
        this.element = g;
    }

    _set(v) {
        this.state = v;
        this._visual();
        const sig = this.binding.toPLC;
        if (sig) this.engine._writeToPLC(sig, v);
    }

    _visual() {
        if (this.track) this.track.setAttribute('fill', this.state ? '#2ecc71' : '#95a5a6');
        if (this.toggle) this.toggle.setAttribute('cx', this.state ? '36' : '14');
        if (this.txt) {
            this.txt.textContent = this.state ? '1' : '0';
            this.txt.setAttribute('fill', this.state ? '#2ecc71' : '#7f8c8d');
        }
    }

    updateState(v) { this.state = v ? 1 : 0; this._visual(); }
}

class GaugeComponent extends TwinComponent {
    constructor(def, engine) {
        super(def, engine);
        this.value = 0;
        this.min = this.props.min !== undefined ? this.props.min : 0;
        this.max = this.props.max !== undefined ? this.props.max : 10;
    }

    render(parent, x, y) {
        const label = this.props.label || this.id;
        const unit = this.props.unit || 'V';
        const style = this.props.style || 'bar';
        const g = this.engine._svg('g', { transform: `translate(${x},${y})` });
        g.appendChild(this.engine._svg('text', { x:0, y:12, fill:'#ecf0f1', 'font-size':12, 'font-weight':600 }, label));

        if (style === 'bar') {
            g.appendChild(this.engine._svg('rect', { x:0, y:20, width:140, height:16, rx:3, fill:'#2c3e50', stroke:'#7f8c8d', 'stroke-width':1 }));
            this.bar = this.engine._svg('rect', { x:1, y:21, width:0, height:14, rx:2, fill:'#3498db' });
            g.appendChild(this.bar);
            this.vTxt = this.engine._svg('text', { x:150, y:33, fill:'#ecf0f1', 'font-size':13, 'font-family':'monospace' }, `${this.min.toFixed(1)}${unit}`);
            g.appendChild(this.vTxt);
        } else {
            g.appendChild(this.engine._svg('rect', { x:0, y:18, width:120, height:32, fill:'#000', stroke:'#2ecc71', 'stroke-width':2 }));
            this.vTxt = this.engine._svg('text', { x:10, y:42, fill:'#0f0', 'font-family':'monospace', 'font-size':18, 'font-weight':'bold' }, `${this.min.toFixed(1)}${unit}`);
            g.appendChild(this.vTxt);
        }
        parent.appendChild(g);
        this.element = g;
    }

    updateState(v) {
        this.value = v;
        const unit = this.props.unit || 'V';
        if (this.vTxt) this.vTxt.textContent = `${v.toFixed(1)}${unit}`;
        if (this.bar) {
            const range = this.max - this.min;
            const pct = range > 0 ? Math.max(0, Math.min(1, (v - this.min) / range)) : 0;
            this.bar.setAttribute('width', (pct * 138).toFixed(1));
        }
    }
}

class SliderComponent extends TwinComponent {
    constructor(def, engine) {
        super(def, engine);
        this.min = this.props.min !== undefined ? this.props.min : -10;
        this.max = this.props.max !== undefined ? this.props.max : 10;
        this.step = this.props.step || 0.1;
        this.value = this.min;
        this.dragging = false;
    }

    render(parent, x, y) {
        const label = this.props.label || this.id;
        const unit = this.props.unit || 'V';
        const g = this.engine._svg('g', { transform: `translate(${x},${y})` });
        g.appendChild(this.engine._svg('text', { x:0, y:12, fill:'#ecf0f1', 'font-size':12, 'font-weight':600 }, label));

        this.trackEl = this.engine._svg('rect', { x:0, y:24, width:160, height:8, rx:4, fill:'#7f8c8d' });
        g.appendChild(this.trackEl);
        const pct = (this.value - this.min) / (this.max - this.min);
        this.thumb = this.engine._svg('circle', { cx: pct * 160, cy:28, r:10, fill:'#3498db', stroke:'white', 'stroke-width':2 });
        this.thumb.style.cursor = 'pointer';
        g.appendChild(this.thumb);
        this.vTxt = this.engine._svg('text', { x:170, y:32, fill:'#ecf0f1', 'font-size':13, 'font-family':'monospace' }, `${this.value.toFixed(1)}${unit}`);
        g.appendChild(this.vTxt);

        this.thumb.addEventListener('mousedown', (e) => { this.dragging = true; e.preventDefault(); e.stopPropagation(); });
        const svg = this.engine.svg;
        svg.addEventListener('mousemove', (e) => {
            if (!this.dragging) return;
            const r = this.trackEl.getBoundingClientRect();
            const px = Math.max(r.left, Math.min(e.clientX, r.right));
            const p = (px - r.left) / r.width;
            this.value = Math.round((this.min + p * (this.max - this.min)) / this.step) * this.step;
            this.value = Math.max(this.min, Math.min(this.max, this.value));
            this._visual();
            const sig = this.binding.toPLC;
            if (sig) this.engine._writeToPLC(sig, this.value);
        });
        const stop = () => { this.dragging = false; };
        svg.addEventListener('mouseup', stop);
        document.addEventListener('mouseup', stop);

        parent.appendChild(g);
        this.element = g;
    }

    _visual() {
        const unit = this.props.unit || 'V';
        const range = this.max - this.min;
        const pct = range > 0 ? (this.value - this.min) / range : 0;
        if (this.thumb) this.thumb.setAttribute('cx', (pct * 160).toString());
        if (this.vTxt) this.vTxt.textContent = `${this.value.toFixed(1)}${unit}`;
    }

    updateState(v) { this.value = v; this._visual(); }
}

// ─── TWIN ENGINE ────────────────────────────────────────────────────────────

const TWIN_COMPONENT_TYPES = {
    'led': LedComponent, 'switch': SwitchComponent,
    'gauge': GaugeComponent, 'slider': SliderComponent
};

class TwinEngine {
    constructor(container, definition, ioConfig) {
        this.container = container;
        this.definition = definition;
        this.ioConfig = ioConfig;
        this.components = [];
        this.signalMap = {};
        this.svg = null;
        this.fromPLC = ioConfig.fromPLC || {};
        this.toPLC = ioConfig.toPLC || {};
        this._onDigitalChanged = null;
        this._onAnalogChanged = null;
    }

    /** Canal 1-4 (JSON/serigrafia) → 0-3 (PLCMemory intern) */
    _ch(c) { return (c || 1) - 1; }
    /** Normalitzar adreça */
    _norm(a) { return a ? a.toUpperCase() : ''; }
    /** Crear SVG element */
    _svg(tag, attrs, text) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        if (text !== undefined) el.textContent = text;
        return el;
    }

    init() {
        this._buildDOM();
        this._createOverlay();
        this._createPhoto();
        this._createComponents();
        this._subscribeEvents();
        this._syncFromMemory();
    }

    _buildDOM() {
        this.container.style.cssText = 'width:100%;height:100%;overflow:hidden;background:#1e1e1e;display:flex;flex-direction:column;';
        const meta = this.definition.meta || {};
        const visual = this.definition.visual || {};
        const overlay = this.definition.overlay || null;
        const photo = this.definition.photo || null;
        const comps = this.definition.components || [];
        const fromC = comps.filter(c => c.binding && c.binding.fromPLC);
        const toC = comps.filter(c => c.binding && c.binding.toPLC);
        const rows = Math.max(fromC.length, toC.length, 1);
        const w = visual.width || 400;

        // Overlay height (si existeix, els components van a sota)
        this.overlayHeight = overlay ? (overlay.height || 150) : 0;
        
        // SVG height = títol + components (overlay va fora de l'SVG)
        const componentsH = rows * 65 + 80;
        const h = Math.max(visual.height || 150, componentsH);

        // Checkbox foto/overlay toggle (només si hi ha foto I overlay)
        if (photo && overlay) {
            const t = window.t || (k => k);
            this.photoToggleBar = document.createElement('div');
            this.photoToggleBar.style.cssText = `
                padding: 4px 10px; background: #2c3e50; border-bottom: 1px solid #333;
                display: flex; align-items: center; gap: 6px; flex-shrink: 0;
            `;
            const label = document.createElement('label');
            label.style.cssText = 'font-size: 12px; color: #bdc3c7; cursor: pointer; user-select: none; display: flex; align-items: center; gap: 4px;';
            this.photoCheckbox = document.createElement('input');
            this.photoCheckbox.type = 'checkbox';
            this.photoCheckbox.style.cursor = 'pointer';
            const labelText = document.createTextNode(t('twin.photo_checkbox'));
            label.appendChild(this.photoCheckbox);
            label.appendChild(labelText);
            this.photoToggleBar.appendChild(label);
            this.container.appendChild(this.photoToggleBar);

            this.photoCheckbox.addEventListener('change', () => {
                this._togglePhotoOverlay(this.photoCheckbox.checked);
            });
        }

        this.svg = this._svg('svg', { width:'100%', viewBox:`0 0 ${w} ${h}`, preserveAspectRatio:'xMidYMid meet' });
        this.svg.style.cssText = `background:${visual.background || '#1e1e1e'};flex-shrink:0;`;

        if (meta.name) {
            const nameText = this._svg('text', { x:w/2, y:22, 'text-anchor':'middle', fill:'#ecf0f1', 'font-size':15, 'font-weight':'bold' }, meta.name);
            if (meta.href) {
                nameText.style.cursor = 'pointer';
                nameText.style.textDecoration = 'none';
                nameText.addEventListener('mouseenter', () => { nameText.style.textDecoration = 'underline'; nameText.setAttribute('fill', '#3498db'); });
                nameText.addEventListener('mouseleave', () => { nameText.style.textDecoration = 'none'; nameText.setAttribute('fill', '#ecf0f1'); });
                nameText.addEventListener('click', () => { window.open(meta.href, '_blank'); });
            }
            this.svg.appendChild(nameText);
        }
        if (fromC.length) this.svg.appendChild(this._svg('text', { x:10, y:50, fill:'#3498db', 'font-size':11, 'font-weight':'bold' }, '◄ FROM PLC'));
        if (toC.length) this.svg.appendChild(this._svg('text', { x:w/2+10, y:50, fill:'#e67e22', 'font-size':11, 'font-weight':'bold' }, '► TO PLC'));
        
        // Ordre: overlay primer, SVG amb components a sota
        this.container.appendChild(this.svg);
    }

    /**
     * Crear overlay HTML (si definit)
     * L'overlay es renderitza com un iframe dins un div, ABANS de l'SVG
     */
    _createOverlay() {
        const overlay = this.definition.overlay;
        if (!overlay) return;

        this.overlayContainer = document.createElement('div');
        this.overlayContainer.style.cssText = `
            width:100%; height:${overlay.height || 150}px; flex-shrink:0;
            background:${overlay.background || '#1a1a2e'}; overflow:hidden;
            border-bottom: 1px solid #333;
        `;

        // Obtenir HTML: inline o des de twinsAssets
        let htmlContent = '';
        if (overlay.content) {
            // Inline HTML
            htmlContent = overlay.content;
        } else if (overlay.html && window._twinsAssets) {
            // HTML des de fitxer importat (emmagatzemat a _twinsAssets)
            htmlContent = window._twinsAssets[overlay.html] || '';
        }

        if (!htmlContent) {
            this.overlayContainer.innerHTML = `<div style="color:#666;text-align:center;padding:20px;">Overlay: ${overlay.html || '(buit)'}</div>`;
            this.container.insertBefore(this.overlayContainer, this.svg);
            return;
        }

        // Substituir referències a imatges per base64 si disponibles
        if (window._twinsAssets) {
            htmlContent = htmlContent.replace(/src=["']([^"']+)["']/g, (match, filename) => {
                const b64 = window._twinsAssets[filename];
                if (b64 && b64.startsWith('data:')) return `src="${b64}"`;
                return match;
            });
        }

        // Crear iframe sandboxed
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        iframe.setAttribute('sandbox', 'allow-scripts');
        
        // Envoltar l'HTML amb un wrapper que escolta postMessage
        const wrappedHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:${overlay.background || '#1a1a2e'};color:#ecf0f1;font-family:sans-serif;overflow:hidden;}</style>
</head><body>
${htmlContent}
<script>
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'twin-signals') {
        if (typeof window.onTwinSignals === 'function') {
            window.onTwinSignals(e.data.signals);
        }
    }
});
<\/script>
</body></html>`;
        
        iframe.srcdoc = wrappedHTML;
        this.overlayIframe = iframe;
        this.overlayContainer.appendChild(iframe);
        this.container.insertBefore(this.overlayContainer, this.svg);

        // Escoltar missatges de l'overlay iframe (twin-write-signal)
        // Permet que l'overlay escrigui senyals toPLC i sincronitzi components
        this._onOverlayMessage = (e) => {
            if (!e.data || e.data.type !== 'twin-write-signal') return;
            // Verificar que el missatge ve del nostre iframe
            if (!this.overlayIframe || !this.overlayIframe.contentWindow) return;
            if (e.source !== this.overlayIframe.contentWindow) return;

            const { signal, value } = e.data;
            if (!signal || !this.toPLC[signal]) return;

            // Escriure al PLC
            this._writeToPLC(signal, value);

            // Sincronitzar component visual (switch) si existeix
            const entry = this.signalMap[signal];
            if (entry && entry.component && entry.direction === 'toPLC') {
                entry.component.updateState(value);
            }
        };
        window.addEventListener('message', this._onOverlayMessage);
    }

    /**
     * Enviar senyals actualitzats a l'overlay iframe
     */
    _updateOverlay() {
        if (!this.overlayIframe || !this.overlayIframe.contentWindow) return;
        
        const signals = {};
        // Recollir valors fromPLC (sortides del PLC)
        const mem = window.PLCMemory; if (!mem) return;
        Object.entries(this.fromPLC).forEach(([sig, m]) => {
            if (m.type === 'analog') {
                const me = mem.analog.get(mem._normalizeAddress(m.vertebra));
                if (me && me[m.rib]) signals[sig] = me[m.rib].out[this._ch(m.channel)];
            } else {
                signals[sig] = this._readOutputBit(m.vertebra, m.rib, m.bit);
            }
        });
        // Recollir valors toPLC (entrades al PLC)
        Object.entries(this.toPLC).forEach(([sig, m]) => {
            if (m.type === 'analog') {
                const me = mem.analog.get(mem._normalizeAddress(m.vertebra));
                if (me && me[m.rib]) signals[sig] = me[m.rib].in[this._ch(m.channel)];
            } else {
                const entry = mem.digital.get(mem._normalizeAddress(m.vertebra));
                if (entry && entry[m.rib]) signals[sig] = (entry[m.rib].in[0] >> m.bit) & 1;
            }
        });
        
        try {
            this.overlayIframe.contentWindow.postMessage({ type: 'twin-signals', signals }, '*');
        } catch(e) { /* iframe may not be ready */ }
    }

    /**
     * Crear contenidor de fotografia (si definit)
     * La foto es renderitza com un <img> dins un div
     */
    _createPhoto() {
        const photo = this.definition.photo;
        if (!photo) return;

        this.photoContainer = document.createElement('div');
        const overlay = this.definition.overlay;
        const photoHeight = overlay ? (overlay.height || 150) : 150;
        this.photoContainer.style.cssText = `
            width:100%; height:${photoHeight}px; flex-shrink:0;
            background:#1a1a2e; overflow:hidden;
            border-bottom: 1px solid #333;
            display: flex; align-items: center; justify-content: center;
        `;

        // Obtenir imatge des de _twinsAssets
        let imgSrc = '';
        if (window._twinsAssets && window._twinsAssets[photo]) {
            imgSrc = window._twinsAssets[photo];
        }

        if (!imgSrc) {
            this.photoContainer.innerHTML = `<div style="color:#666;text-align:center;padding:20px;">📷 ${photo} (no trobat)</div>`;
        } else {
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = photo;
            img.style.cssText = 'width:100%; height:100%; object-fit:contain; object-position:center;';
            this.photoContainer.appendChild(img);
        }

        // Si NO hi ha overlay, la foto va al lloc de l'overlay (abans de l'SVG)
        // Si hi ha overlay, la foto es crea oculta
        if (overlay) {
            this.photoContainer.style.display = 'none';
            // Inserir just abans de l'SVG (al costat de l'overlay)
            this.container.insertBefore(this.photoContainer, this.svg);
        } else {
            // Foto al lloc de l'overlay
            this.container.insertBefore(this.photoContainer, this.svg);
        }
    }

    /**
     * Alternar entre foto i overlay (quan tots dos existeixen)
     */
    _togglePhotoOverlay(showPhoto) {
        if (this.overlayContainer) {
            this.overlayContainer.style.display = showPhoto ? 'none' : '';
        }
        if (this.photoContainer) {
            this.photoContainer.style.display = showPhoto ? '' : 'none';
        }
    }

    _createComponents() {
        const comps = this.definition.components || [];
        const w = (this.definition.visual || {}).width || 400;
        const labelOverrides = this.ioConfig.labelOverrides || {};
        const fromC = comps.filter(c => c.binding && c.binding.fromPLC);
        const toC = comps.filter(c => c.binding && c.binding.toPLC);

        fromC.forEach((def, i) => {
            const Cls = TWIN_COMPONENT_TYPES[def.type]; if (!Cls) return;
            // Aplicar labelOverride si existeix (per signalId)
            const sigId = def.binding.fromPLC;
            if (sigId && labelOverrides[sigId]) {
                def = JSON.parse(JSON.stringify(def));
                def.props = def.props || {};
                def.props.label = labelOverrides[sigId];
            }
            const comp = new Cls(def, this);
            comp.render(this.svg, def.position ? def.position.x : 15, def.position ? def.position.y : 60 + i * 65);
            this.components.push(comp);
            if (def.binding.fromPLC) this.signalMap[def.binding.fromPLC] = { component: comp, direction: 'fromPLC' };
        });

        toC.forEach((def, i) => {
            const Cls = TWIN_COMPONENT_TYPES[def.type]; if (!Cls) return;
            // Aplicar labelOverride si existeix (per signalId)
            const sigId = def.binding.toPLC;
            if (sigId && labelOverrides[sigId]) {
                def = JSON.parse(JSON.stringify(def));
                def.props = def.props || {};
                def.props.label = labelOverrides[sigId];
            }
            const comp = new Cls(def, this);
            comp.render(this.svg, def.position ? def.position.x : w/2+10, def.position ? def.position.y : 60 + i * 65);
            this.components.push(comp);
            if (def.binding.toPLC) this.signalMap[def.binding.toPLC] = { component: comp, direction: 'toPLC' };
        });
    }

    // ─── PLC IO ─────────────────────────────────────────────────────────────

    _writeToPLC(signalId, value) {
        const m = this.toPLC[signalId]; if (!m) return;
        const mem = window.PLCMemory; if (!mem) return;
        if (m.type === 'analog') {
            mem.writeAnalogInputChannel(m.vertebra, m.rib, this._ch(m.channel), value);
        } else {
            mem.writeDigitalInputBit(m.vertebra, m.rib, m.bit, value ? 1 : 0);
        }
    }

    /**
     * Llegir bit digital de .out (sortides del PLC)
     * readDigitalBit llegeix .in, però fromPLC necessita .out
     */
    _readOutputBit(vertebra, rib, bit) {
        const mem = window.PLCMemory; if (!mem) return 0;
        const entry = mem.digital.get(mem._normalizeAddress(vertebra));
        if (!entry || !entry[rib]) return 0;
        return (entry[rib].out[0] >> bit) & 1;
    }

    _subscribeEvents() {
        const EB = window.EventBus; if (!EB) return;

        this._onDigitalChanged = (data) => {
            if (data.reset || !data.addr || data.side === undefined) return;
            // fromPLC: actualitzar LEDs i sortides
            Object.entries(this.fromPLC).forEach(([sig, m]) => {
                if (m.type === 'analog') return;
                if (this._norm(data.addr) === this._norm(m.vertebra) && data.side === m.rib) {
                    const val = this._readOutputBit(m.vertebra, m.rib, m.bit);
                    const e = this.signalMap[sig];
                    if (e && e.component) e.component.updateState(val);
                }
            });
            // toPLC: sincronitzar switches (bidireccional, com els sliders analògics)
            const mem = window.PLCMemory; if (mem) {
                Object.entries(this.toPLC).forEach(([sig, m]) => {
                    if (m.type === 'analog') return;
                    if (this._norm(data.addr) === this._norm(m.vertebra) && data.side === m.rib) {
                        const entry = mem.digital.get(mem._normalizeAddress(m.vertebra));
                        if (entry && entry[m.rib]) {
                            const val = (entry[m.rib].in[0] >> m.bit) & 1;
                            const e = this.signalMap[sig];
                            if (e && e.component) e.component.updateState(val);
                        }
                    }
                });
            }
            this._updateOverlay();
        };

        this._onAnalogChanged = (data) => {
            if (data.reset || !data.addr || data.side === undefined || data.channel === undefined) return;
            const da = this._norm(data.addr);
            const mem = window.PLCMemory; if (!mem) return;

            // Gauges (fromPLC) → .out
            Object.entries(this.fromPLC).forEach(([sig, m]) => {
                if (m.type !== 'analog') return;
                if (da !== this._norm(m.vertebra) || data.side !== m.rib || data.channel !== this._ch(m.channel)) return;
                const me = mem.analog.get(mem._normalizeAddress(m.vertebra));
                if (me && me[m.rib]) {
                    const e = this.signalMap[sig];
                    if (e && e.component) e.component.updateState(me[m.rib].out[this._ch(m.channel)]);
                }
            });

            // Sliders (toPLC) → .in (sync amb canvas slider)
            Object.entries(this.toPLC).forEach(([sig, m]) => {
                if (m.type !== 'analog') return;
                if (da !== this._norm(m.vertebra) || data.side !== m.rib || data.channel !== this._ch(m.channel)) return;
                const me = mem.analog.get(mem._normalizeAddress(m.vertebra));
                if (me && me[m.rib]) {
                    const e = this.signalMap[sig];
                    if (e && e.component && !e.component.dragging) {
                        e.component.updateState(me[m.rib].in[this._ch(m.channel)]);
                    }
                }
            });
            this._updateOverlay();
        };

        EB.on(EB.EVENTS.MEMORY_DIGITAL_CHANGED, this._onDigitalChanged);
        EB.on(EB.EVENTS.MEMORY_ANALOG_CHANGED, this._onAnalogChanged);
    }

    _syncFromMemory() {
        const mem = window.PLCMemory; if (!mem) return;

        Object.entries(this.fromPLC).forEach(([sig, m]) => {
            const e = this.signalMap[sig]; if (!e || !e.component) return;
            if (m.type === 'analog') {
                const me = mem.analog.get(mem._normalizeAddress(m.vertebra));
                if (me && me[m.rib]) e.component.updateState(me[m.rib].out[this._ch(m.channel)]);
            } else {
                e.component.updateState(this._readOutputBit(m.vertebra, m.rib, m.bit));
            }
        });

        Object.entries(this.toPLC).forEach(([sig, m]) => {
            if (m.type !== 'analog') return;
            const e = this.signalMap[sig]; if (!e || !e.component) return;
            const me = mem.analog.get(mem._normalizeAddress(m.vertebra));
            if (me && me[m.rib]) e.component.updateState(me[m.rib].in[this._ch(m.channel)]);
        });
        
        // Actualitzar overlay amb delay (iframe pot no estar llest)
        if (this.definition.overlay) {
            setTimeout(() => this._updateOverlay(), 200);
        }
    }

    destroy() {
        const EB = window.EventBus;
        if (EB) {
            if (this._onDigitalChanged) EB.off(EB.EVENTS.MEMORY_DIGITAL_CHANGED, this._onDigitalChanged);
            if (this._onAnalogChanged) EB.off(EB.EVENTS.MEMORY_ANALOG_CHANGED, this._onAnalogChanged);
        }
        if (this._onOverlayMessage) {
            window.removeEventListener('message', this._onOverlayMessage);
            this._onOverlayMessage = null;
        }
        this.overlayIframe = null;
        this.photoContainer = null;
        this.photoCheckbox = null;
        this.photoToggleBar = null;
        if (this.container) this.container.innerHTML = '';
    }
}

// ─── TWINS CONFIG MANAGER ───────────────────────────────────────────────────

class TwinsConfigManager {
    constructor() { this.catalog = []; }
    load(defs) { if (Array.isArray(defs)) this.catalog = JSON.parse(JSON.stringify(defs)); }
    get(twinId) { return this.catalog.find(d => d.twinId === twinId) || null; }
    getAll() { return JSON.parse(JSON.stringify(this.catalog)); }
    update(defs) { this.load(defs); }
    export() { return JSON.parse(JSON.stringify(this.catalog)); }
}

// ─── EXPORTAR ───────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.TwinEngine = TwinEngine;
    window.TwinsConfigManager = new TwinsConfigManager();
}

console.log('✓ TwinEngine + TwinsConfigManager loaded (s9a)');
