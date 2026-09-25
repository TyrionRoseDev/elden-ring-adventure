// PROTOTYPE: sky, floating grace motes, and a puff pool for dust and steam.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshToonMaterial,
  type Points,
  SphereGeometry,
  Vector3,
  type Group,
} from "three";
import type { Look } from "./looks";

export function Sky({ look }: { look: Look }) {
  const uniforms = useMemo(
    () => ({
      top: { value: new Color(look.sky.top) },
      horizon: { value: new Color(look.sky.horizon) },
      ground: { value: new Color(look.sky.ground) },
    }),
    [look],
  );
  return (
    <mesh scale={90}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; varying vec3 vDir;
          void main(){ float h = vDir.y;
            vec3 c = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.55, h), 0.7)) : mix(horizon, ground, smoothstep(0.0, 0.08, -h));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,240,190,1)");
  grd.addColorStop(0.3, "rgba(255,210,110,0.6)");
  grd.addColorStop(1, "rgba(255,200,90,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export function Motes({ count = 160 }) {
  const ref = useRef<Points>(null);
  const { geo, seeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      seeds[i] = Math.random() * 100;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    return { geo, seeds };
  }, [count]);
  const tex = useMemo(dotTexture, []);
  useFrame((state, dt) => {
    const p = geo.attributes.position as BufferAttribute;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const s = seeds[i]!;
      p.setY(i, (p.getY(i) + dt * (0.08 + (s % 1) * 0.1)) % 4);
      p.setX(i, p.getX(i) + Math.sin(t * 0.5 + s) * dt * 0.08);
    }
    p.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        map={tex}
        size={0.09}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        fog={false}
        toneMapped={false}
      />
    </points>
  );
}

type Puff = { mesh: Mesh; life: number; max: number; vel: Vector3; grow: number; size: number };

export type PuffEmitter = {
  burst: (at: Vector3, opts: { count: number; speed: number; size: number; life: number; color: string; up?: number }) => void;
};

/** A pool of soft toon balls. Call burst() for impact dust or teacup steam. */
export function Puffs({ emitter }: { emitter: { current: PuffEmitter | null } }) {
  const group = useRef<Group>(null);
  const pool = useMemo(() => {
    const geo = new SphereGeometry(1, 12, 8);
    return Array.from({ length: 60 }, (): Puff => {
      const mesh = new Mesh(geo, new MeshToonMaterial({ color: "#e8dcc2", transparent: true }));
      mesh.visible = false;
      return { mesh, life: 0, max: 1, vel: new Vector3(), grow: 1, size: 0.1 };
    });
  }, []);
  emitter.current = {
    burst(at, { count, speed, size, life, color, up = 0.3 }) {
      let n = 0;
      for (const p of pool) {
        if (n >= count) break;
        if (p.mesh.visible) continue;
        n++;
        const a = Math.random() * Math.PI * 2;
        p.mesh.position.copy(at).add(new Vector3(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05));
        p.vel.set(Math.cos(a) * speed, up * (0.5 + Math.random()), Math.sin(a) * speed);
        p.life = 0;
        p.max = life * (0.7 + Math.random() * 0.6);
        p.size = size * (0.6 + Math.random() * 0.8);
        (p.mesh.material as MeshToonMaterial).color.set(color);
        p.mesh.visible = true;
      }
    },
  };
  useFrame((_, dt) => {
    for (const p of pool) {
      if (!p.mesh.visible) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.multiplyScalar(1 - dt * 3);
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(p.size * (0.4 + Math.sqrt(k)));
      (p.mesh.material as MeshToonMaterial).opacity = 1 - k * k;
    }
  });
  return (
    <group ref={group}>
      {pool.map((p, i) => (
        <primitive key={i} object={p.mesh} />
      ))}
    </group>
  );
}
