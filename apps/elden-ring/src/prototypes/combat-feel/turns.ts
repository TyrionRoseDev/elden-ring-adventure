// PROTOTYPE: variant A, turn-based. Margit shows his next move; you pick from a menu; the round plays out on its own.
import { ATTACK_INFO, Core, type AttackId, type Lethality } from "./core";

export const TURN_MENU = ["Strike", "Heavy Strike", "Guard", "Roll", "Flask"] as const;

export class Turns extends Core {
  phase: "choose" | "resolve" = "choose";
  intent: AttackId = "cane";
  private last: AttackId | null = null;
  private mult = 1;
  private guarding = false;

  constructor(lethality: Lethality) {
    super(lethality, 200);
    this.nextRound();
  }

  private nextRound() {
    const options = (["cane", "daggers", "tea"] as const).filter((id) => id !== this.last);
    this.intent = options[Math.floor(Math.random() * options.length)]!;
    this.last = this.intent;
    this.phase = "choose";
    this.mult = 1;
    this.guarding = false;
    this.state.bossBubble = `💭 ${ATTACK_INFO[this.intent].name}`;
    this.state.caption = `Margit ${ATTACK_INFO[this.intent].tell} What will the Tarnished do?`;
  }

  key(code: string, down: boolean) {
    if (!down) return;
    const n = Number(code.replace("Digit", ""));
    if (n >= 1 && n <= TURN_MENU.length) this.pick(n - 1);
  }

  override pick(i: number) {
    const s = this.state;
    const choice = TURN_MENU[i];
    if (s.mode !== "fight" || this.phase !== "choose" || !choice) return;
    if (choice === "Flask" && s.player.flasks <= 0) {
      s.caption = "The flask is empty. What will the Tarnished do?";
      return;
    }
    this.phase = "resolve";
    s.bossBubble = null;
    this.log(`Tarnished chose ${choice}`);
    let bossAt = 1.1;
    switch (choice) {
      case "Strike":
        s.caption = "The Tarnished used Strike!";
        this.act("strike", 0.75);
        this.after(0.3, () => this.hurtBoss(22, "Strike"));
        break;
      case "Heavy Strike":
        s.caption = "The Tarnished used Heavy Strike! They're wide open…";
        this.act("heavy", 1.0);
        this.after(0.72, () => this.hurtBoss(45, "Heavy Strike"));
        this.mult = 1.5;
        bossAt = 1.4;
        break;
      case "Guard":
        s.caption = "The Tarnished raised their shield.";
        this.guarding = true;
        bossAt = 0.6;
        break;
      case "Roll":
        s.caption = "The Tarnished gets ready to roll.";
        bossAt = 0.6;
        break;
      case "Flask":
        s.caption = "The Tarnished drank from a flask.";
        this.act("flask", 1.1);
        this.after(0.75, () => this.heal());
        break;
    }
    this.after(bossAt, () => this.bossTurn(choice));
  }

  private bossTurn(choice: (typeof TURN_MENU)[number]) {
    const s = this.state;
    if (s.mode !== "fight") return;
    const a = this.startAttack(this.intent);
    s.caption = `Margit used ${ATTACK_INFO[a.id].name}!`;
    if (this.guarding) this.act("guard", a.end);
    if (choice === "Roll") {
      // The roll is automatic; the Tarnished's timing is only as good as the dice.
      const first = a.hits[0]!;
      const early = a.id === "tea" && Math.random() < 0.5;
      const at = early ? 0.55 : first - 0.12;
      this.after(at, () => this.act("dodge", 0.55, -1));
      if (a.id === "daggers") this.after(first + 0.05, () => (s.caption = "One roll. Three daggers."));
      if (early) this.after(at + 0.3, () => (s.caption = "The Tarnished rolled too early. Margit is still sipping."));
    }
  }

  protected update() {
    const s = this.state;
    const a = s.boss.attack;
    if (!a) return;
    for (const _ of this.dueHits()) if (this.landHit(a, { mult: this.mult, guardMult: 0.35 }) === "dead") return;
    if (s.boss.at >= a.end) {
      this.endAttack();
      this.nextRound();
    }
  }
}
