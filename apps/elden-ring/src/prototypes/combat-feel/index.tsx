// PROTOTYPE (throwaway): which combat feels right in the browser?
// Four combat models against one Margit with three attacks, switchable via ?variant=A|B|C|D on #/proto/combat-feel.
// Placeholder capsules; every death fires the Gag hook (which Gag depends on what killed you).
import { Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PrototypeSwitcher, useVariant } from "../PrototypeSwitcher";
import { ATTACK_INFO, GAGS, useSel, type Core, type Lethality } from "./core";
import { CLOCK, Duel } from "./duel";
import { CHARGE, HYBRID_MENU, Hybrid, RING } from "./hybrid";
import { Stage } from "./Stage";
import { Timing } from "./timing";
import { TURN_MENU, Turns } from "./turns";
import "./combat.css";

const VARIANTS = {
  A: {
    name: "Turn-based menus",
    blurb: "Pokémon style. Margit shows his next move; you pick a response; the round plays itself.",
    controls: "1–5 or click the menu",
    create: (l: Lethality) => new Turns(l),
  },
  B: {
    name: "Real-time dodge-and-strike",
    blurb: "Souls style on Margit's clock. Roll through his hits, poke him between them. Perfect rolls open a riposte.",
    controls: "Space roll · J strike · F flask",
    create: (l: Lethality) => new Timing(l),
  },
  C: {
    name: "Hybrid: menu + timed press",
    blurb: "Paper Mario / Expedition 33. Pick from a menu, land it with a timed press; roll his hits yourself. Perfect roll counters.",
    controls: "1–3 menu · Space for rings, charge (hold) and rolls",
    create: (l: Lethality) => new Hybrid(l),
  },
  D: {
    name: "Choice duel (one-hit Gags)",
    blurb: "Not in the ticket: combat as Choices. Time nearly stops on his wind-up; pick a response before the clock runs out. Wrong = instant Gag. Four openings fell him.",
    controls: "1–4 or click a bubble",
    create: (l: Lethality) => new Duel(l),
  },
} as const;
type Key = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as Key[];

export default function CombatFeelPrototype() {
  const [variant, setVariant] = useVariant(KEYS);
  const [lethality, setLethality] = useState<Lethality>("attrition");
  const [run, setRun] = useState(0);
  const core = useMemo(() => VARIANTS[variant].create(lethality), [variant, lethality, run]);
  const restart = () => setRun((r) => r + 1);

  useEffect(() => {
    (window as unknown as { __cf: Core }).__cf = core; // poke it from devtools
    const handle = (down: boolean) => (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code.startsWith("Digit")) e.preventDefault();
      if (down && e.code === "KeyR" && core.state.mode !== "fight" && core.state.mode !== "gag") return restart();
      core.key(e.code, down);
    };
    const onDown = handle(true);
    const onUp = handle(false);
    addEventListener("keydown", onDown);
    addEventListener("keyup", onUp);
    return () => {
      removeEventListener("keydown", onDown);
      removeEventListener("keyup", onUp);
    };
  }, [core]);

  return (
    <div className="cf">
      <Canvas shadows camera={{ fov: 36, position: [0, 2.3, 7.4] }} dpr={[1, 2]}>
        <Ticker core={core} />
        <Stage core={core}>
          <HybridWorld core={core} />
          <DuelWorld core={core} />
        </Stage>
      </Canvas>

      <div className="cf-info">
        <b>
          {variant} · {VARIANTS[variant].name}
        </b>
        <p>{VARIANTS[variant].blurb}</p>
        <p className="cf-controls">{VARIANTS[variant].controls}</p>
      </div>

      <div className="cf-settings">
        {variant !== "D" && (
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => setLethality((l) => (l === "attrition" ? "glass" : "attrition"))}>
            {lethality === "attrition" ? "❤️ Attrition: health bar" : "🥚 Glass: any hit kills"}
          </button>
        )}
        <button onMouseDown={(e) => e.preventDefault()} onClick={restart}>
          ↻ Restart
        </button>
      </div>

      <Hud core={core} />
      {core instanceof Turns && <TurnsPanel core={core} />}
      {core instanceof Hybrid && <HybridPanel core={core} />}
      <StatePanel core={core} />

      <PrototypeSwitcher variants={KEYS.map((k) => ({ key: k, name: VARIANTS[k].name }))} current={variant} onChange={setVariant} />
    </div>
  );
}

function Ticker({ core }: { core: Core }) {
  useFrame((_, dt) => core.tick(Math.min(dt, 0.05)), -1);
  return null;
}

function Hud({ core }: { core: Core }) {
  useSel(core, (s) => s.version);
  const s = core.state;
  const p = s.player;
  const j = s.judgement;
  const jAge = j ? s.real - j.at : 9;
  const gag = s.gag && GAGS[s.gag.id];
  const pips = core instanceof Duel;
  return (
    <>
      <div className="cf-player">
        <div className="bar hp">
          <i style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
        </div>
        {core.usesStamina && (
          <div className="bar st">
            <i style={{ width: `${Math.max(0, p.stamina)}%` }} />
          </div>
        )}
        <div className="flasks">Flasks ×{p.flasks}</div>
      </div>

      <div className="cf-boss">
        <div className="boss-name">Margit, the Fell Omen</div>
        {pips ? (
          <div className="pips">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={s.boss.hp > (i * s.boss.maxHp) / 4 + 0.1 ? "on" : ""} />
            ))}
          </div>
        ) : (
          <div className="bar boss">
            <i style={{ width: `${(s.boss.hp / s.boss.maxHp) * 100}%` }} />
          </div>
        )}
      </div>

      {j && jAge < 1.1 && (
        <div className={`cf-judge ${j.tone}`} style={{ opacity: 1 - Math.max(0, jAge - 0.6) * 2, transform: `translateX(-50%) scale(${1 + Math.max(0, 0.15 - jAge)})` }}>
          <div className="big">{j.text}</div>
          {j.detail && <div className="small">{j.detail}</div>}
        </div>
      )}

      {s.caption && !(core instanceof Timing) && s.mode === "fight" && <div className="cf-caption">{s.caption}</div>}

      {s.mode === "gag" && gag && (
        <div className="cf-gag-tag">
          GAG · {gag.name} <span>killed by {s.gag!.killer}</span>
        </div>
      )}

      {s.mode === "dead" && gag && (
        <div className="cf-died">
          <div className="band">
            <div className="words">YOU DIED</div>
          </div>
          <div className="epitaph">{gag.epitaph}</div>
          <div className="tally">
            Deaths: {s.deaths} · {Object.entries(s.tally).map(([k, v]) => `${k} ×${v}`).join(" · ")}
          </div>
          <button onClick={() => dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR" }))}>Rest at Grace [R]</button>
        </div>
      )}

      {s.mode === "won" && (
        <div className="cf-died won">
          <div className="band">
            <div className="words">GREAT ENEMY FELLED</div>
          </div>
          <div className="epitaph">Margit sits down for his tea anyway.</div>
          <button onClick={() => dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR" }))}>Fight again [R]</button>
        </div>
      )}
    </>
  );
}

function Menu({ items, onPick, disabled }: { items: readonly string[]; onPick: (i: number) => void; disabled: boolean }) {
  return (
    <div className={`cf-menu ${disabled ? "off" : ""}`}>
      {items.map((label, i) => (
        <button key={label} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(i)}>
          <kbd>{i + 1}</kbd> {label}
        </button>
      ))}
    </div>
  );
}

function TurnsPanel({ core }: { core: Turns }) {
  useSel(core, (s) => s.version);
  if (core.state.mode !== "fight") return null;
  return <Menu items={TURN_MENU} onPick={(i) => core.pick(i)} disabled={core.phase !== "choose"} />;
}

function HybridPanel({ core }: { core: Hybrid }) {
  useSel(core, (s) => s.version);
  if (core.state.mode !== "fight") return null;
  return <Menu items={HYBRID_MENU} onPick={(i) => core.pick(i)} disabled={core.phase !== "choose"} />;
}

// The World overlays stay mounted for every variant (see Bubble in Stage.tsx); only their contents toggle.
function HybridWorld({ core }: { core: Core }) {
  useSel(core, (s) => s.version);
  const c = core instanceof Hybrid && core.phase === "command" ? core.command : null;
  const ring = c?.kind === "ring" ? c : null;
  const charge = c?.kind === "charge" ? c : null;
  const size = ring ? Math.max(20, 240 - (160 * Math.max(0, ring.t)) / RING.close) : 0;
  const [lo, hi] = CHARGE.sweet;
  return (
    <>
      <Html position={[1.6, 1.1, 0]} center>
        {ring && (
          <div className="cf-ring">
            <div className="target" />
            <div className={`closing ${ring.pressed ? "done" : ""}`} style={{ width: size, height: size }} />
            <div className="label">Strike {ring.index + 1}/2</div>
          </div>
        )}
      </Html>
      <Html position={[-1.6, 1.7, 0]} center>
        {charge && (
          <div className="cf-charge">
            <div className="sweet" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />
            <div className="trip" style={{ left: `${CHARGE.trip * 100}%` }} />
            <i style={{ width: `${charge.fill * 100}%` }} />
            <div className="label">{charge.holding ? "release in the gold!" : "hold Space"}</div>
          </div>
        )}
      </Html>
    </>
  );
}

function DuelWorld({ core }: { core: Core }) {
  useSel(core, (s) => s.version);
  const duel = core instanceof Duel && core.phase === "choosing" && core.state.mode === "fight" ? core : null;
  return (
    <Html position={[-1.6, 1.25, 0]} center>
      {duel && (
        <div className="cf-choices">
          <div className="clock">
            <i style={{ width: `${(duel.clock / CLOCK) * 100}%` }} />
          </div>
          {duel.choices.map((c, i) => (
            <button key={c.label} className={c.locked ? "locked" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => duel.pick(i)}>
              <kbd>{i + 1}</kbd> {c.label}
              {c.locked && <small>🔒 {c.locked}</small>}
            </button>
          ))}
        </div>
      )}
    </Html>
  );
}

function StatePanel({ core }: { core: Core }) {
  useSel(core, (s) => Math.floor(s.real * 15)); // 15 Hz is plenty to read
  const [open, setOpen] = useState(true);
  const s = core.state;
  const a = s.boss.attack;
  const extra: Record<string, unknown> = {};
  if (core instanceof Turns) Object.assign(extra, { phase: core.phase, intent: core.intent });
  if (core instanceof Hybrid) Object.assign(extra, { phase: core.phase, command: core.command && { ...core.command, t: +core.command.t.toFixed(2) } });
  if (core instanceof Duel) Object.assign(extra, { phase: core.phase, clock: +core.clock.toFixed(2), choices: core.choices.map((c) => `${c.label} → ${c.locked ? "locked" : c.outcome}`) });
  const view = {
    mode: s.mode,
    lethality: core.lethality,
    time: +s.time.toFixed(2),
    timeScale: +s.scale.toFixed(2),
    player: { hp: Math.round(s.player.hp), stamina: core.usesStamina ? Math.round(s.player.stamina) : "—", flasks: s.player.flasks, act: `${s.player.act.kind} ${s.player.act.t.toFixed(2)}s` },
    boss: {
      hp: Math.round(s.boss.hp),
      attack: a ? `${ATTACK_INFO[a.id].name} @ ${s.boss.at.toFixed(2)}s` : "—",
      hitsAt: a ? a.hits.map((h) => +h.toFixed(2)) : "—",
      sipping: s.boss.sipping,
    },
    ...extra,
    gag: s.gag ? `${GAGS[s.gag.id].name} (${s.gag.killer}) ${s.gag.t.toFixed(1)}s` : null,
    deaths: s.deaths,
  };
  return (
    <div className={`cf-state ${open ? "" : "shut"}`}>
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>
        {open ? "state ▾" : "state ▸"}
      </button>
      {open && (
        <>
          <pre>{JSON.stringify(view, null, 1)}</pre>
          <Log lines={s.log} />
        </>
      )}
    </div>
  );
}

function Log({ lines }: { lines: string[] }): ReactNode {
  return (
    <pre className="log">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </pre>
  );
}
