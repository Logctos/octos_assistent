"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type AvatarStatus = "idle" | "listening" | "thinking" | "speaking";

interface RobotParts {
  group: THREE.Group;
  eyeLeft: THREE.Mesh;
  eyeRight: THREE.Mesh;
  core: THREE.Mesh;
  ring: THREE.Mesh;
}

function buildRobot(accentColor: number): RobotParts {
  const group = new THREE.Group();
  const accentDim = new THREE.Color(accentColor).multiplyScalar(0.14).getHex();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    metalness: 0.6,
    roughness: 0.35,
    emissive: accentDim,
    emissiveIntensity: 0.4,
  });
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: accentColor,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: accentColor });

  function withWireframe(geometry: THREE.BufferGeometry) {
    const solid = new THREE.Mesh(geometry, bodyMaterial);
    const wire = new THREE.Mesh(geometry, wireMaterial);
    solid.add(wire);
    return solid;
  }

  // angular skull
  const head = withWireframe(new THREE.IcosahedronGeometry(0.9, 0));
  head.scale.set(0.95, 1.3, 0.85);
  head.position.y = 0.95;
  group.add(head);

  // furrowed, glowing eye slits
  const eyeGeometry = new THREE.BoxGeometry(0.34, 0.08, 0.05);
  const eyeLeft = new THREE.Mesh(eyeGeometry, glowMaterial.clone());
  eyeLeft.position.set(-0.32, 1.0, 0.72);
  eyeLeft.rotation.z = 0.35;
  group.add(eyeLeft);

  const eyeRight = new THREE.Mesh(eyeGeometry, glowMaterial.clone());
  eyeRight.position.set(0.32, 1.0, 0.72);
  eyeRight.rotation.z = -0.35;
  group.add(eyeRight);

  // neck
  const neck = withWireframe(new THREE.CylinderGeometry(0.22, 0.28, 0.28, 6));
  neck.position.y = 0.15;
  group.add(neck);

  // angular shoulders/torso
  const torso = withWireframe(new THREE.CylinderGeometry(1.05, 0.85, 0.7, 6));
  torso.position.y = -0.35;
  group.add(torso);

  // hexagonal power core
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.14, 6),
    glowMaterial.clone()
  );
  core.position.set(0, -0.32, 0.72);
  core.rotation.x = Math.PI / 2;
  group.add(core);

  // diamond targeting ring around the core
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.03, 6, 4),
    new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.55 })
  );
  ring.position.copy(core.position);
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = Math.PI / 4;
  group.add(ring);

  return { group, eyeLeft, eyeRight, core, ring };
}

export function OctosAvatar({
  status,
  size = 140,
  accentColor = 0xef4444,
}: {
  status: AvatarStatus;
  size?: number;
  /** Hex color (e.g. 0xef4444) for the glowing wireframe/eyes/core. Defaults to the app's red. */
  accentColor?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.3, 4.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x404040, 1.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(1.5, 2, 2.5);
    scene.add(keyLight);
    const coreLight = new THREE.PointLight(accentColor, 6, 4);
    coreLight.position.set(0, -0.3, 1.2);
    scene.add(coreLight);

    const { group, eyeLeft, eyeRight, core, ring } = buildRobot(accentColor);
    scene.add(group);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.3, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = (Math.PI * 2) / 3;
    controls.update();

    const eyeMaterials = [eyeLeft, eyeRight].map((m) => m.material as THREE.MeshBasicMaterial);
    const coreMaterial = core.material as THREE.MeshBasicMaterial;
    const accentBase = new THREE.Color(accentColor);
    const accentBright = accentBase.clone().lerp(new THREE.Color(0xffffff), 0.55);

    let frameId = 0;
    const clock = new THREE.Clock();

    function tick() {
      const t = clock.getElapsedTime();
      const current = statusRef.current;

      let bobFrequency = 0.8;
      let bobAmplitude = 0.05;
      let glowPulse = 0.85 + Math.sin(t * 1.2) * 0.15;

      if (current === "listening") {
        bobFrequency = 2.6;
        bobAmplitude = 0.08;
        glowPulse = 1;
        group.rotation.y += 0.004;
      } else if (current === "thinking") {
        bobFrequency = 1.6;
        bobAmplitude = 0.04;
        glowPulse = 0.75 + Math.sin(t * 5) * 0.25;
        group.rotation.y = Math.sin(t * 1.8) * 0.4;
      } else if (current === "speaking") {
        bobFrequency = 5.5;
        bobAmplitude = 0.09;
        glowPulse = 0.7 + Math.abs(Math.sin(t * 9)) * 0.4;
        group.rotation.z = Math.sin(t * 5.5) * 0.03;
        group.rotation.y += 0.006;
      } else {
        group.rotation.y += 0.0025;
      }

      group.position.y = Math.sin(t * bobFrequency) * bobAmplitude;

      const eyeIntensity = current === "idle" ? 0.6 : 0.6 + glowPulse * 0.6;
      eyeMaterials.forEach((mat) => {
        mat.color.copy(accentBase).lerp(accentBright, eyeIntensity);
      });

      const coreScale = 1 + glowPulse * 0.12;
      core.scale.setScalar(coreScale);
      coreMaterial.color.copy(accentBase).lerp(accentBright, glowPulse);

      ring.rotation.z += current === "thinking" || current === "speaking" ? 0.02 : 0.008;

      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material.dispose();
          }
        }
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [size, accentColor]);

  return (
    <div
      ref={containerRef}
      className="octos-avatar"
      data-status={status}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
