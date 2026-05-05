# Com Fer Bessons Digitals Personalitzats per IoT-Vertebrae

**Versió:** 2.0  
**Data:** Febrer 2026  
**Autors:** Equip IoT-Vertebrae

---

## 📘 Índex

1. [Introducció](#1-introducció)
2. [Fonaments Elèctrics](#2-fonaments-elèctrics)
3. [Exemples Progressius](#3-exemples-progressius)
4. [Anatomia d'un Bessó](#4-anatomia-dun-bessó)
5. [Desenvolupament amb IA](#5-desenvolupament-amb-ia)
6. [Testing i Debug](#6-testing-i-debug)
7. [Annexos](#7-annexos)

---

## 1. Introducció

### 1.1 Què és un Bessó Digital IoT-Vertebrae?

Un **bessó digital** (digital twin) és una representació virtual interactiva d'un element físic (sensor, actuador, màquina) que es connecta a l'IoT-Vertebrae per simular el seu comportament.

**Exemple visual:**
```
┌─────────────────┐         ┌──────────────────┐
│  IoT-Vertebrae  │ ◄─────► │  Bessó Digital   │
│   (Controlador) │         │   (Motor, LED,   │
│                 │         │    Sensor, ...)   │
└─────────────────┘         └──────────────────┘
   Digital I/O                   Visual SVG
   Analog I/O                    Lògica JS
```

### 1.2 Per què Crear Bessons Personalitzats?

✅ **Didàctica:** Simular processos industrials sense maquinària física  
✅ **Prototipatge:** Provar lògica de control abans de construir  
✅ **Testing:** Validar programes Python/Ladder amb feedback visual  
✅ **Creativitat:** Implementar idees pròpies sense limitacions  

### 1.3 Aquest Document

Aquest document et guiarà pas a pas per crear els teus propis bessons digitals, des dels més simples (un LED) fins als més complexos (sistemes amb múltiples entrades i sortides, analògiques i digitals).

**Prerequisits:**
- Coneixements bàsics de JavaScript (variables, funcions, classes)
- Coneixements bàsics de SVG (opcional, es poden usar templates)
- Accés a IoT-Vertebrae v2

---

## 2. Fonaments Elèctrics

### 2.1 Especificacions de Tensions

IoT-Vertebrae treballa amb dues famílies de senyals:

```
╔═══════════════════════════════════════════════════════════════════╗
║                    ESPECIFICACIONS ELÈCTRIQUES                    ║
╠═══════════════════╦══════════════╦═══════════════════════════════╣
║ Tipus Terminal    ║ Rang Tensió  ║ Aplicació Típica              ║
╠═══════════════════╬══════════════╬═══════════════════════════════╣
║ Digital (opto)    ║ Vext*        ║ • 24V DC (industrial estàndard)║
║                   ║              ║ • 12V DC (aire condicionat)   ║
║                   ║              ║ • 5V DC (prototipatge)        ║
╟───────────────────╫──────────────╫───────────────────────────────╢
║ Analògic OUT (AO) ║ 0 a 10V      ║ • Actuadors proporcionals     ║
║                   ║              ║ • Vàlvules, variadors         ║
║                   ║              ║ • Control de velocitat        ║
╟───────────────────╫──────────────╫───────────────────────────────╢
║ Analògic IN (AI)  ║ -10 a +10V   ║ • Sensors bidireccionals      ║
║                   ║              ║ • Transductors de posició     ║
║                   ║              ║ • Sensors industrials 0-10V** ║
╚═══════════════════╩══════════════╩═══════════════════════════════╝

* Optoaïllament: La tensió digital correspon a l'alimentació externa
** Molts sensors industrials donen 0-10V (usen només rang positiu de -10/+10V)
```

**Notes importants:**

1. **Digital amb optoaïllament:** Les entrades/sortides digitals estan optoaïllades, per tant la tensió real depèn de l'alimentació externa connectada. En entorns industrials sol ser 24V DC, però pot variar.

2. **Analògic OUT (Sortides):** Rang **0-10V**
   - 0V = 0% (mínim)
   - 5V = 50%
   - 10V = 100% (màxim)
   - **Mai negatiu!**

3. **Analògic IN (Entrades):** Rang **-10 a +10V**
   - Permet sensors bidireccionals (ex: posició cilindre: -10V=retraït, +10V=estès)
   - Sensors unidireccionals usen 0-10V (ignoren el rang negatiu)

### 2.2 Nomenclatura de Terminals

**Perspectiva des d'IoT-Vertebrae:**

```
┌──────┬───────────────────────┬──────────────────────────┐
│ Codi │ IoT-Vertebrae         │ Bessó Digital            │
├──────┼───────────────────────┼──────────────────────────┤
│ DO   │ Digital Output        │ ← ENTRADA del bessó      │
│      │ (Sortida del control) │   (Rep ordres)           │
├──────┼───────────────────────┼──────────────────────────┤
│ DI   │ Digital Input         │ → SORTIDA del bessó      │
│      │ (Entrada al control)  │   (Envia estat)          │
├──────┼───────────────────────┼──────────────────────────┤
│ AO   │ Analog Output         │ ← ENTRADA del bessó      │
│      │ (0-10V control)       │   (Rep setpoint)         │
├──────┼───────────────────────┼──────────────────────────┤
│ AI   │ Analog Input          │ → SORTIDA del bessó      │
│      │ (-10/+10V lectura)    │   (Envia mesura)         │
└──────┴───────────────────────┴──────────────────────────┘
```

**Exemples:**
- Un **LED** rep una ordre digital → Usa **DO** (entrada al LED)
- Un **polsador** envia el seu estat → Usa **DI** (sortida del polsador)
- Un **motor** rep velocitat de consigna → Usa **AO** (entrada al motor)
- Un **sensor** envia temperatura mesurada → Usa **AI** (sortida del sensor)

### 2.3 Conversions Tensió ↔ Valor Digital

**Digital:**
```
Valor Lògic    Tensió (Vext)
    0       →      0V
    1       →     Vext (24V típic)
```

**Analògic OUT (DAC 12 bits):**
```
Voltatge    Valor Digital    Percentatge
  0.00V  →      0         →     0%
  2.50V  →   1024         →    25%
  5.00V  →   2048         →    50%
  7.50V  →   3072         →    75%
 10.00V  →   4095         →   100%
```

**Analògic IN (ADC 12 bits):**
```
Voltatge    Valor Digital    Percentatge
-10.00V  →      0         →     0%
 -5.00V  →   1024         →    25%
  0.00V  →   2048         →    50%  (punt mig)
 +5.00V  →   3072         →    75%
+10.00V  →   4095         →   100%
```

**Funcions de conversió (disponibles a IoTV API):**
```javascript
// Analògic IN: Tensió → Digital
iotv.v2ain(voltage)     // -10/+10V → 0-4095
iotv.ain2v(digital)     // 0-4095 → -10/+10V

// Analògic OUT: Tensió → Digital  
iotv.v2aout(voltage)    // 0-10V → 0-4095
iotv.aout2v(digital)    // 0-4095 → 0-10V
```

---

## 3. Exemples Progressius

Aquesta secció presenta 9 exemples ordenats per complexitat creixent, cobrint **tots** els tipus de terminals (DO, DI, AO, AI).

### 🎯 Llegenda de Complexitat

- ⭐ **SIMPLE:** 1-2 terminals, lògica bàsica
- ⭐⭐ **MITJÀ:** 3-5 terminals, lògica amb estat
- ⭐⭐⭐ **COMPLEX:** 6+ terminals, animacions, lògica avançada

---

### 3.1 Semàfor ⭐

**Descripció:** Semàfor de trànsit amb 3 llums (verd, groc, vermell).

**Complexitat:** ⭐ SIMPLE  
**Tipus:** Digital pur (només sortides)

#### Terminals

**Entrades del bessó** (des d'IoT-Vertebrae):
- `DO1` → Verd
- `DO2` → Groc  
- `DO3` → Vermell

**Sortides del bessó:** Cap

#### Visual ASCII
```
    ╔═══════╗
    ║   ●   ║  ← Vermell (DO3)
    ║       ║
    ║   ○   ║  ← Groc (DO2)
    ║       ║
    ║   ○   ║  ← Verd (DO1)
    ╚═══════╝
    
● = Encès (#ff0000)
○ = Apagat (#331111)
```

#### Fragment Clau JavaScript

```javascript
class Semafor {
    constructor(instanceName, config) {
        this.instanceName = instanceName;
        this.config = config;
        
        // Estat dels LEDs
        this.leds = {
            verd: false,    // DO1
            groc: false,    // DO2
            vermell: false  // DO3
        };
        
        this.createCanvas();
        this.subscribeToMemory();
    }
    
    subscribeToMemory() {
        window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
            // Llegir DO1, DO2, DO3 i actualitzar colors
            if (data.addr === this.config.addr && data.side === 'a') {
                if (data.bit === 0) this.leds.verd = data.newValue;
                if (data.bit === 1) this.leds.groc = data.newValue;
                if (data.bit === 2) this.leds.vermell = data.newValue;
                this.updateVisual();
            }
        });
    }
    
    updateVisual() {
        // Actualitzar colors dels cercles SVG
        const vermellLED = this.canvas.querySelector('#led-vermell');
        const grocLED = this.canvas.querySelector('#led-groc');
        const verdLED = this.canvas.querySelector('#led-verd');
        
        vermellLED.setAttribute('fill', this.leds.vermell ? '#ff0000' : '#331111');
        grocLED.setAttribute('fill', this.leds.groc ? '#ffff00' : '#333311');
        verdLED.setAttribute('fill', this.leds.verd ? '#00ff00' : '#113311');
    }
}
```

#### JSON Configuració

```json
{
  "instance_name": "semafor1",
  "type": "semafor",
  "terminals": {
    "digital": {
      "inputs": {
        "DO1": "verd",
        "DO2": "groc",
        "DO3": "vermell"
      },
      "outputs": {}
    },
    "analog": {
      "inputs": {},
      "outputs": {}
    }
  }
}
```

#### Prompt IA Suggerit

```
Crea un bessó digital per IoT-Vertebrae que simuli un semàfor de trànsit.

**Especificacions:**
- Entrades: 3 sortides digitals IoTv (DO1=verd, DO2=groc, DO3=vermell)
- Sortides: Cap

**Visual SVG:**
Rectangle vertical gris (#2c3e50) de 100x260px amb 3 cercles de 40px de diàmetre:
- Superior (y=40): Vermell (#ff0000 quan DO3=1, #331111 quan DO3=0)
- Mitjà (y=130): Groc (#ffff00 quan DO2=1, #333311 quan DO2=0)
- Inferior (y=220): Verd (#00ff00 quan DO1=1, #113311 quan DO1=0)

**Comportament:**
Llegir bits DO1, DO2, DO3 via PLCMemory i actualitzar colors dels cercles.

**Format:** Classe JavaScript amb canvas SVG inline.

Adjunto: cinta.js (referència estructura)
```

---

### 3.2 LED RGBW ⭐

**Descripció:** LED RGB+W (color) controlat per 4 bits.

**Complexitat:** ⭐ SIMPLE  
**Tipus:** Digital pur

#### Terminals

**Entrades del bessó:**
- `DO1` → R (Red)
- `DO2` → G (Green)
- `DO3` → B (Blue)
- `DO4` → W (White)

**Sortides del bessó:** Cap

#### Visual ASCII
```
       ╱────────╲
      │          │
      │    ◉     │  ← Disc/Focus LED
      │          │
       ╲────────╱
       
Color = Mix RGB + W
Exemple: R=1, G=1, B=0, W=0 → Groc
```

#### Fragment Clau JavaScript

```javascript
updateColor() {
    const r = this.state.R ? 255 : 0;
    const g = this.state.G ? 255 : 0;
    const b = this.state.B ? 255 : 0;
    const w = this.state.W ? 128 : 0; // White afegeix brillantor
    
    // Mix final
    const finalR = Math.min(255, r + w);
    const finalG = Math.min(255, g + w);
    const finalB = Math.min(255, b + w);
    
    const color = `rgb(${finalR}, ${finalG}, ${finalB})`;
    this.ledCircle.setAttribute('fill', color);
}
```

#### JSON Configuració

```json
{
  "instance_name": "led_rgbw1",
  "type": "led-rgbw",
  "terminals": {
    "digital": {
      "inputs": {
        "DO1": "red",
        "DO2": "green",
        "DO3": "blue",
        "DO4": "white"
      }
    }
  }
}
```

---

### 3.3 Barrera Fotocèl·lula ⭐⭐

**Descripció:** Sensor que detecta objectes tallant el feix de llum.

**Complexitat:** ⭐⭐ MIXT  
**Tipus:** Digital entrada + sortida

#### Terminals

**Entrades del bessó:**
- `DO1` → LED emissor (ON/OFF)

**Sortides del bessó:**
- `DI1` → Sensor (0=feix OK, 1=feix tallat)

#### Visual ASCII
```
┌─────────┐              ┌─────────┐
│ EMISSOR │))))))))))))) │RECEPTOR │
│   LED   │    Feix IR   │ SENSOR  │
│    ●    │              │    ◄    │
└─────────┘              └─────────┘
           ┌────┐
           │ ▓▓ │  ← Objecte (talla feix)
           └────┘
```

#### Fragment Clau JavaScript

```javascript
class BarreraFotocel {
    constructor(instanceName, config) {
        // ...
        this.objectPresent = false; // Estat simulat (amb botó o automàtic)
    }
    
    subscribeToMemory() {
        // Llegir DO1 (emissor LED)
        window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
            if (data.bit === 0) { // DO1
                this.emitterOn = data.newValue;
                this.updateVisual();
                this.updateSensor();
            }
        });
    }
    
    updateSensor() {
        // Detector només funciona si emissor està ON
        const detected = this.emitterOn && this.objectPresent;
        
        // Escriure a DI1 (cap a IoTv)
        window.PLCMemory.writeDigitalBit(
            this.config.addr, 
            'b',  // Costat B (entrades IoTv)
            0,    // Bit 0 (DI1)
            detected ? 1 : 0
        );
    }
    
    // Simular objecte (click sobre zona de detecció)
    toggleObject() {
        this.objectPresent = !this.objectPresent;
        this.updateSensor();
        this.updateVisual();
    }
}
```

#### JSON Configuració

```json
{
  "instance_name": "barrera1",
  "type": "barrera-fotocel",
  "terminals": {
    "digital": {
      "inputs": {
        "DO1": "led_emissor"
      },
      "outputs": {
        "DI1": "sensor_detector"
      }
    }
  }
}
```

---

### 3.4 Sensor Temperatura ⭐

**Descripció:** Sensor de temperatura amb slider ajustable.

**Complexitat:** ⭐ SIMPLE  
**Tipus:** Analògic pur (sortida)

#### Terminals

**Entrades del bessó:** Cap

**Sortides del bessó:**
- `AI1` → Temperatura (0-100°C → 0-10V)

#### Conversió

```
Temperatura (°C)    Tensió (V)
     0          →     0.00
    25          →     2.50
    50          →     5.00
    75          →     7.50
   100          →    10.00
   
Fórmula: V = (T / 100) * 10
```

#### Visual ASCII
```
🌡️ Sensor Temperatura
┌────────────────────────┐
│ [━━━━●━━━━━━━] 45.5°C │  ← Slider
│      (4.55V)           │  ← Display tensió
└────────────────────────┘
```

#### Fragment Clau JavaScript

```javascript
class SensorTemperatura {
    constructor(instanceName, config) {
        this.temp = 20.0; // Temperatura inicial
        this.createCanvas();
        this.setupSlider();
    }
    
    setupSlider() {
        this.slider.addEventListener('input', (e) => {
            // Rang slider: 0-100
            this.temp = parseFloat(e.target.value);
            
            // Convertir a tensió (0-10V)
            const voltage = (this.temp / 100.0) * 10.0;
            
            // Escriure a AI1 (canal 0 internament)
            window.PLCMemory.writeAnalogChannel(
                this.config.addr,
                'b',  // Costat B (entrades IoTv)
                0,    // Canal 0 (AI1)
                voltage
            );
            
            // Actualitzar displays
            this.updateDisplay();
        });
    }
    
    updateDisplay() {
        this.tempDisplay.textContent = `${this.temp.toFixed(1)}°C`;
        this.voltDisplay.textContent = `(${((this.temp/100)*10).toFixed(2)}V)`;
    }
}
```

#### JSON Configuració

```json
{
  "instance_name": "temp_sensor1",
  "type": "sensor-temperatura",
  "terminals": {
    "analog": {
      "outputs": {
        "AI1": {
          "name": "temperatura",
          "range": [0, 100],
          "unit": "°C"
        }
      }
    }
  }
}
```

---

### 3.5 Potenciòmetre ⭐

**Descripció:** Potenciòmetre rotatori (posició 0-100%).

**Complexitat:** ⭐ SIMPLE  
**Tipus:** Analògic pur

#### Terminals

**Sortides del bessó:**
- `AI1` → Posició (0-100% → 0-10V)

#### Visual ASCII
```
    ╱─────╲
   │   ╱   │  ← Dial rotatori
   │  ●    │     (indicador posició)
    ╲─────╱
      50%
    (5.00V)
```

#### Fragment Clau JavaScript

```javascript
// Similar a SensorTemperatura però amb:
// - Visual circular (dial SVG rotatiu)
// - Rang 0-100%
// - Mateix codi writeAnalogChannel
```

---

### 3.6 BME280 (Sensor Ambiental) ⭐⭐

**Descripció:** Sensor multi-paràmetre (Temperatura + Humitat + Pressió).

**Complexitat:** ⭐⭐ MITJÀ  
**Tipus:** Analògic pur (3 sortides)

#### Terminals

**Sortides del bessó:**
- `AI1` → Temperatura (0-100°C → 0-10V)
- `AI2` → Humitat (0-100% → 0-10V)
- `AI3` → Pressió (900-1100 hPa → 0-10V)

#### Conversions

```
Paràmetre         Rang Físic      Tensió      Fórmula
─────────────────────────────────────────────────────────
Temperatura       0-100°C      →  0-10V    →  V = T/10
Humitat           0-100%       →  0-10V    →  V = H/10
Pressió          900-1100 hPa  →  0-10V    →  V = (P-900)/20
```

#### Visual ASCII
```
╔═══════════════════════════════════╗
║       🌡️ BME280 Sensor            ║
╠═══════════════════════════════════╣
║ Temp  [━━━●━━━━━━]  25.5°C (2.55V)║
║ Hum   [━━━━━●━━━━]  60.0% (6.00V) ║
║ Pres  [━━━━━━●━━━] 1013hPa (5.65V)║
╚═══════════════════════════════════╝
```

#### Fragment Clau JavaScript

```javascript
class BME280 {
    constructor(instanceName, config) {
        this.temp = 25.0;      // °C
        this.humidity = 50.0;   // %
        this.pressure = 1013.0; // hPa
        
        this.createCanvas();
        this.setupSliders();
    }
    
    setupSliders() {
        // Slider Temperatura
        this.tempSlider.addEventListener('input', (e) => {
            this.temp = parseFloat(e.target.value);
            const voltage = (this.temp / 100.0) * 10.0;
            window.PLCMemory.writeAnalogChannel(
                this.config.addr, 'b', 0, voltage
            );
            this.updateDisplays();
        });
        
        // Slider Humitat
        this.humSlider.addEventListener('input', (e) => {
            this.humidity = parseFloat(e.target.value);
            const voltage = (this.humidity / 100.0) * 10.0;
            window.PLCMemory.writeAnalogChannel(
                this.config.addr, 'b', 1, voltage
            );
            this.updateDisplays();
        });
        
        // Slider Pressió (900-1100 hPa → 0-10V)
        this.pressSlider.addEventListener('input', (e) => {
            this.pressure = parseFloat(e.target.value);
            const voltage = ((this.pressure - 900.0) / 200.0) * 10.0;
            window.PLCMemory.writeAnalogChannel(
                this.config.addr, 'b', 2, voltage
            );
            this.updateDisplays();
        });
    }
    
    updateDisplays() {
        this.tempDisplay.textContent = `${this.temp.toFixed(1)}°C`;
        this.humDisplay.textContent = `${this.humidity.toFixed(1)}%`;
        this.pressDisplay.textContent = `${this.pressure.toFixed(0)} hPa`;
    }
}
```

#### JSON Configuració

```json
{
  "instance_name": "bme280_1",
  "type": "bme280",
  "terminals": {
    "analog": {
      "outputs": {
        "AI1": {
          "name": "temperatura",
          "range": [0, 100],
          "unit": "°C"
        },
        "AI2": {
          "name": "humitat",
          "range": [0, 100],
          "unit": "%"
        },
        "AI3": {
          "name": "pressio",
          "range": [900, 1100],
          "unit": "hPa"
        }
      }
    }
  }
}
```

---

### 3.7 Dosificador ⭐⭐⭐

**Descripció:** Sistema de dosificació amb control de cabal i feedback.

**Complexitat:** ⭐⭐⭐ COMPLEX  
**Tipus:** Mixt (digital + analògic, entrada + sortida)

#### Terminals

**Entrades del bessó:**
- `AO1` → Setpoint cabal (0-100 L/h → 0-10V)
- `DO1` → ON/OFF

**Sortides del bessó:**
- `AI1` → Cabal real mesurat (0-100 L/h → 0-10V)

#### Flux de Control
```
       IoTv              Dosificador
     ┌──────┐           ┌────────────┐
AO1 ─→      │──────────→│ Setpoint   │
     │      │           │  (desitjat)│
DO1 ─→      │──────────→│  ON/OFF    │
     │      │           │            │
     │      │←──────────│ Q_real     │←─ AI1
     └──────┘           │ (feedback) │
                        └────────────┘
                             │
                        [Simulació dinàmica]
```

#### Fragment Clau JavaScript

```javascript
class Dosificador {
    constructor(instanceName, config) {
        this.setpoint = 0;      // L/h
        this.enabled = false;   // ON/OFF
        this.flowActual = 0;    // L/h (feedback simulat)
        
        this.createCanvas();
        this.subscribeToMemory();
        this.startSimulation();
    }
    
    subscribeToMemory() {
        // Llegir AO1 (setpoint)
        window.EventBus.on('MEMORY_ANALOG_CHANGED', (data) => {
            if (data.channel === 0 && data.side === 'a') {
                // Convertir 0-10V → 0-100 L/h
                this.setpoint = (data.newValue / 10.0) * 100.0;
            }
        });
        
        // Llegir DO1 (ON/OFF)
        window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
            if (data.bit === 0 && data.side === 'a') {
                this.enabled = data.newValue === 1;
            }
        });
    }
    
    startSimulation() {
        // Simulació dinàmica cada 100ms
        setInterval(() => {
            if (!this.enabled) {
                // Apagat: cabal tendeix a 0
                this.flowActual *= 0.9;
            } else {
                // Encès: cabal tendeix a setpoint
                const error = this.setpoint - this.flowActual;
                this.flowActual += error * 0.1; // Dinàmica de primer ordre
            }
            
            // Escriure feedback a AI1
            const voltage = (this.flowActual / 100.0) * 10.0;
            window.PLCMemory.writeAnalogChannel(
                this.config.addr, 'b', 0, voltage
            );
            
            this.updateVisual();
        }, 100);
    }
    
    updateVisual() {
        this.setpointDisplay.textContent = `${this.setpoint.toFixed(1)} L/h`;
        this.actualDisplay.textContent = `${this.flowActual.toFixed(1)} L/h`;
        this.statusLED.setAttribute('fill', this.enabled ? '#00ff00' : '#333333');
    }
}
```

#### JSON Configuració

```json
{
  "instance_name": "dosificador1",
  "type": "dosificador",
  "terminals": {
    "digital": {
      "inputs": {
        "DO1": "enable"
      }
    },
    "analog": {
      "inputs": {
        "AO1": {
          "name": "setpoint_cabal",
          "range": [0, 100],
          "unit": "L/h"
        }
      },
      "outputs": {
        "AI1": {
          "name": "cabal_real",
          "range": [0, 100],
          "unit": "L/h"
        }
      }
    }
  }
}
```

---

### 3.8 Motor Lineal ⭐⭐⭐

**Descripció:** Motor amb moviment lineal i finals de carrera.

**Complexitat:** ⭐⭐⭐ COMPLEX  
**Tipus:** Mixt (digital entrada + sortides digital/analògic)

#### Terminals

**Entrades del bessó:**
- `DO4` → Avant (direcció +)
- `DO5` → Enrere (direcció -)

**Sortides del bessó:**
- `AI1` → Posició actual (0-1000 mm → 0-10V)
- `DI1` → Final carrera esquerra
- `DI2` → Final carrera dreta

#### Diagrama
```
   IoTv          Motor Lineal
  ┌────┐         ┌──────────────────────────┐
──→DO4 │────────→│ Avant                    │
──→DO5 │────────→│ Enrere                   │
  │    │←────────│ Posició (0-1000mm)       │←── AI1
  │    │←────────│ FC_left                  │←── DI1  
  │    │←────────│ FC_right                 │←── DI2
  └────┘         └──────────────────────────┘
                 
     |FC|                            |FC|
      ├──────────────────────────────┤
      0mm          500mm         1000mm
      
      [■■■■■■●──────────────────]  ← Cursor posició
```

#### Fragment Clau JavaScript

```javascript
class MotorLineal {
    constructor(instanceName, config) {
        this.position = 500.0;  // mm (posició inicial al centre)
        this.moving = false;
        this.direction = 0;     // -1=enrere, 0=parat, +1=avant
        this.speed = 50.0;      // mm/s
        
        this.createCanvas();
        this.subscribeToMemory();
        this.startAnimation();
    }
    
    subscribeToMemory() {
        window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
            if (data.side !== 'a') return;
            
            // DO4 = Avant
            if (data.bit === 3) {
                const avant = data.newValue === 1;
                this.updateDirection(avant, false);
            }
            
            // DO5 = Enrere
            if (data.bit === 4) {
                const enrere = data.newValue === 1;
                this.updateDirection(false, enrere);
            }
        });
    }
    
    updateDirection(avant, enrere) {
        if (avant && !enrere) {
            this.direction = 1;  // Moure endavant
        } else if (enrere && !avant) {
            this.direction = -1; // Moure enrere
        } else {
            this.direction = 0;  // Parat (o ambdós alhora)
        }
    }
    
    startAnimation() {
        const dt = 0.05; // 50ms
        
        setInterval(() => {
            // Actualitzar posició
            if (this.direction !== 0) {
                this.position += this.direction * this.speed * dt;
                
                // Limitar a 0-1000mm
                this.position = Math.max(0, Math.min(1000, this.position));
            }
            
            // Detectar finals de carrera
            const fc_left = this.position <= 0;
            const fc_right = this.position >= 1000;
            
            // Escriure posició a AI1 (0-1000mm → 0-10V)
            const voltage = (this.position / 1000.0) * 10.0;
            window.PLCMemory.writeAnalogChannel(
                this.config.addr, 'b', 0, voltage
            );
            
            // Escriure finals de carrera
            window.PLCMemory.writeDigitalBit(
                this.config.addr, 'b', 0, fc_left ? 1 : 0
            );
            window.PLCMemory.writeDigitalBit(
                this.config.addr, 'b', 1, fc_right ? 1 : 0
            );
            
            this.updateVisual();
        }, dt * 1000);
    }
    
    updateVisual() {
        // Actualitzar posició cursor SVG
        const cursorX = (this.position / 1000.0) * 400; // 400px = amplada rail
        this.cursor.setAttribute('x', cursorX);
        
        // Actualitzar display
        this.posDisplay.textContent = `${this.position.toFixed(0)} mm`;
        
        // LEDs finals de carrera
        this.fcLeftLED.setAttribute('fill', this.position <= 0 ? '#ff0000' : '#330000');
        this.fcRightLED.setAttribute('fill', this.position >= 1000 ? '#ff0000' : '#330000');
    }
}
```

#### JSON Configuració

```json
{
  "instance_name": "motor_lineal1",
  "type": "motor-lineal",
  "terminals": {
    "digital": {
      "inputs": {
        "DO4": "avant",
        "DO5": "enrere"
      },
      "outputs": {
        "DI1": "fc_left",
        "DI2": "fc_right"
      }
    },
    "analog": {
      "outputs": {
        "AI1": {
          "name": "posicio",
          "range": [0, 1000],
          "unit": "mm"
        }
      }
    }
  }
}
```

---

### 3.9 Cilindre Hidràulic Proporcional ⭐⭐⭐

**Descripció:** Cilindre amb vàlvula proporcional i sensor de posició bidireccional.

**Complexitat:** ⭐⭐⭐ COMPLEX  
**Tipus:** Analògic mixt (entrada + sortida bidireccional)

#### Terminals

**Entrades del bessó:**
- `AO1` → Obertura vàlvula (0-10V → 0-100%)

**Sortides del bessó:**
- `AI1` → Posició vàstec (-500 a +500 mm → -10 a +10V)

#### Diagrama
```
Vàlvula Proporcional:
   0%        50%        100%
   ├──────────┼──────────┤
   0V        5V        10V
   
Posició Vàstec (sensor magneto-estrictiu):
 -500mm      0mm      +500mm
   ├──────────┼──────────┤
  -10V       0V        +10V
  
Visual:
  ╔═══════════════════════════╗
  ║  ├──────■──────┤          ║  ← Cilindre + vàstec
  ║  Vàlvula: 50% (5.00V)     ║
  ║  Posició: 0mm (0.00V)     ║
  ╚═══════════════════════════╝
```

#### Conversions

```javascript
// Vàlvula: 0-10V → 0-100%
apertura_pct = (voltage / 10.0) * 100.0

// Posició: -500/+500mm → -10/+10V
voltage = (posicio / 500.0) * 10.0

// Velocitat vàstec proporcional a obertura vàlvula
velocitat = (apertura_pct - 50) * velocitat_maxima
// apertura < 50% → retracció (velocitat negativa)
// apertura > 50% → extensió (velocitat positiva)
// apertura = 50% → parat
```

#### Fragment Clau JavaScript

```javascript
class CilindreHidraulic {
    constructor(instanceName, config) {
        this.position = 0.0;      // mm (-500 a +500)
        this.valveOpening = 50.0; // % (0-100)
        this.maxSpeed = 100.0;    // mm/s
        
        this.createCanvas();
        this.subscribeToMemory();
        this.startSimulation();
    }
    
    subscribeToMemory() {
        // Llegir AO1 (vàlvula)
        window.EventBus.on('MEMORY_ANALOG_CHANGED', (data) => {
            if (data.channel === 0 && data.side === 'a') {
                // Convertir 0-10V → 0-100%
                this.valveOpening = (data.newValue / 10.0) * 100.0;
            }
        });
    }
    
    startSimulation() {
        const dt = 0.05; // 50ms
        
        setInterval(() => {
            // Calcular velocitat segons obertura vàlvula
            // 50% = parat, <50% = retracció, >50% = extensió
            const speed = (this.valveOpening - 50.0) / 50.0 * this.maxSpeed;
            
            // Actualitzar posició
            this.position += speed * dt;
            
            // Limitar a -500/+500mm
            this.position = Math.max(-500, Math.min(500, this.position));
            
            // Escriure posició a AI1 (-500/+500mm → -10/+10V)
            const voltage = (this.position / 500.0) * 10.0;
            window.PLCMemory.writeAnalogChannel(
                this.config.addr, 'b', 0, voltage
            );
            
            this.updateVisual();
        }, dt * 1000);
    }
    
    updateVisual() {
        // Actualitzar posició vàstec SVG
        const offsetX = (this.position / 500.0) * 100; // ±100px
        this.vastec.setAttribute('transform', `translate(${offsetX}, 0)`);
        
        // Displays
        this.valveDisplay.textContent = `${this.valveOpening.toFixed(1)}%`;
        this.posDisplay.textContent = `${this.position.toFixed(0)} mm`;
        this.voltDisplay.textContent = `(${((this.position/500)*10).toFixed(2)}V)`;
    }
}
```

#### JSON Configuració

```json
{
  "instance_name": "cilindre1",
  "type": "cilindre-hidraulic",
  "terminals": {
    "analog": {
      "inputs": {
        "AO1": {
          "name": "valvula",
          "range": [0, 100],
          "unit": "%"
        }
      },
      "outputs": {
        "AI1": {
          "name": "posicio",
          "range": [-500, 500],
          "unit": "mm"
        }
      }
    }
  }
}
```

---

## 📊 Resum de Cobertura d'Exemples

| # | Bessó | DO | DI | AO | AI | Complexitat |
|---|-------|----|----|----|----|-------------|
| 1 | Semàfor | ✅ 3 | - | - | - | ⭐ |
| 2 | LED RGBW | ✅ 4 | - | - | - | ⭐ |
| 3 | Barrera | ✅ 1 | ✅ 1 | - | - | ⭐⭐ |
| 4 | Sensor Temp | - | - | - | ✅ 1 | ⭐ |
| 5 | Potenciòmetre | - | - | - | ✅ 1 | ⭐ |
| 6 | BME280 | - | - | - | ✅ 3 | ⭐⭐ |
| 7 | Dosificador | ✅ 1 | - | ✅ 1 | ✅ 1 | ⭐⭐⭐ |
| 8 | Motor Lineal | ✅ 2 | ✅ 2 | - | ✅ 1 | ⭐⭐⭐ |
| 9 | Cilindre | - | - | ✅ 1 | ✅ 1 | ⭐⭐⭐ |

**✅ Cobertura completa: DO, DI, AO, AI**

---

## 4. Anatomia d'un Bessó

Aquesta secció explica l'estructura interna d'un bessó digital.

### 4.1 Components d'un Bessó

Un bessó digital està format per **2 fitxers**:

```
bessons/
├── nom-besso.js       ← Lògica + Visual (JavaScript)
└── configs/
    └── nom-besso.json ← Configuració terminals (JSON)
```

**Flux de càrrega:**

```
1. BessoManager llegeix JSON
2. Carrega classe JS corresponent
3. Crea instància amb config
4. Bessó es subscriu a PLCMemory
5. Bessó crea canvas SVG
6. Loop d'actualització (si cal)
```

### 4.2 Estructura Classe JavaScript

**Template bàsic:**

```javascript
/**
 * NomBesso - Descripció breu
 * 
 * Terminals:
 * - Entrades: [llistat]
 * - Sortides: [llistat]
 */

class NomBesso {
    /**
     * Constructor
     * @param {string} instanceName - Nom únic de la instància
     * @param {object} config - Configuració (des de JSON)
     */
    constructor(instanceName, config) {
        this.instanceName = instanceName;
        this.config = config;
        
        // Canvas SVG (crear o rebre)
        this.canvas = null;
        
        // Estat intern del bessó
        this.state = {
            // Variables d'estat
        };
        
        // Inicialització
        this.createCanvas();
        this.subscribeToMemory();
        
        console.log(`[${this.instanceName}] Bessó creat`);
    }
    
    /**
     * Crear canvas SVG
     */
    createCanvas() {
        // Opció A: SVG inline (simple)
        this.canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.canvas.setAttribute('width', '400');
        this.canvas.setAttribute('height', '300');
        this.canvas.innerHTML = `
            <!-- Elements SVG aquí -->
        `;
        
        // Opció B: Construir programàticament
        // const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        // ...
        
        // Guardar referències a elements que cal actualitzar
        this.led1 = this.canvas.querySelector('#led1');
        // ...
    }
    
    /**
     * Subscriure's a canvis de PLCMemory
     */
    subscribeToMemory() {
        // Exemple: Llegir entrades digitals
        window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
            // Filtrar per adreça i costat
            if (data.addr !== this.config.addr) return;
            if (data.side !== 'a') return; // Costat A = sortides IoTv = entrades bessó
            
            // Processar canvi
            if (data.bit === 0) {
                this.state.led1 = data.newValue === 1;
                this.updateVisual();
            }
        });
        
        // Exemple: Llegir entrades analògiques
        window.EventBus.on('MEMORY_ANALOG_CHANGED', (data) => {
            if (data.addr !== this.config.addr) return;
            if (data.side !== 'a') return;
            
            if (data.channel === 0) {
                // Convertir tensió a valor físic
                this.state.setpoint = (data.newValue / 10.0) * 100.0;
                this.updateVisual();
            }
        });
    }
    
    /**
     * Actualitzar representació visual
     */
    updateVisual() {
        // Actualitzar colors, posicions, texts, etc.
        if (this.led1) {
            this.led1.setAttribute('fill', this.state.led1 ? '#00ff00' : '#003300');
        }
    }
    
    /**
     * Escriure sortides digitals cap a IoTv
     */
    writeDI(bit, value) {
        window.PLCMemory.writeDigitalBit(
            this.config.addr,
            'b',  // Costat B = entrades IoTv = sortides bessó
            bit,
            value ? 1 : 0
        );
    }
    
    /**
     * Escriure sortides analògiques cap a IoTv
     */
    writeAI(channel, voltage) {
        window.PLCMemory.writeAnalogChannel(
            this.config.addr,
            'b',  // Costat B
            channel,
            voltage
        );
    }
    
    /**
     * Destructor (cleanup)
     */
    destroy() {
        // Netejar event listeners si calen
        // Aturar intervals/timeouts
        // Eliminar canvas del DOM
        
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        console.log(`[${this.instanceName}] Bessó destruït`);
    }
}

// Registre global (per BessoManager)
if (typeof window !== 'undefined') {
    window.NomBesso = NomBesso;
}
```

### 4.3 Estructura JSON de Configuració

**Format estàndard:**

```json
{
  "instance_name": "identificador_unic",
  "type": "nom-tipus-besso",
  "terminals": {
    "digital": {
      "inputs": {
        "DO1": "nom_funcional_1",
        "DO2": "nom_funcional_2"
      },
      "outputs": {
        "DI1": "nom_sortida_1",
        "DI2": "nom_sortida_2"
      }
    },
    "analog": {
      "inputs": {
        "AO1": {
          "name": "nom_funcional",
          "range": [min, max],
          "unit": "unitat"
        }
      },
      "outputs": {
        "AI1": {
          "name": "nom_sortida",
          "range": [min, max],
          "unit": "unitat"
        }
      }
    }
  }
}
```

**Camps:**

| Camp | Obligatori | Descripció |
|------|------------|------------|
| `instance_name` | ✅ | Identificador únic (ex: "motor1", "sensor_temp_sala_A") |
| `type` | ✅ | Tipus de bessó (nom classe JavaScript) |
| `terminals.digital.inputs` | ❌ | Map DO → Funció (entrades bessó) |
| `terminals.digital.outputs` | ❌ | Map DI → Funció (sortides bessó) |
| `terminals.analog.inputs` | ❌ | Map AO → {name, range, unit} |
| `terminals.analog.outputs` | ❌ | Map AI → {name, range, unit} |

**Notes:**
- Si no hi ha terminals digitals, pots ometre `digital`
- Si no hi ha terminals analògics, pots ometre `analog`
- Els noms funcionals són lliures (ex: "led_verd", "motor_avant", "temp")

**Exemple complet (Motor Lineal):**

```json
{
  "instance_name": "motor_cinta1",
  "type": "motor-lineal",
  "terminals": {
    "digital": {
      "inputs": {
        "DO4": "marxa_avant",
        "DO5": "marxa_enrere"
      },
      "outputs": {
        "DI1": "final_carrera_esquerra",
        "DI2": "final_carrera_dreta"
      }
    },
    "analog": {
      "outputs": {
        "AI1": {
          "name": "posicio_actual",
          "range": [0, 1000],
          "unit": "mm"
        }
      }
    }
  }
}
```

### 4.4 Comunicació amb PLCMemory

#### Llegir Entrades (des d'IoTv cap al bessó)

**Digital:**

```javascript
// Mètode 1: Via EventBus (reactiu, recomanat)
window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
    // data = { addr, side, bit, newValue, oldValue }
    if (data.addr === '0x0' && data.side === 'a' && data.bit === 0) {
        const ledOn = data.newValue === 1;
        // Actualitzar estat
    }
});

// Mètode 2: Lectura directa (polling, menys eficient)
const value = window.PLCMemory.readDigitalBit('0x0', 'a', 0);
```

**Analògic:**

```javascript
// Mètode 1: Via EventBus (recomanat)
window.EventBus.on('MEMORY_ANALOG_CHANGED', (data) => {
    // data = { addr, side, channel, newValue, oldValue }
    if (data.addr === '0x0' && data.side === 'a' && data.channel === 0) {
        const voltage = data.newValue; // 0-10V
        const percentage = (voltage / 10.0) * 100.0;
        // Actualitzar estat
    }
});

// Mètode 2: Lectura directa
const voltage = window.PLCMemory.readAnalogChannel('0x0', 'a', 0);
```

#### Escriure Sortides (des del bessó cap a IoTv)

**Digital:**

```javascript
// Escriure un bit (0 o 1)
window.PLCMemory.writeDigitalBit(
    '0x0',  // Adreça
    'b',    // Costat B (entrades IoTv)
    0,      // Bit 0 (DI1)
    1       // Valor (0 o 1)
);
```

**Analògic:**

```javascript
// Escriure voltatge
window.PLCMemory.writeAnalogChannel(
    '0x0',  // Adreça
    'b',    // Costat B
    0,      // Canal 0 (AI1)
    7.5     // Voltatge (-10 a +10V per AI, 0-10V per displays)
);
```

**Nota:** Els canals analògics internament són 0-3, però a l'usuari es presenten com 1-4 (AI1-AI4).

### 4.5 Cicle de Vida d'un Bessó

```
1. CREACIÓ
   └─> constructor(instanceName, config)
       └─> createCanvas()
       └─> subscribeToMemory()

2. EXECUCIÓ
   └─> EventBus dispara canvis
       └─> updateVisual()
       └─> writeDigitalBit() / writeAnalogChannel()
   
   └─> (Opcional) setInterval() per animacions
       └─> Actualitzar estat intern
       └─> Escriure sortides

3. DESTRUCCIÓ
   └─> destroy()
       └─> clearInterval()
       └─> Eliminar canvas
       └─> Cleanup listeners
```

---

## 5. Desenvolupament amb IA

Aquesta secció proporciona **prompts reutilitzables** per generar bessons amb IA (Claude, ChatGPT, etc.).

### 5.1 Preparació

**Fitxers a tenir preparats:**

| Fitxer | Descripció | Quan adjuntar |
|--------|------------|---------------|
| `cinta.js` | Bessó complet de referència | Sempre (estructura general) |
| `pont-h.js` | Exemple amb analògic | Si el bessó té canals analògics |
| `comFerBessonsPersonalitzats.md` | Aquest document | Primer bessó (context complet) |

**Consell:** Fes servir un prompt inicial **concret i detallat**. Més detalls = millor resultat.

### 5.2 Nivell 1: Bessó Digital Simple

**Context d'ús:** Bessons amb només entrades/sortides digitals (LEDs, polsadors, semàfors, motors ON/OFF).

**Template de Prompt:**

```
Crea un bessó digital per IoT-Vertebrae que simuli un [DISPOSITIU].

**Especificacions tècniques:**

Entrades del bessó (des d'IoT-Vertebrae):
- [X] sortides digitals: DO1=[funció], DO2=[funció], ...

Sortides del bessó (cap a IoT-Vertebrae):
- [Y] entrades digitals: DI1=[funció], DI2=[funció], ...

**Representació visual (SVG):**
[Descripció detallada de l'aspecte visual]
- Dimensions: [amplada]x[alçada]px
- Elements principals: [llistat]
- Colors: [especificacions]

**Comportament:**
[Explicació de la lògica de funcionament]

**Interactivitat (opcional):**
[Clicks, drags, animacions automàtiques]

**Format de sortida:**
Crea un fitxer JavaScript amb:
- Classe [NomClasse] seguint l'estructura de l'exemple adjunt
- Canvas SVG inline
- Subscripció a MEMORY_DIGITAL_CHANGED
- Mètode updateVisual()

Adjuntos:
- cinta.js (referència estructura)
- comFerBessonsPersonalitzats.md (especificacions IoT-Vertebrae)
```

**Exemple concret - Semàfor:**

```
Crea un bessó digital per IoT-Vertebrae que simuli un semàfor de trànsit.

**Especificacions tècniques:**

Entrades del bessó:
- 3 sortides digitals: DO1=verd, DO2=groc, DO3=vermell

Sortides del bessó:
- Cap

**Representació visual (SVG):**
Rectangle vertical gris fosc (#2c3e50) de 100x260px amb radi de cantonada 8px.
Dins del rectangle, 3 cercles de 40px de diàmetre separats 50px verticalment:
- Superior (y=40): Vermell
  - Encès: #ff0000 (quan DO3=1)
  - Apagat: #331111 (quan DO3=0)
- Mitjà (y=130): Groc
  - Encès: #ffff00 (quan DO2=1)
  - Apagat: #333311 (quan DO2=0)
- Inferior (y=220): Verd
  - Encès: #00ff00 (quan DO1=1)
  - Apagat: #113311 (quan DO1=0)

Afegir un petit text "SEMÀFOR" a la part inferior (#ecf0f1, 12px).

**Comportament:**
- Llegir bits DO1, DO2, DO3 de PLCMemory (addr='0x0', side='a')
- Actualitzar colors dels cercles segons l'estat de cada bit
- No hi ha lògica de seqüència automàtica (controlada per Python)

**Interactivitat:**
Cap. És totalment passiu (només rep ordres).

**Format de sortida:**
Classe JavaScript "Semafor" amb canvas SVG inline.

Adjuntos:
- cinta.js
- comFerBessonsPersonalitzats.md
```

### 5.3 Nivell 2: Bessó Analògic Simple

**Context d'ús:** Sensors amb sliders (temperatura, humitat, potenciòmetre).

**Template de Prompt:**

```
Crea un bessó digital per IoT-Vertebrae que simuli un sensor [TIPUS].

**Especificacions tècniques:**

Sortides del bessó (cap a IoT-Vertebrae):
- [X] entrades analògiques: AI1=[paràmetre], AI2=[paràmetre], ...

**Rangs de cada canal:**
AI1: [Magnitud física] ([min]-[max] [unitat]) → [min_V]-[max_V]V
AI2: ...

Fórmules de conversió:
[Equacions lineals o altres]

**Representació visual (SVG):**
[Descripció dels sliders, displays, etiquetes]
- Sliders: orientació, dimensions, colors
- Displays numèrics: format, unitats
- Icones: [si n'hi ha]

**Comportament:**
- Sliders HTML range inputs (per facilitat) o SVG (més control)
- Cada slider actualitza el seu valor físic
- Converteix valor físic → tensió (segons fórmula)
- Escriu a PLCMemory.writeAnalogChannel()
- Actualitza displays en temps real

**Format de sortida:**
Classe JavaScript "[NomClasse]" amb:
- Canvas SVG + sliders HTML integrats
- Gestió d'events input
- Escriptura a canals analògics

Adjuntos:
- pont-h.js (per veure gestió analògica)
- comFerBessonsPersonalitzats.md
```

**Exemple concret - BME280:**

```
Crea un bessó digital per IoT-Vertebrae que simuli un sensor ambiental BME280.

**Especificacions tècniques:**

Sortides del bessó:
- 3 entrades analògiques: AI1=temperatura, AI2=humitat, AI3=pressió

**Rangs:**
AI1: Temperatura (0-100°C) → 0-10V
     Fórmula: V = (T / 100) * 10
     
AI2: Humitat (0-100%) → 0-10V
     Fórmula: V = (H / 100) * 10
     
AI3: Pressió (900-1100 hPa) → 0-10V
     Fórmula: V = ((P - 900) / 200) * 10

**Representació visual (SVG):**
Caixa de 400x250px (#34495e) amb cantonades arrodonides.

Títol centrat: "🌡️ BME280 Sensor Ambiental" (#ecf0f1, 16px, negreta).

3 files, cada una amb:
- Icona (🌡️ / 💧 / 🌤️)
- Label ([Temp/Hum/Pres], #ecf0f1, 14px)
- Slider horitzontal (200px amplada, track #7f8c8d, thumb #3498db)
- Display numèric ([valor] [unitat], #2ecc71, 14px, negreta)
- Display tensió ([V]V, #95a5a6, 11px, cursiva)

Disposició:
```
┌────────────────────────────────────┐
│    🌡️ BME280 Sensor Ambiental      │
├────────────────────────────────────┤
│ 🌡️ Temp  [━━●━━━━━] 25.0°C (2.50V)│
│ 💧 Hum   [━━━━●━━━] 60.0% (6.00V) │
│ 🌤️ Pres  [━━━━━●━━] 1013hPa (5.65V)│
└────────────────────────────────────┘
```

**Comportament:**
- Sliders HTML range:
  - Temp: min=0, max=100, step=0.1
  - Hum: min=0, max=100, step=0.1
  - Pres: min=900, max=1100, step=1
- Event listener 'input' actualitza:
  1. Valor físic intern
  2. Conversió → tensió
  3. PLCMemory.writeAnalogChannel(addr, 'b', channel, voltage)
  4. Displays

**Format de sortida:**
Classe JavaScript "BME280".

Adjuntos:
- pont-h.js
- comFerBessonsPersonalitzats.md
```

### 5.4 Nivell 3: Bessó Complex Mixt

**Context d'ús:** Sistemes amb múltiples terminals digitals + analògics, entrades + sortides, animacions.

**Template de Prompt:**

```
Crea un bessó digital complex per IoT-Vertebrae: [DISPOSITIU].

**Especificacions tècniques:**

ENTRADES del bessó (des d'IoT-Vertebrae):
Digital:
- DO[N]: [funció]
- ...

Analògic:
- AO[N]: [paràmetre] ([rang]) → [conversió]
- ...

SORTIDES del bessó (cap a IoT-Vertebrae):
Digital:
- DI[N]: [senyal]
- ...

Analògic:
- AI[N]: [mesura] ([rang]) → [conversió]
- ...

**Representació visual (SVG):**
[Descripció detallada amb dimensions]
- Vista: [frontal/lateral/isomètrica]
- Elements mòbils: [llistat]
- Indicadors: [LEDs, displays, gauges]

**Comportament:**
[Lògica complexa]
- Dinàmica temporal (si cal simulació física)
- Interacció entre entrades/sortides
- Condicions límit

**Animació (opcional):**
- setInterval() cada [X]ms
- Actualitzar [estat intern]
- Recalcular [física/dinàmica]

**Format de sortida:**
Classe JavaScript "[NomClasse]" amb:
- Constructor complet
- subscribeToMemory() per entrades
- startSimulation() si cal loop animació
- updateVisual() per renderitzar
- destroy() per cleanup

Adjuntos:
- cinta.js (estructura)
- pont-h.js (analògic)
- comFerBessonsPersonalitzats.md
```

**Exemple concret - Motor Lineal:**

```
Crea un bessó digital complex per IoT-Vertebrae: Motor lineal amb finals de carrera.

**Especificacions tècniques:**

ENTRADES del bessó:
Digital:
- DO4: Marxa avant (direcció +)
- DO5: Marxa enrere (direcció -)

SORTIDES del bessó:
Digital:
- DI1: Final de carrera esquerre (activat quan posició ≤ 0mm)
- DI2: Final de carrera dret (activat quan posició ≥ 1000mm)

Analògic:
- AI1: Posició actual (0-1000mm) → 0-10V
  Fórmula: V = (pos / 1000) * 10

**Representació visual (SVG):**
Vista lateral de 500x150px.

Elements:
- Rail horitzontal gris (#7f8c8d), 400px amplada, 20px alçada, y=60
- Cursor (motor) rectangle blau (#3498db), 40x60px, mòbil sobre rail
- 2 LEDs finals de carrera:
  - Esquerre (x=20, y=20): cercle 15px (#ff0000 si activat, #330000 si no)
  - Dret (x=480, y=20): cercle 15px (#ff0000 si activat, #330000 si no)
- Display posició: text centrat sota rail "[pos] mm ([V]V)" (#ecf0f1, 14px)

**Comportament:**
- Llegir DO4 i DO5 via MEMORY_DIGITAL_CHANGED
- Determinar direcció:
  - DO4=1, DO5=0 → direction=+1 (avant)
  - DO4=0, DO5=1 → direction=-1 (enrere)
  - Altres → direction=0 (parat)
- Simulació física (setInterval 50ms):
  - Velocitat: 50 mm/s
  - Actualitzar posició: pos += direction * speed * dt
  - Limitar: pos = clamp(pos, 0, 1000)
  - Detectar FC: fc_left=(pos≤0), fc_right=(pos≥1000)
  - Escriure AI1: PLCMemory.writeAnalogChannel(addr, 'b', 0, voltage)
  - Escriure DI1, DI2: PLCMemory.writeDigitalBit(...)
- Actualitzar visual:
  - Posició cursor SVG segons pos
  - Colors LEDs segons FC
  - Display text

**Animació:**
setInterval() cada 50ms per actualitzar posició i sortides.

**Format de sortida:**
Classe JavaScript "MotorLineal" completa.

Adjuntos:
- cinta.js
- pont-h.js
- comFerBessonsPersonalitzats.md
```

### 5.5 Debug amb IA

**Context:** Tens un bessó però no funciona correctament.

**Prompt per diagnosticar errors:**

```
Tinc un problema amb el meu bessó digital per IoT-Vertebrae.

**Error observat:**
[Descripció del comportament incorrecte]
Exemple: "El LED no s'encén quan DO1=1" o "La posició no s'actualitza"

**Missatge d'error (si n'hi ha):**
[Copy-paste de la consola del navegador]

**Codi problemàtic:**
[Fragment de codi rellevant - constructor, subscribeToMemory, updateVisual]

**Comportament esperat:**
[Què hauria de passar]

**Comportament real:**
[Què passa realment]

**Configuració JSON:**
[Contingut del fitxer JSON]

**Context:**
- Bessó: [Nom/tipus]
- Terminals: [DO/DI/AO/AI utilitzats]
- IoT-Vertebrae v2

Pots identificar el problema i suggerir una solució?
```

**Exemple concret:**

```
Tinc un problema amb el meu bessó digital semàfor per IoT-Vertebrae.

**Error observat:**
El LED vermell no canvia de color quan activo DO3 des de Python amb:
iotv.doutbit('0x0', 'a', 2, 1)

**Missatge d'error:**
Cap error a la consola, però el cercle SVG es manté amb fill='#331111'.

**Codi problemàtic:**
```javascript
subscribeToMemory() {
    window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
        if (data.bit === 2) {  // DO3
            this.leds.vermell = data.newValue;
            this.updateVisual();
        }
    });
}

updateVisual() {
    const vermellLED = this.canvas.querySelector('#led-vermell');
    vermellLED.setAttribute('fill', this.leds.vermell ? '#ff0000' : '#331111');
}
```

**Comportament esperat:**
LED vermell passa a #ff0000.

**Comportament real:**
LED es queda #331111 (apagat).

**Configuració JSON:**
```json
{
  "instance_name": "semafor1",
  "terminals": {
    "digital": {
      "inputs": {"DO3": "vermell"}
    }
  }
}
```

Pots identificar el problema?
```

**Possible resposta IA:**
> El problema és que no estàs filtrant per `data.addr` i `data.side`. El teu listener captura **tots** els canvis digitals de **qualsevol** adreça. Afegeix:
> ```javascript
> if (data.addr !== this.config.addr || data.side !== 'a') return;
> ```

---

## 6. Testing i Debug

### 6.1 Checklist Pre-Execució

Abans de provar el teu bessó, verifica:

```
☐ Fitxer JavaScript carregat correctament?
  → Comprova: <script src="bessons/nom-besso.js"></script> a index.html
  
☐ Classe registrada globalment?
  → Comprova: window.NomClasse existeix (console del navegador)
  
☐ Fitxer JSON ben format?
  → Valida amb JSONLint o editor
  
☐ Terminals coincideixen amb configuració IoTv?
  → Comprova que les adreces i canals són correctes
  
☐ Console del navegador oberta?
  → F12 → Console (per veure errors i logs)
  
☐ PLCMemory inicialitzat?
  → Comprova: window.PLCMemory existeix
```

### 6.2 Console.log Estratègic

**On afegir logs per debug:**

```javascript
class NomBesso {
    constructor(instanceName, config) {
        console.log(`[${instanceName}] 🚀 Constructor iniciat`);
        console.log(`[${instanceName}] Config rebuda:`, config);
        
        // ...
        
        console.log(`[${instanceName}] ✅ Bessó creat correctament`);
    }
    
    subscribeToMemory() {
        window.EventBus.on('MEMORY_DIGITAL_CHANGED', (data) => {
            console.log(`[${this.instanceName}] 📥 Digital canviat:`, data);
            
            if (data.addr !== this.config.addr) {
                console.log(`[${this.instanceName}] ⏭️ Ignorat (addr diferent)`);
                return;
            }
            
            console.log(`[${this.instanceName}] ✅ Processat: bit=${data.bit}, value=${data.newValue}`);
        });
    }
    
    updateVisual() {
        console.log(`[${this.instanceName}] 🎨 Actualitzant visual, estat:`, this.state);
    }
    
    destroy() {
        console.log(`[${this.instanceName}] 💀 Destruint bessó`);
    }
}
```

**Consells:**
- Usa emoji per fer logs més llegibles (🚀 inici, ✅ èxit, ❌ error, 📥 rebut, 📤 enviat)
- Inclou `this.instanceName` per diferenciar múltiples instàncies
- Comenta els logs quan el bessó funcioni (per no saturar consola)

### 6.3 Errors Comuns i Solucions

| Error | Causa Probable | Solució |
|-------|----------------|---------|
| `Cannot read property 'a' of undefined` | Adreça no inicialitzada a PLCMemory | Verificar que la vèrtebra existeix amb l'adreça correcta |
| `PLCMemory is not defined` | PLCMemory no ha carregat abans del bessó | Esperar event `DOMContentLoaded` o carregar bessó després |
| Canvas no es veu | CSS z-index o posició incorrecta | Revisar `.window-content` i wrapper |
| LEDs no canvien de color | No filtres per `addr` o `side` | Afegir condicions a `subscribeToMemory()` |
| Valors analògics sempre 0 | Canal incorrecte (0-3 vs 1-4) | Recordar: Python usa 1-4, intern 0-3 |
| Slider no actualitza | Event listener no configurat | Comprovar `.addEventListener('input', ...)` |
| Animació no funciona | `setInterval` no cridat o destruït | Verificar inicialització i `clearInterval` a `destroy()` |
| Event disparat múltiples vegades | Múltiples subscripcions | Usar `EventBus.off()` abans de `destroy()` |

### 6.4 Eines de Debug

**Console del navegador (F12):**

```javascript
// Comprovar que el bessó existeix
window.nomInstancia

// Inspeccionar estat intern
window.nomInstancia.state

// Llegir PLCMemory directament
window.PLCMemory.readDigitalBit('0x0', 'a', 0)
window.PLCMemory.readAnalogChannel('0x0', 'a', 0)

// Forçar escriptura manual
window.PLCMemory.writeDigitalBit('0x0', 'a', 0, 1)
window.PLCMemory.writeAnalogChannel('0x0', 'b', 0, 5.0)

// Inspeccionar EventBus
window.EventBus.emit('MEMORY_DIGITAL_CHANGED', {
    addr: '0x0', side: 'a', bit: 0, newValue: 1, oldValue: 0
})
```

**Elements → Inspecció SVG:**
- Botó dret sobre element visual → "Inspect"
- Verificar atributs SVG (`fill`, `x`, `y`, `transform`)
- Canviar valors en viu per testejar

---

## 7. Annexos

### Annex A: Exemple Complet - Semàfor

**Fitxer:** `bessons/semafor.js`

Contingut: [Veure fitxer annex separat]

---

### Annex B: Exemple Complet - BME280

**Fitxer:** `bessons/bme280.js`

Contingut: [Veure fitxer annex separat]

---

### Annex C: Exemple Complet - Motor Lineal

**Fitxer:** `bessons/motor-lineal.js`

Contingut: [Veure fitxer annex separat]

---

### Annex D: Exemple Complet - Cilindre Hidràulic

**Fitxer:** `bessons/cilindre-hidraulic.js`

Contingut: [Veure fitxer annex separat]

---

## 📚 Referències

- **Repositori IoT-Vertebrae:** [GitHub URL]
- **Documentació PLCMemory API:** [docs/plc-memory.md]
- **Documentació EventBus:** [docs/event-bus.md]
- **Exemples bessons existents:** `bessons/cinta.js`, `bessons/pont-h.js`

---

## 📝 Historial de Versions

| Versió | Data | Canvis |
|--------|------|--------|
| 2.0 | Feb 2026 | Guia completa amb 9 exemples, prompts IA |
| 1.0 | Gen 2026 | Primera versió (3 exemples) |

---

## 🙋 Preguntes Freqüents (FAQ)

**P: Puc usar llibreries externes (D3.js, Three.js)?**  
R: Sí, però cal carregar-les a `index.html` abans del bessó.

**P: Quants bessons puc tenir simultàniament?**  
R: Il·limitats (dins dels límits del navegador).

**P: Puc fer servir WebGL per 3D?**  
R: Sí, però SVG és més simple per començar.

**P: Com faig animacions suaus?**  
R: Usa `requestAnimationFrame()` en comptes de `setInterval()`.

**P: Puc comunicar bessons entre ells?**  
R: Sí, via PLCMemory (un escriu DI, l'altre llegeix DO) o via EventBus custom.

---

**Fi del document**

Ara tens tot el necessari per crear els teus propis bessons digitals! 🚀

Per qualsevol dubte, consulta els exemples existents (`cinta.js`, `pont-h.js`) o usa els prompts d'IA proporcionats.

**Bon desenvolupament!**
