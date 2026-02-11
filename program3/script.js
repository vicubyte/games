// Application State
const state = {
    currentLedColors: {
        1: '#2c2c2c',
        2: '#2c2c2c',
        3: '#2c2c2c',
        4: '#2c2c2c',
        5: '#2c2c2c'
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
    initializeTools();
    initializeTimeline();
    initializeLEDs();
    initializeHomeButton();
    initializeModal();
    
    // Add first empty state
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

// Color Palette Functions
function initializeColorPalette() {
    const colorPresets = document.querySelectorAll('.color-preset:not(.custom-color-btn)');
    const customColorBtn = document.getElementById('customColorBtn');
    const editCustomColor = document.getElementById('editCustomColor');
    const colorPicker = document.getElementById('colorPicker');
    
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            selectColor(preset.dataset.color, preset);
        });
    });
    
    // Custom color button click (select the custom color)
    customColorBtn.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-custom-color')) {
            selectColor(state.customColor, customColorBtn);
        }
    });
    
    // Edit custom color button
    editCustomColor.addEventListener('click', (e) => {
        e.stopPropagation();
        colorPicker.click();
    });
    
    colorPicker.addEventListener('change', (e) => {
        const color = e.target.value;
        state.customColor = color;
        updateCustomColorDisplay();
        selectColor(color, customColorBtn);
    });
    
    // Initialize custom color display
    updateCustomColorDisplay();
}

function updateCustomColorDisplay() {
    const customColorBtn = document.getElementById('customColorBtn');
    const gradient = customColorBtn.querySelector('.custom-color-gradient');
    gradient.style.background = state.customColor;
}

function selectColor(color, element = null) {
    state.selectedColor = color;
    
    // Remove selected class from all
    document.querySelectorAll('.color-preset').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selected class
    if (element) {
        element.classList.add('selected');
    }
}

// LED Functions with Drag-to-Paint
function initializeLEDs() {
    const leds = document.querySelectorAll('.led-light');
    
    leds.forEach(led => {
        // Mouse events
        led.addEventListener('mousedown', (e) => {
            if (state.editMode) {
                state.isPainting = true;
                state.paintedLeds.clear();
                const ledNumber = parseInt(led.dataset.led);
                paintLed(ledNumber);
            }
        });
        
        led.addEventListener('mouseenter', () => {
            if (state.isPainting && state.editMode) {
                const ledNumber = parseInt(led.dataset.led);
                paintLed(ledNumber);
            }
        });
        
        // Touch events for mobile
        led.addEventListener('touchstart', (e) => {
            if (state.editMode) {
                e.preventDefault();
                state.isPainting = true;
                state.paintedLeds.clear();
                const ledNumber = parseInt(led.dataset.led);
                paintLed(ledNumber);
            }
        });
        
        led.addEventListener('touchmove', (e) => {
            if (state.isPainting && state.editMode) {
                e.preventDefault();
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element && element.classList.contains('led-light')) {
                    const ledNumber = parseInt(element.dataset.led);
                    paintLed(ledNumber);
                }
            }
        });
    });
    
    // Stop painting on mouse up (anywhere)
    document.addEventListener('mouseup', () => {
        if (state.isPainting) {
            state.isPainting = false;
            state.paintedLeds.clear();
            updateCurrentState();
        }
    });
    
    // Stop painting on touch end
    document.addEventListener('touchend', () => {
        if (state.isPainting) {
            state.isPainting = false;
            state.paintedLeds.clear();
            updateCurrentState();
        }
    });
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
            
            if (color !== '#2c2c2c' && color !== '#000000') {
                led.style.boxShadow = `0 0 15px ${color}, 0 0 30px ${color}, inset 0 2px 4px rgba(0, 0, 0, 0.3)`;
                led.classList.add('active');
            } else {
                led.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                led.classList.remove('active');
            }
        }
    }
}

// Tools Functions
function initializeTools() {
    const editBtn = document.getElementById('editBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    
    editBtn.addEventListener('click', toggleEditMode);
    clearBtn.addEventListener('click', clearAllLEDs);
    copyBtn.addEventListener('click', duplicateCurrentState);
}

function toggleEditMode() {
    state.editMode = !state.editMode;
    const editBtn = document.getElementById('editBtn');
    
    if (state.editMode) {
        editBtn.style.background = 'var(--primary-blue-light)';
        editBtn.style.borderColor = 'var(--primary-blue)';
    } else {
        editBtn.style.background = 'var(--bg-white)';
        editBtn.style.borderColor = 'var(--border-color)';
    }
}

function clearAllLEDs() {
    for (let i = 1; i <= 5; i++) {
        applyColorToLed(i, '#2c2c2c');
    }
    updateCurrentState();
}

function duplicateCurrentState() {
    const currentState = state.states[state.currentStateIndex];
    if (!currentState) return;
    
    const newState = {
        id: Date.now(),
        ledColors: { ...currentState.ledColors },
        duration: currentState.duration || 1.0
    };
    
    state.states.splice(state.currentStateIndex + 1, 0, newState);
    state.currentStateIndex++;
    renderStates();
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
    
    // Add "new state" button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-state-btn';
    addBtn.innerHTML = `
        <i class="fa-solid fa-plus"></i>
        <span>Nuevo</span>
    `;
    addBtn.addEventListener('click', () => {
        addNewState();
        renderStates();
        scrollToState(state.states.length - 1);
    });
    timeline.appendChild(addBtn);
    
    // Scroll to current state
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
        if (color !== '#2c2c2c' && color !== '#000000') {
            led.style.boxShadow = `0 0 4px ${color}`;
        }
        ledsContainer.appendChild(led);
    }
    
    const infoContainer = document.createElement('div');
    infoContainer.className = 'state-thumbnail-info';
    
    const label = document.createElement('div');
    label.className = 'state-thumbnail-label';
    label.textContent = `Estado ${index + 1}`;
    
    const timeContainer = document.createElement('div');
    timeContainer.className = 'state-thumbnail-time';
    
    const timeInput = document.createElement('input');
    timeInput.type = 'number';
    timeInput.min = '0.1';
    timeInput.step = '0.1';
    timeInput.value = stateData.duration || 1.0;
    timeInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
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
        alert('Debe haber al menos un estado');
        return;
    }
    
    if (confirm('¿Eliminar este estado?')) {
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
    
    // Close modal on background click
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
        alert('No hay estados para reproducir');
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
    const duration = (currentState.duration || 1.0) * 1000; // Convert to milliseconds
    
    state.playInterval = setTimeout(() => {
        state.currentStateIndex++;
        
        if (state.currentStateIndex >= state.states.length) {
            state.currentStateIndex = 0; // Loop
        }
        
        playSequence();
    }, duration);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space to play/stop
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        togglePlayback();
    }
    
    // Arrow keys to navigate states
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
    
    // E to toggle edit mode
    if (e.key === 'e' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        toggleEditMode();
    }
    
    // N to add new state
    if (e.key === 'n' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        addNewState();
        renderStates();
    }
    
    // Delete to remove current state
    if (e.key === 'Delete' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        deleteState(state.currentStateIndex);
    }
});

console.log('CyberPi LED Sequencer - mBlock Style');
console.log('Atajos de teclado:');
console.log('- Espacio: Play/Pause');
console.log('- Flechas: Navegar estados');
console.log('- E: Activar modo edición');
console.log('- N: Nuevo estado');
console.log('- Delete: Eliminar estado actual');