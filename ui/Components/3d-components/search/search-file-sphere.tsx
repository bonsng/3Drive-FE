import FolderModel from "@/lib/folder-model";
import FileModel from "@/lib/file-model";
import { getTypeFromExtension } from "@/lib/extension";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import clsx from "clsx";
import { useFileTree } from "@/ui/Components/context/file-tree-context";
import { useModal } from "@/ui/Modal/modal.hook";

interface SearchFileSphereProps {
  id: number;
  position: [number, number, number];
  type: "file" | "folder" | "root";
  initialPosition: [number, number, number];
  title: string;
  delay?: number;
  parentId: number | null;
}

const SearchFileSphere = ({
  id,
  position,
  type,
  initialPosition,
  title,
  delay = 0,
  parentId,
}: SearchFileSphereProps) => {
  const modelRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [initialScale, setInitialScale] = useState(0);
  const [visible, setVisible] = useState(false);
  const [showText, setShowText] = useState(false);
  const [currentPosition, setCurrentPosition] =
    useState<[number, number, number]>(initialPosition);
  const { setMenuNodeId, setIsMenu, setContextMenuPos } = useFileTree();
  const { openModal } = useModal("FileModal");
  const extension = getTypeFromExtension(
    title?.split(".").pop()?.toLowerCase(),
  );

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    const textTimer = setTimeout(() => setShowText(true), delay + 500);
    return () => {
      clearTimeout(timer);
      clearTimeout(textTimer);
    };
  }, [delay]);

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (title) openModal({ title, ext: extension, parentId });
  };

  const handlePointerOver = (e: PointerEvent) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e: PointerEvent) => {
    e.stopPropagation();
    setHovered(false);
  };

  useEffect(() => {
    if (!visible) return;
    let frameId: number;
    let phase = 0;

    const animate = () => {
      setInitialScale((prev) => {
        let next = prev;
        if (phase === 0) {
          next = prev + 0.1;
          if (next >= 1.5) {
            next = 1.5;
            phase = 1;
          }
        } else if (phase === 1) {
          next = prev - 0.05;
          if (next <= 1.0) {
            next = 1.0;
            cancelAnimationFrame(frameId);
            return next;
          }
        }
        frameId = requestAnimationFrame(animate);
        return next;
      });
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [visible]);

  useFrame(() => {
    if (!modelRef.current) return;
    const target = hovered ? 1.5 : initialScale;
    const current = modelRef.current.scale.x;
    const scale = THREE.MathUtils.lerp(current, target, 0.1);
    modelRef.current.scale.set(scale, scale, scale);

    // animate position
    const newPos = currentPosition.map((val, idx) =>
      THREE.MathUtils.lerp(val, position[idx], 0.1),
    ) as [number, number, number];
    setCurrentPosition(newPos);

    modelRef.current.position.set(...newPos);

    if (modelRef.current) {
      modelRef.current.rotation.y += 0.001;
    }
  });
  useEffect(() => {
    const current = document.body.style.cursor;
    const next = hovered ? "pointer" : "auto";
    if (current !== next) {
      document.body.style.cursor = next;
    }
  }, [hovered]);

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { clientX, clientY } = e.nativeEvent;
    setContextMenuPos({ x: clientX, y: clientY });
    setIsMenu(true);
    setMenuNodeId(id);
  };
  return (
    <group
      ref={modelRef}
      position={currentPosition}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onContextMenu={handleContextMenu}
      onDoubleClick={type === "file" && handleDoubleClick}
    >
      {type === "folder" ? (
        <FolderModel />
      ) : (
        <FileModel
          extension={getTypeFromExtension(
            title?.split(".").pop()?.toLowerCase(),
          )}
        />
      )}
      {title && (
        <Html
          center
          position={[0, 0.06, 0]}
          distanceFactor={1.3}
          zIndexRange={[0, 5]}
        >
          <div
            className={clsx(
              "bg-transparent text-xs whitespace-nowrap transition-opacity pointer-events-none rounded-sm p-1 duration-500 ease-in-out opacity-0",
              { "text-white opacity-100": hovered && showText },
              { "text-gray-400 opacity-100": !hovered && showText },
            )}
          >
            {title}
          </div>
        </Html>
      )}
      <mesh visible={false}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial transparent={true} opacity={0} />
      </mesh>
    </group>
  );
};

export default SearchFileSphere;
