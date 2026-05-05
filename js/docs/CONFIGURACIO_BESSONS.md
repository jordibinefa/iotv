# Sistema de Configuració IO Bessons amb Validació de Coherència

## Descripció General

Aquest sistema permet editar i validar la configuració dels bessons físics i del bessó digital, amb detecció automàtica de conflictes entre ells.

## Estructura de Fitxers

```
js/bessons/
├── besso-config-editor.js          # Editor principal amb pestanyes
├── besso-config-validator.js       # Validador de bessons físics (existent)
├── vertebrae-config-validator.js   # Validador de presets bessó digital (NOU)
├── coherence-validator.js          # Validador de coherència (NOU)
├── preset-editor-component.js      # Component UI per editar presets (NOU)
└── coherence-validator.test.js     # Tests de validació (NOU)
```

## Funcionalitats

### 1. PESTANYA "BESSONS FÍSICS"

- **Editor JSON manual**: Edita la configuració dels bessons físics (pont-h, cinta, etc.)
- **Validació de sintaxi**: Comprova que el JSON sigui vàlid
- **Validació d'estructura**: Verifica que els bessons tinguin els camps obligatoris
- **Detecció de conflictes**: Troba bits duplicats entre bessons físics
- **Càrrega automàtica**: Opció per carregar tots els bessons després d'aplicar

### 2. PESTANYA "BESSÓ DIGITAL"

- **Selector de preset**: Dropdown amb tots els presets disponibles (basic, industrial, ascensor, etc.)
- **Editor JSON del preset**: Edita la configuració del preset seleccionat
- **Validació de preset**: Comprova sintaxi i estructura del preset
- **Detecció de canvis**: Avisa si hi ha canvis no guardats abans de canviar de preset

### 3. VALIDACIÓ DE COHERÈNCIA

Detecta automàticament conflictes entre bessons físics i digital:

#### ERRORS (bloquejants):

- **Conflicte d'escriptura**: Dos bessons físics escriuen al mateix bit
  ```
  Exemple: pont-h-00 i cinta-00 ambdós escriuen a 0x0:a:0
  ```

- **Conflicte de lectura**: Dos bessons físics llegeixen del mateix bit
  ```
  Exemple: pont-h-00 i cinta-00 ambdós llegeixen de 0x0:b:0
  ```

#### WARNINGS (no bloquejants):

- **Bit físic no llegit**: Bessó físic escriu a un bit que el digital no llegeix
  ```
  Exemple: pont-h-00 escriu a 0x0:a:0 però el digital té costellaA='output'
  ```

- **Bit digital no llegit**: Bessó digital escriu a un bit que cap físic llegeix
  ```
  Exemple: Digital escriu a 0x0:b:5 però cap bessó llegeix aquest bit
  ```

### 4. BOTÓ "VALIDA TOT"

Executa una validació completa:

1. Valida sintaxi i estructura dels bessons físics
2. Valida sintaxi i estructura del preset digital
3. Valida coherència entre físics i digital
4. Mostra resultats en finestra modal amb:
   - Resum general (✅ CORRECTA / ❌ ERRORS DETECTATS)
   - Detall de cada secció (Físics, Digital, Coherència)
   - Errors i warnings agrupats per categoria
   - Resum numèric de conflictes

### 5. APLICAR CANVIS

#### Si es modifica el bessó digital:
1. Mostra popup de confirmació indicant que cal reiniciar
2. Aplica el nou preset a VertebraeConfig
3. Tanca el bessó digital actual (si està obert)
4. Informa que cal reobrir el bessó digital

#### Si només es modifiquen bessons físics:
1. Mostra popup de confirmació
2. Aplica canvis a la configuració global
3. Recarrega tots els bessons físics
4. Opcionalment carrega automàticament tots els bessons

## Ús

### Obrir l'editor

```javascript
window.BessoConfigEditor.open();
```

O des del menú: **Vista → Configuració IO Bessons**

### Executar tests de coherència

```javascript
window.runCoherenceTests();
```

Això executarà 6 tests que validen:
- Configuració sense conflictes
- Conflictes d'escriptura
- Conflictes de lectura
- Bits físics no llegits
- Bits digitals no llegits
- Múltiples conflictes simultanis

## Exemples de Configuració

### Exemple 1: Configuració Vàlida

**Bessons Físics:**
```json
[
  {
    "type": "pont-h",
    "name": "pont-h-00",
    "ioConfig": {
      "vertebra": "0x0",
      "outputMap": {
        "motor1A": { "costella": "a", "bit": 0 }
      },
      "inputMap": {
        "sensor1": { "costella": "b", "bit": 0 }
      }
    }
  }
]
```

**Bessó Digital (preset basic):**
```json
{
  "name": "basic",
  "vertebrae": [
    {
      "addr": "0x0",
      "type": "digital",
      "costellaA": "output",  // Digital escriu, físic llegeix
      "costellaB": "input"    // Digital llegeix, físic escriu
    }
  ]
}
```

**Resultat**: ✅ Sense conflictes

### Exemple 2: Conflicte d'Escriptura (ERROR)

**Bessons Físics:**
```json
[
  {
    "type": "pont-h",
    "name": "pont-h-00",
    "ioConfig": {
      "vertebra": "0x0",
      "outputMap": {
        "motor1A": { "costella": "a", "bit": 0 }  // Escriu a 0x0:a:0
      }
    }
  },
  {
    "type": "cinta",
    "name": "cinta-00",
    "ioConfig": {
      "vertebra": "0x0",
      "outputMap": {
        "motor2A": { "costella": "a", "bit": 0 }  // També escriu a 0x0:a:0 ❌
      }
    }
  }
]
```

**Resultat**: ❌ ERROR - Dos bessons escriuen al mateix bit

### Exemple 3: Bit No Llegit (WARNING)

**Bessons Físics:**
```json
[
  {
    "type": "pont-h",
    "name": "pont-h-00",
    "ioConfig": {
      "vertebra": "0x0",
      "outputMap": {
        "motor1A": { "costella": "a", "bit": 0 }  // Escriu a 0x0:a:0
      }
    }
  }
]
```

**Bessó Digital:**
```json
{
  "name": "basic",
  "vertebrae": [
    {
      "addr": "0x0",
      "type": "digital",
      "costellaA": "output",  // També escriu ⚠️ (no llegeix el bit físic)
      "costellaB": "input"
    }
  ]
}
```

**Resultat**: ⚠️ WARNING - Bit físic no llegit pel digital

## Workflow Recomanat

1. **Obrir l'editor**: Vista → Configuració IO Bessons
2. **Configurar bessons físics** (Pestanya 1):
   - Definir tipus, noms i mapeig IO
   - Clicar "Validar" per comprovar
3. **Configurar bessó digital** (Pestanya 2):
   - Seleccionar preset adequat
   - Ajustar si cal (vèrtebres, costelles)
   - Clicar "Validar Preset"
4. **Validar coherència**:
   - Clicar "VALIDAR TOT"
   - Revisar errors i warnings
   - Corregir conflictes si n'hi ha
5. **Aplicar canvis**:
   - Clicar "Aplicar Canvis"
   - Confirmar al popup
   - Reobrir bessó digital si s'ha modificat

## Notes Importants

- Els canvis al bessó digital requereixen tancar i reobrir la finestra del digital
- Els canvis als bessons físics recarreguen automàticament totes les instàncies
- La validació de coherència només funciona si ambdues configuracions són vàlides
- Els warnings no bloquegen l'aplicació de canvis, però indiquen possibles problemes
- És recomanable executar "VALIDAR TOT" abans d'aplicar canvis

## Presets Disponibles

- **basic**: 1 digital + 1 analògica (configuració per defecte)
- **industrial**: 2 digitals + 1 analògica
- **ascensor**: 3 digitals + 1 analògica (17DI + 10DO + 2AI + 1AO)
- **digitalOnly**: 3 digitals
- **analogOnly**: 2 analògiques
- **asimetric**: Configuració amb costelles 'none'
