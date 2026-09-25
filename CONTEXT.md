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
An option the player picks inside a Scene. It can lead to another Scene, travel to another Location, start a Fight, or play a Vignette. Some Choices are traps.
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

### Combat

**Fight**:
One combat encounter between the Tarnished and a Killer, played in a single Style. A Killer's strength is fixed; it never scales to the Tarnished.
_Avoid_: Battle, encounter, combat (for one instance)

**Style**:
How a Fight plays: a Brawl, a Duel, a Clash or a Standoff. The Fight sets it, never the player.
_Avoid_: Mode, combat system

**Brawl**:
The real-time Style: roll through the Killer's hits and strike between them. For physical bosses like Margit.
_Avoid_: Action combat, real-time fight

**Duel**:
The turn-based Style, where knowing a Killer's weaknesses to Affinities and Statuses decides the Fight. For sorcerers and other casters.
_Avoid_: Turn-based battle, spell fight

**Clash**:
The Style where the Tarnished picks an action from a menu, lands it with timed presses, and rolls the Killer's hits by hand. For weapon-masters like Crucible Knights.
_Avoid_: Hybrid, action commands

**Standoff**:
Time nearly stops and the Tarnished must pick a response before a clock runs out; a wrong pick is an instant Gag. It can interrupt any Fight or appear in any Scene.
_Avoid_: Quick-time event, choice duel

**Tell**:
The visible warning a Killer gives before a hit lands. Every hit has one.
_Avoid_: Telegraph, cue

**Affinity**:
A kind of damage, such as physical, magic, fire, lightning or holy. Killers are weak or resistant to some, and the Tarnished learns which by playing.
_Avoid_: Element, damage type

**Status**:
An effect that builds up over several hits and then triggers, such as poison, Scarlet Rot or bleed.
_Avoid_: Debuff, ailment, condition

### Progression

**Runes**:
Currency earned from enemies and bosses, spent at a Site of Grace on the Tree.
_Avoid_: XP, points, souls

**Tree**:
The fixed branching set of upgrades bought with Runes. Nodes raise stats or unlock items and moves. There is no stat-point allocation.
_Avoid_: Skill tree, stat screen, levelling

### Architecture

**Engine**:
The reusable package: runs Scenes, plays Vignettes, runs Fights, tracks the Tree and saves. Holds only what the first game needs.
_Avoid_: Framework, core, platform

**Game**:
A content package built on the Engine. Elden Ring Adventure is the first; others may follow.
_Avoid_: App, title, campaign
