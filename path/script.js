const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const robotImg = document.getElementById("robot");

const playBtn    = document.getElementById("playBtn");
const stopBtn    = playBtn; // botón unificado play/pause
const resetBtn   = document.getElementById("resetBtn");
const toggleSeqBtn = document.getElementById("toggleSeq");
const sequenceBox  = document.getElementById("sequenceBox");
const deleteBtn    = document.getElementById("deleteBtn");
const seqWrapper   = document.getElementById("seqWrapper");
const scene        = document.querySelector(".scene");

/* =====================
   ESCENA
===================== */
let SCENE_WIDTH;
let SCENE_HEIGHT;

function getSTEP() {
  const robotWidth = robotImg.width || 150;
  return Math.max(robotWidth * 0.47, 40);
}

const RESTART_DELAY = 500;

const SPEED_MAP = {
  1: 1000,
  2:  750,
  3:  500,
  4:  300,
  5:  150
};

let currentStep = 3;

function getInterval() {
  return SPEED_MAP[currentStep];
}

/* =====================
   INICIALIZAR CONTROL DE VELOCIDAD
===================== */
function initSpeedControl() {
  updateSpeedUI();

  document.querySelectorAll('.speed-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentStep = parseInt(dot.dataset.step);
      updateSpeedUI();

      if (interval !== null) {
        clearInterval(interval);
        interval = setInterval(execute, getInterval());
      }
      if (restartTimeout !== null) {
        clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
          restartTimeout = null;
          if (isPaused) return;
          if (interval !== null) return;
          resetRobotInstant();
          interval = setInterval(execute, getInterval());
          updatePlayBtn();
          updateDeleteBtn();
        }, RESTART_DELAY);
      }
    });
  });
}

function updateSpeedUI() {
  const dots = document.querySelectorAll('.speed-dot');
  dots.forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.toggle('speed-dot--active', s === currentStep);
  });
}

/* =====================
   ROBOT
===================== */
let startX = 0;
let startY = 0;

let robot = { x: 0, y: 0, dir: 0 };
let visualRotation = 0;

/* =====================
   SECUENCIA
===================== */
let sequence   = [];
let cursorPos  = 0;
let index      = 0;
let interval   = null;
let restartTimeout = null;

/* =====================
   FLAGS
===================== */
let isPaused           = false;
let wasPlayingOnResize = false;
let isResizing         = false;
let sequenceEdited     = false;

/* =====================
   ÍCONO PLAY/PAUSE
===================== */
function updatePlayBtn() {
  const icon = playBtn.querySelector('i');
  const playing = interval !== null || restartTimeout !== null;
  if (playing) {
    icon.className = 'fa-solid fa-pause';
    playBtn.title  = 'Pause';
    playBtn.classList.remove('play-btn');
    playBtn.classList.add('pause-btn');
  } else {
    icon.className = 'fa-solid fa-play';
    playBtn.title  = 'Play';
    playBtn.classList.remove('pause-btn');
    playBtn.classList.add('play-btn');
  }
}

/* =====================
   CAMINO
===================== */
let pathCommands = [];
let loopCommands = [];
let pathLocked   = false;

/* =====================
   SNAPSHOT AL PAUSAR
===================== */
let pauseSnapshot   = null;
let isBetweenCycles = false;

/* =====================
   CALCULAR POSICIÓN
===================== */
function calcPosition(cmds) {
  const STEP = getSTEP();
  let cx = startX, cy = startY, dir = 0, rot = 0;

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
   DIBUJO
===================== */
function crisp(v) { return Math.round(v) + 0.5; }

function drawPath() {
  const STEP = getSTEP();
  let cx = startX, cy = startY, dir = 0;

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

    cx = nx; cy = ny;
  });

  ctx.setLineDash([]);
}

function draw() {
  ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  drawPath();
}

/* =====================
   ACTUALIZAR ROBOT
===================== */
function updateRobot() {
  robotImg.style.left = robot.x - robotImg.width  / 2 + "px";
  robotImg.style.top  = robot.y - robotImg.height / 2 + "px";
  robotImg.style.transform = `rotate(${visualRotation}deg)`;
}

/* =====================
   MOVIMIENTO
===================== */
function canMove(nx, ny) {
  const STEP = getSTEP();
  return nx >= -STEP && nx <= SCENE_WIDTH  + STEP &&
         ny >= -STEP && ny <= SCENE_HEIGHT + STEP;
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
   DPAD VISUAL
   FIX: no llama updateDeleteBtn aquí porque interval
   aún no fue asignado en este punto del flujo
===================== */
function setDpadEnabled(enabled) {
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.disabled = !enabled;
  });
}

/* =====================
   STOP
===================== */
function stopPlayback() {
  isPaused = true;
  clearInterval(interval);
  interval = null;
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
  pauseSnapshot = {
    x:             robot.x,
    y:             robot.y,
    dir:           robot.dir,
    rot:           visualRotation,
    idx:           index,
    pathLocked:    pathLocked,
    path:          pathCommands.slice(),
    betweenCycles: isBetweenCycles
  };
  isBetweenCycles = false;
}

/* =====================
   EJECUCIÓN
===================== */
function execute() {
  if (isPaused) return;

  if (index >= sequence.length) {
    pathLocked = true;
    loopCommands = [];
    index = 0;

    clearInterval(interval);
    interval = null;
    isBetweenCycles = true;

    restartTimeout = setTimeout(() => {
      restartTimeout = null;
      isBetweenCycles = false;
      if (isPaused) return;
      if (interval !== null) return;
      resetRobotInstant();
      interval = setInterval(execute, getInterval());
      updatePlayBtn();
      updateDeleteBtn(); // FIX: interval ya asignado aquí
    }, RESTART_DELAY);

    return;
  }

  const cmd = sequence[index].code;
  if (cmd === "F") forward();
  if (cmd === "B") backward();
  if (cmd === "L") left();
  if (cmd === "R") right();

  index++;
  draw();
  updateRobot();
}

/* =====================
   RESET INSTANTÁNEO
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
   CANVAS DPR
===================== */
function applyDPR() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = SCENE_WIDTH * dpr;
  canvas.height = SCENE_HEIGHT * dpr;
  canvas.style.width  = SCENE_WIDTH  + 'px';
  canvas.style.height = SCENE_HEIGHT + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* =====================
   RENDERIZAR SECUENCIA
===================== */
function renderSequence() {
  sequenceBox.innerHTML = '';
  const playing = interval !== null || restartTimeout !== null;

  sequenceBox.classList.toggle('sequence-box--disabled', playing);

  if (sequence.length === 0) {
    if (!playing) sequenceBox.appendChild(makeCursor());
    updateDeleteBtn();
    return;
  }

  sequence.forEach((item, i) => {
    if (!playing && cursorPos === i) sequenceBox.appendChild(makeCursor());

    const span = document.createElement('span');
    span.className = 'seq-arrow';
    const icon = document.createElement('i');
    const iconMap = {
      up:    'fa-arrow-up',
      down:  'fa-arrow-down',
      left:  'fa-arrow-left',
      right: 'fa-arrow-right'
    };
    icon.className = `fa-solid ${iconMap[item.symbol] || 'fa-arrow-up'}`;
    span.appendChild(icon);

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

  if (!playing && cursorPos === sequence.length) sequenceBox.appendChild(makeCursor());

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
    const margin  = 20;
    if (curRect.right > boxRect.right - margin)
      sequenceBox.scrollLeft += curRect.right - boxRect.right + margin;
    else if (curRect.left < boxRect.left + margin)
      sequenceBox.scrollLeft -= boxRect.left - curRect.left + margin;
  });
}

/* =====================
   BOTÓN BORRAR
===================== */
function updateDeleteBtn() {
  if (!deleteBtn) return;
  const playing = interval !== null || restartTimeout !== null;
  const canDel  = !playing && cursorPos > 0;
  deleteBtn.disabled = !canDel;
}

/* =====================
   AGREGAR ACCIÓN
===================== */
function addAction(code, symbol) {
  if (interval !== null || restartTimeout !== null) return;

  sequence.splice(cursorPos, 0, { code, symbol });
  cursorPos++;

  pathCommands   = [];
  loopCommands   = [];
  pathLocked     = false;
  sequenceEdited = true;

  renderSequence();
}

/* =====================
   BORRAR A LA IZQUIERDA DEL CURSOR
===================== */
function deleteAtCursor() {
  if (interval !== null || restartTimeout !== null) return;
  if (cursorPos === 0) return;

  sequence.splice(cursorPos - 1, 1);
  cursorPos--;

  pathCommands   = [];
  loopCommands   = [];
  pathLocked     = false;
  sequenceEdited = true;

  renderSequence();
}

/* =====================
   CONTROLES
===================== */
playBtn.onclick = () => {
  // — Si está reproduciendo: pausar —
  if (interval !== null || restartTimeout !== null) {
    stopPlayback();
    setDpadEnabled(true);
    renderSequence();
    updatePlayBtn();
    updateDeleteBtn(); // FIX: interval ya es null aquí (stopPlayback lo limpió)
    return;
  }

  // — Sin secuencia: ignorar —
  if (sequence.length === 0) return;

  // — Pausado SIN editar: reanudar desde donde quedó —
  if (isPaused && !sequenceEdited) {
    isPaused = false;

    if (pauseSnapshot) {
      if (pauseSnapshot.betweenCycles) {
        pathCommands  = [];
        loopCommands  = [];
        pathLocked    = false;
        index         = 0;
        pauseSnapshot = null;
        resetRobotInstant();
        draw();
        setDpadEnabled(false);
        renderSequence();
        interval = setInterval(execute, getInterval());
        updatePlayBtn();
        updateDeleteBtn(); // FIX: interval ya asignado
        return;
      }

      robotImg.style.transition = "none";
      robot.x        = pauseSnapshot.x;
      robot.y        = pauseSnapshot.y;
      robot.dir      = pauseSnapshot.dir;
      visualRotation = pauseSnapshot.rot;
      index          = pauseSnapshot.idx;
      pathLocked     = pauseSnapshot.pathLocked;
      pathCommands   = pauseSnapshot.path.slice();
      robotImg.offsetHeight;
      robotImg.style.transition =
        "transform 0.35s ease-in-out, left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1)";
      updateRobot();
      draw();
      pauseSnapshot = null;
    }

    loopCommands = [];
    setDpadEnabled(false);
    renderSequence();
    interval = setInterval(execute, getInterval());
    updatePlayBtn();
    updateDeleteBtn(); // FIX: interval ya asignado
    return;
  }

  // — Primera vez o secuencia editada: arrancar desde cero —
  pathCommands    = [];
  loopCommands    = [];
  pathLocked      = false;
  index           = 0;
  cursorPos       = sequence.length;
  isPaused        = false;
  sequenceEdited  = false;
  pauseSnapshot   = null;
  isBetweenCycles = false;

  resetRobotInstant();
  draw();
  setDpadEnabled(false);
  renderSequence();
  interval = setInterval(execute, getInterval());
  updatePlayBtn();
  updateDeleteBtn(); // FIX: interval ya asignado
};

resetBtn.onclick = () => {
  stopPlayback();
  sequence        = [];
  pathCommands    = [];
  loopCommands    = [];
  pathLocked      = false;
  index           = 0;
  cursorPos       = 0;
  isPaused        = false;
  sequenceEdited  = false;
  pauseSnapshot   = null;
  isBetweenCycles = false;
  wasPlayingOnResize = false;
  isResizing      = false;
  setDpadEnabled(true);
  resetRobotInstant();
  draw();
  renderSequence();
  updatePlayBtn();
  updateDeleteBtn();
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
   TECLADO
===================== */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp")    addAction("F", "up");
  if (e.key === "ArrowDown")  addAction("B", "down");
  if (e.key === "ArrowLeft")  addAction("L", "left");
  if (e.key === "ArrowRight") addAction("R", "right");
  if (e.key === "Backspace")  deleteAtCursor();
  if (e.key === "h")          toggleSeqBtn.click();
});

/* =====================
   INICIALIZACIÓN
===================== */
function initScene() {
  SCENE_WIDTH  = scene.clientWidth;
  SCENE_HEIGHT = scene.clientHeight;
  applyDPR();
  startX   = SCENE_WIDTH  / 2;
  startY   = SCENE_HEIGHT / 2;
  robot.x  = startX;
  robot.y  = startY;
  robot.dir = 0;
  visualRotation = 0;
  draw();
  updateRobot();
  renderSequence();
  initSpeedControl();
  updatePlayBtn();
  updateDeleteBtn();
}

/* =====================
   RESIZE
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

    SCENE_WIDTH  = scene.clientWidth;
    SCENE_HEIGHT = scene.clientHeight;
    applyDPR();

    startX = SCENE_WIDTH  / 2;
    startY = SCENE_HEIGHT / 2;

    const pos = calcPosition(loopCommands);

    robotImg.style.transition = "none";
    robot.x        = pos.x;
    robot.y        = pos.y;
    robot.dir      = pos.dir;
    visualRotation = pos.rot;

    draw();
    updateRobot();
    robotImg.offsetHeight;
    robotImg.style.transition =
      "transform 0.35s ease-in-out, left 0.45s cubic-bezier(0.4,0,0.2,1), top 0.45s cubic-bezier(0.4,0,0.2,1)";

    if (wasPlayingOnResize) {
      wasPlayingOnResize = false;
      isPaused       = false;
      sequenceEdited = false;
      interval = setInterval(execute, getInterval());
      updatePlayBtn();
      updateDeleteBtn(); // FIX: interval ya asignado
    } else {
      updatePlayBtn();
      updateDeleteBtn();
    }
  }, 200);
});

/* =====================
   BOTÓN HOME
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
   INIT
===================== */
initScene();