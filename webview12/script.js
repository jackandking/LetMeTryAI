
    // 获取canvas元素和绘图上下文
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // 设置canvas的宽度和高度为视口大小
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 烟花粒子类
    class Particle {
        constructor(x, y, hue) {
            this.x = x;
            this.y = y;
            this.hue = hue;
            this.exploded = false;
            this.radius = Math.random() * 3 + 1;
            this.speed = Math.random() * 2 + 1;
            this.friction = 0.9;
            this.alpha = 1;
            this.angle = Math.random() * Math.PI * 2;
            this.targetX = null;
            this.targetY = null;
        }

        update() {
            if (this.exploded && this.targetX!== null && this.targetY!== null) {
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    this.x += dx / distance * this.speed;
                    this.y += dy / distance * this.speed;
                    this.speed *= this.friction;
                }
                this.alpha -= 0.02;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, ${this.alpha})`;
            ctx.fill();
        }

        explode(targetX, targetY) {
            this.exploded = true;
            this.targetX = targetX;
            this.targetY = targetY;
        }
    }

    // 存储所有烟花粒子的数组
    let particles = [];

    // 文字点阵数据，这里简单示意，实际需要更精确调整
    const textPoints = {
        '新': [
            [100, 100], [110, 100], [120, 100], [130, 100], [140, 100],
            [100, 110], [110, 110], [120, 110], [130, 110], [140, 110],
            // 更多点...
        ],
        '年': [
            [200, 100], [210, 100], [220, 100], [230, 100],
            [200, 110], [210, 110], [220, 110], [230, 110],
            // 更多点...
        ],
        '快': [
            [300, 100], [310, 100], [320, 100],
            [300, 110], [310, 110], [320, 110],
            // 更多点...
        ],
        '乐': [
            [400, 100], [410, 100], [420, 100],
            [400, 110], [410, 110], [420, 110],
            // 更多点...
        ]
    };

    // 处理点击事件，创建烟花
    canvas.addEventListener('click', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        const hue = Math.random() * 360;
        const allTextPoints = [].concat(textPoints['新'], textPoints['年'], textPoints['快'], textPoints['乐']);
        for (let i = 0; i < allTextPoints.length; i++) {
            const particle = new Particle(x, y, hue);
            particle.explode(allTextPoints[i][0], allTextPoints[i][1]);
            particles.push(particle);
        }
    });

    // 动画循环
    function animate() {
        requestAnimationFrame(animate);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].alpha <= 0) {
                particles.splice(i, 1);
                i--;
            }
        }
    }

    animate();
