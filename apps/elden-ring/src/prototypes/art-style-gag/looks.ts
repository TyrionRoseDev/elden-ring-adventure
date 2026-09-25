// PROTOTYPE: the three candidate looks. Blender exports plain PBR; the look is applied here.
import {
  BackSide,
  Color,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  SkinnedMesh,
  type Material,
  type Object3D,
} from "three";

export type VariantKey = "A" | "B" | "C";

export type Look = {
  key: VariantKey;
  name: string;
  blurb: string;
  shading: "toon" | "clay";
  bands: number[]; // toon gradient steps, 0..255
  outline: { thickness: number; color: string } | null;
  tint: { color: string; amount: number } | null; // pull every colour toward a paper tone
  sky: { top: string; horizon: string; ground: string };
  fog: [near: number, far: number];
  sun: { color: string; intensity: number; position: [number, number, number] };
  fill: { sky: string; ground: string; intensity: number };
  exposure: number;
  post: {
    bloom: number;
    saturation: number;
    vignette: number;
    grain: number;
    sepia: number;
    tiltShift: number;
  };
};

export const LOOKS: Record<VariantKey, Look> = {
  A: {
    key: "A",
    name: "Chibi cel",
    blurb: "2 heads tall · 3-band toon · ink outlines · bright",
    shading: "toon",
    bands: [140, 205, 255],
    outline: { thickness: 0.012, color: "#1d1712" },
    tint: null,
    sky: { top: "#4f86c9", horizon: "#f3dca4", ground: "#8a9a52" },
    fog: [16, 70],
    sun: { color: "#fff1d6", intensity: 2.6, position: [-6, 10, 7] },
    fill: { sky: "#b9d4ff", ground: "#6b5b3a", intensity: 1.3 },
    exposure: 1.0,
    post: { bloom: 0.9, saturation: 0.12, vignette: 0.35, grain: 0, sepia: 0, tiltShift: 0 },
  },
  B: {
    key: "B",
    name: "Clay diorama",
    blurb: "2.6 heads · soft plasticine PBR · no outlines · tilt-shift miniature",
    shading: "clay",
    bands: [],
    outline: null,
    tint: null,
    sky: { top: "#5f8fd0", horizon: "#f6d7a6", ground: "#7d8a4c" },
    fog: [14, 60],
    sun: { color: "#ffe2b8", intensity: 3.2, position: [-5, 8, 6] },
    fill: { sky: "#cfe0ff", ground: "#5e4c33", intensity: 1.0 },
    exposure: 1.05,
    post: { bloom: 0.7, saturation: 0.22, vignette: 0.45, grain: 0.04, sepia: 0, tiltShift: 1 },
  },
  C: {
    key: "C",
    name: "Storybook ink",
    blurb: "3.6 heads · 2-band toon · heavy ink · parchment golden hour",
    shading: "toon",
    bands: [150, 255],
    outline: { thickness: 0.02, color: "#221a14" },
    tint: { color: "#e8d3a6", amount: 0.16 },
    sky: { top: "#c89b5e", horizon: "#f6e2b3", ground: "#9a8a58" },
    fog: [12, 55],
    sun: { color: "#ffd08a", intensity: 3.0, position: [-9, 5, 5] },
    fill: { sky: "#f5e1bb", ground: "#5a4630", intensity: 1.1 },
    exposure: 1.0,
    post: { bloom: 1.1, saturation: -0.02, vignette: 0.6, grain: 0.11, sepia: 0.08, tiltShift: 0 },
  },
};

function gradient(bands: number[]) {
  const tex = new DataTexture(new Uint8Array(bands), bands.length, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const cache = new Map<string, Material>();

function convert(src: MeshStandardMaterial, look: Look): Material {
  const id = `${look.key}:${src.uuid}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const color = src.color.clone();
  if (look.tint) color.lerp(new Color(look.tint.color), look.tint.amount);
  const emissive = src.emissive.clone();
  const glows = emissive.getHex() !== 0;
  let out: Material;
  if (look.shading === "toon") {
    // metals get a lighter base so the bands read as sheen
    if (src.metalness > 0.5) color.offsetHSL(0, -0.05, 0.08);
    out = new MeshToonMaterial({
      color,
      gradientMap: gradient(look.bands),
      emissive,
      emissiveIntensity: glows ? src.emissiveIntensity : 0,
    });
  } else {
    out = new MeshStandardMaterial({
      color,
      roughness: Math.max(0.55, src.roughness * 0.9),
      metalness: src.metalness * 0.35,
      emissive,
      emissiveIntensity: glows ? src.emissiveIntensity : 0,
    });
  }
  out.name = src.name;
  // the Erdtree and glowing eyes cut through fog
  if (glows) (out as MeshToonMaterial).fog = false;
  cache.set(id, out);
  return out;
}

function outlineMaterial(thickness: number, color: string) {
  const m = new MeshBasicMaterial({ color, side: BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.thickness = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float thickness;")
      .replace("#include <begin_vertex>", "vec3 transformed = position + normal * thickness;");
  };
  return m;
}

export function applyLook(root: Object3D, look: Look, opts: { outline?: boolean; outlineScale?: number; shadows?: boolean } = {}) {
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    if ((o as Mesh).isMesh && !o.userData.outline) meshes.push(o as Mesh);
  });
  const ol = look.outline && opts.outline !== false ? outlineMaterial(look.outline.thickness * (opts.outlineScale ?? 1), look.outline.color) : null;
  for (const mesh of meshes) {
    const src = mesh.material as MeshStandardMaterial;
    mesh.material = convert(src, look);
    mesh.castShadow = opts.shadows !== false;
    mesh.receiveShadow = true;
    const glows = src.emissive && src.emissive.getHex() !== 0;
    if (!ol || glows) continue;
    if ((mesh as SkinnedMesh).isSkinnedMesh) {
      const skinned = mesh as SkinnedMesh;
      const hull = new SkinnedMesh(skinned.geometry, ol);
      hull.bind(skinned.skeleton, skinned.bindMatrix);
      hull.bindMode = skinned.bindMode;
      hull.position.copy(skinned.position);
      hull.quaternion.copy(skinned.quaternion);
      hull.scale.copy(skinned.scale);
      hull.userData.outline = true;
      hull.frustumCulled = false;
      skinned.parent?.add(hull);
    } else {
      const hull = new Mesh(mesh.geometry, ol);
      hull.userData.outline = true;
      mesh.add(hull);
    }
  }
}
