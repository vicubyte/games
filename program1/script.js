const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const robotImg = document.getElementById("robot");

const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const toggleSeqBtn = document.getElementById("toggleSeq");
const sequenceBox = document.getElementById("sequenceBox");

const scene = document.querySelector(".scene");

/* =====================
   ESCENA
===================== */
let SCENE_WIDTH;
let SCENE_HEIGHT;

const STEP = 70;
const RESTART_DELAY = 500;

/* =====================
   ROBOT
===================== */
let startX = 0;
let startY = 0;

let robot = {
  x: 0,
  y: 0,
  dir: 0 // 0↑ 1→ 2↓ 3←
};

let visualRotation = 0;

/* =====================
   SECUENCIA
===================== */
let sequence = [];
let index = 0;
let interval = null;

/* =====================
   CAMINO
===================== */
let path = [];
let pathLocked = false;

/* =====================
   DIBUJO
===================== */
function crisp(v) {
  return Math.round(v) + 0.5;
}

function drawPath() {
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#999";

  path.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(crisp(p.x1), crisp(p.y1));
    ctx.lineTo(crisp(p.x2), crisp(p.y2));
    ctx.stroke();
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
  robotImg.style.left = robot.x - robotImg.width / 2 + "px";
  robotImg.style.top = robot.y - robotImg.height / 2 + "px";
  robotImg.style.transform = `rotate(${visualRotation}deg)`;
}

/* =====================
   MOVIMIENTO
===================== */
function canMove(nx, ny) {
  const margin = 70/2;
  return (
    nx > margin &&
    nx < SCENE_WIDTH - margin &&
    ny > margin &&
    ny < SCENE_HEIGHT - margin
  );
}

function forward() {
  const px = robot.x;
  const py = robot.y;

  let nx = robot.x;
  let ny = robot.y;

  if (robot.dir === 0) ny -= STEP;
  if (robot.dir === 1) nx += STEP;
  if (robot.dir === 2) ny += STEP;
  if (robot.dir === 3) nx -= STEP;

  if (!canMove(nx, ny)) return;

  robot.x = nx;
  robot.y = ny;

  if (!pathLocked) {
    path.push({ x1: px, y1: py, x2: nx, y2: ny });
  }
}

function backward() {
  const px = robot.x;
  const py = robot.y;

  let nx = robot.x;
  let ny = robot.y;

  if (robot.dir === 0) ny += STEP;
  if (robot.dir === 1) nx -= STEP;
  if (robot.dir === 2) ny -= STEP;
  if (robot.dir === 3) nx += STEP;

  if (!canMove(nx, ny)) return;

  robot.x = nx;
  robot.y = ny;

  if (!pathLocked) {
    path.push({ x1: px, y1: py, x2: nx, y2: ny });
  }
}

function left() {
  robot.dir = (robot.dir + 3) % 4;
  visualRotation -= 90;
}

function right() {
  robot.dir = (robot.dir + 1) % 4;
  visualRotation += 90;
}

/* =====================
   EJECUCIÓN
===================== */
function execute() {
  if (index >= sequence.length) {
    pathLocked = true;
    index = 0;

    clearInterval(interval);
    interval = null;

    setTimeout(() => {
      resetRobotInstant();
      interval = setInterval(execute, 500);
    }, RESTART_DELAY);

    return;
  }

  const cmd = sequence[index];

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
    "transform 0.35s ease-in-out, left 0.45s cubic-bezier(0.4, 0.0, 0.2, 1), top 0.45s cubic-bezier(0.4, 0.0, 0.2, 1)";
}

/* =====================
   CONTROLES
===================== */
playBtn.onclick = () => {
  if (interval || sequence.length === 0) return;
  interval = setInterval(execute, 500);
};

stopBtn.onclick = () => {
  clearInterval(interval);
  interval = null;
};

resetBtn.onclick = () => {
  clearInterval(interval);
  interval = null;

  sequence = [];
  sequenceBox.innerHTML = "";
  path = [];
  pathLocked = false;
  index = 0;

  // Resetear a posición inicial
  resetRobotInstant();
  draw();
};

toggleSeqBtn.onclick = () => {
  if (sequenceBox.style.display === "none" || sequenceBox.style.display === "") {
    sequenceBox.style.display = "flex";
  } else {
    sequenceBox.style.display = "none";
  }
};

/* =====================
   TECLADO
===================== */
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp") addAction("F", "⬆");
  if (e.key === "ArrowDown") addAction("B", "⬇");
  if (e.key === "ArrowLeft") addAction("L", "⬅");
  if (e.key === "ArrowRight") addAction("R", "➡");
  if (e.key === "Backspace") removeLast();
  if (e.key === "h") toggleSeqBtn.click();
});

function addAction(code, symbol) {
  sequence.push(code);
  sequenceBox.innerHTML += symbol + " ";
}

function removeLast() {
  sequence.pop();
  sequenceBox.innerHTML = sequenceBox.innerHTML.slice(0, -3);
}

/* =====================
   INICIALIZACIÓN
===================== */
function initScene() {
  SCENE_WIDTH = scene.clientWidth;
  SCENE_HEIGHT = scene.clientHeight;

  canvas.width = SCENE_WIDTH;
  canvas.height = SCENE_HEIGHT;

  startX = SCENE_WIDTH / 2;
  startY = SCENE_HEIGHT / 2;

  robot.x = startX;
  robot.y = startY;
  robot.dir = 0;
  visualRotation = 0;

  draw();
  updateRobot();
}

/* =====================
   RESIZE MEJORADO (FIX DEL BUG)
===================== */
let resizeTimeout = null;

window.addEventListener("resize", () => {
  // Limpiar timeout anterior
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  
  // Esperar 200ms después del último resize para recalcular
  resizeTimeout = setTimeout(() => {
    // Guardar estado actual del robot (posición relativa)
    const relativeX = robot.x / SCENE_WIDTH;
    const relativeY = robot.y / SCENE_HEIGHT;
    const relativeStartX = startX / SCENE_WIDTH;
    const relativeStartY = startY / SCENE_HEIGHT;
    
    // Guardar path relativo
    const relativePath = path.map(p => ({
      x1: p.x1 / SCENE_WIDTH,
      y1: p.y1 / SCENE_HEIGHT,
      x2: p.x2 / SCENE_WIDTH,
      y2: p.y2 / SCENE_HEIGHT
    }));
    
    // Actualizar dimensiones
    SCENE_WIDTH = scene.clientWidth;
    SCENE_HEIGHT = scene.clientHeight;
    canvas.width = SCENE_WIDTH;
    canvas.height = SCENE_HEIGHT;
    
    // Restaurar posición relativa
    startX = relativeStartX * SCENE_WIDTH;
    startY = relativeStartY * SCENE_HEIGHT;
    robot.x = relativeX * SCENE_WIDTH;
    robot.y = relativeY * SCENE_HEIGHT;
    
    // Restaurar path relativo
    path = relativePath.map(p => ({
      x1: p.x1 * SCENE_WIDTH,
      y1: p.y1 * SCENE_HEIGHT,
      x2: p.x2 * SCENE_WIDTH,
      y2: p.y2 * SCENE_HEIGHT
    }));
    
    // Redibujar sin transición
    robotImg.style.transition = "none";
    draw();
    updateRobot();
    robotImg.offsetHeight;
    robotImg.style.transition =
      "transform 0.35s ease-in-out, left 0.45s cubic-bezier(0.4, 0.0, 0.2, 1), top 0.45s cubic-bezier(0.4, 0.0, 0.2, 1)";
  }, 200);
});

/* =====================
   BOTÓN HOME
===================== */
const homeBtn = document.getElementById("homeButton");

if (homeBtn) {
  homeBtn.onclick = () => {
    // Detener animaciones
    clearInterval(interval);
    interval = null;
    
    // Regresar a la landing page
    window.location.href = '../index.html';
  };
}

/* =====================
   INIT
===================== */
initScene();