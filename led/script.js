// ═══════════════════════════════════════
//  APPLICATION STATE
// ═══════════════════════════════════════
const state = {
    currentLedColors: { 1:'#9E9E9E', 2:'#9E9E9E', 3:'#9E9E9E', 4:'#9E9E9E', 5:'#9E9E9E' },
    selectedColor: '#F44336',
    customColor:   '#F44336',
    states: [],
    currentStateIndex: 0,
    isPlaying:   false,
    playInterval: null,
    editMode:    false,
    isPainting:  false,
    paintedLeds: new Set()
};

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initializeHomeButton();
    initializeColorPalette();
    initializeColorPaletteMobile();
    initializeCustomColorPicker();
    initializeTools();
    initializeLEDs();
    initializeTimeline();
    initializeModal();
    initializeKeyboard();

    addNewState();
    renderStates();
});

// ───────────────────────────────────────
//  HOME
// ───────────────────────────────────────
function initializeHomeButton() {
    const nav = () => { window.location.href = '../index.html'; };
    document.getElementById('homeButton')?.addEventListener('click', nav);
    document.getElementById('homeButtonMobile')?.addEventListener('click', nav);
}

// ───────────────────────────────────────
//  COLOR PALETTE — DESKTOP
// ───────────────────────────────────────
function initializeColorPalette() {
    document.querySelectorAll('.sidebar-right .color-preset:not(.custom-color-btn)')
        .forEach(btn => btn.addEventListener('click', () => selectColor(btn.dataset.color)));

    const customBtn = document.getElementById('customColorBtn');
    if (customBtn) {
        // Clic simple en desktop: selecciona color (si no viene del lápiz)
        customBtn.addEventListener('click', e => {
            if (!e.target.closest('.edit-custom-color')) selectColor(state.customColor);
        });
    }

    updateCustomColorDisplay();
}

// ───────────────────────────────────────
//  COLOR PALETTE — MOBILE
//  Solo los colores fijos; el custom lo maneja initializeCustomColorPicker
// ───────────────────────────────────────
function initializeColorPaletteMobile() {
    document.querySelectorAll('.color-palette-mobile .color-preset-mobile:not(.custom-color-btn-mobile)')
        .forEach(btn => btn.addEventListener('click', () => selectColor(btn.dataset.color)));

    // ← El botón customColorBtnMobile ya no se gestiona aquí,
    //   sino en initializeCustomColorPicker() para unificar la lógica.
}

// ───────────────────────────────────────
//  SELECT COLOR (sincroniza desktop + mobile)
// ───────────────────────────────────────
function selectColor(color) {
    state.selectedColor = color;

    document.querySelectorAll('.color-preset, .color-preset-mobile').forEach(el => el.classList.remove('selected'));

    document.querySelectorAll(
        `.color-preset[data-color="${color}"], .color-preset-mobile[data-color="${color}"]`
    ).forEach(el => el.classList.add('selected'));

    if (color === state.customColor) {
        document.querySelectorAll('.custom-color-btn, .custom-color-btn-mobile')
            .forEach(el => el.classList.add('selected'));
    }
}

function updateCustomColorDisplay() {
    document.querySelectorAll('.custom-color-display, .custom-color-display-mobile')
        .forEach(el => { el.style.background = state.customColor; });
}

// ───────────────────────────────────────
//  CUSTOM COLOR PICKER
//
//  Desktop:
//    - Clic simple en círculo  → selecciona color
//    - Hover muestra lápiz → clic en lápiz → abre picker
//
//  Móvil / táctil:
//    - 1 toque en círculo      → selecciona color personalizado
//    - 2 toques rápidos (≤350ms) → abre el picker para editar
// ───────────────────────────────────────
function initializeCustomColorPicker() {
    const picker    = document.getElementById('colorPicker');
    const editBtn   = document.getElementById('editCustomColor');
    const customBtn = document.getElementById('customColorBtn');

    // ── Desktop: lápiz abre picker ──
    if (editBtn) {
        editBtn.addEventListener('click', e => {
            e.stopPropagation();
            openColorPicker(customBtn);
        });
    }

    // ── Desktop: doble clic en círculo también abre picker (bonus UX) ──
    if (customBtn) {
        customBtn.addEventListener('dblclick', e => {
            e.preventDefault();
            openColorPicker(customBtn);
        });

        // ── Táctil sobre botón desktop-custom: doble toque abre picker ──
        let lastTouchDesktopCustom = 0;
        customBtn.addEventListener('touchstart', e => {
            const now = Date.now();
            if (now - lastTouchDesktopCustom < 350) {
                // Doble toque → abrir picker
                e.preventDefault();
                openColorPicker(customBtn);
            } else {
                // Primer toque → seleccionar color (se deja el click nativo actuar)
            }
            lastTouchDesktopCustom = now;
        }, { passive: false });
    }

    // ── Móvil: botón custom mobile ──
    const mobileCustom = document.getElementById('customColorBtnMobile');
    if (mobileCustom) {
        // Toque simple → seleccionar color personalizado
        mobileCustom.addEventListener('click', () => {
            selectColor(state.customColor);
        });

        // Doble clic (escritorio con vista mobile) → abre picker
        mobileCustom.addEventListener('dblclick', e => {
            e.preventDefault();
            openColorPicker(mobileCustom);
        });

        // Doble toque táctil → abre picker
        let lastTouchMobile = 0;
        mobileCustom.addEventListener('touchstart', e => {
            const now = Date.now();
            if (now - lastTouchMobile < 350) {
                // Doble toque detectado
                e.preventDefault();
                openColorPicker(mobileCustom);
            }
            // El primer toque deja que el evento 'click' seleccione el color
            lastTouchMobile = now;
        }, { passive: false });
    }

    // ── Picker: actualización en tiempo real mientras se arrastra ──
    picker.addEventListener('input', e => {
        state.customColor = e.target.value;
        updateCustomColorDisplay();
    });

    // ── Picker: confirma color al cerrar ──
    picker.addEventListener('change', e => {
        state.customColor = e.target.value;
        updateCustomColorDisplay();
        selectColor(state.customColor);
        // Mueve el picker fuera de pantalla
        picker.style.left = '-9999px';
        picker.style.top  = '-9999px';
    });

    // ── Picker: al perder foco lo esconde ──
    picker.addEventListener('blur', () => {
        setTimeout(() => {
            picker.style.left = '-9999px';
            picker.style.top  = '-9999px';
        }, 150);
    });
}

// ── Abre el color picker nativo posicionado junto al botón de referencia ──
function openColorPicker(referenceBtn) {
    const picker = document.getElementById('colorPicker');
    const rect   = referenceBtn.getBoundingClientRect();
    const W = window.innerWidth;
    const H = window.innerHeight;

    let left = rect.left - 260;
    let top  = rect.top  - 80;

    // Evita que se salga de la pantalla
    left = Math.max(10, Math.min(left, W - 270));
    top  = Math.max(10, Math.min(top,  H - 380));

    picker.style.left    = left + 'px';
    picker.style.top     = top  + 'px';
    picker.style.width   = '1px';
    picker.style.height  = '1px';
    picker.style.opacity = '0';

    picker.click();
}

// ───────────────────────────────────────
//  LEDS
// ───────────────────────────────────────
function initializeLEDs() {
    const leds = document.querySelectorAll('.led-light');

    leds.forEach(led => {
        const num = () => parseInt(led.dataset.led);

        led.addEventListener('mousedown', () => {
            if (!state.editMode) return;
            state.isPainting = true;
            state.paintedLeds.clear();
            toggleLed(num());
        });
        led.addEventListener('mouseenter', () => {
            if (!state.isPainting || !state.editMode) return;
            if (!state.paintedLeds.has(num())) paintLed(num());
        });

        led.addEventListener('touchstart', e => {
            if (!state.editMode) return;
            e.preventDefault();
            state.isPainting = true;
            state.paintedLeds.clear();
            toggleLed(num());
        }, { passive: false });

        led.addEventListener('touchmove', e => {
            if (!state.isPainting || !state.editMode) return;
            e.preventDefault();
            const t = e.touches[0];
            const el = document.elementFromPoint(t.clientX, t.clientY);
            if (el?.classList.contains('led-light')) {
                const n = parseInt(el.dataset.led);
                if (!state.paintedLeds.has(n)) paintLed(n);
            }
        }, { passive: false });
    });

    const stopPainting = () => {
        if (!state.isPainting) return;
        state.isPainting = false;
        state.paintedLeds.clear();
        updateCurrentState();
    };
    document.addEventListener('mouseup',  stopPainting);
    document.addEventListener('touchend', stopPainting);
}

function toggleLed(n) {
    const cur = state.currentLedColors[n];
    const off = cur === '#9E9E9E' || cur === '#2c2c2c';
    applyColorToLed(n, off ? state.selectedColor : (cur === state.selectedColor ? '#9E9E9E' : state.selectedColor));
    state.paintedLeds.add(n);
}

function paintLed(n) {
    state.paintedLeds.add(n);
    applyColorToLed(n, state.selectedColor);
}

function applyColorToLed(n, color) {
    state.currentLedColors[n] = color;
    updateLEDDisplay();
}

function updateLEDDisplay() {
    for (let i = 1; i <= 5; i++) {
        const led = document.querySelector(`.led-light[data-led="${i}"]`);
        if (!led) continue;
        const color = state.currentLedColors[i];
        const on = color !== '#9E9E9E' && color !== '#2c2c2c' && color !== '#000000';

        led.style.background   = color;
        led.style.borderColor  = on ? color : '#757575';
        led.style.boxShadow    = on
            ? `0 0 15px ${color}, 0 0 25px ${color}, inset 0 1px 3px rgba(0,0,0,.4)`
            : 'inset 0 1px 3px rgba(0,0,0,.4), 0 1px 2px rgba(255,255,255,.1)';
        led.classList.toggle('active', on);
    }
}

// ───────────────────────────────────────
//  TOOLS (Edit / Clear)
// ───────────────────────────────────────
function initializeTools() {
    document.getElementById('editBtn')?.addEventListener('click', toggleEditMode);
    document.getElementById('clearBtn')?.addEventListener('click', clearAllLEDs);
    document.getElementById('editBtnMobile')?.addEventListener('click', toggleEditMode);
    document.getElementById('clearBtnMobile')?.addEventListener('click', clearAllLEDs);
}

function toggleEditMode() {
    state.editMode = !state.editMode;

    ['editBtn', 'editBtnMobile'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.style.background   = state.editMode ? 'var(--primary-blue-light)' : '';
        btn.style.borderColor  = state.editMode ? 'var(--primary-blue)' : '';
    });
}

function clearAllLEDs() {
    if (!state.editMode) return;
    for (let i = 1; i <= 5; i++) applyColorToLed(i, '#9E9E9E');
    updateCurrentState();
}

// ───────────────────────────────────────
//  TIMELINE
// ───────────────────────────────────────
function initializeTimeline() {
    document.getElementById('prevState').addEventListener('click', () => {
        if (state.currentStateIndex > 0) {
            state.currentStateIndex--;
            loadCurrentState();
            renderStates();
        }
        scrollToState(state.currentStateIndex);
    });

    document.getElementById('nextState').addEventListener('click', () => {
        if (state.currentStateIndex < state.states.length - 1) {
            state.currentStateIndex++;
            loadCurrentState();
            renderStates();
        }
        scrollToState(state.currentStateIndex);
    });

    document.getElementById('playBtn').addEventListener('click', togglePlayback);
}

function addNewState() {
    state.states.push({ id: Date.now(), ledColors: { ...state.currentLedColors }, duration: 1.0 });
    state.currentStateIndex = state.states.length - 1;
}

function renderStates() {
    const timeline = document.getElementById('statesTimeline');
    timeline.innerHTML = '';

    state.states.forEach((s, i) => timeline.appendChild(createStateThumbnail(s, i)));

    const addBtn = document.createElement('button');
    addBtn.className = 'add-state-btn';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i><span>New</span>';
    addBtn.addEventListener('click', () => {
        if (!state.editMode) return;
        addNewState();
        renderStates();
        scrollToState(state.states.length - 1);
    });
    timeline.appendChild(addBtn);

    scrollToState(state.currentStateIndex);
}

function createStateThumbnail(stateData, index) {
    const thumb = document.createElement('div');
    thumb.className = 'state-thumbnail' + (index === state.currentStateIndex ? ' active' : '');

    const ledsDiv = document.createElement('div');
    ledsDiv.className = 'state-thumbnail-leds';
    for (let i = 1; i <= 5; i++) {
        const d = document.createElement('div');
        d.className = 'state-thumbnail-led';
        const c = stateData.ledColors[i];
        d.style.background = c;
        if (c !== '#9E9E9E' && c !== '#2c2c2c') d.style.boxShadow = `0 0 4px ${c}`;
        ledsDiv.appendChild(d);
    }

    const info = document.createElement('div');
    info.className = 'state-thumbnail-info';

    const label = document.createElement('div');
    label.className = 'state-thumbnail-label';
    label.textContent = `State ${index + 1}`;

    const timeWrap = document.createElement('div');
    timeWrap.className = 'state-thumbnail-time';
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = '0.1'; inp.step = '0.1'; inp.value = stateData.duration || 1.0;
    inp.addEventListener('click',  e => e.stopPropagation());
    inp.addEventListener('change', e => {
        e.stopPropagation();
        const v = parseFloat(e.target.value);
        stateData.duration = v > 0 ? v : stateData.duration;
        if (!(v > 0)) e.target.value = stateData.duration;
    });
    const sLabel = document.createElement('span');
    sLabel.textContent = 's';
    timeWrap.appendChild(inp); timeWrap.appendChild(sLabel);

    info.appendChild(label); info.appendChild(timeWrap);

    const del = document.createElement('button');
    del.className = 'state-thumbnail-delete';
    del.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    del.addEventListener('click', e => { e.stopPropagation(); if (state.editMode) deleteState(index); });

    thumb.appendChild(ledsDiv);
    thumb.appendChild(info);
    thumb.appendChild(del);

    thumb.addEventListener('click', () => {
        state.currentStateIndex = index;
        loadCurrentState(); renderStates();
    });
    return thumb;
}

function loadCurrentState() {
    const s = state.states[state.currentStateIndex];
    if (s) { state.currentLedColors = { ...s.ledColors }; updateLEDDisplay(); }
}

function updateCurrentState() {
    const s = state.states[state.currentStateIndex];
    if (s) { s.ledColors = { ...state.currentLedColors }; renderStates(); }
}

function deleteState(index) {
    state.states.splice(index, 1);
    if (state.states.length === 0) {
        state.currentLedColors = { 1:'#9E9E9E', 2:'#9E9E9E', 3:'#9E9E9E', 4:'#9E9E9E', 5:'#9E9E9E' };
        addNewState();
    }
    if (state.currentStateIndex >= state.states.length) state.currentStateIndex = state.states.length - 1;
    loadCurrentState(); renderStates();
}

function scrollToState(index) {
    const timeline = document.getElementById('statesTimeline');
    const thumbs   = timeline.querySelectorAll('.state-thumbnail');
    if (thumbs[index]) {
        thumbs[index].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
}

// ───────────────────────────────────────
//  MODAL — Apply time to all
// ───────────────────────────────────────
function initializeModal() {
    const modal = document.getElementById('timeModal');
    document.getElementById('timeAllBtn').addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('cancelTimeBtn').addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('applyTimeBtn').addEventListener('click', () => {
        const t = parseFloat(document.getElementById('globalTimeInput').value);
        if (t > 0) { state.states.forEach(s => s.duration = t); renderStates(); modal.classList.remove('active'); }
    });
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
}

// ───────────────────────────────────────
//  PLAYBACK
// ───────────────────────────────────────
function togglePlayback() { state.isPlaying ? stopPlayback() : startPlayback(); }

function startPlayback() {
    if (!state.states.length) return;
    state.isPlaying = true;
    state.currentStateIndex = 0;
    document.getElementById('playBtn').classList.add('playing');
    document.getElementById('playIcon').style.display  = 'none';
    document.getElementById('pauseIcon').style.display = 'block';
    playSequence();
}

function stopPlayback() {
    state.isPlaying = false;
    clearTimeout(state.playInterval);
    state.playInterval = null;
    document.getElementById('playBtn').classList.remove('playing');
    document.getElementById('playIcon').style.display  = 'block';
    document.getElementById('pauseIcon').style.display = 'none';
}

function playSequence() {
    if (!state.isPlaying) return;
    loadCurrentState(); renderStates();
    const dur = (state.states[state.currentStateIndex].duration || 1) * 1000;
    state.playInterval = setTimeout(() => {
        state.currentStateIndex = (state.currentStateIndex + 1) % state.states.length;
        playSequence();
    }, dur);
}

// ───────────────────────────────────────
//  KEYBOARD SHORTCUTS
// ───────────────────────────────────────
function initializeKeyboard() {
    document.addEventListener('keydown', e => {
        if (e.target.matches('input, textarea')) return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                togglePlayback();
                break;

            case 'ArrowLeft':
                e.preventDefault();
                if (state.currentStateIndex > 0) {
                    state.currentStateIndex--;
                    loadCurrentState(); renderStates();
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (state.currentStateIndex < state.states.length - 1) {
                    state.currentStateIndex++;
                    loadCurrentState(); renderStates();
                }
                break;

            case 'e':
                e.preventDefault();
                toggleEditMode();
                break;

            case 'n':
                e.preventDefault();
                if (state.editMode) { addNewState(); renderStates(); }
                break;

            case 'Delete':
                e.preventDefault();
                if (state.editMode) deleteState(state.currentStateIndex);
                break;

            case '1': case '2': case '3': case '4': case '5':
                if (state.editMode) {
                    e.preventDefault();
                    const n = parseInt(e.key);
                    toggleLed(n);
                    updateCurrentState();
                }
                break;
        }
    });
}

console.log('CyberPi LED Sequencer v5 ✅');
console.log('Atajos: Space=play | ←→=estados | E=edit | N=nuevo | Del=borrar | 1-5=LED');