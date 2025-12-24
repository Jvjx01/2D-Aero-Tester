import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BOUNDS = { x: 15, y: 10, z: 10 };

const ParticleSystem3D = ({ testObject, windSpeed, particleCount = 200, viewMode, shapeSize }) => {
    const meshRef = useRef();

    // Determine spawn area based on object size
    const spawnRadius = useMemo(() => {
        // Default to 2 if no size provided
        if (!shapeSize) return 2.5;

        // Get largest dimension
        const dim = Math.max(
            shapeSize.radius || 0,
            shapeSize.width || 0,
            shapeSize.height || 0,
            shapeSize.depth || 0,
            shapeSize.radiusTop || 0,
            shapeSize.radiusBottom || 0,
            shapeSize.tube || 0
        );

        // Return a bit larger than the object (1.2x) to ensure flow interaction
        return Math.max(2, dim * 1.5);
    }, [shapeSize]);

    // Initialize particles data
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < particleCount; i++) {
            // Spawn in a cylinder/box around the flow line (center Z/Y)
            const r = Math.sqrt(Math.random()) * spawnRadius;
            const theta = Math.random() * Math.PI * 2;

            temp.push({
                position: new THREE.Vector3(
                    (Math.random() - 0.5) * BOUNDS.x * 2,
                    r * Math.cos(theta),
                    r * Math.sin(theta)
                ),
                velocity: new THREE.Vector3(windSpeed, 0, 0),
                baseSpeed: windSpeed + Math.random() * 0.5,
                life: Math.random() * 100
            });
        }
        return temp;
    }, [spawnRadius, particleCount]);

    // Re-initialize particles when wind speed heavily changes
    useEffect(() => {
        particles.forEach(p => {
            p.baseSpeed = windSpeed + Math.random() * 0.5;
        });
    }, [windSpeed, particles]);

    const dummy = useMemo(() => new THREE.Object3D(), []);
    const color = useMemo(() => new THREE.Color(), []);

    useFrame((state, delta) => {
        if (!meshRef.current || !testObject.current) return;

        // Get object properties for collision/flow
        const objPos = testObject.current.position;
        // Simple sphere approximation for collision for now
        // Using spawnRadius as a proxy for object influence size roughly
        const obstacleRadius = spawnRadius * 0.4;
        const obstaclePos = new THREE.Vector3(objPos.x, objPos.y, objPos.z);

        particles.forEach((particle, i) => {
            // 1. Move Particle
            particle.position.add(particle.velocity.clone().multiplyScalar(delta * 5)); // Speed factor

            // 2. Reset if out of bounds
            if (particle.position.x > 15) {
                particle.position.x = -15;

                // Spawn within the stream tube
                const r = Math.sqrt(Math.random()) * spawnRadius;
                const theta = Math.random() * Math.PI * 2;

                particle.position.y = r * Math.cos(theta);
                particle.position.z = r * Math.sin(theta);

                // Reset velocity to free stream
                particle.velocity.set(particle.baseSpeed, 0, 0);
            }

            // 3. Simple Potential Flow / Collision Avoidance
            const distance = particle.position.distanceTo(obstaclePos);

            if (distance < obstacleRadius * 2.5) {
                // Direction from object center to particle
                const direction = new THREE.Vector3().subVectors(particle.position, obstaclePos).normalize();

                // Simpler approach: Push away from obstacle perpendicular to flow
                const pushFactor = Math.max(0, (obstacleRadius * 1.5 - distance) / distance);
                const repulsion = direction.multiplyScalar(pushFactor * 10 * delta);

                if (distance < obstacleRadius * 1.2) {
                    // Collision check - hard push
                    const surfaceNormal = direction.clone();
                    particle.velocity.add(surfaceNormal.multiplyScalar(20 * delta));
                } else {
                    // Soft deflection
                    particle.velocity.add(repulsion);
                    // Speed up 
                    particle.velocity.x += pushFactor * 2 * delta;
                }
            } else {
                // Return to free stream
                particle.velocity.lerp(new THREE.Vector3(particle.baseSpeed, 0, 0), delta * 0.5);
            }

            // 4. Update Visuals
            dummy.position.copy(particle.position);

            // Orient to velocity
            const angle = Math.atan2(particle.velocity.y, particle.velocity.x);
            dummy.rotation.z = angle;

            // Visualize as flow lines (CFD streamlines style)
            // Stretch significantly based on speed
            const speed = particle.velocity.length();
            const lengthScale = 0.5 + speed * 1.5; // Significant stretch
            const thickness = 0.05; // Very thin

            dummy.scale.set(lengthScale, thickness, thickness);
            dummy.updateMatrix();

            meshRef.current.setMatrixAt(i, dummy.matrix);

            // 5. Color based on View Mode
            if (viewMode === 'velocity') {
                const t = Math.min(1, Math.max(0, (speed - windSpeed * 0.5) / (windSpeed * 1.5)));
                color.setHSL(0.6 - t * 0.6, 1, 0.5);
            } else if (viewMode === 'pressure') {
                const t = Math.min(1, Math.max(0, (speed - windSpeed * 0.5) / (windSpeed * 1.5)));
                color.setHSL(t * 0.6, 1, 0.5);
            } else {
                color.setHSL(0, 0, 0.8);
            }

            meshRef.current.setColorAt(i, color);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, particleCount]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    );
};

export default ParticleSystem3D;
