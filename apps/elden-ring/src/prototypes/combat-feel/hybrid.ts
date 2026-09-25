// PROTOTYPE: variant C, hybrid. Pick from a menu on your turn, then land it with a timed press.
// On Margit's turn you press Space to roll each hit yourself; a perfect roll counters.
import { ATTACK_INFO, Core, DODGE, type AttackId, type Lethality } from "./core";

export const HYBRID_MENU = ["Strike ×2", "Heavy Strike", "Flask"] as const;
export const RING = { close: 0.8, perfect: 0.06, good: 0.15 };
export const CHARGE = { full: 1.3, sweet: [0.72, 0.88] as const, trip: 0.97 };

export type Command =
  | { kind: "ring"; t: number; index: number; pressed: boolean }
  | { kind: "charge"; t: number; holding: boolean; fill: number };

export class Hybrid extends Core {
  phase: "choose" | "command" | "player" | "boss" = "choose";
  command: Command | null = null;
  private last: AttackId | null = null;
  private chain = 0;
  private lockout = 0;

  constructor(lethality: Lethality) {
    super(lethality, 200);
    this.choose();
  }

  private choose() {
    this.phase = "choose";
    this.command = null;
    this.state.caption = "Your turn. 1 Strike ×2 · 2 Heavy Strike · 3 Flask";
  }

  override pick(i: number) {
    const s = this.state;
    const choice = HYBRID_MENU[i];
    if (s.mode !== "fight" || this.phase !== "choose" || !choice) return;
    this.log(`Tarnished chose ${choice}`);
    if (choice === "Strike ×2") {
      this.phase = "command";
      this.command = { kind: "ring", t: 0, index: 0, pressed: false };
      s.caption = "Press Space as the ring closes!";
    } else if (choice === "Heavy Strike") {
      this.phase = "command";
      this.command = { kind: "charge", t: 0, holding: false, fill: 0 };
      s.caption = "Hold Space to charge… release in the gold.";
    } else {
      if (!this.heal()) {
        s.caption = "The flask is empty.";
        return;
      }
      this.phase = "player";
      this.act("flask", 1.1);
      this.after(1.2, () => this.bossTurn());
    }
  }

  key(code: string, down: boolean) {
    const s = this.state;
    if (s.mode !== "fight") return;
    const n = Number(code.replace("Digit", ""));
    if (down && n >= 1 && n <= HYBRID_MENU.length) return this.pick(n - 1);
    if (code !== "Space") return;
    const c = this.command;
    if (this.phase === "command" && c?.kind === "ring" && down && !c.pressed) this.ringPress(c);
    else if (this.phase === "command" && c?.kind === "charge") {
      if (down && !c.holding && c.t === 0) {
        c.holding = true;
        this.act("charge", 99);
      } else if (!down && c.holding) this.release(c);
    } else if (this.phase === "boss" && down && this.lockout <= 0) {
      if (s.player.act.kind === "dodge" || s.player.act.kind === "hurt") return;
      this.act("dodge", 0.45, -1);
      this.lockout = 0.5; // mashing doesn't work
    }
  }

  private ringPress(c: Extract<Command, { kind: "ring" }>) {
    c.pressed = true;
    const err = c.t - RING.close;
    const ms = `${err < 0 ? "" : "+"}${Math.round(err * 1000)} ms`;
    const [label, mult, tone] =
      Math.abs(err) <= RING.perfect
        ? (["PERFECT", 2, "good"] as const)
        : Math.abs(err) <= RING.good
          ? (["Good", 1.3, "meh"] as const)
          : (["Miss", 0.6, "bad"] as const);
    this.judge(label, ms, tone);
    this.swing(Math.round(14 * mult), `Strike ${c.index + 1}`);
  }

  private swing(damage: number, label: string) {
    const c = this.command as Extract<Command, { kind: "ring" }>;
    this.act("strike", 0.6);
    this.after(0.22, () => this.hurtBoss(damage, label));
    this.after(0.65, () => {
      if (this.state.mode !== "fight") return;
      if (c.index === 0) this.command = { kind: "ring", t: -0.1, index: 1, pressed: false };
      else {
        this.phase = "player";
        this.command = null;
        this.after(0.3, () => this.bossTurn());
      }
    });
  }

  private release(c: Extract<Command, { kind: "charge" }>) {
    c.holding = false;
    const f = c.fill;
    this.phase = "player";
    const [lo, hi] = CHARGE.sweet;
    const pct = `${Math.round(f * 100)}%`;
    if (f >= lo && f <= hi) {
      this.judge("PERFECT", pct, "good");
      this.heavy(60);
    } else if (f > hi) {
      this.judge("Good", pct, "meh");
      this.heavy(40);
    } else {
      this.judge("Weak", pct, "bad");
      this.heavy(Math.max(6, 60 * f * 0.6));
    }
  }

  private heavy(damage: number) {
    this.act("heavy", 1.0);
    this.after(0.72, () => this.hurtBoss(damage, "Heavy Strike"));
    this.after(1.3, () => this.bossTurn());
  }

  private bossTurn(chained = false) {
    const s = this.state;
    if (s.mode !== "fight") return;
    this.phase = "boss";
    this.command = null;
    const options = (["cane", "daggers", "tea"] as const).filter((id) => id !== this.last);
    const id = options[Math.floor(Math.random() * options.length)]!;
    this.last = id;
    this.startAttack(id);
    s.bossBubble = ATTACK_INFO[id].tell;
    s.caption = "Margit's turn. Space to roll each hit.";
    if (!chained && s.boss.hp < s.boss.maxHp / 2 && Math.random() < 0.45) this.chain = 1;
  }

  protected update(dt: number, realDt: number) {
    const s = this.state;
    this.lockout -= dt;
    const c = this.command;
    if (this.phase === "command" && c) {
      c.t += realDt;
      if (c.kind === "ring" && !c.pressed && c.t > RING.close + 0.25) {
        c.pressed = true;
        this.judge("Miss", "no press", "bad");
        this.swing(8, `Strike ${c.index + 1}`);
      }
      if (c.kind === "charge" && c.holding) {
        c.fill = c.t > 0 ? Math.min(1, c.fill + realDt / CHARGE.full) : 0;
        if (c.fill >= CHARGE.trip) {
          c.holding = false;
          this.phase = "player";
          this.judge("Overcharged", "the Tarnished fell over", "bad");
          this.act("trip", 1.4);
          this.after(1.5, () => this.bossTurn());
        }
      }
      if (c.kind === "charge" && !c.holding && this.phase === "command") c.t = 0; // wait for the hold
    }

    const a = s.boss.attack;
    if (this.phase !== "boss" || !a) return;
    if (s.boss.at > 0.5 && a.id !== "tea") s.bossBubble = null;
    for (const _ of this.dueHits()) {
      const r = this.landHit(a);
      if (r === "dead") return;
      if (r === "perfect") this.after(0.05, () => this.hurtBoss(8, "Counter"));
    }
    if (s.boss.at >= a.end) {
      this.endAttack();
      s.bossBubble = null;
      if (this.chain > 0) {
        this.chain--;
        this.after(0.25, () => this.bossTurn(true));
        this.phase = "player";
      } else this.choose();
    }
  }
}
