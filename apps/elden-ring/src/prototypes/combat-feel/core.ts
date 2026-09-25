// PROTOTYPE (throwaway): shared combat core for every variant.
// Margit's three attacks, the Tarnished, damage, death → Gag hook, hit-stop and slow-mo.
import { useSyncExternalStore } from "react";

export type AttackId = "cane" | "daggers" | "tea";
export type GagId = "pancake" | "pincushion" | "launch" | "bonk";

export type Attack = {
  id: AttackId;
  hits: number[]; // seconds into the attack when each hit lands
  end: number; // attack over, Margit back in place
  damage: number; // per hit
};

export const ATTACK_INFO: Record<AttackId, { name: string; tell: string; gag: GagId }> = {
  cane: { name: "Cane Slam", tell: "raises his cane…", gag: "pancake" },
  daggers: { name: "Golden Daggers", tell: "conjures three daggers…", gag: "pincushion" },
  tea: { name: "Delayed Hammer", tell: "raises a hammer… and sips his tea", gag: "launch" },
};

export const GAGS: Record<GagId, { name: string; dur: number; epitaph: string }> = {
  pancake: { name: "Pancake Tea", dur: 4.8, epitaph: "Margit sat down on what was left of you and had a cup of tea." },
  pincushion: { name: "The Coaster", dur: 5.0, epitaph: "Margit used you as a coaster." },
  launch: { name: "Lawn Dart", dur: 5.4, epitaph: "You came back down eventually. Margit didn't look up from his tea." },
  bonk: { name: "Anybody Home?", dur: 4.4, epitaph: "You stood there. Margit checked if you were still in." },
};

export function rollAttack(id: AttackId): Attack {
  switch (id) {
    case "cane":
      return { id, hits: [1.2], end: 2.1, damage: 34 };
    case "daggers":
      return { id, hits: [1.0, 1.6, 2.2], end: 2.8, damage: 14 }; // one roll per dagger, in rhythm
    case "tea": {
      const hit = 1.9 + Math.random() * 0.9; // how long he sips is the whole trick
      return { id, hits: [hit], end: hit + 1.1, damage: 52 };
    }
  }
}

export type ActKind =
  | "idle"
  | "strike"
  | "heavy"
  | "charge"
  | "dodge"
  | "flask"
  | "guard"
  | "hurt"
  | "hop"
  | "biscuit"
  | "trip";

export type PlayerAct = { kind: ActKind; t: number; dur: number; dir: number };

export type Judgement = { text: string; detail: string; tone: "good" | "bad" | "meh"; at: number };

export type Lethality = "attrition" | "glass";

export type State = {
  mode: "fight" | "gag" | "dead" | "won";
  time: number; // game time
  real: number; // wall time
  scale: number;
  player: { hp: number; maxHp: number; stamina: number; flasks: number; act: PlayerAct };
  boss: { hp: number; maxHp: number; attack: Attack | null; at: number; sipping: boolean; flinch: number };
  gag: { id: GagId; t: number; killer: string } | null;
  shake: number;
  flash: number;
  hitstop: number;
  slowmo: number; // target time scale
  judgement: Judgement | null;
  bossBubble: string | null;
  playerBubble: string | null;
  caption: string;
  log: string[];
  deaths: number;
  tally: Record<string, number>;
  version: number;
};

/**
 * The tell rule every Killer's attack obeys: a glint exactly `lead` seconds before each hit,
 * and the swing visibly moving for the last `swing` seconds. Difficulty comes from rhythm and fake-outs, never hidden cues.
 */
export const TELL = { lead: 0.45, swing: 0.3 };

/** Roll timing: invulnerable from `from` to `to` seconds after the press; perfect if the hit lands by `perfect`. */
export const DODGE = { dur: 0.6, from: 0.03, to: 0.48, perfect: 0.18 };

const idle = (): PlayerAct => ({ kind: "idle", t: 0, dur: 0, dir: 0 });

// Deaths and the tally survive respawns and variant switches, so the user can compare.
const persistent = { deaths: 0, tally: {} as Record<string, number> };

export abstract class Core {
  state: State;
  private listeners = new Set<() => void>();
  private queue: { at: number; fn: () => void }[] = [];
  private hitIndex = 0;
  readonly usesStamina: boolean = false;

  constructor(public lethality: Lethality, bossHp: number) {
    this.state = {
      mode: "fight",
      time: 0,
      real: 0,
      scale: 1,
      player: { hp: 100, maxHp: 100, stamina: 100, flasks: 3, act: idle() },
      boss: { hp: bossHp, maxHp: bossHp, attack: null, at: 0, sipping: false, flinch: 0 },
      gag: null,
      shake: 0,
      flash: 0,
      hitstop: 0,
      slowmo: 1,
      judgement: null,
      bossBubble: null,
      playerBubble: null,
      caption: "",
      log: [],
      deaths: persistent.deaths,
      tally: persistent.tally,
      version: 0,
    };
  }

  // --- variant hooks ---
  protected abstract update(dt: number, realDt: number): void;
  abstract key(code: string, down: boolean): void;
  pick(_index: number): void {}

  // --- store ---
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  tick(realDt: number) {
    const s = this.state;
    s.real += realDt;
    s.shake = Math.max(0, s.shake - realDt * 3);
    s.flash = Math.max(0, s.flash - realDt * 2.5);
    s.boss.flinch = Math.max(0, s.boss.flinch - realDt * 4);
    let dt = 0;
    if (s.hitstop > 0) s.hitstop -= realDt;
    else {
      s.scale += (s.slowmo - s.scale) * Math.min(1, realDt * 14);
      dt = realDt * s.scale;
    }
    s.time += dt;
    const act = s.player.act;
    act.t += dt;
    if (act.dur > 0 && act.t >= act.dur) s.player.act = idle();
    if (s.boss.attack) {
      const b = s.boss;
      const a = b.attack!;
      b.at += dt;
      b.sipping = a.id === "tea" && b.at > 0.45 && b.at < a.hits[0]! - 0.5;
    }
    if (s.gag) {
      s.gag.t += dt;
      if (s.gag.t >= GAGS[s.gag.id].dur && s.mode === "gag") s.mode = "dead";
    }
    const due = this.queue.filter((q) => q.at <= s.time);
    this.queue = this.queue.filter((q) => q.at > s.time);
    for (const q of due) q.fn();
    if (s.mode === "fight") this.update(dt, realDt);
    s.version++;
    for (const l of this.listeners) l();
  }

  // --- helpers for variants ---
  protected after(seconds: number, fn: () => void) {
    this.queue.push({ at: this.state.time + seconds, fn });
  }

  protected act(kind: ActKind, dur: number, dir = 0) {
    this.state.player.act = { kind, t: 0, dur, dir };
  }

  protected log(line: string) {
    const log = this.state.log;
    log.unshift(`${this.state.time.toFixed(2).padStart(6)}s  ${line}`);
    log.length = Math.min(log.length, 10);
  }

  protected judge(text: string, detail: string, tone: Judgement["tone"]) {
    this.state.judgement = { text, detail, tone, at: this.state.real };
    this.log(`${text}${detail ? ` (${detail})` : ""}`);
  }

  protected startAttack(id: AttackId, attack = rollAttack(id)) {
    const b = this.state.boss;
    b.attack = attack;
    b.at = 0;
    b.sipping = false;
    this.hitIndex = 0;
    this.state.bossBubble = null;
    this.log(`Margit: ${ATTACK_INFO[id].name}`);
    return attack;
  }

  protected endAttack() {
    this.state.boss.attack = null;
    this.state.boss.sipping = false;
  }

  /** Indices of hits that have landed since the last call. */
  protected dueHits(): number[] {
    const b = this.state.boss;
    const out: number[] = [];
    while (b.attack && this.hitIndex < b.attack.hits.length && b.at >= b.attack.hits[this.hitIndex]!) out.push(this.hitIndex++);
    return out;
  }

  /** Resolve one of Margit's hits against whatever the Tarnished is doing right now. */
  protected landHit(a: Attack, opts: { mult?: number; guardMult?: number } = {}): "perfect" | "dodge" | "hit" | "dead" {
    const act = this.state.player.act;
    const dmg = a.damage * (opts.mult ?? 1);
    const ms = Math.round(act.t * 1000);
    if (act.kind === "dodge") {
      if (act.t >= DODGE.from && act.t <= DODGE.to) {
        if (act.t <= DODGE.perfect) {
          this.judge("PERFECT", `rolled ${ms} ms before impact`, "good");
          this.state.slowmo = 0.25;
          this.after(0.08, () => (this.state.slowmo = 1));
          return "perfect";
        }
        this.judge("Dodged", `rolled ${ms} ms before impact`, "meh");
        return "dodge";
      }
      this.judge(act.t < DODGE.from ? "Too late" : "Too early", `rolled ${ms} ms before impact`, "bad");
    } else if (act.kind === "guard" && opts.guardMult !== undefined) {
      const broken = a.id === "tea";
      this.judge(broken ? "Guard broken" : "Guarded", broken ? "the hammer doesn't care" : "", broken ? "bad" : "meh");
      return this.hurtPlayer(dmg * (broken ? 1 : opts.guardMult), a.id) ? "dead" : "hit";
    } else {
      this.judge("Hit", ATTACK_INFO[a.id].name, "bad");
    }
    return this.hurtPlayer(dmg, a.id) ? "dead" : "hit";
  }

  /** The Tarnished takes a hit. Returns true if it killed. */
  protected hurtPlayer(amount: number, by: AttackId | "freeze", gag?: GagId) {
    const s = this.state;
    const p = s.player;
    const dealt = this.lethality === "glass" && amount > 0 ? p.hp : Math.round(amount);
    p.hp = Math.max(0, p.hp - dealt);
    s.flash = 1;
    s.shake = Math.min(1, 0.35 + amount / 60);
    s.hitstop = 0.09;
    this.log(`Tarnished takes ${dealt}`);
    if (p.hp <= 0) {
      this.die(by, gag);
      return true;
    }
    this.act("hurt", 0.45);
    return false;
  }

  protected hurtBoss(amount: number, label: string) {
    const s = this.state;
    const dealt = Math.round(amount);
    s.boss.hp = Math.max(0, s.boss.hp - dealt);
    s.boss.flinch = 1;
    s.hitstop = Math.max(s.hitstop, 0.06);
    s.shake = Math.max(s.shake, 0.2);
    this.log(`${label}: Margit takes ${dealt}`);
    if (s.boss.hp <= 0) {
      s.mode = "won";
      this.endAttack();
      s.slowmo = 1;
      s.bossBubble = "…fine. FINE.";
      s.playerBubble = null;
      this.log("GREAT ENEMY FELLED");
    }
  }

  protected die(by: AttackId | "freeze", gag?: GagId) {
    const s = this.state;
    const id = gag ?? (by === "freeze" ? "bonk" : ATTACK_INFO[by].gag);
    s.mode = "gag";
    s.gag = { id, t: 0, killer: by === "freeze" ? "Indecision" : ATTACK_INFO[by].name };
    s.slowmo = 1;
    s.scale = 1;
    s.hitstop = 0.18;
    s.boss.attack = null;
    s.boss.sipping = false;
    s.bossBubble = null;
    s.playerBubble = null;
    s.player.act = idle();
    this.queue = [];
    persistent.deaths++;
    persistent.tally[GAGS[id].name] = (persistent.tally[GAGS[id].name] ?? 0) + 1;
    s.deaths = persistent.deaths;
    this.log(`DIED to ${s.gag.killer} → Gag "${GAGS[id].name}"`);
    this.onDeath();
  }

  protected onDeath() {}

  heal() {
    const p = this.state.player;
    if (p.flasks <= 0) return false;
    p.flasks--;
    p.hp = Math.min(p.maxHp, p.hp + 45);
    this.log("Flask: +45");
    return true;
  }
}

/** Subscribe a component to one primitive slice of the combat state. */
export function useSel<T>(core: Core, pick: (s: State) => T): T {
  return useSyncExternalStore(core.subscribe, () => pick(core.state));
}
