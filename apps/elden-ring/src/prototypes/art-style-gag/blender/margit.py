"""PROTOTYPE: Margit, the Fell Omen (on his tea break), built headless. Usage:
blender -b --factory-startup --python-exit-code 1 --python margit.py -- <A|B|C> <out.glb> [preview.png]
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import *  # noqa: E402,F403

args = argv()
VARIANT, OUT = args[0], args[1]
PREVIEW = args[2] if len(args) > 2 else None

# S scales the whole body; HS scales the head on top of that (bigger = sillier)
S, HS = {"A": (0.95, 1.25), "B": (1.05, 1.05), "C": (1.2, 0.85)}[VARIANT]
random.seed(11)
reset()

robe = mat("Robe", "#5a5149", rough=0.92)
mantle = mat("Mantle", "#3b3530", rough=0.95)
skin_m = mat("AshenSkin", "#b8aa97", rough=0.8)
hair = mat("WhiteHair", "#ebe6dc", rough=0.9)
eye_m = mat("OmenEye", "#ffd23d", rough=0.3, emit="#ffc21a", strength=4.0)
horn = mat("Horn", "#d6c9aa", rough=0.6)
rope = mat("Rope", "#8b6b33", rough=0.85)
boot = mat("Wrap", "#34302b", rough=0.95)
cane_m = mat("CaneWood", "#5b3c22", rough=0.8)
gold = mat("Gold", "#d9a93b", rough=0.3, metal=0.9)
porcelain = mat("Porcelain", "#f4f0e8", rough=0.25)
blue = mat("WillowBlue", "#3565b0", rough=0.3)
lace = mat("Lace", "#fbf8f0", rough=0.9)

hipZ, waistZ, shZ, neckZ = 0.85, 0.97, 1.52, 1.60
headZ = neckZ + 0.22
shX = 0.40
UA, FA = 0.36, 0.32

parts = []


def add(o):
    parts.append(o)
    return o


def ring_path(r, z, n=40, sy=1.0):
    return [(math.cos(a) * r, math.sin(a) * r * sy, z) for a in [i / n * 2 * math.pi for i in range(n + 1)]]


# ------------------------------------------------------------------ robe and body
add(lathe("RobeSkirt", [(0.64, 0.02), (0.6, 0.14), (0.49, 0.48), (0.39, 0.82), (0.35, waistZ + 0.04)], robe, seg=48,
          sy=0.92, bone="skirt",
          radial=lambda th, t, r: r * (1 + 0.075 * math.sin(11 * th + 0.8 * math.sin(3 * th)) * (1 - t) ** 1.3)))
add(lathe("Belly", [(0.35, waistZ - 0.06), (0.38, 1.12), (0.41, 1.3)], robe, sy=0.86, bone="spine"))
add(tube("Sash", ring_path(0.375, waistZ, 48, 0.87), [0.035] * 2, rope, per=1, seg=10, bone="spine"))
add(tube("SashKnot", [(0.1, -0.33, waistZ), (0.14, -0.36, waistZ - 0.12), (0.12, -0.34, waistZ - 0.28)],
         [0.03, 0.026, 0.018], rope, seg=10, bone="spine"))
add(lathe("Chest", [(0.4, 1.27), (0.45, 1.4), (0.41, shZ), (0.2, neckZ + 0.02)], robe, sy=0.8, bone="chest"))
add(lathe("Mantle", [(0.55, 1.26), (0.53, 1.36), (0.47, 1.5), (0.3, neckZ + 0.03), (0.18, neckZ + 0.1)], mantle, seg=40,
          sy=0.86, cap_bottom=False, bone="chest",
          radial=lambda th, t, r: r * (1 + 0.09 * (1 - t) ** 2 * (0.5 + 0.5 * math.sin(7 * th) * math.sin(3 * th + 1)))))
# omen growths on the left shoulder
for i, (a, l) in enumerate(((20, 0.2), (55, 0.14), (-15, 0.11))):
    x0, y0 = 0.36 + 0.02 * i, 0.05 * i - 0.05
    add(tube(f"ShoulderHorn{i}", [(x0, y0, 1.5), (x0 + l * 0.6, y0 + 0.02, 1.5 + l * 0.7), (x0 + l * 0.7, y0 + 0.08, 1.5 + l)],
             [0.035, 0.022, 0.004], horn, seg=10, bone="chest"))

# ------------------------------------------------------------------ head: hood, face, beard, horns
head_parts = []


def hadd(o):
    head_parts.append(o)
    return add(o)


hadd(blob("Hood", (0.3, 0.31, 0.33), (0, 0.07, headZ + 0.06), mantle, bone="head",
          deform=lambda v: v + Vector((0, 0.06 * max(0, v.z) / 0.33, 0.04 * max(0, -v.y) / 0.31))))
hood_lip = [(math.cos(a) * 0.2, -0.2 - 0.03 * math.cos(a) ** 2, headZ + 0.02 + math.sin(a) * 0.26)
            for a in [i / 40 * 2 * math.pi for i in range(41)]]
hadd(tube("HoodLip", hood_lip, [0.045] * 2, mantle, per=1, seg=10, bone="head"))
hadd(blob("Face", (0.17, 0.16, 0.235), (0, -0.13, headZ - 0.03), skin_m, bone="head",
          deform=lambda v: v + Vector((0, -0.03 * max(0, -v.z) / 0.235, 0))))
hadd(tube("Nose", [(0, -0.27, headZ + 0.05), (0, -0.355, headZ - 0.04), (0, -0.345, headZ - 0.1), (0, -0.305, headZ - 0.1)],
          [0.03, 0.045, 0.04, 0.025], skin_m, seg=12, bone="head"))
for side, e, b in ((1, "eye_L", "brow_L"), (-1, "eye_R", "brow_R")):
    hadd(blob(f"Socket{e}", (0.06, 0.03, 0.035), (side * 0.075, -0.255, headZ + 0.035), mat("Socket", "#2a2420", rough=1),
              seg=16, rings=10, bone="head", rot=(0, side * 14, 0)))
    hadd(blob(f"Eye{e}", (0.045, 0.02, 0.018), (side * 0.075, -0.275, headZ + 0.035), eye_m, seg=16, rings=10, bone=e,
              rot=(0, side * 14, 0)))
    hadd(tube(f"Brow{b}", [(side * 0.02, -0.29, headZ + 0.085), (side * 0.09, -0.285, headZ + 0.1),
                           (side * 0.17, -0.24, headZ + 0.14)], [0.028, 0.034, 0.012], hair, seg=10, bone=b))
    hadd(tube(f"Moustache{side}", [(side * 0.01, -0.32, headZ - 0.1), (side * 0.08, -0.31, headZ - 0.12),
                                   (side * 0.14, -0.28, headZ - 0.2), (side * 0.15, -0.26, headZ - 0.3)],
              [0.026, 0.03, 0.02, 0.006], hair, seg=10, bone="head"))
# the beard: a waterfall of tapered strands
for i in range(9):
    u = (i / 8 - 0.5) * 2
    x0 = u * 0.12
    length = 0.5 - 0.18 * abs(u) + random.uniform(-0.04, 0.04)
    wob = random.uniform(-0.03, 0.03)
    hadd(tube(f"Beard{i}", [(x0, -0.24 + abs(u) * 0.06, headZ - 0.13), (x0 * 1.2 + wob, -0.32, headZ - 0.13 - length * 0.4),
                            (x0 * 1.1 - wob, -0.3, headZ - 0.13 - length * 0.8), (x0 * 0.9, -0.24, headZ - 0.13 - length)],
              [0.05, 0.055, 0.035, 0.004], hair, seg=10, bone="head"))
# long hair spilling out of the hood
for side in (1, -1):
    for i in range(2):
        x0 = side * (0.16 + 0.025 * i)
        hadd(tube(f"Hair{side}{i}", [(x0, -0.06 + 0.06 * i, headZ - 0.05), (x0 * 1.12, -0.04 + 0.06 * i, headZ - 0.25),
                                     (x0 * 1.18, 0.0 + 0.06 * i, headZ - 0.42 - 0.05 * i)],
                  [0.022, 0.02, 0.004], hair, seg=8, bone="head"))
# horns bursting from the hood
for name, pts, r in (
    ("HornL", [(0.14, 0.0, headZ + 0.3), (0.26, 0.02, headZ + 0.46), (0.36, 0.12, headZ + 0.5), (0.4, 0.22, headZ + 0.42)], 0.05),
    ("HornR", [(-0.18, 0.05, headZ + 0.26), (-0.3, 0.1, headZ + 0.38), (-0.36, 0.22, headZ + 0.36)], 0.042),
    ("HornBrow", [(0.1, -0.2, headZ + 0.2), (0.16, -0.26, headZ + 0.3), (0.2, -0.24, headZ + 0.36)], 0.025),
    ("HornBack", [(0.0, 0.3, headZ + 0.2), (0.02, 0.44, headZ + 0.26), (0.0, 0.52, headZ + 0.2)], 0.035),
):
    hadd(tube(name, pts, [r, r * 0.7, r * 0.35, 0.003][: len(pts)], horn, seg=12, bone="head"))

for o in head_parts:  # the big-head knob, scaled about the neck
    o.data.transform(Matrix.Translation((0, 0, neckZ)) @ Matrix.Scale(HS, 4) @ Matrix.Translation((0, 0, -neckZ)))

# ------------------------------------------------------------------ arms: bell sleeves and big ashen hands
for side, a, f, h in ((1, "arm_L", "forearm_L", "hand_L"), (-1, "arm_R", "forearm_R", "hand_R")):
    s0 = Vector((side * shX, 0, shZ))
    e = Vector((side * (shX + 0.04), 0, shZ - UA))
    w = Vector((side * (shX + 0.06), 0, shZ - UA - FA))
    add(tube(f"Sleeve{a}", [s0 + Vector((0, 0, 0.04)), e], [0.12, 0.11], robe, seg=16, bone=a))
    add(tube(f"Cuff{f}", [e + Vector((0, 0, 0.03)), w + Vector((0, 0, 0.02))], [0.105, 0.155], mantle, seg=18, bone=f))
    add(blob(f"Palm{h}", (0.075, 0.06, 0.09), (w.x, w.y - 0.01, w.z - 0.08), skin_m, seg=18, rings=12, bone=h))
    for k in range(3):  # curled fingers
        fx = w.x + side * (-0.035 + 0.035 * k)
        add(tube(f"Finger{h}{k}", [(fx, -0.04, w.z - 0.13), (fx, -0.08, w.z - 0.16), (fx, -0.06, w.z - 0.2)],
                 [0.022, 0.02, 0.016], skin_m, seg=8, bone=h))
    add(tube(f"Thumb{h}", [(w.x - side * 0.05, -0.04, w.z - 0.06), (w.x - side * 0.07, -0.09, w.z - 0.1)], [0.024, 0.018],
             skin_m, seg=8, bone=h))
# the pinky, extended with great dignity
wl = Vector((shX + 0.06, 0, shZ - UA - FA))
add(tube("Pinky", [(wl.x + 0.06, -0.02, wl.z - 0.12), (wl.x + 0.13, -0.03, wl.z - 0.14), (wl.x + 0.18, -0.03, wl.z - 0.12)],
         [0.02, 0.017, 0.013], skin_m, seg=8, bone="hand_L"))

# ------------------------------------------------------------------ legs (only seen when he sits) and wrapped feet
for side, l, f in ((1, "leg_L", "foot_L"), (-1, "leg_R", "foot_R")):
    add(tube(f"Leg{l}", [(side * 0.17, 0, hipZ), (side * 0.19, 0, 0.1)], [0.1, 0.08], boot, seg=14, bone=l))
    add(blob(f"Foot{f}", (0.1, 0.17, 0.075), (side * 0.19, -0.1, 0.07), boot, bone=f,
             deform=lambda v: Vector((v.x, v.y, max(v.z, -0.06)))))

# ------------------------------------------------------------------ rig
bones = [
    ("root", (0, 0, 0), (0, 0, 0.2), None),
    ("hips", (0, 0, hipZ), (0, 0, hipZ + 0.12), "root"),
    ("skirt", (0, 0, waistZ), (0, 0, 0.05), "hips"),
    ("spine", (0, 0, waistZ - 0.05), (0, 0, 1.3), "hips"),
    ("chest", (0, 0, 1.3), (0, 0, neckZ), "spine"),
    ("head", (0, 0, neckZ), (0, 0, neckZ + 0.5 * HS), "chest"),
    ("eye_L", (0.075 * HS, -0.26 * HS, neckZ + 0.255 * HS), (0.075 * HS, -0.33 * HS, neckZ + 0.255 * HS), "head"),
    ("eye_R", (-0.075 * HS, -0.26 * HS, neckZ + 0.255 * HS), (-0.075 * HS, -0.33 * HS, neckZ + 0.255 * HS), "head"),
    ("brow_L", (0.09 * HS, -0.28 * HS, neckZ + 0.32 * HS), (0.09 * HS, -0.36 * HS, neckZ + 0.32 * HS), "head"),
    ("brow_R", (-0.09 * HS, -0.28 * HS, neckZ + 0.32 * HS), (-0.09 * HS, -0.36 * HS, neckZ + 0.32 * HS), "head"),
]
for side, sfx in ((1, "L"), (-1, "R")):
    bones += [
        (f"arm_{sfx}", (side * shX, 0, shZ), (side * (shX + 0.04), 0, shZ - UA), "chest"),
        (f"forearm_{sfx}", (side * (shX + 0.04), 0, shZ - UA), (side * (shX + 0.06), 0, shZ - UA - FA), f"arm_{sfx}"),
        (f"hand_{sfx}", (side * (shX + 0.06), 0, shZ - UA - FA), (side * (shX + 0.06), 0, shZ - UA - FA - 0.14), f"forearm_{sfx}"),
        (f"leg_{sfx}", (side * 0.17, 0, hipZ), (side * 0.19, 0, 0.1), "hips"),
        (f"foot_{sfx}", (side * 0.19, 0, 0.1), (side * 0.19, -0.2, 0.05), f"leg_{sfx}"),
    ]
Sc = Matrix.Scale(S, 4)
for o in parts:
    o.data.transform(Sc)
bones = [(n, tuple(Vector(h) * S), tuple(Vector(t) * S), p) for n, h, t, p in bones]
rig = build_rig("MargitRig", bones)
body = skin(rig, parts, "Margit")

# ------------------------------------------------------------------ poses (armature axes, degrees)
A = dict


def merge(*ds):
    out = {}
    for d in ds:
        for k, v in d.items():
            out[k] = {**out.get(k, {}), **v}
    return out


def L(x, y, z):  # locations scale with the body
    return (x * S, y * S, z * S)


hunch = {"spine": A(r=(16, 0, 0)), "chest": A(r=(14, 0, 0)), "head": A(r=(-24, 0, 0)),
         "arm_L": A(r=(-30, 0, 0)), "arm_R": A(r=(-30, 0, 0))}
cup = {"arm_L": A(r=(-50, 0, 10)), "forearm_L": A(r=(-78, 0, -35)), "hand_L": A(r=(18, 0, 0))}
cane = {"arm_R": A(r=(-36, 0, -8)), "forearm_R": A(r=(-6, 0, 0)), "hand_R": A(r=(12, 0, 0))}
base = merge(hunch, cup, cane)
sip_up = {"arm_L": A(r=(-58, 0, 28)), "forearm_L": A(r=(-96, 0, -80)), "hand_L": A(r=(40, 0, 0)),
          "head": A(r=(-40, 0, 0)), "chest": A(r=(8, 0, 0))}
seated = {"hips": A(l=L(0, 0.05, -0.6)), "leg_L": A(r=(-82, 0, -8)), "leg_R": A(r=(-82, 0, 8)),
          "foot_L": A(r=(70, 0, 0)), "foot_R": A(r=(70, 0, 0)), "skirt": A(s=(1.22, 0.32, 1.22)),
          "spine": A(r=(10, 0, 0))}


def apply_pose(pose):
    clear_pose(rig)
    for bname, spec in pose.items():
        pb = rig.pose.bones[bname]
        from common import _loc_local, _to_local
        pb.rotation_quaternion = _to_local(rig, bname, spec.get("r", (0, 0, 0)))
        pb.location = _loc_local(rig, bname, spec.get("l", (0, 0, 0)))
        pb.scale = spec.get("s", (1, 1, 1))
    bpy.context.view_layer.update()


def rest_matrix_for(hand, pose, world_in_pose):
    """Where a prop must sit at rest so that, attached to `hand`, it lands at world_in_pose when posed."""
    apply_pose(pose)
    posed = rig.matrix_world @ rig.pose.bones[hand].matrix
    clear_pose(rig)
    bpy.context.view_layer.update()
    rest = rig.matrix_world @ rig.pose.bones[hand].matrix
    return rest @ posed.inverted() @ world_in_pose


def hand_tip(hand, pose, fwd=-0.05, down=0.1):
    apply_pose(pose)
    m = rig.matrix_world @ rig.pose.bones[hand].matrix
    p = m @ Vector((0, 0.09 * S, 0))  # along the bone into the palm
    clear_pose(rig)
    return p + Vector((0, fwd, 0))


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = objs[0]
    o.name = name
    o.data.name = name
    return o


def with_origin(o, origin_world, final_world):
    """Mesh built around origin_world; move origin to (0,0,0) then set its world matrix."""
    o.data.transform(Matrix.Translation(-Vector(origin_world)))
    o.matrix_world = final_world
    return o


# ------------------------------------------------------------------ props (loose objects the engine attaches or places)
def teacup(name):
    cup_body = lathe(name, [(0.0, 0.0), (0.035, 0.0), (0.05, 0.02), (0.065, 0.06), (0.072, 0.085), (0.068, 0.088),
                            (0.058, 0.06), (0.0, 0.03)], porcelain, seg=32, per=3, cap_top=False, cap_bottom=False)
    band = lathe(name + "Band", [(0.0655, 0.058), (0.0705, 0.07), (0.0725, 0.082)], blue, seg=32, per=1,
                 cap_top=False, cap_bottom=False)
    rim = tube(name + "Rim", ring_path(0.07, 0.087, 36), [0.004] * 2, gold, per=1, seg=6)
    handle = tube(name + "Handle", [(0.065, 0, 0.07), (0.1, 0, 0.075), (0.105, 0, 0.04), (0.066, 0, 0.025)],
                  [0.009, 0.01, 0.009, 0.008], porcelain, seg=8)
    tea = lathe(name + "Tea", [(0.0, 0.072), (0.063, 0.072)], mat("Tea", "#8a4a1c", rough=0.1), seg=32, per=1,
                cap_top=False, cap_bottom=False)
    return join([cup_body, band, rim, handle, tea], name)


cup_obj = teacup("Teacup")
for o in (cup_obj,):
    o.data.transform(Sc * 1.0)
cup_world = Matrix.Translation(hand_tip("hand_L", base, fwd=0.0) + Vector((0, 0, 0.02 * S)))
cup_obj.matrix_world = rest_matrix_for("hand_L", base, cup_world)

saucer = lathe("Saucer", [(0.0, 0.0), (0.06, 0.0), (0.11, 0.012), (0.115, 0.018), (0.1, 0.016), (0.0, 0.008)],
               porcelain, seg=36, per=2)
saucer_band = tube("SaucerRim", ring_path(0.112, 0.017, 36), [0.004] * 2, blue, per=1, seg=6)
saucer = join([saucer, saucer_band], "Saucer")
saucer.data.transform(Sc)
saucer.location = (1.5, 0, 0)

pot = [
    lathe("Teapot", [(0.0, 0.0), (0.08, 0.0), (0.13, 0.05), (0.14, 0.1), (0.12, 0.16), (0.07, 0.19), (0.0, 0.19)],
          porcelain, seg=36, per=3),
    lathe("PotBand", [(0.135, 0.07), (0.142, 0.1), (0.135, 0.13)], blue, seg=36, per=1, cap_top=False, cap_bottom=False),
    lathe("PotLid", [(0.075, 0.185), (0.07, 0.205), (0.03, 0.215), (0.0, 0.215)], blue, seg=24, per=2),
    blob("PotKnob", (0.022, 0.022, 0.02), (0, 0, 0.235), gold, seg=12, rings=8),
    tube("PotSpout", [(0.11, 0, 0.06), (0.18, 0, 0.1), (0.22, 0, 0.17), (0.25, 0, 0.19)], [0.028, 0.02, 0.014, 0.012],
         porcelain, seg=10),
    tube("PotHandle", [(-0.11, 0, 0.15), (-0.19, 0, 0.16), (-0.2, 0, 0.08), (-0.12, 0, 0.05)], [0.013] * 4, porcelain, seg=8),
]
teapot = join(pot, "Teapot")
teapot.data.transform(Sc)
low_cup = {"arm_L": A(r=(-34, 0, 20)), "forearm_L": A(r=(-58, 0, -48)), "hand_L": A(r=(8, 0, 0))}
pour_start = merge(base, seated, low_cup,
                   {"arm_R": A(r=(-104, 0, 30)), "forearm_R": A(r=(-18, 0, 0)), "hand_R": A(r=(0, 0, 0))})
# the pot hangs from its handle: handle in the palm, spout pointing at the cup (character's left, +X)
grip = hand_tip("hand_R", pour_start, fwd=0.0)
teapot.data.transform(Matrix.Translation((0.15 * S, 0, -0.12 * S)))
teapot.matrix_world = rest_matrix_for("hand_R", pour_start, Matrix.Translation(grip))

# the cane: planted by his right side at rest
cw = Vector((-(shX + 0.06) * S, -0.02 * S, (shZ - UA - FA - 0.09) * S))
cane_pts = [(0, 0, 0.16), (0.01, -0.01, 0.0), (-0.015, 0.005, -0.25), (0.02, -0.01, -0.5), (-0.01, 0.0, -0.75),
            (0.005, 0.01, -(cw.z / S) + 0.03)]
cane = join([
    tube("Cane", [tuple(Vector(p) * S) for p in cane_pts], [0.04 * S, 0.035 * S, 0.037 * S, 0.033 * S, 0.03 * S, 0.028 * S],
         cane_m, seg=10),
    blob("CaneKnob", (0.06 * S, 0.06 * S, 0.05 * S), (0, 0.0, 0.19 * S), cane_m, seg=14, rings=10),
    tube("CaneBand", [tuple(Vector((math.cos(a) * 0.043, math.sin(a) * 0.043, 0.07)) * S) for a in
                      [i / 24 * 2 * math.pi for i in range(25)]], [0.009 * S] * 2, gold, per=1, seg=6),
], "Cane")
cane.location = cw

# a lace doily, for sitting on people politely
doily = lathe("Doily", [(0.0, 0.0), (0.34, 0.0)], lace, seg=72, per=1, cap_top=False, cap_bottom=False,
              radial=lambda th, t, r: r * (1 + 0.08 * abs(math.sin(12 * th))) if t > 0.5 else r)
bm_s = doily.modifiers.new("solid", "SOLIDIFY")
bm_s.thickness = 0.008
bake(doily)
doily.data.transform(Sc)
doily.location = (-1.5, 0, 0)

clear_pose(rig)

# ------------------------------------------------------------------ clips
action(rig, "Idle", [
    (1, base),
    (31, merge(base, {"chest": A(r=(11, 0, 0)), "head": A(r=(-22, 0, 3)), "hips": A(l=L(0, 0, -0.01)),
                      "forearm_L": A(r=(-80, 0, -35))})),
    (61, base),
])
action(rig, "Sip", [
    (1, base),
    (12, merge(base, sip_up)),
    (16, merge(base, sip_up, {"hand_L": A(r=(55, 0, 0)), "head": A(r=(-46, 0, 0))})),
    (32, merge(base, sip_up, {"hand_L": A(r=(60, 0, 0)), "head": A(r=(-48, 0, 0))})),
    (46, base),
])
notice = merge(base, {"head": A(r=(-22, 0, -14)), "brow_R": A(l=L(0, 0, 0.035))})
action(rig, "Notice", [(1, base), (8, notice), (30, notice)])

windup = merge(base, {"arm_R": A(r=(-205, 0, -10)), "forearm_R": A(r=(-25, 0, 0)), "chest": A(r=(4, 0, 0)),
                      "spine": A(r=(10, 0, 8)), "head": A(r=(-18, 0, 8))})
slam = merge(base, {"arm_R": A(r=(-92, 0, 0)), "forearm_R": A(r=(-8, 0, 0)), "hand_R": A(r=(0, 0, 0)),
                    "spine": A(r=(28, 0, -6)), "chest": A(r=(18, 0, 0)), "head": A(r=(-34, 0, 4))})
action(rig, "Bonk", [(1, base), (9, windup), (13, slam),
                     (15, merge(slam, {"arm_R": A(r=(-84, 0, 0)), "spine": A(r=(30, 0, -6))})),
                     (34, merge(slam, {"spine": A(r=(24, 0, -4))}))], holds=())


def walk(s, up):
    return merge(base, {
        "hips": A(l=L(0, 0, 0.025 if up else -0.01), r=(0, 5 * s, 0)),
        "leg_L": A(r=(0 if up else -22 * s, 0, 0)), "leg_R": A(r=(0 if up else 22 * s, 0, 0)),
        "arm_R": A(r=(-36 - (0 if up else 18 * s), 0, -8)),
        "spine": A(r=(16, 0, -4 * s)), "head": A(r=(-24, 0, 3 * s)),
    })


action(rig, "Walk", [(1, walk(1, False)), (11, walk(1, True)), (21, walk(-1, False)), (31, walk(-1, True)),
                     (41, walk(1, False))])
reach = merge(base, {"arm_R": A(r=(-105, 0, 12)), "forearm_R": A(r=(-10, 0, 0)), "spine": A(r=(22, 0, 0))})
action(rig, "Reach", [(1, base), (14, reach), (22, reach), (36, merge(base, {"arm_R": A(r=(-20, 0, -5))}))])
sit_base = merge(base, seated, {"arm_R": A(r=(-20, 0, -5))})
action(rig, "Sit", [
    (1, merge(base, {"arm_R": A(r=(-20, 0, -5))})),
    (10, merge(base, {"hips": A(l=L(0, 0, -0.15)), "spine": A(r=(30, 0, 0)), "arm_R": A(r=(-20, 0, -5))})),
    (20, merge(sit_base, {"hips": A(l=L(0, 0.05, -0.64))})),
    (26, merge(sit_base, {"hips": A(l=L(0, 0.05, -0.58))})),
    (36, sit_base),
])
action(rig, "SitIdle", [(1, sit_base), (31, merge(sit_base, {"chest": A(r=(11, 0, 0)), "head": A(r=(-22, 0, -3))})),
                        (61, sit_base)])
bliss = {"eye_L": A(s=(1.1, 1, 0.12)), "eye_R": A(s=(1.1, 1, 0.12)), "brow_L": A(l=L(0, 0, 0.02)),
         "brow_R": A(l=L(0, 0, 0.02))}
action(rig, "SitSip", [
    (1, sit_base),
    (12, merge(sit_base, sip_up)),
    (18, merge(sit_base, sip_up, bliss, {"hand_L": A(r=(55, 0, 0)), "head": A(r=(-48, 0, 0))})),
    (50, merge(sit_base, sip_up, bliss, {"hand_L": A(r=(60, 0, 0)), "head": A(r=(-50, 0, 0))})),
    (64, merge(sit_base, bliss)),
    (80, sit_base),
])
pour = merge(pour_start, {"hand_R": A(r=(0, 55, 0)), "forearm_R": A(r=(-22, 0, 14))})
action(rig, "Pour", [(1, merge(sit_base, {"arm_R": A(r=(-20, 0, -5))})), (12, pour_start), (22, pour), (48, pour),
                     (60, pour_start)])

clear_pose(rig)
bpy.context.scene.frame_set(1)
export(OUT)

if PREVIEW:
    root_p, ext = os.path.splitext(PREVIEW)
    # attach the props for the preview only
    for obj, bone in ((cup_obj, "hand_L"), (cane, "hand_R"), (teapot, "hand_R")):
        mw = obj.matrix_world.copy()
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = bone
        bpy.context.view_layer.update()
        obj.matrix_world = mw
    shots = (("Rest", 1, -35), ("Idle", 1, -35), ("Sip", 20, -60), ("Bonk", 9, -80), ("Bonk", 15, -80), ("SitSip", 30, -30), ("Pour", 30, -20))
    for clip, frame, az in shots:
        for tr in rig.animation_data.nla_tracks:
            tr.mute = tr.name != clip
        teapot.hide_render = clip != "Pour"
        preview(f"{root_p}_{clip}{frame}{ext}", target=(0, 0, 1.05 * S), dist=5.2 * S, frame=frame, az=az)
