---
status: accepted
---

# A World of Locations with conditional Scenes; Scenes are data, Vignettes are code

The Game branches the way Elden Ring does: the Tarnished roams, backtracks, gets lost, misses Questline steps, and comes back to find things changed. A gamebook-style graph, where every Choice jumps to the next Scene, can't express "the same place, later". So the World is a graph of Locations joined by exits. Scenes are events that fire in a Location when the World State allows, chosen by condition and priority. Conditions and effects are declarative data over the World State, so a content checker can walk the whole World and catch Locations you can't reach, unlocks that exist nowhere, and Questline steps you can't reach.

Content is authored as TypeScript data modules using typed helpers from the Engine, not Ink, YAML, or Markdown. Agents write almost all of it, so compile-time IDs and types matter more than comfortable prose editing. Ink's state and weaving is its strength, but it knows nothing about 3D staging, and it would add a second runtime on top of a World State we need anyway.

Vignettes, including every Gag, are code: modules that build gsap timelines over the Stage's actors, using Engine helpers named after the gag vocabulary. Data refers to them by ID. Gags are unique choreography that is never repeated, so a declarative step format would slowly turn into a weaker animation language. The cost is that a Vignette can't be checked the way data can. It is only checked by playing it.
