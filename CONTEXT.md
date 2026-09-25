# Elden Ring Adventure

A fully 3D, browser-based choose-your-own-adventure parody of Elden Ring, built on a small reusable engine. The comedy comes from bosses killing the Tarnished in elaborate ways and then doing something mundane.

## Language

### Play

**Tarnished**:
The player character. A small comedic figure, incompetent by design.
_Avoid_: Player, hero, avatar

**Scene**:
One authored moment that plays out in a Location when the World State allows it: what is said, what happens, and the Choices on offer. Returning to a Location can play a different Scene.
_Avoid_: Page, node, screen

**Choice**:
An option the player picks inside a Scene. It can lead to another Scene, travel to another Location, start Combat, or play a Vignette. Some Choices are traps.
_Avoid_: Option, branch, link

**Line**:
Something a character says, shown in a speech bubble. Characters talk; bosses and Gags stay silent apart from yelps and emotes.
_Avoid_: Dialogue, text, caption

**Location**:
A named 3D set, such as the Chapel of Anticipation or the Church of Elleh. Several Scenes can take place in one Location.
_Avoid_: Level, room, area

**Mark**:
A named spot inside a Location where actors stand, walk to, or props appear.
_Avoid_: Waypoint, anchor, position

**NPC**:
A named character the Tarnished can talk to, help, or attack. Attacking one has permanent consequences: they turn hostile or die, and their Questline may lock.
_Avoid_: Character (too broad), villager

**Message**:
A note left on the ground in a Location. It can be true, a lie that leads into a trap, or just a joke.
_Avoid_: Sign, hint, note

**Night**:
The World's other time of day, switched by resting at a Site of Grace. Some Scenes, NPCs, and Killers only appear at night.
_Avoid_: Time, cycle, phase

**Site of Grace**:
A checkpoint. Where the Tarnished respawns after death and where Runes are spent on the Tree.
_Avoid_: Checkpoint, bonfire, save point

**World**:
The Locations and the exits that join them. The Tarnished roams it freely, can backtrack, and can get lost.
_Avoid_: Map, level, overworld

**World State**:
Everything a playthrough remembers: where the Tarnished has been, what they carry, who is alive, which bosses are beaten, and which Questline steps are done. Scenes and Choices depend on it.
_Avoid_: Flags, save data, progress

**Main Path**:
The intended way through a Chapter to its milestone boss. It is always available, but it is only one of many routes through the World.
_Avoid_: Route, critical path, story mode

**Questline**:
A chain of steps tied to a character or place, running alongside the Main Path. Steps can be missed or locked out, but the game hints at them in-world and in the Journal.
_Avoid_: Side quest, mission, errand

**Journal**:
The Tarnished's light record of Questline steps reached and hints heard. It never spells out the solution.
_Avoid_: Quest log, tracker

**Ending**:
One of several ways the whole Game can conclude, reached through Questlines and choices.
_Avoid_: Game over, finale

**Chapter**:
A milestone slice of the Game that ends at a boss. Chapter One runs from the Chapel of Anticipation to Margit. Earlier Chapters' Locations stay open afterwards.
_Avoid_: Level, act, episode

### Comedy

**Vignette**:
A short scripted 3D animation played on the stage, with no player input.
_Avoid_: Cutscene, clip, animation

**Killer**:
Anything that can kill the Tarnished: a boss, an enemy, a trap, or the environment. Each Killer has its own list of Gags.
_Avoid_: Enemy (when a trap or cliff is meant), hazard

**Gag**:
A Vignette in which a Killer kills the Tarnished in a unique way. A boss Gag always ends in an Aftermath; smaller Killers' Gags can be shorter.
_Avoid_: Death animation, fail state, kill

**Aftermath**:
The mundane thing the Killer does after the kill, like sitting on the corpse with a cup of tea. The second half of every boss Gag.

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
