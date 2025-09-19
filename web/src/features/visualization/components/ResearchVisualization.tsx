"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Box } from "@react-three/drei";
import { Suspense } from "react";

function ResearchNodes() {
  return (
    <>
      {/* Central Query Node */}
      <Box position={[0, 0, 0]} args={[1, 1, 1]}>
        <meshStandardMaterial color="blue" />
      </Box>

      {/* Sample Result Nodes */}
      <Box position={[2, 1, 0]} args={[0.5, 0.5, 0.5]}>
        <meshStandardMaterial color="green" />
      </Box>

      <Box position={[-2, -1, 0]} args={[0.5, 0.5, 0.5]}>
        <meshStandardMaterial color="orange" />
      </Box>

      <Box position={[1, -2, 1]} args={[0.5, 0.5, 0.5]}>
        <meshStandardMaterial color="red" />
      </Box>

      {/* Labels */}
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Research Query
      </Text>
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-lg">Loading 3D Visualization...</div>
    </div>
  );
}

interface ResearchVisualizationProps {
  className?: string;
}

export function ResearchVisualization({
  className = "",
}: ResearchVisualizationProps) {
  return (
    <div className={`w-full h-96 bg-gray-900 rounded-lg ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas camera={{ position: [5, 5, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />

          <ResearchNodes />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={20}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
