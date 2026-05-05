/**
 * ConsoleOutput - Component de consola visual
 * 
 * Mostra missatges de log, errors i informació
 * Suporta diferents tipus de missatges amb colors
 */

class ConsoleOutput {
    constructor(container) {
        this.container = container;
        this.element = null;
        this.maxLines = 1000; // Límit de línies per evitar overflow
        this.autoScroll = true;
        
        this.init();
    }

    init() {
        this.createElement();
    }

    createElement() {
        const consoleDiv = document.createElement('div');
        consoleDiv.className = 'console-output';
        consoleDiv.innerHTML = `
            <div class="console-header">
                <span class="console-title">📟 Consola</span>
                <div class="console-controls">
                    <button class="console-btn" id="console-auto-scroll" title="Auto-scroll">
                        📜
                    </button>
                    <button class="console-btn" id="console-clear" title="Netejar">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="console-content" id="console-content"></div>
        `;
        
        this.container.appendChild(consoleDiv);
        this.element = consoleDiv;
        this.content = consoleDiv.querySelector('#console-content');
        
        this.setupEventListeners();
        this.addWelcomeMessage();
    }

    setupEventListeners() {
        // Botó clear
        const clearBtn = this.element.querySelector('#console-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }

        // Botó auto-scroll toggle
        const autoScrollBtn = this.element.querySelector('#console-auto-scroll');
        if (autoScrollBtn) {
            autoScrollBtn.addEventListener('click', () => {
                this.autoScroll = !this.autoScroll;
                autoScrollBtn.style.opacity = this.autoScroll ? '1' : '0.5';
                this.log(`Auto-scroll: ${this.autoScroll ? 'activat' : 'desactivat'}`, 'info');
            });
        }
    }

    addWelcomeMessage() {
        this.success('✓ Consola inicialitzada');
        this.log('→ Esperant execució de scripts...');
    }

    /**
     * Afegir línia de log genèrica
     */
    addLine(text, type = 'log') {
        const line = document.createElement('div');
        line.className = `console-line console-${type}`;
        
        // Timestamp
        const timestamp = new Date().toLocaleTimeString('ca-ES', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'console-timestamp';
        timestampSpan.textContent = `[${timestamp}] `;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'console-text';
        textSpan.textContent = text;
        
        line.appendChild(timestampSpan);
        line.appendChild(textSpan);
        
        this.content.appendChild(line);
        
        // Limitar línies
        this.limitLines();
        
        // Auto-scroll
        if (this.autoScroll) {
            this.scrollToBottom();
        }
        
        return line;
    }

    /**
     * Log normal (blanc)
     */
    log(text) {
        return this.addLine(text, 'log');
    }

    /**
     * Error (vermell)
     */
    error(text) {
        return this.addLine(text, 'error');
    }

    /**
     * Success (verd)
     */
    success(text) {
        return this.addLine(text, 'success');
    }

    /**
     * Warning (groc)
     */
    warn(text) {
        return this.addLine(text, 'warn');
    }

    /**
     * Info (blau)
     */
    info(text) {
        return this.addLine(text, 'info');
    }

    /**
     * Debug (gris)
     */
    debug(text) {
        return this.addLine(text, 'debug');
    }

    /**
     * Netejar consola
     */
    clear() {
        this.content.innerHTML = '';
        this.info('Consola netejada');
    }

    /**
     * Scroll automàtic al final
     */
    scrollToBottom() {
        this.content.scrollTop = this.content.scrollHeight;
    }

    /**
     * Limitar nombre de línies
     */
    limitLines() {
        const lines = this.content.querySelectorAll('.console-line');
        if (lines.length > this.maxLines) {
            const toRemove = lines.length - this.maxLines;
            for (let i = 0; i < toRemove; i++) {
                lines[i].remove();
            }
        }
    }

    /**
     * Escriure múltiples línies
     */
    writeLines(text, type = 'log') {
        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                this.addLine(line, type);
            }
        });
    }

    /**
     * Obtenir tot el text de la consola
     */
    getText() {
        const lines = this.content.querySelectorAll('.console-line .console-text');
        return Array.from(lines).map(line => line.textContent).join('\n');
    }

    /**
     * Exportar consola a text
     */
    export() {
        const text = this.getText();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.success('Consola exportada');
    }

    /**
     * Activar/desactivar auto-scroll
     */
    setAutoScroll(enabled) {
        this.autoScroll = enabled;
        const btn = this.element.querySelector('#console-auto-scroll');
        if (btn) {
            btn.style.opacity = enabled ? '1' : '0.5';
        }
    }

    /**
     * Destruir component
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Exportar globalment
if (typeof window !== 'undefined') {
    window.ConsoleOutputClass = ConsoleOutput;
}

console.log('✓ ConsoleOutput loaded');
