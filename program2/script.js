const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const robotImg = document.getElementById("robot");
const bg = document.getElementById("background");
const scene = document.getElementById("scene");

/* =====================
   CANVAS
===================== */
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

/* =====================
   ROBOT
===================== */
const ROBOT_SIZE = 150;

let robot = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  angle: -90 // -90 apunta hacia arriba inicialmente
};

const initialRobotState = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  angle: -90
};

/* =====================
   MOVIMIENTO OPTIMIZADO
   - Velocidad moderada
   - Mejor capacidad de giro (curvas cerradas)
   - Delta time para consistencia
===================== */
const MAX_SPEED = 3.5;        // Velocidad máxima (px por frame a 60fps)
const TURN_SPEED = 2.8;       // Velocidad de giro aumentada para curvas más cerradas
const ACCELERATION = 0.15;    // Aceleración
const FRICTION = 0.90;        // Fricción (más alto = menos deslizamiento)

let velocity = 0;

/* =====================
   DELTA TIME
   Para movimiento consistente en todos los dispositivos
===================== */
let lastTime = performance.now();
const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

/* =====================
   CONTROL
===================== */
let keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

let recording = false;
let recordedPath = [];
let playing = false;
let playbackStartTime = 0;
let recordingStartTime = 0;
let playbackTimeout = null;

/* =====================
   INPUT TECLADO
===================== */
document.addEventListener("keydown", e => {
  if (keys.hasOwnProperty(e.key)) {
    e.preventDefault();
    keys[e.key] = true;
  }
});

document.addEventListener("keyup", e => {
  if (keys.hasOwnProperty(e.key)) {
    e.preventDefault();
    keys[e.key] = false;
  }
});

/* =====================
   BOTONES DPAD - TOUCH/MOUSE
===================== */
const dpadButtons = {
  upBtn: "ArrowUp",
  downBtn: "ArrowDown",
  leftBtn: "ArrowLeft",
  rightBtn: "ArrowRight"
};

// Configurar eventos para cada botón del DPAD
Object.keys(dpadButtons).forEach(btnId => {
  const btn = document.getElementById(btnId);
  const key = dpadButtons[btnId];
  
  // Mouse events
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    keys[key] = true;
    btn.classList.add("pressed");
  });
  
  btn.addEventListener("mouseup", (e) => {
    e.preventDefault();
    keys[key] = false;
    btn.classList.remove("pressed");
  });
  
  btn.addEventListener("mouseleave", (e) => {
    keys[key] = false;
    btn.classList.remove("pressed");
  });
  
  // Touch events para móviles
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys[key] = true;
    btn.classList.add("pressed");
  });
  
  btn.addEventListener("touchend", (e) => {
    e.preventDefault();
    keys[key] = false;
    btn.classList.remove("pressed");
  });
  
  btn.addEventListener("touchcancel", (e) => {
    keys[key] = false;
    btn.classList.remove("pressed");
  });
});

/* =====================
   GRABACIÓN
===================== */
const recBtn = document.getElementById("recBtn");
const saveBtn = document.getElementById("saveBtn");
const recordingIndicator = document.getElementById("recordingIndicator");
const statusIndicator = document.getElementById("statusIndicator");

recBtn.onclick = () => {
  if (playing) {
    updateStatus("⚠️ Detén la reproducción primero");
    return;
  }
  
  if (recording) {
    updateStatus("⚠️ Ya estás grabando");
    return;
  }
  
  recording = true;
  recordedPath = [];
  recordingStartTime = performance.now();
  recBtn.classList.add("recording");
  recordingIndicator.classList.add("active");
  saveBtn.disabled = false;
  updateStatus("🔴 Grabando... Presiona SAVE cuando termines");
};

saveBtn.onclick = () => {
  if (!recording) {
    updateStatus("⚠️ Presiona REC primero para grabar");
    return;
  }
  
  recording = false;
  recBtn.classList.remove("recording");
  recordingIndicator.classList.remove("active");
  
  if (recordedPath.length > 0) {
    updateStatus(`✅ ¡Guardado! ${recordedPath.length} frames - Presiona PLAY`);
  } else {
    recordedPath = [];
    updateStatus("⚠️ No se grabó ningún movimiento");
  }
};

/* =====================
   PLAYBACK
===================== */
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

playBtn.onclick = () => {
  if (recordedPath.length === 0) {
    updateStatus("⚠️ Primero graba un movimiento");
    return;
  }
  
  if (recording) {
    updateStatus("⚠️ Guarda la grabación primero");
    return;
  }
  
  playing = true;
  playbackStartTime = performance.now();
  lastFrameIndex = 0;
  playBtn.disabled = true;
  pauseBtn.disabled = false;
  updateStatus("▶️ Reproduciendo...");
  
  playRecordedPath();
};

pauseBtn.onclick = () => {
  playing = false;
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  
  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }
  
  updateStatus("⏸️ Pausado");
};

resetBtn.onclick = () => {
  playing = false;
  recording = false;
  recordedPath = [];
  recordingStartTime = 0;
  playbackStartTime = 0;
  
  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }
  
  // Resetear robot a posición inicial
  robot.x = initialRobotState.x;
  robot.y = initialRobotState.y;
  robot.angle = initialRobotState.angle;
  velocity = 0;
  
  // Resetear UI
  recBtn.classList.remove("recording");
  recordingIndicator.classList.remove("active");
  playBtn.disabled = false;
  pauseBtn.disabled = true;
  
  updateStatus("🔄 Reiniciado - Listo para grabar");
};

/* =====================
   REPRODUCCIÓN CON LOOP Y PAUSA
===================== */
let lastFrameIndex = 0;

function playRecordedPath() {
  if (!playing || recordedPath.length === 0) return;
  
  const elapsed = performance.now() - playbackStartTime;
  
  // Buscar el frame correcto
  let currentFrameIndex = lastFrameIndex;
  
  while (currentFrameIndex < recordedPath.length - 1 && 
         recordedPath[currentFrameIndex + 1].time <= elapsed) {
    currentFrameIndex++;
  }
  
  lastFrameIndex = currentFrameIndex;
  
  // Si llegamos al final
  if (currentFrameIndex >= recordedPath.length - 1) {
    const lastFrame = recordedPath[recordedPath.length - 1];
    robot.x = lastFrame.x;
    robot.y = lastFrame.y;
    robot.angle = lastFrame.angle;
    
    updateStatus("⏳ Esperando para repetir...");
    lastFrameIndex = 0;
    playbackTimeout = setTimeout(() => {
      if (playing) {
        playbackStartTime = performance.now();
        updateStatus("▶️ Reproduciendo...");
        playRecordedPath();
      }
    }, 1500);
    return;
  }
  
  // Interpolación entre frames
  const frame1 = recordedPath[currentFrameIndex];
  const frame2 = recordedPath[Math.min(currentFrameIndex + 1, recordedPath.length - 1)];
  
  if (!frame1 || !frame2 || frame2.time === frame1.time) {
    if (frame1) {
      robot.x = frame1.x;
      robot.y = frame1.y;
      robot.angle = frame1.angle;
    }
  } else {
    const t = (elapsed - frame1.time) / (frame2.time - frame1.time);
    const smoothT = Math.min(Math.max(t, 0), 1);
    
    robot.x = frame1.x + (frame2.x - frame1.x) * smoothT;
    robot.y = frame1.y + (frame2.y - frame1.y) * smoothT;
    
    // Interpolar ángulo (camino más corto)
    let angleDiff = frame2.angle - frame1.angle;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    robot.angle = frame1.angle + angleDiff * smoothT;
  }
  
  // Continuar reproducción
  requestAnimationFrame(playRecordedPath);
}

/* =====================
   ACTUALIZAR ESTADO
===================== */
function updateStatus(message) {
  statusIndicator.textContent = message;
}

/* =====================
   TRACK SELECTOR
===================== */
const trackBtn = document.getElementById("trackBtn");
const trackMenu = document.getElementById("trackMenu");
const customTrackInput = document.getElementById("customTrack");
const dropZone = document.getElementById("dropZone");

trackBtn.onclick = () => {
  trackMenu.classList.toggle("active");
};

document.addEventListener("click", (e) => {
  if (!trackBtn.contains(e.target) && !trackMenu.contains(e.target)) {
    trackMenu.classList.remove("active");
  }
});

trackMenu.onclick = (e) => {
  if (e.target.dataset.track) {
    bg.src = e.target.dataset.track;
    trackMenu.classList.remove("active");
    updateStatus(`🎨 Pista cambiada`);
  }
};

customTrackInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    loadCustomTrack(file);
    trackMenu.classList.remove("active");
  }
});

// Drag & Drop functionality
let dragCounter = 0;

scene.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  dropZone.classList.add("active");
});

scene.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    dropZone.classList.remove("active", "drag-over");
  }
});

scene.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

scene.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove("active", "drag-over");
  
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    loadCustomTrack(file);
  } else {
    updateStatus("⚠️ Por favor arrastra solo archivos de imagen");
  }
});

function loadCustomTrack(file) {
  if (!file.type.startsWith("image/")) {
    updateStatus("⚠️ Solo se permiten archivos de imagen");
    return;
  }
  
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    updateStatus("⚠️ La imagen es demasiado grande (máx 10MB)");
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    bg.src = e.target.result;
    updateStatus(`✅ Pista personalizada cargada: ${file.name}`);
  };
  
  reader.onerror = () => {
    updateStatus("❌ Error al cargar la imagen");
  };
  
  reader.readAsDataURL(file);
}

/* =====================
   BOTÓN HOME
===================== */
const homeBtn = document.getElementById("homeButton");
homeBtn.onclick = () => {
  playing = false;
  recording = false;
  
  if (playbackTimeout) {
    clearTimeout(playbackTimeout);
    playbackTimeout = null;
  }
  
  window.location.href = '../index.html';
};

/* =====================
   LOOP PRINCIPAL CON DELTA TIME
===================== */
function loop(currentTime) {
  // Calcular delta time
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  // Normalizar a 60 FPS (para que el movimiento sea consistente)
  const deltaMultiplier = deltaTime / FRAME_DURATION;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (playing) {
    // Durante reproducción, no procesar input
  } else {
    // GIRO SUAVE con delta time
    if (keys["ArrowLeft"]) {
      robot.angle -= TURN_SPEED * deltaMultiplier;
    }
    if (keys["ArrowRight"]) {
      robot.angle += TURN_SPEED * deltaMultiplier;
    }

    // ACELERACIÓN con delta time
    if (keys["ArrowUp"]) {
      velocity = Math.min(velocity + ACCELERATION * deltaMultiplier, MAX_SPEED);
    } else if (keys["ArrowDown"]) {
      velocity = Math.max(velocity - ACCELERATION * deltaMultiplier, -MAX_SPEED / 1.5);
    } else {
      velocity *= Math.pow(FRICTION, deltaMultiplier);
    }

    // MOVIMIENTO con delta time
    const rad = (robot.angle * Math.PI) / 180;
    robot.x += Math.cos(rad) * velocity * deltaMultiplier;
    robot.y += Math.sin(rad) * velocity * deltaMultiplier;

    // LÍMITES DE PANTALLA - Robot puede llegar completamente al borde
    robot.x = Math.max(0, Math.min(canvas.width, robot.x));
    robot.y = Math.max(0, Math.min(canvas.height, robot.y));

    // CORTAR VELOCIDAD AL CHOCAR
    if (robot.x === 0 || robot.x === canvas.width ||
        robot.y === 0 || robot.y === canvas.height) {
      velocity *= 0.5;
    }

    // GRABACIÓN
    if (recording) {
      const currentRecordTime = performance.now() - recordingStartTime;
      
      const shouldRecord = recordedPath.length === 0 || 
        Math.abs(velocity) > 0.01 ||
        keys["ArrowLeft"] || keys["ArrowRight"];
      
      if (shouldRecord) {
        recordedPath.push({
          x: robot.x,
          y: robot.y,
          angle: robot.angle,
          time: currentRecordTime
        });
      }
    }
  }

  // ACTUALIZAR POSICIÓN Y ROTACIÓN DE LA IMAGEN
  robotImg.style.left = (robot.x - ROBOT_SIZE / 2) + "px";
  robotImg.style.top = (robot.y - ROBOT_SIZE / 2) + "px";
  robotImg.style.transform = `rotate(${robot.angle}deg)`;

  requestAnimationFrame(loop);
}

// Actualizar posición inicial cuando cambie el tamaño
window.addEventListener("resize", () => {
  initialRobotState.x = canvas.width / 2;
  initialRobotState.y = canvas.height / 2;
  
  if (!playing && !recording && recordedPath.length === 0) {
    robot.x = initialRobotState.x;
    robot.y = initialRobotState.y;
  }
});

// INICIAR
requestAnimationFrame(loop);
updateStatus("Listo para grabar");