import { Component, memo, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { GardenPlot, RobotSettings, ZoneId } from '../lib/state';
import { eyeOpenness, robotPose } from '../lib/motion';
import type { RobotAction, RobotMood } from '../lib/motion';
import ProceduralHabitat from './ProceduralHabitat';

interface SceneProps {
  settings: RobotSettings;
  action: RobotAction;
  plant: boolean;
  cameraReset: number;
  onReady: (canvas: HTMLCanvasElement) => void;
  onWave: () => void;
  zone: ZoneId;
  garden: GardenPlot[];
  gardenView: boolean;
  mood: RobotMood;
  selectedPlot: number;
  onSelectPlot: (index: number) => void;
}

function Label({ text, width = 0.38, height = 0.24, color = '#252626', bg = '#e6e4db', size = 100,
  ...props }: { text: string; width?: number; height?: number; color?: string; bg?: string; size?: number; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    if (bg === '#242e2d') { ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 256); }
    ctx.fillStyle = color; ctx.font = `900 ${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 133);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text, color, bg, size]);
  return <mesh {...props}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} transparent /></mesh>;
}

function Rod({ from, to, radius = 0.06, color = '#262829' }: {
  from: [number, number, number]; to: [number, number, number]; radius?: number; color?: string;
}) {
  const { length, center, rotation } = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    return { length: a.distanceTo(b), center: a.clone().add(b).multiplyScalar(0.5),
      rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()) };
  }, [from, to]);
  return <mesh position={center} quaternion={rotation} castShadow>
    <cylinderGeometry args={[radius, radius, length, 16]} />
    <meshStandardMaterial color={color} metalness={0.75} roughness={0.35} />
  </mesh>;
}

function Bolt({ position, radius = 0.04 }: { position: [number, number, number]; radius?: number }) {
  return <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
    <cylinderGeometry args={[radius, radius, 0.018, 6]} />
    <meshStandardMaterial color="#777d7b" metalness={0.9} roughness={0.34} />
  </mesh>;
}

function Plant() {
  const stem = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.035, 0.22, 0),
    new THREE.Vector3(-0.02, 0.45, 0.025), new THREE.Vector3(0.015, 0.63, 0),
  ]), []);
  const leaf = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.bezierCurveTo(0.1, 0.18, 0.32, 0.24, 0.47, 0.18);
    shape.bezierCurveTo(0.30, -0.02, 0.12, -0.05, 0, 0);
    return shape;
  }, []);
  return <group>
    <mesh castShadow scale={[0.27, 0.15, 0.23]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#30271e" roughness={1} /></mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.sin(i * 3.8) * 0.24, Math.cos(i * 4.7) * 0.08, Math.cos(i * 2.1) * 0.20]} scale={[0.08, 0.065, 0.06]} castShadow>
      <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={i % 2 ? '#483327' : '#211c16'} roughness={1} />
    </mesh>)}
    <mesh><tubeGeometry args={[stem, 16, 0.015, 7, false]} /><meshStandardMaterial color="#70933b" /></mesh>
    {[[0, 0.47, 0.02, 0.12, 0.4], [0, 0.55, 0, 2.6, 0.6], [0.01, 0.33, 0, 1.3, 0.35]].map(([x, y, z, rot, tilt], i) =>
      <group key={i} position={[x, y, z]} rotation={[tilt, rot, 0.2]}>
        <mesh castShadow><shapeGeometry args={[leaf]} /><meshStandardMaterial color={i === 1 ? '#538f28' : '#73a543'} side={THREE.DoubleSide} roughness={0.8} /></mesh>
        <Rod from={[0, 0, 0.004]} to={[0.38, 0.14, 0.004]} radius={0.005} color="#98b857" />
      </group>)}
    {[0, 1, 2].map(i => <Rod key={i} from={[0.03 * i, -0.08, 0]} to={[0.07 * Math.sin(i * 2), -0.24 - i * 0.04, 0.08 * Math.cos(i)]} radius={0.01} color="#60482c" />)}
  </group>;
}

function Tracks({ side, action, reducedMotion }: { side: number; action: RobotAction; reducedMotion: boolean }) {
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => { const pose = robotPose(clock.elapsedTime, action, reducedMotion);
    wheelRefs.current.forEach(wheel => { if (wheel) wheel.rotation.x = pose.wheel; });
  });
  return <group position={[side * 0.92, 0.42, 0]}>
    <RoundedBox args={[0.54, 0.85, 1.78]} radius={0.32} smoothness={4} castShadow>
      <meshStandardMaterial color="#181b1b" roughness={0.88} />
    </RoundedBox>
    {Array.from({ length: 34 }, (_, i) => {
      const angle = i / 34 * Math.PI * 2;
      const z = Math.sin(angle) * 0.76;
      const y = Math.cos(angle) * 0.36;
      return <group key={i} position={[0, y, z]} rotation={[-angle, 0, 0]}>
        <RoundedBox args={[0.64, 0.13, 0.14]} radius={0.027} smoothness={2} castShadow>
          <meshStandardMaterial color={i % 4 === 0 ? '#363b38' : '#242826'} roughness={0.88} />
        </RoundedBox>
        <mesh position={[side * 0.29, 0.077, 0]}><boxGeometry args={[0.045, 0.016, 0.095]} /><meshStandardMaterial color="#797d72" roughness={0.5} /></mesh>
      </group>;
    })}
    {[-0.56, 0.56].map((z, i) => <group key={z} position={[side * 0.34, 0, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.305, 0.305, 0.08, 32]} /><meshStandardMaterial color="#898c85" metalness={0.72} roughness={0.4} /></mesh>
      <group ref={el => { wheelRefs.current[i] = el; }}>
        <mesh position={[side * 0.052, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.233, 0.018, 8, 32]} /><meshStandardMaterial color="#c4b692" metalness={0.65} roughness={0.38} /></mesh>
        <mesh position={[side * 0.064, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 0.025, 12]} /><meshStandardMaterial color="#333a39" metalness={0.8} roughness={0.4} /></mesh>
        {[0, 1, 2, 3, 4, 5].map(n => <mesh key={n} position={[side * 0.07, Math.cos(n * Math.PI / 3) * 0.18, Math.sin(n * Math.PI / 3) * 0.18]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.024, 0.024, 0.014, 6]} /><meshStandardMaterial color="#292d2c" metalness={0.9} /></mesh>)}
      </group>
    </group>)}
  </group>;
}

function Eye({ side, settings, mood }: { side: number; settings: RobotSettings; mood: RobotMood }) {
  const optics = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (optics.current) optics.current.scale.y = eyeOpenness(clock.elapsedTime, mood, settings.reducedMotion); });
  return <group position={[side * 0.60, 0, 0]} rotation={[0, side * -0.045, side * 0.09]}>
    <RoundedBox args={[1.13, 1.02, 0.76]} radius={0.20} smoothness={5} castShadow><meshStandardMaterial color={settings.shell} metalness={0.22} roughness={0.35} /></RoundedBox>
    <RoundedBox args={[0.095, 1.025, 0.767]} radius={0.025} smoothness={3} position={[side * 0.42, 0, 0]} castShadow><meshStandardMaterial color={settings.livery} metalness={0.15} roughness={0.34} /></RoundedBox>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.39]}><cylinderGeometry args={[0.445, 0.445, 0.10, 48]} /><meshStandardMaterial color="#383b39" metalness={0.8} roughness={0.3} /></mesh>
    <mesh position={[0, 0, 0.455]}><torusGeometry args={[0.387, 0.027, 12, 48]} /><meshStandardMaterial color="#a6aaa0" metalness={0.95} roughness={0.22} /></mesh>
    <group ref={optics}>
    <mesh position={[0, 0, 0.479]}><torusGeometry args={[0.346, 0.022, 12, 64]} /><meshStandardMaterial color={settings.light} emissive={settings.light} emissiveIntensity={0.75} toneMapped={false} /></mesh>
    <mesh position={[0, 0, 0.465]} scale={[1, 1, 0.49]} castShadow><sphereGeometry args={[0.321, 40, 32]} /><meshPhysicalMaterial color="#131e20" metalness={0.68} roughness={0.13} clearcoat={1} clearcoatRoughness={0.12} /></mesh>
    <mesh position={[-0.10, 0.16, 0.601]} rotation={[0, 0, -0.45]} scale={[0.09, 0.018, 0.006]}><sphereGeometry args={[1, 16, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.76} /></mesh>
    <mesh position={[0.11, -0.15, 0.599]} scale={[0.045, 0.009, 0.003]}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.25} /></mesh>
    </group>
    {[-1, 1].flatMap(x => [-1, 1].map(y => <Bolt key={`${x}${y}`} position={[x * 0.46, y * 0.41, 0.382]} radius={0.025} />))}
  </group>;
}

function Arm({ side, settings, plant, armRef }: { side: number; settings: RobotSettings; plant?: boolean; armRef: React.RefObject<THREE.Group | null> }) {
  const end: [number, number, number] = side === 1 ? [0.60, 0.53, 0.28] : [-0.33, -0.65, 0.26];
  const elbow: [number, number, number] = [side * 0.39, -0.27, 0.03];
  return <group position={[side * 0.86, 1.94, 0]} ref={armRef}>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.20, 24]} /><meshStandardMaterial color={settings.shell} metalness={0.55} roughness={0.35} /></mesh>
    <Rod from={[0, 0, 0]} to={elbow} radius={0.105} />
    <mesh position={elbow} castShadow><sphereGeometry args={[0.135, 18, 12]} /><meshStandardMaterial color="#858b87" metalness={0.85} roughness={0.32} /></mesh>
    <Rod from={elbow} to={end} radius={0.095} color={settings.shell} />
    <Rod from={[elbow[0], elbow[1], elbow[2] + 0.1]} to={[end[0], end[1] - 0.06, end[2] + 0.08]} radius={0.026} color={settings.livery} />
    <group position={end} rotation={[0.15, 0, side === 1 ? -0.20 : 0.1]}>
      <RoundedBox args={[0.27, 0.28, 0.30]} radius={0.04} smoothness={3} castShadow><meshStandardMaterial color="#242b2b" metalness={0.7} roughness={0.4} /></RoundedBox>
      <mesh position={[0, -0.09, 0.16]}><boxGeometry args={[0.26, 0.05, 0.013]} /><meshStandardMaterial color={settings.livery} /></mesh>
      {[-1, 1].map(n => <group key={n} position={[n * 0.11, 0.20, 0]}>
        <RoundedBox args={[0.075, 0.20, 0.13]} radius={0.028} smoothness={2} castShadow><meshStandardMaterial color="#303737" metalness={0.72} /></RoundedBox>
        <Bolt position={[0, 0, 0.07]} radius={0.025} />
      </group>)}
      {side === 1 && plant && <group position={[0, 0.39, 0]}><Plant /></group>}
    </group>
  </group>;
}

function Robot({ settings, action, plant, onWave, onRendered, mood, gardenView }: Pick<SceneProps, 'settings' | 'action' | 'plant' | 'onWave' | 'mood' | 'gardenView'> & { onRendered: () => void }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const frames = useRef(0);
  useFrame(({ clock }) => {
    frames.current += 1;
    if (frames.current === 3) onRendered();
    const pose = robotPose(clock.elapsedTime, action, settings.reducedMotion);
    if (root.current) { root.current.rotation.y = pose.yaw; root.current.position.x = pose.x - (gardenView ? 0.45 : 0); root.current.position.z = pose.z; }
    if (body.current) { body.current.position.y = pose.bodyY; body.current.rotation.z = pose.bodyTilt; }
    if (head.current) { head.current.rotation.z = pose.headTilt; head.current.rotation.y = pose.headTurn; }
    if (left.current) left.current.rotation.z = pose.leftArm;
    if (right.current) right.current.rotation.z = pose.rightArm;
  });
  return <group ref={root} position={[0, -1.8, 0]}>
    <Tracks side={-1} action={action} reducedMotion={settings.reducedMotion} />
    <Tracks side={1} action={action} reducedMotion={settings.reducedMotion} />
    <RoundedBox args={[1.7, 0.28, 1.1]} position={[0, 0.61, 0]} radius={0.09} smoothness={3} castShadow><meshStandardMaterial color="#303633" metalness={0.8} roughness={0.5} /></RoundedBox>
    <group ref={body}>
      <RoundedBox args={[1.65, 1.45, 1.09]} position={[0, 1.57, 0]} radius={0.10} smoothness={4} castShadow><meshStandardMaterial color={settings.shell} metalness={0.25} roughness={0.42} /></RoundedBox>
      <RoundedBox args={[1.77, 0.09, 1.17]} position={[0, 2.24, 0]} radius={0.025} smoothness={2} castShadow><meshStandardMaterial color="#232929" metalness={0.7} /></RoundedBox>
      <mesh position={[0.75, 1.45, 0.555]}><boxGeometry args={[0.16, 0.90, 0.015]} /><meshStandardMaterial color={settings.livery} roughness={0.4} /></mesh>
      <mesh position={[0.60, 1.11, 0.561]} rotation={[0, 0, -0.65]}><boxGeometry args={[0.16, 0.61, 0.02]} /><meshStandardMaterial color={settings.livery} /></mesh>
      <Label text="09" position={[-0.06, 1.80, 0.555]} width={0.61} height={0.36} bg={settings.shell} size={220} />
      <Label text="WEE / UNIT" position={[-0.06, 1.54, 0.556]} width={0.47} height={0.11} bg={settings.shell} color={settings.livery} size={62} />
      <Label text="RE:GREEN / FIELD UNIT" position={[-0.1, 2.06, 0.557]} width={0.53} height={0.075} bg={settings.shell} size={40} />
      <RoundedBox args={[0.67, 0.35, 0.06]} position={[0.06, 1.13, 0.56]} radius={0.05} smoothness={3}><meshStandardMaterial color="#242e2d" metalness={0.5} /></RoundedBox>
      <Label text={action === 'charge' ? '+ + +' : mood === 'sleeping' ? 'z  z  z' : mood === 'happy' ? '^  _  ^' : mood === 'tired' ? '—  _  —' : '•  —  •'} position={[0.06, 1.14, 0.599]} width={0.50} height={0.18} color={settings.light} bg="#242e2d" size={80} />
      <mesh position={[-0.63, 1.58, 0.56]}><boxGeometry args={[0.09, 0.58, 0.025]} /><meshStandardMaterial color="#363d37" /></mesh>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[-0.63, 1.36 + i * 0.11, 0.58]}><boxGeometry args={[0.06, 0.055, 0.015]} /><meshStandardMaterial color={settings.light} emissive={settings.light} emissiveIntensity={0.4} /></mesh>)}
      {[-1, 1].flatMap(x => [-1, 1].map(y => <Bolt key={`${x}${y}`} position={[x * 0.68, 1.57 + y * 0.56, 0.558]} />))}
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[-0.835, 1.35 + i * 0.10, 0]}><boxGeometry args={[0.016, 0.035, 0.61]} /><meshStandardMaterial color="#6c7065" /></mesh>)}
      <Rod from={[0, 2.24, 0]} to={[0, 2.78, 0]} radius={0.12} />
      {[0, 1, 2].map(i => <mesh key={i} position={[0, 2.39 + i * 0.15, 0]}><cylinderGeometry args={[0.16, 0.16, 0.07, 12]} /><meshStandardMaterial color={i === 1 ? settings.livery : '#373f3f'} metalness={0.75} /></mesh>)}
      <group ref={head} position={[0, 3.23, 0]} onClick={e => { e.stopPropagation(); onWave(); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <RoundedBox args={[0.22, 0.86, 0.50]} radius={0.04} smoothness={2}><meshStandardMaterial color="#242b2b" metalness={0.8} roughness={0.4} /></RoundedBox>
        <Eye side={-1} settings={settings} mood={mood} /><Eye side={1} settings={settings} mood={mood} />
        {[0, 1, 2, 3].map(i => <mesh key={i} position={[0, 0.02 + i * 0.07, 0.29]}><boxGeometry args={[0.11, 0.03, 0.03]} /><meshStandardMaterial color={settings.light} emissive={settings.light} emissiveIntensity={0.6} /></mesh>)}
      </group>
      <Arm side={-1} settings={settings} armRef={left} /><Arm side={1} settings={settings} plant={plant} armRef={right} />
    </group>
  </group>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-error"><span>WEE está esperando</span><p>Para verlo en 3D, abre esta aplicación en un navegador con WebGL habilitado. Los controles del laboratorio siguen disponibles.</p></div> : this.props.children; }
}

function CameraControls({ enabled, reset }: { enabled: boolean; reset: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(5, 3, 7.7);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, reset]);
  return <OrbitControls ref={controls} makeDefault target={[0, 0, 0]} enabled={enabled}
    enablePan={false} minDistance={6.5} maxDistance={13} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 2 + 0.04} />;
}

function FramePump({ reducedMotion, activity, software }: { reducedMotion: boolean; activity: RobotAction; software: boolean }) {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => {
    let frames = 0;
    invalidate();
    const id = setInterval(() => {
      if (document.hidden) return;
      // Static poses still receive three initialization frames. OrbitControls
      // also invalidates on interaction, so the camera remains responsive.
      if (!reducedMotion || frames < 3) invalidate();
      frames += 1;
    }, 1000 / (software ? 15 : 40));
    return () => clearInterval(id);
  }, [invalidate, reducedMotion, activity, software]);
  return null;
}

export default memo(function RobotScene(props: SceneProps) {
  const [loaded, setLoaded] = useState(false);
  const [software, setSoftware] = useState(false);
  const environment = useMemo(() => <Environment resolution={128} frames={1}>
    <Lightformer form="rect" intensity={4} position={[-4, 4, 4]} scale={[5, 3, 1]} target={[0, 1, 0]} />
    <Lightformer form="rect" intensity={2} position={[3, 5, 0]} scale={[2, 5, 1]} target={[0, 1, 0]} />
    <Lightformer form="rect" intensity={1.5} position={[0, 2, -5]} scale={[5, 2, 1]} />
  </Environment>, []);
  const shadow = useMemo(() => <ContactShadows position={[0, -1.8, 0]} opacity={0.52} scale={12} blur={2.5} far={5} resolution={256} color="#424537" frames={1} />, []);
  return <SceneBoundary>
    {!loaded && <div className="scene-loader"><span className="loader-ring" /><span>DESPERTANDO A WEE</span></div>}
    <Canvas shadows frameloop="demand" dpr={software ? 0.75 : [1, 1.7]} camera={{ position: [5, 3, 7.7], fov: 38 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        const context = gl.getContext();
        const info = context.getExtension('WEBGL_debug_renderer_info');
        const renderer = info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) as string : '';
        setSoftware(/swiftshader|llvmpipe|software/i.test(renderer));
        props.onReady(gl.domElement);
      }}
      fallback={<div className="scene-error">Tu navegador necesita WebGL para mostrar a WEE.</div>}>
      <ambientLight intensity={props.settings.night ? 0.45 : 0.9} />
      <directionalLight position={[-4, 7, 5]} intensity={props.settings.night ? 1.0 : 2.4} color={props.settings.night ? '#b3c8ee' : '#ffffff'} />
      <directionalLight position={[5, 3, -4]} intensity={props.settings.night ? 1.5 : 1.7} color={props.settings.night ? '#9dd5cb' : '#e4e9ed'} />
      <Suspense fallback={null}>
        {environment}
        <Robot settings={props.settings} action={props.action} plant={props.plant} onWave={props.onWave} onRendered={() => setLoaded(true)} mood={props.mood} gardenView={props.gardenView} />
        <ProceduralHabitat zone={props.zone} garden={props.garden} gardenView={props.gardenView} night={props.settings.night} reducedMotion={props.settings.reducedMotion} selected={props.selectedPlot} onSelect={props.onSelectPlot} />
        {shadow}
        <FramePump reducedMotion={props.settings.reducedMotion} activity={props.action} software={software} />
      </Suspense>
      <CameraControls reset={props.cameraReset} enabled={props.settings.orbit} />
    </Canvas>
  </SceneBoundary>;
});
