/**
 * ScriptEditor - Editor de Python amb transpilador manual
 * 
 * Converteix Python a JavaScript usant regex
 * Basat en el codi original de script-editor.js
 */

class ScriptEditor {
    constructor(editorElement, outputElement) {
        this.editorContainer = editorElement; // Ara és un contenidor div
        this.output = outputElement;
        this.isRunning = false;
        this.stopRequested = false;
        this.cmEditor = null; // Instància CodeMirror
        this._mqttClients = []; // Tracking de clients MQTT creats per l'script
        
        this.setupEditor();
    }

    setupEditor() {
        // Inicialitzar CodeMirror de forma asíncrona
        this._initCodeMirror();
    }

    async _initCodeMirror() {
        if (!window.CodeEditorManager) {
            console.warn('[ScriptEditor] CodeEditorManager no disponible, esperant...');
            // Reintentar fins que estigui disponible
            setTimeout(() => this._initCodeMirror(), 100);
            return;
        }
        
        try {
            const placeholderText = window.t ? window.t('editor.placeholder') : '# Escriu el teu codi Python aquí';
            this.cmEditor = await window.CodeEditorManager.create(this.editorContainer, {
                language: 'python',
                initialValue: this._pendingCode || '',
                placeholder: placeholderText
            });
            
            // Si hi havia codi pendent (establert abans que CM estigués llest)
            if (this._pendingCode) {
                this._pendingCode = null;
            }
            
            console.log('✓ ScriptEditor CodeMirror inicialitzat');
        } catch (err) {
            console.error('[ScriptEditor] Error inicialitzant CodeMirror:', err);
        }
    }

    /**
     * Analitzar el codi Python per determinar quines funcions d'usuari són asíncrones.
     * Una funció és async si conté time.sleep, requests.get/post, o crida a una altra funció async.
     * Retorna un Set amb els noms de les funcions que han de ser async.
     */
    analyzeAsyncFunctions(pythonCode) {
        const lines = pythonCode.split('\n');
        const funcBodies = {};   // funcName → [línies del cos]
        const funcCalls = {};    // funcName → [noms de funcions que crida]
        let currentFunc = null;
        let funcIndent = 0;
        
        // 1r pas: Recollir cossos de funcions i les seves crides
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const currentIndent = line.length - line.trimStart().length;
            
            // Detectar inici de funció
            const defMatch = trimmed.match(/^def\s+(\w+)\s*\(.*\):/);
            if (defMatch) {
                currentFunc = defMatch[1];
                funcIndent = currentIndent;
                funcBodies[currentFunc] = [];
                funcCalls[currentFunc] = [];
                continue;
            }
            
            // Si estem dins d'una funció
            if (currentFunc !== null) {
                // Sortim de la funció si la indentació torna al nivell de def o menys
                if (currentIndent <= funcIndent && trimmed !== '') {
                    currentFunc = null;
                } else {
                    funcBodies[currentFunc].push(trimmed);
                }
            }
        }
        
        // 2n pas: Marcar funcions directament async (contenen time.sleep o requests)
        const asyncFuncs = new Set();
        const allFuncNames = Object.keys(funcBodies);
        
        for (const fname of allFuncNames) {
            const body = funcBodies[fname].join('\n');
            if (/time\.sleep\s*\(/.test(body) || /requests\.(get|post)\s*\(/.test(body) || /\bawait\b/.test(body) || /serial\.Serial\s*\(/.test(body) || /\.write\s*\(/.test(body) || /\.readline\s*\(/.test(body) || /\.read\s*\(/.test(body)) {
                asyncFuncs.add(fname);
            }
            // Recollir crides a altres funcions d'usuari
            for (const otherFunc of allFuncNames) {
                if (otherFunc !== fname) {
                    const callPattern = new RegExp('\\b' + otherFunc + '\\s*\\(');
                    if (callPattern.test(body)) {
                        funcCalls[fname].push(otherFunc);
                    }
                }
            }
        }
        
        // 3r pas: Propagar async transitiu (si func A crida func B que és async, A també és async)
        let changed = true;
        while (changed) {
            changed = false;
            for (const fname of allFuncNames) {
                if (!asyncFuncs.has(fname)) {
                    for (const calledFunc of funcCalls[fname]) {
                        if (asyncFuncs.has(calledFunc)) {
                            asyncFuncs.add(fname);
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }
        
        return asyncFuncs;
    }

    /**
     * Convertir Python a JavaScript - VERSIÓ DEFINITIVA
     */
    convertToJS(pythonCode) {
        // Pre-anàlisi: determinar quines funcions d'usuari són async
        const asyncFuncs = this.analyzeAsyncFunctions(pythonCode);
        
        if (asyncFuncs.size > 0) {
            console.log('Funcions async detectades:', [...asyncFuncs].join(', '));
        }
        
        const lines = pythonCode.split('\n');
        const result = [];
        const lineMap = []; // lineMap[jsLineIndex] = pythonLineNumber (1-indexed)
        const blockStack = []; // Stack de blocs: {type, indent, pythonLine}
        
        // Helper: afegir línia al resultat i registrar correspondència Python
        const pushLine = (jsLine, pythonLineNum) => {
            lineMap.push(pythonLineNum);
            result.push(jsLine);
        };
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmed = line.trim();
            const pythonLine = i + 1; // 1-indexed
            
            // Línia buida
            if (!trimmed) {
                pushLine('', pythonLine);
                continue;
            }
            
            // CONVERSIONS GLOBALS (abans de comentaris!)
            // True/False/None → true/false/null
            line = line.replace(/\bTrue\b/g, 'true');
            line = line.replace(/\bFalse\b/g, 'false');
            line = line.replace(/\bNone\b/g, 'null');
            
            // Recalcular trimmed després de conversions
            const trimmedAfter = line.trim();
            
            // Comentaris (DESPRÉS de True/False/None)
            if (trimmedAfter.startsWith('#')) {
                pushLine(line.replace('#', '//'), pythonLine);
                continue;
            }
            
            // Indentació actual
            const currentIndent = line.length - line.trimStart().length;
            
            // Tancar blocs si disminueix indentació
            while (blockStack.length > 0 && blockStack[blockStack.length - 1].indent >= currentIndent) {
                // No tancar si és elif/else al mateix nivell
                // (aquests s'encarregaran de tancar el bloc anterior ells mateixos)
                if (blockStack[blockStack.length - 1].indent === currentIndent) {
                    if (trimmedAfter.startsWith('elif ') || trimmedAfter === 'else:') {
                        break;
                    }
                }
                
                // IMPORTANT: Si la línia actual és elif/else i estem un nivell més amunt,
                // NO tancar automàticament - deixar que elif/else ho gestioni
                if (blockStack[blockStack.length - 1].indent > currentIndent) {
                    if (trimmedAfter.startsWith('elif ') || trimmedAfter === 'else:') {
                        break;
                    }
                }
                
                const block = blockStack.pop();
                pushLine(' '.repeat(block.indent) + '}', block.pythonLine);
            }
            
            // IMPORTS (eliminar)
            if (trimmedAfter.startsWith('import ') || trimmedAfter.startsWith('from ')) {
                pushLine('// ' + trimmedAfter, pythonLine);
                continue;
            }
            
            // DOCSTRINGS
            if (trimmedAfter.startsWith('"""') || trimmedAfter.startsWith("'''")) {
                pushLine(line.replace(/"""/g, '/*').replace(/'''/g, '/*'), pythonLine);
                continue;
            }
            
            // DEF
            if (trimmedAfter.startsWith('def ')) {
                const match = trimmedAfter.match(/def\s+(\w+)\s*\((.*?)\):/);
                if (match) {
                    const funcName = match[1];
                    const funcKeyword = asyncFuncs.has(funcName) ? 'async function' : 'function';
                    pushLine(' '.repeat(currentIndent) + `${funcKeyword} ${funcName}(${match[2]}) {`, pythonLine);
                    blockStack.push({type: 'function', indent: currentIndent, pythonLine});
                    continue;
                }
            }
            
            // IF
            if (trimmedAfter.startsWith('if ') && trimmedAfter.endsWith(':')) {
                const condition = trimmedAfter.substring(3, trimmedAfter.length - 1);
                pushLine(' '.repeat(currentIndent) + `if (${condition}) {`, pythonLine);
                blockStack.push({type: 'if', indent: currentIndent, pythonLine});
                continue;
            }
            
            // ELIF
            if (trimmedAfter.startsWith('elif ') && trimmedAfter.endsWith(':')) {
                // Tancar bloc anterior
                if (blockStack.length > 0) {
                    blockStack.pop();
                }
                
                const condition = trimmedAfter.substring(5, trimmedAfter.length - 1);
                pushLine(' '.repeat(currentIndent) + `} else if (${condition}) {`, pythonLine);
                blockStack.push({type: 'elif', indent: currentIndent, pythonLine});
                continue;
            }
            
            // ELSE
            if (trimmedAfter === 'else:') {
                // Tancar bloc anterior
                if (blockStack.length > 0) {
                    blockStack.pop();
                }
                
                pushLine(' '.repeat(currentIndent) + '} else {', pythonLine);
                blockStack.push({type: 'else', indent: currentIndent, pythonLine});
                continue;
            }
            
            // FOR
            if (trimmedAfter.startsWith('for ') && trimmedAfter.endsWith(':')) {
                const match = trimmedAfter.match(/for\s+(\w+)\s+in\s+(.+?):/);
                if (match) {
                    pushLine(' '.repeat(currentIndent) + `for (const ${match[1]} of ${match[2]}) {`, pythonLine);
                    blockStack.push({type: 'for', indent: currentIndent, pythonLine});
                    continue;
                }
            }
            
            // WHILE
            if (trimmedAfter.startsWith('while ') && trimmedAfter.endsWith(':')) {
                const condition = trimmedAfter.substring(6, trimmedAfter.length - 1);
                pushLine(' '.repeat(currentIndent) + `while (${condition}) {`, pythonLine);
                blockStack.push({type: 'while', indent: currentIndent, pythonLine});
                continue;
            }
            
            // Convertir línia normal (ja té True/False/None convertits)
            let converted = line;

	// --- PER A REQUESTS ---
	// Convertim les crides síncrones de Python en asíncrones per a JS
	converted = converted.replace(/requests\.get\(/g, 'await requests.get(');
	converted = converted.replace(/requests\.post\(/g, 'await requests.post(');
	// ------------------------------------

            // --- SERIAL ---
            // b'string' i b"string" → 'string' i "string"  (bytes literals)
            converted = converted.replace(/\bb'([^']*)'/g, "'$1'");
            converted = converted.replace(/\bb"([^"]*)"/g, '"$1"');
            
            // serial.Serial(port='COM9', baudrate=115200) → await serial.Serial({port: 'COM9', baudrate: 115200})
            // Convertir kwargs Python a objecte JS
            converted = converted.replace(/serial\.Serial\(([^)]+)\)/g, (match, argsStr) => {
                // Detectar si conté kwargs (name=value)
                if (/\w+\s*=/.test(argsStr)) {
                    const pairs = [];
                    // Parsejar kwargs: port='COM9', baudrate=115200, timeout=1
                    const parts = argsStr.split(/,\s*/);
                    for (const part of parts) {
                        const kwMatch = part.trim().match(/^(\w+)\s*=\s*(.+)$/);
                        if (kwMatch) {
                            pairs.push(`${kwMatch[1]}: ${kwMatch[2]}`);
                        }
                    }
                    return `await serial.Serial({${pairs.join(', ')}})`;
                }
                return `await serial.Serial(${argsStr})`;
            });
            
            // .write(...) → await .write(...)  (per objectes serial)
            converted = converted.replace(/(\w+)\.write\((?!.*\bawait\b)/g, 'await $1.write(');
            
            // .readline() amb mètodes encadenats (.decode, etc.) → (await obj.readline()).metode()
            // Ex: ser.readline().decode('ascii').strip() → (await ser.readline()).decode('ascii').trim()
            converted = converted.replace(/(\w+)\.readline\(\)\./g, '(await $1.readline()).');
            // .readline() sol (sense encadenar)
            converted = converted.replace(/(\w+)\.readline\(\)(?!\.)/g, 'await $1.readline()');
            
            // .read(...) → await .read(...)
            converted = converted.replace(/(\w+)\.read\(([^)]*)\)/g, (match, obj, args) => {
                // No convertir si ja és await o si és un diccionari/array
                if (obj === 'JSON' || obj === 'file') return match;
                return `await ${obj}.read(${args})`;
            });
            
            // .flush() → await .flush()
            converted = converted.replace(/(\w+)\.flush\(\)/g, 'await $1.flush()');
            
            // .close() per serial → await .close()
            converted = converted.replace(/(\w+)\.close\(\)/g, 'await $1.close()');
            
            // .decode('ascii') / .decode('utf-8') / .decode() → .decode()  (ja retorna string al shim)
            // (no cal conversió, el shim ja ho gestiona)
            
            // .strip() → .trim()
            converted = converted.replace(/\.strip\(\)/g, '.trim()');
            
            // .encode() → eliminat (el shim de write accepta strings directament)
            converted = converted.replace(/\.encode\([^)]*\)/g, '');
            // ------------------------------------
            
            // time.sleep
            converted = converted.replace(/time\.sleep\((.*?)\)/g, 'await time.sleep($1)');
            
            // and/or/not
            converted = converted.replace(/\band\b/g, '&&');
            converted = converted.replace(/\bor\b/g, '||');
            converted = converted.replace(/\bnot\s+/g, '!');
            
            // IMPORTANT: Print amb f-strings PRIMER (abans de f-strings generals)
            // print(f"...") -> print(`...`)
            converted = converted.replace(/print\(f"([^"]*)"\)/g, (match, content) => {
                const cleaned = content.replace(/\{([^}:]+):[^}]+\}/g, '{$1}');
                const conv = cleaned.replace(/\{([^}]+)\}/g, '${$1}');
                return 'print(`' + conv + '`)';
            });
            converted = converted.replace(/print\(f'([^']*)'\)/g, (match, content) => {
                const cleaned = content.replace(/\{([^}:]+):[^}]+\}/g, '{$1}');
                const conv = cleaned.replace(/\{([^}]+)\}/g, '${$1}');
                return 'print(`' + conv + '`)';
            });
            
            // F-strings generals (que NO estan dins de print)
            // f"..." -> `...`
            converted = converted.replace(/f"([^"]*)"/g, (match, content) => {
                const cleaned = content.replace(/\{([^}:]+):[^}]+\}/g, '{$1}');
                const conv = cleaned.replace(/\{([^}]+)\}/g, '${$1}');
                return '`' + conv + '`';
            });
            converted = converted.replace(/f'([^']*)'/g, (match, content) => {
                const cleaned = content.replace(/\{([^}:]+):[^}]+\}/g, '{$1}');
                const conv = cleaned.replace(/\{([^}]+)\}/g, '${$1}');
                return '`' + conv + '`';
            });
            
            // Math functions
            converted = converted.replace(/\bmin\(/g, 'Math.min(');
            converted = converted.replace(/\bmax\(/g, 'Math.max(');
            converted = converted.replace(/\babs\(/g, 'Math.abs(');
            
            // Python math module functions
            converted = converted.replace(/\bmath\.sin\(/g, 'Math.sin(');
            converted = converted.replace(/\bmath\.cos\(/g, 'Math.cos(');
            converted = converted.replace(/\bmath\.tan\(/g, 'Math.tan(');
            converted = converted.replace(/\bmath\.sqrt\(/g, 'Math.sqrt(');
            converted = converted.replace(/\bmath\.floor\(/g, 'Math.floor(');
            converted = converted.replace(/\bmath\.ceil\(/g, 'Math.ceil(');
            
            // Python math constants
            converted = converted.replace(/\bmath\.pi\b/g, 'Math.PI');
            converted = converted.replace(/\bmath\.e\b/g, 'Math.E');
            
            // Python slicing
            converted = converted.replace(/\[(\d+):\]/g, '.slice($1)');
            
            // Python zfill
            converted = converted.replace(/\.zfill\((\d+)\)/g, ".padStart($1, '0')");
            
            // Python bin()
            converted = converted.replace(/bin\(([^)]+)\)/g, '($1).toString(2)');
            
            // MQTT Client - afegir 'new' si falta
            converted = converted.replace(/mqtt\.Client\(/g, 'new mqtt.Client(');
            
            // Afegir 'await' a crides de funcions d'usuari que són async
            for (const asyncFunc of asyncFuncs) {
                // Patró: nom_funcio( que NO estigui ja precedit per 'await ' ni sigui part de 'function '
                const callPattern = new RegExp('\\b' + asyncFunc + '\\s*\\(', 'g');
                converted = converted.replace(callPattern, (match, offset) => {
                    // Comprovar que no estigui ja precedit per 'await ' o 'function '
                    const before = converted.substring(Math.max(0, offset - 10), offset);
                    if (/await\s+$/.test(before) || /function\s+$/.test(before) || /async function\s+$/.test(before)) {
                        return match;
                    }
                    return 'await ' + match;
                });
            }
            
            // pass statement
            if (trimmedAfter === 'pass') {
                converted = ' '.repeat(currentIndent) + '/* pass */';
            }
            
            pushLine(converted, pythonLine);
        }
        
        // Tancar tots els blocs pendents
        while (blockStack.length > 0) {
            const block = blockStack.pop();
            pushLine(' '.repeat(block.indent) + '}', block.pythonLine);
        }
        
        return { code: result.join('\n'), lineMap };
    }

    /**
     * ELIMINEM addClosingBraces - ja no cal
     */

    /**
     * Preprocessar codi: eliminar comentaris # al final de línia
     * Manté comentaris que comencen la línia i # dins de strings
     */
    removeEndOfLineComments(code) {
        const lines = code.split('\n');
        const cleanedLines = lines.map(line => {
            // 1. Si la línia comença amb # (opcionalment amb espais) → mantenir
            const trimmed = line.trim();
            if (trimmed.startsWith('#')) {
                return line;
            }
            
            // 2. Buscar # fora de strings
            let inSingleQuote = false;
            let inDoubleQuote = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                // Alternar estat de strings (simple, sense gestió d'escapes)
                if (char === "'" && !inDoubleQuote) {
                    inSingleQuote = !inSingleQuote;
                }
                if (char === '"' && !inSingleQuote) {
                    inDoubleQuote = !inDoubleQuote;
                }
                
                // Si trobem # i estem fora de strings
                if (char === '#' && !inSingleQuote && !inDoubleQuote) {
                    // Tallar la línia aquí i eliminar espais finals
                    return line.substring(0, i).trimEnd();
                }
            }
            
            // 3. Si no hem trobat #, retornar línia sencera
            return line;
        });
        
        return cleanedLines.join('\n');
    }

    /**
     * Calibrar dinàmicament l'offset de línies que AsyncFunction afegeix.
     *
     * Chrome, Firefox i Node afegeixen diferent nombre de línies de capçalera
     * al wrapper intern de AsyncFunction. En lloc d'assumir un valor fix,
     * creem una AsyncFunction de prova amb els MATEIXOS paràmetres que el codi real,
     * forcem un ReferenceError a la línia 1 i mesurem l'offset real.
     *
     * @param {string[]} paramNames - noms dels paràmetres del context d'execució
     * @returns {Promise<number>} offset de línies (p.ex. 2 en Chrome, pot variar)
     */
    async _calibrateAsyncOffset(paramNames) {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        // Variable sentinel que mai existirà al context -> ReferenceError garantit a línia 1
        const probe = new AsyncFunction(...paramNames, '__async_line_calibration_sentinel_xyzzy__');
        try {
            await probe(...paramNames.map(() => undefined));
        } catch (e) {
            const stack = e.stack || '';
            // Patró Chrome amb fitxer: el segon <anonymous> és la línia del eval
            const evalMatch = stack.match(/eval at <anonymous>[^,)]+,\s*<anonymous>:(\d+):/);
            if (evalMatch) {
                const stackLine = parseInt(evalMatch[1], 10);
                console.log(`[ScriptEditor] Calibratge offset (evalMatch): stack=${stackLine}, offset=${stackLine - 1}`);
                return stackLine - 1;
            }
            // Patró Firefox/Chrome inline
            const simpleMatch = stack.match(/<anonymous>:(\d+):/);
            if (simpleMatch) {
                const stackLine = parseInt(simpleMatch[1], 10);
                console.log(`[ScriptEditor] Calibratge offset (simpleMatch): stack=${stackLine}, offset=${stackLine - 1}`);
                return stackLine - 1;
            }
            console.log('[ScriptEditor] Calibratge offset: cap patró, stack:', e.stack);
        }
        console.log('[ScriptEditor] Calibratge offset: fallback = 2');
        return 2; // fallback conservador
    }

    /**
     * Trobar la línia d'un SyntaxError buscant el token problemàtic al codi JS.
     *
     * eval() i new AsyncFunction() no inclouen la línia al stack del SyntaxError
     * quan el codi ve d'un fitxer carregat (Chrome mostra la línia del fitxer,
     * no del codi evaluat). En lloc d'això, parsejem el missatge d'error per
     * extreure el token problemàtic i el cerquem al codi JS generat.
     *
     * Heurística: un identificador és "inesperat" quan apareix just després de
     * ) ] dígit o string (sense operador entremig). El regex prioritza aquest
     * patró abans de fer un match simple de paraula.
     *
     * @param {string} jsCode - codi JS generat
     * @param {string} errorMessage - missatge del SyntaxError
     * @returns {number|null} línia del codi JS (1-indexed), o null si no es pot determinar
     */
    _getSyntaxErrorJsLine(jsCode, errorMessage) {
        // Extreure el token del missatge: "Unexpected identifier 'TOKEN'" o "Unexpected token 'TOKEN'"
        // Chrome usa cometes tipogràfiques (\u2018\u2019) o rectes
        const tokenMatch = errorMessage.match(/[\u2018'"]([^\u2019'"]+)[\u2019'"]\s*$/);
        if (!tokenMatch) {
            console.log('[ScriptEditor] SyntaxError: no es pot extreure token de:', errorMessage);
            return null;
        }
        const token = tokenMatch[1];
        const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const lines = jsCode.split('\n');
        
        // Patró 1 (prioritari): token ADJACENT a ) ] dígit o string sense operador
        // Cobreix el cas típic d'error d'usuari: "func(args)TOKEN" o "1TOKEN"
        const adjacentPattern = new RegExp(`[)\\]"'\`\\d]\\s*\\b${escapedToken}\\b`);
        for (let i = 0; i < lines.length; i++) {
            if (adjacentPattern.test(lines[i])) {
                return i + 1;
            }
        }
        
        // Patró 2 (fallback): qualsevol ocurrència del token com a paraula sencera
        const wordPattern = new RegExp(`\\b${escapedToken}\\b`);
        for (let i = 0; i < lines.length; i++) {
            if (wordPattern.test(lines[i])) {
                return i + 1;
            }
        }
        
        return null;
    }

    /**
     * Formatar errors en temps d'execució amb número de línia Python original.
     * Gestiona per separat SyntaxError (detecció via eval) i RuntimeError (via calibratge).
     *
     * @param {Error} error
     * @param {number[]} lineMap - lineMap[jsIdx] = pythonLine (1-indexed)
     * @param {number} asyncOffset - offset calibrat per _calibrateAsyncOffset
     * @param {string} jsCode - codi JS generat (necessari per SyntaxError)
     * @param {string[]} paramNames - noms dels paràmetres (necessari per SyntaxError)
     */
    _formatRuntimeError(error, lineMap, asyncOffset, jsCode, paramNames) {
        const t = window.t || (k => k);
        const message = error.message || error.toString();
        
        console.log('[ScriptEditor] Runtime error stack:', error.stack);
        
        let jsLine = null;
        
        if (error instanceof SyntaxError) {
            // ── SyntaxError ────────────────────────────────────────────────────────
            // new AsyncFunction() no posa la línia al stack. Cerquem el token
            // problemàtic directament al codi JS generat.
            if (jsCode) {
                jsLine = this._getSyntaxErrorJsLine(jsCode, message);
                console.log('[ScriptEditor] SyntaxError jsLine via token search:', jsLine);
            }
        } else {
            // ── RuntimeError (ReferenceError, TypeError, etc.) ─────────────────────
            // El stack de new AsyncFunction inclou la línia; usar offset calibrat.
            const stack = error.stack || '';
            
            // Patró 1 (Chrome+fitxer): "eval at <anonymous> (fitxer:N), <anonymous>:M"
            const evalMatch = stack.match(/eval at <anonymous>[^,)]+,\s*<anonymous>:(\d+):\d+/);
            if (evalMatch) jsLine = parseInt(evalMatch[1], 10);
            
            // Patró 2 (Chrome inline / Firefox): "<anonymous>:N"
            if (jsLine === null) {
                const simpleMatch = stack.match(/<anonymous>:(\d+):\d+/);
                if (simpleMatch) jsLine = parseInt(simpleMatch[1], 10);
            }
            
            // Patró 3 (Firefox eval): "@...eval...:N"
            if (jsLine === null) {
                const ffMatch = stack.match(/@.*eval[^:]*:(\d+):\d+/i);
                if (ffMatch) jsLine = parseInt(ffMatch[1], 10);
            }
            
            // Patró 4 (darrer recurs)
            if (jsLine === null) {
                const genericMatch = stack.match(/:(\d+):\d+/);
                if (genericMatch) jsLine = parseInt(genericMatch[1], 10);
            }
            
            // Compensar l'offset de capçalera de AsyncFunction
            if (jsLine !== null) {
                jsLine = jsLine - asyncOffset;
                console.log(`[ScriptEditor] RuntimeError: stackLine=${jsLine + asyncOffset}, offset=${asyncOffset}, jsLine=${jsLine}`);
            }
        }
        
        // Convertir línia JS (1-based) a línia Python via lineMap
        let pythonLine = null;
        if (jsLine !== null && lineMap && lineMap.length > 0) {
            const idx = jsLine - 1; // 0-based
            if (idx >= 0 && idx < lineMap.length) {
                pythonLine = lineMap[idx];
            } else if (idx >= lineMap.length) {
                pythonLine = lineMap[lineMap.length - 1];
            }
            // idx < 0: no podem determinar la línia
        }
        
        console.log(`[ScriptEditor] jsLine=${jsLine}, idx=${jsLine != null ? jsLine - 1 : 'N/A'}, pythonLine=${pythonLine}`);
        
        if (pythonLine !== null) {
            return t('editor.runtime_error_line')
                .replace('{line}', pythonLine)
                .replace('{message}', message);
        } else {
            return t('editor.runtime_error_no_line')
                .replace('{message}', message);
        }
    }

    /**
     * Executar codi Python
     */
    async run(callbacks = {}) {
        const pythonCode = this.getCode().trim();
        
        if (!pythonCode) {
            if (callbacks.error) {
                callbacks.error('No hi ha codi per executar');
            }
            return;
        }
        
        this.isRunning = true;
        this.stopRequested = false;
        
        // Emetre event per netejar bessons (ex: caixes a la cinta)
        if (window.EventBus) {
            window.EventBus.emit('SCRIPT_STARTED');
        }
        
        let currentLineMap = [];
        let asyncOffset = 2; // valor per defecte fins que calibrem
        let currentJsCode = '';
        let currentParamNames = [];
        
        try {
            // Preprocessar: eliminar comentaris al final de línia
            const cleanedCode = this.removeEndOfLineComments(pythonCode);
            
            // Convertir Python a JavaScript
            const { code: jsCode, lineMap } = this.convertToJS(cleanedCode);
            currentLineMap = lineMap;
            currentJsCode = jsCode;
            
            // DEBUG: Mostrar codi transpirat
            console.log("=== TRANSPILED JS ===");
            console.log(jsCode);
            window.lastTranspiledJS = jsCode; // Per debugar
            window.lastLineMap = lineMap;      // Per debugar
            
            // Crear context d'execució
            const context = this.createExecutionContext(callbacks);
            const paramNames = Object.keys(context);
            currentParamNames = paramNames;
            
            // Calibrar l'offset de AsyncFunction per a AQUEST navegador i AQUESTS paràmetres
            asyncOffset = await this._calibrateAsyncOffset(paramNames);
            console.log('[ScriptEditor] asyncOffset calibrat:', asyncOffset);
            
            // Executar codi
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const fn = new AsyncFunction(...paramNames, jsCode);
            
            await fn(...Object.values(context));
            
            // Execució completada
            if (callbacks.complete && !this.stopRequested) {
                callbacks.complete();
            }
            
        } catch (error) {
            // Error durant l'execució
            if (this.stopRequested) {
                // Aturat per l'usuari - no és error
                if (callbacks.output) {
                    callbacks.output('\n⏹ Execució aturada per l\'usuari\n');
                }
            } else if (callbacks.error) {
                // Formatar error amb número de línia Python
                const formattedError = this._formatRuntimeError(
                    error, currentLineMap, asyncOffset, currentJsCode, currentParamNames
                );
                callbacks.error(formattedError);
            }
        } finally {
            this.isRunning = false;
            // Cleanup: desconnectar clients MQTT creats per aquest script
            if (this._mqttClients.length > 0) {
                console.log(`[ScriptEditor] Desconnectant ${this._mqttClients.length} client(s) MQTT...`);
                for (const mqttClient of this._mqttClients) {
                    try {
                        if (mqttClient.connected) {
                            mqttClient.disconnect();
                        }
                    } catch (e) {
                        console.warn('[mqtt] Cleanup error:', e.message);
                    }
                }
                this._mqttClients = [];
            }
            // Cleanup: tancar ports serial oberts per aquest script
            if (window.WebSerialShim) {
                const owner = this._serialOwner || 'editor';
                window.WebSerialShim.closeAllByOwner(owner).catch(e => {
                    console.warn('[serial] Cleanup error:', e.message);
                });
            }
        }
    }

    /**
     * Crear context d'execució amb funcions disponibles
     */
    createExecutionContext(callbacks) {
        const context = {};
        
        // Funció print
        context.print = (...args) => {
            const text = args.map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg);
                }
                return String(arg);
            }).join(' ') + '\n';
            
            if (callbacks.output) {
                callbacks.output(text);
            }
        };
        
        // Funció range (Python)
        context.range = function*(start, stop, step = 1) {
            if (stop === undefined) {
                stop = start;
                start = 0;
            }
            for (let i = start; i < stop; i += step) {
                yield i;
            }
        };
        
	// Funció requests (Python)
	context.requests = {
	    get: async (url) => {
		const resp = await fetch(url);
		const textData = await resp.text();
		let jsonData = null;
		try { jsonData = JSON.parse(textData); } catch(e) {}

		return {
		    status_code: resp.status,
		    ok: resp.ok,
		    // 'text' es defineix com a propietat per poder fer response.text (sense parèntesis)
		    get text() { return textData; },
		    // 'json' es defineix com a funció per fer response.json()
		    json: () => jsonData
		};
	    },
	    post: async (url, data = {}) => {
		const resp = await fetch(url, {
		    method: 'POST',
		    body: JSON.stringify(data),
		    headers: { 'Content-type': 'application/json; charset=UTF-8' }
		});
		const textData = await resp.text();
		return {
		    status_code: resp.status,
		    ok: resp.ok,
		    get text() { return textData; },
		    json: () => JSON.parse(textData)
		};
	    }
	};
	// ---------------------------------------------------        
        
        // Funció int (Python)
        context.int = (val) => parseInt(val);
        
        // Funció float (Python)
        context.float = (val) => parseFloat(val);
        
        // Funció str (Python)
        context.str = (val) => String(val);
        
        // Objecte time
        context.time = {
            sleep: (seconds) => {
                return new Promise((resolve, reject) => {
                    if (this.stopRequested) {
                        reject(new Error('Execució aturada'));
                        return;
                    }
                    setTimeout(() => {
                        if (this.stopRequested) {
                            reject(new Error('Execució aturada'));
                        } else {
                            resolve();
                        }
                    }, seconds * 1000);
                });
            },
            time: () => {
                return Date.now() / 1000;
            }
        };
        
        // Objecte iotv (si està disponible)
        if (window.iotv) {
            context.iotv = window.iotv;
        }
        
        // Objecte mqtt - exposar paho.mqtt.client com a mqtt, amb tracking
        if (window.paho && window.paho.mqtt && window.paho.mqtt.client) {
            const self = this;
            const originalClient = window.paho.mqtt.client.Client;
            context.mqtt = {
                Client: function(client_id) {
                    const mqttClient = originalClient(client_id);
                    self._mqttClients.push(mqttClient);
                    return mqttClient;
                }
            };
        }
        
        // Math de Python
        context.math = Math;
        
        // Mòdul random de Python
        context.random = {
            /**
             * random.random() → float aleatori entre [0, 1)
             */
            random: () => Math.random(),
            
            /**
             * random.randint(a, b) → enter aleatori entre [a, b] (ambdós inclosos)
             */
            randint: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
            
            /**
             * random.choice(seq) → element aleatori d'una seqüència (string o array)
             */
            choice: (seq) => {
                if (!seq || seq.length === 0) throw new Error('random.choice(): seqüència buida');
                return seq[Math.floor(Math.random() * seq.length)];
            },
            
            /**
             * random.sample(population, k) → llista de k elements únics
             */
            sample: (population, k) => {
                if (k > population.length) throw new Error('random.sample(): mostra més gran que la població');
                const pool = Array.isArray(population) ? [...population] : [...population];
                const result = [];
                for (let i = 0; i < k; i++) {
                    const idx = Math.floor(Math.random() * pool.length);
                    result.push(pool[idx]);
                    pool.splice(idx, 1);
                }
                return result;
            },
            
            /**
             * random.shuffle(list) → barreja la llista in-place
             */
            shuffle: (list) => {
                for (let i = list.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [list[i], list[j]] = [list[j], list[i]];
                }
                return list;
            },
            
            /**
             * random.uniform(a, b) → float aleatori entre [a, b]
             */
            uniform: (a, b) => a + Math.random() * (b - a)
        };
        
        // Mòdul string de Python
        context.string = {
            ascii_lowercase: 'abcdefghijklmnopqrstuvwxyz',
            ascii_uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            ascii_letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            digits: '0123456789',
            hexdigits: '0123456789abcdefABCDEF',
            octdigits: '01234567',
            punctuation: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
            whitespace: ' \t\n\r\x0b\x0c'
        };
        
        // Objecte serial - exposar WebSerialShim com a serial
        if (window.WebSerialShim) {
            // Establir owner per a la gestió de ports compartits
            const owner = this._serialOwner || 'editor';
            const shimProxy = {
                Serial: async (opts) => {
                    window.WebSerialShim._currentOwner = owner;
                    const port = await window.WebSerialShim.Serial(opts);
                    window.WebSerialShim._currentOwner = null;
                    return port;
                }
            };
            context.serial = shimProxy;
        }
        
        return context;
    }

    /**
     * Aturar execució
     */
    stop() {
        this.stopRequested = true;
        this.isRunning = false;
    }

    /**
     * Netejar editor
     */
    clear() {
        if (this.cmEditor) {
            this.cmEditor.setValue('');
        } else {
            this._pendingCode = '';
        }
    }

    /**
     * Establir codi
     */
    setCode(code) {
        if (this.cmEditor) {
            this.cmEditor.setValue(code);
        } else {
            // Guardar per quan CM estigui llest
            this._pendingCode = code;
        }
    }

    /**
     * Obtenir codi
     */
    getCode() {
        if (this.cmEditor) {
            return this.cmEditor.getValue();
        }
        return this._pendingCode || '';
    }

    /**
     * Comprovar si està executant
     */
    getIsRunning() {
        return this.isRunning;
    }
}

// Crear instància global si es passa element
if (typeof window !== 'undefined') {
    window.ScriptEditorClass = ScriptEditor;
}

console.log('✓ ScriptEditor loaded');
