const canvas = document.getElementById("canvas");
const ctx    = canvas.getContext("2d");
const robotImg = document.getElementById("robot");
const scene    = document.getElementById("scene");

const bg = document.getElementById("background");
bg.style.display = "none";

/* =====================
   CANVAS
===================== */
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

/* =====================
   WHITE TRACK MODE
   Cuando está activo: fondo blanco full pantalla, sin imagen.
   trackBounds = pantalla completa, robot size basado en lado corto de pantalla.
===================== */
let whiteTrack = false;

/* =====================
   TRACK BOUNDS
===================== */
let trackBounds  = { x: 0, y: 0, width: canvas.width, height: canvas.height };
let trackRotated = false;

let ROBOT_SIZE = 60;
let ROBOT_H    = 60;

function updateTrackBounds() {
  const sw = window.innerWidth;
  const sh = window.innerHeight;

  if (whiteTrack) {
    // Pista blanca = pantalla completa, sin bandas negras
    trackBounds  = { x: 0, y: 0, width: sw, height: sh };
    trackRotated = false;
  } else {
    const iw = bg.naturalWidth  || sw;
    const ih = bg.naturalHeight || sh;

    const screenLandscape = sw >= sh;
    const imgLandscape    = iw >= ih;
    trackRotated = (screenLandscape !== imgLandscape);

    const effW = trackRotated ? ih : iw;
    const effH = trackRotated ? iw : ih;

    const scale = Math.min(sw / effW, sh / effH);
    const rw = effW * scale;
    const rh = effH * scale;

    trackBounds = {
      x: (sw - rw) / 2,
      y: (sh - rh) / 2,
      width:  rw,
      height: rh
    };
  }

  // Robot size = 1/7 del lado más corto de la pista renderizada
  const shortSide = Math.min(trackBounds.width, trackBounds.height);
  ROBOT_SIZE = Math.max(24, Math.round(shortSide / 7));
  robotImg.style.width  = ROBOT_SIZE + "px";
  robotImg.style.height = "auto";

  if (robotImg.naturalWidth && robotImg.naturalHeight) {
    ROBOT_H = Math.round(ROBOT_SIZE * (robotImg.naturalHeight / robotImg.naturalWidth));
  } else {
    ROBOT_H = ROBOT_SIZE;
  }
}

/* =====================
   DIBUJAR PISTA
===================== */
function drawTrack() {
  const { x, y, width, height } = trackBounds;

  if (whiteTrack) {
    // Fondo blanco full pantalla
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Fondo negro + imagen
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!bg.complete || !bg.naturalWidth) return;

  ctx.save();

  if (trackRotated) {
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(bg, -height / 2, -width / 2, height, width);
  } else {
    ctx.drawImage(bg, x, y, width, height);
  }

  ctx.restore();
}

/* =====================
   ROBOT STATE
===================== */
let robot = {
  x: 0, y: 0,
  rx: 0.5, ry: 0.5,
  angle: -90
};

const initialRobotState = { rx: 0.5, ry: 0.5, angle: -90 };

function applyRelativePosition() {
  robot.x = trackBounds.x + robot.rx * trackBounds.width;
  robot.y = trackBounds.y + robot.ry * trackBounds.height;
}

function saveRelativePosition() {
  robot.rx = (robot.x - trackBounds.x) / trackBounds.width;
  robot.ry = (robot.y - trackBounds.y) / trackBounds.height;
}

function centerRobotOnTrack() {
  robot.rx = 0.5;
  robot.ry = 0.5;
  applyRelativePosition();
  initialRobotState.rx = robot.rx;
  initialRobotState.ry = robot.ry;
}

/* =====================
   MOVIMIENTO
===================== */
const MAX_SPEED    = 1.5;
const TURN_SPEED   = 1.2;
const ACCELERATION = 0.08;
const FRICTION     = 0.90;
let velocity = 0;

/* =====================
   DELTA TIME
===================== */
let lastTime = performance.now();
const TARGET_FPS     = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

/* =====================
   TECLAS
===================== */
let keys = {
  ArrowUp: false, ArrowDown: false,
  ArrowLeft: false, ArrowRight: false
};

document.addEventListener("keydown", e => {
  if (keys.hasOwnProperty(e.key)) { e.preventDefault(); keys[e.key] = true; }
});
document.addEventListener("keyup", e => {
  if (keys.hasOwnProperty(e.key)) { e.preventDefault(); keys[e.key] = false; }
});

/* =====================
   REPRODUCCIÓN / PAUSA
===================== */
let recording         = false;
let recordedPath      = [];
let playing           = false;
let paused            = false;
let pausedElapsed     = 0;
let playbackStartTime = 0;
let recordingStartTime = 0;
let playbackTimeout   = null;
let lastFrameIndex    = 0;

/* =====================
   DPAD
===================== */
const dpadMap = {
  upBtn: "ArrowUp", downBtn: "ArrowDown",
  leftBtn: "ArrowLeft", rightBtn: "ArrowRight"
};

Object.keys(dpadMap).forEach(id => {
  const btn = document.getElementById(id);
  const key = dpadMap[id];
  const press   = e => { e.preventDefault(); keys[key] = true;  btn.classList.add("pressed"); };
  const release = e => { e.preventDefault(); keys[key] = false; btn.classList.remove("pressed"); };
  const cancel  = ()  => { keys[key] = false; btn.classList.remove("pressed"); };
  btn.addEventListener("mousedown",   press);
  btn.addEventListener("mouseup",     release);
  btn.addEventListener("mouseleave",  cancel);
  btn.addEventListener("touchstart",  press,   { passive: false });
  btn.addEventListener("touchend",    release, { passive: false });
  btn.addEventListener("touchcancel", cancel);
});

/* =====================
   GRABACIÓN
===================== */
const recBtn             = document.getElementById("recBtn");
const saveBtn            = document.getElementById("saveBtn");
const recordingIndicator = document.getElementById("recordingIndicator");
const statusIndicator    = document.getElementById("statusIndicator");

recBtn.onclick = () => {
  if (playing || paused) { updateStatus("Stop playback first"); return; }
  if (recording)         { updateStatus("Already recording");   return; }
  recording = true;
  recordedPath = [];
  recordingStartTime = performance.now();
  recBtn.classList.add("recording");
  recordingIndicator.classList.add("active");
  saveBtn.disabled = false;
  updateStatus("Recording... Press SAVE when done");
};

saveBtn.onclick = () => {
  if (!recording) { updateStatus("Press REC first to record"); return; }
  recording = false;
  recBtn.classList.remove("recording");
  recordingIndicator.classList.remove("active");
  if (recordedPath.length > 0) {
    updateStatus(`Saved! ${recordedPath.length} frames - Press PLAY`);
  } else {
    updateStatus("No movement recorded");
  }
};

/* =====================
   PLAYBACK
===================== */
const playBtn  = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

playBtn.onclick = () => {
  if (recordedPath.length === 0) { updateStatus("Record a movement first");  return; }
  if (recording)                  { updateStatus("Save the recording first"); return; }

  if (paused) {
    paused  = false;
    playing = true;
    playbackStartTime = performance.now() - pausedElapsed;
    playBtn.disabled  = true;
    pauseBtn.disabled = false;
    updateStatus("Playing...");
    playRecordedPath();
  } else {
    playing        = true;
    paused         = false;
    pausedElapsed  = 0;
    lastFrameIndex = 0;
    playbackStartTime = performance.now();
    playBtn.disabled  = true;
    pauseBtn.disabled = false;
    updateStatus("Playing...");
    playRecordedPath();
  }
};

pauseBtn.onclick = () => {
  if (!playing) return;
  pausedElapsed = performance.now() - playbackStartTime;
  playing = false;
  paused  = true;
  if (playbackTimeout) { clearTimeout(playbackTimeout); playbackTimeout = null; }
  playBtn.disabled  = false;
  pauseBtn.disabled = true;
  updateStatus("Paused — Press PLAY to continue");
};

resetBtn.onclick = () => {
  playing   = false;
  paused    = false;
  recording = false;
  recordedPath    = [];
  pausedElapsed   = 0;
  lastFrameIndex  = 0;
  recordingStartTime = 0;
  playbackStartTime  = 0;
  if (playbackTimeout) { clearTimeout(playbackTimeout); playbackTimeout = null; }
  robot.rx    = initialRobotState.rx;
  robot.ry    = initialRobotState.ry;
  robot.angle = initialRobotState.angle;
  applyRelativePosition();
  velocity = 0;
  recBtn.classList.remove("recording");
  recordingIndicator.classList.remove("active");
  playBtn.disabled  = false;
  pauseBtn.disabled = true;
  updateStatus("Reset — Ready to record");
};

/* =====================
   FUNCIÓN DE REPRODUCCIÓN
===================== */
function playRecordedPath() {
  if (!playing || !recordedPath.length) return;
  const elapsed = performance.now() - playbackStartTime;

  while (lastFrameIndex < recordedPath.length - 1 &&
         recordedPath[lastFrameIndex + 1].time <= elapsed) {
    lastFrameIndex++;
  }

  if (lastFrameIndex >= recordedPath.length - 1) {
    const last = recordedPath[recordedPath.length - 1];
    robot.x = last.x; robot.y = last.y; robot.angle = last.angle;
    saveRelativePosition();
    updateStatus("Waiting to repeat...");
    lastFrameIndex = 0; pausedElapsed = 0;
    playbackTimeout = setTimeout(() => {
      if (playing) {
        playbackStartTime = performance.now();
        updateStatus("Playing...");
        playRecordedPath();
      }
    }, 1500);
    return;
  }

  const f1 = recordedPath[lastFrameIndex];
  const f2 = recordedPath[Math.min(lastFrameIndex + 1, recordedPath.length - 1)];

  if (!f1 || !f2 || f2.time === f1.time) {
    if (f1) { robot.x = f1.x; robot.y = f1.y; robot.angle = f1.angle; }
  } else {
    const st = Math.min(Math.max((elapsed - f1.time) / (f2.time - f1.time), 0), 1);
    robot.x = f1.x + (f2.x - f1.x) * st;
    robot.y = f1.y + (f2.y - f1.y) * st;
    let da = f2.angle - f1.angle;
    while (da >  180) da -= 360;
    while (da < -180) da += 360;
    robot.angle = f1.angle + da * st;
  }

  saveRelativePosition();
  requestAnimationFrame(playRecordedPath);
}

/* =====================
   STATUS
===================== */
function updateStatus(msg) { statusIndicator.textContent = msg; }

/* =====================
   TRACK SELECTOR
===================== */
const trackBtn         = document.getElementById("trackBtn");
const trackMenu        = document.getElementById("trackMenu");
const customTrackInput = document.getElementById("customTrack");
const dropZone         = document.getElementById("dropZone");

trackBtn.onclick = () => trackMenu.classList.toggle("active");

document.addEventListener("click", e => {
  if (!trackBtn.contains(e.target) && !trackMenu.contains(e.target))
    trackMenu.classList.remove("active");
});

// Pistas con imagen
trackMenu.onclick = e => {
  const btn = e.target.closest("[data-track]");
  if (btn) {
    whiteTrack = false;
    bg.src = btn.dataset.track;
    trackMenu.classList.remove("active");
    updateStatus("Track changed");
  }
};

// Pista blanca
document.getElementById("whiteTrackBtn").onclick = () => {
  whiteTrack = true;
  trackMenu.classList.remove("active");
  updateTrackBounds();
  centerRobotOnTrack();
  updateStatus("Track changed");
};

customTrackInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) { loadCustomTrack(file); trackMenu.classList.remove("active"); }
});

bg.addEventListener("load", () => {
  if (!whiteTrack) {
    updateTrackBounds();
    centerRobotOnTrack();
  }
});

/* =====================
   DRAG & DROP
===================== */
let dragCounter = 0;
scene.addEventListener("dragenter", e => { e.preventDefault(); dragCounter++; dropZone.classList.add("active"); });
scene.addEventListener("dragleave", e => { e.preventDefault(); dragCounter--; if (!dragCounter) dropZone.classList.remove("active","drag-over"); });
scene.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
scene.addEventListener("drop", e => {
  e.preventDefault(); dragCounter = 0;
  dropZone.classList.remove("active","drag-over");
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) loadCustomTrack(file);
  else updateStatus("Please drag only image files");
});

function loadCustomTrack(file) {
  if (!file.type.startsWith("image/"))  { updateStatus("Only image files allowed");   return; }
  if (file.size > 10 * 1024 * 1024)    { updateStatus("Image too large (max 10MB)"); return; }
  const reader = new FileReader();
  reader.onload  = e => {
    whiteTrack = false;
    bg.src = e.target.result;
    updateStatus(`Custom track loaded: ${file.name}`);
  };
  reader.onerror = () => updateStatus("Error loading image");
  reader.readAsDataURL(file);
}

/* =====================
   HOME
===================== */
document.getElementById("homeButton").onclick = () => {
  playing = recording = false;
  if (playbackTimeout) { clearTimeout(playbackTimeout); playbackTimeout = null; }
  window.location.href = '../index.html';
};

/* =====================
   LOOP PRINCIPAL
===================== */
function loop(currentTime) {
  const dt = (currentTime - lastTime) / FRAME_DURATION;
  lastTime = currentTime;

  drawTrack();

  const { x, y, width, height } = trackBounds;

  if (!playing && !paused) {
    if (keys["ArrowLeft"])  robot.angle -= TURN_SPEED * dt;
    if (keys["ArrowRight"]) robot.angle += TURN_SPEED * dt;

    if      (keys["ArrowUp"])   velocity = Math.min(velocity + ACCELERATION * dt,  MAX_SPEED);
    else if (keys["ArrowDown"]) velocity = Math.max(velocity - ACCELERATION * dt, -MAX_SPEED / 1.5);
    else                         velocity *= Math.pow(FRICTION, dt);

    const rad = (robot.angle * Math.PI) / 180;
    robot.x += Math.cos(rad) * velocity * dt;
    robot.y += Math.sin(rad) * velocity * dt;

    const robotLong = Math.max(ROBOT_SIZE, ROBOT_H);
    const margin    = robotLong / 3;

    const minX = x - margin + ROBOT_SIZE / 2;
    const maxX = x + width  + margin - ROBOT_SIZE / 2;
    const minY = y - margin + ROBOT_H / 2;
    const maxY = y + height + margin - ROBOT_H / 2;

    if (robot.x < minX) { robot.x = minX; velocity *= 0.5; }
    if (robot.x > maxX) { robot.x = maxX; velocity *= 0.5; }
    if (robot.y < minY) { robot.y = minY; velocity *= 0.5; }
    if (robot.y > maxY) { robot.y = maxY; velocity *= 0.5; }

    saveRelativePosition();

    if (recording) {
      const t = performance.now() - recordingStartTime;
      if (!recordedPath.length || Math.abs(velocity) > 0.01 || keys["ArrowLeft"] || keys["ArrowRight"]) {
        recordedPath.push({ x: robot.x, y: robot.y, angle: robot.angle, time: t });
      }
    }
  }

  robotImg.style.left      = (robot.x - ROBOT_SIZE / 2) + "px";
  robotImg.style.top       = (robot.y - ROBOT_H / 2) + "px";
  robotImg.style.transform = `rotate(${robot.angle}deg)`;

  requestAnimationFrame(loop);
}

/* =====================
   RESIZE
===================== */
let lastOrientation = window.innerWidth >= window.innerHeight ? "landscape" : "portrait";

window.addEventListener("resize", () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const newOrientation = window.innerWidth >= window.innerHeight ? "landscape" : "portrait";

  if (newOrientation !== lastOrientation) {
    const ox = robot.rx;
    const oy = robot.ry;
    robot.rx = oy;
    robot.ry = ox;
    robot.angle += newOrientation === "landscape" ? -90 : 90;
    lastOrientation = newOrientation;
  }

  updateTrackBounds();
  applyRelativePosition();
});

/* =====================
   INIT
===================== */
function init() {
  updateTrackBounds();
  centerRobotOnTrack();
}

let bgReady    = bg.complete       && bg.naturalWidth    > 0;
let robotReady = robotImg.complete && robotImg.naturalWidth > 0;

function checkReady() {
  if (bgReady && robotReady) init();
}

if (!bgReady)    bg.addEventListener("load",       () => { bgReady    = true; checkReady(); }, { once: true });
if (!robotReady) robotImg.addEventListener("load", () => { robotReady = true; checkReady(); }, { once: true });
checkReady();

requestAnimationFrame(loop);
updateStatus("Ready to record");