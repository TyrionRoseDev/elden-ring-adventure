"""PROTOTYPE helpers for agent-scripted characters (Blender 5.2, headless).

Characters are built as rigid parts (each part 100% weighted to one bone), joined into one
skinned mesh, then posed with Actions keyed in *armature axes* so poses read intuitively:
the character faces -Y, +X is the character's left, +Z is up.
"""

import math
import os
import sys

import bmesh
import bpy
from bpy_extras import anim_utils
from mathutils import Euler, Matrix, Quaternion, Vector


def argv():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 30
    return scene


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


# ---------------------------------------------------------------- materials


def srgb(hex_str):
    h = hex_str.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


_MATS = {}


def mat(name, hex_color, rough=0.75, metal=0.0, emit=None, strength=1.0):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(hex_color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = srgb(emit)
        b.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = srgb(hex_color)
    _MATS[name] = m
    return m


# ---------------------------------------------------------------- mesh building


def _finish(name, bm, material, smooth=True, subdiv=0, bone=None, solidify=0.0):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    o = link(bpy.data.objects.new(name, me))
    me.materials.append(material)
    if solidify:
        s = o.modifiers.new("solid", "SOLIDIFY")
        s.thickness = solidify
        s.offset = 0
    if subdiv:
        s = o.modifiers.new("sub", "SUBSURF")
        s.levels = subdiv
        s.render_levels = subdiv
    if o.modifiers:
        bake(o)
    if bone:
        o["bone"] = bone
    return o


def bake(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear()
    old = o.data
    o.data = me
    bpy.data.meshes.remove(old)
    for p in me.polygons:
        p.use_smooth = True


def catmull(points, per=6, closed=False):
    """Smooth a list of Vectors/tuples with Catmull-Rom."""
    pts = [Vector(p) for p in points]
    if len(pts) < 3:
        return pts
    out = []
    n = len(pts)
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed or i > 0 else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if closed or i + 2 < n else pts[min(i + 2, n - 1)]
        for s in range(per):
            t = s / per
            t2, t3 = t * t, t * t * t
            out.append(
                0.5
                * (
                    (2 * p1)
                    + (-p0 + p2) * t
                    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
                )
            )
    if not closed:
        out.append(pts[-1])
    return out


def lathe(name, profile, material, seg=32, center=(0, 0, 0), sx=1.0, sy=1.0, per=4,
          radial=None, bone=None, cap_top=True, cap_bottom=True, subdiv=0, smooth=True):
    """Surface of revolution around Z. profile: [(radius, z), ...] bottom to top.
    radial(theta, t, r) -> r lets folds/waves modulate the radius (t = 0 bottom .. 1 top)."""
    prof = catmull([(r, z, 0) for r, z in profile], per=per) if per > 1 else [Vector((r, z, 0)) for r, z in profile]
    bm = bmesh.new()
    rings = []
    cx, cy, cz = center
    for i, p in enumerate(prof):
        t = i / (len(prof) - 1)
        ring = []
        for j in range(seg):
            th = 2 * math.pi * j / seg
            r = max(p.x, 0.0)
            if radial:
                r = radial(th, t, r)
            ring.append(bm.verts.new((cx + math.cos(th) * r * sx, cy + math.sin(th) * r * sy, cz + p.y)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for j in range(seg):
            bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
    if cap_bottom:
        c = bm.verts.new((cx, cy, cz + prof[0].y))
        for j in range(seg):
            bm.faces.new((rings[0][(j + 1) % seg], rings[0][j], c))
    if cap_top:
        c = bm.verts.new((cx, cy, cz + prof[-1].y))
        for j in range(seg):
            bm.faces.new((rings[-1][j], rings[-1][(j + 1) % seg], c))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(name, bm, material, smooth=smooth, subdiv=subdiv, bone=bone)


def blob(name, radii, center, material, seg=28, rings=18, bone=None, deform=None, rot=None):
    """Ellipsoid. deform(v: Vector) -> Vector runs in local space before placement."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    rx, ry, rz = radii
    R = Euler([math.radians(a) for a in rot]).to_matrix() if rot else Matrix.Identity(3)
    for v in bm.verts:
        co = Vector((v.co.x * rx, v.co.y * ry, v.co.z * rz))
        if deform:
            co = deform(co)
        v.co = R @ co + Vector(center)
    return _finish(name, bm, material, bone=bone)


def tube(name, path, radii, material, seg=14, per=5, bone=None, cap=True, flat=1.0, smooth=True):
    """Sweep a circle along a smoothed path. radii: one per path point (interpolated).
    flat < 1 squashes the cross-section along the frame's second axis (ribbons, blades)."""
    pts = catmull(path, per=per) if len(path) > 2 else [Vector(p) for p in path]
    if len(path) == 2:
        a, b = Vector(path[0]), Vector(path[1])
        pts = [a.lerp(b, i / (per * 2)) for i in range(per * 2 + 1)]
    # interpolate radii along the smoothed path
    rs = []
    for i in range(len(pts)):
        u = i / (len(pts) - 1) * (len(radii) - 1)
        k = min(int(u), len(radii) - 2)
        f = u - k
        rs.append(radii[k] * (1 - f) + radii[k + 1] * f)
    bm = bmesh.new()
    rings = []
    # parallel transport frame
    tan = (pts[1] - pts[0]).normalized()
    ref = Vector((0, 0, 1)) if abs(tan.z) < 0.9 else Vector((1, 0, 0))
    nrm = tan.cross(ref).normalized()
    for i, p in enumerate(pts):
        if i > 0:
            nt = (pts[i] - pts[i - 1]).normalized() if i == len(pts) - 1 else (pts[i + 1] - pts[i - 1]).normalized()
            axis = tan.cross(nt)
            if axis.length > 1e-6:
                ang = tan.angle(nt)
                nrm = Matrix.Rotation(ang, 3, axis.normalized()) @ nrm
            tan = nt
        bin_ = tan.cross(nrm).normalized()
        ring = []
        for j in range(seg):
            th = 2 * math.pi * j / seg
            off = nrm * math.cos(th) * rs[i] + bin_ * math.sin(th) * rs[i] * flat
            ring.append(bm.verts.new(p + off))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for j in range(seg):
            bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
    if cap:
        for ring, p, flip in ((rings[0], pts[0], True), (rings[-1], pts[-1], False)):
            c = bm.verts.new(p)
            for j in range(seg):
                f = (ring[(j + 1) % seg], ring[j], c) if flip else (ring[j], ring[(j + 1) % seg], c)
                bm.faces.new(f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish(name, bm, material, smooth=smooth, bone=bone)


def rbox(name, size, center, material, bevel=0.3, segments=3, bone=None, deform=None, rot=None):
    """Rounded box. bevel is a fraction of the smallest half-extent."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = size
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    off = min(size) * 0.5 * bevel
    if off > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=off, segments=segments,
                        profile=0.5, affect="EDGES", clamp_overlap=True)
    R = Euler([math.radians(a) for a in rot]).to_matrix() if rot else Matrix.Identity(3)
    for v in bm.verts:
        co = v.co.copy()
        if deform:
            co = deform(co)
        v.co = R @ co + Vector(center)
    return _finish(name, bm, material, bone=bone)


def sheet(name, w, h, material, nx=16, ny=10, fn=None, thickness=0.02, bone=None, subdiv=0):
    """A grid in XZ (facing -Y) from u,v in [0,1]; fn(u, v) -> Vector or None (None deletes)."""
    bm = bmesh.new()
    grid = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            u, v = i / nx, j / ny
            p = fn(u, v) if fn else Vector(((u - 0.5) * w, 0, v * h))
            grid[i, j] = bm.verts.new(p) if p is not None else None
    for i in range(nx):
        for j in range(ny):
            q = (grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1])
            if all(q):
                bm.faces.new(q)
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    return _finish(name, bm, material, bone=bone, solidify=thickness, subdiv=subdiv)


def place(o, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Apply a transform into the mesh data (keeps objects at identity)."""
    M = Matrix.LocRotScale(Vector(loc), Euler([math.radians(a) for a in rot]), Vector(scale))
    o.data.transform(M)
    return o


def mirror_x(o, name, bone=None):
    me = o.data.copy()
    me.transform(Matrix.Scale(-1, 4, (1, 0, 0)))
    me.flip_normals()
    c = link(bpy.data.objects.new(name, me))
    if bone:
        c["bone"] = bone
    return c


# ---------------------------------------------------------------- rigging


def build_rig(name, bones):
    """bones: [(name, head, tail, parent_or_None)] in armature space."""
    arm = bpy.data.armatures.new(name)
    rig = link(bpy.data.objects.new(name, arm))
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for bname, head, tail, parent in bones:
        b = arm.edit_bones.new(bname)
        b.head, b.tail = head, tail
        b.roll = 0
        if parent:
            b.parent = arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    return rig


def skin(rig, parts, name):
    """Join rigid parts (each tagged with obj['bone']) into one skinned mesh."""
    for o in parts:
        vg = o.vertex_groups.new(name=o["bone"])
        vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = parts[0]
    body.name = name
    body.data.name = name
    body.parent = rig
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    return body


def _to_local(rig, bname, rot_deg):
    """Rotation given as XYZ degrees about *armature* axes -> bone-local quaternion."""
    B = rig.data.bones[bname].matrix_local.to_3x3()
    R = Euler([math.radians(a) for a in rot_deg], "XYZ").to_matrix()
    return (B.inverted() @ R @ B).to_quaternion()


def _loc_local(rig, bname, loc):
    B = rig.data.bones[bname].matrix_local.to_3x3()
    return B.inverted() @ Vector(loc)


def action(rig, name, keys, interp="BEZIER", holds=()):
    """keys: [(frame, {bone: {'r': (x,y,z) deg, 'l': (x,y,z), 's': (x,y,z)}})].
    Every bone is keyed at every key (missing = rest) so clips never leak into each other."""
    ad = rig.animation_data or rig.animation_data_create()
    act = bpy.data.actions.new(name)
    ad.action = act
    if ad.action_slot is None:
        ad.action_slot = act.slots.new(id_type="OBJECT", name=rig.name)
    prev = {}
    for frame, pose in keys:
        for pb in rig.pose.bones:
            spec = pose.get(pb.name, {})
            q = _to_local(rig, pb.name, spec.get("r", (0, 0, 0)))
            if pb.name in prev and prev[pb.name].dot(q) < 0:
                q.negate()
            prev[pb.name] = q
            pb.rotation_quaternion = q
            pb.location = _loc_local(rig, pb.name, spec.get("l", (0, 0, 0)))
            pb.scale = spec.get("s", (1, 1, 1))
            pb.keyframe_insert("rotation_quaternion", frame=frame)
            pb.keyframe_insert("location", frame=frame)
            pb.keyframe_insert("scale", frame=frame)
    cb = anim_utils.action_get_channelbag_for_slot(act, ad.action_slot)
    for fc in cb.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "CONSTANT" if int(kp.co.x) in holds else interp
            kp.easing = "AUTO"
    track = ad.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(keys[0][0]), act)
    track.mute = True
    ad.action = None
    return act


def clear_pose(rig):
    for pb in rig.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)


# ---------------------------------------------------------------- output


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_influence_nb=4,
        export_materials="EXPORT",
        export_yup=True,
        export_extras=True,
    )


def preview(path, target=(0, 0, 0.6), dist=4.0, res=512, az=-35, el=12, frame=None, lens=50):
    """Quick Eevee render so the agent can see what it built."""
    scene = bpy.context.scene
    if frame is not None:
        scene.frame_set(frame)
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = lens
    cam = link(bpy.data.objects.new("PreviewCam", cam_data))
    a, e = math.radians(az), math.radians(el)
    t = Vector(target)
    cam.location = t + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    if "PreviewSun" not in bpy.data.objects:
        sun = link(bpy.data.objects.new("PreviewSun", bpy.data.lights.new("PreviewSun", "SUN")))
        sun.data.energy = 3.5
        sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))
        world = bpy.data.worlds.new("W")
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.33, 0.3, 1)
        world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
        scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = res
    scene.render.resolution_y = res
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
