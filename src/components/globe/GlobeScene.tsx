import React, { useState, useMemo, useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars, Html, Preload, Billboard, Image } from '@react-three/drei';
import * as THREE from 'three';
import { Song } from '../../types/music';
import SongPreviewCard from './SongPreviewCard';
import { useAppSelector } from '../../hooks/redux';
import { AnimatePresence } from 'framer-motion';

interface SongPointProps {
    song: Song;
    position: [number, number, number];
    onSelect: (song: Song) => void;
    isSelected: boolean;
}

const SongPoint: React.FC<SongPointProps> = ({ song, position, onSelect, isSelected }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const { theme } = useAppSelector(state => state.ui);

    // Calculate rotation to face outwards from center
    const rotation = useMemo(() => {
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(
            new THREE.Vector3(position[0], position[1], position[2]),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 1, 0)
        );
        const euler = new THREE.Euler().setFromRotationMatrix(lookAtMatrix);
        return [euler.x, euler.y, euler.z] as [number, number, number];
    }, [position]);

    useFrame((state) => {
        if (groupRef.current) {
            const t = state.clock.getElapsedTime();
            const targetScale = isSelected ? 1.3 + Math.sin(t * 3) * 0.05 : hovered ? 1.2 : 1;
            groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    const songImage = useMemo(() => {
        if (Array.isArray(song.image)) {
            return song.image[song.image.length - 1]?.url || song.image[0]?.url;
        }
        return song.image;
    }, [song.image]);

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            <Suspense fallback={
                <mesh
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(song);
                    }}
                >
                    <planeGeometry args={[0.8, 0.8]} />
                    <meshStandardMaterial color="#222" transparent opacity={0.5} />
                </mesh>
            }>
                <Image
                    ref={meshRef}
                    url={songImage}
                    transparent
                    side={THREE.DoubleSide}
                    scale={[1.1, 1.1]}
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(song);
                    }}
                >
                    <circleGeometry args={[0.5, 32]} />
                </Image>
                {isSelected && (
                    <mesh position={[0, 0, -0.01]}>
                        <circleGeometry args={[0.55, 32]} />
                        <meshBasicMaterial color={theme.accentColor} transparent opacity={0.6} />
                    </mesh>
                )}
            </Suspense>

            {(isSelected || hovered) && (
                <Html distanceFactor={10}>
                    <div className="pointer-events-none select-none">
                        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/20 -translate-y-8 -translate-x-1/2 whitespace-nowrap">
                            <p className="text-white text-[8px] font-bold">{song.name || song.title}</p>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
};

const Globe: React.FC<{ songs: Song[], selectedSongId: string | null, onSelect: (song: Song) => void }> = ({ songs, selectedSongId, onSelect }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { theme } = useAppSelector(state => state.ui);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.001;
        }
    });

    const songPositions = useMemo(() => {
        return songs.map((song, i) => {
            // Fibonacci Sphere algorithm for even distribution
            const phi = Math.acos(1 - 2 * (i + 0.5) / songs.length);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

            const radius = 5;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            return { song, position: [x, y, z] as [number, number, number] };
        });
    }, [songs]);

    return (
        <group ref={groupRef}>
            {/* The Globe itself */}
            <mesh>
                <sphereGeometry args={[4.9, 64, 64]} />
                <meshStandardMaterial
                    color="#0a0a0a"
                    roughness={0.7}
                    metalness={0.2}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Subtle Wireframe for volume */}
            <mesh>
                <sphereGeometry args={[4.91, 32, 32]} />
                <meshStandardMaterial
                    color={theme.accentColor}
                    wireframe
                    transparent
                    opacity={0.05}
                />
            </mesh>

            {/* Atmosphere/Glow */}
            <mesh>
                <sphereGeometry args={[5.2, 64, 64]} />
                <meshStandardMaterial
                    color={theme.accentColor}
                    transparent
                    opacity={0.15}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Song Points */}
            {songPositions.map(({ song, position }) => (
                <SongPoint
                    key={song.id}
                    song={song}
                    position={position}
                    onSelect={onSelect}
                    isSelected={selectedSongId === song.id}
                />
            ))}
        </group>
    );
};

const ResponsiveCamera = () => {
    const { viewport, camera } = useThree();
    const isMobile = viewport.width < 5;

    useEffect(() => {
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.position.z = isMobile ? 22 : 15;
            camera.updateProjectionMatrix();
        }
    }, [isMobile, camera]);

    return null;
};

const GlobeScene: React.FC<{ songs: Song[] }> = ({ songs }) => {
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    return (
        <div className="w-full h-full relative">
            <Canvas dpr={[1, 1.5]} performance={{ min: 0.5 }}>
                <ResponsiveCamera />
                <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
                <OrbitControls
                    enablePan={false}
                    minDistance={8}
                    maxDistance={30}
                    autoRotate={false}
                    dampingFactor={0.05}
                    enableDamping={true}
                    rotateSpeed={0.5}
                />

                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} color="#4facfe" intensity={0.5} />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <Suspense fallback={null}>
                    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
                        <Globe
                            songs={songs}
                            selectedSongId={selectedSong?.id || null}
                            onSelect={setSelectedSong}
                        />
                    </Float>
                    <Preload all />
                </Suspense>
            </Canvas>

            <AnimatePresence>
                {selectedSong && (
                    <SongPreviewCard
                        song={selectedSong}
                        onClose={() => setSelectedSong(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobeScene;
