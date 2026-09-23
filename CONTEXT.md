# Elden Ring Adventure

A fully 3D, browser-based choose-your-own-adventure parody of Elden Ring, built on a small reusable engine. The comedy comes from bosses killing the Tarnished in elaborate ways and then doing something mundane.

## Language

### Play

**Tarnished**:
The player character. A small comedic figure, incompetent by design.
_Avoid_: Player, hero, avatar

**Scene**:
One authored moment in the story: a location, what is said, and the Choices on offer.
_Avoid_: Page, node, screen

**Choice**:
An option the player picks inside a Scene. Leads to another Scene or triggers Combat or a Vignette.
_Avoid_: Option, branch, link

**Site of Grace**:
A checkpoint. Where the Tarnished respawns after death and where Runes are spent on the Tree.
_Avoid_: Checkpoint, bonfire, save point

**Route**:
The fixed order of Scenes, item pickups, and bosses from the Chapel of Anticipation to Margit.
_Avoid_: Map, world, campaign

### Comedy

**Vignette**:
A short scripted 3D animation played on the stage, with no player input.
_Avoid_: Cutscene, clip, animation

**Gag**:
A Vignette in which a boss kills the Tarnished in a unique way and then does something mundane. Each boss has a list of Gags.
_Avoid_: Death animation, fail state, kill

**Aftermath**:
The mundane thing the boss does after the kill, like sitting on the corpse with a cup of tea. The second half of every Gag.

### Progression

**Runes**:
Currency earned from enemies and bosses, spent at a Site of Grace on the Tree.
_Avoid_: XP, points, souls

**Tree**:
The fixed branching set of upgrades bought with Runes. Nodes raise stats or unlock items and moves. There is no stat-point allocation.
_Avoid_: Skill tree, stat screen, levelling

### Architecture

**Engine**:
The reusable package: runs Scenes, plays Vignettes, resolves Combat, tracks the Tree and saves. Holds only what the first game needs.
_Avoid_: Framework, core, platform

**Game**:
A content package built on the Engine. Elden Ring Adventure is the first; others may follow.
_Avoid_: App, title, campaign
