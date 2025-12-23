/**
 * Wind Tunnel Aero Tester - Enhanced Aerodynamic Physics Engine
 * 
 * This module provides physics-based aerodynamic calculations including:
 * - Reynolds number effects
 * - Shape-specific drag coefficients
 * - Flow regime awareness
 * - Enhanced lift modeling
 */

// Physical constants
const AIR_DYNAMIC_VISCOSITY = 1.81e-5; // Pa·s at 15°C
const PIXELS_PER_METER = 100; // Scale factor: 100px = 1m

// Helper: Calculate centroid of polygon
function getCentroid(points) {
    let x = 0, y = 0;
    const n = points.length;
    if (n === 0) return { x: 0, y: 0 };
    for (const p of points) {
        x += p[0];
        y += p[1];
    }
    return { x: x / n, y: y / n };
}

// Helper: Rotate points around centroid
function rotatePoints(points, angleDegrees) {
    const angleRad = (angleDegrees * Math.PI) / 180;
    const cosKey = Math.cos(angleRad);
    const sinKey = Math.sin(angleRad);

    const centroid = getCentroid(points);

    return points.map(p => {
        const dx = p[0] - centroid.x;
        const dy = p[1] - centroid.y;
        return [
            centroid.x + (dx * cosKey - dy * sinKey),
            centroid.y + (dx * sinKey + dy * cosKey)
        ];
    });
}

// Helper: Get bounding box
function getBoundingBox(points) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of points) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
    }

    return {
        width: maxX - minX,
        height: maxY - minY,
        minX, maxX, minY, maxY
    };
}

// Helper: Calculate polygon area using shoelace formula
function calculatePolygonArea(points) {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i][0] * points[j][1] - points[j][0] * points[i][1];
    }
    return Math.abs(area) / 2;
}

// Calculate Reynolds number
function calculateReynolds(velocity, characteristicLength, density, dynamicViscosity) {
    // Re = (ρ * V * L) / μ
    return (density * velocity * characteristicLength) / dynamicViscosity;
}

// Classify shape based on geometry
function classifyShape(points, bounds, solidity) {
    const aspectRatio = bounds.width / bounds.height;

    // Check for circular shape
    // Circle has solidity ~0.785 (π/4) and aspect ratio close to 1
    const isCircular = solidity > 0.70 && solidity < 0.82 && aspectRatio > 0.8 && aspectRatio < 1.25;

    // Check for rectangular/square
    // Rectangle has solidity close to 1.0
    const isRectangular = solidity > 0.85 && points.length === 4;

    // Check for streamlined (high aspect ratio)
    const isStreamlined = aspectRatio > 3.0 || (aspectRatio < 0.33 && aspectRatio > 0);

    if (isCircular) return 'circular';
    if (isRectangular) return 'rectangular';
    if (isStreamlined) return 'streamlined';
    return 'bluff'; // Generic bluff body
}

// Helper: Analyze shape geometry for lift characteristics and symmetry
// Returns { maxCamber, thickness, isSymmetric, teAngle, leRadius }
function analyzeGeometry(points, bounds) {
    const minX = bounds.minX;
    const maxX = bounds.maxX;
    const chordLength = maxX - minX;

    if (chordLength === 0) return { maxCamber: 0, thickness: 0, isSymmetric: true, teAngle: 180, leRadius: 0 };

    // 1. Identification of Key Points
    // Leading Edge (LE): Point with min X
    // Trailing Edge (TE): Point with max X
    let pLE = points[0], pTE = points[0];
    let minDistLE = Infinity, minDistTE = Infinity;

    for (const p of points) {
        const dLE = Math.abs(p[0] - minX);
        const dTE = Math.abs(p[0] - maxX);
        if (dLE < minDistLE) { minDistLE = dLE; pLE = p; }
        if (dTE < minDistTE) { minDistTE = dTE; pTE = p; }
    }

    // Chord line equation constants: Ax + By + C = 0
    // Line from pLE to pTE
    const dy = pTE[1] - pLE[1];
    const dx = pTE[0] - pLE[0];
    const len = Math.sqrt(dx * dx + dy * dy);

    // Normalized vector along chord
    const ux = dx / len;
    const uy = dy / len;

    // Normal vector (perpendicular)
    const nx = -uy;
    const ny = ux;

    let upperArea = 0;
    let lowerArea = 0;
    let sumY = 0;

    // For symmetry check:
    // We can sample points along the chord and check thickness distribution
    // Simplified polygon approach:
    // Project all points onto chord normal.
    // Positive distance = Upper, Negative = Lower (or vice versa based on winding)

    let maxUpper = 0;
    let maxLower = 0;

    for (const p of points) {
        const px = p[0] - pLE[0];
        const py = p[1] - pLE[1];

        // Dot product with normal gives perpendicular distance
        const dist = px * nx + py * ny;
        sumY += dist;

        if (dist > 0) {
            upperArea += dist; // Rough integral proxy
            if (dist > maxUpper) maxUpper = dist;
        } else {
            lowerArea += Math.abs(dist);
            if (Math.abs(dist) > maxLower) maxLower = dist;
        }
    }

    const avgDeviation = sumY / points.length;
    const normalizedCamber = -avgDeviation / chordLength;
    const thicknessRatio = bounds.height / chordLength;

    // 2. Symmetry Detection
    // Check 1: Area Balance
    const areaRatio = (upperArea > 0 && lowerArea > 0) ? Math.min(upperArea, lowerArea) / Math.max(upperArea, lowerArea) : 0;
    // Check 2: Max Thickness Location Balance
    const maxThickRatio = (maxUpper > 0 && maxLower > 0) ? Math.min(maxUpper, maxLower) / Math.max(maxUpper, maxLower) : 0;

    const isSymmetric = (areaRatio > 0.85) && (maxThickRatio > 0.85) && (Math.abs(normalizedCamber) < 0.02);

    // 3. Trailing Edge Angle Analysis
    // Find points adjacent to TE in the polygon
    const pTEIndex = points.indexOf(pTE);
    const n = points.length;
    const prev = points[(pTEIndex - 1 + n) % n];
    const next = points[(pTEIndex + 1) % n];

    // Vectors from TE to adjacent
    const v1x = prev[0] - pTE[0];
    const v1y = prev[1] - pTE[1];
    const v2x = next[0] - pTE[0];
    const v2y = next[1] - pTE[1];

    // Angle between vectors
    const angle1 = Math.atan2(v1y, v1x);
    const angle2 = Math.atan2(v2y, v2x);
    let teAngleDeg = Math.abs((angle1 - angle2) * 180 / Math.PI);
    if (teAngleDeg > 180) teAngleDeg = 360 - teAngleDeg;

    // 4. Leading Edge Radius (Heuristic)
    // Distance between points adjacent to LE
    const pLEIndex = points.indexOf(pLE);
    const prevLE = points[(pLEIndex - 1 + n) % n];
    const nextLE = points[(pLEIndex + 1) % n];
    const leWidth = Math.sqrt(Math.pow(prevLE[0] - nextLE[0], 2) + Math.pow(prevLE[1] - nextLE[1], 2));
    const leRadius = leWidth / (2 * chordLength); // Normalized radius

    return {
        camber: normalizedCamber,
        thickness: thicknessRatio,
        isSymmetric: isSymmetric,
        teAngle: teAngleDeg,   // < 20 is sharp, > 40 starts getting blunt
        leRadius: leRadius     // < 0.05 sharp, > 0.1 round
    };
}

/**
 * Calculate drag coefficient based on shape and Reynolds number
 * @param {string} shapeType - Shape classification (circular, rectangular, streamlined, bluff)
 * @param {number} reynolds - Reynolds number
 * @param {number} aspectRatio - Shape aspect ratio
 * @param {number} solidity - Shape solidity (ratio of actual area to bounding box area)
 * @param {number} angleDegrees - Angle of attack in degrees
 * @param {Object} geometry - Geometric analysis results
 */
function calculateDragCoefficient(shapeType, reynolds, aspectRatio, solidity, angleDegrees, geometry) {
    let cd = 1.0;
    const { isSymmetric, teAngle, leRadius } = geometry || {};

    switch (shapeType) {
        case 'circular':
            // Circular cylinder drag coefficient vs Reynolds number
            if (reynolds < 1) {
                // Stokes flow
                cd = Math.max(24 / reynolds, 2.0);
            } else if (reynolds < 2e5) {
                // Laminar regime: steady near 1.2
                cd = 1.17;
            } else if (reynolds < 5e5) {
                // Drag crisis region: Smooth sigmoid transition from 1.2 to 0.3
                // Center around 3.5e5
                const transitionRel = (reynolds - 3.5e5) / 50000;
                // Sigmoid function: 1 / (1 + e^x)
                const sig = 1 / (1 + Math.exp(transitionRel));
                cd = 0.3 + (1.2 - 0.3) * sig;
            } else {
                // Turbulent regime
                cd = 0.35 + (reynolds / 1e7) * 0.1; // Slow rise at very high Re
            }

            // Adjust for angle of attack (cross-flow)
            const angleRadCircular = Math.abs(angleDegrees * Math.PI / 180);
            if (angleRadCircular > 0.1) {
                // Slight increase in drag at non-zero angles due to effective cross-section changes (if not perfectly circular)
                cd *= (1.0 + 0.05 * Math.sin(angleRadCircular));
            }
            break;

        case 'rectangular':
            // Rectangular/square drag coefficient
            // Depends on aspect ratio and orientation
            const effectiveAR = Math.max(aspectRatio, 1 / aspectRatio);

            // Base Cd for square perpendicular to flow is ~2.0
            // Decreases for higher aspect ratios
            cd = 2.0 / Math.sqrt(effectiveAR);
            cd = Math.max(1.0, Math.min(cd, 2.1));

            // Sharp edges mean less Reynolds dependence
            // but still some effect
            if (reynolds < 1e4) {
                cd *= 1.1;
            }
            break;

        case 'streamlined':
            // Streamlined body - much lower drag
            // Cd decreases with fineness ratio
            const finenessRatioStreamlined = Math.max(aspectRatio, 1 / aspectRatio);
            cd = 0.05 + (0.3 / Math.sqrt(finenessRatioStreamlined));

            // Symmetry Bonus: Symmetric shapes often have cleaner flow at 0 angle
            if (isSymmetric && Math.abs(angleDegrees) < 5) {
                cd *= 0.8; // 20% drag reduction for verified symmetry
            }

            // TE Bluntness Penalty
            // Ideally TE angle is small (< 15 deg). 
            // If TE angle is large (e.g. 90 for cut off tail), base drag increases.
            if (teAngle > 20) {
                const bluntnessFactor = (teAngle - 20) / 70; // 0 to 1 scale roughly
                cd += 0.1 * bluntnessFactor; // Add base drag
            }

            // Account for flow separation at high angles
            const angleRadStreamlined = Math.abs(angleDegrees * Math.PI / 180);
            if (angleRadStreamlined > Math.PI / 12) { // > 15 degrees
                // Separation increases drag
                // Use a gentler increase for streamlined bodies than bluff bodies
                const separationFactor = 1.0 + 1.2 * Math.pow(Math.sin(angleRadStreamlined), 2);
                cd *= separationFactor;
            }
            break;

        default: // 'bluff'
            // Generic bluff body
            // Use aspect ratio and solidity
            const finenessRatioBluff = Math.max(aspectRatio, 1 / aspectRatio);
            cd = 1.0 + 0.5 / finenessRatioBluff;

            // Adjust for solidity (shape efficiency)
            cd *= (0.85 + 0.15 * solidity);

            // Reynolds effect (less smooth = more consistent Cd)
            if (reynolds < 1e4) {
                cd *= 1.05;
            }
            break;
    }

    // Clamp to reasonable limits
    return Math.max(0.01, Math.min(cd, 2.5));
}

/**
 * Calculate lift coefficient with flow regime awareness and geometric analysis
 * @param {string} shapeType - Shape classification
 * @param {number} reynolds - Reynolds number
 * @param {number} aspectRatio - Shape aspect ratio
 * @param {number} angleDegrees - Angle of attack in degrees
 * @param {number} solidity - Shape solidity
 * @param {Object} geometry - Geometric analysis results
 */
function calculateLiftCoefficient(shapeType, reynolds, aspectRatio, angleDegrees, solidity, geometry) {
    const angleRad = angleDegrees * Math.PI / 180;
    let cl = 0;

    // Use geometry if available
    const camber = geometry ? geometry.camber : 0;
    const thickness = geometry ? geometry.thickness : 0.12;
    const isSymmetric = geometry ? geometry.isSymmetric : false;
    const teAngle = geometry ? geometry.teAngle : 30;

    // Determine if shape can generate significant lift
    // Determine if shape can generate significant lift
    // Relaxed: Even bluff bodies with camber (asymmetry) can generate lift
    const canLift = shapeType === 'streamlined' || aspectRatio > 2.0 || aspectRatio < 0.5 || Math.abs(camber) > 0.001;

    if (!canLift && Math.abs(angleDegrees) < 10) {
        // Only completely symmetric bluff bodies at low angles generate zero lift
        return 0;
    }

    // REFINED: If explicitly symmetric, enforce 0 lift at 0 angle
    if (isSymmetric && Math.abs(angleDegrees) < 0.5) {
        return 0;
    }

    switch (shapeType) {
        case 'circular':
            // Circular cylinders generate lift from vortex shedding asymmetry
            // Magnus effect is minimal for non-rotating cylinders
            if (Math.abs(angleDegrees) > 5) {
                cl = 0.3 * Math.sin(2 * angleRad);
            }
            break;

        case 'streamlined':
            // Enhanced Airfoil Logic
            // 1. Zero-Lift Angle (alpha_L0) relies on Camber
            // Empirically: alpha_L0 (deg) approx -100 * max camber
            // e.g. 2% camber -> -2 degrees
            let alphaL0 = -100 * camber;
            // If symmetric, alphaL0 MUST be 0
            if (isSymmetric) alphaL0 = 0;

            // Effective angle of attack
            const effectiveAngle = angleDegrees - alphaL0;
            const effectiveAngleRad = effectiveAngle * Math.PI / 180;

            // 2. Lift Slope (2pi ideal, reduced by thickness and aspect ratio)
            // Thicker airfoils have slightly lower slope but gentler stall
            // TE Shape Effect: Sharp TE (Kutta condition verified) -> Slope ~ 2pi
            // Blunt TE -> Kutta condition weak -> Lower slope
            // Map TE angle 0..20 deg -> Ideal, >20 -> Loss
            let kuttaFactor = 1.0;
            if (teAngle > 20) {
                kuttaFactor = Math.max(0.5, 1.0 - (teAngle - 20) / 100);
            }

            const idealSlope = 2 * Math.PI; // per radian
            // Aspect ratio correction: Cl_alpha = Cl_alpha_inf / (1 + Cl_alpha_inf / (pi * AR))
            const arCorrection = aspectRatio / (aspectRatio + 2); // Approximation
            const liftSlope = 0.1 * 0.9 * arCorrection * kuttaFactor; // ~0.09 per degree for high AR

            // 3. Stall Modeling
            // Continuous stall function instead of hard cutoff
            // Stall angle depends on thickness (thicker = higher stall angle)
            const stallAngle = 12 + (thickness * 20); // 10% thick -> 14 deg, 20% thick -> 16 deg

            // Sigmoid-like stall decay
            // Normalized angle relative to stall
            const x = Math.abs(effectiveAngle) / stallAngle;

            // Lift curve: Linear region + Stall decay

            // Use a blended function for smoother stall
            if (x < 0.8) {
                // Linear region
                cl = liftSlope * effectiveAngle;
            } else {
                // Transition and Stall
                // Peak lift usually around x=1.0 (stall angle)
                // We want a smooth curve that peaks and then drops
                // Function: x * exp((1-x^2)/2) retains linear at start and peaks at 1

                // Modified analytical model for stall:
                // f(alpha) = C * alpha * exp(- (alpha/alpha_stall)^M )
                // M controls sharpness. M=4 is typical.

                // Let's use a simpler Hermite blend or similar for predictability
                const preStallLift = liftSlope * effectiveAngle;

                // Fully separated lift (flat plate analogy)
                const separatedLift = 1.0 * Math.sin(2 * effectiveAngleRad);

                if (x < 1.5) {
                    // Stall region (0.8 to 1.5 * stallAngle)
                    // Blend from linear to peak to separated
                    // Use cosine interpolation for smoothness
                    const t = (x - 0.8) / (1.5 - 0.8); // 0 to 1
                    const blend = (1 + Math.cos(Math.PI * t)) / 2; // 1 to 0

                    // Boost the peak slightly to round it off
                    const peakBoost = 0.1 * Math.sin(Math.PI * t);

                    cl = (preStallLift * blend) + (separatedLift * (1 - blend)) + peakBoost;
                } else {
                    // Deep stall
                    cl = separatedLift;
                }
            }

            // Add camber lift component at 0 geometric angle if not handled by alphaL0 logic above
            // (Handled by effectiveAngle)
            break;

        case 'rectangular':
            // Flat plate logic
            // Theoretical: Cl = 2 * pi * sin(alpha) for ideal flow? No, separated flow usually.
            // Cl = 2 * sin(alpha) * cos(alpha) = sin(2*alpha) seems valid for plates
            if (Math.abs(angleDegrees) < 25) {
                cl = 1.1 * Math.sin(2 * angleRad);
            } else {
                // Post-stall plate
                cl = 1.0 * Math.sin(angleRad); // Drag dominates, but lift vector tilts
            }
            // Camber effect on bent plates?
            if (camber !== 0 && !isSymmetric) {
                cl += camber * 2.0; // Add constant lift for camber
            }
            break;

        default: // 'bluff'
            // Generic bluff body
            // Mostly cross-flow lift
            cl = 0.5 * Math.sin(2 * angleRad);
            if (solidity < 0.5) cl *= 0.5;
            break;
    }

    // Reynolds Number correction
    // Airfoils maintain lift better at low Re than simple linear scaling suggests
    // Critical Re for airfoils is usually ~50-100k
    if (reynolds < 100000) {
        // Soft reduction curve
        // Factor = 1.0 at 100k, 0.6 at 10k, 0.4 at 1k
        const factor = 0.4 + 0.6 * (Math.log10(Math.max(1, reynolds)) / 5.0);
        cl *= Math.min(1.0, Math.max(0.1, factor));
    }

    return cl;
}

// Calculate Strouhal number for vortex shedding frequency
function calculateStrouhal(shapeType, reynolds) {
    // Strouhal number St = f * L / V
    // For vortex shedding frequency

    let st = 0.2; // Default for circular cylinder

    switch (shapeType) {
        case 'circular':
            // Circular cylinder: St ≈ 0.2 for wide Re range
            st = 0.2;
            if (reynolds < 100) {
                st = 0.1; // Lower frequency at low Re
            }
            break;
        case 'rectangular':
            st = 0.15; // Slightly lower for rectangular
            break;
        case 'streamlined':
            st = 0.1; // Lower frequency for streamlined
            break;
        default:
            st = 0.18;
            break;
    }

    return st;
}

/**
 * Main calculation function
 * Calculates aerodynamic properties with physics-based models
 * @param {Array} points - Array of [x, y] coordinates
 * @param {Object} params - { windSpeed (km/h), angle (deg), airDensity (kg/m3) }
 */
function calculateDrag(points, params) {
    // 1. Extract and convert inputs
    const velocityKmh = params.windSpeed;
    const velocityMs = velocityKmh / 3.6; // Convert km/h to m/s
    const rho = params.airDensity || 1.225; // kg/m³
    let angleDegrees = params.angle || 0;
    // Normalize angle to [-180, 180]
    // 360 -> 0, 342 -> -18, etc.
    while (angleDegrees > 180) angleDegrees -= 360;
    while (angleDegrees < -180) angleDegrees += 360;
    const mu = AIR_DYNAMIC_VISCOSITY;

    // 2. Rotate shape based on angle of attack
    const rotatedPoints = rotatePoints(points, angleDegrees);
    const bounds = getBoundingBox(rotatedPoints);

    // 3. Calculate geometric properties
    const heightM = bounds.height / PIXELS_PER_METER;
    const widthM = bounds.width / PIXELS_PER_METER;

    // Frontal area (projected area perpendicular to flow)
    const frontalArea = heightM * 1.0; // 2D assumption (unit depth)

    // Reference area for lift (typically plan area or frontal area)
    const referenceArea = Math.max(heightM, widthM) * 1.0;

    // Polygon area and solidity
    const polygonArea = calculatePolygonArea(points);
    const boxArea = bounds.width * bounds.height;
    const solidity = (boxArea > 0) ? (polygonArea / boxArea) : 1.0;

    // Aspect ratio
    const aspectRatio = (bounds.height > 0) ? (bounds.width / bounds.height) : 1.0;

    // 4. Calculate characteristic length and Reynolds number
    // Shape-specific Characteristic Length:
    // - Circular: Diameter (width)
    // - Streamlined: Chord (width of bounding box)
    // - Others: sqrt(Area) or Width

    // We haven't classified shapeType yet (step 5), but we can infer based on solidity/AR
    // or just calculate it after step 5 and re-run Re?
    // Let's optimize: classify first, then calculate Re.

    // 5. Classify shape
    const shapeType = classifyShape(points, bounds, solidity);

    let characteristicLength;
    if (shapeType === 'circular') {
        characteristicLength = bounds.width / PIXELS_PER_METER;
    } else if (shapeType === 'streamlined') {
        characteristicLength = bounds.width / PIXELS_PER_METER; // Chord length
    } else {
        characteristicLength = Math.sqrt(polygonArea / (PIXELS_PER_METER * PIXELS_PER_METER));
    }

    const reynolds = calculateReynolds(velocityMs, characteristicLength, rho, mu);

    // 6. Detailed Geometric Analysis
    // We analyze the *rotated* points to see effective geometry relative to flow?
    // Or original geometry for camber?
    // Camber is an intrinsic property. We should analyze the *unrotated* shape (angle=0)
    // But we sort of don't know "unrotated" - we assume input 'points' are 0-angle base.
    // Yes, 'points' passed to API are the base shape. 'params.angle' rotation is applied here for Drag area.
    // So analyzeGeometry(points) gives intrinsic properties.
    const geometry = analyzeGeometry(points, getBoundingBox(points));

    // 7. Calculate drag coefficient
    const cd = calculateDragCoefficient(shapeType, reynolds, aspectRatio, solidity, angleDegrees);

    // 8. Calculate lift coefficient
    const cl = calculateLiftCoefficient(shapeType, reynolds, aspectRatio, angleDegrees, solidity, geometry);

    // 9. Calculate forces
    // Drag: Fd = 0.5 * ρ * V² * A * Cd
    const dragForce = 0.5 * rho * velocityMs * velocityMs * frontalArea * cd;

    // Lift: Fl = 0.5 * ρ * V² * A * Cl
    const liftForce = 0.5 * rho * velocityMs * velocityMs * referenceArea * cl;

    // 10. Calculate additional metrics
    const strouhal = calculateStrouhal(shapeType, reynolds);

    // Vortex shedding frequency: f = St * V / L
    const vortexFrequency = (characteristicLength > 0)
        ? strouhal * velocityMs / characteristicLength
        : 0;

    // Estimate pressure vs friction drag breakdown
    // For bluff bodies, pressure drag dominates (~80-95%)
    let pressureDragRatio = 0.9;
    if (shapeType === 'streamlined') {
        pressureDragRatio = 0.6; // More skin friction for streamlined
    } else if (shapeType === 'circular') {
        pressureDragRatio = 0.85;
    }

    const pressureDrag = dragForce * pressureDragRatio;
    const frictionDrag = dragForce * (1 - pressureDragRatio);

    // 11. Return comprehensive results
    return {
        // Primary coefficients
        cd: parseFloat(cd.toFixed(3)),
        cl: parseFloat(cl.toFixed(3)),

        // Forces
        dragForce: parseFloat(dragForce.toFixed(2)),
        liftForce: parseFloat(liftForce.toFixed(2)),

        // Areas
        area: parseFloat(frontalArea.toFixed(4)),
        referenceArea: parseFloat(referenceArea.toFixed(4)),

        // Flow properties
        reynolds: parseFloat(reynolds.toFixed(0)),

        // Additional metrics
        shapeType: shapeType,
        vortexFrequency: parseFloat(vortexFrequency.toFixed(2)),
        strouhal: parseFloat(strouhal.toFixed(3)),

        // Drag breakdown
        pressureDrag: parseFloat(pressureDrag.toFixed(2)),
        frictionDrag: parseFloat(frictionDrag.toFixed(2)),

        // Debug information
        debug: {
            velocityMs: velocityMs.toFixed(2),
            widthM: widthM.toFixed(3),
            heightM: heightM.toFixed(3),
            characteristicLength: characteristicLength.toFixed(3),
            aspectRatio: aspectRatio.toFixed(3),
            solidity: solidity.toFixed(3),
            camber: geometry.camber.toFixed(4),
            thickness: geometry.thickness.toFixed(4),
            alphaL0: (-100 * geometry.camber).toFixed(1)
        }
    };
}

export { calculateDrag };
