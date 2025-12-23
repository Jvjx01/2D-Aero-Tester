import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

/**
 * Chaikin's Algorithm for Curve Smoothing (Selective)
 * Iteratively cuts corners to smooth a polygon, but only for vertices marked as smooth.
 * @param {Array} points - Array of {x, y, isSmooth} objects
 * @param {number} iterations - Number of smoothing passes (default 3)
 */
function getCurvePoints(points, iterations = 3) {
    if (points.length < 3) return points;

    let currentPoints = [...points];

    for (let iter = 0; iter < iterations; iter++) {
        const nextPoints = [];
        const n = currentPoints.length;

        for (let i = 0; i < n; i++) {
            const p1 = currentPoints[i];
            const p2 = currentPoints[(i + 1) % n]; // Wrap around for closed loop

            // Only smooth if the current vertex (p1) is marked as smooth
            if (p1.isSmooth) {
                // First point (75% p1, 25% p2)
                nextPoints.push({
                    x: 0.75 * p1.x + 0.25 * p2.x,
                    y: 0.75 * p1.y + 0.25 * p2.y,
                    isSmooth: true // New points inherit smoothness
                });

                // Second point (25% p1, 75% p2)
                nextPoints.push({
                    x: 0.25 * p1.x + 0.75 * p2.x,
                    y: 0.25 * p1.y + 0.75 * p2.y,
                    isSmooth: true
                });
            } else {
                // Keep the sharp corner
                nextPoints.push({ ...p1 });
            }
        }
        currentPoints = nextPoints;
    }
    return currentPoints;
}

/**
 * Generate standard bullet profile
 * @param {string} type - 'round' | 'spitzer' | 'boat-tail'
 * @returns {Array} Array of {x, y} points
 */
function generateBullet(type) {
    const points = [];

    // Scale Factor: Pixels per Millimeter
    const PxPerMM = 5;

    // Real-world Projectile Dimensions (approximate mm)
    // 9mm: ~15mm length, 9mm dia
    // 45 ACP: ~16mm length, 11.4mm dia
    // 5.56 NATO (M855): ~23mm length, 5.7mm dia
    // 7.62 NATO (M80): ~29mm length, 7.82mm dia
    // .50 BMG (M33): ~58mm length, 12.95mm dia
    const specs = {
        '9mm': { len: 15.0, dia: 9.0, nose: 'round', hasBoatTail: false },
        '45acp': { len: 16.0, dia: 11.4, nose: 'round', hasBoatTail: false },
        '5.56mm': { len: 23.0, dia: 5.7, nose: 'spitzer', hasBoatTail: true },
        '7.62mm': { len: 29.0, dia: 7.8, nose: 'spitzer', hasBoatTail: true },
        '50bmg': { len: 58.0, dia: 13.0, nose: 'spitzer', hasBoatTail: true }
    };

    const spec = specs[type] || specs['9mm'];

    // Convert mm to pixels
    const length = spec.len * PxPerMM;
    const diameter = spec.dia * PxPerMM;
    const radius = diameter / 2;

    // ORIENTATION: Left (x=0) is Nose, Right (x=length) is Base

    if (spec.nose === 'round') {
        // Round Nose (Pistol)

        // --- Top Profile ---
        const topPoints = [];

        // 1. Nose Tip (0, 0)
        topPoints.push({ x: 0, y: 0 });

        // 2. Ogive/Round Curve
        const noseLen = diameter * 0.8; // Short nose for pistol
        for (let i = 1; i <= 10; i++) {
            const t = i / 10;
            // Elliptical nose
            const xx = noseLen * t;
            // y = -radius * sqrt(1 - (x-noseLen)^2/noseLen^2)
            const yy = -radius * Math.sqrt(1 - Math.pow((xx - noseLen) / noseLen, 2));
            topPoints.push({ x: xx, y: yy });
        }

        // 3. Body (Cylinder)
        const bodyLen = length - noseLen;
        topPoints.push({ x: length, y: -radius });

        // --- Bottom Mirror ---
        const bottomPoints = topPoints.map(p => ({ x: p.x, y: -p.y })).reverse();

        // Combine
        points.push(...topPoints);
        points.push({ x: length, y: radius }); // Base vertical
        points.push(...bottomPoints);

    } else if (spec.nose === 'spitzer') {
        const topPoints = [];

        // Boat Tail setup
        const boatTailLen = spec.hasBoatTail ? diameter * 0.8 : 0;
        const baseRadius = spec.hasBoatTail ? radius * 0.7 : radius;

        const noseLen = length * 0.45; // Longer nose for rifles
        const bodyLen = length - noseLen - boatTailLen;

        // 1. Nose Tip (0,0)
        topPoints.push({ x: 0, y: 0 });

        // 2. Tangent Ogive (Approximated)
        for (let i = 1; i <= 20; i++) {
            const t = i / 20;
            const px = noseLen * t;
            // Power series approx for secant ogive / spitzer
            const py = -radius * Math.pow(t, 0.65);
            topPoints.push({ x: px, y: py });
        }

        // 3. Cylinder Body
        topPoints.push({ x: noseLen + bodyLen, y: -radius });

        // 4. Boat Tail (if any)
        if (spec.hasBoatTail) {
            topPoints.push({ x: length, y: -baseRadius });
        } else {
            topPoints.push({ x: length, y: -radius });
        }

        // --- Bottom Mirror ---
        const bottomPoints = topPoints.map(p => ({ x: p.x, y: -p.y })).reverse();

        points.push(...topPoints);
        // Base closure
        points.push({ x: length, y: baseRadius });
        points.push(...bottomPoints);
    }

    return points;
}


/**
 * Generate NACA 4-Digit Airfoil
 * @param {string} code - 4 digit code (e.g., '2412')
 * @returns {Array} Array of {x, y} points
 */
function generateNACA4(code) {
    if (code.length !== 4 || isNaN(code)) return [];

    const m = parseInt(code[0]) / 100; // Max camber
    const p = parseInt(code[1]) / 10;  // Position of max camber
    const t = parseInt(code.slice(2)) / 100; // Max thickness

    const pointsUpper = [];
    const pointsLower = [];
    const numPoints = 100;
    const chord = 200;

    for (let i = 0; i <= numPoints; i++) {
        // Beta distribution for cosine spacing (cluster points at LE/TE)
        const beta = i / numPoints;
        const x = chord * (0.5 * (1 - Math.cos(Math.PI * beta))); // 0 to chord

        const xc = x / chord;

        // Thickness distribution
        const yt = 5 * t * chord * (
            0.2969 * Math.sqrt(xc) -
            0.1260 * xc -
            0.3516 * Math.pow(xc, 2) +
            0.2843 * Math.pow(xc, 3) -
            0.1015 * Math.pow(xc, 4)
        );

        // Camber line and gradient
        let yc = 0;
        let dyc_dx = 0;

        if (m === 0) {
            // Symmetric
            yc = 0;
            dyc_dx = 0;
        } else {
            if (xc < p) {
                yc = (m / (p * p)) * (2 * p * xc - xc * xc);
                dyc_dx = (2 * m / (p * p)) * (p - xc);
            } else {
                yc = (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * xc - xc * xc);
                dyc_dx = (2 * m / ((1 - p) * (1 - p))) * (p - xc);
            }
        }

        // Convert unit camber to chord scale
        yc *= chord;

        const theta = Math.atan(dyc_dx);

        const xu = x - yt * Math.sin(theta);
        const yu = yc + yt * Math.cos(theta);

        const xl = x + yt * Math.sin(theta);
        const yl = yc - yt * Math.cos(theta);

        pointsUpper.push({ x: xu, y: -yu }); // -y because canvas y is down
        pointsLower.push({ x: xl, y: -yl });
    }

    // Combine: Upper (LE to TE) then Lower (TE to LE)
    // Reverse lower to go from TE back to LE
    return [...pointsUpper, ...pointsLower.reverse()];
}

/**
 * Calculate particle color based on view mode and particle state
 * @param {Object} particle - Particle object with vx, vy, heat properties
 * @param {string} mode - View mode: 'smoke' | 'velocity' | 'pressure'
 * @returns {Object} Color object with r, g, b, a properties
 */
function getParticleColor(particle, mode) {
    const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    let r, g, b, a;

    if (mode === 'velocity') {
        // Velocity Mode: Deep Blue (Slow) -> Cyan -> Yellow -> Bright Red (Fast)
        const norm = Math.min(1.0, Math.max(0, speed / 6.0));

        if (norm < 0.33) {
            // Deep Blue to Cyan (0-33%)
            const t = norm / 0.33;
            r = 0;
            g = Math.floor(180 * t);
            b = 255;
        } else if (norm < 0.66) {
            // Cyan to Yellow (33-66%)
            const t = (norm - 0.33) / 0.33;
            r = Math.floor(255 * t);
            g = 180 + Math.floor(75 * t);
            b = Math.floor(255 * (1 - t));
        } else {
            // Yellow to Bright Red (66-100%)
            const t = (norm - 0.66) / 0.34;
            r = 255;
            g = Math.floor(255 * (1 - t));
            b = 0;
        }
        a = particle.heat > 0 ? 1.0 : 0.9;

    } else if (mode === 'pressure') {
        // Pressure View (Bernoulli): High V = Low P
        // Bright Red = High Pressure (Stagnation/Slow)
        // Deep Blue = Low Pressure (Fast)
        const norm = Math.min(1.0, Math.max(0, speed / 6.0));

        if (norm < 0.33) {
            // Bright Red to Magenta (0-33%)
            const t = norm / 0.33;
            r = 255;
            g = 0;
            b = Math.floor(180 * t);
        } else if (norm < 0.66) {
            // Magenta to Cyan (33-66%)
            const t = (norm - 0.33) / 0.33;
            r = Math.floor(255 * (1 - t));
            g = Math.floor(180 * t);
            b = 180 + Math.floor(75 * t);
        } else {
            // Cyan to Deep Blue (66-100%)
            const t = (norm - 0.66) / 0.34;
            r = 0;
            g = Math.floor(180 * (1 - t));
            b = 255;
        }
        a = particle.heat > 0 ? 1.0 : 0.9;

    } else {
        // 'smoke' - Default White
        if (particle.heat > 0) {
            // Red pulse for crash
            r = 255;
            g = Math.floor(255 * (1 - particle.heat));
            b = Math.floor(255 * (1 - particle.heat));
            a = particle.heat;
        } else {
            r = 255;
            g = 255;
            b = 255;
            a = 0.4;
        }
    }

    return { r, g, b, a };
}
const SimulationCanvas = ({ params, onRun, onSave, currentResult, onAngleChange, isSaving, saveMessage, loadedShape, simSettings }) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null); // Fabric canvas element
    const fabricRef = useRef(null); // Fabric instance
    const overlayRef = useRef(null); // Particle canvas
    const animationRef = useRef(null); // Animation frame ID
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSymmetric, setIsSymmetric] = useState(false); // Symmetry mode state
    const [isSmooth, setIsSmooth] = useState(false); // Smooth curve state
    const [showBulletMenu, setShowBulletMenu] = useState(false); // Bullet dropdown
    const [showNacaInput, setShowNacaInput] = useState(false); // NACA input
    const [nacaCode, setNacaCode] = useState('0012'); // Default NACA code
    const [viewMode, setViewMode] = useState('smoke'); // 'smoke' | 'velocity' | 'pressure'
    const viewModeRef = useRef('smoke'); // Ref for animation loop access

    // Sync ref
    useEffect(() => {
        viewModeRef.current = viewMode;
    }, [viewMode]);

    const [drawPoints, setDrawPoints] = useState([]);
    const isDrawingRef = useRef(false);
    const drawPointsRef = useRef([]);
    const tempObjects = useRef([]);
    const currentLine = useRef(null);
    const mousePos = useRef({ x: 0, y: 0 });
    const isPaused = useRef(false); // Control particle animation

    // Particle System State

    const particles = useRef([]);
    // We need to access current params inside the animation loop without stale closures.
    const paramsRef = useRef(params);
    const isSmoothRef = useRef(false); // Ref to access smooth state in event listener

    // Update ref when params change
    useEffect(() => {
        paramsRef.current = params;
    }, [params]);

    // Update isSmoothRef when state changes
    useEffect(() => {
        isSmoothRef.current = isSmooth;
    }, [isSmooth]);

    // Initialize Fabric
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            backgroundColor: '#0f172a', // Slate 900
            selection: true
        });

        fabricRef.current = canvas;

        // Mouse Events for Drawing
        canvas.on('mouse:down', (options) => {
            if (!isDrawingRef.current || !fabricRef.current) return;
            const pointer = fabricRef.current.getPointer(options.e);

            // Add Point with Smoothness property
            const smoothState = isSmoothRef.current;
            const newPoint = { x: pointer.x, y: pointer.y, isSmooth: smoothState };
            drawPointsRef.current.push(newPoint);
            setDrawPoints([...drawPointsRef.current]);

            // Draw Visual Feedback
            const circle = new fabric.Circle({
                left: newPoint.x,
                top: newPoint.y,
                strokeWidth: 2,
                radius: 4,
                fill: smoothState ? '#f472b6' : '#fff', // Pink for smooth, White for sharp
                stroke: smoothState ? '#db2777' : '#38bdf8', // Darker pink vs Blue
                originX: 'center',
                originY: 'center',
                selectable: false // Not selectable
            });
            fabricRef.current.add(circle);
            tempObjects.current.push(circle);

            // If there's a previous point, draw a permanent line
            if (drawPointsRef.current.length > 1) {
                const prev = drawPointsRef.current[drawPointsRef.current.length - 2];
                const line = new fabric.Line([prev.x, prev.y, newPoint.x, newPoint.y], {
                    stroke: '#38bdf8',
                    strokeWidth: 2,
                    selectable: false
                });
                fabricRef.current.add(line);
                tempObjects.current.push(line);
            }

            fabricRef.current.requestRenderAll();
        });

        canvas.on('mouse:move', (options) => {
            if (!isDrawingRef.current || !fabricRef.current || drawPointsRef.current.length === 0) return;
            const pointer = fabricRef.current.getPointer(options.e);

            if (currentLine.current) {
                fabricRef.current.remove(currentLine.current);
            }

            const lastPoint = drawPointsRef.current[drawPointsRef.current.length - 1];
            currentLine.current = new fabric.Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
                stroke: '#38bdf8',
                strokeWidth: 1,
                strokeDashArray: [5, 5],
                selectable: false
            });
            fabricRef.current.add(currentLine.current);
            fabricRef.current.requestRenderAll();
        });

        // Handle Rotation Event from Canvas to React State
        canvas.on('object:modified', (e) => {
            if (e.target && (e.target.angle !== undefined)) {
                // Normalize angle to 0-360
                let angle = e.target.angle % 360;
                if (angle < 0) angle += 360;
                if (onAngleChange) onAngleChange(angle);
            }
        });

        // Handle Resize
        const handleResize = () => {
            canvas.setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
            if (overlayRef.current) {
                overlayRef.current.width = containerRef.current.clientWidth;
                overlayRef.current.height = containerRef.current.clientHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Init size

        // Default Shape
        addRect();

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.dispose();
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    // Sync React 'angle' state -> Fabric Object
    // We only update if the difference is significant to avoid loops with the Modified listener
    useEffect(() => {
        if (!fabricRef.current) return;
        const activeObject = fabricRef.current.getObjects()[0];

        if (activeObject) {
            if (Math.abs(activeObject.angle - params.angle) > 0.5) {
                activeObject.set('angle', params.angle);
                activeObject.setCoords();
                fabricRef.current.requestRenderAll();
            }
        }
    }, [params.angle]);

    // Load shape when loadedShape prop changes
    useEffect(() => {
        if (!loadedShape || !fabricRef.current) return;

        // Clear the canvas
        fabricRef.current.clear();

        // Recreate the shape from the loaded data
        if (loadedShape.points && loadedShape.points.length > 0) {
            // Convert points array to objects
            const points = loadedShape.points.map(p => ({ x: p[0], y: p[1] }));

            // Calculate centroid
            const centroid = {
                x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
                y: points.reduce((sum, p) => sum + p.y, 0) / points.length
            };

            // Create relative points
            const relativePts = points.map(p => ({
                x: p.x - centroid.x,
                y: p.y - centroid.y
            }));

            const poly = new fabric.Polygon(relativePts, {
                left: centroid.x,
                top: centroid.y,
                fill: '#94a3b8',
                originX: 'center',
                originY: 'center',
                centeredRotation: true,
                angle: params.angle // Apply the loaded angle
            });

            fabricRef.current.add(poly);
            fabricRef.current.requestRenderAll();
        }
    }, [loadedShape]);

    // Particle Animation Loop
    useEffect(() => {
        const canvas = overlayRef.current;
        if (!canvas) return;
        // Enable hardware acceleration by indicating we won't read pixels frequently
        const ctx = canvas.getContext('2d', { willReadFrequently: false });

        // Init particles (Phase 4: 600 particles)
        const particleCount = simSettings?.particleCount ?? 600; // Use setting or default
        particles.current = []; // Clear
        for (let i = 0; i < particleCount; i++) {
            particles.current.push(createParticle(canvas.width, canvas.height));
        }

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const width = canvas.width;
            const height = canvas.height;

            const speedFactor = paramsRef.current.windSpeed / 20;

            const obj = fabricRef.current ? fabricRef.current.getObjects()[0] : null;

            // Skip particle updates if paused or windSpeed is 0 (freeze particles)
            if (!isPaused.current && speedFactor > 0) {





                particles.current.forEach(p => {
                    // 1. Save current position for trail
                    p.trail.unshift({ x: p.x, y: p.y });

                    // Limit trail length: Lines (Max always: 80)
                    const maxTrail = 80;
                    if (p.trail.length > maxTrail) {
                        p.trail.pop();
                    }

                    // 2. Move (Always move, even if hot/colliding, unless strictly frozen for some other reason)
                    p.x += p.vx * speedFactor;
                    p.y += p.vy * speedFactor;

                    // FLOW RECOVERY: Gradually dampen vertical velocity to return to horizontal flow
                    // This simulates how real fluids reattach to the freestream after passing an obstacle
                    const dampingFactor = simSettings?.dampingFactor ?? 0.20; // Use setting or default
                    p.vy *= dampingFactor;

                    // STAGNATION DETECTION: Reset particles that get stuck
                    const movementDist = Math.sqrt((p.x - p.lastX) ** 2 + (p.y - p.lastY) ** 2);
                    if (movementDist < 0.5) {  // Barely moving
                        p.stagnantFrames++;
                        if (p.stagnantFrames > 30) {  // Stuck for 30 frames (~0.5 seconds)
                            resetParticle(p, width, height);
                            p.trail = [];
                            return;
                        }
                    } else {
                        p.stagnantFrames = 0;  // Reset counter if moving
                        p.lastX = p.x;
                        p.lastY = p.y;
                    }

                    // Reset if out of bounds (Any side)
                    if (p.x > width || p.x < -20 || p.y < -20 || p.y > height + 20) {
                        resetParticle(p, width, height);
                        // Critical: Ensure trail is empty so next frame doesn't draw a streak
                        p.trail = [];
                        return; // Skip drawing this frame for this particle

                    }

                    // 3. Heat decay for "dying" particles
                    if (p.heat > 0) {
                        p.heat -= 0.15;  // Decay over ~6 frames
                        if (p.heat <= 0) {
                            // Heat fully decayed - reset particle
                            resetParticle(p, width, height);
                            return;
                        }
                    }

                    // INSIDE-OBJECT DETECTION: Reset particles that penetrate inside
                    if (obj && isPointInPolygon({ x: p.x, y: p.y }, obj)) {
                        resetParticle(p, width, height);
                        p.trail = [];
                        return;
                    }

                    // --- STEERING / FIELD LOGIC ---
                    // Apply repulsion force *before* moving to curve trajectories
                    if (obj && p.heat <= 0) {
                        // Quick Bound Check (Optimization)
                        // Expand bounds by influence radius (e.g., 50px)
                        const influenceRad = simSettings?.influenceRadius ?? 25; // Use setting or default
                        const boundX = obj.left; // Center X (usually)
                        const boundY = obj.top;  // Center Y
                        // Note: Fabric objects center vs top-left depends on origin. 
                        // We used originX: 'center', originY: 'center' for all shapes.
                        // So bounds are roughly center +/- width/2 + radius
                        // Simple AABB check:
                        const oWidth = obj.width * obj.scaleX;
                        const oHeight = obj.height * obj.scaleY;

                        // Check if particle is roughly near the object
                        if (Math.abs(p.x - boundX) < (oWidth / 2 + influenceRad) &&
                            Math.abs(p.y - boundY) < (oHeight / 2 + influenceRad)) {

                            // DOWNSTREAM DETECTION: Check if particle is behind the object
                            // For left-to-right flow, "behind" means x > object center + half width
                            const isDownstream = p.x > (boundX + oWidth / 2);

                            // Detailed Proximity
                            const proj = getClosestPointOnPolygonWithNormal({ x: p.x, y: p.y }, obj);
                            if (proj && proj.normal) {
                                const distSq = (p.x - proj.point.x) ** 2 + (p.y - proj.point.y) ** 2;
                                const dist = Math.sqrt(distSq);

                                if (dist < influenceRad && dist > 0) {

                                    // ESCAPE MECHANISM for trapped particles at trailing edge/vertices
                                    if (isDownstream && p.vx < 3) {
                                        // Particle is behind object and moving slowly - likely trapped
                                        // Give it a strong forward boost to escape
                                        p.vx = 3 + Math.random() * 1.5;
                                        // Also reduce vertical influence to let it escape
                                        p.vy *= 0.5;
                                    } else {
                                        // Normal steering for upstream particles
                                        // FLUID CONSTRAINT: Water/Air maintains forward flow
                                        // Only apply VERTICAL deflection to steer around obstacles
                                        // Do NOT push backwards or reduce horizontal momentum

                                        const strength = isDownstream ? 0.3 : (simSettings?.steeringStrength ?? 0.8); // Use setting or default
                                        const factor = Math.pow(1 - dist / influenceRad, 2) * strength;

                                        // Only apply the VERTICAL component of the normal
                                        // This steers particles up/down around obstacles without affecting forward flow
                                        p.vy += proj.normal.y * factor;

                                        // Ensure forward momentum is maintained or slightly increased (Bernoulli effect)
                                        // Never let horizontal velocity go backwards
                                        if (p.vx < 2) {
                                            p.vx = 2 + Math.random() * 0.5;
                                        }

                                        // Limit vertical deflection to prevent "flying away"
                                        const maxVertical = simSettings?.maxVerticalVelocity ?? 2.0; // Use setting or default
                                        if (Math.abs(p.vy) > maxVertical) {
                                            p.vy = Math.sign(p.vy) * maxVertical;
                                        }
                                    }
                                }
                            }
                        }
                    } // --- END STEERING ---

                    // 4. Collision Detection (Continuous + Surface-Only)
                    // Decrement cooldown
                    if (p.collisionCooldown > 0) {
                        p.collisionCooldown--;
                    }

                    let isColliding = false;
                    let collisionNormal = null;

                    // Only check collision if cooldown is 0. 
                    // We allow checking even if high heat, to bounce again potentially? 
                    // Usually just check if cooldown is 0.
                    if (obj && p.collisionCooldown === 0) {
                        // Save previous position (from trail, before we added current pos)
                        const prevPos = p.trail.length >= 2 ? p.trail[1] : { x: p.x - p.vx * speedFactor, y: p.y - p.vy * speedFactor };
                        const currPos = { x: p.x, y: p.y };

                        // CONTINUOUS COLLISION: Check if path crossed any edge (high-speed tunneling prevention)
                        const pathIntersection = checkPathIntersection(prevPos, currPos, obj);

                        if (pathIntersection) {
                            // Path crossed an edge - move particle to intersection point
                            isColliding = true;
                            p.x = pathIntersection.point.x;
                            p.y = pathIntersection.point.y;
                            collisionNormal = pathIntersection.normal;
                        } else {
                            // PROXIMITY CHECK: Standard distance-based detection for slower particles
                            const proj = getClosestPointOnPolygonWithNormal(currPos, obj);
                            const threshold = p.size * 1.5;

                            if (proj) {
                                const distSq = (currPos.x - proj.point.x) ** 2 + (currPos.y - proj.point.y) ** 2;
                                if (distSq <= threshold * threshold) {
                                    isColliding = true;
                                    collisionNormal = proj.normal;
                                    // Snap to surface to prevent sticking
                                    p.x = proj.point.x + collisionNormal.x * (threshold + 0.1);
                                    p.y = proj.point.y + collisionNormal.y * (threshold + 0.1);
                                }
                            }
                        }

                        // Handle collision: Flow / Slide (Tangential Projection)
                        if (isColliding && collisionNormal) {
                            // Current Velocity Vector P
                            // Normal N
                            // Tangent T = V - (V.N)N
                            const dot = p.vx * collisionNormal.x + p.vy * collisionNormal.y;

                            // Only apply if the particle is moving INTO the wall (dot < 0)
                            // If dot > 0, it's already moving away, so leave it be.
                            if (dot < 0) {
                                // Calculate Tangent Vector
                                let tx = p.vx - dot * collisionNormal.x;
                                let ty = p.vy - dot * collisionNormal.y;

                                // Normalize Tangent
                                const tLen = Math.sqrt(tx * tx + ty * ty);

                                if (tLen > 0.001) {
                                    // Preserve Speed (or apply slight friction)
                                    const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                                    const newSpeed = currentSpeed * 0.95; // 5% friction for "viscosity" feel

                                    p.vx = (tx / tLen) * newSpeed;
                                    p.vy = (ty / tLen) * newSpeed;
                                } else {
                                    // If hitting straight on (no tangent), spread out randomly?
                                    // Or just kill normal component (stop).
                                    // Let's add a small random deflection to prevent taking 0 velocity forever
                                    p.vx = p.vx * -0.5 + (Math.random() - 0.5);
                                    p.vy = p.vy * -0.5 + (Math.random() - 0.5);
                                }

                                // Push out of surface slightly more aggressively to prevent sticking
                                p.x += collisionNormal.x * 1.5;
                                p.y += collisionNormal.y * 1.5;
                            }

                            // No Red Flash - Fluid Look
                            // p.heat = 0; 
                            p.collisionCooldown = 2;
                        }
                    }

                    // 5. Draw Particle (Trail + Head)
                    // Use optimized color calculation function
                    const color = getParticleColor(p, viewModeRef.current);

                    // Set styles
                    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
                    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a * 0.3})`;

                    // Draw Trail
                    if (p.trail.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(p.trail[0].x, p.trail[0].y);
                        for (let j = 1; j < p.trail.length; j++) {
                            ctx.lineTo(p.trail[j].x, p.trail[j].y);
                        }
                        ctx.shadowBlur = 0;
                        ctx.stroke();
                    }

                    // Draw Head
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                });
            } // End of particle update block

            // Draw frozen particles when windSpeed is 0 (but not when paused for drawing mode)
            if (!isPaused.current && speedFactor === 0) {
                particles.current.forEach(p => {
                    // Use optimized color calculation function
                    const color = getParticleColor(p, viewModeRef.current);

                    // Set styles
                    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
                    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a * 0.3})`;

                    // Draw Trail
                    if (p.trail.length > 1) {
                        ctx.beginPath();
                        ctx.moveTo(p.trail[0].x, p.trail[0].y);
                        for (let j = 1; j < p.trail.length; j++) {
                            ctx.lineTo(p.trail[j].x, p.trail[j].y);
                        }
                        ctx.shadowBlur = 0;
                        ctx.stroke();
                    }

                    // Draw Head
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            drawGrid(ctx, width, height);
            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationRef.current);
    }, [simSettings]); // Reinitialize when settings change

    // --- Helpers ---

    /**
     * Checks if the particle's path (line segment from prev to curr) intersects any edge of the shape.
     * Returns the intersection point and normal if a collision occurred.
     */
    const checkPathIntersection = (prevPos, currPos, obj) => {
        const vertices = getVertices(obj);
        let closestIntersection = null;
        let minT = Infinity; // Parameter along the particle path (0 = prevPos, 1 = currPos)

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];

            // Check line-line intersection between particle path and edge
            const intersection = lineSegmentIntersection(prevPos, currPos, a, b);

            if (intersection && intersection.t < minT) {
                minT = intersection.t;

                // Calculate normal for this edge
                const edgeX = b.x - a.x;
                const edgeY = b.y - a.y;
                const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

                let normalX = -edgeY / edgeLen;
                let normalY = edgeX / edgeLen;

                // Ensure normal points toward particle direction
                const particleDirX = currPos.x - prevPos.x;
                const particleDirY = currPos.y - prevPos.y;
                const dot = normalX * particleDirX + normalY * particleDirY;

                if (dot > 0) {
                    normalX = -normalX;
                    normalY = -normalY;
                }

                closestIntersection = {
                    point: { x: intersection.x, y: intersection.y },
                    normal: { x: normalX, y: normalY }
                };
            }
        }

        return closestIntersection;
    };

    /**
     * Line segment intersection between (p1, p2) and (p3, p4).
     * Returns intersection point and t parameter if they intersect, null otherwise.
     */
    const lineSegmentIntersection = (p1, p2, p3, p4) => {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 1e-10) {
            return null; // Parallel or coincident
        }

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            // Intersection exists
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1),
                t: t  // How far along the first segment (0-1)
            };
        }

        return null; // No intersection
    };

    /**
     * Point-in-polygon test using ray casting algorithm
     * Returns true if point is inside the polygon
     */
    const isPointInPolygon = (point, obj) => {
        const vertices = getVertices(obj);
        let inside = false;

        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    };

    // --- Geometry Helper Functions ---

    /**
     * Calculates the minimum distance from a point to the shape's surface/perimeter.
     */
    const getDistanceToSurface = (p, obj) => {
        const vertices = getVertices(obj);
        let minDistSq = Infinity;

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const proj = getClosestPointOnSegment(p, a, b);
            const distSq = (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
            }
        }
        return Math.sqrt(minDistSq);
    };

    /**
     * Projects a point P onto the nearest edge of the Fabric object.
     * Returns both the closest point and the outward-facing normal vector.
     */
    const getClosestPointOnPolygonWithNormal = (p, obj) => {
        const vertices = getVertices(obj);
        let minDistSq = Infinity;
        let closestPt = null;
        let closestNormal = null;

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const proj = getClosestPointOnSegment(p, a, b);
            const distSq = (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestPt = proj;

                // Calculate normal (perpendicular to edge, pointing outward)
                const edgeX = b.x - a.x;
                const edgeY = b.y - a.y;
                const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

                // Perpendicular vector (rotate edge 90 degrees)
                let normalX = -edgeY / edgeLen;
                let normalY = edgeX / edgeLen;

                // Ensure normal points away from shape (toward the particle)
                const toParticleX = p.x - proj.x;
                const toParticleY = p.y - proj.y;
                const dot = normalX * toParticleX + normalY * toParticleY;

                if (dot < 0) {
                    // Flip normal if it's pointing inward
                    normalX = -normalX;
                    normalY = -normalY;
                }

                closestNormal = { x: normalX, y: normalY };
            }
        }

        return closestPt ? { point: closestPt, normal: closestNormal } : null;
    };

    /**
     * Projects a point P onto the nearest edge of the Fabric object.
     */
    const getClosestPointOnPolygon = (p, obj) => {
        const vertices = getVertices(obj);
        let minDistSq = Infinity;
        let closestPt = null;

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const proj = getClosestPointOnSegment(p, a, b);
            const distSq = (p.x - proj.x) ** 2 + (p.y - proj.y) ** 2;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestPt = proj;
            }
        }
        return closestPt;
    };

    /**
     * Gets the absolute vertices of a Fabric object (Rect or Triangle).
     */
    const getVertices = (obj) => {
        // Fabric's calcTransformMatrix() returns the matrix to transform local points to canvas coords.
        const matrix = obj.calcTransformMatrix();
        const w = obj.width;
        const h = obj.height;

        let localPoints;
        if (obj.type === 'triangle') {
            localPoints = [
                { x: 0, y: -h / 2 },
                { x: -w / 2, y: h / 2 },
                { x: w / 2, y: h / 2 }
            ];
        } else if (obj.type === 'polygon' || obj.type === 'polyline') {
            // Polygon/Polyline: Use its points (relative to center)
            localPoints = obj.get('points');
        } else if (obj.type === 'circle') {
            // Circle approximation: Generate 64 points
            const radius = obj.radius;
            localPoints = [];
            for (let i = 0; i < 64; i++) {
                const angle = (i / 64) * Math.PI * 2;
                localPoints.push({
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius
                });
            }
        } else {
            // Rect (or fallback): 4 Corners
            localPoints = [
                { x: -w / 2, y: -h / 2 },
                { x: w / 2, y: -h / 2 },
                { x: w / 2, y: h / 2 },
                { x: -w / 2, y: h / 2 }
            ];
        }

        return localPoints.map(pt => {
            // Polygon/Polyline points are relative to the object's top-left (usually).
            // We need to shift them by pathOffset to get them relative to the object's origin (center)
            // if that's what the matrix expects.
            // Actually, for Polygon, 'points' are relative to the bounding box top-left.
            // But the transform matrix (with origin center) maps from the center.
            // So we need: point - pathOffset
            const offset = obj.pathOffset || { x: 0, y: 0 };
            const p = new fabric.Point(pt.x - offset.x, pt.y - offset.y);

            const transformed = fabric.util.transformPoint(p, matrix);
            return { x: transformed.x, y: transformed.y };
        });
    };

    /**
     * Returns closest point on segment AB to point P.
     */
    const getClosestPointOnSegment = (p, a, b) => {
        const ax = a.x, ay = a.y;
        const bx = b.x, by = b.y;
        const px = p.x, py = p.y;

        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;

        // Project AP onto AB (dot product)
        const t = (apx * abx + apy * aby) / (abx * abx + aby * aby);

        // Clamp t to segment [0, 1]
        const clampedT = Math.max(0, Math.min(1, t));

        return {
            x: ax + abx * clampedT,
            y: ay + aby * clampedT
        };
    };

    const createParticle = (w, h) => {
        // Central Bias
        const randY = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
        const y = (randY * 1.4 - 0.2) * h;
        return {
            x: Math.random() * w,
            y: Math.max(0, Math.min(h, y)),
            vx: 3, // Fixed uniform speed for laminar look
            vy: 0,
            size: 1.5 + Math.random() * 1.5,
            alpha: 0.4 + Math.random() * 0.4,
            heat: 0,
            trail: [],
            collisionCooldown: 0,  // Frames to ignore collision after deflection
            lastX: Math.random() * w,  // Track position for stagnation detection
            lastY: Math.max(0, Math.min(h, y)),
            stagnantFrames: 0  // Count frames without movement
        };
    };

    const resetParticle = (p, w, h) => {
        p.x = -10;
        const randY = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
        const y = (randY * 1.4 - 0.2) * h;
        p.y = Math.max(0, Math.min(h, y));
        p.vx = 3;  // CRITICAL: Restore velocity to uniform
        p.vy = 0;
        p.heat = 0;
        p.trail = [];
        p.lastX = p.x;
        p.lastY = p.y;
        p.stagnantFrames = 0;
        p.collisionCooldown = 0;
    };

    const drawGrid = (ctx, w, h) => {
        ctx.strokeStyle = '#1e293b'; // Slate 800
        ctx.lineWidth = 1;
        ctx.beginPath();
        const step = 50;
        for (let x = 0; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
    };

    // --- Shape Actions ---

    const addRect = () => {
        if (!fabricRef.current) return;
        fabricRef.current.clear();
        const rect = new fabric.Rect({
            left: 300, top: 250, fill: '#94a3b8', width: 100, height: 20,
            originX: 'center', originY: 'center',
            centeredRotation: true
        });
        fabricRef.current.add(rect);
    };

    const addTriangle = () => {
        if (!fabricRef.current) return;
        fabricRef.current.clear();
        const tri = new fabric.Triangle({
            left: 300, top: 250, fill: '#94a3b8', width: 100, height: 100,
            originX: 'center', originY: 'center'
        });
        fabricRef.current.add(tri);
    };

    const addCircle = () => {
        if (!fabricRef.current) return;
        fabricRef.current.clear();
        const circle = new fabric.Circle({
            left: 300, top: 250, fill: '#94a3b8', radius: 50,
            originX: 'center', originY: 'center'
        });
        fabricRef.current.add(circle);
    };

    const addBullet = (type) => {
        if (!fabricRef.current) return;
        fabricRef.current.clear();
        const points = generateBullet(type).map(p => ({ x: p.x + 300, y: p.y + 250 }));

        const poly = new fabric.Polygon(points, {
            left: 300, top: 250, fill: '#94a3b8',
            originX: 'center', originY: 'center',
            centeredRotation: true
        });

        fabricRef.current.add(poly);
        setShowBulletMenu(false);
    };

    const addNaca = () => {
        if (!fabricRef.current) return;
        const points = generateNACA4(nacaCode).map(p => ({ x: p.x + 300, y: p.y + 250 }));
        if (points.length === 0) return;

        fabricRef.current.clear();

        const poly = new fabric.Polygon(points, {
            left: 300, top: 250, fill: '#94a3b8',
            originX: 'center', originY: 'center',
            centeredRotation: true
        });

        fabricRef.current.add(poly);
        setShowNacaInput(false);
    };

    const startDrawing = () => {
        if (!fabricRef.current) return;
        fabricRef.current.clear();
        isDrawingRef.current = true;
        setIsDrawing(true);
        drawPointsRef.current = [];
        setDrawPoints([]);
        tempObjects.current = [];
        isPaused.current = true; // Pause particles
    };

    const cancelDrawing = () => {
        isDrawingRef.current = false;
        setIsDrawing(false);
        isPaused.current = false; // Resume particles
        if (fabricRef.current) {
            fabricRef.current.clear();
            addRect(); // Default back
        }
    };

    const finishDrawing = () => {
        if (!fabricRef.current || drawPointsRef.current.length < 3) {
            cancelDrawing();
            return;
        }

        const pts = [...drawPointsRef.current];

        // Apply Symmetry if enabled
        if (isSymmetric) {
            // Axis of symmetry is line from P0 to Pn
            const pStart = pts[0];
            const pEnd = pts[pts.length - 1];

            // Calculate normal vector to the chord line
            const dx = pEnd.x - pStart.x;
            const dy = pEnd.y - pStart.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > 0.1) {
                const ux = dx / len;
                const uy = dy / len;
                // Normal (-uy, ux)
                const nx = -uy;
                const ny = ux;

                // Reflect points P(n-1) to P1
                for (let i = pts.length - 2; i > 0; i--) {
                    const p = pts[i];
                    // Vector from start to point
                    const vpx = p.x - pStart.x;
                    const vpy = p.y - pStart.y;

                    // Project onto normal (distance from chord)
                    const dist = vpx * nx + vpy * ny;

                    // Reflection: P' = P - 2 * dist * N
                    const rx = p.x - 2 * dist * nx;
                    const ry = p.y - 2 * dist * ny;

                    pts.push({ x: rx, y: ry, isSmooth: p.isSmooth });
                }
            }
        }

        // Apply Smoothing (Selective based on point properties)
        let finalPoints = pts;
        if (pts.length > 2) {
            // Use Chaikin's Algorithm (Corner Cutting)
            // 4 iterations gives a very smooth, organic look
            finalPoints = getCurvePoints(pts, 4);
        }

        // Calculate centroid for positioning
        const centroid = {
            x: finalPoints.reduce((sum, p) => sum + p.x, 0) / finalPoints.length,
            y: finalPoints.reduce((sum, p) => sum + p.y, 0) / finalPoints.length
        };

        // Adjust points to be relative to centroid
        const relativePts = finalPoints.map(p => ({
            x: p.x - centroid.x,
            y: p.y - centroid.y
        }));

        // Remove temp visuals
        tempObjects.current.forEach(obj => fabricRef.current.remove(obj));
        if (currentLine.current) fabricRef.current.remove(currentLine.current);

        const poly = new fabric.Polygon(relativePts, {
            left: centroid.x,
            top: centroid.y,
            fill: '#94a3b8',
            originX: 'center',
            originY: 'center',
            centeredRotation: true
        });

        fabricRef.current.clear(); // Clear all temp stuff
        fabricRef.current.add(poly);

        isDrawingRef.current = false;
        setIsDrawing(false);
        isPaused.current = false; // Resume particles
        fabricRef.current.requestRenderAll();
    };

    const flipVertical = () => {
        if (!fabricRef.current) return;
        const obj = fabricRef.current.getObjects()[0];
        if (!obj) return;

        // Use Fabric's built-in flipY for all object types
        obj.set('flipY', !obj.flipY);
        obj.setCoords();
        fabricRef.current.requestRenderAll();
    };

    const flipHorizontal = () => {
        if (!fabricRef.current) return;
        const obj = fabricRef.current.getObjects()[0];
        if (!obj) return;

        // Use Fabric's built-in flipX for all object types
        obj.set('flipX', !obj.flipX);
        obj.setCoords();
        fabricRef.current.requestRenderAll();
    };


    const handleRun = () => {
        if (!fabricRef.current) return;
        const obj = fabricRef.current.getObjects()[0];
        if (!obj) return;

        // Capture current state to restore later (including flip state)
        const currentAngle = obj.angle;
        const currentLeft = obj.left;
        const currentTop = obj.top;
        const currentFlipX = obj.flipX || false;
        const currentFlipY = obj.flipY || false;

        // We send "base" points (0 rotation) to the backend.
        // The backend then applies rotation based on the Angle of Attack slider.
        // IMPORTANT: flipX and flipY are preserved in the transformation matrix
        obj.set('angle', 0);
        obj.setCoords();

        // Use our helper to get absolute transformed vertices (at 0 deg)
        const vertices = getVertices(obj);
        const points = vertices.map(v => [v.x, v.y]);

        // Restore state (including flip properties)
        obj.set('angle', currentAngle);
        obj.set('left', currentLeft);
        obj.set('top', currentTop);
        obj.set('flipX', currentFlipX);
        obj.set('flipY', currentFlipY);
        obj.setCoords();

        onRun({ points });
    };

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            {/* Simulation Overlay (Particles) - Background Layer */}
            <canvas
                ref={overlayRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            />

            {/* Editor Canvas - Foreground Layer */}
            <div className="relative z-10 w-full h-full">
                <canvas ref={canvasRef} />
            </div>

            {/* Toolbar - Responsive positioning and sizing */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex flex-wrap gap-1 sm:gap-2 max-w-full pr-2 sm:pr-4">
                {!isDrawing ? (
                    <>
                        <button onClick={addRect} className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[10px] sm:text-xs rounded text-slate-300">
                            Flat Plate
                        </button>
                        <button onClick={addTriangle} className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[10px] sm:text-xs rounded text-slate-300">
                            Wedge
                        </button>
                        <button onClick={addCircle} className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[10px] sm:text-xs rounded text-slate-300">
                            Circle
                        </button>

                        <div className="relative inline-block">
                            <button onClick={() => { setShowBulletMenu(!showBulletMenu); setShowNacaInput(false); }} className="px-3 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs rounded text-slate-300">
                                Bullets ▼
                            </button>
                            {showBulletMenu && (
                                <div className="absolute top-full left-0 mt-1 w-36 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 flex flex-col">
                                    <button onClick={() => addBullet('9mm')} className="px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 border-b border-slate-700">9mm Parabellum</button>
                                    <button onClick={() => addBullet('45acp')} className="px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 border-b border-slate-700">.45 ACP</button>
                                    <button onClick={() => addBullet('5.56mm')} className="px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 border-b border-slate-700">5.56mm NATO</button>
                                    <button onClick={() => addBullet('7.62mm')} className="px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 border-b border-slate-700">7.62mm NATO</button>
                                    <button onClick={() => addBullet('50bmg')} className="px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700">.50 BMG</button>
                                </div>
                            )}
                        </div>

                        <div className="relative inline-block">
                            <button onClick={() => { setShowNacaInput(!showNacaInput); setShowBulletMenu(false); }} className="px-3 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs rounded text-slate-300">
                                NACA Airfoil
                            </button>
                            {showNacaInput && (
                                <div className="absolute top-full left-0 mt-1 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={nacaCode}
                                        onChange={(e) => setNacaCode(e.target.value)}
                                        className="w-16 px-2 py-1 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 focus:border-sky-500 focus:outline-none"
                                        maxLength={4}
                                    />
                                    <button onClick={addNaca} className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-xs rounded text-white font-bold">
                                        Go
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="w-px h-6 bg-slate-700 mx-2"></div>

                        {/* Flip buttons */}
                        <button onClick={flipVertical} className="px-3 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs rounded text-slate-300" title="Flip Vertical">
                            ↕
                        </button>
                        <button onClick={flipHorizontal} className="px-3 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs rounded text-slate-300" title="Flip Horizontal">
                            ↔
                        </button>

                        <div className="w-px h-6 bg-slate-700 mx-2"></div>

                        {/* View Mode Toggles */}
                        <div className="flex bg-slate-800 rounded border border-slate-700 p-0.5">
                            <button
                                onClick={() => setViewMode('smoke')}
                                className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'smoke' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Smoke
                            </button>
                            <button
                                onClick={() => setViewMode('velocity')}
                                className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'velocity' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Vel
                            </button>
                            <button
                                onClick={() => setViewMode('pressure')}
                                className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'pressure' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Pres
                            </button>
                        </div>

                        <div className="w-px h-6 bg-slate-700 mx-2"></div>

                        <button onClick={startDrawing} className="px-3 py-1 bg-sky-600 border border-sky-500 hover:bg-sky-500 text-xs rounded text-white font-bold">
                            Draw Custom
                        </button>
                    </>
                ) : (
                    <>
                        <div className="px-3 py-1 bg-slate-900 border border-slate-700 text-[10px] rounded text-sky-400 flex items-center">
                            <span className="animate-pulse mr-2">●</span> DRAWING MODE
                        </div>
                        <label className="flex items-center space-x-2 cursor-pointer bg-slate-900 px-2 py-1 rounded border border-slate-700">
                            <input
                                type="checkbox"
                                checked={isSymmetric}
                                onChange={(e) => setIsSymmetric(e.target.checked)}
                                className="form-checkbox h-3 w-3 text-sky-500 rounded focus:ring-0 bg-slate-800 border-slate-600"
                            />
                            <span className="text-[10px] text-slate-300 font-bold uppercase">Symmetry</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer bg-slate-900 px-2 py-1 rounded border border-slate-700">
                            <input
                                type="checkbox"
                                checked={isSmooth}
                                onChange={(e) => setIsSmooth(e.target.checked)}
                                className="form-checkbox h-3 w-3 text-sky-500 rounded focus:ring-0 bg-slate-800 border-slate-600"
                            />
                            <span className="text-[10px] text-slate-300 font-bold uppercase">Smooth</span>
                        </label>
                        <button onClick={finishDrawing} className="px-3 py-1 bg-green-600 border border-green-500 hover:bg-green-500 text-xs rounded text-white font-bold">
                            Finish ({drawPoints.length} pts)
                        </button>
                        <button onClick={cancelDrawing} className="px-3 py-1 bg-red-600 border border-red-500 hover:bg-red-500 text-xs rounded text-white font-bold">
                            Cancel
                        </button>
                    </>
                )}
            </div>

            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex flex-col items-end space-y-2">
                {/* Save Message Notification */}
                {saveMessage && (
                    <div className={`px-3 py-2 sm:px-4 sm:py-2 rounded shadow-lg font-semibold text-xs sm:text-sm ${saveMessage.type === 'success'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                        }`}>
                        {saveMessage.text}
                    </div>
                )}

                {/* Action Buttons - Responsive sizing and spacing */}
                <div className="flex flex-wrap gap-2 justify-end w-full">
                    {/* Hamburger Menu Button - Only on mobile, next to Run Test */}
                    <button
                        onClick={() => {
                            const event = new CustomEvent('toggleMobileMenu');
                            window.dispatchEvent(event);
                        }}
                        className="lg:hidden px-2 py-2 sm:px-3 sm:py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded shadow-lg transition-colors text-sm sm:text-base"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <button
                        onClick={handleRun}
                        className="px-4 py-2 sm:px-6 sm:py-2 text-sm sm:text-base bg-aero-blue hover:bg-sky-400 text-slate-900 font-bold rounded shadow-lg shadow-sky-900/50 transition-all"
                    >
                        Run Test
                    </button>
                    {currentResult && (
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className={`px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base font-semibold rounded transition-all ${isSaving
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300'
                                }`}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SimulationCanvas;
