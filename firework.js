/**
 * Firework Animation System
 * Provides particle effects and firework animations for the LetMeTryAI application
 */

/**
 * Extracts URL parameter value by name
 * @param {string} name - The parameter name to extract
 * @returns {string} The decoded parameter value or empty string if not found
 */
function getUrlParameter(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }
    
    const escapedName = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + escapedName + '=([^&#]*)');
    const results = regex.exec(location.search);
    
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Particle class for firework explosion effects
 */
class Particle {
    /**
     * Creates a new particle
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {string} color - RGB color string (e.g., "255, 0, 0")
     */
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        
        // Reduced velocity for more controlled animation
        this.velocity = {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2
        };
        
        this.alpha = 1;
        this.friction = 0.98; // Higher friction for slower decay
        this.gravity = 0.01;  // Lower gravity for floating effect
    }

    /**
     * Renders the particle on the canvas
     */
    draw() {
        if (!ctx) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.fill();
    }

    /**
     * Updates particle position and properties
     */
    update() {
        // Apply physics
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity;
        
        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Fade out slowly
        this.alpha -= 0.005;
    }
}


/**
 * Firework class for animated firework effects
 */
class Firework {
    /**
     * Creates a new firework
     * @param {number} startX - Starting x position
     * @param {number} targetX - Target x position for explosion
     * @param {number} targetY - Target y position for explosion
     * @param {string} fireworkString - Text to display with the firework
     */
    constructor(startX, targetX, targetY, fireworkString = 'test') {
        // Validate canvas exists
        if (!canvas) {
            console.error('Canvas not initialized for firework');
            return;
        }

        // Position and target
        this.x = startX;
        this.y = canvas.height;
        this.targetX = targetX;
        this.targetY = targetY;
        
        // Display properties
        this.fireworkString = fireworkString || 'test';
        this.textAlpha = 1;
        this.showText = true;
        
        // Explosion properties
        this.explosionX = targetX;
        this.explosionY = targetY;
        
        // Movement properties
        this.speed = 2; // Controlled launch speed
        this.angle = Math.atan2(targetY - this.y, targetX - startX);
        this.velocity = {
            x: Math.cos(this.angle) * this.speed,
            y: Math.sin(this.angle) * this.speed
        };
        
        // Visual properties
        this.particles = [];
        this.color = this._generateRandomColor();
    }

    /**
     * Generates a random RGB color string
     * @private
     * @returns {string} RGB color values as comma-separated string
     */
    _generateRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `${r}, ${g}, ${b}`;
    }

    /**
     * Renders the firework on the canvas
     */
    draw() {
        if (!ctx) return;

        // Draw firework trail
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.velocity.x, this.y - this.velocity.y);
        ctx.strokeStyle = `rgb(${this.color})`;
        ctx.lineWidth = 8;
        ctx.stroke();

        // Draw text overlay if active
        this._drawText();
    }

    /**
     * Draws the firework text overlay
     * @private
     */
    _drawText() {
        if (!this.showText || this.textAlpha <= 0) return;

        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.textAlpha})`;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.fireworkString, this.explosionX, this.explosionY);
        
        // Fade out text slowly
        this.textAlpha -= 0.002;
        ctx.restore();
    }

    /**
     * Updates firework position
     */
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    /**
     * Generates points along a heart shape
     * @private
     * @param {number} pointCount - Number of points to generate
     * @returns {Array<{x: number, y: number}>} Array of heart shape points
     */
    _generateHeartShape(pointCount) {
        const heartPoints = [];
        
        for (let i = 0; i < pointCount; i++) {
            const t = (i / pointCount) * Math.PI * 2;
            // Heart shape parametric equations
            const x = 8 * Math.pow(Math.sin(t), 3);
            const y = 6.5 * Math.cos(t) - 2.5 * Math.cos(2*t) - 1 * Math.cos(3*t) - 0.5 * Math.cos(4*t);
            heartPoints.push({x: x, y: y});
        }
        
        return heartPoints;
    }

    /**
     * Creates an explosion effect at the firework's current position
     */
    explode() {
        // Store explosion coordinates
        this.explosionX = this.x;
        this.explosionY = this.y;
        
        const particleCount = 300;
        const heartPoints = this._generateHeartShape(particleCount);

        // Create particles along heart shape
        for (let i = 0; i < particleCount; i++) {
            const scale = 0.1 + Math.random() * 0.2;
            const particle = new Particle(this.x, this.y, this.color);
            const point = heartPoints[i];
            
            // Scale and randomize the velocity based on heart shape
            particle.velocity.x = point.x * scale;
            particle.velocity.y = -point.y * scale;  // Negative to flip heart right side up
            
            // Add some randomness to make it more natural
            particle.velocity.x += (Math.random() - 0.5) * 0.5;
            particle.velocity.y += (Math.random() - 0.5) * 0.5;
            
            particle.gravity = 0.01;
            particle.friction = 0.98;
            this.particles.push(particle);
        }
        
        // Play explosion sound if available
        this._playExplosionSound();

        // Add text display
        this.showText = true;
        setTimeout(() => {
            this.showText = false;
        }, 10000); // Show text for 10 seconds

        // Add sparkle effect around heart shape
        this._addSparkleEffect();
    }

    /**
     * Plays explosion sound effect
     * @private
     */
    _playExplosionSound() {
        try {
            if (typeof explosionSound !== 'undefined' && explosionSound) {
                explosionSound.currentTime = 0;
                explosionSound.play();
            }
        } catch (error) {
            console.warn('Could not play explosion sound:', error);
        }
    }

    /**
     * Adds sparkle particles around the explosion
     * @private
     */
    _addSparkleEffect() {
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random();
            const particle = new Particle(this.x, this.y, this.color);
            
            particle.velocity.x = Math.cos(angle) * speed;
            particle.velocity.y = Math.sin(angle) * speed;
            particle.gravity = 0.005;
            particle.friction = 0.995;
            particle.alpha = 0.1;
            
            this.particles.push(particle);
        }
    }
}

/**
 * Utility Functions for Firework Animation
 */

/**
 * Sets the canvas size to match the window dimensions
 */
function setCanvasSize() {
    if (!canvas) {
        console.error('Canvas not initialized');
        return;
    }
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

/**
 * Gets the current city based on IP geolocation
 * @returns {Promise<string>} The current city name or fallback
 */
async function getCurrentCity() {
    try {
        const response = await fetch('https://api.ipapi.is/');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Location data:', data);
        
        return data.location?.city || '未知城市';
    } catch (error) {
        console.error('Error getting location:', error);
        return '未知城市';
    }
}

/**
 * Generates a UUID v4 string
 * @returns {string} A unique identifier string
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Main animation loop for fireworks and particles
 */
function animate() {
    if (!ctx || !canvas) {
        console.error('Canvas or context not initialized');
        return;
    }

    requestAnimationFrame(animate);
    
    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const fireworks = window.fireworks || [];
    
    // Update and draw fireworks
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const firework = fireworks[i];
        
        if (!firework) continue;
        
        firework.draw();
        firework.update();

        // Check if firework reached target
        const distance = Math.hypot(
            firework.x - firework.targetX,
            firework.y - firework.targetY
        );

        if (distance < 5) {
            firework.explode();
            particles = particles.concat(firework.particles);
            fireworks.splice(i, 1);
        }
    }

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        if (!particle) continue;
        
        particle.draw();
        particle.update();

        // Remove faded particles
        if (particle.alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    // Draw scrolling text
    _drawScrollingText();
}

/**
 * Draws scrolling text on the canvas
 * @private
 */
function _drawScrollingText() {
    if (!ctx || !canvas || !window.texts) return;

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = window.texts[currentTextIndex] || '';
    ctx.fillText(text, canvas.width / 2, textY);

    // Update text position
    textY += 1;
    if (textY > canvas.height) {
        textY = -20;
        currentTextIndex = (currentTextIndex + 1) % window.texts.length;
    }
}


/**
 * Global Variables
 */
let canvas;
let ctx;
let particles = [];
let currentTextIndex = 0;
let textY;

/**
 * Application Initialization
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

/**
 * Initializes the firework application
 */
function initializeApplication() {
    try {
        // Initialize global variables
        window.configId = getUrlParameter('configId');
        window.fireworks = [];
        window.texts = ["点击屏幕有惊喜"];
        
        // Initialize audio
        initializeAudio();
        
        // Setup canvas
        initializeCanvas();
        
        // Setup event handlers
        setupEventHandlers();
        
        // Start animation
        animate();
        
        // Load initial configuration and data
        loadInitialData();
        
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

/**
 * Initializes audio elements
 */
function initializeAudio() {
    try {
        window.fireworkSound = new Audio('launch.wav');
        window.explosionSound = new Audio('explode.wav');
        
        // Set audio properties
        window.fireworkSound.volume = 0.3;
        window.explosionSound.volume = 0.5;
    } catch (error) {
        console.warn('Error initializing audio:', error);
    }
}

/**
 * Initializes canvas and context
 */
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    
    if (!canvas) {
        throw new Error('Canvas element not found');
    }
    
    ctx = canvas.getContext('2d');
    textY = canvas.height / 2;
    
    // Set initial canvas size
    setCanvasSize();
    
    // Handle window resize
    window.addEventListener('resize', setCanvasSize);
}

/**
 * Sets up event handlers for user interaction
 */
function setupEventHandlers() {
    if (!canvas) return;

    canvas.addEventListener('click', async (e) => {
        try {
            await handleCanvasClick(e);
        } catch (error) {
            console.error('Error handling canvas click:', error);
        }
    });
}

/**
 * Handles canvas click events
 * @param {MouseEvent} e - The click event
 */
async function handleCanvasClick(e) {
    const startX = canvas.width * Math.random();
    const currentCity = window.currentCity || '未知城市';
    
    // Create new firework
    const firework = new Firework(startX, e.clientX, e.clientY, currentCity);
    window.fireworks.push(firework);
    
    // Play launch sound
    playFireworkSound();
    
    // Upload firework data
    const fireworkId = generateUUID();
    uploadFirework(fireworkId, 0, e.clientX, e.clientY, currentCity);
}

/**
 * Plays firework launch sound
 */
function playFireworkSound() {
    try {
        if (window.fireworkSound) {
            window.fireworkSound.currentTime = 0;
            window.fireworkSound.play().catch(error => {
                console.warn('Could not play firework sound:', error);
            });
        }
    } catch (error) {
        console.warn('Error playing firework sound:', error);
    }
}
/**
 * Loads initial application data and configuration
 */
async function loadInitialData() {
    try {
        // Load current city
        window.currentCity = await getCurrentCity();
        console.log("Current city:", window.currentCity);
        
        // Load configuration
        await loadConfiguration();
        
        // Setup periodic firework downloads
        setupPeriodicDownloads();
        
        // Load initial fireworks
        await loadInitialFireworks();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

/**
 * Loads application configuration
 * @returns {Promise<void>}
 */
function loadConfiguration() {
    return new Promise((resolve) => {
        getConfig(window.configId, (config) => {
            try {
                if (config == null) {
                    console.log("Extra config is null, using default config");
                    setDefaultTexts();
                } else {
                    setCustomTexts(config);
                }
                resolve();
            } catch (error) {
                console.error('Error processing configuration:', error);
                setDefaultTexts();
                resolve();
            }
        });
    });
}

/**
 * Sets default text messages
 */
function setDefaultTexts() {
    window.texts = [
        "点击屏幕有惊喜",
        "新年快乐",
        "蛇年快乐", 
        "转发好运",
        "转发祝福",
        "点击右下角花1块钱就可以定制祝福语"
    ];
}

/**
 * Sets custom text messages from configuration
 * @param {Object} config - Configuration object
 */
function setCustomTexts(config) {
    const text1 = config.text1 || "新年快乐";
    const text2 = config.text2 || "蛇年快乐";
    const text3 = config.text3 || "转发好运";
    const text4 = config.text4 || "转发祝福";
    const text5 = "点击右下角花1块钱就可以定制祝福语";
    
    window.texts = [
        "点击屏幕有惊喜", 
        text1, 
        text2, 
        text3, 
        text4, 
        text5
    ];
}

/**
 * Sets up periodic firework downloads
 */
function setupPeriodicDownloads() {
    setInterval(async () => {
        try {
            await downloadAndCreateFireworks();
        } catch (error) {
            console.error('Error in periodic firework download:', error);
        }
    }, 10000); // Every 10 seconds
}

/**
 * Downloads fireworks data and creates firework objects
 * @returns {Promise<void>}
 */
function downloadAndCreateFireworks() {
    return new Promise((resolve) => {
        downloadFireworks((dataArray) => {
            try {
                console.log('Downloaded fireworks:', dataArray);
                
                if (dataArray && Array.isArray(dataArray)) {
                    dataArray.forEach(data => {
                        createFireworkFromData(data);
                    });
                }
                resolve();
            } catch (error) {
                console.error('Error creating fireworks from data:', error);
                resolve();
            }
        });
    });
}

/**
 * Creates a firework from downloaded data
 * @param {Object} data - Firework data object
 */
function createFireworkFromData(data) {
    if (!data || !data.x || !data.y) {
        console.warn('Invalid firework data:', data);
        return;
    }

    const startX = canvas.width * Math.random();
    const firework = new Firework(startX, data.x, data.y, data.string || 'Unknown');
    
    window.fireworks.push(firework);
    playFireworkSound();
}

/**
 * Loads initial fireworks on application start
 */
async function loadInitialFireworks() {
    try {
        await downloadAndCreateFireworks();
    } catch (error) {
        console.error('Error loading initial fireworks:', error);
    }
}