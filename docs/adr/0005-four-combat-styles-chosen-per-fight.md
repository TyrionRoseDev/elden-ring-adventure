---
status: accepted
---

# Combat has four Styles, and each Fight picks one

We prototyped four combat models against one Margit: turn-based menus, real-time dodge-and-strike, a hybrid of menu plus timed presses, and a Choice made against a clock. The user liked all four and ruled out settling on one, because a single system would make the Game samey. So combat has four Styles and each Fight names its own: a **Brawl** (real-time) for physical bosses like Margit, a **Duel** (turn-based, won by knowing weaknesses) for casters, a **Clash** (menu plus timed presses) for weapon-masters like Crucible Knights, and a **Standoff** (choose against a clock, a wrong pick is an instant Gag) scattered wherever it is funny. A Standoff can also interrupt any Fight, or appear in a Scene with no Fight at all. The player never chooses the Style; a Choice before a Fight can still lead to a different Fight, such as ambushing a boss instead of walking up to him.

Brawls, Duels and Clashes use a health bar and bosses hit hard. Standoffs are where the instant-death Gags live, which is where the Carbot rhythm of frequent funny deaths comes from. Making every hit fatal everywhere was rejected as not fun.

Every hit a Killer lands has a visible Tell. Difficulty comes from rhythm, combos and fake-outs such as Margit sipping tea for a random time, never from a hidden cue. How long before the hit the Tell appears is tuned per Killer. A sound may accompany a Tell only if it sits inside the music and SFX mix; a standalone beep was tried and rejected as jarring.

One system of Affinities (kinds of damage) and Statuses (effects that build up) runs across all four Styles, so knowledge carries from Fight to Fight; Duels just make it the centre. Weaknesses are discovered, not displayed. Each Killer's strength is fixed and never scales to the Tarnished, so returning to Limgrave strong is a reward.

## Consequences

The Engine ships all four Styles from Chapter One, which is more work than one system but is what Chapter One is for. Each Style gets a gentle first Fight: Standoff first, at the Chapel of Anticipation; Brawl on the Main Path before Margit; Clash and Duel as optional finds off the path. Later Chapters surprise the player within and between Styles (a boss that turns a Brawl into a Duel mid-Fight, say), not by adding new ones. The prototype is on branch `prototype/combat-feel`.
