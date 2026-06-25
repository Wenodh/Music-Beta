import React, { useState, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Stars, Html, Preload } from '@react-three/drei';
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
    const [hovered, setHovered] = useState(false);
    const { theme } = useAppSelector(state => state.ui);

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.getElapsedTime();
            meshRef.current.scale.setScalar(
                isSelected ? 1.5 + Math.sin(t * 5) * 0.1 :
                hovered ? 1.3 : 1
            );
        }
    });

    const songImage = useMemo(() => {
        if (Array.isArray(song.image)) {
            return song.image[0]?.url;
        }
        return song.image;
    }, [song.image]);

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(song);
                }}
            >
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial
                    color={isSelected ? theme.accentColor : hovered ? '#fff' : '#888'}
                    emissive={isSelected ? theme.accentColor : hovered ? '#fff' : '#444'}
                    emissiveIntensity={isSelected ? 2 : 0.5}
                />
            </mesh>

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

const GlobeScene: React.FC<{ songs: Song[] }> = ({ songs }) => {
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    return (
        <div className="w-full h-full relative">
            <Canvas dpr={[1, 1.5]} performance={{ min: 0.5 }}>
                <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={45} />
                <OrbitControls
                    enablePan={false}
                    minDistance={8}
                    maxDistance={25}
                    autoRotate={false}
                    dampingFactor={0.05}
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
