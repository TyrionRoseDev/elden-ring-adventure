"""PROTOTYPE: the Tarnished, built headless. Usage:
blender -b --factory-startup --python-exit-code 1 --python tarnished.py -- <A|B|C> <out.glb> [preview.png]
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

# Proportions per look variant: A chibi (2 heads tall), B clay (2.6 heads), C storybook (3.6 heads)
P = {
    "A": dict(hr=0.29, torso=0.27, tw=0.36, leg=0.15, arm=0.25, blade=0.46, cape=0.30),
    "B": dict(hr=0.25, torso=0.31, tw=0.34, leg=0.21, arm=0.29, blade=0.52, cape=0.38),
    "C": dict(hr=0.185, torso=0.40, tw=0.33, leg=0.36, arm=0.40, blade=0.62, cape=0.55),
}[VARIANT]
random.seed(7)
reset()

hr, T, tw, LEG, ARM = P["hr"], P["torso"], P["tw"], P["leg"], P["arm"]
FOOT = 0.07
hipZ = FOOT + LEG + 0.05
chestTop = hipZ + T
headZ = chestTop + hr * 0.82
shZ = chestTop - 0.05
shX = tw * 0.5 + 0.035
legX = tw * 0.22

steel = mat("Steel", "#b4bcc6", rough=0.32, metal=0.7)
dark_steel = mat("DarkSteel", "#5a616b", rough=0.45, metal=0.6)
visor = mat("Visor", "#15161c", rough=0.6)
eye = mat("EyeGlow", "#fff4c8", rough=0.4, emit="#fff1b8", strength=2.5)
tabard = mat("Tabard", "#2f4f8a", rough=0.85)
gold = mat("Gold", "#d9a93b", rough=0.3, metal=0.9)
leather = mat("Leather", "#6a4426", rough=0.8)
trousers = mat("Trousers", "#3b3631", rough=0.9)
cape_m = mat("Cape", "#8e2f2a", rough=0.9)
plume = mat("Plume", "#c23a2e", rough=0.85)
wood = mat("Wood", "#8a5b33", rough=0.8)
mail = mat("Chainmail", "#7c848e", rough=0.55, metal=0.5)

parts = []


def add(o):
    parts.append(o)
    return o


# ------------------------------------------------------------------ head
add(blob("Helmet", (hr, hr * 0.97, hr * 1.04), (0, 0, headZ), steel, bone="head",
         deform=lambda v: v + Vector((0, 0, 0.06 * hr * max(0, -v.y / hr)))))
add(blob("Visor", (hr * 0.78, hr * 0.32, hr * 0.2), (0, -hr * 0.73, headZ - hr * 0.02), visor, bone="head"))
for side, bname in ((1, "eye_L"), (-1, "eye_R")):
    add(blob(f"Eye{bname}", (hr * 0.12, hr * 0.06, hr * 0.13), (side * hr * 0.3, -hr * 1.0, headZ - hr * 0.01), eye, bone=bname))
# rim band and crest
ring = [(math.cos(a) * hr * 0.93, math.sin(a) * hr * 0.9, headZ - hr * 0.42) for a in [i / 40 * 2 * math.pi for i in range(41)]]
add(tube("HelmetRim", ring, [hr * 0.07] * 2, gold, per=1, seg=10, bone="head"))
add(tube("Crest", [(0, -hr * 0.9, headZ + hr * 0.2), (0, -hr * 0.5, headZ + hr * 0.9), (0, hr * 0.2, headZ + hr * 1.08),
                   (0, hr * 0.8, headZ + hr * 0.75)], [hr * 0.06, hr * 0.09, hr * 0.09, hr * 0.05], gold, seg=10, bone="head", flat=0.5))
add(tube("Plume", [(0, -hr * 0.1, headZ + hr * 1.0), (0, hr * 0.5, headZ + hr * 1.45), (0, hr * 1.25, headZ + hr * 1.3),
                   (0, hr * 1.6, headZ + hr * 0.75)], [hr * 0.16, hr * 0.2, hr * 0.13, hr * 0.03], plume, seg=12, bone="head"))
for side in (1, -1):  # little breathing holes, because helmets
    add(blob("Rivet", (hr * 0.05,) * 3, (side * hr * 0.72, -hr * 0.62, headZ + hr * 0.25), gold, seg=10, rings=6, bone="head"))

# ------------------------------------------------------------------ torso
add(lathe("Gorget", [(tw * 0.2, chestTop - 0.03), (tw * 0.24, chestTop + 0.02), (tw * 0.16, chestTop + 0.06)], dark_steel,
          sy=0.9, bone="spine"))
add(lathe("Torso", [(tw * 0.40, hipZ), (tw * 0.5, hipZ + T * 0.45), (tw * 0.49, hipZ + T * 0.8), (tw * 0.3, chestTop)],
          tabard, sy=0.82, bone="spine"))
add(lathe("Skirt", [(tw * 0.47, hipZ - 0.07 - LEG * 0.25), (tw * 0.46, hipZ - 0.02), (tw * 0.41, hipZ + 0.04)], mail,
          sy=0.85, cap_top=False, bone="hips",
          radial=lambda th, t, r: r * (1 + 0.05 * math.sin(th * 10) * (1 - t))))
add(lathe("Belt", [(tw * 0.43, hipZ + 0.03), (tw * 0.445, hipZ + 0.06), (tw * 0.43, hipZ + 0.09)], leather, sy=0.84,
          per=1, bone="spine"))
add(rbox("Buckle", (0.07, 0.03, 0.06), (0, -tw * 0.37, hipZ + 0.06), gold, bone="spine"))
add(tube("TrimTop", [(math.cos(a) * tw * 0.33, math.sin(a) * tw * 0.33 * 0.82, chestTop - 0.012) for a in
                     [i / 36 * 2 * math.pi for i in range(37)]], [0.014] * 2, gold, per=1, seg=8, bone="spine"))
# heraldic emblem: a little golden tree, because of course
add(tube("EmblemTrunk", [(0, -tw * 0.415, hipZ + T * 0.28), (0, -tw * 0.43, hipZ + T * 0.6)], [0.018, 0.012], gold, seg=8, bone="spine"))
add(blob("EmblemCrown", (0.06, 0.02, 0.045), (0, -tw * 0.425, hipZ + T * 0.66), gold, seg=14, rings=8, bone="spine"))

# pauldrons
for side, b in ((1, "arm_L"), (-1, "arm_R")):
    add(blob(f"Pauldron{b}", (0.1 + tw * 0.08, 0.1 + tw * 0.07, 0.075), (side * (shX - 0.005), 0, shZ + 0.02), steel, bone=b,
             deform=lambda v: Vector((v.x, v.y, max(v.z, -0.02)))))
    add(tube(f"PauldronTrim{b}", [(side * (shX + 0.02 + 0.1 * math.cos(a)), 0.1 * math.sin(a) * 1.0, shZ - 0.0)
                                   for a in [i / 30 * 2 * math.pi for i in range(31)]], [0.012] * 2, gold, per=1, seg=6, bone=b))

# ------------------------------------------------------------------ arms and hands
for side, a, h in ((1, "arm_L", "hand_L"), (-1, "arm_R", "hand_R")):
    add(tube(f"Arm{a}", [(side * shX, 0, shZ), (side * (shX + 0.015), 0, shZ - ARM)], [0.05, 0.043], mail, bone=a))
    add(lathe(f"Bracer{a}", [(0.05, shZ - ARM * 0.95), (0.058, shZ - ARM * 0.6), (0.048, shZ - ARM * 0.45)], leather,
              center=(side * (shX + 0.012), 0, 0), per=1, bone=a))
    add(blob(f"Gauntlet{h}", (0.068, 0.07, 0.066), (side * (shX + 0.02), -0.005, shZ - ARM - 0.045), steel, bone=h))
    add(blob(f"Thumb{h}", (0.024, 0.024, 0.035), (side * (shX - 0.03), -0.045, shZ - ARM - 0.03), steel, seg=12, rings=8, bone=h))

# shield on the left forearm, facing outwards
sh_r = 0.11 + hr * 0.35
shield = [
    lathe("ShieldWood", [(sh_r, -0.02), (sh_r, 0.0), (sh_r * 0.9, 0.025), (0.0, 0.035)], wood, seg=36, per=1, bone="hand_L"),
    lathe("ShieldRim", [(sh_r * 0.99, -0.025), (sh_r * 1.06, 0.0), (sh_r * 0.99, 0.03)], dark_steel, seg=36, per=1,
          cap_top=False, cap_bottom=False, bone="hand_L"),
    blob("ShieldBoss", (sh_r * 0.28, sh_r * 0.28, sh_r * 0.2), (0, 0, 0.035), steel, seg=18, rings=10, bone="hand_L"),
]
for s in shield:
    place(s, loc=(shX + 0.1, -0.02, shZ - ARM * 0.7), rot=(0, 90, 0))
    add(s)

# ------------------------------------------------------------------ legs and boots
for side, l, f in ((1, "leg_L", "foot_L"), (-1, "leg_R", "foot_R")):
    add(tube(f"Leg{l}", [(side * legX, 0, hipZ), (side * legX, 0, FOOT)], [0.062, 0.052], trousers, bone=l))
    add(rbox(f"Boot{f}", (0.12, 0.19, FOOT + 0.03), (side * legX, -0.035, (FOOT + 0.03) / 2), leather, bevel=0.7, bone=f,
             deform=lambda v: Vector((v.x, v.y, v.z + (0.02 if v.y > 0 and v.z > 0 else 0)))))
    add(lathe(f"BootCuff{f}", [(0.066, FOOT + 0.02), (0.07, FOOT + 0.05), (0.064, FOOT + 0.07)], leather,
              center=(side * legX, 0, 0), per=1, bone=l))

# ------------------------------------------------------------------ tattered cape
cw, ch = tw * 1.15, P["cape"] + T * 0.4
top = chestTop - 0.01


def cape_fn(u, v):
    x = (u - 0.5) * cw * (1 + 0.25 * (1 - v))
    y = tw * 0.36 + 0.03 + (1 - v) * 0.1 + 0.05 * (1 - (2 * u - 1) ** 2)  # wraps round the back, flares at hem
    z = top - (1 - v) * ch
    # tattered hem: bite chunks out of the bottom rows
    if v < 0.22 and random.random() < 0.35 * (1 - v / 0.22):
        return None
    return Vector((x, y, z))


add(sheet("Cape", cw, ch, cape_m, nx=18, ny=12, fn=cape_fn, thickness=0.018, bone="cape"))

# ------------------------------------------------------------------ rig
bones = [
    ("root", (0, 0, 0), (0, 0, 0.1), None),
    ("hips", (0, 0, hipZ - 0.05), (0, 0, hipZ + 0.05), "root"),
    ("spine", (0, 0, hipZ + 0.02), (0, 0, chestTop), "hips"),
    ("head", (0, 0, chestTop), (0, 0, chestTop + hr * 2), "spine"),
    ("eye_L", (hr * 0.3, -hr * 0.95, headZ), (hr * 0.3, -hr * 1.1, headZ), "head"),
    ("eye_R", (-hr * 0.3, -hr * 0.95, headZ), (-hr * 0.3, -hr * 1.1, headZ), "head"),
    ("cape", (0, tw * 0.4, top), (0, tw * 0.45, top - ch), "spine"),
    ("arm_L", (shX, 0, shZ), (shX + 0.015, 0, shZ - ARM), "spine"),
    ("hand_L", (shX + 0.015, 0, shZ - ARM), (shX + 0.02, 0, shZ - ARM - 0.1), "arm_L"),
    ("arm_R", (-shX, 0, shZ), (-shX - 0.015, 0, shZ - ARM), "spine"),
    ("hand_R", (-shX - 0.015, 0, shZ - ARM), (-shX - 0.02, 0, shZ - ARM - 0.1), "arm_R"),
    ("leg_L", (legX, 0, hipZ), (legX, 0, FOOT), "hips"),
    ("foot_L", (legX, 0, FOOT), (legX, -0.12, FOOT * 0.4), "leg_L"),
    ("leg_R", (-legX, 0, hipZ), (-legX, 0, FOOT), "hips"),
    ("foot_R", (-legX, 0, FOOT), (-legX, -0.12, FOOT * 0.4), "leg_R"),
]
rig = build_rig("TarnishedRig", bones)
body = skin(rig, parts, "Tarnished")

# ------------------------------------------------------------------ the sword (loose: the engine attaches it to hand_R)
hx, hz = -(shX + 0.02), shZ - ARM - 0.045
BL = P["blade"]
sword_parts = [
    tube("Grip", [(hx, 0.07, hz), (hx, -0.04, hz)], [0.02, 0.02], leather, seg=10),
    rbox("Guard", (0.2 + BL * 0.1, 0.035, 0.04), (hx, -0.06, hz), gold, bevel=0.6),
    blob("Pommel", (0.03, 0.03, 0.03), (hx, 0.085, hz), gold, seg=12, rings=8),
    rbox("Blade", (0.022, BL, 0.075), (hx, -0.07 - BL / 2, hz), steel, bevel=0.5, segments=2,
         deform=lambda v: Vector((v.x, v.y, v.z * (1 - max(0, (-v.y - BL * 0.3) / (BL * 0.2))) if v.y < -BL * 0.3 else v.z))),
    rbox("Fuller", (0.026, BL * 0.7, 0.018), (hx, -0.09 - BL * 0.35, hz), dark_steel, bevel=0.5, segments=1),
]
bpy.ops.object.select_all(action="DESELECT")
for o in sword_parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = sword_parts[0]
bpy.ops.object.join()
sword = sword_parts[0]
sword.name = "Sword"
# origin at the grip so it spins nicely when flung
sword.data.transform(Matrix.Translation((-hx, 0, -hz)))
sword.location = (hx, 0, hz)

# ------------------------------------------------------------------ clips (30 fps; rotations in armature axes)
A = dict  # readability


def merge(*ds):
    out = {}
    for d in ds:
        for k, v in d.items():
            out[k] = {**out.get(k, {}), **v}
    return out


rest_arms = {"arm_L": A(r=(0, 0, 0)), "arm_R": A(r=(0, 0, 0))}
# sword arm held slightly forward so the blade reads
guard = {"arm_R": A(r=(-25, 0, 0)), "hand_R": A(r=(-10, 0, 0)), "arm_L": A(r=(-15, -12, 0))}

action(rig, "Idle", [
    (1, merge(guard, {"spine": A(r=(0, 0, 0)), "head": A(r=(0, 0, 0))})),
    (31, merge(guard, {"hips": A(l=(0, 0, -0.012)), "spine": A(r=(3, 0, 0)), "head": A(r=(-4, 0, 3)),
                       "arm_R": A(r=(-28, 0, 0)), "arm_L": A(r=(-12, -14, 0)), "cape": A(r=(4, 0, 0))})),
    (61, merge(guard, {"spine": A(r=(0, 0, 0)), "head": A(r=(0, 0, 0))})),
])


def walk_pose(phase, up):
    s = 1 if phase == 0 else -1
    return {
        "hips": A(l=(0, 0, 0.03 if up else -0.01), r=(0, 0, 8 * s)),
        "spine": A(r=(-6, 0, -10 * s)),  # chest out, swagger twist
        "head": A(r=(-8, 0, 6 * s)),
        "leg_L": A(r=(-32 * s if not up else 0, 0, 0)),
        "leg_R": A(r=(32 * s if not up else 0, 0, 0)),
        "foot_L": A(r=(20 * s if not up else 0, 0, 0)),
        "foot_R": A(r=(-20 * s if not up else 0, 0, 0)),
        "arm_L": A(r=(35 * s if not up else 0, -18, 0)),
        "arm_R": A(r=(-35 * s - 20 if not up else -20, 0, 0)),
        "cape": A(r=(12 if not up else 6, 0, 0)),
    }


action(rig, "Walk", [(1, walk_pose(0, False)), (7, walk_pose(0, True)), (13, walk_pose(1, False)),
                     (19, walk_pose(1, True)), (25, walk_pose(0, False))])


def run_pose(phase, up):
    s = 1 if phase == 0 else -1
    return {
        "hips": A(l=(0, 0, 0.05 if up else -0.02)),
        "spine": A(r=(16, 0, -8 * s)),
        "head": A(r=(-18, 0, 0)),
        "leg_L": A(r=(-50 * s if not up else -10 * s, 0, 0)),
        "leg_R": A(r=(50 * s if not up else 10 * s, 0, 0)),
        "arm_L": A(r=(-40, -25, 0)),
        "arm_R": A(r=(-150, 0, 10)),  # sword up, charging
        "hand_R": A(r=(105, 0, 0)),
        "cape": A(r=(45 if not up else 38, 0, 0)),
    }


action(rig, "Run", [(1, run_pose(0, False)), (5, run_pose(0, True)), (9, run_pose(1, False)),
                    (13, run_pose(1, True)), (17, run_pose(0, False))])

hero = {
    "spine": A(r=(-10, 0, 0)), "head": A(r=(-14, 0, -8)),
    "arm_R": A(r=(-172, 0, -12)), "hand_R": A(r=(82, 0, 0)),
    "arm_L": A(r=(0, -40, 0)), "hand_L": A(r=(0, 0, 0)),
    "leg_L": A(r=(0, -12, 0)), "leg_R": A(r=(0, 12, 0)), "cape": A(r=(22, 0, 0)),
}
action(rig, "Pose", [
    (1, guard),
    (6, merge(hero, {"hips": A(l=(0, 0, -0.03)), "arm_R": A(r=(-120, 0, 0))})),
    (12, merge(hero, {"hips": A(l=(0, 0, 0.012))})),
    (16, hero),
    (40, merge(hero, {"spine": A(r=(-12, 0, 0)), "cape": A(r=(28, 0, 0))})),
])

crouch = {"hips": A(l=(0, 0, -0.07)), "spine": A(r=(28, 0, 0)), "head": A(r=(-20, 0, 0)),
          "leg_L": A(r=(-35, 0, 0)), "leg_R": A(r=(-35, 0, 0)), "foot_L": A(r=(35, 0, 0)), "foot_R": A(r=(35, 0, 0)),
          "arm_R": A(r=(-60, 0, 0)), "arm_L": A(r=(30, -20, 0))}
leap = {"spine": A(r=(-18, 0, 0)), "head": A(r=(-10, 0, 0)),
        "arm_R": A(r=(-200, 0, -10)), "hand_R": A(r=(65, 0, 0)), "arm_L": A(r=(-60, -50, 0)),
        "leg_L": A(r=(-60, 0, 0)), "leg_R": A(r=(25, 0, 0)), "foot_L": A(r=(30, 0, 0)), "cape": A(r=(60, 0, 0))}
action(rig, "Jump", [(1, guard), (6, crouch), (10, merge(leap, {"arm_R": A(r=(-160, 0, 0)), "hand_R": A(r=(40, 0, 0))})), (16, leap),
                     (30, merge(leap, {"spine": A(r=(-22, 0, 0)), "cape": A(r=(70, 0, 0))}))])

flail = {"arm_L": A(r=(-160, -40, 0)), "arm_R": A(r=(-150, 40, 0)), "leg_L": A(r=(-40, -20, 0)), "leg_R": A(r=(30, 20, 0)),
         "head": A(r=(15, 0, 0)), "cape": A(r=(80, 0, 0))}
flail2 = {"arm_L": A(r=(-110, -70, 0)), "arm_R": A(r=(-190, 70, 0)), "leg_L": A(r=(30, 20, 0)), "leg_R": A(r=(-40, -20, 0)),
          "head": A(r=(-15, 0, 0)), "cape": A(r=(70, 0, 0))}
action(rig, "Flail", [(1, flail), (4, flail2), (7, flail)])

gulp = {"spine": A(r=(10, 0, 0)), "head": A(r=(-6, 0, 0)), "arm_R": A(r=(-15, 0, -8)), "arm_L": A(r=(-20, 15, 0)),
        "leg_L": A(r=(0, 6, 0)), "leg_R": A(r=(0, -6, 0))}
action(rig, "Gulp", [(1, hero), (5, merge(gulp, {"hips": A(l=(0, 0, 0.03))})), (10, gulp),
                     (30, merge(gulp, {"head": A(r=(-2, 0, 0))}))])

clear_pose(rig)
bpy.context.scene.frame_set(1)
export(OUT)

if PREVIEW:
    root, ext = os.path.splitext(PREVIEW)
    # render one frame per clip by soloing its NLA track
    for tr in rig.animation_data.nla_tracks:
        tr.mute = True
    for clip, frame in (("Rest", None), ("Walk", 1), ("Pose", 40), ("Jump", 16)):
        for tr in rig.animation_data.nla_tracks:
            tr.mute = tr.name != clip
        preview(f"{root}_{clip}{ext}", target=(0, 0, headZ * 0.55), dist=headZ * 3.2 + 0.8, frame=frame or 1)
