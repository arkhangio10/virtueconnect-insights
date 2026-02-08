import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import earthTexture from "@/assets/earth-blue-marble.jpg";
import earthBump from "@/assets/earth-topology.png";

interface MarkerData {
  lat: number;
  lng: number;
  status: "validated" | "uncertain" | "anomaly";
  name: string;
  category: string;
  region: string;
  beds: number;
  lastAudit: string;
}

interface GlobeVisualizationProps {
  markers: MarkerData[];
  onMarkerClick?: (marker: MarkerData) => void;
  selectedMarkerName?: string | null;
}

const statusColorHex = {
  validated: "#22c55e",
  uncertain: "#eab308",
  anomaly: "#ef4444",
};

const statusClasses = {
  validated: "text-success",
  uncertain: "text-warning",
  anomaly: "text-danger",
};

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Ghana outline approximation (simplified polygon)
function createGhanaOutline(radius: number): THREE.Vector3[] {
  const ghanaCoords: [number, number][] = [
    [5.0, -3.2], [5.0, -1.2], [5.5, -0.2], [6.0, 0.5],
    [6.5, 0.7], [7.0, 0.5], [8.0, 0.3], [9.0, -0.1],
    [9.5, -0.3], [10.5, -0.5], [11.0, -0.8], [11.2, -1.0],
    [11.0, -1.5], [10.5, -2.0], [10.0, -2.5], [9.5, -2.8],
    [8.5, -3.0], [7.5, -3.0], [6.5, -3.0], [5.5, -3.2], [5.0, -3.2],
  ];
  return ghanaCoords.map(([lat, lng]) => latLngToVector3(lat, lng, radius + 0.015));
}

// Ghana highlighted region outline
function GhanaHighlight({ radius }: { radius: number }) {
  const outlinePoints = useMemo(() => createGhanaOutline(radius), [radius]);

  return (
    <group>
      {/* Bright outline */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={outlinePoints.length}
            array={new Float32Array(outlinePoints.flatMap((p) => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#38bdf8" opacity={0.85} transparent linewidth={2} />
      </line>
    </group>
  );
}

// Individual marker on the globe
function GlobeMarker({
  marker,
  radius,
  isSelected,
  onClick,
}: {
  marker: MarkerData;
  radius: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const position = useMemo(
    () => latLngToVector3(marker.lat, marker.lng, radius + 0.025),
    [marker.lat, marker.lng, radius]
  );
  const color = statusColorHex[marker.status];

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetScale = hovered || isSelected ? 1.8 : 1;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 8
      );
    }
  });

  return (
    <group position={position}>
      {/* Glow ring */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.04, 0.065, 32]} />
          <meshBasicMaterial color={color} opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Marker dot */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerEnter={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 2 : 0.8}
        />
      </mesh>

      {/* Vertical beam for selected */}
      {isSelected && (
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.12, 8]} />
          <meshBasicMaterial color={color} opacity={0.6} transparent />
        </mesh>
      )}

      {/* Tooltip on hover */}
      {hovered && !isSelected && (
        <Html distanceFactor={5} zIndexRange={[100, 0]}>
          <div className="bg-card/95 border border-border rounded-lg px-3 py-2 shadow-xl backdrop-blur-md whitespace-nowrap pointer-events-none">
            <p className="text-sm font-medium text-foreground">{marker.name}</p>
            <p className={cn("text-xs font-medium capitalize mt-0.5", statusClasses[marker.status])}>
              {marker.status} · {marker.region}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Atmosphere shader for realistic glow
function Atmosphere({ radius }: { radius: number }) {
  return (
    <group>
      {/* Inner atmosphere glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.015, 64, 64]} />
        <meshBasicMaterial
          color="#4da6ff"
          opacity={0.06}
          transparent
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Outer atmosphere halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.08, 64, 64]} />
        <meshBasicMaterial
          color="#1a8cff"
          opacity={0.03}
          transparent
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

// Textured Earth Globe
function EarthSphere({ radius }: { radius: number }) {
  const [colorMap, bumpMap] = useLoader(THREE.TextureLoader, [earthTexture, earthBump]);

  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshPhongMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.04}
        shininess={8}
        specular={new THREE.Color("#1a3a5c")}
      />
    </mesh>
  );
}

// Africa spotlight - point light focused on Ghana/West Africa
function AfricaSpotlight({ radius }: { radius: number }) {
  const ghanaCenter = useMemo(() => latLngToVector3(7.5, -1.0, radius + 1.5), [radius]);
  
  return (
    <group>
      <pointLight
        position={ghanaCenter}
        intensity={0.6}
        distance={3}
        color="#38bdf8"
        decay={2}
      />
    </group>
  );
}

// Auto-rotating globe
function RotatingGlobe({
  markers,
  onMarkerClick,
  selectedMarkerName,
}: {
  markers: MarkerData[];
  onMarkerClick: (marker: MarkerData) => void;
  selectedMarkerName: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);

  useFrame((_, delta) => {
    if (groupRef.current && !isDragging) {
      groupRef.current.rotation.y += delta * 0.06;
    }
  });

  const RADIUS = 2;

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-3, -1, -4]} intensity={0.15} color="#0a2a4a" />
      <pointLight position={[3, 2, 4]} intensity={0.4} color="#e0f2fe" />

      <group ref={groupRef}>
        <EarthSphere radius={RADIUS} />
        <Atmosphere radius={RADIUS} />
        <AfricaSpotlight radius={RADIUS} />

        {/* Ghana outline */}
        <GhanaHighlight radius={RADIUS} />

        {/* Markers */}
        {markers.map((marker) => (
          <GlobeMarker
            key={marker.name}
            marker={marker}
            radius={RADIUS}
            isSelected={selectedMarkerName === marker.name}
            onClick={() => onMarkerClick(marker)}
          />
        ))}
      </group>

      <Stars radius={80} depth={60} count={2000} factor={3} fade speed={0.8} />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3.2}
        maxDistance={8}
        autoRotate={false}
        onStart={() => setIsDragging(true)}
        onEnd={() => setIsDragging(false)}
      />
    </>
  );
}

const GlobeVisualization = ({ markers, onMarkerClick, selectedMarkerName }: GlobeVisualizationProps) => {
  const handleMarkerClick = useCallback(
    (marker: MarkerData) => {
      onMarkerClick?.(marker);
    },
    [onMarkerClick]
  );

  return (
    <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-[#040a14] rounded-none overflow-hidden">
      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#040a14"]} />
        <fog attach="fog" args={["#040a14", 8, 16]} />
        <RotatingGlobe
          markers={markers}
          onMarkerClick={handleMarkerClick}
          selectedMarkerName={selectedMarkerName ?? null}
        />
      </Canvas>
    </div>
  );
};

export default GlobeVisualization;
