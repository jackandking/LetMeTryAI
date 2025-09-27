// Move all JavaScript code here
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// All classes (Particle and Firework) and other functions
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * 2, // Reduced from 8 to 4
            y: (Math.random() - 0.5) * 2  // Reduced from 8 to 4
        };
        this.alpha = 1;
        this.friction = 0.98; // Increased from 0.95 to 0.98
        this.gravity = 0.01; // Reduced from 0.2 to 0.1
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.fill();
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.005; // Reduced from 0.01 to 0.005
    }
}


class Firework {
    constructor(startX, targetX, targetY, fireworkString = 'test') {
        this.x = startX;
        this.y = canvas.height;
        this.targetX = targetX;
        this.targetY = targetY;
        this.fireworkString = fireworkString;
        this.textAlpha = 1;
        this.showText = true;
        this.explosionX = targetX;
        this.explosionY = targetY;
        this.speed = 2; // 减慢发射速度
        this.angle = Math.atan2(targetY - this.y, targetX - startX);
        this.velocity = {
            x: Math.cos(this.angle) * this.speed,
            y: Math.sin(this.angle) * this.speed
        };
        this.particles = [];
        this.color = `${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}`;
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.velocity.x, this.y - this.velocity.y);
        ctx.strokeStyle = `rgb(${this.color})`;
        ctx.lineWidth = 8; // 增加线条宽度
        ctx.stroke();

        // Draw the text if showing
        if (this.showText && this.textAlpha > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${this.textAlpha})`;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.fireworkString, this.explosionX, this.explosionY);
            this.textAlpha -= 0.002; // Slower fade out
            ctx.restore();
        }
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    explode() {
        // Store explosion coordinates
        this.explosionX = this.x;
        this.explosionY = this.y;
        
        const particleCount = 300;
        const heartPoints = [];
        
        // Generate heart shape points
        for (let i = 0; i < particleCount; i++) {
            const t = (i / particleCount) * Math.PI * 2;
            // Heart shape parametric equations
            const x = 8 * Math.pow(Math.sin(t), 3);
            const y = 6.5 * Math.cos(t) - 2.5 * Math.cos(2*t) - 1 * Math.cos(3*t) - 0.5 * Math.cos(4*t);
            heartPoints.push({x: x, y: y});
        }

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
        
        // 播放爆炸声音
        explosionSound.currentTime = 0;
        explosionSound.play();

            // Add text display
        this.showText = true;
        setTimeout(() => {
            this.showText = false;
        }, 10000); // Show text for 2 seconds

        // Add sparkle effect around heart shape
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


// All the other functions
function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

async function getCurrentCity() {
    try {
        const response = await fetch('https://api.ipapi.is/');
        const data = await response.json();
        console.log(data);
        return data.location.city || '未知城市';
    } catch (error) {
        console.error('Error getting location:', error);
        return '未知城市';
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function animate() {
    requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let fireworks=window.fireworks;
    // 更新烟花
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].draw();
        fireworks[i].update();

        // 检查是否到达目标点
        const distance = Math.hypot(
            fireworks[i].x - fireworks[i].targetX,
            fireworks[i].y - fireworks[i].targetY
        );

        if (distance < 5) {
            fireworks[i].explode();
            particles = particles.concat(fireworks[i].particles);
            fireworks.splice(i, 1);
        }
    }

    // 更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].draw();
        particles[i].update();

        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    // 绘制文字
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(window.texts[currentTextIndex], canvas.width / 2, textY);

    // 更新文字位置
    textY += 1;
    if (textY > canvas.height) {
        textY = -20;
        currentTextIndex = (currentTextIndex + 1) % window.texts.length;
    }
}


// Initialize everything when the document is loaded
// Add these at the top of the file, after the getUrlParameter function
let canvas;
let ctx;
let particles = [];
let currentTextIndex = 0;
let textY;

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    window.configId = getUrlParameter('configId');
    window.fireworkSound = new Audio('launch.wav');
    window.explosionSound = new Audio('explode.wav');
    window.fireworks = [];
    window.texts = ["点击屏幕有惊喜"];
    
    // Update canvas setup to use global variables
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    textY = canvas.height / 2;
    
    // Initialize canvas size
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    // Setup click handler
    canvas.addEventListener('click', async (e) => {
        const startX = canvas.width * Math.random();
            window.fireworks.push(new Firework(startX, e.clientX, e.clientY, window.currentCity || '未知城市'));
            // 播放发射声音
            window.fireworkSound.currentTime = 0;
            window.fireworkSound.play();
            const fireworkId = generateUUID();
           
            const fireworkType = 0;
            uploadFirework(fireworkId, fireworkType, e.clientX, e.clientY, window.currentCity || '未知城市');

        // ... existing click handler code ...
    });
    
    // Start animation
    animate();
    
    // Initial city load and config
    (async function() {
        window.currentCity = await getCurrentCity();
        console.log("Current city:", window.currentCity);
        
        getConfig(window.configId, (config) => {
            if(config == null) {
                console.log("extra config is null, use webview default config");
            }else{
                window.text1= config.text1 || "新年快乐";
                window.text2= config.text2 || "蛇年快乐";
                window.text3= config.text3 || "转发好运";
                window.text4= config.text4 || "转发祝福";
                window.text5= "点击右下角花1块钱就可以定制祝福语";
                window.texts = ["点击屏幕有惊喜", window.text1, window.text2,window.text3,window.text4,window.text5];
            };// ... existing config handling code ...
        });
        
        // Set up periodic firework loading
        setInterval(() => {
            downloadFireworks((dataArray) => {
                console.log(dataArray);
                if (dataArray && Array.isArray(dataArray)) {
                    dataArray.forEach(data => {
                        if (data && data.x && data.y) {
                            const startX = canvas.width * Math.random();
                            window.fireworks.push(new Firework(startX, data.x, data.y, data.string));
                            window.fireworkSound.currentTime = 0;
                            window.fireworkSound.play();
                        }
                    });
                }
            });
        }, 10000);
        
        // Initial fireworks download
        downloadFireworks((dataArray) => {
            console.log(dataArray);
                            if (dataArray && Array.isArray(dataArray)) {
                                dataArray.forEach(data => {
                                    if (data && data.x && data.y) {
                                        const startX = canvas.width * Math.random();
                                        window.fireworks.push(new Firework(startX, data.x, data.y, data.string || 'Unknown'));
                                        window.fireworkSound.currentTime = 0;
                                        window.fireworkSound.play();
                                    }
                                });
                            }// ... existing initial firework loading code ...
        });
    })();
});