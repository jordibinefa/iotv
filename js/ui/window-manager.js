/**
 * WindowManager - Gestió de finestres modals
 * 
 * Permet crear finestres movibles, redimensionables i minimitzables
 * Estil similar a IDE moderns (VSCode, IntelliJ)
 */

class WindowManager {
    constructor() {
        this.windows = new Map(); // id → Window instance
        this.activeWindow = null;
        this.zIndexCounter = 10100; // Per sobre del menu-bar (z-index: 10000)
        this.taskbar = null;
        
        this.init();
    }

    init() {
        // Crear contenidor per finestres si no existeix
        if (!document.getElementById('windows-container')) {
            const container = document.createElement('div');
            container.id = 'windows-container';
            document.body.appendChild(container);
        }

        // Crear taskbar per finestres minimitzades
        this.createTaskbar();
        
        // Subscriure's a esdeveniments globals
        this.setupGlobalEvents();
    }

    createTaskbar() {
        const existing = document.getElementById('taskbar');
        if (existing) {
            this.taskbar = existing; // Reutilitzar si ja existeix al DOM
            return;
        }
        
        const taskbar = document.createElement('div');
        taskbar.id = 'taskbar';
        taskbar.className = 'taskbar';
        document.body.appendChild(taskbar);
        
        this.taskbar = taskbar;
    }

    _updateTaskbarSize() {
        // No cal: la taskbar s'expandeix sola amb min-height CSS
    }

    setupGlobalEvents() {
        // ESC per tancar finestra activa
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeWindow) {
                this.closeWindow(this.activeWindow.id);
            }
        });
    }

    /**
     * Crear nova finestra
     */
    createWindow(options = {}) {
        const defaultOptions = {
            id: `window-${Date.now()}`,
            title: 'Nova finestra',
            content: '',
            width: 600,
            height: 400,
            x: 100,
            y: 100,
            minWidth: 300,
            minHeight: 200,
            resizable: true,
            movable: true,
            minimizable: true,
            maximizable: true,
            closable: true,
            modal: false,
            onClose: null,
            onMinimize: null,
            onMaximize: null,
            onRestore: null
        };

        const config = { ...defaultOptions, ...options };

        // Si ja existeix, portar al front
        if (this.windows.has(config.id)) {
            this.bringToFront(config.id);
            return this.windows.get(config.id);
        }

        // Crear instància de finestra
        const windowInstance = new Window(config, this);
        this.windows.set(config.id, windowInstance);

        // Afegir al DOM
        const container = document.getElementById('windows-container');
        container.appendChild(windowInstance.element);

        // Portar al front en el proper tick (per sobre de qualsevol mousedown pendent)
        this.bringToFront(config.id);
        setTimeout(() => this.bringToFront(config.id), 0);

        // Emetre esdeveniment
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.WINDOW_OPENED, {
                id: config.id,
                title: config.title
            });
        }

        // Guardar posició si ConfigManager està disponible
        this.saveWindowPosition(config.id);

        return windowInstance;
    }

    /**
     * Tancar finestra
     */
    closeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;

        // Cridar callback onClose
        if (win.config.onClose) {
            const shouldClose = win.config.onClose();
            if (shouldClose === false) return; // Cancel·lar tancament
        }

        // Eliminar del DOM
        win.element.remove();

        // Eliminar del Map
        this.windows.delete(id);

        // Eliminar de taskbar si està minimitzada
        this.removeFromTaskbar(id);

        // Actualitzar finestra activa
        if (this.activeWindow?.id === id) {
            this.activeWindow = null;
            // Activar última finestra restant
            const remaining = Array.from(this.windows.values());
            if (remaining.length > 0) {
                this.bringToFront(remaining[remaining.length - 1].id);
            }
        }

        // Emetre esdeveniment
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.WINDOW_CLOSED, {
                id: id
            });
        }
    }

    /**
     * Minimitzar finestra
     */
    minimizeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;

        win.minimize();
        this.addToTaskbar(win);

        // Emetre esdeveniment
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.WINDOW_MINIMIZED, {
                id: id
            });
        }
    }

    /**
     * Restaurar finestra minimitzada
     */
    restoreWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;

        win.restore();
        this.removeFromTaskbar(id);
        this.bringToFront(id);
    }

    /**
     * Maximitzar finestra
     */
    maximizeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;

        win.maximize();

        // Emetre esdeveniment
        if (window.EventBus) {
            window.EventBus.emit(window.EventBus.EVENTS.WINDOW_MAXIMIZED, {
                id: id
            });
        }
    }

    /**
     * Portar finestra al front
     */
    bringToFront(id) {
        const win = this.windows.get(id);
        if (!win) return;

        // Si és modal, donar z-index per sobre dels overlays de diàleg
        if (win.config.modal) {
            win.element.style.zIndex = 30001;
        } else {
            // Actualitzar z-index normal
            this.zIndexCounter++;
            win.element.style.zIndex = this.zIndexCounter;
        }

        // Marcar com activa
        if (this.activeWindow) {
            this.activeWindow.element.classList.remove('active');
        }
        this.activeWindow = win;
        win.element.classList.add('active');
    }

    /**
     * Afegir finestra a taskbar
     */
    addToTaskbar(win) {
        if (!this.taskbar) return;

        // Comprovar si ja existeix
        if (document.getElementById(`taskbar-${win.id}`)) return;

        const button = document.createElement('button');
        button.id = `taskbar-${win.id}`;
        button.className = 'taskbar-button';
        const icon = win.config.taskbarIcon || win.config.icon || '🪟';
        button.innerHTML = `
            <span class="taskbar-icon">${icon}</span>
            <span class="taskbar-title">${win.config.title}</span>
        `;
        button.onclick = () => this.restoreWindow(win.id);

        this.taskbar.appendChild(button);
        this._updateTaskbarSize();
    }

    /**
     * Eliminar finestra de taskbar
     */
    removeFromTaskbar(id) {
        const button = document.getElementById(`taskbar-${id}`);
        if (button) {
            button.remove();
            this._updateTaskbarSize();
        }
    }

    /**
     * Obtenir finestra per ID
     */
    getWindow(id) {
        return this.windows.get(id);
    }

    /**
     * Comprovar si una finestra està oberta
     */
    isWindowOpen(id) {
        return this.windows.has(id);
    }

    /**
     * Tancar totes les finestres
     */
    closeAll() {
        const ids = Array.from(this.windows.keys());
        ids.forEach(id => this.closeWindow(id));
    }

    /**
     * Guardar posició de finestra
     */
    saveWindowPosition(id) {
        const win = this.windows.get(id);
        if (!win || !window.ConfigManager) return;

        const position = {
            x: win.x,
            y: win.y,
            width: win.width,
            height: win.height,
            isMaximized: win.isMaximized
        };

        window.ConfigManager.saveWindowPosition(id, position);
    }

    /**
     * Restaurar posició guardada
     */
    restoreWindowPosition(id) {
        if (!window.ConfigManager) return null;
        return window.ConfigManager.getWindowPosition(id);
    }

    /**
     * Restaurar totes les finestres en cascada
     * Mostra/obre finestres principals i les distribueix visualment
     */
    restoreAllWindows() {
        const windowIds = Array.from(this.windows.keys());
        const CASCADE_OFFSET = 30;
        const START_X = 50;
        const START_Y = 80;
        
        let cascadeIndex = 0;
        
        // Processar cada finestra
        windowIds.forEach(id => {
            const win = this.windows.get(id);
            if (!win) return;
            
            // Restaurar finestres minimitzades
            if (win.isMinimized) {
                win.restore();
                this.removeFromTaskbar(id);
            }
            
            // Desmaxímitzar si cal
            if (win.isMaximized) {
                win.restore();
            }
            
            // Posicionar en cascada
            const x = START_X + (cascadeIndex * CASCADE_OFFSET);
            const y = START_Y + (cascadeIndex * CASCADE_OFFSET);
            
            win.setPosition(x, y);
            
            // Assegurar que és visible
            win.element.style.display = '';
            
            cascadeIndex++;
        });
        
        // Portar la primera finestra al front
        if (windowIds.length > 0) {
            this.bringToFront(windowIds[0]);
        }
    }
}

/**
 * Classe Window individual
 */
class Window {
    constructor(config, manager) {
        this.config = config;
        this.manager = manager;
        this.id = config.id;
        
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        
        this.isMinimized = false;
        this.isMaximized = false;
        this.visible = true; // Finestra visible per defecte
        this.prevState = null; // Per restaurar després de maximitzar
        
        this.isDragging = false;
        this.isResizing = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeDirection = null;
        
        this.createElement();
        this.setupEventListeners();
        
        // Restaurar posició guardada si existeix
        const savedPos = manager.restoreWindowPosition(this.id);
        if (savedPos) {
            this.x = savedPos.x;
            this.y = savedPos.y;
            this.width = savedPos.width;
            this.height = savedPos.height;
            if (savedPos.isMaximized) {
                this.maximize();
            }
        }
        
        this.updatePosition();
    }

    createElement() {
        const win = document.createElement('div');
        win.className = 'window';
        win.id = this.id;
        
        win.innerHTML = `
            <div class="window-header">
                <div class="window-title">${this.config.title}</div>
                <div class="window-controls">
                    ${this.config.minimizable ? '<button class="window-btn window-minimize" title="Minimitzar">−</button>' : ''}
                    ${this.config.maximizable ? '<button class="window-btn window-maximize" title="Maximitzar">□</button>' : ''}
                    ${this.config.closable ? '<button class="window-btn window-close" title="Tancar">×</button>' : ''}
                </div>
            </div>
            <div class="window-content"></div>
            ${this.config.resizable ? '<div class="window-resizer"></div>' : ''}
        `;
        
        this.element = win;
        this.header = win.querySelector('.window-header');
        this.contentElement = win.querySelector('.window-content');
        this.resizer = win.querySelector('.window-resizer');
        
        // Afegir contingut usant setContent
        this.setContent(this.config.content);
    }

    setupEventListeners() {
        // Drag header
        if (this.config.movable) {
            this.header.addEventListener('mousedown', (e) => this.startDrag(e));
        }

        // Resize
        if (this.config.resizable && this.resizer) {
            this.resizer.addEventListener('mousedown', (e) => this.startResize(e));
        }

        // Window controls
        const minimizeBtn = this.element.querySelector('.window-minimize');
        const maximizeBtn = this.element.querySelector('.window-maximize');
        const closeBtn = this.element.querySelector('.window-close');

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.manager.minimizeWindow(this.id));
        }

        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                if (this.isMaximized) {
                    this.restore();
                } else {
                    this.maximize();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.manager.closeWindow(this.id));
        }

        // Click per portar al front
        this.element.addEventListener('mousedown', () => {
            this.manager.bringToFront(this.id);
        });

        // Double-click header per maximitzar/restaurar
        this.header.addEventListener('dblclick', () => {
            if (this.config.maximizable) {
                if (this.isMaximized) {
                    this.restore();
                } else {
                    this.maximize();
                }
            }
        });
    }

    startDrag(e) {
        if (e.target.closest('.window-controls')) return;
        if (this.isMaximized) return;

        this.isDragging = true;
        this.dragStartX = e.clientX - this.x;
        this.dragStartY = e.clientY - this.y;

        const onMouseMove = (e) => this.onDrag(e);
        const onMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.manager.saveWindowPosition(this.id);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        e.preventDefault();
    }

    onDrag(e) {
        if (!this.isDragging) return;

        this.x = e.clientX - this.dragStartX;
        this.y = e.clientY - this.dragStartY;

        // Limitar a viewport
        this.x = Math.max(0, Math.min(window.innerWidth - 100, this.x));
        this.y = Math.max(0, Math.min(window.innerHeight - 50, this.y));

        this.updatePosition();
    }

    startResize(e) {
        this.isResizing = true;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.resizeStartWidth = this.width;
        this.resizeStartHeight = this.height;

        const onMouseMove = (e) => this.onResize(e);
        const onMouseUp = () => {
            this.isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.manager.saveWindowPosition(this.id);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        e.preventDefault();
        e.stopPropagation();
    }

    onResize(e) {
        if (!this.isResizing) return;

        const dx = e.clientX - this.resizeStartX;
        const dy = e.clientY - this.resizeStartY;

        this.width = Math.max(this.config.minWidth, this.resizeStartWidth + dx);
        this.height = Math.max(this.config.minHeight, this.resizeStartHeight + dy);

        this.updatePosition();
    }

    updatePosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.height}px`;
    }

    minimize() {
        this.isMinimized = true;
        this.visible = false;
        this.element.style.display = 'none';
    }

    restore() {
        if (this.isMaximized) {
            // Restaurar des de maximitzat
            this.isMaximized = false;
            this.element.classList.remove('maximized');
            
            if (this.prevState) {
                this.x = this.prevState.x;
                this.y = this.prevState.y;
                this.width = this.prevState.width;
                this.height = this.prevState.height;
                
                // Restaurar z-index original
                if (this.prevState.zIndex) {
                    this.element.style.zIndex = this.prevState.zIndex;
                }
                
                this.prevState = null;
            }
            
            this.updatePosition();
        } else if (this.isMinimized) {
            // Restaurar des de minimitzat
            this.isMinimized = false;
            this.visible = true;
            this.element.style.display = '';
        }
    }

    maximize() {
        if (this.isMaximized) return;

        // Guardar estat actual (incloent z-index)
        this.prevState = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            zIndex: this.element.style.zIndex
        };

        this.isMaximized = true;
        this.element.classList.add('maximized');

        // Aplicar z-index alt per estar sobre el menu-bar (z-index: 10000)
        this.element.style.zIndex = 10001;

        // Ocupar tot el viewport (deixant espai pel menu-bar)
        this.x = 0;
        this.y = 36;  // Alçada del menu-bar
        this.width = window.innerWidth;
        this.height = window.innerHeight - 36;

        this.updatePosition();
    }

    setContent(content) {
        if (typeof content === 'string') {
            this.contentElement.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.contentElement.innerHTML = '';
            this.contentElement.appendChild(content);
        }
    }

    setTitle(title) {
        this.config.title = title;
        const titleElement = this.element.querySelector('.window-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Establir posició de la finestra
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.updatePosition();
    }

    /**
     * Establir mida de la finestra
     */
    setSize(width, height) {
        this.width = Math.max(this.config.minWidth, width);
        this.height = Math.max(this.config.minHeight, height);
        this.updatePosition();
    }

    /**
     * Mostrar finestra (fer visible)
     */
    show() {
        this.visible = true;
        this.element.style.display = '';
        
        // Portar al front quan es mostra
        if (this.manager) {
            this.manager.bringToFront(this.id);
        }
    }

    /**
     * Amagar finestra (fer invisible però no tancar)
     */
    hide() {
        this.visible = false;
        this.element.style.display = 'none';
    }
}

// Crear instància global singleton
if (typeof window !== 'undefined') {
    window.WindowManagerClass = WindowManager;
    window.WindowManager = new WindowManager();
    window.windowManager = window.WindowManager; // Alias
}

console.log('✓ WindowManager loaded');
