// Application State
const state = {
    currentLedColors: {
        1: '#9E9E9E',
        2: '#9E9E9E',
        3: '#9E9E9E',
        4: '#9E9E9E',
        5: '#9E9E9E'
    },
    selectedColor: '#F44336',
    customColor: '#F44336',
    states: [],
    currentStateIndex: 0,
    isPlaying: false,
    playInterval: null,
    editMode: false,
    isPainting: false,
    paintedLeds: new Set()
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeColorPalette();
    initializeColorPaletteMobile();
    initializeTools();
    initializeTimeline();
    initializeLEDs();
    initializeHomeButton();
    initializeModal();
    initializeCustomColorPicker();
    
    addNewState();
    renderStates();
});

// Home Button
function initializeHomeButton() {
    const homeBtn = document.getElementById('homeButton');
    homeBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}

// ⭐ Color Picker - Toggle + Posicionado responsivo ⭐
function initializeCustomColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    const editCustomColor = document.getElementById('editCustomColor');
    const customColorBtn = document.getElementById('customColorBtn');
    let isPickerOpen = false;
    
    if (editCustomColor) {
        editCustomColor.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (!isPickerOpen) {
                // ✅ Posicionar el input para que el selector aparezca al lado izquierdo
                const rect = customColorBtn.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // Calcular posición óptima (al lado izquierdo sin cubrir colores)
                let left = rect.left - 350; // 350px a la izquierda (ancho del selector nativo)
                let top = rect.top;
                
                // Ajustar si se sale por la izquierda
                if (left < 10) {
                    left = 10; // Pegado al borde izquierdo con margen
                }
                
                // Ajustar si se sale por la derecha
                if (left + 350 > viewportWidth - 10) {
                    left = Math.max(10, viewportWidth - 360);
                }
                
                // Ajustar verticalmente si se sale
                if (top + 400 > viewportHeight) {
                    top = Math.max(10, viewportHeight - 410);
                }
                
                if (top < 10) {
                    top = 10;
                }
                
                // Aplicar posición al input
                colorPicker.style.left = left + 'px';
                colorPicker.style.top = top + 'px';
                
                // Abrir el selector
                setTimeout(() => {
                    colorPicker.click();
                }, 10);
                isPickerOpen = true;
            } else {
                // ✅ Cerrar: mover el input fuera de vista
                colorPicker.style.left = '-9999px';
                colorPicker.style.top = '-9999px';
                isPickerOpen = false;
            }
        });
    }
    
    // Detectar cuando se cierra el selector
    colorPicker.addEventListener('blur', () => {
        setTimeout(() => {
            colorPicker.style.left = '-9999px';
            colorPicker.style.top = '-9999px';
            isPickerOpen = false;
        }, 100);
    });
    
    colorPicker.addEventListener('change', (e) => {
        const color = e.target.value;
        state.customColor = color;
        updateCustomColorDisplay();
        selectColor(color);
        // Mover fuera de vista
        colorPicker.style.left = '-9999px';
        colorPicker.style.top = '-9999px';
        isPickerOpen = false;
    });
    
    // Cancelar también cierra
    colorPicker.addEventListener('cancel', () => {
        colorPicker.style.left = '-9999px';
        colorPicker.style.top = '-9999px';
        isPickerOpen = false;
    });
    
    colorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        state.customColor = color;
        updateCustomColorDisplay();
    });
}

// Color Palette Functions
function initializeColorPalette() {
    const colorPresets = document.querySelectorAll('.sidebar-right .color-preset:not(.custom-color-btn)');
    const customColorBtn = document.getElementById('customColorBtn');
    const colorPicker = document.getElementById('colorPicker');
    
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            selectColor(preset.dataset.color);
        });
    });
    
    // Custom color button - seleccionar el color actual
    if (customColorBtn) {
        customColorBtn.addEventListener('click', (e) => {
            if (!e.target.closest('.edit-custom-color')) {
                selectColor(state.customColor);
            }
        });
    }
    
    updateCustomColorDisplay();
}

function updateCustomColorDisplay() {
    const displays = document.querySelectorAll('.custom-color-display, .custom-color-display-mobile');
    displays.forEach(display => {
        display.style.background = state.customColor;
    });
}

function selectColor(color) {
    state.selectedColor = color;
    
    // Remove selected from all (desktop and mobile)
    document.querySelectorAll('.color-preset, .color-preset-mobile').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selected to matching color
    document.querySelectorAll(`.color-preset[data-color="${color}"], .color-preset-mobile[data-color="${color}"]`).forEach(el => {
        el.classList.add('selected');
    });
    
    // If custom color, select custom button
    if (color === state.customColor) {
        document.querySelectorAll('.custom-color-btn, .custom-color-btn-mobile').forEach(el => {
            el.classList.add('selected');
        });
    }
}

// Color Palette Mobile
function initializeColorPaletteMobile() {
    const colorPresetsMobile = document.querySelectorAll('.color-palette-mobile .color-preset-mobile:not(.custom-color-btn-mobile)');
    const customColorBtnMobile = document.getElementById('customColorBtnMobile');
    const colorPicker = document.getElementById('colorPicker');
    
    colorPresetsMobile.forEach(preset => {
        preset.addEventListener('click', () => {
            selectColor(preset.dataset.color);
        });
    });
    
    if (customColorBtnMobile) {
        customColorBtnMobile.addEventListener('click', () => {
            colorPicker.click();
        });
    }
}

// LED Functions
function initializeLEDs() {
    const leds = document.querySelectorAll('.led-light');
    
    leds.forEach(led => {
        led.addEventListener('mousedown', (e) => {
            if (state.editMode) {
                state.isPainting = true;
                state.paintedLeds.clear();
                const ledNumber = parseInt(led.dataset.led);
                toggleLed(ledNumber);
            }
        });
        
        led.addEventListener('mouseenter', () => {
            if (state.isPainting && state.editMode) {
                const ledNumber = parseInt(led.dataset.led);
                if (!state.paintedLeds.has(ledNumber)) {
                    paintLed(ledNumber);
                }
            }
        });
        
        led.addEventListener('touchstart', (e) => {
            if (state.editMode) {
                e.preventDefault();
                state.isPainting = true;
                state.paintedLeds.clear();
                const ledNumber = parseInt(led.dataset.led);
                toggleLed(ledNumber);
            }
        });
        
        led.addEventListener('touchmove', (e) => {
            if (state.isPainting && state.editMode) {
                e.preventDefault();
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element && element.classList.contains('led-light')) {
                    const ledNumber = parseInt(element.dataset.led);
                    if (!state.paintedLeds.has(ledNumber)) {
                        paintLed(ledNumber);
                    }
                }
            }
        });
    });
    
    document.addEventListener('mouseup', () => {
        if (state.isPainting) {
            state.isPainting = false;
            state.paintedLeds.clear();
            updateCurrentState();
        }
    });
    
    document.addEventListener('touchend', () => {
        if (state.isPainting) {
            state.isPainting = false;
            state.paintedLeds.clear();
            updateCurrentState();
        }
    });
}

function toggleLed(ledNumber) {
    const currentColor = state.currentLedColors[ledNumber];
    
    if (currentColor === '#9E9E9E' || currentColor === '#2c2c2c') {
        applyColorToLed(ledNumber, state.selectedColor);
    } else if (currentColor === state.selectedColor) {
        applyColorToLed(ledNumber, '#9E9E9E');
    } else {
        applyColorToLed(ledNumber, state.selectedColor);
    }
    
    state.paintedLeds.add(ledNumber);
}

function paintLed(ledNumber) {
    if (!state.paintedLeds.has(ledNumber)) {
        state.paintedLeds.add(ledNumber);
        applyColorToLed(ledNumber, state.selectedColor);
    }
}

function applyColorToLed(ledNumber, color) {
    state.currentLedColors[ledNumber] = color;
    updateLEDDisplay();
}

function updateLEDDisplay() {
    for (let i = 1; i <= 5; i++) {
        const led = document.querySelector(`.led-light[data-led="${i}"]`);
        if (led) {
            const color = state.currentLedColors[i];
            led.style.background = color;
            
            if (color !== '#9E9E9E' && color !== '#2c2c2c' && color !== '#000000') {
                // LED encendido - fondo del color + borde del mismo color
                led.style.borderColor = color; // ✅ BORDE DEL MISMO COLOR
                led.style.boxShadow = `0 0 15px ${color}, 0 0 25px ${color}, inset 0 1px 3px rgba(0, 0, 0, 0.4)`;
                led.classList.add('active');
            } else {
                // LED apagado - gris
                led.style.borderColor = '#757575';
                led.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(255, 255, 255, 0.1)';
                led.classList.remove('active');
            }
        }
    }
}

// Tools Functions
function initializeTools() {
    const editBtn = document.getElementById('editBtn');
    const clearBtn = document.getElementById('clearBtn');
    const editBtnMobile = document.getElementById('editBtnMobile');
    const clearBtnMobile = document.getElementById('clearBtnMobile');
    
    if (editBtn) editBtn.addEventListener('click', toggleEditMode);
    if (clearBtn) clearBtn.addEventListener('click', clearAllLEDs);
    if (editBtnMobile) editBtnMobile.addEventListener('click', toggleEditMode);
    if (clearBtnMobile) clearBtnMobile.addEventListener('click', clearAllLEDs);
}

function toggleEditMode() {
    state.editMode = !state.editMode;
    
    const editBtns = [
        document.getElementById('editBtn'),
        document.getElementById('editBtnMobile')
    ];
    
    editBtns.forEach(btn => {
        if (!btn) return;
        
        if (state.editMode) {
            btn.style.background = 'var(--primary-blue-light)';
            btn.style.borderColor = 'var(--primary-blue)';
        } else {
            btn.style.background = '';
            btn.style.borderColor = '';
        }
    });
}

function clearAllLEDs() {
    for (let i = 1; i <= 5; i++) {
        applyColorToLed(i, '#9E9E9E');
    }
    updateCurrentState();
}

// Timeline Functions
function initializeTimeline() {
    const prevBtn = document.getElementById('prevState');
    const nextBtn = document.getElementById('nextState');
    const playBtn = document.getElementById('playBtn');
    
    prevBtn.addEventListener('click', () => {
        if (state.currentStateIndex > 0) {
            state.currentStateIndex--;
            loadCurrentState();
            renderStates();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (state.currentStateIndex < state.states.length - 1) {
            state.currentStateIndex++;
            loadCurrentState();
            renderStates();
        }
    });
    
    playBtn.addEventListener('click', togglePlayback);
}

function addNewState() {
    const newState = {
        id: Date.now(),
        ledColors: { ...state.currentLedColors },
        duration: 1.0
    };
    
    state.states.push(newState);
    state.currentStateIndex = state.states.length - 1;
}

function renderStates() {
    const timeline = document.getElementById('statesTimeline');
    timeline.innerHTML = '';
    
    state.states.forEach((stateData, index) => {
        const thumbnail = createStateThumbnail(stateData, index);
        timeline.appendChild(thumbnail);
    });
    
    const addBtn = document.createElement('button');
    addBtn.className = 'add-state-btn';
    addBtn.innerHTML = `
        <i class="fa-solid fa-plus"></i>
        <span>New</span>
    `;
    addBtn.addEventListener('click', () => {
        addNewState();
        renderStates();
        scrollToState(state.states.length - 1);
    });
    timeline.appendChild(addBtn);
    
    scrollToState(state.currentStateIndex);
}

function createStateThumbnail(stateData, index) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'state-thumbnail';
    if (index === state.currentStateIndex) {
        thumbnail.classList.add('active');
    }
    
    const ledsContainer = document.createElement('div');
    ledsContainer.className = 'state-thumbnail-leds';
    
    for (let i = 1; i <= 5; i++) {
        const led = document.createElement('div');
        led.className = 'state-thumbnail-led';
        const color = stateData.ledColors[i];
        led.style.background = color;
        if (color !== '#9E9E9E' && color !== '#2c2c2c' && color !== '#000000') {
            led.style.boxShadow = `0 0 4px ${color}`;
        }
        ledsContainer.appendChild(led);
    }
    
    const infoContainer = document.createElement('div');
    infoContainer.className = 'state-thumbnail-info';
    
    const label = document.createElement('div');
    label.className = 'state-thumbnail-label';
    label.textContent = `State ${index + 1}`;
    
    const timeContainer = document.createElement('div');
    timeContainer.className = 'state-thumbnail-time';
    
    const timeInput = document.createElement('input');
    timeInput.type = 'number';
    timeInput.min = '0.1';
    timeInput.step = '0.1';
    timeInput.value = stateData.duration || 1.0;
    timeInput.addEventListener('click', (e) => e.stopPropagation());
    timeInput.addEventListener('change', (e) => {
        e.stopPropagation();
        const newDuration = parseFloat(e.target.value);
        if (newDuration > 0) {
            stateData.duration = newDuration;
        } else {
            e.target.value = stateData.duration;
        }
    });
    
    const timeLabel = document.createElement('span');
    timeLabel.textContent = 's';
    
    timeContainer.appendChild(timeInput);
    timeContainer.appendChild(timeLabel);
    
    infoContainer.appendChild(label);
    infoContainer.appendChild(timeContainer);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'state-thumbnail-delete';
    deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteState(index);
    });
    
    thumbnail.appendChild(ledsContainer);
    thumbnail.appendChild(infoContainer);
    thumbnail.appendChild(deleteBtn);
    
    thumbnail.addEventListener('click', () => {
        state.currentStateIndex = index;
        loadCurrentState();
        renderStates();
    });
    
    return thumbnail;
}

function loadCurrentState() {
    const currentState = state.states[state.currentStateIndex];
    if (currentState) {
        state.currentLedColors = { ...currentState.ledColors };
        updateLEDDisplay();
    }
}

function updateCurrentState() {
    const currentState = state.states[state.currentStateIndex];
    if (currentState) {
        currentState.ledColors = { ...state.currentLedColors };
        renderStates();
    }
}

function deleteState(index) {
    if (state.states.length === 1) {
        alert('There must be at least one state');
        return;
    }
    
    if (confirm('Delete this state?')) {
        state.states.splice(index, 1);
        
        if (state.currentStateIndex >= state.states.length) {
            state.currentStateIndex = state.states.length - 1;
        }
        
        loadCurrentState();
        renderStates();
    }
}

function scrollToState(index) {
    const timeline = document.getElementById('statesTimeline');
    const thumbnails = timeline.querySelectorAll('.state-thumbnail');
    
    if (thumbnails[index]) {
        thumbnails[index].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'center'
        });
    }
}

// Modal Functions
function initializeModal() {
    const timeAllBtn = document.getElementById('timeAllBtn');
    const modal = document.getElementById('timeModal');
    const cancelBtn = document.getElementById('cancelTimeBtn');
    const applyBtn = document.getElementById('applyTimeBtn');
    
    timeAllBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    applyBtn.addEventListener('click', () => {
        const input = document.getElementById('globalTimeInput');
        const time = parseFloat(input.value);
        if (time > 0) {
            applyTimeToAll(time);
            modal.classList.remove('active');
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function applyTimeToAll(duration) {
    state.states.forEach(stateData => {
        stateData.duration = duration;
    });
    renderStates();
}

// Playback Functions
function togglePlayback() {
    if (state.isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    if (state.states.length === 0) {
        alert('No states to play');
        return;
    }
    
    state.isPlaying = true;
    state.currentStateIndex = 0;
    
    const playBtn = document.getElementById('playBtn');
    playBtn.classList.add('playing');
    
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    
    playSequence();
}

function stopPlayback() {
    state.isPlaying = false;
    
    if (state.playInterval) {
        clearTimeout(state.playInterval);
        state.playInterval = null;
    }
    
    const playBtn = document.getElementById('playBtn');
    playBtn.classList.remove('playing');
    
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
}

async function playSequence() {
    if (!state.isPlaying) return;
    
    loadCurrentState();
    renderStates();
    
    const currentState = state.states[state.currentStateIndex];
    const duration = (currentState.duration || 1.0) * 1000;
    
    state.playInterval = setTimeout(() => {
        state.currentStateIndex++;
        
        if (state.currentStateIndex >= state.states.length) {
            state.currentStateIndex = 0;
        }
        
        playSequence();
    }, duration);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        togglePlayback();
    }
    
    if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (state.currentStateIndex > 0) {
            state.currentStateIndex--;
            loadCurrentState();
            renderStates();
        }
    }
    
    if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        if (state.currentStateIndex < state.states.length - 1) {
            state.currentStateIndex++;
            loadCurrentState();
            renderStates();
        }
    }
    
    if (e.key === 'e' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        toggleEditMode();
    }
    
    if (e.key === 'n' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        addNewState();
        renderStates();
    }
    
    if (e.key === 'Delete' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        deleteState(state.currentStateIndex);
    }
});

console.log('✅ CyberPi LED Sequencer - Version with improved LEDs and color picker');