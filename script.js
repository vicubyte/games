// Program URLs - CONFIGURACIÓN IMPORTANTE
const programURLs = {
    1: 'program1/index.html',  // LED Sequencer
    2: 'program2/index.html',  // Pattern Designer  
    3: 'program3/index.html'   // Animation Studio
};

// Initialize the landing page
document.addEventListener('DOMContentLoaded', () => {
    initializeProgramCards();
    initializeLogoFallback();
    addKeyboardNavigation();
    addAnimationDelays();
});

// Initialize program cards with click handlers
function initializeProgramCards() {
    const programCards = document.querySelectorAll('.program-card');
    
    programCards.forEach(card => {
        // Click handler
        card.addEventListener('click', () => {
            const programNumber = parseInt(card.dataset.program);
            navigateToProgram(programNumber);
        });
        
        // Keyboard accessibility
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Programa ${card.dataset.program}: ${card.querySelector('.program-title').textContent}`);
        
        // Enter/Space key handler
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const programNumber = parseInt(card.dataset.program);
                navigateToProgram(programNumber);
            }
        });
        
        // Add ripple effect on click
        card.addEventListener('click', (e) => {
            createRipple(e, card);
        });
    });
}

// Navigate to selected program
function navigateToProgram(programNumber) {
    const card = document.querySelector(`[data-program="${programNumber}"]`);
    
    // Add loading state
    card.classList.add('loading');
    
    // Get the URL for the program
    const programURL = programURLs[programNumber];
    
    if (!programURL) {
        console.error(`No URL configured for program ${programNumber}`);
        card.classList.remove('loading');
        showError(`Programa ${programNumber} no está disponible aún`);
        return;
    }
    
    // Add slight delay for visual feedback
    setTimeout(() => {
        // Navigate to the program
        window.location.href = programURL;
    }, 300);
}

// Create ripple effect on click
function createRipple(event, element) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: rgba(79, 195, 247, 0.3);
        top: ${y}px;
        left: ${x}px;
        pointer-events: none;
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        z-index: 0;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}

// Add ripple animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Logo fallback if image doesn't load
function initializeLogoFallback() {
    const logoImage = document.getElementById('logoImage');
    
    if (!logoImage) return;
    
    logoImage.addEventListener('error', () => {
        logoImage.classList.add('error');
        
        // Create fallback text
        const fallback = document.createElement('h1');
        fallback.className = 'logo-fallback';
        fallback.textContent = 'CyberPi Suite';
        
        logoImage.parentElement.appendChild(fallback);
    });
}

// Keyboard navigation between cards
function addKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        const programCards = Array.from(document.querySelectorAll('.program-card'));
        const activeElement = document.activeElement;
        const currentIndex = programCards.indexOf(activeElement);
        
        if (currentIndex === -1) return;
        
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = (currentIndex + 1) % programCards.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = (currentIndex - 1 + programCards.length) % programCards.length;
                break;
            default:
                return;
        }
        
        programCards[newIndex].focus();
    });
}

// Add staggered animation delays
function addAnimationDelays() {
    const cards = document.querySelectorAll('.program-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${0.1 * (index + 1)}s`;
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff5252;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        font-weight: 500;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

// Add error animations
const errorStyle = document.createElement('style');
errorStyle.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(errorStyle);

// Add hover sound effect (optional - can be commented out)
function addHoverSounds() {
    const cards = document.querySelectorAll('.program-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Uncomment to add hover sound
            // const audio = new Audio('hover-sound.mp3');
            // audio.volume = 0.2;
            // audio.play().catch(e => console.log('Audio play failed:', e));
        });
    });
}

// Log initialization
console.log('CyberPi Suite - Landing Page Initialized');
console.log('Programs configured:', programURLs);
console.log('Keyboard navigation: Arrow keys to navigate, Enter/Space to select');

// Export for debugging
window.cyberpiSuite = {
    navigateToProgram,
    programURLs
};