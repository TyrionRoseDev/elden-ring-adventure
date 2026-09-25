// PROTOTYPE: placeholder capsule stage. Every pose is a pure function of the combat state, applied each frame.
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";
import { GAGS, useSel, type Core, type State } from "./core";

const PX = -1.6; // Tarnished home
const BX = 1.6; // Margit home
const TAU = Math.PI * 2;
const REST = -0.3; // cane hanging forward

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const easeIn = (p: number) => p * p * p;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

type BossPose = {
  x: number;
  y: number;
  lean: number;
  arm: number; // arm angle, see REST
  weapon: "cane" | "hammer";
  cup: "none" | "hand" | "mouth" | "down";
  cupAt: [number, number, number] | null; // world position when set down
  glint: number;
  daggers: ({ x: number; y: number; z: number; rot: number } | null)[];
};

type PlayerPose = {
  x: number;
  y: number;
  rotZ: number;
  scale: [number, number, number];
  sword: number;
  shield: boolean;
  flask: boolean;
  biscuit: boolean;
  stuck: number; // daggers stuck in the Tarnished
  pivot: "feet" | "center";
};

function bossPose(s: State): BossPose {
  const b = s.boss;
  const pose: BossPose = { x: BX, y: 0, lean: 0, arm: REST, weapon: "cane", cup: "none", cupAt: null, glint: 0, daggers: [null, null, null] };
  pose.y = Math.sin(s.time * 2.2) * 0.02;
  pose.lean = -b.flinch * 0.25;
  if (s.mode === "won") {
    pose.y = -0.45;
    pose.lean = 0.5;
    pose.cup = "mouth";
    return pose;
  }
  const a = b.attack;
  if (!a) return pose;
  const t = b.at;
  const hit = a.hits[0]!;
  const back = seg(t, a.end - 0.45, a.end);
  if (a.id === "cane") {
    const raise = easeOut(seg(t, 0, 0.8));
    const slam = easeIn(seg(t, 0.85, hit));
    pose.arm = t < 0.85 ? lerp(REST, Math.PI, raise) : lerp(Math.PI, 5.0, slam);
    if (t > hit) pose.arm = lerp(5.0, TAU + REST, back);
    pose.x = lerp(BX, 1.2, raise);
    if (t >= 0.85) pose.x = lerp(1.2, -0.1, slam);
    if (t > hit) pose.x = lerp(-0.1, BX, easeOut(back));
    pose.glint = t > 0.6 && t < 0.85 ? Math.sin(seg(t, 0.6, 0.85) * Math.PI) : 0;
    pose.lean = t < 0.85 ? -0.15 * raise : 0.3 * slam;
  } else if (a.id === "daggers") {
    pose.arm = lerp(REST, Math.PI * 0.9, easeOut(seg(t, 0, 0.35)));
    if (t > a.hits[2]!) pose.arm = lerp(Math.PI * 0.9, TAU + REST, back);
    a.hits.forEach((h, i) => {
      if (t < 0.3 || t > h + 0.25) return;
      const hover = { x: BX - 0.1, y: 2.5 + i * 0.05, z: (i - 1) * 0.45 };
      const fly = seg(t, h - 0.3, h);
      const past = seg(t, h, h + 0.25);
      pose.daggers[i] = {
        x: lerp(hover.x, PX, fly) - past * 2.5,
        y: lerp(hover.y, 0.55, fly) - past * 0.5,
        z: lerp(hover.z, 0, fly),
        rot: fly > 0 ? Math.PI / 2 : 0,
      };
      if (t > h - 0.5 && t < h - 0.3) pose.glint = Math.max(pose.glint, Math.sin(seg(t, h - 0.5, h - 0.3) * Math.PI));
    });
  } else {
    pose.weapon = "hammer";
    const raise = easeOut(seg(t, 0, 0.4));
    const slam = easeIn(seg(t, hit - 0.12, hit));
    pose.arm = t < hit - 0.12 ? lerp(REST, Math.PI, raise) : lerp(Math.PI, 5.0, slam);
    if (t > hit) pose.arm = lerp(5.0, TAU + REST, back);
    pose.x = t < hit - 0.12 ? lerp(BX, 1.3, raise) : lerp(1.3, 0.0, slam);
    if (t > hit) pose.x = lerp(0.0, BX, easeOut(back));
    if (t > 0.45 && t < hit - 0.3) pose.cup = Math.sin((t - 0.45) * 5) > -0.2 ? "mouth" : "hand";
    pose.glint = t > hit - 0.35 && t < hit - 0.12 ? Math.sin(seg(t, hit - 0.35, hit - 0.12) * Math.PI) : 0;
    pose.lean = b.sipping ? -0.12 : 0.3 * slam;
  }
  return pose;
}

function playerPose(s: State): PlayerPose {
  const pose: PlayerPose = { x: PX, y: 0, rotZ: 0, scale: [1, 1, 1], sword: 0.4, shield: false, flask: false, biscuit: false, stuck: 0, pivot: "feet" };
  const act = s.player.act;
  const t = act.t;
  pose.y = Math.abs(Math.sin(s.time * 3)) * 0.02;
  switch (act.kind) {
    case "dodge": {
      const p = seg(t, 0, act.dur);
      pose.x = PX + act.dir * (act.dir > 0 ? 1.6 : 1.0) * Math.sin(p * Math.PI);
      pose.rotZ = -act.dir * TAU * easeOut(p);
      pose.scale = [1.1, 0.85, 1.1];
      pose.pivot = "center";
      break;
    }
    case "strike":
    case "heavy": {
      const wind = act.kind === "heavy" ? 0.62 : 0.2;
      const lunge = seg(t, wind, wind + 0.12);
      const ret = seg(t, wind + 0.2, act.dur);
      pose.x = PX + 1.8 * easeOut(lunge) * (1 - easeOut(ret));
      pose.sword = t < wind ? lerp(0.4, act.kind === "heavy" ? 3.0 : 2.0, easeOut(seg(t, 0, wind))) : lerp(act.kind === "heavy" ? 3.0 : 2.0, -1.4, easeOut(lunge));
      if (ret > 0) pose.sword = lerp(-1.4, 0.4, ret);
      break;
    }
    case "charge":
      pose.sword = 3.0 + Math.sin(s.real * 60) * Math.min(0.25, t * 0.2);
      pose.x = PX + Math.sin(s.real * 70) * Math.min(0.04, t * 0.03);
      break;
    case "flask":
      pose.flask = true;
      pose.rotZ = 0.25 * Math.sin(seg(t, 0.2, 0.9) * Math.PI);
      break;
    case "guard":
      pose.shield = true;
      break;
    case "hurt":
      pose.x = PX - 0.35 * Math.sin(seg(t, 0, act.dur) * Math.PI);
      pose.rotZ = 0.35 * Math.sin(seg(t, 0, act.dur) * Math.PI);
      break;
    case "hop":
      pose.y = Math.abs(Math.sin((t / 0.6) * Math.PI)) * 0.6; // one hop per dagger
      break;
    case "biscuit":
      pose.biscuit = true;
      break;
    case "trip":
      pose.y = 0.15 * seg(t, 0, 0.3) * (1 - seg(t, 1.0, act.dur));
      pose.rotZ = -1.45 * easeOut(seg(t, 0, 0.3)) * (1 - seg(t, 1.0, act.dur));
      pose.sword = -1;
      break;
    case "idle":
      break;
  }
  return pose;
}

/** The Gag: the kill, then Margit's Aftermath. Overrides both poses. */
function gagPoses(s: State, pp: PlayerPose, bp: BossPose) {
  const g = s.gag!;
  const t = g.t;
  bp.daggers = [null, null, null];
  bp.x = BX;
  bp.arm = REST;
  const walkTo = (x: number, a: number, b: number) => (bp.x = lerp(BX, x, easeOut(seg(t, a, b))));
  const sit = (a: number) => {
    const p = easeOut(seg(t, a, a + 0.4));
    bp.y = -0.42 * p;
    bp.lean = 0.25 * p;
  };
  const sip = (a: number) => {
    if (t > a) bp.cup = Math.sin((t - a) * 3) > 0.1 ? "mouth" : "hand";
  };
  switch (g.id) {
    case "pancake": {
      const squash = easeOut(seg(t, 0, 0.12));
      pp.scale = [lerp(1, 2.2, squash), lerp(1, 0.07, squash), lerp(1, 2.2, squash)];
      pp.sword = -1.5;
      bp.arm = lerp(5.0, REST, seg(t, 0.2, 0.6));
      walkTo(PX + 0.25, 0.7, 1.6);
      sit(1.6);
      sip(2.2);
      break;
    }
    case "pincushion": {
      pp.stuck = 3;
      pp.rotZ = t < 0.8 ? 0 : -Math.PI / 2 * easeIn(seg(t, 0.8, 1.1));
      pp.y = t < 0.8 ? Math.abs(Math.sin(t * 20)) * 0.05 : 0.2 * easeIn(seg(t, 0.8, 1.1));
      pp.x = PX + (t < 0.8 ? 0 : 0.25);
      walkTo(PX + 1.3, 1.2, 2.2);
      if (t > 2.4) bp.cupAt = [PX + 0.45, 0.48, 0];
      else sip(1.4);
      sit(2.6);
      if (t > 3.1) bp.cup = "none";
      break;
    }
    case "launch": {
      const up = seg(t, 0, 1.2);
      const down = seg(t, 3.1, 3.5);
      if (t < 3.1) {
        pp.x = PX - 3 * up;
        pp.y = 14 * up * (1 - up * 0.3);
        pp.rotZ = t * 14;
      } else {
        pp.x = lerp(PX - 3, 0.6, down);
        pp.y = lerp(14, 0.35, easeIn(down));
        pp.rotZ = Math.PI;
      }
      pp.pivot = "center";
      if (t >= 3.1) pp.y -= 0.65; // head first into the turf
      bp.x = 0.4;
      bp.arm = t < 1.5 ? 5.0 : REST;
      bp.weapon = "hammer";
      sit(1.6);
      sip(2.0);
      bp.lean = t > 1.2 && t < 1.8 ? -0.35 : bp.lean; // watching the sky
      break;
    }
    case "bonk": {
      const taps = [0.3, 0.9];
      bp.x = PX + 1.25;
      bp.arm = TAU - 1.3 + taps.reduce((v, a) => v + Math.sin(seg(t, a, a + 0.3) * Math.PI) * 0.35, 0);
      if (t > 1.5) {
        bp.arm = lerp(Math.PI, 5.0, easeIn(seg(t, 1.5, 1.62)));
        const squash = easeOut(seg(t, 1.62, 1.72));
        pp.scale = [lerp(1, 2.2, squash), lerp(1, 0.07, squash), lerp(1, 2.2, squash)];
      }
      if (t > 1.4 && t < 1.5) bp.arm = Math.PI;
      sit(2.4);
      if (t > 2.4) bp.x = PX + 0.25;
      sip(2.9);
      break;
    }
  }
}

function gagBubble(s: State): string | null {
  const g = s.gag;
  if (!g) return s.bossBubble;
  const t = g.t;
  if (g.id === "launch" && t > 1.1 && t < 1.8) return "👀";
  if (g.id === "bonk" && t < 1.3) return "…hello?";
  if (g.id === "pincushion" && t > 2.3 && t < 2.9) return "*sets cup down*";
  if (t > GAGS[g.id].dur - 1.4) return "☕ *sip*";
  return null;
}

export function Stage({ core, children }: { core: Core; children?: ReactNode }) {
  const player = useRef<Group>(null);
  const pBody = useRef<Group>(null);
  const pInner = useRef<Group>(null);
  const sword = useRef<Group>(null);
  const shield = useRef<Mesh>(null);
  const flask = useRef<Mesh>(null);
  const biscuit = useRef<Mesh>(null);
  const stuck = useRef<Group>(null);
  const boss = useRef<Group>(null);
  const bBody = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const cane = useRef<Group>(null);
  const hammer = useRef<Group>(null);
  const cup = useRef<Group>(null);
  const glint = useRef<Mesh>(null);
  const daggers = useRef<(Group | null)[]>([]);
  const flinchMat = useRef<MeshStandardMaterial>(null);
  const hurtMat = useRef<MeshStandardMaterial>(null);
  const cam = useThree((s) => s.camera) as PerspectiveCamera;

  useFrame(() => {
    const s = core.state;
    const pp = playerPose(s);
    const bp = bossPose(s);
    if (s.gag) gagPoses(s, pp, bp);

    player.current!.position.set(pp.x, pp.y, 0);
    const centre = pp.pivot === "center" ? 0.5 : 0;
    pBody.current!.position.y = centre * pp.scale[1];
    pInner.current!.position.y = -centre;
    pBody.current!.rotation.z = pp.rotZ;
    pBody.current!.scale.set(...pp.scale);
    sword.current!.rotation.z = -pp.sword;
    shield.current!.visible = pp.shield;
    flask.current!.visible = pp.flask;
    biscuit.current!.visible = pp.biscuit;
    stuck.current!.visible = pp.stuck > 0;
    hurtMat.current!.emissiveIntensity = s.flash * 1.5;

    boss.current!.position.set(bp.x, bp.y, 0);
    bBody.current!.rotation.z = bp.lean;
    arm.current!.rotation.z = bp.arm;
    cane.current!.visible = bp.weapon === "cane";
    hammer.current!.visible = bp.weapon === "hammer";
    flinchMat.current!.emissiveIntensity = s.boss.flinch * 1.2;
    const c = cup.current!;
    c.visible = bp.cup !== "none" || bp.cupAt !== null;
    if (bp.cupAt) {
      c.parent !== boss.current!.parent && boss.current!.parent!.add(c);
      c.position.set(...bp.cupAt);
    } else {
      c.parent !== bBody.current && bBody.current!.add(c);
      if (bp.cup === "mouth") c.position.set(-0.36, 1.6, 0.12);
      else c.position.set(-0.42, 1.05, 0.34);
    }
    const g = glint.current!;
    g.visible = bp.glint > 0.01;
    g.scale.set(0.03 + bp.glint * 0.07, 0.05 + bp.glint * 0.3, 0.03 + bp.glint * 0.07);
    g.rotation.z = Math.PI / 4 + Math.sin(s.real * 9) * 0.2;
    const tip = bp.weapon === "cane" && s.boss.attack?.id !== "daggers";
    if (s.boss.attack?.id === "daggers") g.position.set(BX - 0.1, 2.6, 0);
    else {
      const len = tip ? 1.4 : 1.3;
      g.position.set(bp.x - 0.25 + Math.sin(bp.arm) * len, 1.35 + bp.y - Math.cos(bp.arm) * len, 0.3);
    }
    bp.daggers.forEach((d, i) => {
      const m = daggers.current[i];
      if (!m) return;
      m.visible = !!d;
      if (d) {
        m.position.set(d.x, d.y, d.z);
        m.rotation.z = d.rot;
      }
    });

    // camera: fixed three-quarter shot, shake on hits, push in during slow-mo
    const shake = s.shake * s.shake * 0.25;
    const zoom = 1 - s.scale;
    cam.position.set(Math.sin(s.real * 53) * shake, 2.3 + Math.cos(s.real * 47) * shake - zoom * 0.1, 7.4 - zoom * 0.9);
    cam.lookAt(-0.2, 1.0 - zoom * 0.15, 0);
    const launched = s.gag?.id === "launch" && s.gag.t > 0.4 && s.gag.t < 3.3;
    if (launched) cam.lookAt(-1.2, 1.9, 0);
  });

  const bubble = useSel(core, gagBubble);
  const playerBubble = useSel(core, (s) => s.playerBubble);

  return (
    <>
      <color attach="background" args={["#e9d8b2"]} />
      <fog attach="fog" args={["#e9d8b2", 12, 30]} />
      <hemisphereLight args={["#fff4dc", "#6c5a3a", 1.4]} />
      <directionalLight position={[-4, 8, 6]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#8c8a55" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <ringGeometry args={[3.4, 3.55, 64]} />
        <meshStandardMaterial color="#6f6b40" roughness={1} />
      </mesh>

      {/* the Tarnished */}
      <group ref={player}>
        <group ref={pBody}>
          <group ref={pInner}>
          <mesh position-y={0.42} castShadow>
            <capsuleGeometry args={[0.21, 0.26, 6, 16]} />
            <meshStandardMaterial ref={hurtMat} color="#8a7454" emissive="#ff2020" emissiveIntensity={0} roughness={0.9} />
          </mesh>
          <mesh position-y={0.86} castShadow>
            <sphereGeometry args={[0.21, 20, 16]} />
            <meshStandardMaterial color="#9a9a94" metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh position={[0.17, 0.88, 0]}>
            <boxGeometry args={[0.04, 0.05, 0.22]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <group ref={sword} position={[0.05, 0.5, 0.24]}>
            <mesh position-y={0.28} castShadow>
              <boxGeometry args={[0.05, 0.5, 0.02]} />
              <meshStandardMaterial color="#d9d9e0" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position-y={0.02}>
              <boxGeometry args={[0.16, 0.03, 0.04]} />
              <meshStandardMaterial color="#6b4f2a" />
            </mesh>
          </group>
          <mesh ref={shield} position={[0.3, 0.5, -0.1]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 20]} />
            <meshStandardMaterial color="#7a5a32" roughness={0.8} />
          </mesh>
          <mesh ref={flask} position={[0.12, 0.95, 0.12]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color="#ff6a2a" emissive="#ff4a10" emissiveIntensity={1.4} />
          </mesh>
          <mesh ref={biscuit} position={[0.35, 0.6, 0.1]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.09, 0.09, 0.03, 16]} />
            <meshStandardMaterial color="#d6a45c" />
          </mesh>
          <group ref={stuck}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0.12, 0.35 + i * 0.2, (i - 1) * 0.12]} rotation-z={Math.PI / 2}>
                <coneGeometry args={[0.04, 0.3, 8]} />
                <meshStandardMaterial color="#ffd257" emissive="#c89000" emissiveIntensity={0.8} />
              </mesh>
            ))}
          </group>
          </group>
        </group>
        <Bubble y={1.45}>{playerBubble}</Bubble>
      </group>

      {/* Margit, the Fell Omen (a tall capsule with opinions) */}
      <group ref={boss}>
        <group ref={bBody}>
          <mesh position-y={0.85} castShadow>
            <capsuleGeometry args={[0.4, 0.95, 8, 20]} />
            <meshStandardMaterial ref={flinchMat} color="#4a4038" emissive="#ffffff" emissiveIntensity={0} roughness={0.95} />
          </mesh>
          <mesh position-y={1.82} castShadow>
            <sphereGeometry args={[0.3, 20, 16]} />
            <meshStandardMaterial color="#3a332c" roughness={1} />
          </mesh>
          <mesh position={[-0.24, 1.62, 0]}>
            <sphereGeometry args={[0.17, 14, 12]} />
            <meshStandardMaterial color="#e8e2d4" roughness={1} />
          </mesh>
          {[-0.09, 0.09].map((z) => (
            <mesh key={z} position={[-0.26, 1.86, z]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#ffcf4a" emissive="#ffb000" emissiveIntensity={2} />
            </mesh>
          ))}
          <group ref={arm} position={[-0.25, 1.35, 0.3]}>
            <group ref={cane}>
              <mesh position-y={-0.7} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 1.4, 8]} />
                <meshStandardMaterial color="#5b4630" />
              </mesh>
            </group>
            <group ref={hammer}>
              <mesh position-y={-0.6} castShadow>
                <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
                <meshStandardMaterial color="#ffd257" emissive="#c89000" emissiveIntensity={0.5} />
              </mesh>
              <mesh position-y={-1.25} castShadow>
                <boxGeometry args={[0.45, 0.28, 0.28]} />
                <meshStandardMaterial color="#ffd257" emissive="#c89000" emissiveIntensity={0.7} metalness={0.6} roughness={0.3} />
              </mesh>
            </group>
          </group>
          <group ref={cup}>
            <mesh>
              <cylinderGeometry args={[0.07, 0.055, 0.1, 14]} />
              <meshStandardMaterial color="#f4f1ea" />
            </mesh>
            <mesh position-y={-0.05}>
              <cylinderGeometry args={[0.12, 0.12, 0.012, 16]} />
              <meshStandardMaterial color="#f4f1ea" />
            </mesh>
          </group>
        </group>
        <Bubble y={2.55}>{bubble}</Bubble>
      </group>

      <mesh ref={glint}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#fff6c8" toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => void (daggers.current[i] = el)}>
          <mesh rotation-z={Math.PI / 2}>
            <coneGeometry args={[0.05, 0.4, 8]} />
            <meshStandardMaterial color="#ffd257" emissive="#ffb000" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
      {children}
    </>
  );
}

/** Always mounted: unmounting a drei Html mid-frame races React 19, so only its contents toggle. */
export function Bubble({ y, children }: { y: number; children: ReactNode }) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[20, 0]}>
      {children ? <div className="cf-bubble">{children}</div> : null}
    </Html>
  );
}
