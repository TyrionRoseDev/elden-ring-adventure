// PROTOTYPE: "Margit is on his tea break". One full boss Gag, choreographed with a gsap timeline
// that triggers Blender-authored clips and tweens objects directly (per the R3F research).
import { Billboard, Html, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  Mesh,
  Shape,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Group,
  type Object3D,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Puffs, type PuffEmitter } from "./fx";
import { applyLook, type Look } from "./looks";

const BASE = `${import.meta.env.BASE_URL}proto/art-style-gag/`;
const starShape = (() => {
  const sh = new Shape();
  for (let i = 0; i <= 16; i++) {
    const r = i % 2 ? 0.16 : 0.5;
    const a = (i / 16) * Math.PI * 2;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return sh;
})();

const MARGIT_SCALE = { A: 0.95, B: 1.05, C: 1.2 } as const;

type Actor = {
  root: Group;
  mixer: AnimationMixer;
  clips: Record<string, AnimationClip>;
  bones: Record<string, Object3D>;
  current: AnimationAction | null;
};

function useActor(url: string, look: Look, attach: [prop: string, bone: string][]) {
  const gltf = useGLTF(url);
  return useMemo(() => {
    const root = cloneSkinned(gltf.scene) as Group;
    applyLook(root, look);
    root.updateMatrixWorld(true);
    const bones: Record<string, Object3D> = {};
    root.traverse((o) => {
      if ((o as Bone).isBone || o.name) bones[o.name] = bones[o.name] ?? o;
    });
    for (const [prop, bone] of attach) bones[bone]!.attach(bones[prop]!);
    const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
    return { root, mixer: new AnimationMixer(root), clips, bones, current: null } as Actor;
  }, [gltf, look]);
}

function play(actor: Actor, name: string, { once = false, fade = 0.2, speed = 1 } = {}) {
  const action = actor.mixer.clipAction(actor.clips[name]!);
  action.reset();
  action.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
  action.clampWhenFinished = once;
  action.timeScale = speed;
  action.play();
  if (actor.current && actor.current !== action) actor.current.crossFadeTo(action, fade, false);
  actor.current = action;
}

type Bubbles = { tarnished?: string; margit?: string };
export type HudState = { bossBar: boolean; hp: number; died: boolean; done: boolean };

export function Gag({
  look,
  free,
  onHud,
}: {
  look: Look;
  free: boolean;
  onHud: (h: Partial<HudState>) => void;
}) {
  const v = look.body;
  const S = MARGIT_SCALE[v];
  const tarn = useActor(`${BASE}tarnished_${v}.glb`, look, [["Sword", "hand_R"]]);
  const margit = useActor(`${BASE}margit_${v}.glb`, look, [
    ["Teacup", "hand_L"],
    ["Cane", "hand_R"],
    ["Teapot", "hand_R"],
  ]);
  const arena = useGLTF(`${BASE}arena.glb`);
  const set = useMemo(() => {
    const root = arena.scene.clone(true);
    applyLook(root, look, { outlineScale: 2.2 });
    return root;
  }, [arena, look]);

  const puffs = useRef<PuffEmitter | null>(null);
  const [bubbles, setBubbles] = useState<Bubbles>({});
  const stream = useRef<Mesh>(null);
  const streamOn = useRef(false);
  const steamOn = useRef(false);
  const { camera } = useThree();
  const loose = useRef<Group>(null);
  const starRef = useRef<Group>(null);
  const cam = useRef({ px: -1.2, py: 2, pz: 7.2, tx: -0.5, ty: 1, tz: 0, shake: 0 });

  useFrame((state, dt) => {
    tarn.mixer.update(dt);
    margit.mixer.update(dt);
    if (!free) {
      const c = cam.current;
      const t = state.clock.elapsedTime;
      const sx = Math.sin(t * 91) * c.shake;
      const sy = Math.cos(t * 73) * c.shake;
      camera.position.set(c.px + sx, c.py + sy, c.pz);
      camera.lookAt(c.tx + sx * 0.5, c.ty + sy * 0.5, c.tz);
    }
    // the tea stream stretches from the spout to the cup
    const m = stream.current;
    if (m) {
      m.visible = streamOn.current;
      if (streamOn.current) {
        const pot = margit.bones.Teapot!;
        const cup = margit.bones.Teacup!;
        const a = pot.localToWorld(new Vector3(0.4 * S, 0.07 * S, 0));
        const b = cup.localToWorld(new Vector3(0, 0.08 * S, 0));
        m.position.copy(a).lerp(b, 0.5);
        m.scale.set(1, a.distanceTo(b), 1);
        m.lookAt(b);
        m.rotateX(Math.PI / 2);
      }
    }
    if (steamOn.current && Math.random() < dt * 5) {
      const cup = margit.bones.Teacup!.localToWorld(new Vector3(0, 0.1 * S, 0));
      puffs.current?.burst(cup, { count: 1, speed: 0.02, size: 0.035, life: 1.4, color: "#ffffff", up: 0.35 });
    }
  });

  useEffect(() => {
    const T = tarn.root;
    const M = margit.root;
    const sword = tarn.bones.Sword!;
    const cane = margit.bones.Cane!;
    const teapot = margit.bones.Teapot!;
    const doily = margit.bones.Doily!;
    const saucer = margit.bones.Saucer!;
    const c = cam.current;

    const M0 = new Vector3(1.4, 0, -0.6);
    const mYaw = -1.05;
    const fwd = new Vector3(Math.sin(mYaw), 0, Math.cos(mYaw));
    M.position.copy(M0);
    M.rotation.set(0, mYaw, 0);
    // where the Tarnished gets flattened: wherever the cane tip lands at the bottom of the Bonk clip
    let tipY = 0;
    cane.traverse((o) => {
      const g = (o as Mesh).geometry;
      if (!g) return;
      g.computeBoundingBox();
      tipY = Math.min(tipY, g.boundingBox!.min.y);
    });
    const probe = margit.mixer.clipAction(margit.clips.Bonk!);
    probe.reset().play();
    margit.mixer.setTime(0.47);
    M.updateMatrixWorld(true);
    const P = cane.localToWorld(new Vector3(0, tipY * 0.85, 0)).setY(0);
    probe.stop();
    margit.mixer.setTime(0);
    const T0 = new Vector3(-6, 0, 0.9);
    const T1 = new Vector3(-1.2, 0, 0.45);
    const faceM = Math.atan2(M0.x - T1.x, M0.z - T1.z);
    const stuck = new Vector3(P.x - 0.95, 0, P.z + 0.75);
    let bladeLen = 0; // the blade runs along the sword's local +Z from the grip
    sword.traverse((o) => {
      const g = (o as Mesh).geometry;
      if (!g) return;
      g.computeBoundingBox();
      bladeLen = Math.max(bladeLen, g.boundingBox!.max.z);
    });

    T.position.copy(T0);
    T.rotation.set(0, Math.PI / 2, 0);
    T.scale.set(1, 1, 1);
    teapot.scale.setScalar(0.001);
    const L = loose.current!;
    L.attach(doily);
    L.attach(saucer);
    doily.position.set(P.x, 3, P.z);
    doily.scale.setScalar(1.5);
    doily.visible = false;
    saucer.visible = false;
    play(margit, "Idle");
    play(tarn, "Walk");
    onHud({ bossBar: false, hp: 1, died: false, done: false });

    const tl = gsap.timeline({ paused: true });
    const at = (t: number, fn: () => void) => tl.call(fn, undefined, t);
    const cut = (t: number, to: Partial<typeof c>) => tl.set(c, to, t);

    // Shot 1: wide. Tarnished strolls in; Margit is having his tea.
    cut(0, { px: -1.4, py: 2.4, pz: 7.8, tx: -0.4, ty: 1.45, tz: 0, shake: 0 });
    tl.to(c, { px: -0.9, pz: 6.4, duration: 3.4, ease: "sine.inOut" }, 0);
    tl.to(T.position, { x: T1.x, z: T1.z, duration: 3.3, ease: "none" }, 0);
    at(0.9, () => play(margit, "Sip", { once: true }));
    at(2.4, () => play(margit, "Idle", { fade: 0.4 }));

    // Shot 2: low hero angle. He strikes a pose.
    at(3.3, () => play(tarn, "Idle"));
    tl.to(T.rotation, { y: faceM, duration: 0.25 }, 3.3);
    cut(3.45, { px: T1.x + 2.6, py: 0.4, pz: T1.z + 1.25, tx: T1.x, ty: 0.75, tz: T1.z });
    at(3.6, () => {
      play(tarn, "Pose", { once: true, fade: 0.1 });
      setBubbles({ tarnished: "!" });
    });
    tl.to(c, { px: T1.x + 2.25, pz: T1.z + 1.05, duration: 1.2, ease: "sine.out" }, 3.45);
    at(4.2, () => onHud({ bossBar: true }));

    // Shot 3: Margit, unimpressed.
    const mHead = new Vector3(M0.x, 1.6 * S, M0.z);
    cut(4.8, { px: M0.x - 2.3, py: 1.55 * S, pz: M0.z + 2.9, tx: mHead.x, ty: mHead.y, tz: mHead.z });
    at(4.8, () => setBubbles({}));
    at(5.0, () => {
      play(margit, "Notice", { once: true, fade: 0.3 });
      setBubbles({ margit: "…" });
    });
    tl.to(c, { px: M0.x - 2.0, pz: M0.z + 2.5, duration: 1.3, ease: "none" }, 4.8);

    // Shot 4: wide action. He charges and does the jump attack everyone told him to do.
    cut(6.2, { px: 0.1, py: 2.0, pz: 6.2, tx: 0, ty: 0.9, tz: -0.2 });
    at(6.2, () => {
      setBubbles({});
      play(tarn, "Run", { fade: 0.1 });
      play(margit, "Idle", { fade: 0.3 });
    });
    const launch = T1.clone().lerp(P, 0.35);
    tl.to(T.position, { x: launch.x, z: launch.z, duration: 0.45, ease: "none" }, 6.2);
    at(6.65, () => play(tarn, "Jump", { once: true, fade: 0.05 }));
    const apex = T1.clone().lerp(P, 0.8);
    tl.to(T.position, { x: apex.x, z: apex.z, duration: 0.45, ease: "power1.out" }, 6.8);
    tl.to(T.position, { y: 1.35 * S, duration: 0.45, ease: "power2.out" }, 6.8);
    at(6.85, () => play(margit, "Bonk", { once: true, fade: 0.05 }));

    // BONK. (Bonk's slam lands at frame 13, 0.4 s in.)
    const hit = 7.25;
    at(hit - 0.02, () => play(tarn, "Flail", { fade: 0 }));
    tl.to(T.position, { x: P.x, y: 0.02, z: P.z, duration: 0.07, ease: "power4.in" }, hit);
    tl.to(T.scale, { x: 1.7, y: 0.09, z: 1.7, duration: 0.07, ease: "power4.in" }, hit);
    at(hit + 0.07, () => {
      tarn.mixer.timeScale = 0;
      onHud({ hp: 0 });
      puffs.current?.burst(P.clone().setY(0.15), { count: 22, speed: 2.2, size: 0.32, life: 1.0, color: "#e6dcc4", up: 0.7 });
      L.attach(sword);
    });
    const star = starRef.current!;
    star.position.copy(P).setY(0.35);
    star.scale.setScalar(0.001);
    tl.set(star, { visible: true }, hit + 0.05);
    tl.to(star.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.09, ease: "back.out(3)" }, hit + 0.05);
    tl.to(star.rotation, { z: 0.6, duration: 0.3 }, hit + 0.05);
    tl.to(star.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.18, ease: "power2.in" }, hit + 0.3);
    tl.set(star, { visible: false }, hit + 0.5);
    tl.to(c, { shake: 0.12, duration: 0.03 }, hit + 0.07);
    tl.to(c, { shake: 0, duration: 0.5, ease: "power2.out" }, hit + 0.1);
    // the sword goes for a little flight and sticks in the ground
    tl.to(sword.position, { x: stuck.x, z: stuck.z, duration: 0.95, ease: "none" }, hit + 0.08);
    tl.to(sword.position, { y: 2.4, duration: 0.45, ease: "power2.out" }, hit + 0.08);
    tl.to(sword.position, { y: bladeLen * 0.9, duration: 0.5, ease: "power2.in" }, hit + 0.53);
    tl.to(sword.rotation, { x: Math.PI / 2 + Math.PI * 6, y: 0.35, z: 0.1, duration: 0.95, ease: "none" }, hit + 0.08);
    tl.to(sword.rotation, { z: 0.22, duration: 0.08, yoyo: true, repeat: 5, ease: "sine.inOut" }, hit + 1.03);

    // Held silence. Nobody moves.
    at(hit + 1.3, () => play(margit, "Idle", { fade: 0.6 }));
    at(hit + 1.9, () => {
      play(margit, "Notice", { once: true, fade: 0.3 });
      setBubbles({ margit: "…" });
    });
    tl.to(T.scale, { y: 0.13, duration: 0.07, yoyo: true, repeat: 3 }, hit + 2.2); // twitch
    at(hit + 2.9, () => setBubbles({}));

    // He hangs his cane on the sword, like a coat rack.
    const t2 = hit + 3.0;
    at(t2, () => play(margit, "Reach", { once: true, fade: 0.25 }));
    at(t2 + 0.45, () => L.attach(cane));
    const hilt = stuck.clone().setY(bladeLen * 0.9);
    tl.to(cane.position, { x: hilt.x + 0.08, y: hilt.y + 0.05, z: hilt.z, duration: 0.5, ease: "power2.inOut" }, t2 + 0.45);
    tl.to(cane.rotation, { x: 0, y: 0, z: -0.5, duration: 0.5, ease: "power2.inOut" }, t2 + 0.45);
    tl.to(cane.rotation, { z: -0.62, duration: 0.25, ease: "bounce.out" }, t2 + 0.95);
    at(t2 + 1.2, () => play(margit, "Idle", { fade: 0.4 }));

    // A doily descends. Manners.
    const t3 = t2 + 1.4;
    at(t3, () => {
      doily.visible = true;
    });
    tl.to(doily.position, { y: 0.08, duration: 1.3, ease: "power1.in" }, t3);
    tl.to(doily.position, { x: P.x + 0.25, duration: 0.33, yoyo: true, repeat: 3, ease: "sine.inOut" }, t3);
    tl.to(doily.rotation, { z: 0.35, x: -0.25, duration: 0.33, yoyo: true, repeat: 3, ease: "sine.inOut" }, t3);
    tl.to(doily.position, { x: P.x, duration: 0.2 }, t3 + 1.32);
    tl.to(doily.rotation, { z: 0, x: 0, duration: 0.2 }, t3 + 1.32);

    // He shuffles over and sits on the Tarnished.
    const t4 = t3 + 1.6;
    const seat = P.clone().add(new Vector3(0.05, 0, -0.32 * S)); // sit on his legs so the helmet pokes out front
    at(t4, () => play(margit, "Walk", { fade: 0.3 }));
    tl.to(M.position, { x: seat.x, z: seat.z, duration: 1.1, ease: "none" }, t4);
    tl.to(M.rotation, { y: -0.25, duration: 0.8, ease: "sine.inOut" }, t4 + 0.4);
    at(t4 + 1.1, () => play(margit, "Sit", { once: true, fade: 0.2 }));
    tl.to(T.scale, { y: 0.05, x: 1.85, z: 1.85, duration: 0.08, ease: "power3.in" }, t4 + 1.75);
    tl.to(doily.position, { y: 0.05, duration: 0.08 }, t4 + 1.75);
    at(t4 + 1.8, () =>
      puffs.current?.burst(P.clone().setY(0.05), { count: 10, speed: 1.1, size: 0.12, life: 0.7, color: "#d9ccb0", up: 0.2 }),
    );
    at(t4 + 2.3, () => play(margit, "SitIdle", { fade: 0.4 }));

    // Shot 5: close. Tea.
    const t5 = t4 + 2.5;
    const mid = seat.clone().setY(0.8 * S);
    cut(t5, { px: seat.x - 0.7, py: 1.3 * S, pz: seat.z + 3.9 * S, tx: mid.x, ty: mid.y, tz: mid.z });
    tl.to(c, { pz: seat.z + 3.3 * S, py: 1.2 * S, duration: 7, ease: "sine.inOut" }, t5);
    tl.to(teapot.scale, { x: 1, y: 1, z: 1, duration: 0.35, ease: "back.out(2)" }, t5 + 0.2);
    at(t5 + 0.4, () => {
      play(margit, "Pour", { once: true, fade: 0.3 });
      setBubbles({ margit: "♪" });
    });
    at(t5 + 1.15, () => (streamOn.current = true));
    at(t5 + 2.0, () => (streamOn.current = false));
    tl.to(teapot.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.25, ease: "back.in(2)" }, t5 + 2.5);
    at(t5 + 2.6, () => {
      play(margit, "SitSip", { once: true, fade: 0.3 });
      steamOn.current = true;
      setBubbles({});
    });
    tl.to(T.scale, { y: 0.075, duration: 0.06, yoyo: true, repeat: 3 }, t5 + 3.6); // twitch under the doily
    at(t5 + 4.1, () => setBubbles({ margit: "♪" }));

    // YOU DIED.
    const t6 = t5 + 5.6;
    at(t6, () => onHud({ died: true }));
    at(t6 + 3.2, () => {
      steamOn.current = false;
      onHud({ done: true });
    });

    tl.play();
    // debug hook for the agent: freeze the gag at a moment to screenshot it
    (window as unknown as { __gag: unknown }).__gag = {
      tl,
      freeze() {
        tl.pause();
        tarn.mixer.timeScale = 0;
        margit.mixer.timeScale = 0;
      },
      resume() {
        tl.play();
        margit.mixer.timeScale = 1;
        if (tl.time() < hit) tarn.mixer.timeScale = 1;
      },
    };
    return () => {
      tl.kill();
      tarn.mixer.stopAllAction();
      margit.mixer.stopAllAction();
      tarn.mixer.timeScale = 1;
      streamOn.current = false;
      steamOn.current = false;
    };
  }, [tarn, margit, S, onHud]);

  const tarnHead = tarn.bones.head;
  const margitHead = margit.bones.head;
  return (
    <>
      <primitive object={set} />
      <primitive object={tarn.root} />
      <primitive object={margit.root} />
      <group ref={loose} />
      <Billboard ref={starRef} visible={false}>
        <mesh>
          <shapeGeometry args={[starShape]} />
          <meshBasicMaterial color="#fff6c8" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.01]} scale={1.18}>
          <shapeGeometry args={[starShape]} />
          <meshBasicMaterial color="#1d1712" />
        </mesh>
      </Billboard>
      <Puffs emitter={puffs} />
      <mesh ref={stream} visible={false}>
        <cylinderGeometry args={[0.012, 0.018, 1, 8, 1, true]} />
        <meshToonMaterial color="#9a5220" />
      </mesh>
      {tarnHead && bubbles.tarnished && <Bubble anchor={tarnHead} text={bubbles.tarnished} lift={0.7} />}
      {margitHead && bubbles.margit && <Bubble anchor={margitHead} text={bubbles.margit} lift={0.95 * S} />}
    </>
  );
}

function Bubble({ anchor, text, lift }: { anchor: Object3D; text: string; lift: number }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    anchor.getWorldPosition(g.position);
    g.position.y += lift;
  });
  return (
    <group ref={group}>
      <Html center zIndexRange={[20, 0]}>
        <div className="bubble">{text}</div>
      </Html>
    </group>
  );
}

