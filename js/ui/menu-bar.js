/**
 * MenuBar - Barra de menú superior estil IDE
 * 
 * Menú amb suport per:
 * - Submenús desplegables
 * - Dreceres de teclat
 * - Internacionalització (i18n)
 * - Accions personalitzables
 */

class MenuBar {
    constructor() {
        this.menus = [];
        this.activeMenu = null;
        this.element = null;
        
        this.init();
    }

    init() {
        this.createElement();
        this.setupEventListeners();
        
        // Subscriure's a canvis d'idioma
        if (window.EventBus && window.EventBus.EVENTS) {
            window.EventBus.on(window.EventBus.EVENTS.LANGUAGE_CHANGED, () => {
                this.refresh();
            });
        }
    }

    createElement() {
        // Crear barra de menú si no existeix
        if (document.getElementById('menu-bar')) {
            this.element = document.getElementById('menu-bar');
            return;
        }

        const menuBar = document.createElement('div');
        menuBar.id = 'menu-bar';
        menuBar.className = 'menu-bar';
        document.body.insertBefore(menuBar, document.body.firstChild);
        
        this.element = menuBar;
    }

    setupEventListeners() {
        // Tancar menús en clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-bar')) {
                this.closeAllMenus();
            }
        });

        // Tancar menús amb ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllMenus();
            }
        });
    }

    /**
     * Afegir menú a la barra
     */
    addMenu(menuConfig) {
        const menu = new Menu(menuConfig, this);
        this.menus.push(menu);
        this.element.appendChild(menu.element);
        return menu;
    }

    /**
     * Tancar tots els menús
     */
    closeAllMenus() {
        this.menus.forEach(menu => menu.close());
        this.activeMenu = null;
    }

    /**
     * Refrescar tots els menús (per i18n)
     */
    refresh() {
        this.menus.forEach(menu => menu.refresh());
    }

    /**
     * Canviar el estat checked d'un item per ID (suporta radio groups)
     * @param {string} itemId - ID de l'item
     * @param {boolean} checked - Nou estat
     */
    setChecked(itemId, checked) {
        this.menus.forEach(menu => {
            const itemConfig = menu.items.find(i => i.id === itemId);
            if (!itemConfig) return;

            if (checked && itemConfig.radio) {
                menu.uncheckRadioGroup(itemConfig.radio);
            }
            itemConfig.checked = checked;

            // Actualitzar DOM
            const el = menu.dropdown.querySelector(`[data-id="${itemId}"]`);
            if (el) {
                if (checked) el.classList.add('checked');
                else el.classList.remove('checked');
            }
        });
    }

    /**
     * Canviar el estat checked d'un item per ID (suporta radio groups)
     * @param {string} itemId - ID de l'item
     * @param {boolean} checked - Nou estat
     */
    setChecked(itemId, checked) {
        this.menus.forEach(menu => {
            const itemConfig = menu.items.find(i => i.id === itemId);
            if (!itemConfig) return;

            if (checked && itemConfig.radio) {
                menu.uncheckRadioGroup(itemConfig.radio);
            }
            itemConfig.checked = checked;

            // Actualitzar DOM
            const el = menu.dropdown.querySelector(`[data-id="${itemId}"]`);
            if (el) {
                if (checked) el.classList.add('checked');
                else el.classList.remove('checked');
            }
        });
    }

    /**
     * Obtenir traducció
     */
    t(key) {
        return window.t ? window.t(key) : key;
    }

    /**
     * Nota: El menú predefinit s'ha eliminat per evitar duplicació.
     * Cada aplicació que usa MenuBar ha de crear el seu propi menú personalitzat.
     * Veure app.js per un exemple complet.
     */
}

/**
 * Classe Menu individual
 */
class Menu {
    constructor(config, menuBar) {
        this.config = config;
        this.menuBar = menuBar;
        this.id = config.id;
        this.items = config.items || [];
        
        this.isOpen = false;
        this.element = null;
        this.dropdown = null;
        
        this.createElement();
        this.setupEventListeners();
    }

    createElement() {
        // Botó del menú
        const button = document.createElement('button');
        button.className = 'menu-button';
        button.textContent = this.config._skipTranslation ? this.config.label : this.menuBar.t(this.config.label);
        
        // Dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'menu-dropdown';
        
        // Afegir items
        this.items.forEach(itemConfig => {
            const item = this.createMenuItem(itemConfig);
            if (item) {
                dropdown.appendChild(item);
            }
        });
        
        // Contenidor
        const container = document.createElement('div');
        container.className = 'menu-container';
        container.appendChild(button);
        container.appendChild(dropdown);
        
        this.element = container;
        this.button = button;
        this.dropdown = dropdown;

        // Amagar menú si hidden: true
        if (this.config.hidden) {
            container.style.display = 'none';
        }
    }

    createMenuItem(itemConfig) {
        // Separador
        if (itemConfig.type === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'menu-separator';
            return separator;
        }

        // Item normal
        const item = document.createElement('div');
        item.className = 'menu-item';
        if (itemConfig.id) item.dataset.id = itemConfig.id;
        
        if (itemConfig.disabled) {
            item.classList.add('disabled');
        }
        
        if (itemConfig.checkable) {
            item.classList.add('checkable');
            if (itemConfig.checked) {
                item.classList.add('checked');
            }
        }

        // Icon
        const icon = document.createElement('span');
        icon.className = 'menu-item-icon';
        icon.textContent = itemConfig.icon || '';
        
        // Label
        const label = document.createElement('span');
        label.className = 'menu-item-label';
        label.textContent = itemConfig._skipTranslation ? itemConfig.label : this.menuBar.t(itemConfig.label);
        
        // Shortcut
        const shortcut = document.createElement('span');
        shortcut.className = 'menu-item-shortcut';
        shortcut.textContent = itemConfig.shortcut || '';
        
        // Check indicator (per items checkables)
        if (itemConfig.checkable) {
            const check = document.createElement('span');
            check.className = 'menu-item-check';
            item.appendChild(check);
        }
        
        item.appendChild(icon);
        item.appendChild(label);
        item.appendChild(shortcut);

        // Click handler (sempre registrat; comprova disabled en temps real)
        if (itemConfig.action) {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Si està desactivat, no fer res
                if (itemConfig.disabled) return;
                
                // Toggle checked per checkables
                if (itemConfig.checkable) {
                    // Radio groups
                    if (itemConfig.radio) {
                        this.uncheckRadioGroup(itemConfig.radio);
                        itemConfig.checked = true;
                        item.classList.add('checked');
                    } else {
                        itemConfig.checked = !itemConfig.checked;
                        item.classList.toggle('checked');
                    }
                }
                
                itemConfig.action(itemConfig);
                this.close();
            });
        }

        // Guardar referència a l'item config
        item._itemConfig = itemConfig;

        return item;
    }

    uncheckRadioGroup(groupName) {
        this.items.forEach(itemConfig => {
            if (itemConfig.radio === groupName) {
                itemConfig.checked = false;
            }
        });
        
        // Actualitzar visuals
        this.dropdown.querySelectorAll('.menu-item').forEach(el => {
            if (el._itemConfig?.radio === groupName) {
                el.classList.remove('checked');
            }
        });
    }

    setupEventListeners() {
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        // Tancar altres menús
        this.menuBar.closeAllMenus();

        // Callback onOpen per ítems dinàmics (p.ex. menú Finestra)
        if (this.config.onOpen) {
            this.config.onOpen(this);
        }
        
        this.isOpen = true;
        this.element.classList.add('open');
        this.menuBar.activeMenu = this;
    }

    close() {
        this.isOpen = false;
        this.element.classList.remove('open');
    }

    /**
     * Reconstruir els ítems del dropdown (per menús dinàmics com Finestra)
     */
    rebuildItems(newItems) {
        this.items = newItems;
        this.dropdown.innerHTML = '';
        this.items.forEach(itemConfig => {
            const item = this.createMenuItem(itemConfig);
            if (item) this.dropdown.appendChild(item);
        });
    }

    refresh() {
        // Actualitzar label del botó
        this.button.textContent = this.config._skipTranslation ? this.config.label : this.menuBar.t(this.config.label);
        
        // Actualitzar labels dels items
        this.dropdown.querySelectorAll('.menu-item').forEach((el, index) => {
            const itemConfig = this.items.filter(i => i.type !== 'separator')[index];
            if (itemConfig) {
                const labelEl = el.querySelector('.menu-item-label');
                if (labelEl) {
                    labelEl.textContent = itemConfig._skipTranslation ? itemConfig.label : this.menuBar.t(itemConfig.label);
                }
            }
        });
    }

    /**
     * Activar/desactivar item
     */
    setItemEnabled(itemId, enabled) {
        const itemConfig = this.items.find(i => i.id === itemId);
        if (itemConfig) {
            itemConfig.disabled = !enabled;
        }
        
        // Actualitzar visual
        this.dropdown.querySelectorAll('.menu-item').forEach(el => {
            if (el._itemConfig?.id === itemId) {
                if (enabled) {
                    el.classList.remove('disabled');
                } else {
                    el.classList.add('disabled');
                }
            }
        });
    }

    /**
     * Marcar/desmarcar item checkable
     */
    setItemChecked(itemId, checked) {
        const itemConfig = this.items.find(i => i.id === itemId);
        if (itemConfig && itemConfig.checkable) {
            itemConfig.checked = checked;
            
            // Actualitzar visual
            this.dropdown.querySelectorAll('.menu-item').forEach(el => {
                if (el._itemConfig?.id === itemId) {
                    if (checked) {
                        el.classList.add('checked');
                    } else {
                        el.classList.remove('checked');
                    }
                }
            });
        }
    }
}

// Crear instància global singleton
if (typeof window !== 'undefined') {
    window.MenuBarClass = MenuBar;
    window.MenuBar = new MenuBar();
    window.menuBar = window.MenuBar; // Alias
}

console.log('✓ MenuBar loaded');
