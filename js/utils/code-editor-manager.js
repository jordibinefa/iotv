/**
 * CodeEditorManager - Gestor d'editors de codi amb CodeMirror 6
 * 
 * CM6 es carrega des de lib/codemirror6-bundle.min.js (IIFE síncron)
 * que exposa window._CM6 amb tots els símbols necessaris.
 * Bundle construit amb esbuild — una sola còpia de @codemirror/state.
 * 
 * Ús:
 *   const editor = await CodeEditorManager.create(container, { language: 'python' });
 *   editor.getValue() / editor.setValue(code) / editor.destroy()
 */

const CodeEditorManager = (() => {
    const CM = window._CM6;
    
    if (!CM) {
        console.error('[CodeEditorManager] window._CM6 no trobat! Assegura\'t que lib/codemirror6-bundle.min.js es carrega ABANS d\'aquest script.');
    }

    let _iotvTheme = null;
    let _iotvHighlightStyle = null;
    let _themeCreated = false;

    function _ensureTheme() {
        if (_themeCreated) return;
        _themeCreated = true;

        _iotvTheme = CM.EditorView.theme({
            '&': {
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                fontSize: '14px',
                height: '100%'
            },
            '&.cm-focused': { outline: 'none' },
            '.cm-content': {
                fontFamily: "'Courier New', monospace",
                padding: '8px 0',
                caretColor: '#569cd6'
            },
            '.cm-cursor, .cm-dropCursor': {
                borderLeftColor: '#569cd6',
                borderLeftWidth: '2px'
            },
            '.cm-selectionBackground, ::selection': {
                backgroundColor: '#264f78 !important'
            },
            '.cm-activeLine': { backgroundColor: '#2a2d2e' },
            '.cm-activeLineGutter': { backgroundColor: '#2a2d2e', color: '#c6c6c6' },
            '.cm-gutters': {
                backgroundColor: '#1e1e1e',
                color: '#858585',
                border: 'none',
                borderRight: '1px solid #333333'
            },
            '.cm-lineNumbers .cm-gutterElement': {
                padding: '0 8px 0 12px',
                minWidth: '32px'
            },
            '.cm-foldGutter .cm-gutterElement': { padding: '0 4px' },
            '.cm-tooltip': {
                backgroundColor: '#252526',
                color: '#d4d4d4',
                border: '1px solid #454545',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            },
            '.cm-tooltip-autocomplete': {
                '& > ul > li': { padding: '4px 8px' },
                '& > ul > li[aria-selected]': { backgroundColor: '#04395e', color: '#ffffff' }
            },
            '.cm-completionLabel': { fontSize: '13px' },
            '.cm-completionDetail': {
                fontSize: '12px', color: '#858585', fontStyle: 'italic', marginLeft: '8px'
            },
            '&.cm-focused .cm-matchingBracket': {
                backgroundColor: '#3a3a3a', outline: '1px solid #888'
            },
            '.cm-searchMatch': { backgroundColor: '#515c6a', borderRadius: '2px' },
            '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#473d29' },
            '.cm-foldPlaceholder': {
                backgroundColor: '#2c3e50', color: '#6a9955', border: 'none', padding: '0 4px'
            },
            '.cm-scroller': {
                overflow: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#555 #1e1e1e'
            },
            '.cm-lintRange-error': { backgroundImage: 'none', borderBottom: '2px wavy #e74c3c' },
            '.cm-lintRange-warning': { backgroundImage: 'none', borderBottom: '2px wavy #f39c12' },
            '.cm-diagnostic-error': { borderLeft: '3px solid #e74c3c', color: '#d4d4d4', padding: '3px 6px' },
            '.cm-diagnostic-warning': { borderLeft: '3px solid #f39c12', color: '#d4d4d4', padding: '3px 6px' }
        }, { dark: true });

        _iotvHighlightStyle = CM.HighlightStyle.define([
            { tag: CM.tags.keyword, color: '#569cd6' },
            { tag: CM.tags.controlKeyword, color: '#c586c0' },
            { tag: CM.tags.operator, color: '#d4d4d4' },
            { tag: CM.tags.number, color: '#b5cea8' },
            { tag: CM.tags.string, color: '#ce9178' },
            { tag: CM.tags.bool, color: '#569cd6' },
            { tag: CM.tags.null, color: '#569cd6' },
            { tag: CM.tags.comment, color: '#6a9955', fontStyle: 'italic' },
            { tag: CM.tags.variableName, color: '#9cdcfe' },
            { tag: CM.tags.definition(CM.tags.variableName), color: '#dcdcaa' },
            { tag: CM.tags.function(CM.tags.variableName), color: '#dcdcaa' },
            { tag: CM.tags.propertyName, color: '#9cdcfe' },
            { tag: CM.tags.typeName, color: '#4ec9b0' },
            { tag: CM.tags.className, color: '#4ec9b0' },
            { tag: CM.tags.self, color: '#569cd6' },
            { tag: CM.tags.bracket, color: '#ffd700' },
            { tag: CM.tags.punctuation, color: '#d4d4d4' },
            { tag: CM.tags.meta, color: '#569cd6' },
            { tag: CM.tags.attributeName, color: '#9cdcfe' },
            { tag: CM.tags.attributeValue, color: '#ce9178' },
            { tag: CM.tags.regexp, color: '#d16969' },
            { tag: CM.tags.escape, color: '#d7ba7d' },
            { tag: CM.tags.special(CM.tags.string), color: '#d7ba7d' }
        ]);
    }

    function _pythonIotvCompletions(context) {
        const word = context.matchBefore(/[\w.]*/);
        if (!word || (word.from === word.to && !context.explicit)) return null;
        const text = word.text;

        if (text.startsWith('iotv.')) {
            return { from: word.from, options: [
                { label: 'iotv.din', type: 'function', detail: '(addr, side) → str', info: 'Llegir entrada digital (8 bits)' },
                { label: 'iotv.dinbit', type: 'function', detail: '(addr, side, bit) → int', info: 'Llegir un bit d\'entrada' },
                { label: 'iotv.dout', type: 'function', detail: '(addr, side, value)', info: 'Escriure sortida digital (byte)' },
                { label: 'iotv.doutbit', type: 'function', detail: '(addr, side, bit, val)', info: 'Escriure un bit de sortida' },
                { label: 'iotv.doutpwm', type: 'function', detail: '(addr, side, value)', info: 'Escriure sortida PWM (0-255)' },
                { label: 'iotv.doutbitpwm', type: 'function', detail: '(addr, side, bit, val)', info: 'PWM per bit individual' },
                { label: 'iotv.dsetup', type: 'function', detail: '(addr, sideA, sideB)', info: 'Configurar mode digital' },
                { label: 'iotv.getdsetup', type: 'function', detail: '(addr) → obj', info: 'Obtenir configuració digital' },
                { label: 'iotv.ain', type: 'function', detail: '(addr, side, ch) → int', info: 'Llegir entrada analògica (0-4095)' },
                { label: 'iotv.ainv', type: 'function', detail: '(addr, side, ch) → float', info: 'Llegir entrada analògica en volts' },
                { label: 'iotv.aout', type: 'function', detail: '(addr, side, ch, val)', info: 'Escriure sortida analògica' },
                { label: 'iotv.ain2v', type: 'function', detail: '(digital) → float', info: 'Convertir valor digital a volts' },
                { label: 'iotv.v2ain', type: 'function', detail: '(voltage) → int', info: 'Convertir volts a valor digital (in)' },
                { label: 'iotv.aout2v', type: 'function', detail: '(digital) → float', info: 'Convertir valor digital a volts (out)' },
                { label: 'iotv.v2aout', type: 'function', detail: '(voltage) → int', info: 'Convertir volts a valor digital (out)' },
                { label: 'iotv.init', type: 'function', detail: '()', info: 'Reinicialitzar sistema' },
                { label: 'iotv.reset', type: 'function', detail: '()', info: 'Reset complet del sistema' },
                { label: 'iotv.aoutBatch', type: 'function', detail: '(addr, side, voltages)', info: 'Escriure múltiples canals analògics' },
                { label: 'iotv.ainBatch', type: 'function', detail: '(addr, side) → array', info: 'Llegir tots els canals analògics' },
                { label: 'iotv.dversion', type: 'function', detail: '(addr) → str', info: 'Versió vèrtebra digital' },
                { label: 'iotv.aversion', type: 'function', detail: '(addr) → str', info: 'Versió vèrtebra analògica' }
            ], validFor: /^iotv\.[\w]*$/ };
        }

        if (text.startsWith('time.')) {
            return { from: word.from, options: [
                { label: 'time.sleep', type: 'function', detail: '(seconds)', info: 'Pausar execució N segons' },
                { label: 'time.time', type: 'function', detail: '() → float', info: 'Temps actual en segons' }
            ], validFor: /^time\.[\w]*$/ };
        }

        if (text.startsWith('mqtt.') || text.startsWith('client.')) {
            const p = text.startsWith('mqtt.') ? 'mqtt' : 'client';
            return { from: word.from, options: [
                { label: `${p}.Client`, type: 'function', detail: '(client_id)' },
                { label: `${p}.connect`, type: 'function', detail: '(host, port, keepalive)' },
                { label: `${p}.disconnect`, type: 'function', detail: '()' },
                { label: `${p}.publish`, type: 'function', detail: '(topic, payload)' },
                { label: `${p}.subscribe`, type: 'function', detail: '(topic)' },
                { label: `${p}.loop_start`, type: 'function', detail: '()' },
                { label: `${p}.loop_stop`, type: 'function', detail: '()' },
                { label: `${p}.on_connect`, type: 'property', detail: 'callback' },
                { label: `${p}.on_message`, type: 'property', detail: 'callback' }
            ], validFor: new RegExp(`^${p}\\.\\w*$`) };
        }

        return { from: word.from, options: [
            { label: 'if', type: 'keyword' }, { label: 'elif', type: 'keyword' },
            { label: 'else', type: 'keyword' }, { label: 'for', type: 'keyword' },
            { label: 'while', type: 'keyword' }, { label: 'def', type: 'keyword' },
            { label: 'return', type: 'keyword' }, { label: 'import', type: 'keyword' },
            { label: 'from', type: 'keyword' }, { label: 'class', type: 'keyword' },
            { label: 'try', type: 'keyword' }, { label: 'except', type: 'keyword' },
            { label: 'finally', type: 'keyword' }, { label: 'with', type: 'keyword' },
            { label: 'as', type: 'keyword' }, { label: 'pass', type: 'keyword' },
            { label: 'break', type: 'keyword' }, { label: 'continue', type: 'keyword' },
            { label: 'and', type: 'keyword' }, { label: 'or', type: 'keyword' },
            { label: 'not', type: 'keyword' }, { label: 'in', type: 'keyword' },
            { label: 'is', type: 'keyword' }, { label: 'True', type: 'keyword' },
            { label: 'False', type: 'keyword' }, { label: 'None', type: 'keyword' },
            { label: 'print', type: 'function', detail: '(...args)' },
            { label: 'range', type: 'function', detail: '(start, stop, step)' },
            { label: 'int', type: 'function', detail: '(val) → int' },
            { label: 'float', type: 'function', detail: '(val) → float' },
            { label: 'str', type: 'function', detail: '(val) → str' },
            { label: 'len', type: 'function', detail: '(obj) → int' },
            { label: 'abs', type: 'function', detail: '(x) → number' },
            { label: 'bin', type: 'function', detail: '(x) → str' },
            { label: 'hex', type: 'function', detail: '(x) → str' },
            { label: 'iotv', type: 'variable', detail: 'IoTV API', boost: 10 },
            { label: 'time', type: 'variable', detail: 'Mòdul temps' },
            { label: 'math', type: 'variable', detail: 'Mòdul math' },
            { label: 'mqtt', type: 'variable', detail: 'Client MQTT' },
            { label: 'requests', type: 'variable', detail: 'HTTP client' }
        ], validFor: /^\w*$/ };
    }

    function _jsonLinter(view) {
        const doc = view.state.doc.toString();
        if (!doc.trim()) return [];
        try { JSON.parse(doc); return []; }
        catch (e) {
            const match = e.message.match(/position\s+(\d+)/i) || e.message.match(/column\s+(\d+)/i);
            let from = 0, to = doc.length;
            if (match) { from = Math.min(parseInt(match[1]), doc.length); to = Math.min(from + 1, doc.length); }
            return [{ from, to, severity: 'error', message: e.message }];
        }
    }

    /**
     * Crear una instància d'editor CodeMirror 6
     * Ara és síncron en essència (CM ja està carregat), però mantenim async per compatibilitat.
     */
    async function create(container, options = {}) {
        if (!CM) throw new Error('CodeMirror 6 no carregat');
        _ensureTheme();

        const { language = 'python', initialValue = '', placeholder: ph = '', readOnly = false,
                lint = language === 'json', onChange = null } = options;

        const extensions = [
            CM.lineNumbers(), CM.highlightActiveLineGutter(), CM.highlightSpecialChars(),
            CM.history(), CM.foldGutter(), CM.drawSelection(), CM.dropCursor(),
            CM.indentOnInput(), CM.bracketMatching(), CM.closeBrackets(),
            CM.highlightActiveLine(), CM.highlightSelectionMatches(),
            CM.keymap.of([
                ...CM.closeBracketsKeymap, ...CM.defaultKeymap, ...CM.searchKeymap,
                ...CM.historyKeymap, ...CM.foldKeymap, ...CM.completionKeymap,
                ...CM.lintKeymap, CM.indentWithTab
            ]),
            CM.indentUnit.of('    '), _iotvTheme, CM.syntaxHighlighting(_iotvHighlightStyle)
        ];

        if (language === 'python') {
            extensions.push(CM.python());
            extensions.push(CM.autocompletion({ override: [_pythonIotvCompletions], activateOnTyping: true, maxRenderedOptions: 20 }));
        } else if (language === 'json') {
            extensions.push(CM.json());
            if (lint) { extensions.push(CM.linter(_jsonLinter, { delay: 500 })); extensions.push(CM.lintGutter()); }
        }

        if (ph) extensions.push(CM.placeholder(ph));
        if (readOnly) extensions.push(CM.EditorState.readOnly.of(true));

        const cbs = [];
        if (onChange) cbs.push(onChange);
        extensions.push(CM.EditorView.updateListener.of(u => { if (u.docChanged) cbs.forEach(cb => cb(u)); }));

        const view = new CM.EditorView({
            state: CM.EditorState.create({ doc: initialValue, extensions }),
            parent: container
        });

        const ro = new ResizeObserver(() => view.requestMeasure());
        ro.observe(container);

        return {
            getValue() { return view.state.doc.toString(); },
            setValue(t) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: t } }); },
            onchange(cb) { cbs.push(cb); },
            focus() { view.focus(); },
            destroy() { ro.disconnect(); view.destroy(); },
            view
        };
    }

    function isReady() { return !!CM; }
    return { create, isReady };
})();

if (typeof window !== 'undefined') window.CodeEditorManager = CodeEditorManager;
console.log('✓ CodeEditorManager loaded');
