// Game Configuration
const CONFIG = {
    canvasWidth: 1200,
    canvasHeight: 700,
    worldWidth: 5000,
    worldHeight: 5000,
    playerStartSize: 20, // Everyone starts equal now
    aiStartSize: 20, // All AI planets start at this size
    minBodySize: 10,
    maxBodySize: 60, // Wide range - creates predators and prey
    bodyCount: 40,
    bodySpeed: 2.0,
    playerSpeed: 3, // Keyboard movement speed
    playerAcceleration: 0.2, // How fast player accelerates
    playerMaxSpeed: 6, // Maximum player velocity (normal)
    playerFriction: 0.98, // Very low friction - you keep drifting in space!
    // Boost settings
    boostAcceleration: 0.5, // Extra acceleration during boost
    boostMaxSpeed: 10, // Max speed during boost (higher than normal 6)
    boostDuration: 500, // How long boost lasts (ms)
    boostCooldown: 3000, // Cooldown time between boosts (ms)
    growthRate: 0.3,
    spawnInterval: 3000, // milliseconds
    starCount: 500,
    cameraSmoothing: 0.05, // Smoother camera follow
    // Gravity settings (unified for all entities)
    gravityRadiusMultiplier: 4, // Gravity circle = size × this multiplier (more gradual)
    gravitationalConstant: 1.2, // G constant for gravity calculations (increased to compensate for smaller radius)
    minGravityDistance: 20, // Minimum distance to prevent extreme forces
    // Hunting AI settings
    huntingRange: 300, // Distance at which planets detect prey
    huntingAcceleration: 0.15, // How aggressively planets chase prey
    fleeRange: 300, // Distance at which planets detect threats (reduced from 350)
    fleeAcceleration: 0.12, // How aggressively planets flee (reduced from 0.2 - easier to catch!)
    // Food settings
    foodCount: 150, // Number of food particles in the world
    foodSize: 4, // Size of food particles
    foodGrowth: 0.5, // How much you grow when eating food
    // Shrinking map settings (battle royale!)
    shrinkDelay: 30000, // Start shrinking after 30 seconds
    shrinkInterval: 5000, // Shrink every 5 seconds
    shrinkAmount: 200, // Reduce radius by this much each shrink
    minPlayableRadius: 300, // Minimum playable area
    boundaryDamage: 0.5 // Size loss per second outside boundary
};

// Game Modes Configuration
const GAME_MODES = {
    battleRoyale: {
        name: 'Battle Royale',
        description: 'Last planet standing wins. Map shrinks over time!',
        settings: {
            playerStartSize: 20,
            aiStartSize: 20,
            minBodySize: 10,
            maxBodySize: 60,
            bodyCount: 40,
            foodCount: 150,
            shrinkEnabled: true,
            shrinkDelay: 30000,
            shrinkInterval: 5000,
            shrinkAmount: 200,
            continuousSpawning: false,
            victoryCondition: 'lastStanding'
        }
    },
    survival: {
        name: 'Survival',
        description: 'Survive endless waves! AI can spawn at any size.',
        settings: {
            playerStartSize: 20,
            aiStartSize: 20, // Initial AI size (everyone starts equal)
            minBodySize: 10,
            maxBodySize: 60, // Max for initial spawns
            // Continuous spawn settings (used during gameplay)
            continuousSpawnMinSize: 15,
            continuousSpawnMaxSize: 50, // Moderate variability
            bodyCount: 30, // Start with fewer
            foodCount: 200, // More food for sustained gameplay
            shrinkEnabled: false,
            shrinkDelay: 999999,
            shrinkInterval: 999999,
            shrinkAmount: 0,
            continuousSpawning: true,
            spawnInterval: 4000, // Spawn new AI every 4 seconds
            maxBodies: 50, // Cap total AI planets
            victoryCondition: 'survival' // Track time survived
        }
    }
};

// Celestial body types and colors
const BODY_TYPES = [
    { name: 'asteroid', colors: ['#8B7355', '#A0826D', '#6B5D52'] },
    { name: 'rocky', colors: ['#CD5C5C', '#BC8F8F', '#A0522D'] },
    { name: 'ice', colors: ['#B0E0E6', '#87CEEB', '#4682B4'] },
    { name: 'gas', colors: ['#DDA0DD', '#BA55D3', '#9370DB'] },
    { name: 'lava', colors: ['#FF4500', '#FF6347', '#DC143C'] }
];

// Stars for background
let stars = [];

// Global ID counter for planets
let nextPlanetId = 1;

// Game State
const game = {
    canvas: null,
    ctx: null,
    player: null,
    bodies: [],
    score: 0,
    isRunning: false,
    mouseX: 0,
    mouseY: 0,
    lastSpawnTime: 0,
    camera: {
        x: 0,
        y: 0,
        zoom: 1.0 // Camera zoom level (1.0 = normal, <1.0 = zoomed out)
    },
    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        ArrowUp: false,
        ArrowLeft: false,
        ArrowDown: false,
        ArrowRight: false,
        ' ': false, // Spacebar for boost
        r: false, // Zoom out
        t: false  // Zoom in
    },
    // Boost state
    boostActive: false,
    boostEndTime: 0,
    boostCooldownEndTime: 0,
    events: [], // Activity feed events
    maxEvents: 8, // Max events to show
    food: [], // Food particles in the world
    // Playable area (battle royale boundary)
    playableArea: {
        centerX: 0,
        centerY: 0,
        radius: 0
    },
    lastShrinkTime: 0,
    shrinkStartTime: 0,
    // Game mode
    selectedMode: 'battleRoyale', // Default mode
    survivalStartTime: 0, // Track when survival mode started
    survivalTime: 0, // Current survival time in ms
    lastSpawnCheck: 0 // For continuous spawning in survival mode
};

// Initialize stars
function initStars() {
    stars = [];
    for (let i = 0; i < CONFIG.starCount; i++) {
        stars.push({
            x: Math.random() * CONFIG.worldWidth,
            y: Math.random() * CONFIG.worldHeight,
            size: Math.random() * 2,
            brightness: Math.random(),
            twinkleSpeed: 0.02 + Math.random() * 0.03
        });
    }
}

// Celestial Body Class
class CelestialBody {
    constructor(x, y, size, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.isPlayer = isPlayer;
        this.id = nextPlanetId++; // Assign unique ID
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;

        // Initialize velocity
        this.vx = 0;
        this.vy = 0;

        // AI boost state
        this.boostActive = false;
        this.boostEndTime = 0;
        this.boostCooldownEndTime = 0;

        if (!isPlayer) {
            // Random movement direction
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * CONFIG.bodySpeed;
            this.vy = Math.sin(angle) * CONFIG.bodySpeed;

            // Assign type based on size
            const sizeRatio = (size - CONFIG.minBodySize) / (CONFIG.maxBodySize - CONFIG.minBodySize);
            if (sizeRatio < 0.2) {
                this.type = BODY_TYPES[0]; // asteroid
            } else if (sizeRatio < 0.4) {
                this.type = BODY_TYPES[1]; // rocky
            } else if (sizeRatio < 0.6) {
                this.type = BODY_TYPES[2]; // ice
            } else if (sizeRatio < 0.8) {
                this.type = BODY_TYPES[3]; // gas
            } else {
                this.type = BODY_TYPES[4]; // lava
            }

            this.color = this.type.colors[Math.floor(Math.random() * this.type.colors.length)];
        } else {
            // Player is special blue planet
            this.color = '#4169E1';
        }
    }

    update() {
        if (this.isPlayer) {
            // Handle boost activation
            const currentTime = Date.now();
            if (game.keys[' '] && currentTime >= game.boostCooldownEndTime && !game.boostActive) {
                // Activate boost
                game.boostActive = true;
                game.boostEndTime = currentTime + CONFIG.boostDuration;
                game.boostCooldownEndTime = currentTime + CONFIG.boostCooldown;
            }

            // Deactivate boost when duration ends
            if (game.boostActive && currentTime >= game.boostEndTime) {
                game.boostActive = false;
            }

            // Keyboard movement with acceleration
            let ax = 0;
            let ay = 0;

            // Check keyboard input
            if (game.keys.w || game.keys.ArrowUp) ay -= 1;
            if (game.keys.s || game.keys.ArrowDown) ay += 1;
            if (game.keys.a || game.keys.ArrowLeft) ax -= 1;
            if (game.keys.d || game.keys.ArrowRight) ax += 1;

            // Normalize diagonal movement
            if (ax !== 0 && ay !== 0) {
                ax *= 0.707; // 1/sqrt(2)
                ay *= 0.707;
            }

            // Apply acceleration (extra boost if active)
            const baseAccel = CONFIG.playerAcceleration;
            const accelBoost = game.boostActive ? CONFIG.boostAcceleration : 0;
            this.vx += ax * (baseAccel + accelBoost);
            this.vy += ay * (baseAccel + accelBoost);

            // Apply friction when no keys pressed
            if (ax === 0) this.vx *= CONFIG.playerFriction;
            if (ay === 0) this.vy *= CONFIG.playerFriction;

            // Apply gravitational forces from ALL nearby bodies (unified gravity)
            game.bodies.forEach(body => {
                const dx = body.x - this.x;
                const dy = body.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Each body has a gravity circle based on its size
                const gravityRadius = body.size * CONFIG.gravityRadiusMultiplier;

                // Apply gravity if within this body's gravity circle
                if (distance < gravityRadius && distance > CONFIG.minGravityDistance) {
                    // Gravity gets stronger the closer you are (inverse square law)
                    let force = CONFIG.gravitationalConstant * (body.size) / (distance * distance);

                    // Triple gravity impact when boost is active (risky!)
                    if (game.boostActive) {
                        force *= 3;
                    }

                    // Calculate force components
                    const forceX = (dx / distance) * force;
                    const forceY = (dy / distance) * force;

                    // Apply to velocity
                    this.vx += forceX;
                    this.vy += forceY;
                }
            });

            // Calculate current speed and cap it
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const currentMaxSpeed = game.boostActive ? CONFIG.boostMaxSpeed : CONFIG.playerMaxSpeed;

            // Cap speed when giving input
            if ((ax !== 0 || ay !== 0) && speed > currentMaxSpeed) {
                this.vx = (this.vx / speed) * currentMaxSpeed;
                this.vy = (this.vy / speed) * currentMaxSpeed;
            }

            // Update position
            this.x += this.vx;
            this.y += this.vy;

            // Keep player in world bounds
            this.x = Math.max(this.size, Math.min(CONFIG.worldWidth - this.size, this.x));
            this.y = Math.max(this.size, Math.min(CONFIG.worldHeight - this.size, this.y));

            // Stop at edges
            if (this.x <= this.size || this.x >= CONFIG.worldWidth - this.size) this.vx = 0;
            if (this.y <= this.size || this.y >= CONFIG.worldHeight - this.size) this.vy = 0;
        } else {
            // AI body movement with hunting AND fleeing behavior

            // HIGHEST PRIORITY: Avoid boundary (stay safe!)
            const dx = this.x - game.playableArea.centerX;
            const dy = this.y - game.playableArea.centerY;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            const dangerZone = game.playableArea.radius - 200; // Start avoiding when close

            if (distanceFromCenter > dangerZone) {
                // Move toward center to avoid boundary
                const angle = Math.atan2(dy, dx);
                this.vx -= Math.cos(angle) * CONFIG.fleeAcceleration * 1.5; // Extra strong avoidance
                this.vy -= Math.sin(angle) * CONFIG.fleeAcceleration * 1.5;
            }

            // SECOND PRIORITY: Look for threats to flee from (larger bodies)
            let closestThreat = null;
            let closestThreatDist = CONFIG.fleeRange;

            game.bodies.forEach(otherBody => {
                if (otherBody === this) return;

                const dx = otherBody.x - this.x;
                const dy = otherBody.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Find closest larger body within flee range
                if (distance < closestThreatDist && otherBody.size > this.size * 1.1) {
                    closestThreat = otherBody;
                    closestThreatDist = distance;
                }
            });

            // Also consider player as potential threat
            if (game.player && game.player.size > this.size * 1.1) {
                const dx = game.player.x - this.x;
                const dy = game.player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestThreatDist) {
                    closestThreat = game.player;
                    closestThreatDist = distance;
                }
            }

            // If threat found, FLEE! (takes priority over hunting)
            if (closestThreat) {
                const dx = closestThreat.x - this.x;
                const dy = closestThreat.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if we're in the threat's gravity well - boost to escape!
                const currentTime = Date.now();
                const threatGravityRadius = closestThreat.size * CONFIG.gravityRadiusMultiplier;
                if (distance < threatGravityRadius && currentTime >= this.boostCooldownEndTime && !this.boostActive) {
                    // Activate boost to escape gravity
                    this.boostActive = true;
                    this.boostEndTime = currentTime + CONFIG.boostDuration;
                    this.boostCooldownEndTime = currentTime + CONFIG.boostCooldown * 1.5; // AI has longer cooldown
                }

                // Accelerate AWAY from threat (boosted if active)
                const fleeAccel = this.boostActive ? CONFIG.fleeAcceleration * 2 : CONFIG.fleeAcceleration;
                this.vx -= (dx / distance) * fleeAccel;
                this.vy -= (dy / distance) * fleeAccel;

            } else {
                // THIRD PRIORITY: If no threats, look for prey to hunt
                let closestPrey = null;
                let closestPreyDist = CONFIG.huntingRange;

                game.bodies.forEach(otherBody => {
                    if (otherBody === this) return;

                    const dx = otherBody.x - this.x;
                    const dy = otherBody.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Find closest smaller body within hunting range
                    if (distance < closestPreyDist && otherBody.size < this.size * 0.9) {
                        closestPrey = otherBody;
                        closestPreyDist = distance;
                    }
                });

                // Also consider player as potential prey
                if (game.player && game.player.size < this.size * 0.9) {
                    const dx = game.player.x - this.x;
                    const dy = game.player.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < closestPreyDist) {
                        closestPrey = game.player;
                        closestPreyDist = distance;
                    }
                }

                // If prey found, chase it!
                if (closestPrey) {
                    const dx = closestPrey.x - this.x;
                    const dy = closestPrey.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Try to activate boost when chasing (if off cooldown)
                    const currentTime = Date.now();
                    if (currentTime >= this.boostCooldownEndTime && !this.boostActive && distance < 200) {
                        // Activate boost when close to prey
                        this.boostActive = true;
                        this.boostEndTime = currentTime + CONFIG.boostDuration;
                        this.boostCooldownEndTime = currentTime + CONFIG.boostCooldown * 1.5; // AI has longer cooldown
                    }

                    // Accelerate toward prey (with boost if active)
                    const huntAccel = this.boostActive ? CONFIG.huntingAcceleration * 2 : CONFIG.huntingAcceleration;
                    this.vx += (dx / distance) * huntAccel;
                    this.vy += (dy / distance) * huntAccel;
                } else {
                    // FOURTH PRIORITY: If no prey, hunt for food
                    let closestFood = null;
                    let closestFoodDist = 250; // Food detection range

                    game.food.forEach(food => {
                        const dx = food.x - this.x;
                        const dy = food.y - this.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < closestFoodDist) {
                            closestFood = food;
                            closestFoodDist = distance;
                        }
                    });

                    // If food found, go eat it!
                    if (closestFood) {
                        const dx = closestFood.x - this.x;
                        const dy = closestFood.y - this.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        // Accelerate toward food (slower than hunting)
                        this.vx += (dx / distance) * (CONFIG.huntingAcceleration * 0.8);
                        this.vy += (dy / distance) * (CONFIG.huntingAcceleration * 0.8);
                    }
                }
            }

            // Apply gravitational forces from ALL nearby bodies (unified gravity - same as player)

            // Check gravity from player
            if (game.player) {
                const dx = game.player.x - this.x;
                const dy = game.player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const gravityRadius = game.player.size * CONFIG.gravityRadiusMultiplier;

                if (distance < gravityRadius && distance > CONFIG.minGravityDistance) {
                    let force = CONFIG.gravitationalConstant * (game.player.size) / (distance * distance);

                    // Triple gravity impact if player's boost is active
                    if (game.boostActive) {
                        force *= 3;
                    }

                    const forceX = (dx / distance) * force;
                    const forceY = (dy / distance) * force;
                    this.vx += forceX;
                    this.vy += forceY;
                }
            }

            // Check gravity from other AI bodies
            game.bodies.forEach(otherBody => {
                if (otherBody === this) return;

                const dx = otherBody.x - this.x;
                const dy = otherBody.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const gravityRadius = otherBody.size * CONFIG.gravityRadiusMultiplier;

                if (distance < gravityRadius && distance > CONFIG.minGravityDistance) {
                    let force = CONFIG.gravitationalConstant * (otherBody.size) / (distance * distance);

                    // Triple gravity impact if the other AI body's boost is active
                    if (otherBody.boostActive) {
                        force *= 3;
                    }

                    const forceX = (dx / distance) * force;
                    const forceY = (dy / distance) * force;
                    this.vx += forceX;
                    this.vy += forceY;
                }
            });

            // Deactivate boost when duration ends
            const currentTime = Date.now();
            if (this.boostActive && currentTime >= this.boostEndTime) {
                this.boostActive = false;
            }

            // Apply minimal friction to AI bodies
            this.vx *= 0.995; // Less friction = more movement
            this.vy *= 0.995;

            // Cap AI speed (higher when boosting)
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const maxAISpeed = this.boostActive ? 8 : 5; // Boosted AI can go faster
            if (speed > maxAISpeed) {
                this.vx = (this.vx / speed) * maxAISpeed;
                this.vy = (this.vy / speed) * maxAISpeed;
            }

            // Update position
            this.x += this.vx;
            this.y += this.vy;

            // Hard boundaries - same as player
            this.x = Math.max(this.size, Math.min(CONFIG.worldWidth - this.size, this.x));
            this.y = Math.max(this.size, Math.min(CONFIG.worldHeight - this.size, this.y));

            // Stop at edges
            if (this.x <= this.size || this.x >= CONFIG.worldWidth - this.size) this.vx = 0;
            if (this.y <= this.size || this.y >= CONFIG.worldHeight - this.size) this.vy = 0;
        }

        // Update rotation
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        // Draw gravity well (before body, so it's behind) - always visible
        const gravityRadius = this.size * CONFIG.gravityRadiusMultiplier;

        // Pulsing effect
        const pulseOffset = Math.sin(Date.now() * 0.001) * 0.1;
        const pulse = 1 + pulseOffset;

        // Draw gravity well rings
        for (let i = 3; i > 0; i--) {
            const ringRadius = (gravityRadius / 3) * i * pulse;
            const alpha = (0.15 / i) * (1 - pulseOffset);

            ctx.strokeStyle = `rgba(100, 181, 246, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]); // Reset dash

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Outer glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.3);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        const bodyGradient = ctx.createRadialGradient(
            -this.size * 0.3,
            -this.size * 0.3,
            0,
            0,
            0,
            this.size
        );
        bodyGradient.addColorStop(0, this.lightenColor(this.color, 40));
        bodyGradient.addColorStop(1, this.darkenColor(this.color, 20));

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Surface details (craters/patterns)
        ctx.fillStyle = this.darkenColor(this.color, 30);
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const dist = this.size * 0.4;
            const craterSize = this.size * (0.15 + Math.random() * 0.1);
            ctx.beginPath();
            ctx.arc(
                Math.cos(angle) * dist,
                Math.sin(angle) * dist,
                craterSize,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Draw ID number on planet
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = `bold ${Math.max(12, this.size * 0.6)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const idText = this.isPlayer ? 'YOU' : `#${this.id}`;
        ctx.strokeText(idText, 0, 0);
        ctx.fillText(idText, 0, 0);

        ctx.restore();

        // Player indicator
        if (this.isPlayer) {
            ctx.save();

            // Boost indicator (only show when actively boosting)
            if (game.boostActive) {
                // Pulsing boost aura
                const boostPulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;

                // Outer boost ring
                ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 * boostPulse})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2 * boostPulse, 0, Math.PI * 2);
                ctx.stroke();

                // Inner boost ring
                ctx.strokeStyle = `rgba(255, 255, 100, ${0.4 * boostPulse})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 1.5 * boostPulse, 0, Math.PI * 2);
                ctx.stroke();

                // Speed trail
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > 3) {
                    const trailLength = speed * 5;
                    const angle = Math.atan2(-this.vy, -this.vx);

                    for (let i = 0; i < 3; i++) {
                        const offset = (i + 1) * (trailLength / 3);
                        const trailX = this.x + Math.cos(angle) * offset;
                        const trailY = this.y + Math.sin(angle) * offset;
                        const alpha = 0.3 - (i * 0.1);

                        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(trailX, trailY, this.size * (0.8 - i * 0.2), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else {
                // Normal indicator
                ctx.strokeStyle = 'rgba(65, 105, 225, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }

        // AI boost indicator (show when AI is boosting)
        if (!this.isPlayer && this.boostActive) {
            ctx.save();

            // Pulsing boost aura for AI
            const boostPulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;

            // Outer boost ring (red/orange for AI)
            ctx.strokeStyle = `rgba(255, 100, 0, ${0.6 * boostPulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2 * boostPulse, 0, Math.PI * 2);
            ctx.stroke();

            // Inner boost ring
            ctx.strokeStyle = `rgba(255, 150, 0, ${0.4 * boostPulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.5 * boostPulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
}

// Collision Detection
function checkCollision(body1, body2) {
    const dx = body1.x - body2.x;
    const dy = body1.y - body2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (body1.size + body2.size) * 0.8;
}

// Spawn Celestial Body
function spawnBody(isContinuousSpawn = false) {
    const modeSettings = GAME_MODES[game.selectedMode].settings;
    let size;

    if (isContinuousSpawn && modeSettings.continuousSpawning) {
        // Survival mode continuous spawns: moderate variability (15-50)
        const minSize = modeSettings.continuousSpawnMinSize || CONFIG.minBodySize;
        const maxSize = modeSettings.continuousSpawnMaxSize || CONFIG.maxBodySize;
        size = minSize + Math.random() * (maxSize - minSize);
    } else {
        // Initial spawns: everyone starts equal
        size = CONFIG.aiStartSize;
    }

    // Spawn randomly in the world, but avoid spawning too close to player
    let x, y;
    let attempts = 0;
    do {
        x = Math.random() * CONFIG.worldWidth;
        y = Math.random() * CONFIG.worldHeight;
        attempts++;
    } while (attempts < 10 && game.player &&
             Math.hypot(x - game.player.x, y - game.player.y) < 300);

    game.bodies.push(new CelestialBody(x, y, size));
}

// Spawn Food Particle
function spawnFood() {
    return {
        x: Math.random() * CONFIG.worldWidth,
        y: Math.random() * CONFIG.worldHeight,
        size: CONFIG.foodSize,
        vx: 0,
        vy: 0
    };
}

// Initialize Food
function initFood() {
    game.food = [];
    for (let i = 0; i < CONFIG.foodCount; i++) {
        game.food.push(spawnFood());
    }
}

// Initialize Game
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    game.canvas.width = CONFIG.canvasWidth;
    game.canvas.height = CONFIG.canvasHeight;

    initStars();

    // Mouse movement - convert screen to world coordinates
    game.canvas.addEventListener('mousemove', (e) => {
        const rect = game.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        // Convert to world coordinates
        game.mouseX = screenX + game.camera.x;
        game.mouseY = screenY + game.camera.y;
    });

    // Button listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('victoryRestartBtn').addEventListener('click', restartGame);
    document.getElementById('mainMenuBtn').addEventListener('click', returnToMainMenu);
    document.getElementById('victoryMainMenuBtn').addEventListener('click', returnToMainMenu);

    // Function to update mode-specific settings visibility
    function updateModeSettings(selectedMode) {
        // Hide all mode-specific settings
        document.querySelectorAll('.mode-specific').forEach(section => {
            section.classList.add('hidden');
        });

        // Show only the selected mode's settings
        const modeSection = document.querySelector(`.mode-specific[data-mode="${selectedMode}"]`);
        if (modeSection) {
            modeSection.classList.remove('hidden');
        }
    }

    // Mode selection listeners
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            // Remove active class from all cards
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
            // Add active class to clicked card
            card.classList.add('active');
            // Set selected mode
            game.selectedMode = card.dataset.mode;

            // Update settings visibility
            updateModeSettings(game.selectedMode);
        });
    });

    // Initialize mode settings on page load
    updateModeSettings(game.selectedMode);

    // Advanced Settings Panel
    document.getElementById('toggleSettings').addEventListener('click', () => {
        const settingsContent = document.getElementById('advancedSettings');
        settingsContent.classList.toggle('hidden');
    });

    // Gravity slider
    const gravitySlider = document.getElementById('gravitySlider');
    const gravityValue = document.getElementById('gravityValue');
    gravitySlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        gravityValue.textContent = value.toFixed(1);
        CONFIG.gravitationalConstant = value;
    });

    // Boost power slider
    const boostSlider = document.getElementById('boostSlider');
    const boostValue = document.getElementById('boostValue');
    boostSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        boostValue.textContent = value.toFixed(1);
        CONFIG.boostAcceleration = value;
    });

    // Food count slider
    const foodSlider = document.getElementById('foodSlider');
    const foodValue = document.getElementById('foodValue');
    foodSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        foodValue.textContent = value;
        // Note: This will be applied on game start via mode settings
        GAME_MODES.battleRoyale.settings.foodCount = value;
    });

    // Survival food count slider
    const survivalFoodSlider = document.getElementById('survivalFoodSlider');
    const survivalFoodValue = document.getElementById('survivalFoodValue');
    survivalFoodSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        survivalFoodValue.textContent = value;
        GAME_MODES.survival.settings.foodCount = value;
    });

    // AI spawn rate slider
    const spawnRateSlider = document.getElementById('spawnRateSlider');
    const spawnRateValue = document.getElementById('spawnRateValue');
    spawnRateSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        spawnRateValue.textContent = (value / 1000).toFixed(1) + 's';
        GAME_MODES.survival.settings.spawnInterval = value;
    });

    // AI aggression slider
    const aggressionSlider = document.getElementById('aggressionSlider');
    const aggressionValue = document.getElementById('aggressionValue');
    aggressionSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        aggressionValue.textContent = value.toFixed(1) + 'x';
        CONFIG.huntingAcceleration = 0.15 * value;
        CONFIG.fleeAcceleration = 0.12 * value;
    });

    // Reset settings button
    document.getElementById('resetSettings').addEventListener('click', () => {
        // Reset to defaults
        gravitySlider.value = 1.2;
        gravityValue.textContent = '1.2';
        CONFIG.gravitationalConstant = 1.2;

        boostSlider.value = 0.5;
        boostValue.textContent = '0.5';
        CONFIG.boostAcceleration = 0.5;

        foodSlider.value = 150;
        foodValue.textContent = '150';
        GAME_MODES.battleRoyale.settings.foodCount = 150;

        survivalFoodSlider.value = 200;
        survivalFoodValue.textContent = '200';
        GAME_MODES.survival.settings.foodCount = 200;

        spawnRateSlider.value = 4000;
        spawnRateValue.textContent = '4.0s';
        GAME_MODES.survival.settings.spawnInterval = 4000;

        aggressionSlider.value = 1.0;
        aggressionValue.textContent = '1.0x';
        CONFIG.huntingAcceleration = 0.15;
        CONFIG.fleeAcceleration = 0.12;
    });

    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
        if (e.key in game.keys) {
            game.keys[e.key] = true;
            e.preventDefault(); // Prevent page scrolling with arrow keys
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key in game.keys) {
            game.keys[e.key] = false;
        }
    });
}

// Start Game
function startGame() {
    // Apply selected game mode settings
    const modeSettings = GAME_MODES[game.selectedMode].settings;
    CONFIG.playerStartSize = modeSettings.playerStartSize;
    CONFIG.aiStartSize = modeSettings.aiStartSize;
    CONFIG.minBodySize = modeSettings.minBodySize;
    CONFIG.maxBodySize = modeSettings.maxBodySize;
    CONFIG.bodyCount = modeSettings.bodyCount;
    CONFIG.foodCount = modeSettings.foodCount;
    CONFIG.shrinkDelay = modeSettings.shrinkDelay;
    CONFIG.shrinkInterval = modeSettings.shrinkInterval;
    CONFIG.shrinkAmount = modeSettings.shrinkAmount;
    if (modeSettings.spawnInterval) {
        CONFIG.spawnInterval = modeSettings.spawnInterval;
    }

    // Reset game state
    game.bodies = [];
    game.score = 0;
    game.isRunning = true;
    game.lastSpawnTime = Date.now();
    game.events = []; // Clear activity feed
    nextPlanetId = 1; // Reset planet ID counter

    // Reset survival mode tracking
    game.survivalStartTime = Date.now();
    game.survivalTime = 0;
    game.lastSpawnCheck = Date.now();

    // Initialize playable area (starts at full world size)
    game.playableArea.centerX = CONFIG.worldWidth / 2;
    game.playableArea.centerY = CONFIG.worldHeight / 2;
    // Radius from center to corner of the square world
    game.playableArea.radius = Math.sqrt(
        Math.pow(CONFIG.worldWidth / 2, 2) + Math.pow(CONFIG.worldHeight / 2, 2)
    );
    game.shrinkStartTime = Date.now();
    game.lastShrinkTime = Date.now();

    // Reset boost state
    game.boostActive = false;
    game.boostEndTime = 0;
    game.boostCooldownEndTime = 0;

    // Create player at center of world
    game.player = new CelestialBody(CONFIG.worldWidth / 2, CONFIG.worldHeight / 2, CONFIG.playerStartSize, true);
    game.mouseX = game.player.x;
    game.mouseY = game.player.y;

    // Initialize camera centered on player
    // Camera position is the world coordinates at the canvas center
    game.camera.x = game.player.x;
    game.camera.y = game.player.y;
    game.camera.zoom = 1.0; // Reset zoom to normal

    // Spawn initial bodies
    for (let i = 0; i < CONFIG.bodyCount; i++) {
        spawnBody();
    }

    // Spawn food
    initFood();

    // Clear activity feed display
    updateActivityFeed();

    // Hide start screen
    document.getElementById('startScreen').classList.add('hidden');

    // Start game loop
    gameLoop();
}

// Restart Game
function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    startGame();
}

// Return to Main Menu
function returnToMainMenu() {
    game.isRunning = false;
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
}

// Update Game State
function update() {
    if (!game.isRunning) return;

    // Update stars (twinkling)
    stars.forEach(star => {
        star.brightness += star.twinkleSpeed;
        if (star.brightness > 1 || star.brightness < 0) {
            star.twinkleSpeed *= -1;
        }
    });

    // Update player
    game.player.update();

    // Manual camera zoom controls (R = zoom out, T = zoom in)
    const minZoom = 0.35; // Maximum zoom out (strategic view without excessive empty space)
    const maxZoom = 2.0;  // Maximum zoom in
    const zoomSpeed = 0.02; // How fast zoom changes

    if (game.keys.r) {
        // Zoom out
        game.camera.zoom = Math.max(minZoom, game.camera.zoom - zoomSpeed);
    }
    if (game.keys.t) {
        // Zoom in
        game.camera.zoom = Math.min(maxZoom, game.camera.zoom + zoomSpeed);
    }

    // Update camera to follow player smoothly
    // Camera position represents the world coordinates at the canvas center
    const targetCameraX = game.player.x;
    const targetCameraY = game.player.y;

    game.camera.x += (targetCameraX - game.camera.x) * CONFIG.cameraSmoothing;
    game.camera.y += (targetCameraY - game.camera.y) * CONFIG.cameraSmoothing;

    // No camera clamping - allow free movement to keep player centered at all zoom levels
    // The world border visualization shows where the playable area ends

    // Update AI bodies
    game.bodies.forEach(body => body.update());

    // Update food with gravity (unified gravity - same as entities)
    game.food.forEach(food => {
        // Apply gravity from player
        if (game.player) {
            const dx = game.player.x - food.x;
            const dy = game.player.y - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const gravityRadius = game.player.size * CONFIG.gravityRadiusMultiplier;

            if (distance < gravityRadius && distance > CONFIG.minGravityDistance) {
                let force = CONFIG.gravitationalConstant * (game.player.size) / (distance * distance);

                // Triple gravity impact if player's boost is active
                if (game.boostActive) {
                    force *= 3;
                }

                food.vx += (dx / distance) * force;
                food.vy += (dy / distance) * force;
            }
        }

        // Apply gravity from all AI bodies
        game.bodies.forEach(body => {
            const dx = body.x - food.x;
            const dy = body.y - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const gravityRadius = body.size * CONFIG.gravityRadiusMultiplier;

            if (distance < gravityRadius && distance > CONFIG.minGravityDistance) {
                let force = CONFIG.gravitationalConstant * (body.size) / (distance * distance);

                // Triple gravity impact if AI body's boost is active
                if (body.boostActive) {
                    force *= 3;
                }

                food.vx += (dx / distance) * force;
                food.vy += (dy / distance) * force;
            }
        });

        // Apply friction to food
        food.vx *= 0.98;
        food.vy *= 0.98;

        // Cap food speed
        const speed = Math.sqrt(food.vx * food.vx + food.vy * food.vy);
        if (speed > 3) {
            food.vx = (food.vx / speed) * 3;
            food.vy = (food.vy / speed) * 3;
        }

        // Update food position
        food.x += food.vx;
        food.y += food.vy;

        // Keep food in world bounds
        food.x = Math.max(food.size, Math.min(CONFIG.worldWidth - food.size, food.x));
        food.y = Math.max(food.size, Math.min(CONFIG.worldHeight - food.size, food.y));
    });

    // Check food collisions with player
    for (let i = game.food.length - 1; i >= 0; i--) {
        const food = game.food[i];
        const dx = game.player.x - food.x;
        const dy = game.player.y - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < game.player.size + food.size) {
            // Player eats food
            game.player.size += CONFIG.foodGrowth;
            game.score += 1;
            // Respawn food at new location
            game.food[i] = spawnFood();
            updateUI();
        }
    }

    // Check food collisions with AI bodies
    game.bodies.forEach(body => {
        for (let i = game.food.length - 1; i >= 0; i--) {
            const food = game.food[i];
            const dx = body.x - food.x;
            const dy = body.y - food.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < body.size + food.size) {
                // AI body eats food
                body.size += CONFIG.foodGrowth;
                // Respawn food at new location
                game.food[i] = spawnFood();
            }
        }
    });

    // Check collisions with player
    for (let i = game.bodies.length - 1; i >= 0; i--) {
        const body = game.bodies[i];

        if (checkCollision(game.player, body)) {
            if (game.player.size > body.size) {
                // Player absorbs body
                game.player.size += CONFIG.growthRate;
                game.score += Math.floor(body.size);
                addActivityEvent(`🍽️ YOU ate Planet #${body.id}!`, true);
                game.bodies.splice(i, 1);
                updateUI();
            } else {
                // Player gets absorbed - game over
                addActivityEvent(`💀 YOU were eaten by Planet #${body.id}!`, true);
                gameOver();
                return;
            }
        }
    }

    // Check collisions between AI bodies (CHAOS MODE!)
    for (let i = game.bodies.length - 1; i >= 0; i--) {
        const body1 = game.bodies[i];

        for (let j = i - 1; j >= 0; j--) {
            const body2 = game.bodies[j];

            if (checkCollision(body1, body2)) {
                // Bigger body always eats smaller body (same as player logic)
                if (body1.size > body2.size) {
                    body1.size += CONFIG.growthRate * 0.5; // Bodies grow slower than player
                    addActivityEvent(`🍽️ Planet #${body1.id} ate Planet #${body2.id}!`, false);
                    game.bodies.splice(j, 1);
                    // Update i since we removed an element before it
                    if (j < i) i--;
                } else if (body2.size > body1.size) {
                    body2.size += CONFIG.growthRate * 0.5;
                    addActivityEvent(`🍽️ Planet #${body2.id} ate Planet #${body1.id}!`, false);
                    game.bodies.splice(i, 1);
                    break; // body1 is gone, move to next
                }
                // If exactly equal size (rare), nothing happens
            }
        }
    }

    // Handle shrinking playable area (battle royale mode only!)
    const currentTime = Date.now();
    const modeSettings = GAME_MODES[game.selectedMode].settings;

    if (modeSettings.shrinkEnabled) {
        const timeSinceStart = currentTime - game.shrinkStartTime;

        // Start shrinking after delay
        if (timeSinceStart > CONFIG.shrinkDelay) {
            // Shrink periodically
            if (currentTime - game.lastShrinkTime > CONFIG.shrinkInterval) {
                if (game.playableArea.radius > CONFIG.minPlayableRadius) {
                    game.playableArea.radius -= CONFIG.shrinkAmount;
                    game.playableArea.radius = Math.max(CONFIG.minPlayableRadius, game.playableArea.radius);
                    game.lastShrinkTime = currentTime;
                    addActivityEvent(`⚠️ The cosmic boundary is shrinking!`, true);
                }
            }
        }
    }

    // Survival mode: continuous spawning
    if (modeSettings.continuousSpawning) {
        game.survivalTime = currentTime - game.survivalStartTime;

        // Spawn new AI bodies periodically
        if (currentTime - game.lastSpawnCheck > CONFIG.spawnInterval) {
            if (game.bodies.length < modeSettings.maxBodies) {
                spawnBody(true); // Pass true for continuous spawn with variability
                game.lastSpawnCheck = currentTime;
            }
        }
    }

    // Push entities inside playable area and damage them
    const pushInsideBoundary = (entity) => {
        const dx = entity.x - game.playableArea.centerX;
        const dy = entity.y - game.playableArea.centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        if (distanceFromCenter > game.playableArea.radius) {
            // Apply damage for being outside
            entity.size -= CONFIG.boundaryDamage * 0.016; // ~60fps

            // Snap entity back inside the boundary aggressively
            const angle = Math.atan2(dy, dx);
            const maxDistance = game.playableArea.radius - entity.size - 5; // Buffer zone
            entity.x = game.playableArea.centerX + Math.cos(angle) * maxDistance;
            entity.y = game.playableArea.centerY + Math.sin(angle) * maxDistance;

            // Reverse and dampen velocity when hitting boundary (bounce effect)
            const normalX = dx / distanceFromCenter;
            const normalY = dy / distanceFromCenter;
            const dotProduct = entity.vx * normalX + entity.vy * normalY;

            // Reflect velocity off boundary
            entity.vx = entity.vx - 2 * dotProduct * normalX;
            entity.vy = entity.vy - 2 * dotProduct * normalY;

            // Dampen the bounce
            entity.vx *= 0.3;
            entity.vy *= 0.3;

            return true; // Entity is outside boundary
        }
        return false; // Entity is safe
    };

    // Push player inside boundary - check if player died from boundary
    if (pushInsideBoundary(game.player)) {
        if (game.player.size < 5) {
            addActivityEvent(`💀 YOU were consumed by the void!`, true);
            gameOver();
            return;
        }
    }

    // Push AI bodies inside boundary - remove dead ones
    for (let i = game.bodies.length - 1; i >= 0; i--) {
        const body = game.bodies[i];
        pushInsideBoundary(body);

        if (body.size < 5) {
            addActivityEvent(`💀 Planet #${body.id} was consumed by the void!`, false);
            game.bodies.splice(i, 1);
        }
    }

    // Check if player has grown too large (become a god!)
    // Victory when player radius reaches 1800
    if (game.player.size > 1800 && game.isRunning) {
        addActivityEvent(`🌟 You've transcended into a cosmic deity!`, true);
        setTimeout(() => {
            victory();
        }, 1000);
        return;
    }

    // Check for victory - last planet standing (battle royale mode only!)
    if (modeSettings.victoryCondition === 'lastStanding') {
        if (game.bodies.length === 0 && game.isRunning) {
            addActivityEvent(`🏆 YOU are the last planet standing!`, true);
            setTimeout(() => {
                victory();
            }, 1000); // Short delay to show the final event
            return;
        }
    }
    // Survival mode has no victory condition - survive until death!

    // No more periodic spawning - set player count at start
    // if (currentTime - game.lastSpawnTime > CONFIG.spawnInterval) {
    //     spawnBody();
    //     game.lastSpawnTime = currentTime;
    // }
}

// Render Game
function render() {
    // Don't render if game hasn't started yet
    if (!game.player) return;

    // Clear and draw space background
    const gradient = game.ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f23');
    game.ctx.fillStyle = gradient;
    game.ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // Save context state and apply camera transformation
    game.ctx.save();

    // Center viewport on canvas
    game.ctx.translate(CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);

    // Apply zoom scale
    game.ctx.scale(game.camera.zoom, game.camera.zoom);

    // Apply camera translation (offset from canvas center)
    game.ctx.translate(-game.camera.x, -game.camera.y);

    // Draw world border
    game.ctx.strokeStyle = '#4169E1';
    game.ctx.lineWidth = 8;
    game.ctx.shadowBlur = 15;
    game.ctx.shadowColor = '#4169E1';
    game.ctx.strokeRect(0, 0, CONFIG.worldWidth, CONFIG.worldHeight);
    game.ctx.shadowBlur = 0; // Reset shadow

    // Draw stars (only visible ones for performance)
    const viewWidth = CONFIG.canvasWidth / game.camera.zoom;
    const viewHeight = CONFIG.canvasHeight / game.camera.zoom;
    const viewLeft = game.camera.x - viewWidth / 2;
    const viewRight = game.camera.x + viewWidth / 2;
    const viewTop = game.camera.y - viewHeight / 2;
    const viewBottom = game.camera.y + viewHeight / 2;

    stars.forEach(star => {
        // Only draw stars visible in camera view
        if (star.x >= viewLeft - 10 && star.x <= viewRight + 10 &&
            star.y >= viewTop - 10 && star.y <= viewBottom + 10) {
            game.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            game.ctx.beginPath();
            game.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            game.ctx.fill();
        }
    });

    // Draw food particles
    game.food.forEach(food => {
        // Only draw food visible in camera view
        if (food.x >= viewLeft - food.size && food.x <= viewRight + food.size &&
            food.y >= viewTop - food.size && food.y <= viewBottom + food.size) {
            // Draw glowing food orb
            game.ctx.fillStyle = '#FFD700'; // Gold color
            game.ctx.shadowBlur = 10;
            game.ctx.shadowColor = '#FFD700';
            game.ctx.beginPath();
            game.ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
            game.ctx.fill();
            game.ctx.shadowBlur = 0; // Reset shadow
        }
    });

    // Draw all bodies (only visible ones)
    game.bodies.forEach(body => {
        if (body.x >= viewLeft - body.size && body.x <= viewRight + body.size &&
            body.y >= viewTop - body.size && body.y <= viewBottom + body.size) {
            body.draw(game.ctx);
        }
    });

    // Draw player on top
    if (game.player) {
        game.player.draw(game.ctx);
    }

    // Draw playable area boundary (battle royale circle)
    const timeSinceStart = Date.now() - game.shrinkStartTime;
    if (timeSinceStart > CONFIG.shrinkDelay - 10000) { // Show boundary 10s before shrink starts
        const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7; // Pulsing effect
        game.ctx.strokeStyle = `rgba(255, 0, 0, ${pulse * 0.6})`;
        game.ctx.lineWidth = 4;
        game.ctx.beginPath();
        game.ctx.arc(
            game.playableArea.centerX,
            game.playableArea.centerY,
            game.playableArea.radius,
            0,
            Math.PI * 2
        );
        game.ctx.stroke();

        // Draw danger zone (outside boundary)
        game.ctx.strokeStyle = `rgba(255, 0, 0, ${pulse * 0.2})`;
        game.ctx.lineWidth = 20;
        game.ctx.beginPath();
        game.ctx.arc(
            game.playableArea.centerX,
            game.playableArea.centerY,
            game.playableArea.radius + 10,
            0,
            Math.PI * 2
        );
        game.ctx.stroke();
    }

    // Restore context state
    game.ctx.restore();

    // Draw minimap (in screen space, not world space)
    drawMinimap();
}

// Draw Minimap
function drawMinimap() {
    const minimapSize = 150;
    const minimapPadding = 20;
    const minimapX = CONFIG.canvasWidth - minimapSize - minimapPadding;
    const minimapY = minimapPadding;

    const scaleX = minimapSize / CONFIG.worldWidth;
    const scaleY = minimapSize / CONFIG.worldHeight;

    // Draw minimap background
    game.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    game.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

    // Draw world border
    game.ctx.strokeStyle = '#4169E1';
    game.ctx.lineWidth = 2;
    game.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

    // Draw cosmic boundary circle (battle royale zone)
    const timeSinceStart = Date.now() - game.shrinkStartTime;
    if (timeSinceStart > CONFIG.shrinkDelay - 10000) { // Show if boundary is visible
        const centerX = minimapX + game.playableArea.centerX * scaleX;
        const centerY = minimapY + game.playableArea.centerY * scaleY;
        const radius = game.playableArea.radius * scaleX;

        game.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        game.ctx.lineWidth = 2;
        game.ctx.beginPath();
        game.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        game.ctx.stroke();
    }

    // Draw bodies as dots
    game.bodies.forEach(body => {
        const dotX = minimapX + body.x * scaleX;
        const dotY = minimapY + body.y * scaleY;
        const dotSize = Math.max(2, body.size * scaleX * 2);

        game.ctx.fillStyle = body.color;
        game.ctx.beginPath();
        game.ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        game.ctx.fill();
    });

    // Draw player (with proper size scaling like AI bodies)
    if (game.player) {
        const playerX = minimapX + game.player.x * scaleX;
        const playerY = minimapY + game.player.y * scaleY;
        const playerSize = Math.max(2, game.player.size * scaleX * 2);

        // Fill
        game.ctx.fillStyle = '#FFD700';
        game.ctx.beginPath();
        game.ctx.arc(playerX, playerY, playerSize, 0, Math.PI * 2);
        game.ctx.fill();

        // Outline to make player stand out
        game.ctx.strokeStyle = '#FFD700';
        game.ctx.lineWidth = 1;
        game.ctx.beginPath();
        game.ctx.arc(playerX, playerY, playerSize + 2, 0, Math.PI * 2);
        game.ctx.stroke();
    }

    // Draw camera viewport (accounting for zoom)
    // Camera position is at the center, so offset by half the view dimensions
    const viewWidth = CONFIG.canvasWidth / game.camera.zoom;
    const viewHeight = CONFIG.canvasHeight / game.camera.zoom;
    const viewLeft = game.camera.x - viewWidth / 2;
    const viewTop = game.camera.y - viewHeight / 2;
    const viewX = minimapX + viewLeft * scaleX;
    const viewY = minimapY + viewTop * scaleY;
    const viewW = viewWidth * scaleX;
    const viewH = viewHeight * scaleY;

    game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    game.ctx.lineWidth = 1;
    game.ctx.strokeRect(viewX, viewY, viewW, viewH);

    // Draw minimap label
    game.ctx.fillStyle = '#64B5F6';
    game.ctx.font = '12px Arial';
    game.ctx.fillText('Map', minimapX + 5, minimapY + 15);
}

// Game Loop
function gameLoop() {
    update();
    render();
    updateUI(); // Update UI every frame for speed indicator

    if (game.isRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// Update UI
function updateUI() {
    // Don't update UI if game hasn't started yet
    if (!game.player) return;

    document.getElementById('score').textContent = game.score;
    document.getElementById('size').textContent = Math.floor(game.player.size);

    // Update speed indicator (if it exists)
    const speedElement = document.getElementById('speed');
    if (speedElement && game.player) {
        const speed = Math.sqrt(game.player.vx * game.player.vx + game.player.vy * game.player.vy);
        speedElement.textContent = speed.toFixed(1);

        // Change color if boosting
        if (game.boostActive) {
            speedElement.style.color = '#FFD700';
        } else {
            speedElement.style.color = '#64B5F6';
        }
    }

    // Update zoom level indicator
    const zoomElement = document.getElementById('zoomLevel');
    if (zoomElement) {
        zoomElement.textContent = game.camera.zoom.toFixed(1) + 'x';
    }

    // Update boost status
    const boostText = document.getElementById('boostText');
    const boostStatus = document.getElementById('boostStatus');
    const currentTime = Date.now();

    if (game.boostActive) {
        boostText.textContent = 'ACTIVE!';
        boostStatus.style.color = '#FFD700';
    } else if (currentTime < game.boostCooldownEndTime) {
        const cooldownRemaining = ((game.boostCooldownEndTime - currentTime) / 1000).toFixed(1);
        boostText.textContent = `${cooldownRemaining}s`;
        boostStatus.style.color = '#FF6B6B';
    } else {
        boostText.textContent = 'Ready';
        boostStatus.style.color = '#4CAF50';
    }

    // Update leaderboard
    updateLeaderboard();
}

// Add Activity Event
function addActivityEvent(message, playerInvolved = false) {
    const event = {
        message,
        playerInvolved,
        timestamp: Date.now(),
        id: Math.random()
    };

    game.events.unshift(event); // Add to front

    // Keep only max events
    if (game.events.length > game.maxEvents) {
        game.events = game.events.slice(0, game.maxEvents);
    }

    updateActivityFeed();

    // Auto-remove after 10 seconds
    setTimeout(() => {
        const index = game.events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            game.events.splice(index, 1);
            updateActivityFeed();
        }
    }, 10000);
}

// Update Activity Feed Display
function updateActivityFeed() {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;

    let html = '';
    game.events.forEach(event => {
        const className = event.playerInvolved ? 'activity-event player-involved' : 'activity-event';
        html += `<div class="${className}">${event.message}</div>`;
    });

    activityList.innerHTML = html || '<div style="text-align: center; color: #666; padding: 10px;">No activity yet...</div>';
}

// Update Leaderboard
function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList || !game.player) return;

    // Include player and AI bodies, sort by size, get top 5
    const allBodies = [game.player, ...game.bodies];
    const sortedBodies = allBodies.sort((a, b) => b.size - a.size).slice(0, 5);

    // Generate HTML
    let html = '';
    sortedBodies.forEach((body, index) => {
        const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const isPlayer = body.isPlayer;
        const idText = isPlayer ? 'YOU' : `#${body.id}`;
        const entryClass = isPlayer ? 'leaderboard-entry player-entry' : 'leaderboard-entry';

        html += `
            <div class="${entryClass}">
                <span><span class="leaderboard-rank">${rankEmojis[index]}</span>${idText}</span>
                <span class="leaderboard-size">${Math.floor(body.size)}</span>
            </div>
        `;
    });

    leaderboardList.innerHTML = html || '<div style="text-align: center; color: #666;">No bodies</div>';
}

// Game Over
function gameOver() {
    game.isRunning = false;

    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalSize').textContent = Math.floor(game.player.size);

    // Show survival time if in survival mode
    const modeSettings = GAME_MODES[game.selectedMode].settings;
    if (modeSettings.victoryCondition === 'survival') {
        const minutes = Math.floor(game.survivalTime / 60000);
        const seconds = Math.floor((game.survivalTime % 60000) / 1000);
        document.getElementById('survivalTime').textContent = `${minutes}m ${seconds}s`;
        document.getElementById('survivalTimeDisplay').classList.remove('hidden');
    } else {
        document.getElementById('survivalTimeDisplay').classList.add('hidden');
    }

    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function victory() {
    game.isRunning = false;

    document.getElementById('victoryScore').textContent = game.score;
    document.getElementById('victorySize').textContent = Math.floor(game.player.size);
    document.getElementById('victoryScreen').classList.remove('hidden');
}

// Initialize when page loads
window.addEventListener('load', init);
