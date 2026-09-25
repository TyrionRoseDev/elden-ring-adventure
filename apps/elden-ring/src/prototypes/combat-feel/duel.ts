// PROTOTYPE: variant D, Choice duel. Combat is Choices under a clock: Margit winds up, time nearly stops,
// thought bubbles offer two to four responses. A wrong one is an instant Gag. Four openings fell him.
// Not in the ticket: added because it is the choose-your-own-adventure-native option.
import { ATTACK_INFO, Core, type AttackId, type GagId, type Lethality } from "./core";

type Outcome = "opening" | "safe" | "death" | "biscuit";
type Response = "rollIn" | "rollAway" | "shield" | "hop" | "catch" | "charge" | "rollNow" | "wait" | "biscuit";
export type DuelChoice = { label: string; outcome: Outcome; response: Response; gag?: GagId; locked?: string };

const CHOICES: Record<AttackId, DuelChoice[]> = {
  cane: [
    { label: "Roll into him", outcome: "opening", response: "rollIn" },
    { label: "Roll away", outcome: "safe", response: "rollAway" },
    { label: "Raise your shield", outcome: "death", response: "shield", gag: "pancake" },
    { label: "Parry", outcome: "opening", response: "rollIn", locked: "Tree: Golden Parry" },
  ],
  daggers: [
    { label: "Hop, hop, hop", outcome: "opening", response: "hop" },
    { label: "Try to catch them", outcome: "death", response: "catch", gag: "pincushion" },
    { label: "Charge through", outcome: "death", response: "charge", gag: "pincushion" },
  ],
  tea: [
    { label: "Roll now!", outcome: "death", response: "rollNow", gag: "launch" },
    { label: "Wait for it…", outcome: "opening", response: "wait" },
    { label: "Offer him a biscuit", outcome: "biscuit", response: "biscuit" },
    { label: "Throw a Fire Pot", outcome: "opening", response: "wait", locked: "Item: Fire Pot" },
  ],
};

const DECIDE_AT: Record<AttackId, number> = { cane: 0.55, daggers: 0.45, tea: 1.0 };
export const CLOCK = 3.2; // real seconds to choose
const OPENINGS = 4;

export class Duel extends Core {
  phase: "tell" | "choosing" | "outcome" | "pause" = "pause";
  choices: DuelChoice[] = [];
  clock = 0;
  private chosen: DuelChoice | null = null;
  private last: AttackId | null = null;
  private pause = 1.0;

  constructor(lethality: Lethality) {
    super(lethality, 100);
    this.state.caption = "Read his wind-up. Pick fast.";
  }

  key(code: string, down: boolean) {
    const n = Number(code.replace("Digit", ""));
    if (down && n >= 1) this.pick(n - 1);
  }

  override pick(i: number) {
    const c = this.choices[i];
    if (this.phase !== "choosing" || !c || c.locked || this.state.mode !== "fight") return;
    this.resolve(c);
  }

  private resolve(c: DuelChoice | null) {
    const s = this.state;
    const a = s.boss.attack!;
    this.phase = "outcome";
    this.chosen = c;
    this.choices = [];
    s.slowmo = 1;
    s.playerBubble = null;
    const hit = a.hits[0]!;
    const at = (t: number) => Math.max(0, t - s.boss.at);
    if (!c) {
      this.judge("Froze", `${CLOCK}s passed`, "bad");
      this.after(at(hit), () => this.die("freeze"));
      return;
    }
    this.log(`Chose "${c.label}"`);
    switch (c.response) {
      case "rollIn":
        this.after(at(hit - 0.12), () => this.act("dodge", 0.55, 1));
        break;
      case "rollAway":
        this.after(at(hit - 0.12), () => this.act("dodge", 0.55, -1));
        break;
      case "wait":
        this.after(at(hit - 0.12), () => this.act("dodge", 0.55, -1));
        break;
      case "rollNow":
        this.act("dodge", 0.55, -1);
        break;
      case "hop":
        this.after(at(hit - 0.3), () => this.act("hop", a.hits[a.hits.length - 1]! - hit + 0.6));
        break;
      case "shield":
      case "catch":
        this.act("guard", 3);
        break;
      case "charge":
        this.act("strike", 0.75);
        break;
      case "biscuit":
        this.act("biscuit", 1.6);
        s.boss.attack = null;
        s.bossBubble = "…is that a biscuit?";
        this.judge("Biscuit accepted", "Margit resets", "meh");
        this.after(1.4, () => (s.bossBubble = "🍪"));
        this.after(2.0, () => this.endRound());
        return;
    }
  }

  private endRound() {
    this.endAttack();
    this.state.bossBubble = null;
    this.phase = "pause";
    this.pause = 0.7;
  }

  protected update(_dt: number, realDt: number) {
    const s = this.state;
    if (this.phase === "pause") {
      this.pause -= realDt;
      if (this.pause <= 0) {
        const options = (["cane", "daggers", "tea"] as const).filter((id) => id !== this.last);
        const id = options[Math.floor(Math.random() * options.length)]!;
        this.last = id;
        this.startAttack(id);
        s.bossBubble = ATTACK_INFO[id].tell;
        this.phase = "tell";
      }
      return;
    }
    const a = s.boss.attack;
    if (!a) return;
    if (this.phase === "tell" && s.boss.at >= DECIDE_AT[a.id]) {
      this.phase = "choosing";
      this.clock = CLOCK;
      this.choices = [...CHOICES[a.id]].sort(() => Math.random() - 0.5);
      s.slowmo = 0.03;
      s.caption = "Choose!";
    }
    if (this.phase === "choosing") {
      this.clock -= realDt;
      if (this.clock <= 0) this.resolve(null);
      return;
    }
    if (this.phase !== "outcome") return;
    const c = this.chosen;
    for (const i of this.dueHits()) {
      if (i === 0 && c?.outcome === "death") return this.die(a.id, c.gag);
      if (i === 0) this.judge(c?.outcome === "opening" ? "Opening!" : "Safe", c?.label ?? "", c?.outcome === "opening" ? "good" : "meh");
    }
    if (s.boss.at >= a.hits[a.hits.length - 1]! + 0.15 && c?.outcome === "opening" && s.player.act.kind !== "strike") {
      this.chosen = { ...c, outcome: "safe" }; // strike once
      this.act("strike", 0.75);
      this.after(0.3, () => this.hurtBoss(s.boss.maxHp / OPENINGS, "Opening"));
    }
    if (s.boss.at >= a.end) this.endRound();
  }
}
