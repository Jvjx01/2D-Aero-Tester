/**
 * 3D Aerodynamics Physics Engine
 * Calculates drag, lift, and moments for 3D geometries
 */

import * as THREE from 'three';

// Physical constants
const AIR_DYNAMIC_VISCOSITY = 1.81e-5; // Pa·s at 15°C
const DEFAULT_AIR_DENSITY = 1.225; // kg/m³

/**
 * Calculate Reynolds number for 3D flow
 */
function calculateReynolds3D(velocity, characteristicLength, density, viscosity) {
    return (density * velocity * characteristicLength) / viscosity;
}

/**
 * Calculate projected area in flow direction
 * @param {THREE.Mesh} mesh - The 3D mesh
 * @param {THREE.Vector3} flowDirection - Normalized flow direction vector
 */
function calculateProjectedArea(mesh, flowDirection) {
    const geometry = mesh.geometry;

    if (!geometry.attributes.position) {
        return 1.0; // Default fallback
    }

    // For simple geometries, use analytical formulas
    const params = geometry.parameters;

    if (geometry.type === 'SphereGeometry') {
        // Sphere: Projected area is always π * r²
        const radius = params.radius || 1;
        return Math.PI * radius * radius;
    }

    if (geometry.type === 'BoxGeometry') {
        // Box: Calculate which face is most perpendicular to flow
        const width = params.width || 1;
        const height = params.height || 1;
        const depth = params.depth || 1;

        // Get world rotation
        const worldQuaternion = new THREE.Quaternion();
        mesh.getWorldQuaternion(worldQuaternion);

        // Calculate face normals in world space
        const faces = [
            new THREE.Vector3(1, 0, 0),  // +X face
            new THREE.Vector3(-1, 0, 0), // -X face
            new THREE.Vector3(0, 1, 0),  // +Y face
            new THREE.Vector3(0, -1, 0), // -Y face
            new THREE.Vector3(0, 0, 1),  // +Z face
            new THREE.Vector3(0, 0, -1)  // -Z face
        ];

        const faceAreas = [
            height * depth,  // X faces
            height * depth,
            width * depth,   // Y faces
            width * depth,
            width * height,  // Z faces
            width * height
        ];

        // Calculate effective projected area
        let totalArea = 0;
        faces.forEach((normal, i) => {
            normal.applyQuaternion(worldQuaternion);
            const dot = Math.abs(normal.dot(flowDirection));
            totalArea += dot * faceAreas[i];
        });

        return totalArea;
    }

    if (geometry.type === 'CylinderGeometry') {
        const radiusTop = params.radiusTop || 0.5;
        const radiusBottom = params.radiusBottom || 0.5;
        const height = params.height || 2;
        const avgRadius = (radiusTop + radiusBottom) / 2;

        // Simplified: assume cylinder axis aligned with Y
        // Project area depends on orientation
        // For now, use average of side and end projections
        const sideArea = 2 * avgRadius * height;
        const endArea = Math.PI * avgRadius * avgRadius;

        return Math.max(sideArea, endArea); // Conservative estimate
    }

    if (geometry.type === 'ConeGeometry') {
        const radius = params.radius || 1;
        const height = params.height || 2;

        // Similar to cylinder
        const sideArea = radius * height;
        const baseArea = Math.PI * radius * radius;

        return Math.max(sideArea, baseArea);
    }

    // Default: Use bounding sphere
    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere.radius;
    return Math.PI * radius * radius;
}

/**
 * Get drag coefficient for 3D shape
 */
function getDragCoefficient3D(geometryType, reynolds) {
    switch (geometryType) {
        case 'SphereGeometry':
            // Sphere drag coefficient vs Reynolds number
            if (reynolds < 1) {
                return Math.max(24 / reynolds, 2.0); // Stokes flow
            } else if (reynolds < 2e5) {
                return 0.47; // Subcritical
            } else if (reynolds < 5e5) {
                // Drag crisis transition
                const t = (reynolds - 2e5) / (5e5 - 2e5);
                return 0.47 * (1 - t) + 0.2 * t;
            } else {
                return 0.2; // Supercritical
            }

        case 'BoxGeometry':
            return 1.05; // Cube perpendicular to flow

        case 'CylinderGeometry':
            return 0.82; // Cylinder cross-flow

        case 'ConeGeometry':
            return 0.5; // Streamlined cone

        case 'TorusGeometry':
            return 1.2; // Bluff body

        default:
            return 1.0;
    }
}

/**
 * Get lift coefficient for 3D shape
 * Most symmetric 3D bodies at 0 AoA have zero lift
 */
function getLiftCoefficient3D(geometryType, angleOfAttack, reynolds) {
    // For symmetric bodies, lift depends on angle of attack
    const alpha = angleOfAttack * Math.PI / 180; // radians

    switch (geometryType) {
        case 'SphereGeometry':
            // Sphere: minimal lift (Magnus effect if rotating, but we assume stationary)
            return 0.1 * Math.sin(2 * alpha);

        case 'BoxGeometry':
        case 'CylinderGeometry':
            // Bluff bodies can generate cross-flow lift
            return 0.5 * Math.sin(2 * alpha);

        case 'ConeGeometry':
            // Streamlined body
            return 0.3 * Math.sin(2 * alpha);

        default:
            return 0;
    }
}

/**
 * Calculate characteristic length for Reynolds number
 */
function getCharacteristicLength(geometry) {
    const params = geometry.parameters;

    if (geometry.type === 'SphereGeometry') {
        return 2 * (params.radius || 1); // Diameter
    }

    if (geometry.type === 'BoxGeometry') {
        return Math.max(params.width || 1, params.height || 1, params.depth || 1);
    }

    if (geometry.type === 'CylinderGeometry' || geometry.type === 'ConeGeometry') {
        const r = params.radius || params.radiusTop || 0.5;
        return 2 * r; // Diameter
    }

    // Default: bounding sphere diameter
    geometry.computeBoundingSphere();
    return 2 * geometry.boundingSphere.radius;
}

/**
 * Calculate effective angle of attack from rotation
 * Simplified: use pitch angle as primary AoA
 */
function getAngleOfAttack(rotation) {
    // rotation is [pitch, yaw, roll] in degrees
    return rotation[0]; // Pitch
}

/**
 * Main 3D aerodynamics calculation
 * @param {THREE.Mesh} mesh - The 3D test object
 * @param {Object} params - { windSpeed, angle, airDensity }
 * @returns {Object} Aerodynamic results
 */
export function calculate3DAerodynamics(mesh, params) {
    const velocityMs = (params.windSpeed || 50) / 3.6; // km/h to m/s
    const rho = params.airDensity || DEFAULT_AIR_DENSITY;
    const mu = AIR_DYNAMIC_VISCOSITY;

    // Get geometry info
    const geometry = mesh.geometry;
    const geometryType = geometry.type;

    // Flow direction (assuming wind from -X direction)
    const flowDirection = new THREE.Vector3(1, 0, 0);

    // Calculate projected area
    const projectedArea = calculateProjectedArea(mesh, flowDirection);

    // Characteristic length
    const charLength = getCharacteristicLength(geometry);

    // Reynolds number
    const reynolds = calculateReynolds3D(velocityMs, charLength, rho, mu);

    // Get rotation to determine angle of attack
    const rotation = [
        THREE.MathUtils.radToDeg(mesh.rotation.x),
        THREE.MathUtils.radToDeg(mesh.rotation.y),
        THREE.MathUtils.radToDeg(mesh.rotation.z)
    ];
    const angleOfAttack = getAngleOfAttack(rotation);

    // Coefficients
    const cd = getDragCoefficient3D(geometryType, reynolds);
    const cl = getLiftCoefficient3D(geometryType, angleOfAttack, reynolds);

    // Forces
    const dynamicPressure = 0.5 * rho * velocityMs * velocityMs;
    const dragForce = dynamicPressure * projectedArea * cd;
    const liftForce = dynamicPressure * projectedArea * cl;

    // Moment coefficient (simplified)
    const cm = 0; // For symmetric bodies at origin

    return {
        // Coefficients
        cd: parseFloat(cd.toFixed(3)),
        cl: parseFloat(cl.toFixed(3)),
        cm: parseFloat(cm.toFixed(3)),

        // Forces (N)
        dragForce: parseFloat(dragForce.toFixed(2)),
        liftForce: parseFloat(liftForce.toFixed(2)),
        sideForce: 0, // Simplified

        // Moments (N·m)
        pitchingMoment: 0,
        yawingMoment: 0,
        rollingMoment: 0,

        // Flow properties
        reynolds: parseFloat(reynolds.toFixed(0)),
        dynamicPressure: parseFloat(dynamicPressure.toFixed(2)),

        // Areas
        projectedArea: parseFloat(projectedArea.toFixed(4)),

        // Debug
        debug: {
            geometryType,
            velocityMs: velocityMs.toFixed(2),
            charLength: charLength.toFixed(3),
            angleOfAttack: angleOfAttack.toFixed(1),
            rotation: rotation.map(r => r.toFixed(1))
        }
    };
}
