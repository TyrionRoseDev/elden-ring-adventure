"""PROTOTYPE: the set. Stormveil's front gate, a flagstone courtyard, ruins, and the Erdtree on the horizon.
blender -b --factory-startup --python-exit-code 1 --python arena.py -- <out.glb> [preview.png]
The camera looks from -Y toward +Y (three.js +Z toward -Z)."""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import *  # noqa: E402,F403

args = argv()
OUT = args[0]
PREVIEW = args[1] if len(args) > 1 else None
random.seed(3)
reset()

grass = mat("Grass", "#86a03e", rough=1)
grass_dark = mat("GrassDark", "#62802f", rough=1)
blade_m = mat("GrassBlade", "#a8bd4e", rough=1)
stones = [mat(f"Stone{i}", c, rough=0.95) for i, c in enumerate(("#bcae90", "#a8997c", "#c9bc9c", "#9c8e73"))]
wall = mat("Wall", "#b8aa8e", rough=0.95)
wall_dark = mat("WallDark", "#8f826b", rough=0.95)
roof = mat("Slate", "#4b5a78", rough=0.8)
banner = mat("Banner", "#7b2320", rough=0.9)
bark = mat("ErdBark", "#d9a441", rough=0.6, emit="#e0a23a", strength=0.55)
leaf = mat("ErdLeaf", "#ffd76a", rough=0.6, emit="#ffc94a", strength=1.1)
rock = mat("Rock", "#958b78", rough=1)
gate_dark = mat("GateDark", "#1f1c19", rough=1)
flower = mat("Flower", "#e9d9a8", rough=0.8)

objs = []


def add(o):
    objs.append(o)
    return o


# ------------------------------------------------------------------ ground: meadow disc with gentle roll
add(lathe("Meadow", [(0.0, 0.0), (6, 0.0), (14, 0.1), (30, 0.6), (60, 1.5)], grass, seg=64, per=2, cap_top=False,
          cap_bottom=False, radial=lambda th, t, r: r * (1 + 0.05 * math.sin(5 * th))))
for o in objs[-1:]:
    for v in o.data.vertices:
        v.co.z = -0.02 + 0.12 * math.sin(v.co.x * 0.35) * math.cos(v.co.y * 0.3) * min(1, v.co.length / 8) - 0.01
    o.data.update()
    for poly in o.data.polygons:  # the open lathe can come out facing down
        if poly.normal.z < 0:
            poly.flip()

# ------------------------------------------------------------------ flagstone courtyard (jittered grid, clipped to a circle)
R = 4.2
step = 0.62
i = 0
y = -R
while y < R:
    x = -R + (random.random() * step if int(y / step) % 2 else 0)
    while x < R:
        w = step * random.uniform(0.75, 1.35)
        cx, cy = x + w / 2, y + step / 2
        d = math.hypot(cx, cy)
        if d < R - 0.2 or (d < R + 0.4 and random.random() < 0.5):
            h = random.uniform(0.05, 0.09)
            add(rbox(f"Flag{i}", (w - 0.05, step - 0.05, h), (cx, cy, h / 2 - 0.03 + random.uniform(-0.01, 0.01)),
                     random.choice(stones), bevel=0.35, segments=1, rot=(random.uniform(-1.5, 1.5), random.uniform(-1.5, 1.5), random.uniform(-4, 4))))
            i += 1
        x += w
    y += step

# ------------------------------------------------------------------ Stormveil gate wall, far side
GY = 13.5
gate_start = len(objs)
for gx in (-6.5, -3.4, 3.4, 6.5):  # wall blocks either side of the gate
    add(rbox(f"Wall{gx}", (3.2, 1.4, 5.2), (gx, GY, 2.6), wall, bevel=0.06, segments=1))
    for k in range(4):  # crenellations
        add(rbox(f"Cren{gx}{k}", (0.5, 1.4, 0.55), (gx - 1.2 + k * 0.8, GY, 5.45), wall, bevel=0.1, segments=1))
# arch over the gate
add(rbox("GateLintel", (3.6, 1.5, 1.6), (0, GY, 4.4), wall_dark, bevel=0.05, segments=1))
arch = [(math.cos(a) * 1.25, GY - 0.72, 2.2 + math.sin(a) * 1.3) for a in [i / 20 * math.pi for i in range(21)]]
add(tube("Arch", arch, [0.28] * 2, wall_dark, per=1, seg=8))
add(sheet("GateVoid", 2.5, 3.6, gate_dark, nx=10, ny=10, thickness=0.02,
          fn=lambda u, v: Vector(((u - 0.5) * 2.5, GY - 0.6, v * 3.5)) if (v < 0.63 or math.hypot((u - 0.5) * 2.5, (v * 3.5 - 2.2)) < 1.25) else None))
for side in (-1, 1):  # towers
    add(lathe(f"Tower{side}", [(1.5, 0), (1.45, 5.0), (1.6, 5.2), (1.6, 6.8)], wall, seg=24, per=1, center=(side * 9.2, GY + 0.4, 0)))
    add(lathe(f"TowerRoof{side}", [(1.85, 6.8), (1.0, 8.2), (0.06, 10.2)], roof, seg=24, per=2, center=(side * 9.2, GY + 0.4, 0)))
    add(sheet(f"Banner{side}", 0.9, 2.6, banner, nx=4, ny=10, thickness=0.02,
              fn=lambda u, v, s=side: Vector((s * 1.85 + (u - 0.5) * 0.9, GY - 0.72 - 0.05 * math.sin(v * 6),
                                               1.6 + v * 2.6 - (0.25 if (v < 0.1 and 0.3 < u < 0.7) else 0)))))

for o in objs[gate_start:]:  # squat it so the sky and the Erdtree show over the wall
    o.data.transform(Matrix.Scale(0.62, 4, (0, 0, 1)))

# ------------------------------------------------------------------ ruins: broken pillars and a fallen drum
for k, (px, py, h) in enumerate(((-3.6, 2.2, 2.4), (3.9, 1.6, 1.3), (-4.6, -1.0, 0.8), (4.8, 4.2, 3.1))):
    top = [(0.38, h - 0.25 + random.uniform(-0.2, 0.2))]
    add(lathe(f"Pillar{k}", [(0.5, 0), (0.44, 0.25), (0.36, 0.35)] + [(0.36, h * t) for t in (0.5, 0.8)] + top,
              wall, seg=16, per=1, center=(px, py, 0),
              radial=lambda th, t, r: r * (1 + 0.04 * (math.cos(8 * th) > 0.3))))
add(lathe("FallenDrum", [(0.36, -0.5), (0.36, 0.5)], wall, seg=16, per=1))
place(objs[-1], loc=(2.8, 3.2, 0.33), rot=(90, 0, 35))
for k in range(14):
    a = random.uniform(0, 2 * math.pi)
    d = random.uniform(4.8, 9)
    s = random.uniform(0.25, 0.8)
    add(blob(f"Rock{k}", (s, s * random.uniform(0.7, 1.1), s * 0.6), (math.cos(a) * d, abs(math.sin(a)) * d - 1.5, s * 0.15), rock,
             seg=10, rings=7, rot=(0, 0, random.uniform(0, 180)),
             deform=lambda v: v * (1 + 0.18 * math.sin(v.x * 9 + v.y * 5))))

# ------------------------------------------------------------------ grass tufts and little flowers, never on the courtyard
tuft_parts = []
for k in range(260):
    a = random.uniform(0, 2 * math.pi)
    d = random.uniform(R + 0.2, 16)
    cx, cy = math.cos(a) * d, math.sin(a) * d
    if cy > GY - 1.2:
        continue
    for b in range(5):
        ang = b / 5 * 2 * math.pi + random.uniform(-0.4, 0.4)
        h = random.uniform(0.18, 0.38)
        tip = Vector((cx + math.cos(ang) * h * 0.4, cy + math.sin(ang) * h * 0.4, h))
        tuft_parts.append(tube(f"Blade{k}{b}", [(cx, cy, -0.02), ((cx + tip.x) / 2, (cy + tip.y) / 2, h * 0.6), tuple(tip)],
                               [0.035, 0.02, 0.002], blade_m if b % 2 else grass_dark, seg=4, per=2, smooth=False))
    if random.random() < 0.3:
        tuft_parts.append(blob(f"Flower{k}", (0.05, 0.05, 0.03), (cx, cy, 0.3), flower, seg=8, rings=5))
objs += tuft_parts

# ------------------------------------------------------------------ the Erdtree, glowing on the horizon
EX, EY = -9, 74
trunk = []
for k in range(5):
    ang = k / 5 * 2 * math.pi
    pts = [(EX + math.cos(ang) * 3.2, EY + math.sin(ang) * 3.2, 0), (EX + math.cos(ang + 0.8) * 1.6, EY + math.sin(ang + 0.8) * 1.6, 12),
           (EX + math.cos(ang + 1.8) * 1.1, EY + math.sin(ang + 1.8) * 1.1, 22),
           (EX + math.cos(ang + 2.4) * 5 + 2, EY + math.sin(ang + 2.4) * 3, 30)]
    add(tube(f"Erdtrunk{k}", pts, [1.4, 0.9, 0.8, 0.3], bark, seg=8))
for k in range(16):
    a = random.uniform(0, 2 * math.pi)
    d = random.uniform(0, 11)
    add(blob(f"Crown{k}", (random.uniform(4, 7), random.uniform(3, 5), random.uniform(2.5, 4)),
             (EX + math.cos(a) * d * 1.3, EY + math.sin(a) * d * 0.5, 30 + random.uniform(-3, 6) - d * 0.3), leaf, seg=14, rings=9))

for o in objs:
    if o.name.startswith(("Erdtrunk", "Crown")):
        o.data.transform(Matrix.Translation((EX, EY, 0)) @ Matrix.Scale(0.42, 4) @ Matrix.Translation((-EX, -EY, 0)))

# ------------------------------------------------------------------ one object per material keeps draw calls low
by_mat = {}
for o in objs:
    by_mat.setdefault(o.data.materials[0].name, []).append(o)
for name, group in by_mat.items():
    bpy.ops.object.select_all(action="DESELECT")
    for o in group:
        o.select_set(True)
    bpy.context.view_layer.objects.active = group[0]
    if len(group) > 1:
        bpy.ops.object.join()
    group[0].name = "Erdtree" if name.startswith("Erd") else f"Set_{name}"

export(OUT)
if PREVIEW:
    preview(PREVIEW, target=(0, 4, 1.2), dist=13, az=0, el=14, res=768, lens=35)
