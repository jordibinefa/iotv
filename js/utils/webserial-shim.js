/**
 * WebSerial Shim - Emulació de pyserial per al transpilador Python→JS
 * 
 * Permet als scripts Python usar:
 *   import serial
 *   ser = serial.Serial(port='COM9', baudrate=115200)
 *   ser.write(b'R\n')
 *   value = ser.readline().decode('ascii').strip()
 *   ser.close()
 * 
 * Utilitza la Web Serial API (Chrome/Edge).
 * Si el navegador no és compatible, mostra error a la consola.
 */

class WebSerialShim {
    // Registre global de ports oberts per evitar conflictes
    static _openPorts = new Map(); // nativePort → { owner: string, portObj: WebSerialPort }

    /**
     * Crear una connexió sèrie
     * @param {Object} options - {port, baudrate/baudRate, timeout}
     * @returns {WebSerialPort} objecte amb write/readline/read/flush/close
     */
    static async Serial(options = {}) {
        const port = options.port || 'N/A';
        const baudRate = options.baudrate || options.baudRate || 9600;
        const timeout = options.timeout || 1;

        // Comprovar suport Web Serial
        if (!navigator.serial) {
            const t = window.t || (k => k);
            throw new Error(t('serial.not_supported'));
        }

        console.log(`[serial] Obrint port... (referència: ${port}, baudRate: ${baudRate})`);

        let serialPort;
        try {
            serialPort = await navigator.serial.requestPort();
        } catch (err) {
            if (err.name === 'NotFoundError') {
                const t = window.t || (k => k);
                throw new Error(t('serial.no_port_selected'));
            }
            throw new Error(`[serial] Error seleccionant port: ${err.message}`);
        }

        // Comprovar si el port ja està en ús
        if (WebSerialShim._openPorts.has(serialPort)) {
            const existing = WebSerialShim._openPorts.get(serialPort);
            const t = window.t || (k => k);
            throw new Error(t('serial.port_in_use', { owner: existing.owner }));
        }

        try {
            await serialPort.open({ baudRate: baudRate });
        } catch (err) {
            throw new Error(`[serial] Error obrint port: ${err.message}`);
        }

        const owner = WebSerialShim._currentOwner || 'script';
        const portObj = new WebSerialPort(serialPort, baudRate, timeout, port);

        // Registrar al mapa global
        WebSerialShim._openPorts.set(serialPort, { owner, portObj });

        console.log(`[serial] ✓ Port obert (baudRate: ${baudRate}, owner: ${owner})`);

        return portObj;
    }

    /**
     * Tancar tots els ports oberts per un owner concret (cleanup en aturar script)
     * @param {string} owner - Identificador de l'owner ('editor' | 'console')
     */
    static async closeAllByOwner(owner) {
        const toClose = [];
        for (const [nativePort, info] of WebSerialShim._openPorts) {
            if (info.owner === owner) {
                toClose.push(info.portObj);
            }
        }
        for (const portObj of toClose) {
            try {
                await portObj.close();
            } catch (e) {
                console.warn(`[serial] Error tancant port (owner=${owner}):`, e.message);
            }
        }
    }
}


class WebSerialPort {
    constructor(port, baudRate, timeout, portName) {
        this._port = port;
        this._baudRate = baudRate;
        this._timeout = timeout;
        this._portName = portName;
        this._reader = null;
        this._writer = null;
        this._readBuffer = '';
        this._closed = false;
        this._readerLock = false;
        this._textDecoder = new TextDecoder();
        this._textEncoder = new TextEncoder();
    }

    /**
     * Escriure dades al port sèrie
     * @param {string} data - Dades a enviar (el shim gestiona b'...' → string)
     */
    async write(data) {
        if (this._closed) throw new Error('[serial] Port tancat');
        
        if (!this._writer) {
            this._writer = this._port.writable.getWriter();
        }

        const encoded = this._textEncoder.encode(data);
        await this._writer.write(encoded);
    }

    /**
     * flush (noop per Web Serial, l'escriptura ja és directa)
     */
    async flush() {
        // Web Serial fa flush automàticament
    }

    /**
     * Llegir una línia (fins a \n)
     * @returns {Object} objecte amb .decode() que retorna string
     */
    async readline() {
        if (this._closed) throw new Error('[serial] Port tancat');

        const timeoutMs = this._timeout * 1000;
        const startTime = Date.now();

        while (true) {
            // Comprovar si tenim una línia al buffer
            const newlineIndex = this._readBuffer.indexOf('\n');
            if (newlineIndex !== -1) {
                const line = this._readBuffer.substring(0, newlineIndex + 1);
                this._readBuffer = this._readBuffer.substring(newlineIndex + 1);
                // Retornar objecte que emula bytes amb .decode()
                return new SerialBytes(line);
            }

            // Llegir més dades
            if (!this._reader) {
                this._reader = this._port.readable.getReader();
            }

            // Timeout check
            if (Date.now() - startTime > timeoutMs) {
                const partial = this._readBuffer;
                this._readBuffer = '';
                return new SerialBytes(partial);
            }

            try {
                const { value, done } = await Promise.race([
                    this._reader.read(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('timeout')), 
                                   Math.max(100, timeoutMs - (Date.now() - startTime)))
                    )
                ]);

                if (done) {
                    const partial = this._readBuffer;
                    this._readBuffer = '';
                    return new SerialBytes(partial);
                }

                this._readBuffer += this._textDecoder.decode(value, { stream: true });
            } catch (err) {
                if (err.message === 'timeout') {
                    const partial = this._readBuffer;
                    this._readBuffer = '';
                    return new SerialBytes(partial);
                }
                throw err;
            }
        }
    }

    /**
     * Llegir N bytes
     * @param {number} size - Nombre de bytes a llegir
     * @returns {SerialBytes}
     */
    async read(size = 1) {
        if (this._closed) throw new Error('[serial] Port tancat');

        const timeoutMs = this._timeout * 1000;
        const startTime = Date.now();

        while (this._readBuffer.length < size) {
            if (!this._reader) {
                this._reader = this._port.readable.getReader();
            }

            if (Date.now() - startTime > timeoutMs) break;

            try {
                const { value, done } = await Promise.race([
                    this._reader.read(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')),
                                   Math.max(100, timeoutMs - (Date.now() - startTime)))
                    )
                ]);

                if (done) break;
                this._readBuffer += this._textDecoder.decode(value, { stream: true });
            } catch (err) {
                if (err.message === 'timeout') break;
                throw err;
            }
        }

        const result = this._readBuffer.substring(0, size);
        this._readBuffer = this._readBuffer.substring(size);
        return new SerialBytes(result);
    }

    /**
     * Comprovar bytes disponibles al buffer
     */
    get in_waiting() {
        return this._readBuffer.length;
    }

    /**
     * Tancar connexió
     */
    async close() {
        if (this._closed) return;
        this._closed = true;
        
        try {
            if (this._reader) {
                await this._reader.cancel();
                this._reader.releaseLock();
                this._reader = null;
            }
            if (this._writer) {
                await this._writer.close();
                this._writer.releaseLock();
                this._writer = null;
            }
            await this._port.close();
            console.log(`[serial] ✓ Port tancat (${this._portName})`);
        } catch (err) {
            console.warn('[serial] Error tancant port:', err.message);
        }

        // Desregistrar del mapa global
        if (WebSerialShim._openPorts) {
            WebSerialShim._openPorts.delete(this._port);
        }
    }

    /**
     * Propietat is_open
     */
    get is_open() {
        return !this._closed;
    }
}


/**
 * SerialBytes - Emula l'objecte bytes de Python
 * Permet fer .decode('ascii').strip() etc.
 */
class SerialBytes {
    constructor(data) {
        this._data = data;
    }

    /**
     * Emula bytes.decode('ascii') o bytes.decode('utf-8')
     * @returns {string}
     */
    decode(encoding) {
        return this._data;
    }

    /**
     * Emula bytes.strip()
     * @returns {string}
     */
    strip() {
        return this._data.trim();
    }

    toString() {
        return this._data;
    }
}


// Registrar globalment
if (typeof window !== 'undefined') {
    window.WebSerialShim = WebSerialShim;
    window.SerialBytes = SerialBytes;
}

console.log('✓ WebSerialShim loaded');
