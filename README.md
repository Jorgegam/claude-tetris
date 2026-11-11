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
    - [Menú de pausa](#menú-de-pausa)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
    - [Añadir una skin nueva](#añadir-una-skin-nueva)
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
- **Niveles** que aumentan cada 10 líneas y aceleran la caída, sin bajar nunca del nivel con el que arrancó la partida.
- **Pantalla de inicio** con la tabla de records: el juego ya no arranca solo, empieza al pulsar **Jugar**.
- **Menú de pausa** con _Reanudar_, _Reiniciar_, una vista interna de _Controles_ y un selector de **nivel inicial** (1–15) que se guarda en `localStorage`.
- **Game Over** con opción de reinicio.
- **Tabla de records local** (top 5) guardada en `localStorage`, con nombre, puntos, líneas, nivel y mejor combo de cada partida, más dos agregados calculados sobre los records guardados: **mejor combo** (la racha más alta registrada) y **líneas máximas** (el mejor total de líneas de una partida). Incluye botón **Resetear records** (pide confirmación).
- **Combos**: se registra la racha de piezas consecutivas que limpian línea; el máximo de la partida se guarda junto al record.
- **Temas claro / oscuro** y **cuatro skins visuales** (Retro, Neón, Pastel y Pixel art) que cambian la paleta y el dibujado de los bloques. Ambas preferencias se recuerdan entre partidas.

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
| `P`       | Abrir / cerrar el menú de pausa   |
| `Esc`     | Igual que `P`; dentro de la vista de controles vuelve al menú |

### Menú de pausa

Con `P` o `Esc` se abre un menú sobre el tablero (no es un simple cartel de «PAUSA»):

- **Reanudar** — cierra el menú y continúa la partida.
- **Reiniciar** — empieza una partida nueva sin recargar la página.
- **Ver controles** — muestra la lista de teclas dentro del propio menú, con un botón **Volver**.
- **Nivel inicial** — selector de `1` a `15`. Se guarda en `localStorage` bajo la clave `tetris.startLevel` y se aplica **en la siguiente partida**: el nivel y la velocidad de caída arrancan desde ahí y el nivel nunca baja de ese valor al limpiar líneas.

Mientras el menú está abierto, las teclas de juego quedan bloqueadas, y cada botón o selector hace `blur()` después de usarse para que al reanudar no se cuele un movimiento con `Space`, `Enter` o las flechas.

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

En el panel lateral, el desplegable **SKIN** cambia el aspecto de los bloques entre cuatro estilos:

| Skin          | Aspecto                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| **Retro**     | Bloques cuadrados planos con un reflejo superior (estilo por defecto).  |
| **Neón**      | Bloques con _glow_ (`shadowBlur`) y núcleo claro sobre tablero negro.   |
| **Pastel**    | Colores suaves y esquinas redondeadas (`roundRect`).                    |
| **Pixel art** | Textura de ajedrezado en celdas de 2 × 2 píxeles sobre cada bloque.     |

El cambio se aplica en caliente (sin recargar) y se guarda en `localStorage` bajo la clave `tetris.skin`. El tema y la skin son independientes: la skin manda en los colores del tablero y de las piezas, el tema en el resto de la interfaz.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza, el selector de `SKIN` y la lista de controles.
- Tres overlays separados: `#start-overlay` (pantalla de inicio con la tabla de records, el mejor combo, las líneas máximas y los botones **Jugar** / **Resetear records**), `#overlay` para el estado **GAME OVER**, que además contiene el campo de nombre para guardar el record, y `#pause-menu` con el **menú de pausa**, que contiene dos vistas (`#pause-view-main` y `#pause-view-controls`) de las que solo una está visible a la vez.

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
- **Nivel y velocidad**: el nivel sube cada 10 líneas y nunca baja del nivel con el que arrancó la partida (`max(gameStartLevel, ⌊lines / 10⌋ + 1)`); la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos (`dropIntervalFor`). `init()` copia el nivel elegido en `gameStartLevel`, así que cambiar el selector a mitad de partida no afecta a la partida en curso.
- **Menú de pausa** (`openPauseMenu` / `closePauseMenu` / `showMenuView`): detiene el `requestAnimationFrame`, muestra el overlay del menú y alterna entre la vista principal y la de controles. El nivel inicial se lee y se escribe en `localStorage` dentro de `try/catch`, igual que la preferencia de tema.
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
| `SKINS`        | Skins disponibles (paleta + dibujado)    | 4 skins               |
| `DEFAULT_SKIN` | Skin inicial y de respaldo               | `'retro'`             |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `MIN_START_LEVEL` / `MAX_START_LEVEL` | Rango del selector de nivel inicial | `1` / `15` |
| `START_LEVEL_KEY` | Clave de `localStorage` del nivel inicial | `tetris.startLevel` |

La velocidad inicial de caída ya no es una constante: se deriva del nivel inicial con `dropIntervalFor(startLevel)` = `max(100, 1000 − (startLevel − 1) × 90)` ms, así que con nivel inicial `1` sigue siendo `1000` ms. Ojo: el suelo de `100` ms se alcanza ya en el nivel `11`, así que los niveles iniciales `11`–`15` caen a la misma velocidad y solo se diferencian en el multiplicador de puntuación.

Los colores del menú de pausa son variables CSS en `style.css` (`--menu-bg`, `--menu-border`, `--menu-shadow`, `--select-bg`, `--btn-secondary-bg`, `--btn-secondary-hover`, `--btn-secondary-text`), definidas tanto en `:root` como en `:root[data-theme="light"]`.

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

### Añadir una skin nueva

Todo el renderizado pasa por `drawBlock()`, que delega en la skin activa. Para añadir una skin basta con:

1. **Declarar la entrada en `SKINS`** (`game.js`), con una clave nueva (p. ej. `mono`):

   ```js
   mono: {
     colors: [null, '#eee', '#ddd', '#ccc', '#bbb', '#aaa', '#999', '#888'],
     draw(context, px, py, w, color) {
       context.fillStyle = color;
       context.fillRect(px, py, w, w);
     },
   },
   ```

   - `colors` tiene **8 posiciones**: el índice `0` debe quedar en `null` (celda vacía) y las 7 siguientes corresponden a las piezas I, O, T, S, Z, J, L.
   - `draw(context, px, py, w, color)` recibe ya resueltas las coordenadas en píxeles de la esquina superior izquierda (`px`, `py`) y el lado del bloque (`w`). El `globalAlpha` (pieza fantasma) lo gestiona `drawBlock()`, no la skin.
   - Si tu `draw` toca estado del contexto (`shadowBlur`, `shadowColor`, `lineWidth`…), **restáuralo antes de salir**, como hace la skin `neon`; en otro caso se filtra a la rejilla y a las demás piezas.

2. **Añadir el `<option>`** al `<select id="skin-select">` de `index.html` con ese mismo `value`, y meter la clave en el array de validación del script inline del `<head>` (el que fija `data-skin` antes de pintar para evitar el flash).

3. **(Opcional) Colores del tablero**: si la skin necesita otro fondo o rejilla, declara las variables en `:root` y añade una regla `:root[data-skin="mono"]` en `style.css`. Debe ir **después** del bloque `:root[data-theme="light"]` para ganar en cascada sin `!important`. `applySkin()` relee `--grid` y `--ghost-alpha` automáticamente. Si redefines `--board-bg`, redefine también `--ghost-alpha`: el del tema está calibrado para el fondo del tema, no para el de tu skin.

Cualquier valor guardado en `localStorage` que no corresponda a una skin conocida cae a `DEFAULT_SKIN` en lugar de romper el render.

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
