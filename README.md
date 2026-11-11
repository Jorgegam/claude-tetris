# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Pantalla de inicio** con la tabla de records: el juego ya no arranca solo, empieza al pulsar **Jugar**.
- **Tabla de records local** (top 5) guardada en `localStorage`, con nombre, puntos, líneas, nivel y mejor combo de cada partida, más dos agregados calculados sobre los records guardados: **mejor combo** (la racha más alta registrada) y **líneas máximas** (el mejor total de líneas de una partida). Incluye botón **Resetear records** (pide confirmación).
- **Combos**: se registra la racha de piezas consecutivas que limpian línea; el máximo de la partida se guarda junto al record.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P`       | Pausar / reanudar                 |

Botones de la interfaz:

| Botón                  | Dónde aparece          | Acción                                                     |
| ---------------------- | ---------------------- | ---------------------------------------------------------- |
| **Jugar**              | Pantalla de inicio     | Empieza una partida nueva                                  |
| **Resetear records**   | Pantalla de inicio     | Borra la tabla de records (pide confirmación)               |
| **Guardar**            | Overlay de Game Over   | Guarda la puntuación con el nombre escrito (máx. 12 letras) |
| **Reiniciar**          | Overlay de Game Over   | Empieza otra partida                                       |
| **Ver records**        | Overlay de Game Over   | Vuelve a la pantalla de inicio con la tabla                 |

El botón **Ver records** solo aparece en Game Over (no durante la pausa), y volver a la pantalla de inicio siempre detiene la partida en curso.

Mientras el campo de nombre tiene el foco, las teclas de juego quedan desactivadas (se puede escribir con tranquilidad) y `Enter` guarda la puntuación. Si el nombre se deja vacío se guarda como `Anónimo`.

También hay un botón **☀ Claro / 🌙 Oscuro** (esquina superior derecha) para alternar el tema. Por defecto el juego arranca en modo oscuro y la preferencia se guarda en `localStorage`. Los colores del tema se definen como variables CSS en `style.css` (`:root` y `:root[data-theme="light"]`).

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
- Dos overlays separados: `#start-overlay` (pantalla de inicio con la tabla de records, el mejor combo, las líneas máximas y los botones **Jugar** / **Resetear records**) y `#overlay`, el overlay de partida para los estados **PAUSA** y **GAME OVER**, que además contiene el campo de nombre para guardar el record.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–7) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Combos** (`lockPiece`): `clearLines()` devuelve cuántas líneas quitó; si quitó alguna se incrementa `comboStreak` (y se actualiza `maxCombo`), y si no, la racha vuelve a `0`.
- **Records** (`loadScores` / `saveScore` / `resetScores`): top 5 persistido en `localStorage` bajo la clave `tetris.highscores`. Cada entrada es `{ name, score, lines, level, maxCombo, date }`. Todos los accesos van dentro de `try/catch` y `loadScores()` valida la forma de lo leído (array, campos numéricos), devolviendo una lista vacía si el JSON está corrupto o viene de otra versión.

### Flujo del juego

```
showStartScreen()                     → tabla de records + botón «Jugar»
  ↓  (click en «Jugar»)
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**. Si la puntuación entra en el top 5, el overlay anuncia el record y muestra el campo de nombre; al guardar se vuelve a la pantalla de inicio con la fila nueva resaltada.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris y los records (~560 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 7 colores             |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

Y los parámetros de la tabla de records:

| Constante         | Significado                                   | Por defecto            |
| ----------------- | --------------------------------------------- | ---------------------- |
| `SCORES_KEY`      | Clave de `localStorage` donde se guarda el top | `'tetris.highscores'`  |
| `MAX_SCORES`      | Cuántos records se conservan                   | `5`                    |
| `MAX_NAME_LENGTH` | Longitud máxima del nombre                     | `12`                   |
| `DEFAULT_NAME`    | Nombre usado si se deja el campo vacío         | `'Anónimo'`            |

> Si cambias `MAX_NAME_LENGTH`, ajusta también el atributo `maxlength` del `<input id="name-input">` en `index.html`.

Colores de la tabla de records (en `:root` y `:root[data-theme="light"]` de `style.css`):

| Variable                     | Para qué sirve                                 |
| ---------------------------- | ---------------------------------------------- |
| `--record-highlight`         | Fondo de la fila del record recién conseguido  |
| `--record-highlight-border`  | Borde izquierdo que marca esa fila             |
| `--success`                  | Color del aviso «¡Nuevo record!»               |
| `--input-bg` / `--input-border` | Campo de texto del nombre                   |
| `--secondary-bg` / `--secondary-border` | Botones secundarios                 |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
