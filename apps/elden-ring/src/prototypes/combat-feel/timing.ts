// PROTOTYPE: variant B, real-time. Margit attacks on his own clock; you roll through his hits and poke him between them.
import { ATTACK_INFO, Core, DODGE, type AttackId, type Lethality } from "./core";

const COST = { dodge: 22, strike: 16 };

export class Timing extends Core {
  override readonly usesStamina = true;
  private gap = 1.4;
  private last: AttackId | null = null;
  private rest = 0; // stamina regen delay
  private riposte = 0; // window after a perfect roll where strikes crit

  constructor(lethality: Lethality) {
    super(lethality, 220);
    this.state.caption = "Space roll · J strike · F flask";
  }

  protected update(dt: number) {
    const s = this.state;
    const p = s.player;
    const b = s.boss;
    this.rest -= dt;
    this.riposte -= dt;
    if (this.rest <= 0) p.stamina = Math.min(100, p.stamina + 45 * dt);

    if (!b.attack) {
      this.gap -= dt;
      if (this.gap <= 0) {
        const options = (["cane", "daggers", "tea"] as const).filter((id) => id !== this.last);
        const id = options[Math.floor(Math.random() * options.length)]!;
        this.last = id;
        this.startAttack(id);
        s.bossBubble = ATTACK_INFO[id].tell;
      }
      return;
    }
    const a = b.attack;
    if (b.at > 0.5 && a.id !== "tea") s.bossBubble = null;
    for (const _ of this.dueHits()) {
      const r = this.landHit(a);
      if (r === "perfect") this.riposte = 1.2;
      if (r === "dead") return;
    }
    if (b.at >= a.end) {
      this.endAttack();
      s.bossBubble = null;
      this.gap = 0.5 + Math.random() * 0.9;
    }
  }

  private busy() {
    const act = this.state.player.act;
    if (act.kind === "idle") return false;
    if (act.kind === "hurt") return act.t < 0.3;
    if (act.kind === "strike") return act.t < 0.5; // recovery can be cancelled into a roll
    return true;
  }

  private spend(cost: number) {
    const p = this.state.player;
    if (p.stamina <= 0) {
      this.judge("Out of breath", "wait for stamina", "bad");
      return false;
    }
    p.stamina -= cost;
    this.rest = 0.45;
    return true;
  }

  key(code: string, down: boolean) {
    if (!down || this.state.mode !== "fight") return;
    const s = this.state;
    if (code === "Space") {
      if (this.busy() || !this.spend(COST.dodge)) return;
      this.act("dodge", DODGE.dur, -1);
    } else if (code === "KeyJ" || code === "KeyK") {
      if (this.state.player.act.kind !== "idle" || !this.spend(COST.strike)) return;
      this.act("strike", 0.75);
      const act = s.player.act;
      const crit = this.riposte > 0;
      this.after(0.3, () => {
        if (s.player.act !== act) return; // interrupted
        if (crit) this.judge("RIPOSTE", "struck inside the perfect-roll window", "good");
        this.hurtBoss(crit ? 30 : 11, crit ? "Riposte" : "Strike");
      });
    } else if (code === "KeyF") {
      if (this.state.player.act.kind !== "idle" || s.player.flasks <= 0) return;
      this.act("flask", 1.1);
      const act = s.player.act;
      this.after(0.75, () => {
        if (s.player.act === act) this.heal();
      });
    }
  }
}
