// Program URLs - CONFIGURACIÓN IMPORTANTE
const programURLs = {
    1: 'path/index.html',  // Motion Builder
    2: 'drive/index.html',  // Free Drive Studio
    3: 'led/index.html'   // LED Animation Lab
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
        card.addEventListener('click', () => {
            navigateToProgram(parseInt(card.dataset.program));
        });

        // Keyboard accessibility
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Program ${card.dataset.program}: ${card.querySelector('.program-title').textContent}`);

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateToProgram(parseInt(card.dataset.program));
            }
        });

        // Ripple effect
        card.addEventListener('click', (e) => createRipple(e, card));
    });
}

// Navigate to selected program
function navigateToProgram(programNumber) {
    const card = document.querySelector(`[data-program="${programNumber}"]`);
    card.classList.add('loading');

    const programURL = programURLs[programNumber];
    if (!programURL) {
        console.error(`No URL configured for program ${programNumber}`);
        card.classList.remove('loading');
        showError(`Program ${programNumber} is not available yet`);
        return;
    }

    setTimeout(() => { window.location.href = programURL; }, 300);
}

// Ripple effect on click
function createRipple(event, element) {
    const ripple = document.createElement('div');
    const rect   = element.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top  - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: rgba(79,195,247,0.3);
        top: ${y}px; left: ${x}px;
        pointer-events: none;
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        z-index: 0;
    `;

    element.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `@keyframes ripple-animation { to { transform: scale(2.5); opacity: 0; } }`;
document.head.appendChild(rippleStyle);

// Logo fallback con animación
function initializeLogoFallback() {
    const logoImage = document.getElementById('logoImage');
    const logoFallback = document.querySelector('.logo-fallback');
    
    if (!logoImage || !logoFallback) return;

    logoImage.addEventListener('error', () => {
        logoImage.classList.add('error');
        logoFallback.style.display = 'block';
        logoFallback.style.animation = 'fadeInUp 0.6s ease-out';
    });

    // Preload check
    if (logoImage.complete && logoImage.naturalHeight === 0) {
        logoImage.classList.add('error');
        logoFallback.style.display = 'block';
    }
}

// Keyboard navigation between cards
function addKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        const cards = Array.from(document.querySelectorAll('.program-card'));
        const idx   = cards.indexOf(document.activeElement);
        if (idx === -1) return;

        let next = idx;
        
        // Desktop: arrow left/right
        if (e.key === 'ArrowRight') { 
            e.preventDefault(); 
            next = (idx + 1) % cards.length; 
        }
        if (e.key === 'ArrowLeft') { 
            e.preventDefault(); 
            next = (idx - 1 + cards.length) % cards.length; 
        }
        
        // Mobile vertical: arrow up/down
        if (window.matchMedia('(orientation: portrait)').matches) {
            if (e.key === 'ArrowDown') { 
                e.preventDefault(); 
                next = (idx + 1) % cards.length; 
            }
            if (e.key === 'ArrowUp') { 
                e.preventDefault(); 
                next = (idx - 1 + cards.length) % cards.length; 
            }
        }
        
        cards[next].focus();
    });

    // Número directo (1, 2, 3)
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea')) return;
        
        const num = parseInt(e.key);
        if (num >= 1 && num <= 3 && programURLs[num]) {
            e.preventDefault();
            navigateToProgram(num);
        }
    });
}

// Staggered animation delays
function addAnimationDelays() {
    document.querySelectorAll('.program-card').forEach((card, i) => {
        card.style.animationDelay = `${0.1 * (i + 1)}s`;
    });
}

// Error toast mejorado
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px;
        background: linear-gradient(135deg, #ff5252, #f44336);
        color: white;
        padding: 16px 24px; 
        border-radius: 14px;
        box-shadow: 0 6px 20px rgba(255,82,82,.4);
        font-weight: 600; 
        font-size: 0.95rem;
        z-index: 2000;
        animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 90vw;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

const errorStyle = document.createElement('style');
errorStyle.textContent = `
    @keyframes slideInRight  { 
        from { transform: translateX(120%); opacity: 0; } 
        to { transform: translateX(0); opacity: 1; } 
    }
    @keyframes slideOutRight { 
        from { transform: translateX(0); opacity: 1; } 
        to { transform: translateX(120%); opacity: 0; } 
    }
`;
document.head.appendChild(errorStyle);

// Debug info
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎮 VicubyteGames Suite - Landing Page');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Initialized successfully');
console.log('📦 Programs configured:', programURLs);
console.log('🎯 Keyboard shortcuts:');
console.log('   • 1, 2, 3: Quick navigate');
console.log('   • ←→: Navigate cards (landscape)');
console.log('   • ↑↓: Navigate cards (portrait)');
console.log('   • Enter/Space: Select card');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Global API
window.cyberpiSuite = { 
    navigateToProgram, 
    programURLs,
    version: '2.0'
};