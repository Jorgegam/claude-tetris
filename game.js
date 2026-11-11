'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
];

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

const START_LEVEL_KEY = 'tetris.startLevel';
const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 15;

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
const pauseMenu = document.getElementById('pause-menu');
const pauseMainView = document.getElementById('pause-view-main');
const pauseControlsView = document.getElementById('pause-view-controls');
const startLevelSelect = document.getElementById('start-level');
const resumeBtn = document.getElementById('resume-btn');
const menuRestartBtn = document.getElementById('menu-restart-btn');
const showControlsBtn = document.getElementById('show-controls-btn');
const controlsBackBtn = document.getElementById('controls-back-btn');

let gridColor = '#22222e';
let ghostAlpha = 0.2;

function applyTheme(theme, persist) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem('theme', theme); } catch (e) { /* ignorar */ }
  }
  const light = theme === 'light';
  themeBtn.textContent = light ? '🌙 Oscuro' : '☀ Claro';
  themeBtn.setAttribute('aria-pressed', String(light));
  themeBtn.setAttribute('aria-label', light ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  const styles = getComputedStyle(document.documentElement);
  gridColor = styles.getPropertyValue('--grid').trim() || gridColor;
  ghostAlpha = parseFloat(styles.getPropertyValue('--ghost-alpha')) || ghostAlpha;
  if (board) draw();
}

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

// Pause menu view: 'main' or 'controls'.
let menuView = 'main';

function dropIntervalFor(targetLevel) {
  return Math.max(100, 1000 - (targetLevel - 1) * 90);
}

function clampStartLevel(value) {
  if (!Number.isFinite(value)) return MIN_START_LEVEL;
  return Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, Math.floor(value)));
}

function loadStartLevel() {
  let stored = null;
  try { stored = localStorage.getItem(START_LEVEL_KEY); } catch (e) { /* ignorar */ }
  return clampStartLevel(parseInt(stored, 10));
}

function saveStartLevel(value) {
  try { localStorage.setItem(START_LEVEL_KEY, String(value)); } catch (e) { /* ignorar */ }
}

// Level chosen in the pause menu; applies to the next game.
let startLevel = loadStartLevel();

// Snapshot taken by init(): changing the selector mid-game must not alter the
// game already in progress, only the next one.
let gameStartLevel = startLevel;

function buildStartLevelOptions() {
  for (let value = MIN_START_LEVEL; value <= MAX_START_LEVEL; value++) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(value);
    startLevelSelect.appendChild(option);
  }
  startLevelSelect.value = String(startLevel);
}

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
    // Never drop below the level this game started at.
    level = Math.max(gameStartLevel, Math.floor(lines / 10) + 1);
    dropInterval = dropIntervalFor(level);
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
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
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

// A focused button or <select> would swallow Space, Enter or the arrow keys
// instead of letting them control the game, so the focus never survives
// opening or closing the menu.
function blurActiveElement() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function showMenuView(view) {
  menuView = view;
  const onControls = view === 'controls';
  pauseMainView.classList.toggle('hidden', onControls);
  pauseControlsView.classList.toggle('hidden', !onControls);
}

function openPauseMenu() {
  if (gameOver || paused) return;
  paused = true;
  cancelAnimationFrame(animId);
  animId = null;
  startLevelSelect.value = String(startLevel);
  showMenuView('main');
  pauseMenu.classList.remove('hidden');
  blurActiveElement();
}

function closePauseMenu() {
  if (!paused) return;
  paused = false;
  blurActiveElement();
  pauseMenu.classList.add('hidden');
  showMenuView('main');
  if (gameOver) return;
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function togglePause() {
  if (gameOver) return;
  if (paused) closePauseMenu();
  else openPauseMenu();
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
  gameStartLevel = startLevel;
  level = gameStartLevel;
  paused = false;
  gameOver = false;
  dropInterval = dropIntervalFor(gameStartLevel);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  showMenuView('main');
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'Escape') {
    // From the controls view, Escape goes back instead of resuming.
    if (paused && menuView === 'controls') showMenuView('main');
    else togglePause();
    return;
  }
  // The pause menu swallows every game input.
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

restartBtn.addEventListener('click', e => {
  e.currentTarget.blur(); // evita que Space/Enter reactiven el botón
  init();
});

themeBtn.addEventListener('click', e => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light', true);
  e.currentTarget.blur(); // evita que Space/Enter reactiven el botón
});

resumeBtn.addEventListener('click', e => {
  e.currentTarget.blur(); // el foco no debe sobrevivir a la reanudación
  closePauseMenu();
});

menuRestartBtn.addEventListener('click', e => {
  e.currentTarget.blur();
  init();
});

showControlsBtn.addEventListener('click', e => {
  e.currentTarget.blur();
  showMenuView('controls');
});

controlsBackBtn.addEventListener('click', e => {
  e.currentTarget.blur();
  showMenuView('main');
});

startLevelSelect.addEventListener('change', e => {
  const select = e.currentTarget;
  startLevel = clampStartLevel(parseInt(select.value, 10));
  select.value = String(startLevel);
  saveStartLevel(startLevel);
  select.blur(); // si no, las flechas seguirían cambiando el nivel al reanudar
});

applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', false);

buildStartLevelOptions();
init();
