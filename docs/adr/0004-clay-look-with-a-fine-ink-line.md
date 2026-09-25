---
status: accepted
---

# The look is soft clay with a fine ink line, and characters are recognisable caricatures

We built one full Margit Gag in five looks and the user played them all. The winner is B's "clay diorama" shading with a hair of A's cel ink (variant E on the prototype branch): standard PBR materials pushed rough and low-metal so everything reads as plasticine, ACES tone mapping, a warm key sun over a sky-and-earth fill, mild bloom so glowing eyes and the Erdtree pop, a saturation lift, a light vignette and a touch of grain. A thin inverted-hull outline (0.005 units, dark brown) sits on everything. Proportions are 2.6 heads tall. This replaces the research recommendation of `MeshToonMaterial`: flat toon bands looked cheap and over-bright next to the clay shading, and the full cel look was only liked in small doses. The tilt-shift blur that sold the "miniature" in B was rejected as too blurry; a heavier outline was rejected as too crisp.

Blender still only authors plain Principled materials. The look lives entirely in the Engine (material swap, outline hulls, post-processing), so one set of models can be regraded without re-exporting.

Characters are cute caricatures of the real Elden Ring designs, not original inventions. The prototype's hooded Margit was rejected because he didn't look like Margit. Assets are still original work made by our scripts, never ripped, but each character should be recognisable at a glance and be designed from reference images, not from memory.
