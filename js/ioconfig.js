// ioconfig.js (GLOBAL, sense imports/exports)
// Versió 2.0 - Suport per múltiples instàncies del mateix tipus de bessó
(function () {
	const cabling = [];

	// Exposar configuració global
	window.__ioCabling = cabling;

	/**
	 * Obtenir configuració IO per nom d'instància
	 * @param {string} instanceName - Nom de la instància (ex: 'pont-h-00')
	 * @param {object} overrides - Sobreescriure camps específics (opcional)
	 * @returns {object} Configuració IO
	 */
	window.getIoConfig = function (instanceName, overrides = {}) {
		if (!instanceName || typeof instanceName !== 'string') {
		  throw new Error(`getIoConfig(instanceName): instanceName invàlid: ${instanceName}`);
		}

		const entry = cabling.find(e => e.name === instanceName);
		if (!entry) {
		  const names = cabling.map(e => e.name).join(', ');
		  throw new Error(`No hi ha IO config per "${instanceName}". Disponibles: ${names}`);
		}

		return mergeConfig(entry.ioConfig, overrides);
	};

	/**
	 * Obtenir tipus de bessó per nom d'instància
	 * @param {string} instanceName - Nom de la instància
	 * @returns {string|null} Tipus de bessó ('pont-h', 'cinta', etc.)
	 */
	window.getBessoType = function (instanceName) {
		if (!instanceName || typeof instanceName !== 'string') {
		  return null;
		}
		const entry = cabling.find(e => e.name === instanceName);
		return entry ? entry.type : null;
	};

	/**
	 * Obtenir configuració completa (type + name + ioConfig)
	 * @param {string} instanceName - Nom de la instància
	 * @returns {object|null} Objecte complet o null
	 */
	window.getBessoConfig = function (instanceName) {
		if (!instanceName || typeof instanceName !== 'string') {
		  return null;
		}
		return cabling.find(e => e.name === instanceName) || null;
	};

	/**
	 * Obtenir totes les configuracions
	 * @returns {Array} Array amb totes les configuracions
	 */
	window.getAllBessoConfigs = function () {
		return JSON.parse(JSON.stringify(cabling)); // Deep clone
	};

	/**
	 * Actualitzar tota la configuració (per reload)
	 * @param {Array} newCabling - Nova configuració
	 * @returns {boolean} True si s'ha actualitzat correctament
	 */
	window.updateIoCabling = function (newCabling) {
		if (!Array.isArray(newCabling)) {
			throw new Error('updateIoCabling: newCabling ha de ser un array');
		}
		// Reemplaçar configuració
		cabling.length = 0;
		cabling.push(...newCabling);
		window.__ioCabling = cabling;
		return true;
	};

	// ============================================
	// FUNCIONS AUXILIARS
	// ============================================

	function deepClone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}

	// merge senzill (top-level + mapes)
	function mergeConfig(base, overrides) {
		const out = deepClone(base);
		if (!overrides || typeof overrides !== 'object') return out;

		if (overrides.vertebra != null) out.vertebra = overrides.vertebra;

		if (overrides.outputMap) out.outputMap = { ...out.outputMap, ...overrides.outputMap };
		if (overrides.inputMap) out.inputMap = { ...out.inputMap, ...overrides.inputMap };
		if (overrides.analogOutputMap) out.analogOutputMap = { ...out.analogOutputMap, ...overrides.analogOutputMap };
		if (overrides.analogInputMap) out.analogInputMap = { ...out.analogInputMap, ...overrides.analogInputMap };

		return out;
	}
	
})();

console.log('✓ ioconfig.js v2.0 loaded - Suport per múltiples instàncies');
