/**
 * Canvas Helpers v2 - Funcions auxiliars per renderització dinàmica
 * 
 * Funcions reutilitzables per calcular posicions, convertir adreces,
 * seleccionar imatges, etc. per al canvas dinàmic.
 */

const CanvasHelpers = {
    // Constants de mides
    CAP_HEIGHT: 600,
    VERTEBRA_HEIGHT: 600,
    VERTEBRA_SPACING: 20,
    VERTEBRA_WIDTH: 600,
    COSTELLA_WIDTH: 600,
    COSTELLA_OFFSET_LEFT: -910,   // Costella A (esquerra)
    COSTELLA_OFFSET_RIGHT: 310,   // Costella B (dreta)
    VERTEBRA_OFFSET_X: -300,      // Offset X de la vèrtebra

    /**
     * Calcular posició Y d'una vèrtebra segons índex
     * @param {number} index - Índex de la vèrtebra (0, 1, 2...)
     * @returns {number} Posició Y
     */
    calculateVertebraY(index) {
        return this.CAP_HEIGHT + this.VERTEBRA_SPACING + 
               (index * (this.VERTEBRA_HEIGHT + this.VERTEBRA_SPACING));
    },

    /**
     * Convertir adreça a binari per display visual
     * @param {string} addr - Adreça ('0x0', '0000', etc.)
     * @returns {string} Binari de 4 bits (ex: '0000')
     */
    addrToBinary(addr) {
        const str = addr.toString();
        
        // Si ja és binari
        if (/^[01]{4}$/.test(str)) {
            return str;
        }
        
        // Si és hex '0x0' a '0xF'
        if (/^0x[0-9A-Fa-f]$/.test(str)) {
            const num = parseInt(str.substring(2), 16);
            return num.toString(2).padStart(4, '0');
        }
        
        // Si és només dígit hex
        if (/^[0-9A-Fa-f]$/.test(str)) {
            const num = parseInt(str, 16);
            return num.toString(2).padStart(4, '0');
        }
        
        return '0000';
    },

    /**
     * Obtenir nom de fitxer d'imatge per una costella
     * @param {string} type - 'digital' o 'analog'
     * @param {string} funcio - 'output' o 'input'
     * @returns {string} Nom del fitxer (ex: 'costellaDigitalA.png')
     */
    getImageNameForCostella(type, funcio) {
        if (type === 'digital') {
            return funcio === 'output' ? 'costellaDigitalA.png' : 'costellaDigitalB.png';
        } else {
            return funcio === 'output' ? 'costellaAnalogicaA.png' : 'costellaAnalogicaB.png';
        }
    },

    /**
     * Calcular rotació d'imatge segons costella i funció
     * @param {string} side - 'a' o 'b'
     * @param {string} funcio - 'output' o 'input'
     * @returns {number} Graus de rotació (0 o 180)
     */
    getImageRotation(side, funcio) {
        // Costella A (esquerra)
        if (side === 'a') {
            // Output: normal (0°), Input: girat (180°)
            return funcio === 'output' ? 0 : 180;
        } 
        // Costella B (dreta)
        else {
            // Output: girat (180°), Input: normal (0°)
            return funcio === 'output' ? 180 : 0;
        }
    },

    /**
     * Obtenir offset X per costella segons costat
     * @param {string} side - 'a' o 'b'
     * @returns {number} Offset X
     */
    getCostellaOffsetX(side) {
        return side === 'a' ? this.COSTELLA_OFFSET_LEFT : this.COSTELLA_OFFSET_RIGHT;
    },

    /**
     * Generar ID únic per component
     * @param {string} type - Tipus de component ('led', 'switch', 'display', 'slider')
     * @param {string} addr - Adreça vèrtebra
     * @param {string} side - Costat ('a' o 'b')
     * @param {number} index - Bit o canal
     * @returns {string} ID únic
     */
    /*generateComponentId(type, addr, side, index) {
        return `ct-${type}-${addr}-${side}-${index}`;
    },*/
    
	generateComponentId(type, addr, side, index) {
		// Normalitzar adreça a hexadecimal minúscules
		const normalizedAddr = this.addrToHex(addr);
		return `ct-${type}-${normalizedAddr}-${side}-${index}`;
	},

	/**
	 * Convertir qualsevol adreça a format hex (0x0)
	 */
	addrToHex(addr) {
		const str = addr.toString();
		
		// Si ja és hex lowercase correcte
		if (/^0x[0-9a-f]$/.test(str)) {
			return str;
		}
		
		// Si és hex uppercase
		if (/^0x[0-9A-F]$/.test(str)) {
			return str.toLowerCase();
		}
		
		// Si és binari '0000' a '1111'
		if (/^[01]{4}$/.test(str)) {
			const num = parseInt(str, 2);
			return `0x${num.toString(16)}`;
		}
		
		// Si és només un dígit hex
		if (/^[0-9A-Fa-f]$/.test(str)) {
			return `0x${str.toLowerCase()}`;
		}
		
		// Fallback: retornar tal qual
		return addr;
	},    

    /**
     * Obtenir label de costella segons tipus i funció
     * @param {string} type - 'digital' o 'analog'
     * @param {string} funcio - 'output' o 'input'
     * @returns {string} Label (ex: '8 DO', '4 AI')
     */
    getCostellaLabel(type, funcio) {
        if (type === 'digital') {
            return funcio === 'output' ? '8 DO' : '8 DI';
        } else {
            return funcio === 'output' ? '4 AO' : '4 AI';
        }
    },

    /**
     * Obtenir color per tipus de vèrtebra
     * @param {string} type - 'digital' o 'analog'
     * @returns {string} Color hex
     */
    getVertebraColor(type) {
        return type === 'digital' ? '#3498db' : '#e67e22';
    },

    /**
     * Obtenir color per tipus de costella
     * @param {string} type - 'digital' o 'analog'
     * @param {string} funcio - 'output' o 'input'
     * @returns {string} Color hex
     */
    getCostellaColor(type, funcio) {
        if (type === 'digital') {
            return funcio === 'output' ? '#16a085' : '#8e44ad';
        } else {
            return funcio === 'output' ? '#2ecc71' : '#3498db';
        }
    },

    /**
     * Validar configuració bàsica
     * @param {Object} config - Configuració a validar
     * @returns {boolean} True si és vàlida
     */
    isValidConfig(config) {
        return config && 
               config.vertebrae && 
               Array.isArray(config.vertebrae) && 
               config.vertebrae.length > 0;
    },

    /**
     * Comptar components segons configuració
     * @param {Object} config - Configuració
     * @returns {Object} { leds, switches, displays, sliders }
     */
    countComponents(config) {
        let leds = 0, switches = 0, displays = 0, sliders = 0;
        
        if (!this.isValidConfig(config)) {
            return { leds, switches, displays, sliders };
        }
        
        config.vertebrae.forEach(v => {
            if (v.type === 'digital') {
                if (v.costellaA === 'output') leds += 8;
                if (v.costellaB === 'output') leds += 8;
                if (v.costellaA === 'input') switches += 8;
                if (v.costellaB === 'input') switches += 8;
            } else if (v.type === 'analog') {
                if (v.costellaA === 'output') displays += 4;
                if (v.costellaB === 'output') displays += 4;
                if (v.costellaA === 'input') sliders += 4;
                if (v.costellaB === 'input') sliders += 4;
            }
        });
        
        return { leds, switches, displays, sliders };
    },

    /**
     * Calcular alçada total del canvas segons configuració
     * @param {Object} config - Configuració
     * @returns {number} Alçada en píxels
     */
    calculateTotalHeight(config) {
        if (!this.isValidConfig(config)) {
            return this.CAP_HEIGHT + this.VERTEBRA_HEIGHT + 100;
        }
        
        const numVertebrae = config.vertebrae.length;
        return this.CAP_HEIGHT + 
               (numVertebrae * this.VERTEBRA_HEIGHT) + 
               ((numVertebrae + 1) * this.VERTEBRA_SPACING) + 
               100; // Marge inferior
    },

    /**
     * Crear SVG de fons per placa (amb o sense imatge)
     * @param {string} imageHref - URL de la imatge o null
     * @param {number} width - Amplada
     * @param {number} height - Alçada
     * @param {string} fillColor - Color de fons si no hi ha imatge
     * @param {number} rotation - Graus de rotació (opcional)
     * @returns {string} SVG del fons
     */
    createPlateBackground(imageHref, width, height, fillColor, rotation = 0) {
        if (imageHref) {
            const centerX = width / 2;
            const centerY = height / 2;
            const transform = rotation !== 0 ? 
                `transform="rotate(${rotation} ${centerX} ${centerY})"` : '';
            
            return `
                <image x="0" y="0" width="${width}" height="${height}"
                       href="${imageHref}" 
                       ${transform}
                       preserveAspectRatio="none"/>
                <rect x="0" y="0" width="${width}" height="${height}"
                      fill="none" stroke="#ecf0f1" stroke-width="4" rx="10"/>
            `;
        } else {
            return `
                <rect x="0" y="0" width="${width}" height="${height}"
                      fill="${fillColor}" stroke="#ecf0f1" stroke-width="4" rx="10"/>
            `;
        }
    }
};

// Exportar per ús global
if (typeof window !== 'undefined') {
    window.CanvasHelpers = CanvasHelpers;
}

console.log('✓ CanvasHelpers v2 loaded');
