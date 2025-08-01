// NEON GOLF '85 - Game Logic
class NeonGolf {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'won', 'lost'
        this.strokes = 0;
        this.maxStrokes = 20;
        this.par = 3;
        
        // Game objects
        this.ball = {
            x: 100,
            y: this.canvas.height - 100,
            radius: 12, // Increased from 8 for better Jeff visibility
            vx: 0,
            vy: 0,
            friction: 0.98,
            bounce: 0.7
        };
        
        this.hole = {
            x: this.canvas.width - 100,
            y: 100,
            radius: 18 // Increased from 15 to match larger ball
        };
        
        this.club = {
            x: this.ball.x,
            y: this.ball.y,
            angle: 0,
            power: 0,
            maxPower: 100,
            isDragging: false
        };
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            isDown: false,
            dragStartX: 0,
            dragStartY: 0
        };
        
        // Course obstacles - retro neon style
        this.obstacles = this.createObstacles();
        
        // Sound system
        this.audioContext = null;
        this.initAudio();
        
        // Load ball image
        this.ballImage = new Image();
        this.ballImageLoaded = false;
        this.ballImage.onload = () => {
            this.ballImageLoaded = true;
            console.log('Jeff ball image loaded successfully!');
        };
        this.ballImage.onerror = () => {
            console.log('Failed to load jeff.png, using default ball');
            this.ballImageLoaded = false;
        };
        this.ballImage.src = 'jeff.png';
        
        // Jeff rain system for victory celebration
        this.jeffRain = [];
        this.jeffRainActive = false;
        
        // Bind events
        this.bindEvents();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupCanvas() {
        // Make canvas responsive but bigger for better visibility
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        this.canvas.width = Math.min(1000, containerRect.width - 40); // Increased from 800
        this.canvas.height = Math.min(750, containerRect.height - 40); // Increased from 600
        
        // Set canvas style
        this.canvas.style.width = this.canvas.width + 'px';
        this.canvas.style.height = this.canvas.height + 'px';
    }
    
    createObstacles() {
        const obstacles = [];
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Create retro-styled obstacles
        obstacles.push(
            // Top wall (thicker for larger canvas)
            { x: 0, y: 0, width: w, height: 25, type: 'wall' },
            // Bottom wall  
            { x: 0, y: h - 25, width: w, height: 25, type: 'wall' },
            // Left wall
            { x: 0, y: 0, width: 25, height: h, type: 'wall' },
            // Right wall
            { x: w - 25, y: 0, width: 25, height: h, type: 'wall' },
            
            // Neon Profile Face Obstacle with tunnel pipe (scaled up)
            { 
                x: w * 0.35, 
                y: h * 0.25, 
                width: 170, // Increased from 140
                height: 190, // Increased from 160
                type: 'face',
                mouthX: w * 0.35,
                mouthY: h * 0.25 + 115, // Adjusted for larger face
                mouthWidth: 42, // Increased from 35
                mouthHeight: 30, // Increased from 25
                exitX: w * 0.35 + 170, // Adjusted for larger face
                exitY: h * 0.25 + 95, // Adjusted for larger face
                exitWidth: 30, // Increased from 25
                exitHeight: 18, // Increased from 15
                // Hidden wavy pipe path through the head (scaled up)  
                pipePath: [
                    { x: w * 0.35 + 21, y: h * 0.25 + 130 },  // Entry point
                    { x: w * 0.35 + 50, y: h * 0.25 + 110 },  // First curve up
                    { x: w * 0.35 + 80, y: h * 0.25 + 90 },   // Peak
                    { x: w * 0.35 + 110, y: h * 0.25 + 100 }, // Curve down
                    { x: w * 0.35 + 140, y: h * 0.25 + 115 }, // Second curve
                    { x: w * 0.35 + 165, y: h * 0.25 + 105 }  // Exit point
                ],
                ballInTunnel: false,
                tunnelProgress: 0
            },
            
            // Randomized smaller obstacles
            ...this.generateRandomObstacles(w, h)
        );
        
        return obstacles;
    }
    
    generateRandomObstacles(w, h) {
        const obstacles = [];
        const obstacleCount = 4 + Math.floor(Math.random() * 3); // 4-6 random obstacles
        
        // Avoid the face area and starting/ending areas
        const avoidAreas = [
            { x: 0, y: h * 0.8, width: w * 0.3, height: h * 0.2 }, // Starting area
            { x: w * 0.7, y: 0, width: w * 0.3, height: h * 0.3 }, // Hole area
            { x: w * 0.25, y: h * 0.15, width: w * 0.4, height: h * 0.6 } // Face area
        ];
        
        for (let i = 0; i < obstacleCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let obstacle;
            
            while (!validPosition && attempts < 20) {
                const x = Math.random() * (w * 0.8);
                const y = Math.random() * (h * 0.8);
                const width = 30 + Math.random() * 60; // Smaller obstacles: 30-90px
                const height = 25 + Math.random() * 50; // Smaller obstacles: 25-75px
                const type = Math.random() < 0.3 ? 'water' : 'barrier';
                
                obstacle = { x, y, width, height, type };
                
                // Check if obstacle overlaps with avoid areas
                validPosition = !avoidAreas.some(area => 
                    !(obstacle.x > area.x + area.width || 
                      obstacle.x + obstacle.width < area.x ||
                      obstacle.y > area.y + area.height ||
                      obstacle.y + obstacle.height < area.y)
                );
                
                attempts++;
            }
            
            if (validPosition) {
                obstacles.push(obstacle);
            }
        }
        
        return obstacles;
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    playSound(frequency, duration = 0.2, type = 'sine') {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    onMouseDown(e) {
        if (this.gameState !== 'playing') return;
        
        const pos = this.getMousePos(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        this.mouse.isDown = true;
        this.mouse.dragStartX = pos.x;
        this.mouse.dragStartY = pos.y;
        
        // Check if clicking near the ball
        const dist = Math.sqrt((pos.x - this.ball.x) ** 2 + (pos.y - this.ball.y) ** 2);
        if (dist < 50) {
            this.club.isDragging = true;
            this.playSound(800, 0.1); // Click sound
        }
    }
    
    onMouseMove(e) {
        const pos = this.getMousePos(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        
        if (this.club.isDragging) {
            const dx = this.mouse.dragStartX - pos.x;
            const dy = this.mouse.dragStartY - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.club.power = Math.min(distance / 2, this.club.maxPower);
            this.club.angle = Math.atan2(dy, dx);
            
            // Update power meter
            const powerPercent = (this.club.power / this.club.maxPower) * 100;
            document.getElementById('powerFill').style.width = powerPercent + '%';
        }
    }
    
    onMouseUp(e) {
        if (this.club.isDragging && this.gameState === 'playing') {
            this.hitBall();
            this.club.isDragging = false;
            this.club.power = 0;
            document.getElementById('powerFill').style.width = '0%';
        }
        this.mouse.isDown = false;
    }
    
    hitBall() {
        if (this.ball.vx !== 0 || this.ball.vy !== 0) return; // Ball already moving
        
        const powerMultiplier = 0.25; // Reduced to prevent excessive speed
        this.ball.vx = Math.cos(this.club.angle) * this.club.power * powerMultiplier;
        this.ball.vy = Math.sin(this.club.angle) * this.club.power * powerMultiplier;
        
        // Limit maximum velocity to prevent tunneling
        const maxVelocity = 15;
        const currentSpeed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
        if (currentSpeed > maxVelocity) {
            this.ball.vx = (this.ball.vx / currentSpeed) * maxVelocity;
            this.ball.vy = (this.ball.vy / currentSpeed) * maxVelocity;
        }
        
        this.strokes++;
        document.getElementById('strokes').textContent = this.strokes;
        
        // Play hit sound - silly retro beep
        this.playSound(400 + this.club.power * 5, 0.3, 'square');
        
        // Check game over conditions
        if (this.strokes >= this.maxStrokes) {
            setTimeout(() => this.gameOver(false), 1000);
        }
    }
    
    updateBall() {
        // Store previous position for collision detection
        const prevX = this.ball.x;
        const prevY = this.ball.y;
        
        // Apply physics
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;
        
        // Check collisions with obstacles (before applying friction)
        this.checkCollisions(prevX, prevY);
        
        // Ensure ball stays within canvas bounds
        this.constrainToBounds();
        
        // Apply friction
        this.ball.vx *= this.ball.friction;
        this.ball.vy *= this.ball.friction;
        
        // Stop ball if moving very slowly
        if (Math.abs(this.ball.vx) < 0.1 && Math.abs(this.ball.vy) < 0.1) {
            this.ball.vx = 0;
            this.ball.vy = 0;
        }
        
        // Check if ball reached hole
        this.checkHole();
    }
    
    checkCollisions(prevX, prevY) {
        for (let obstacle of this.obstacles) {
            if (obstacle.type === 'face') {
                // Handle face obstacle with separate collision areas (excluding mouth)
                this.checkFaceCollision(obstacle);
            } else {
                // Regular obstacle collision
                if (this.ball.x + this.ball.radius > obstacle.x &&
                    this.ball.x - this.ball.radius < obstacle.x + obstacle.width &&
                    this.ball.y + this.ball.radius > obstacle.y &&
                    this.ball.y - this.ball.radius < obstacle.y + obstacle.height) {
                    
                    this.handleObstacleCollision(obstacle);
                    break;
                }
            }
        }
    }
    
    checkFaceCollision(obstacle) {
        // Check if ball is already in tunnel system
        if (obstacle.ballInTunnel) {
            this.moveBallThroughTunnel(obstacle);
            return;
        }
        
        // Check if ball is entering the oval mouth
        const mouthCenterX = obstacle.mouthX + obstacle.mouthWidth / 2;
        const mouthCenterY = obstacle.mouthY + obstacle.mouthHeight / 2;
        const mouthRadiusX = obstacle.mouthWidth / 2;
        const mouthRadiusY = obstacle.mouthHeight / 2;
        
        const mouthDx = this.ball.x - mouthCenterX;
        const mouthDy = this.ball.y - mouthCenterY;
        const mouthDistance = (mouthDx * mouthDx) / (mouthRadiusX * mouthRadiusX) + 
                             (mouthDy * mouthDy) / (mouthRadiusY * mouthRadiusY);
        
        if (mouthDistance <= 1) {
            // Ball enters the tunnel system!
            obstacle.ballInTunnel = true;
            obstacle.tunnelProgress = 0;
            this.ball.vx = 0;
            this.ball.vy = 0;
            
            // Play gulp sound
            this.playSound(200, 0.4, 'sine');
            return;
        }
        
        // Check collision with oval face (excluding mouth and exit areas)
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        const radiusX = obstacle.width / 2;
        const radiusY = obstacle.height / 2;
        
        // Check if ball is inside the oval face
        const dx = this.ball.x - centerX;
        const dy = this.ball.y - centerY;
        const normalizedDistance = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
        
        if (normalizedDistance <= 1) {
            // Ball is inside the oval face - bounce it out!
            
            // Calculate the closest point on the ellipse to the ball
            const angle = Math.atan2(dy, dx);
            const ellipseX = centerX + radiusX * Math.cos(angle);
            const ellipseY = centerY + radiusY * Math.sin(angle);
            
            // Push ball outside the ellipse
            const pushDistance = this.ball.radius + 2;
            this.ball.x = ellipseX + Math.cos(angle) * pushDistance;
            this.ball.y = ellipseY + Math.sin(angle) * pushDistance;
            
            // Calculate bounce direction (normal to ellipse at collision point)
            const normalX = (2 * dx) / (radiusX * radiusX);
            const normalY = (2 * dy) / (radiusY * radiusY);
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
            
            if (normalLength > 0) {
                const nx = normalX / normalLength;
                const ny = normalY / normalLength;
                
                // Reflect velocity off the normal
                const dotProduct = this.ball.vx * nx + this.ball.vy * ny;
                this.ball.vx -= 2 * dotProduct * nx * this.ball.bounce;
                this.ball.vy -= 2 * dotProduct * ny * this.ball.bounce;
            }
            
            // Play bounce sound
            this.playSound(300, 0.2, 'sawtooth');
        }
    }
    
    moveBallThroughTunnel(obstacle) {
        const path = obstacle.pipePath;
        const progress = obstacle.tunnelProgress;
        const speed = 2; // Pixels per frame through tunnel
        
        if (progress >= path.length - 1) {
            // Ball exits the tunnel in a random direction!
            this.ball.x = obstacle.exitX + obstacle.exitWidth + this.ball.radius;
            this.ball.y = obstacle.exitY + obstacle.exitHeight / 2;
            
            // Random exit direction - anywhere from -45° to +45° from horizontal
            const randomAngle = (Math.random() - 0.5) * Math.PI / 2; // -π/4 to π/4
            const exitSpeed = 3 + Math.random() * 3; // Random speed 3-6
            
            this.ball.vx = Math.cos(randomAngle) * exitSpeed;
            this.ball.vy = Math.sin(randomAngle) * exitSpeed;
            
            obstacle.ballInTunnel = false;
            obstacle.tunnelProgress = 0;
            
            // Play random pitch exit sound for variety
            const randomPitch = 300 + Math.random() * 200;
            this.playSound(randomPitch, 0.3, 'square');
            return;
        }
        
        // Interpolate ball position along the path
        const currentIndex = Math.floor(progress);
        const nextIndex = Math.min(currentIndex + 1, path.length - 1);
        const t = progress - currentIndex;
        
        const current = path[currentIndex];
        const next = path[nextIndex];
        
        this.ball.x = current.x + (next.x - current.x) * t;
        this.ball.y = current.y + (next.y - current.y) * t;
        
        // Advance progress
        obstacle.tunnelProgress += speed / 20; // Smooth movement
    }
    
    handleObstacleCollision(obstacle) {
        // Calculate overlap amounts
        const overlapLeft = (this.ball.x + this.ball.radius) - obstacle.x;
        const overlapRight = (obstacle.x + obstacle.width) - (this.ball.x - this.ball.radius);
        const overlapTop = (this.ball.y + this.ball.radius) - obstacle.y;
        const overlapBottom = (obstacle.y + obstacle.height) - (this.ball.y - this.ball.radius);
        
        // Find the smallest overlap to determine collision side
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);
        
        if (minOverlapX < minOverlapY) {
            // Horizontal collision
            if (overlapLeft < overlapRight) {
                // Hit left side of obstacle
                this.ball.x = obstacle.x - this.ball.radius;
            } else {
                // Hit right side of obstacle
                this.ball.x = obstacle.x + obstacle.width + this.ball.radius;
            }
            this.ball.vx *= -this.ball.bounce;
        } else {
            // Vertical collision
            if (overlapTop < overlapBottom) {
                // Hit top side of obstacle
                this.ball.y = obstacle.y - this.ball.radius;
            } else {
                // Hit bottom side of obstacle
                this.ball.y = obstacle.y + obstacle.height + this.ball.radius;
            }
            this.ball.vy *= -this.ball.bounce;
        }
        
        // Ensure ball doesn't get stuck by adding small separation
        const separationForce = 0.5;
        const dx = this.ball.x - (obstacle.x + obstacle.width / 2);
        const dy = this.ball.y - (obstacle.y + obstacle.height / 2);
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 0) {
            this.ball.x += (dx / length) * separationForce;
            this.ball.y += (dy / length) * separationForce;
        }
        
        // Play bounce sound
        this.playSound(300, 0.2, 'sawtooth');
    }
    
    constrainToBounds() {
        // Keep ball within canvas boundaries with some margin for walls
        const margin = 35; // Wall thickness (25) + ball radius (12) + small buffer
        
        if (this.ball.x - this.ball.radius < margin) {
            this.ball.x = margin + this.ball.radius;
            this.ball.vx = Math.abs(this.ball.vx) * this.ball.bounce; // Bounce right
        }
        
        if (this.ball.x + this.ball.radius > this.canvas.width - margin) {
            this.ball.x = this.canvas.width - margin - this.ball.radius;
            this.ball.vx = -Math.abs(this.ball.vx) * this.ball.bounce; // Bounce left
        }
        
        if (this.ball.y - this.ball.radius < margin) {
            this.ball.y = margin + this.ball.radius;
            this.ball.vy = Math.abs(this.ball.vy) * this.ball.bounce; // Bounce down
        }
        
        if (this.ball.y + this.ball.radius > this.canvas.height - margin) {
            this.ball.y = this.canvas.height - margin - this.ball.radius;
            this.ball.vy = -Math.abs(this.ball.vy) * this.ball.bounce; // Bounce up
        }
    }
    
    checkHole() {
        const dist = Math.sqrt((this.ball.x - this.hole.x) ** 2 + (this.ball.y - this.hole.y) ** 2);
        
        // Add "magnetic" effect near hole - slows down ball when approaching
        if (dist < this.hole.radius * 3 && dist > this.hole.radius) {
            const slowdownFactor = 0.95; // Gradual slowdown when near hole
            this.ball.vx *= slowdownFactor;
            this.ball.vy *= slowdownFactor;
        }
        
        if (dist < this.hole.radius - this.ball.radius) {
            // Calculate current ball speed
            const currentSpeed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
            const maxHoleSpeed = 6; // Increased from 3 - more forgiving!
            
            if (currentSpeed <= maxHoleSpeed) {
                // Ball is moving slow enough - successful hole!
                this.ball.vx = 0;
                this.ball.vy = 0;
                // Start Jeff rain celebration!
                this.startJeffRain();
                this.gameOver(true);
            } else {
                // Ball is moving too fast - overshoot!
                this.handleOvershoot();
            }
        }
    }
    
    handleOvershoot() {
        // Play overshoot sound effect
        this.playSound(150, 0.3, 'triangle');
        
        // Add a small bounce effect when overshooting
        const bounceReduction = 0.3;
        
        // Calculate direction away from hole center
        const dx = this.ball.x - this.hole.x;
        const dy = this.ball.y - this.hole.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Normalize direction and apply small bounce away from hole
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            // Reduce speed and bounce away slightly
            this.ball.vx *= bounceReduction;
            this.ball.vy *= bounceReduction;
            
            // Add small bounce away from hole
            this.ball.vx += normalizedDx * 2;
            this.ball.vy += normalizedDy * 2;
            
            // Position ball outside hole to prevent getting stuck
            this.ball.x = this.hole.x + normalizedDx * (this.hole.radius + 2);
            this.ball.y = this.hole.y + normalizedDy * (this.hole.radius + 2);
        }
        
        // Show overshoot message briefly
        this.showOvershootMessage();
    }
    
    showOvershootMessage() {
        const statusEl = document.getElementById('gameStatus');
        const originalText = statusEl.textContent;
        const originalClass = statusEl.className;
        
        statusEl.textContent = '💨 TOO FAST! OVERSHOT! 💨';
        statusEl.className = 'game-status overshoot-message';
        
        // Clear message after 1.5 seconds
        setTimeout(() => {
            statusEl.textContent = originalText;
            statusEl.className = originalClass;
        }, 1500);
    }
    
    startJeffRain() {
        this.jeffRainActive = true;
        this.jeffRain = [];
        
        // Create 50 falling Jeffs!
        for (let i = 0; i < 50; i++) {
            this.jeffRain.push({
                x: Math.random() * this.canvas.width,
                y: -Math.random() * 500 - 50, // Start above screen
                vx: (Math.random() - 0.5) * 4, // Small horizontal drift
                vy: Math.random() * 3 + 2, // Falling speed
                rotation: Math.random() * Math.PI * 2, // Random rotation
                rotationSpeed: (Math.random() - 0.5) * 0.3, // Spinning
                size: 20 + Math.random() * 20, // Random size 20-40px
                alpha: 0.8 + Math.random() * 0.2 // Slight transparency variation
            });
        }
        
        // Stop rain after 8 seconds
        setTimeout(() => {
            this.jeffRainActive = false;
        }, 8000);
    }
    
    updateJeffRain() {
        if (!this.jeffRainActive) return;
        
        for (let i = this.jeffRain.length - 1; i >= 0; i--) {
            const jeff = this.jeffRain[i];
            
            // Update position
            jeff.x += jeff.vx;
            jeff.y += jeff.vy;
            jeff.rotation += jeff.rotationSpeed;
            
            // Add slight gravity acceleration
            jeff.vy += 0.1;
            
            // Remove if fell below screen
            if (jeff.y > this.canvas.height + 50) {
                this.jeffRain.splice(i, 1);
            }
        }
    }
    
    drawJeffRain() {
        if (!this.jeffRainActive || !this.ballImageLoaded) return;
        
        for (let jeff of this.jeffRain) {
            this.ctx.save();
            
            // Move to Jeff position and rotate
            this.ctx.translate(jeff.x, jeff.y);
            this.ctx.rotate(jeff.rotation);
            this.ctx.globalAlpha = jeff.alpha;
            
            // Add neon glow effect to raining Jeffs
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            
            // Draw Jeff image
            this.ctx.drawImage(
                this.ballImage,
                -jeff.size / 2,
                -jeff.size / 2,
                jeff.size,
                jeff.size
            );
            
            this.ctx.restore();
        }
    }
    
    gameOver(won) {
        this.gameState = won ? 'won' : 'lost';
        const statusEl = document.getElementById('gameStatus');
        
        if (won) {
            if (this.strokes <= this.par) {
                statusEl.textContent = `🏆 HOLE IN ${this.strokes}! UNDER PAR! 🏆`;
                statusEl.className = 'game-status win-message';
                // Victory fanfare
                this.playVictorySound();
            } else {
                statusEl.textContent = `⭐ HOLE IN ${this.strokes}! NOT BAD! ⭐`;
                statusEl.className = 'game-status win-message';
                this.playSound(600, 0.5);
            }
        } else {
            statusEl.textContent = `💀 GAME OVER! TOO MANY STROKES! 💀`;
            statusEl.className = 'game-status lose-message';
            this.playSound(200, 1, 'square');
        }
        
        // Auto reset after 3 seconds
        setTimeout(() => this.resetGame(), 3000);
    }
    
    playVictorySound() {
        // Play a silly victory tune
        const notes = [523, 659, 784, 1047]; // C, E, G, C octave
        notes.forEach((note, i) => {
            setTimeout(() => this.playSound(note, 0.4), i * 200);
        });
    }
    
    resetGame() {
        this.gameState = 'playing';
        this.strokes = 0;
        this.ball.x = 100;
        this.ball.y = this.canvas.height - 100;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.club.power = 0;
        this.club.isDragging = false;
        
        // Reset tunnel states for face obstacles
        for (let obstacle of this.obstacles) {
            if (obstacle.type === 'face') {
                obstacle.ballInTunnel = false;
                obstacle.tunnelProgress = 0;
            }
        }
        
        // Clear Jeff rain celebration
        this.jeffRainActive = false;
        this.jeffRain = [];
        
        document.getElementById('strokes').textContent = '0';
        document.getElementById('powerFill').style.width = '0%';
        document.getElementById('gameStatus').textContent = '';
        document.getElementById('gameStatus').className = 'game-status';
    }
    
    render() {
        // Clear canvas with EXTREME neon background
        this.ctx.fillStyle = '#000033';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid pattern
        this.drawGrid();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw hole
        this.drawHole();
        
        // Draw ball
        this.drawBall();
        
        // Draw club if dragging
        if (this.club.isDragging) {
            this.drawClub();
        }
        
        // Draw aim line if dragging
        if (this.club.isDragging) {
            this.drawAimLine();
        }
        
        // Draw Jeff rain celebration (on top of everything!)
        this.drawJeffRain();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 2;
        
        for (let x = 0; x < this.canvas.width; x += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    drawObstacles() {
        for (let obstacle of this.obstacles) {
            this.ctx.save();
            
            if (obstacle.type === 'face') {
                this.drawFaceObstacle(obstacle);
            } else {
                            if (obstacle.type === 'wall') {
                this.ctx.fillStyle = '#ff00ff';
                this.ctx.shadowColor = '#ff00ff';
                this.ctx.shadowBlur = 20;
            } else if (obstacle.type === 'water') {
                this.ctx.fillStyle = '#0099ff';
                this.ctx.shadowColor = '#0099ff';
                this.ctx.shadowBlur = 25;
            } else {
                this.ctx.fillStyle = '#00ffff';
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 20;
            }
                
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Add neon border
                this.ctx.strokeStyle = this.ctx.fillStyle;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
            
            this.ctx.restore();
        }
    }
    
    drawFaceObstacle(obstacle) {
        // Draw oval profile face outline with neon glow
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        const radiusX = obstacle.width / 2;
        const radiusY = obstacle.height / 2;
        
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.shadowColor = '#ff00ff';
        this.ctx.shadowBlur = 15;
        
        // Draw oval face
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Oval face border
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw profile features (scaled up for larger face)
        const headX = obstacle.x + 24;
        const headY = obstacle.y + 24;
        
        // Eye (single eye in profile - scaled up)
        this.ctx.fillStyle = '#00ffff';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(headX + 36, headY + 48, 14, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eye pupil (scaled up)
        this.ctx.fillStyle = '#000000';
        this.ctx.shadowBlur = 0;
        this.ctx.beginPath();
        this.ctx.arc(headX + 36, headY + 48, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Profile nose (pointing left - scaled up)
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(headX, headY + 84);
        this.ctx.lineTo(headX - 12, headY + 90);
        this.ctx.lineTo(headX, headY + 96);
        this.ctx.stroke();
        
        // Clear the mouth entrance (oval opening)
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0,0,0,1)';
        this.ctx.shadowBlur = 0;
        
        // Make mouth opening oval-shaped too
        this.ctx.beginPath();
        this.ctx.ellipse(
            obstacle.mouthX + obstacle.mouthWidth / 2, 
            obstacle.mouthY + obstacle.mouthHeight / 2, 
            obstacle.mouthWidth / 2, 
            obstacle.mouthHeight / 2, 
            0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Clear the exit (oval opening)
        this.ctx.beginPath();
        this.ctx.ellipse(
            obstacle.exitX + obstacle.exitWidth / 2, 
            obstacle.exitY + obstacle.exitHeight / 2, 
            obstacle.exitWidth / 2, 
            obstacle.exitHeight / 2, 
            0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Draw oval mouth entrance outline
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 5;
        this.ctx.beginPath();
        this.ctx.ellipse(
            obstacle.mouthX + obstacle.mouthWidth / 2, 
            obstacle.mouthY + obstacle.mouthHeight / 2, 
            obstacle.mouthWidth / 2, 
            obstacle.mouthHeight / 2, 
            0, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw oval exit outline
        this.ctx.beginPath();
        this.ctx.ellipse(
            obstacle.exitX + obstacle.exitWidth / 2, 
            obstacle.exitY + obstacle.exitHeight / 2, 
            obstacle.exitWidth / 2, 
            obstacle.exitHeight / 2, 
            0, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Tunnel path is now hidden - ball travels invisibly through the head
        // this.drawTunnelPath(obstacle); // Hidden for mystery!
        
        // Draw paperboy hat
        this.drawPaperboyHat(obstacle, headX, headY);
        
        // Draw teeth around oval mouth entrance
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 3;
        
        const mouthCenterX = obstacle.mouthX + obstacle.mouthWidth / 2;
        const mouthCenterY = obstacle.mouthY + obstacle.mouthHeight / 2;
        const mouthRadiusX = obstacle.mouthWidth / 2;
        const mouthRadiusY = obstacle.mouthHeight / 2;
        
        // Draw teeth around the oval perimeter
        const teethCount = 8;
        for (let i = 0; i < teethCount; i++) {
            const angle = (i / teethCount) * Math.PI * 2;
            const x = mouthCenterX + Math.cos(angle) * mouthRadiusX;
            const y = mouthCenterY + Math.sin(angle) * mouthRadiusY;
            
            // Draw tooth pointing inward
            const toothLength = 6;
            const innerX = mouthCenterX + Math.cos(angle) * (mouthRadiusX - toothLength);
            const innerY = mouthCenterY + Math.sin(angle) * (mouthRadiusY - toothLength);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(innerX, innerY);
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = 3;
            this.ctx.stroke();
        }
    }
    
    drawPaperboyHat(obstacle, headX, headY) {
        // Draw classic paperboy/newsboy cap in grey
        this.ctx.fillStyle = '#888888';
        this.ctx.shadowColor = '#888888';
        this.ctx.shadowBlur = 8;
        
        // Hat crown (main rounded part - scaled up)
        this.ctx.beginPath();
        this.ctx.ellipse(headX + 42, headY + 18, 54, 24, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hat brim/visor (front part - scaled up)
        this.ctx.beginPath();
        this.ctx.ellipse(headX - 6, headY + 30, 30, 14, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hat button/top detail (scaled up)
        this.ctx.fillStyle = '#666666';
        this.ctx.shadowBlur = 3;
        this.ctx.beginPath();
        this.ctx.arc(headX + 42, headY + 12, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hat stitching lines for detail
        this.ctx.strokeStyle = '#555555';
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = 0;
        
        // Curved stitching lines on crown (scaled up)
        this.ctx.beginPath();
        this.ctx.arc(headX + 42, headY + 18, 42, -0.5, 0.5, false);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(headX + 42, headY + 18, 36, -0.4, 0.4, false);
        this.ctx.stroke();
        
        // Brim edge detail (scaled up)
        this.ctx.strokeStyle = '#999999';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(headX - 6, headY + 30, 30, -1, 1, false);
        this.ctx.stroke();
    }
    
    drawTunnelPath(obstacle) {
        // This function is now unused - tunnel is hidden for mystery!
        // Ball still follows the path, but it's invisible to the player
        return;
    }
    
    drawHole() {
        this.ctx.save();
        this.ctx.fillStyle = '#000000';
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 20;
        
        this.ctx.beginPath();
        this.ctx.arc(this.hole.x, this.hole.y, this.hole.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw hole rim
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw flag
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.fillRect(this.hole.x + 10, this.hole.y - 30, 15, 10);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.hole.x + 10, this.hole.y - 30);
        this.ctx.lineTo(this.hole.x + 10, this.hole.y - 10);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawBall() {
        this.ctx.save();
        
        if (this.ballImageLoaded) {
            // Draw jeff.png as a circular ball
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = 15;
            
            // Create circular clipping path
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
            this.ctx.clip();
            
            // Draw the image within the circular clip
            const size = this.ball.radius * 2;
            this.ctx.drawImage(
                this.ballImage,
                this.ball.x - this.ball.radius,
                this.ball.y - this.ball.radius,
                size,
                size
            );
            
            // Add a subtle neon border around the circular ball
            this.ctx.restore();
            this.ctx.save();
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        } else {
            // Fallback: draw regular white ball while image loads
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = 15;
            
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw ball pattern
            this.ctx.strokeStyle = '#cccccc';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(this.ball.x - 5, this.ball.y);
            this.ctx.lineTo(this.ball.x + 5, this.ball.y);
            this.ctx.moveTo(this.ball.x, this.ball.y - 5);
            this.ctx.lineTo(this.ball.x, this.ball.y + 5);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawClub() {
        const clubLength = 40;
        const clubEndX = this.ball.x + Math.cos(this.club.angle + Math.PI) * clubLength;
        const clubEndY = this.ball.y + Math.sin(this.club.angle + Math.PI) * clubLength;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = '#ffff00';
        this.ctx.shadowBlur = 10;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.ball.x, this.ball.y);
        this.ctx.lineTo(clubEndX, clubEndY);
        this.ctx.stroke();
        
        // Draw club head
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(clubEndX - 5, clubEndY - 8, 10, 16);
        
        this.ctx.restore();
    }
    
    drawAimLine() {
        if (this.club.power === 0) return;
        
        const lineLength = this.club.power * 2;
        const lineEndX = this.ball.x + Math.cos(this.club.angle) * lineLength;
        const lineEndY = this.ball.y + Math.sin(this.club.angle) * lineLength;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 5;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.ball.x, this.ball.y);
        this.ctx.lineTo(lineEndX, lineEndY);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    gameLoop() {
        this.updateBall();
        this.updateJeffRain(); // Update falling Jeffs
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new NeonGolf();
}); 