const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const robotImg = document.getElementById("robot");

const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const toggleSeqBtn = document.getElementById("toggleSeq");
const sequenceBox = document.getElementById("sequenceBox");
const deleteBtn = document.getElementById("deleteBtn");
const seqWrapper = document.getElementById("seqWrapper");

const scene = document.querySelector(".scene");

/* =====================
   ESCENA (ORIGINAL)
===================== */
let SCENE_WIDTH;
let SCENE_HEIGHT;

function getSTEP() {
  const robotWidth = robotImg.width || 150;
  return Math.max(robotWidth * 0.47, 40);
}

const RESTART_DELAY = 500;

/* =====================
   ROBOT (ORIGINAL)
===================== */
let startX = 0;
let startY = 0;

let robot = {
  x: 0,
  y: 0,
  dir: 0
};

let visualRotation = 0;

/* =====================
   SECUENCIA
   CAMBIO: sequence ahora guarda { code, symbol }
   cursorPos: posición de inserción, solo mouse/tap
===================== */
let sequence = [];
let cursorPos = 0;
let index = 0;
let interval = null;
let restartTimeout = null;

/* =====================
   FLAGS (ORIGINAL)
===================== */
let isPaused = false;
let wasPlayingOnResize = false;
let isResizing = false;

/* =====================
   CAMINO (ORIGINAL)
===================== */
let pathCommands = [];
let loopCommands = [];
let pathLocked = false;

/* =====================
   CALCULAR POSICIÓN (ORIGINAL)
===================== */
function calcPosition(cmds) {
  const STEP = getSTEP();
  let cx = startX;
  let cy = startY;
  let dir = 0;
  let rot = 0;

  cmds.forEach(({ cmd }) => {
    if (cmd === 'L') { dir = (dir + 3) % 4; rot -= 90; return; }
    if (cmd === 'R') { dir = (dir + 1) % 4; rot += 90; return; }
    if (cmd === 'F') {
      if (dir === 0) cy -= STEP;
      if (dir === 1) cx += STEP;
      if (dir === 2) cy += STEP;
      if (dir === 3) cx -= STEP;
    }
    if (cmd === 'B') {
      if (dir === 0) cy += STEP;
      if (dir === 1) cx -= STEP;
      if (dir === 2) cy -= STEP;
      if (dir === 3) cx += STEP;
    }
  });

  return { x: cx, y: cy, dir, rot };
}

/* =====================
   DIBUJO (ORIGINAL)
===================== */
function crisp(v) {
  return Math.round(v) + 0.5;
}

function drawPath() {
  const STEP = getSTEP();
  let cx = startX;
  let cy = startY;
  let dir = 0;

  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#999";

  pathCommands.forEach(({ cmd }) => {
    if (cmd === 'L') { dir = (dir + 3) % 4; return; }
    if (cmd === 'R') { dir = (dir + 1) % 4; return; }

    let nx = cx, ny = cy;
    if (cmd === 'F') {
      if (dir === 0) ny -= STEP;
      if (dir === 1) nx += STEP;
      if (dir === 2) ny += STEP;
      if (dir === 3) nx -= STEP;
    }
    if (cmd === 'B') {
      if (dir === 0) ny += STEP;
      if (dir === 1) nx -= STEP;
      if (dir === 2) ny -= STEP;
      if (dir === 3) nx += STEP;
    }

    ctx.beginPath();
    ctx.moveTo(crisp(cx), crisp(cy));
    ctx.lineTo(crisp(nx), crisp(ny));
    ctx.stroke();

    cx = nx;
    cy = ny;
  });

  ctx.setLineDash([]);
}

function draw() {
  ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  drawPath();
}

/* =====================
   ACTUALIZAR ROBOT (ORIGINAL)
===================== */
function updateRobot() {
  robotImg.style.left = robot.x - robotImg.width / 2 + "px";
  robotImg.style.top  = robot.y - robotImg.height / 2 + "px";
  robotImg.style.transform = `rotate(${visualRotation}deg)`;
}

/* =====================
   MOVIMIENTO (ORIGINAL)
===================== */
function canMove(nx, ny) {
  const margin = robotImg.width / 2 || 35;
  return nx > margin && nx < SCENE_WIDTH - margin &&
         ny > margin && ny < SCENE_HEIGHT - margin;
}

function forward() {
  const STEP = getSTEP();
  let nx = robot.x, ny = robot.y;
  if (robot.dir === 0) ny -= STEP;
  if (robot.dir === 1) nx += STEP;
  if (robot.dir === 2) ny += STEP;
  if (robot.dir === 3) nx -= STEP;
  if (!canMove(nx, ny)) return;
  robot.x = nx; robot.y = ny;
  if (!pathLocked) pathCommands.push({ cmd: 'F' });
  loopCommands.push({ cmd: 'F' });
}

function backward() {
  const STEP = getSTEP();
  let nx = robot.x, ny = robot.y;
  if (robot.dir === 0) ny += STEP;
  if (robot.dir === 1) nx -= STEP;
  if (robot.dir === 2) ny -= STEP;
  if (robot.dir === 3) nx += STEP;
  if (!canMove(nx, ny)) return;
  robot.x = nx; robot.y = ny;
  if (!pathLocked) pathCommands.push({ cmd: 'B' });
  loopCommands.push({ cmd: 'B' });
}

function left() {
  robot.dir = (robot.dir + 3) % 4;
  visualRotation -= 90;
  if (!pathLocked) pathCommands.push({ cmd: 'L' });
  loopCommands.push({ cmd: 'L' });
}

function right() {
  robot.dir = (robot.dir + 1) % 4;
  visualRotation += 90;
  if (!pathLocked) pathCommands.push({ cmd: 'R' });
  loopCommands.push({ cmd: 'R' });
}

/* =====================
   DPAD VISUAL (ORIGINAL)
===================== */
function setDpadEnabled(enabled) {
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.disabled = !enabled;
  });
}

/* =====================
   STOP (ORIGINAL)
===================== */
function stopPlayback() {
  isPaused = true;
  clearInterval(interval);
  interval = null;
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
}

/* =====================
   EJECUCIÓN (ORIGINAL)
   CAMBIO MÍNIMO: sequence[index] era string, ahora es { code, symbol }
===================== */
function execute() {
  if (isPaused) return;

  if (index >= sequence.length) {
    pathLocked = true;
    loopCommands = [];
    index = 0;

    clearInterval(interval);
    interval = null;

    restartTimeout = setTimeout(() => {
      restartTimeout = null;
      if (isPaused) return;
      resetRobotInstant();
      interval = setInterval(execute, 500);
    }, RESTART_DELAY);

    return;
  }

  const cmd = sequence[index].code;  // CAMBIO: .code en vez de directo
  if (cmd === "F") forward();
  if (cmd === "B") backward();
  if (cmd === "L") left();
  if (cmd === "R") right();

  index++;
  draw();
  updateRobot();
}

/* =====================
   RESET INSTANTÁNEO (ORIGINAL)
===================== */
function resetRobotInstant() {
  robotImg.style.transition = "none";
  robot.x = startX;
  robot.y = startY;
  robot.dir = 0;
  visualRotation = 0;
  updateRobot();
  robotImg.offsetHeight;
  robotImg.style.transition =
    "transform 0.35s ease-in-out, left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1)";
}

/* =====================
   CANVAS DPR (ORIGINAL)
===================== */
function applyDPR() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = SCENE_WIDTH * dpr;
  canvas.height = SCENE_HEIGHT * dpr;
  canvas.style.width  = SCENE_WIDTH + 'px';
  canvas.style.height = SCENE_HEIGHT + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* =====================
   RENDERIZAR SECUENCIA
   NUEVO: flechas como texto plano + cursor línea azul
   El cursor se posiciona solo con mouse/tap
===================== */
function renderSequence() {
  sequenceBox.innerHTML = '';
  const playing = interval !== null || restartTimeout !== null;

  // Apariencia deshabilitada durante reproducción
  sequenceBox.classList.toggle('sequence-box--disabled', playing);

  if (sequence.length === 0) {
    if (!playing) sequenceBox.appendChild(makeCursor());
    updateDeleteBtn();
    return;
  }

  sequence.forEach((item, i) => {
    if (!playing && cursorPos === i) {
      sequenceBox.appendChild(makeCursor());
    }

    const span = document.createElement('span');
    span.className = 'seq-arrow';
    span.textContent = item.symbol;

    span.addEventListener('pointerdown', (e) => {
      if (playing) return;
      e.preventDefault();
      const rect = span.getBoundingClientRect();
      cursorPos = (e.clientX < rect.left + rect.width / 2) ? i : i + 1;
      renderSequence();
      scrollCursorIntoView();
    });

    sequenceBox.appendChild(span);
  });

  if (!playing && cursorPos === sequence.length) {
    sequenceBox.appendChild(makeCursor());
  }

  updateDeleteBtn();
  scrollCursorIntoView();
}

function makeCursor() {
  const cur = document.createElement('span');
  cur.className = 'seq-cursor';
  cur.id = 'seqCursor';
  return cur;
}

function scrollCursorIntoView() {
  requestAnimationFrame(() => {
    const cur = document.getElementById('seqCursor');
    if (!cur) return;
    const boxRect = sequenceBox.getBoundingClientRect();
    const curRect = cur.getBoundingClientRect();
    const margin = 20;
    if (curRect.right > boxRect.right - margin) {
      sequenceBox.scrollLeft += curRect.right - boxRect.right + margin;
    } else if (curRect.left < boxRect.left + margin) {
      sequenceBox.scrollLeft -= boxRect.left - curRect.left + margin;
    }
  });
}

/* =====================
   BOTÓN BORRAR
===================== */
function updateDeleteBtn() {
  if (!deleteBtn) return;
  const playing = interval !== null || restartTimeout !== null;
  const canDel = !playing && cursorPos > 0;
  deleteBtn.disabled = !canDel;
  deleteBtn.style.opacity = canDel ? '1' : '0.35';
  deleteBtn.style.cursor  = canDel ? 'pointer' : 'not-allowed';
}

/* =====================
   AGREGAR ACCIÓN
   NUEVO: inserta en cursorPos (no solo al final)
   El robot y el camino NO se tocan — igual que el original
   cuando solo se agrega a la lista sin reproducir
===================== */
function addAction(code, symbol) {
  if (interval !== null || restartTimeout !== null) return;

  sequence.splice(cursorPos, 0, { code, symbol });
  cursorPos++;

  // Invalidar camino previo (secuencia cambió)
  pathCommands = [];
  loopCommands = [];
  pathLocked = false;

  renderSequence();
}

/* =====================
   BORRAR A LA IZQUIERDA DEL CURSOR
   NUEVO: equivalente a Backspace
===================== */
function deleteAtCursor() {
  if (interval !== null || restartTimeout !== null) return;
  if (cursorPos === 0) return;

  sequence.splice(cursorPos - 1, 1);
  cursorPos--;

  pathCommands = [];
  loopCommands = [];
  pathLocked = false;

  renderSequence();
}

/* =====================
   CONTROLES (ORIGINAL)
   CAMBIO MÍNIMO: Play también limpia pathCommands/loopCommands
   y resetea robot antes de reproducir (secuencia nueva)
===================== */
playBtn.onclick = () => {
  if (interval || sequence.length === 0) return;

  // Secuencia nueva: limpiar estado y robot al inicio
  pathCommands = [];
  loopCommands = [];
  pathLocked = false;
  index = 0;
  cursorPos = sequence.length;
  isPaused = false;

  resetRobotInstant();
  draw();

  setDpadEnabled(false);
  renderSequence();
  interval = setInterval(execute, 500);
};

stopBtn.onclick = () => {
  stopPlayback();
  setDpadEnabled(true);
  renderSequence();
};

resetBtn.onclick = () => {
  stopPlayback();
  sequence = [];
  pathCommands = [];
  loopCommands = [];
  pathLocked = false;
  index = 0;
  cursorPos = 0;
  isPaused = false;
  wasPlayingOnResize = false;
  isResizing = false;
  setDpadEnabled(true);
  resetRobotInstant();
  draw();
  renderSequence();
};

toggleSeqBtn.onclick = () => {
  seqWrapper.style.display = (seqWrapper.style.display === 'none') ? 'flex' : 'none';
};

if (deleteBtn) {
  deleteBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    deleteAtCursor();
  });
}

/* =====================
   TECLADO (ORIGINAL + CAMBIO MÍNIMO)
   ↑↓←→ agregan flechas, sin conflicto con cursor
   Backspace borra a la izquierda del cursor
===================== */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp")    addAction("F", "⬆");
  if (e.key === "ArrowDown")  addAction("B", "⬇");
  if (e.key === "ArrowLeft")  addAction("L", "⬅");
  if (e.key === "ArrowRight") addAction("R", "➡");
  if (e.key === "Backspace")  deleteAtCursor();
  if (e.key === "h")          toggleSeqBtn.click();
});

/* =====================
   INICIALIZACIÓN (ORIGINAL)
===================== */
function initScene() {
  SCENE_WIDTH = scene.clientWidth;
  SCENE_HEIGHT = scene.clientHeight;
  applyDPR();
  startX = SCENE_WIDTH / 2;
  startY = SCENE_HEIGHT / 2;
  robot.x = startX;
  robot.y = startY;
  robot.dir = 0;
  visualRotation = 0;
  draw();
  updateRobot();
  renderSequence();
}

/* =====================
   RESIZE (ORIGINAL)
===================== */
let resizeTimeout = null;

window.addEventListener("resize", () => {

  if (!isResizing) {
    wasPlayingOnResize = (interval !== null || restartTimeout !== null);
    isResizing = true;
    if (wasPlayingOnResize) stopPlayback();
  }

  if (resizeTimeout) clearTimeout(resizeTimeout);

  resizeTimeout = setTimeout(() => {
    isResizing = false;

    SCENE_WIDTH = scene.clientWidth;
    SCENE_HEIGHT = scene.clientHeight;
    applyDPR();

    startX = SCENE_WIDTH / 2;
    startY = SCENE_HEIGHT / 2;

    const pos = calcPosition(loopCommands);

    robotImg.style.transition = "none";
    robot.x = pos.x;
    robot.y = pos.y;
    robot.dir = pos.dir;
    visualRotation = pos.rot;

    draw();
    updateRobot();
    robotImg.offsetHeight;
    robotImg.style.transition =
      "transform 0.35s ease-in-out, left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1)";

    if (wasPlayingOnResize) {
      wasPlayingOnResize = false;
      isPaused = false;
      interval = setInterval(execute, 500);
    }

  }, 200);
});

/* =====================
   BOTÓN HOME (ORIGINAL)
===================== */
const homeBtn = document.getElementById("homeButton");
if (homeBtn) {
  homeBtn.onclick = () => {
    clearInterval(interval);
    interval = null;
    window.location.href = '../index.html';
  };
}

/* =====================
   INIT (ORIGINAL)
===================== */
initScene();