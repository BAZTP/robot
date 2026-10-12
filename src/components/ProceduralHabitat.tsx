import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GardenPlot, ZoneId } from '../lib/state';

const palettes = {
  north: { soil: '#a0a48c', edge: '#697861', rock: '#a7ac95', leaf: '#829b54' },
  mist: { soil: '#72968c', edge: '#476e65', rock: '#90b6aa', leaf: '#6fa9a0' },
  solar: { soil: '#c7aa80', edge: '#977958', rock: '#d7b987', leaf: '#aa8559' },
};

function Plot({ plot, index, selected, onSelect }: { plot: GardenPlot; index: number; selected: boolean; onSelect: () => void }) {
  const positions: [number, number, number][] = [[1.45, 0, 0.62], [1.05, 0, 1.35], [0.20, 0, 1.78]];
  const color = plot.species === 'fern' ? '#70b9a2' : plot.species === 'copper' ? '#d1876a' : '#e4b966';
  const height = 0.18 + plot.waters * 0.12;
  return <group position={positions[index]} onClick={event => { event.stopPropagation(); onSelect(); }}
    onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
    {selected && <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.25, 0.012, 6, 28]} /><meshBasicMaterial color="#d6eea4" /></mesh>}
    <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[0.19, 0.14, 0.28, 20]} /><meshStandardMaterial color="#d7d7c5" roughness={0.65} /></mesh>
    <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.18, 0.025, 8, 20]} /><meshStandardMaterial color="#ece8d6" /></mesh>
    <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.167, 0.167, 0.02, 20]} /><meshStandardMaterial color="#514d34" roughness={1} /></mesh>
    <mesh position={[0, 0.16, 0.183]}><boxGeometry args={[0.06, 0.09, 0.012]} /><meshStandardMaterial color={color} /></mesh>
    {plot.species && (plot.waters === 0 ? <mesh position={[0, 0.32, 0]}><icosahedronGeometry args={[0.045, 0]} /><meshStandardMaterial color={color} /></mesh>
      : <group position={[0, 0.30, 0]}>
        <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[0.012, 0.018, height, 7]} /><meshStandardMaterial color="#718d49" /></mesh>
        {Array.from({ length: plot.species === 'fern' ? 8 : 4 }, (_, i) => <mesh key={i} position={[Math.cos(i * 2.4) * 0.075, height * (0.28 + i * 0.07), Math.sin(i * 2.4) * 0.075]} rotation={[0, -i * 2.4, i % 2 ? -0.5 : 0.5]} scale={[1, 0.32, 0.5]}><sphereGeometry args={[0.11, 8, 6]} /><meshStandardMaterial color={plot.species === 'fern' ? '#75b49c' : '#84a05c'} roughness={0.8} /></mesh>)}
        {plot.waters === 3 && <group position={[0, height, 0]} rotation={[0.5, 0, 0]}>
          <mesh><sphereGeometry args={[0.07, 12, 8]} /><meshStandardMaterial color={plot.species === 'fern' ? '#a2e3c5' : '#ae8042'} emissive={color} emissiveIntensity={0.16} /></mesh>
          {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI * 2 / 7) * 0.115, 0, Math.sin(i * Math.PI * 2 / 7) * 0.115]} rotation={[0, -i * Math.PI * 2 / 7, 0]} scale={[0.9, 0.25, 0.55]}><sphereGeometry args={[0.1, 10, 6]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} /></mesh>)}
        </group>}
      </group>)}
  </group>;
}

function Fireflies({ reducedMotion }: { reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(18 * 3);
    for (let i = 0; i < 18; i++) { data[i * 3] = Math.sin(i * 9.8) * 2.4; data[i * 3 + 1] = Math.cos(i * 3.7) * 1.4 + 1.2; data[i * 3 + 2] = Math.cos(i * 5.4) * 1.8; }
    return data;
  }, []);
  useFrame(({ clock }) => { if (points.current) { points.current.rotation.y = reducedMotion ? 0 : clock.elapsedTime * 0.045; points.current.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.5) * 0.08; } });
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#c4f3a4" size={0.045} transparent opacity={0.8} sizeAttenuation depthWrite={false} /></points>;
}

export default memo(function ProceduralHabitat({ zone, garden, gardenView, night, reducedMotion, selected, onSelect }: {
  zone: ZoneId; garden: GardenPlot[]; gardenView: boolean; night: boolean; reducedMotion: boolean; selected: number; onSelect: (index: number) => void;
}) {
  const palette = palettes[zone];
  return <group>
    <group position={[0, -1.83, 0]}>
      <mesh position={[0, -0.13, 0]}><cylinderGeometry args={[2.13, 1.98, 0.26, 64]} /><meshStandardMaterial color={palette.edge} roughness={0.85} /></mesh>
      <mesh position={[0, 0.004, 0]}><cylinderGeometry args={[2.13, 2.13, 0.025, 64]} /><meshStandardMaterial color={palette.soil} roughness={1} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.017, 0]}><torusGeometry args={[2.08, 0.008, 4, 64]} /><meshStandardMaterial color="#d2d9bd" emissive={night ? '#a5d5c3' : '#000000'} emissiveIntensity={0.35} /></mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i * 2.399;
        const x = Math.cos(angle) * 1.82, z = Math.sin(angle) * 1.82;
        if (gardenView && x > 0.6) return null;
        return <group key={i} position={[x, 0.03, z]} rotation={[0, angle, 0]}>
          <mesh scale={zone === 'solar' ? [0.15, 0.30, 0.14] : [0.16, 0.11, 0.20]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={palette.rock} roughness={0.9} emissive={zone === 'mist' && night ? '#5daba5' : '#000000'} emissiveIntensity={0.15} /></mesh>
          {zone !== 'solar' && <mesh position={[0.13, 0.06, 0.07]} rotation={[0, 0, -0.25]}><coneGeometry args={[0.045, 0.18, 5]} /><meshStandardMaterial color={palette.leaf} /></mesh>}
        </group>;
      })}
      {gardenView && garden.map((plot, index) => <Plot key={index} plot={plot} index={index} selected={selected === index} onSelect={() => onSelect(index)} />)}
      {zone === 'mist' && [-1, 1].map(side => <group key={side} position={[side * 1.30, 0, -1.1]}>
        <mesh position={[0, 0.20, 0]}><cylinderGeometry args={[0.035, 0.05, 0.4, 8]} /><meshStandardMaterial color="#aac5b5" /></mesh>
        <mesh position={[0, 0.41, 0]} scale={[1, 0.35, 1]}><sphereGeometry args={[0.17, 12, 8]} /><meshStandardMaterial color="#99cfc4" emissive="#73c2b2" emissiveIntensity={night ? 0.8 : 0.1} /></mesh>
      </group>)}
    </group>
    {night && <Fireflies reducedMotion={reducedMotion} />}
  </group>;
});
