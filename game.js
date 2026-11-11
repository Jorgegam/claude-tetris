'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Shared canvas shading tokens used by the skin renderers.
const RETRO_HIGHLIGHT = 'rgba(255,255,255,0.12)';
const NEON_GLOW = 12;
const NEON_CORE = 'rgba(255,255,255,0.35)';
const PASTEL_RADIUS = 7;
const PASTEL_HIGHLIGHT = 'rgba(255,255,255,0.45)';
const PIXEL_CELL = 2;
const PIXEL_LIGHT = 'rgba(255,255,255,0.18)';
const PIXEL_DARK = 'rgba(0,0,0,0.18)';

const DEFAULT_SKIN = 'retro';

// The pixel skin's 2x2 texture is ~200 fills per block, which would be tens of
// thousands of fills per frame on a full board. Each color/size combination is
// rasterized once into an offscreen canvas and then blitted.
const pixelTiles = new Map();

function pixelTile(color, w) {
  const side = Math.max(1, Math.round(w));
  const key = color + '@' + side;
  const cached = pixelTiles.get(key);
  if (cached) return cached;
  const tile = document.createElement('canvas');
  tile.width = side;
  tile.height = side;
  const tctx = tile.getContext('2d');
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, side, side);
  for (let y = 0; y < side; y += PIXEL_CELL) {
    for (let x = 0; x < side; x += PIXEL_CELL) {
      const light = ((x / PIXEL_CELL) + (y / PIXEL_CELL)) % 2 === 0;
      tctx.fillStyle = light ? PIXEL_LIGHT : PIXEL_DARK;
      tctx.fillRect(x, y, Math.min(PIXEL_CELL, side - x), Math.min(PIXEL_CELL, side - y));
    }
  }
  pixelTiles.set(key, tile);
  return tile;
}

// Every skin owns its 7-color palette (index 0 stays null, matching the
// board's empty cell) plus the primitive that paints a single block. `draw`
// receives resolved pixel coordinates: px/py is the top-left corner, w the
// side of the block.
const SKINS = {
  retro: {
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - pale blue
      '#ffb74d', // L - orange
    ],
    draw(context, px, py, w, color) {
      context.fillStyle = color;
      context.fillRect(px, py, w, w);
      context.fillStyle = RETRO_HIGHLIGHT;
      context.fillRect(px, py, w, 4);
    },
  },
  neon: {
    colors: [
      null,
      '#00e5ff', // I
      '#ffea00', // O
      '#d500f9', // T
      '#00e676', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff9100', // L
    ],
    draw(context, px, py, w, color) {
      context.shadowColor = color;
      context.shadowBlur = NEON_GLOW;
      context.fillStyle = color;
      context.fillRect(px, py, w, w);
      // Reset the shadow right away, otherwise the glow bleeds into the grid
      // and the ghost piece on every later draw call.
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.fillStyle = NEON_CORE;
      context.fillRect(px + w * 0.3, py + w * 0.3, w * 0.4, w * 0.4);
    },
  },
  pastel: {
    colors: [
      null,
      '#a8e6e1', // I
      '#fdf0a9', // O
      '#d9bdf0', // T
      '#bce6b8', // S
      '#f5b7b1', // Z
      '#aecbfa', // J
      '#f8cba6', // L
    ],
    draw(context, px, py, w, color) {
      context.fillStyle = color;
      // roundRect is widely available, but fall back to square blocks.
      if (typeof context.roundRect === 'function') {
        context.beginPath();
        context.roundRect(px, py, w, w, PASTEL_RADIUS);
        context.fill();
        context.fillStyle = PASTEL_HIGHLIGHT;
        context.beginPath();
        context.roundRect(px + 3, py + 3, w - 6, (w - 6) / 3, PASTEL_RADIUS / 2);
        context.fill();
      } else {
        context.fillRect(px, py, w, w);
        context.fillStyle = PASTEL_HIGHLIGHT;
        context.fillRect(px + 3, py + 3, w - 6, (w - 6) / 3);
      }
    },
  },
  pixel: {
    colors: [
      null,
      '#2ec4b6', // I
      '#ffd166', // O
      '#9d4edd', // T
      '#70c13c', // S
      '#e63946', // Z
      '#4361ee', // J
      '#f77f00', // L
    ],
    draw(context, px, py, w, color) {
      // Checkerboard texture of 2x2 px cells, cached per color and size.
      context.drawImage(pixelTile(color, w), px, py, w, w);
    },
  },
};

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeBtn = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

let gridColor = '#22222e';
let ghostAlpha = 0.2;
let currentSkin = DEFAULT_SKIN;

// The theme and the skin can both change --grid / --ghost-alpha, so the
// re-read of those CSS custom properties lives in a single place.
function refreshStyleVars() {
  const styles = getComputedStyle(document.documentElement);
  gridColor = styles.getPropertyValue('--grid').trim() || gridColor;
  const alpha = parseFloat(styles.getPropertyValue('--ghost-alpha'));
  // Number.isFinite, not ||: 0 is a legitimate value (ghost piece disabled).
  ghostAlpha = Number.isFinite(alpha) ? alpha : ghostAlpha;
}

function applyTheme(theme, persist) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem('theme', theme); } catch (e) { /* ignorar */ }
  }
  const light = theme === 'light';
  themeBtn.textContent = light ? '🌙 Oscuro' : '☀ Claro';
  themeBtn.setAttribute('aria-pressed', String(light));
  themeBtn.setAttribute('aria-label', light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  refreshStyleVars();
  if (board) draw();
}

function storedSkin() {
  try {
    return localStorage.getItem('tetris.skin');
  } catch (e) {
    return null; // localStorage no disponible: se usa la skin por defecto
  }
}

function applySkin(skin, persist) {
  // Unknown values (hand-edited storage, renamed skin) fall back to retro.
  currentSkin = SKINS[skin] ? skin : DEFAULT_SKIN;
  document.documentElement.dataset.skin = currentSkin;
  if (persist) {
    try { localStorage.setItem('tetris.skin', currentSkin); } catch (e) { /* ignorar */ }
  }
  if (skinSelect.value !== currentSkin) skinSelect.value = currentSkin;
  refreshStyleVars();
  if (board) {
    draw();
    drawNext();
  }
}

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (gameOver) return;
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin] || SKINS[DEFAULT_SKIN];
  const color = skin.colors[colorIndex];
  if (!color) return;
  context.globalAlpha = alpha ?? 1;
  skin.draw(context, x * size + 1, y * size + 1, size - 2, color);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, ghostAlpha);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  animId = null;
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) {
    animId = null;
    return;
  }
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) {
    animId = null;
    return;
  }
  animId = requestAnimationFrame(loop);
}

function init() {
  cancelAnimationFrame(animId);
  animId = null;
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  animId = requestAnimationFrame(loop);
}

// Keys typed on a form control (the skin <select>) belong to that control:
// the arrows must not move the piece at the same time.
function isFormControl(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
}

document.addEventListener('keydown', e => {
  if (isFormControl(e.target)) return;
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

themeBtn.addEventListener('click', e => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true);
  e.currentTarget.blur(); // evita que Space/Enter reactiven el botón
});

skinSelect.addEventListener('change', e => {
  applySkin(e.currentTarget.value, true);
  e.currentTarget.blur(); // evita que las flechas cambien de skin y muevan la pieza
});

skinSelect.addEventListener('keydown', e => {
  // Escape/Enter close the dropdown without firing `change`, so the blur above
  // never runs and the select would keep the focus — leaving every game key
  // dead while the piece keeps falling. Hand the keyboard back to the game.
  if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.currentTarget.blur();
  }
});

applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', false);
// localStorage is the source of truth; the inline script in <head> only
// pre-sets data-skin to avoid a flash of the default skin.
applySkin(storedSkin() || DEFAULT_SKIN, false);

init();
