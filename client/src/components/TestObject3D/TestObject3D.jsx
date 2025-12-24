import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * TestObject3D - Represents the 3D object being tested in the wind tunnel
 */
const TestObject3D = React.forwardRef(({
    geometry = 'sphere',
    size = { radius: 1 },
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    color = '#94a3b8',
    wireframe = false
}, ref) => {
    // We can use the passed ref (for parent access) or fallback to internal ref if needed
    // Ideally user passes a ref, if not we just don't expose it
    const localRef = useRef();
    const meshRef = ref || localRef;

    const [hovered, setHovered] = useState(false);

    // Create geometry based on type
    const createGeometry = () => {
        switch (geometry) {
            case 'sphere':
                return <sphereGeometry args={[size.radius || 1, 32, 32]} />;
            case 'box':
                return <boxGeometry args={[size.width || 1, size.height || 1, size.depth || 1]} />;
            case 'cylinder':
                return <cylinderGeometry args={[size.radiusTop || 0.5, size.radiusBottom || 0.5, size.height || 2, 32]} />;
            case 'cone':
                return <coneGeometry args={[size.radius || 1, size.height || 2, 32]} />;
            case 'torus':
                return <torusGeometry args={[size.radius || 1, size.tube || 0.4, 16, 100]} />;
            default:
                return <sphereGeometry args={[1, 32, 32]} />;
        }
    };

    return (
        <mesh
            ref={meshRef}
            position={position}
            rotation={rotation.map(r => r * Math.PI / 180)} // Convert degrees to radians
            castShadow
            receiveShadow
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            {createGeometry()}
            <meshStandardMaterial
                color={hovered ? '#60a5fa' : color}
                wireframe={wireframe}
                metalness={0.3}
                roughness={0.4}
            />
        </mesh>
    );
});

TestObject3D.displayName = 'TestObject3D';

export default TestObject3D;
