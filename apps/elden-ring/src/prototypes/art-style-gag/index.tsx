// PROTOTYPE (throwaway): does the agent-scripted Blender pipeline look good and time a gag well?
// Three looks of one full boss Gag, switchable via ?variant=A|B|C on #/proto/art-style-gag.
// Rebuild the GLBs with blender/build.sh.
import { OrbitControls, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  HueSaturation,
  Noise,
  Sepia,
  TiltShift2,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Suspense, useCallback, useState } from "react";
import { PrototypeSwitcher, useVariant } from "../PrototypeSwitcher";
import { Motes, Sky } from "./fx";
import { Gag, type HudState } from "./Gag";
import { LOOKS, type VariantKey } from "./looks";
import "./hud.css";

const KEYS = ["A", "B", "C", "D"] as const satisfies readonly VariantKey[];

export default function ArtStyleGagPrototype() {
  const [variant, setVariant] = useVariant(KEYS);
  const look = LOOKS[variant];
  const [run, setRun] = useState(0);
  const [free, setFree] = useState(false);
  const [hud, setHud] = useState<HudState>({ bossBar: false, hp: 1, died: false, done: false });
  const onHud = useCallback((h: Partial<HudState>) => setHud((prev) => ({ ...prev, ...h })), []);

  return (
    <div className={`proto look-${variant}`}>
      <Canvas shadows camera={{ fov: 38, near: 0.1, far: 200, position: [-1.4, 2.1, 7.6] }} dpr={[1, 2]}>
        <Sky look={look} />
        <fog attach="fog" args={[look.sky.horizon, ...look.fog]} />
        <hemisphereLight args={[look.fill.sky, look.fill.ground, look.fill.intensity]} />
        <directionalLight
          color={look.sun.color}
          intensity={look.sun.intensity}
          position={look.sun.position}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
          shadow-camera-far={40}
        />
        <Suspense fallback={null}>
          <Gag key={`${variant}-${run}`} look={look} free={free} onHud={onHud} />
        </Suspense>
        <Motes />
        {free && <OrbitControls target={[0.3, 0.8, -0.3]} makeDefault />}
        <EffectComposer multisampling={4}>
          <Bloom intensity={look.post.bloom} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
          <ToneMapping mode={look.toneMapping === "aces" ? ToneMappingMode.ACES_FILMIC : ToneMappingMode.LINEAR} />
          <HueSaturation saturation={look.post.saturation} />
          <Sepia intensity={look.post.sepia} />
          <TiltShift2 blur={look.post.tiltShift * 0.18} taper={0.6} start={[0.5, 0.0]} end={[0.5, 1.0]} />
          <Vignette offset={0.3} darkness={look.post.vignette} />
          <Noise opacity={look.post.grain} blendFunction={BlendFunction.OVERLAY} premultiply />
        </EffectComposer>
      </Canvas>

      <Loading />
      <Hud hud={hud} />

      <div className="proto-panel">
        <div className="proto-look">
          {look.key} · {look.name}
        </div>
        <div className="proto-blurb">{look.blurb}</div>
        <div className="proto-buttons">
          <button onClick={() => setRun((r) => r + 1)}>↻ Replay gag</button>
          <button onClick={() => setFree((f) => !f)}>{free ? "🎬 Director camera" : "🖐 Orbit camera"}</button>
        </div>
      </div>

      <PrototypeSwitcher
        variants={KEYS.map((k) => ({ key: k, name: LOOKS[k].name }))}
        current={variant}
        onChange={(k) => {
          setVariant(k);
          setHud({ bossBar: false, hp: 1, died: false, done: false });
        }}
      />
    </div>
  );
}

function Loading() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return <div className="proto-loading">Summoning… {Math.round(progress)}%</div>;
}

function Hud({ hud }: { hud: HudState }) {
  return (
    <>
      <div className="hud-player">
        <div className="bar hp">
          <i style={{ width: `${hud.hp * 100}%` }} />
        </div>
        <div className="bar fp">
          <i style={{ width: "70%" }} />
        </div>
        <div className="bar st">
          <i style={{ width: "85%" }} />
        </div>
      </div>
      <div className={`hud-boss ${hud.bossBar && !hud.died ? "show" : ""}`}>
        <div className="boss-name">
          Margit, the Fell Omen <span>(on his tea break)</span>
        </div>
        <div className="bar boss">
          <i style={{ width: "100%" }} />
        </div>
      </div>
      <div className={`you-died ${hud.died ? "show" : ""}`}>
        <div className="band">
          <div className="words">YOU DIED</div>
        </div>
        <div className={`epitaph ${hud.done ? "show" : ""}`}>Margit finished his tea.</div>
      </div>
    </>
  );
}
