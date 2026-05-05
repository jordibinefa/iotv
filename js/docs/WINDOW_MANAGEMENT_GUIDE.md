# Gestió de Finestres - Guia d'Ús

## Funcionalitats Disponibles

### 1. Maximitzar / Restaurar Finestres

**Com maximitzar:**
- Doble-clic a la capçalera de la finestra
- Clic al botó maximitzar (□)

**Com restaurar:**
- Doble-clic a la capçalera de la finestra maximitzada
- Clic al botó restaurar (que ara mostra □ amb un símbol diferent)

**Nota important:**
- Quan una finestra està maximitzada, SEMPRE podràs accedir als controls (minimitzar, restaurar, tancar)
- Els controls romanen visibles sobre la barra de menú

### 2. Minimitzar Finestres

**Com minimitzar:**
- Clic al botó minimitzar (−)

**Com restaurar:**
- Clic al botó corresponent a la taskbar (part inferior de la pantalla)

### 3. Restaurar Totes les Finestres

**Què fa:**
1. Obre totes les finestres principals si estaven tancades:
   - Editor Python
   - Bessó Digital (canvas IoT-Vertebrae)
   - Consola
2. Mostra tots els bessons físics actius (cintes, ponts H, etc.)
3. Distribueix totes les finestres en cascada per evitar solapaments

**Com utilitzar-ho:**
- Menú **Vista** → **Restaura finestres**
- Icona: 🪟

**Quan utilitzar-ho:**
- Has tancat finestres i vols recuperar-les totes
- Les finestres estan desorganitzades
- Vols començar amb un layout net i ordenat
- Has minimitzat múltiples finestres i vols veure-les totes de cop

### 4. Moure Finestres

**Com moure:**
- Arrossega la capçalera de la finestra
- Les finestres maximitzades NO es poden moure (primer cal restaurar-les)

### 5. Redimensionar Finestres

**Com redimensionar:**
- Arrossega la cantonada inferior dreta de la finestra
- Hi ha un petit indicador visual triangular

**Mides mínimes:**
- Editor Python: 400x400px
- Bessó Digital: 400x300px
- Consola: 400x200px

## Dreceres de Teclat

| Acció | Drecera |
|-------|---------|
| Tancar finestra activa | `Esc` |
| Pantalla completa | `F11` |

## Exemples d'Ús

### Escenari 1: Treballant amb múltiples bessons

1. Has configurat 3 bessons físics (2 cintes + 1 pont H)
2. Minimitzes algunes finestres per tenir més espai
3. Quan vols veure'ls tots: **Vista → Restaura finestres**
4. Totes les finestres apareixen ordenades en cascada

### Escenari 2: Recuperar després de tancar finestres

1. Accidentalment tanques l'Editor Python
2. **Vista → Restaura finestres**
3. L'editor es torna a obrir amb el codi que tenies

### Escenari 3: Layout desordenat

1. Després de moure i redimensionar moltes finestres
2. **Vista → Restaura finestres**
3. Tot torna a un layout ordenat i usable

## Consells d'Ús

### Per Estudiants:
- Si et perds amb tantes finestres, usa **Restaura finestres**
- Pots minimitzar finestres que no necessites temporalment
- La taskbar (part inferior) et mostra quines finestres tens minimitzades

### Per Educadors:
- Recomanar als estudiants usar **Restaura finestres** si es perden
- És útil quan es fa demostració amb projector (maximitzar finestra necessària)
- La cascada automàtica ajuda a mantenir ordre visual

## Troubleshooting

### Problema: No veig els controls quan maximitzo
**Solució:** Això ja està solucionat en aquesta versió. Els controls SEMPRE són visibles.

### Problema: He tancat una finestra i no sé com recuperar-la
**Solució:** Menú Vista → Restaura finestres

### Problema: Tinc massa finestres obertes i no veig res
**Solució:** 
1. Minimitza les que no necessites (botó −)
2. O usa **Restaura finestres** per reorganitzar-les en cascada

### Problema: Una finestra està fora de la pantalla
**Solució:** **Vista → Restaura finestres** les col·loca totes dins del viewport

## Arquitectura (per desenvolupadors)

### Jerarquia Z-index:
```
Menu-bar:          z-index: 10000
Finestra max:      z-index: 10001  (temporalment)
Finestres normals: z-index: 1000+  (dinàmic)
Windows container: z-index: 1000
Taskbar:           z-index: 999
```

### Distribució en cascada:
```javascript
const CASCADE_OFFSET = 30;
const START_X = 50;
const START_Y = 80;

// Finestra n:
x = START_X + (n * CASCADE_OFFSET)
y = START_Y + (n * CASCADE_OFFSET)
```

### API pública (WindowManager):

```javascript
// Gestió bàsica
windowManager.createWindow(config)
windowManager.closeWindow(id)
windowManager.minimizeWindow(id)
windowManager.maximizeWindow(id)
windowManager.restoreWindow(id)

// Restaurar totes
windowManager.restoreAllWindows()

// Consulta
windowManager.isWindowOpen(id)
windowManager.getWindow(id)
```

### API pública (Window):

```javascript
const win = windowManager.getWindow(id);

// Posicionament
win.setPosition(x, y)
win.setSize(width, height)
win.maximize()
win.restore()
win.minimize()

// Contingut
win.setContent(htmlOrElement)
win.setTitle(title)
```

## Veure També

- `CHANGELOG_window_management.md` - Detalls d'implementació
- `js/ui/window-manager.js` - Codi font
- `js/app.js` - Integració amb l'aplicació
