import * as THREE from 'three'

/**
 * Parametric tissue geometry. Every form is authored in LOCAL space, unit-ish,
 * oriented along +Y, so it can be cheaply placed/oriented/scaled between two
 * landmark joints each frame (a lightweight skeletal-skinning stand-in).
 */

/**
 * Fusiform (spindle) muscle belly along +Y, from y=-0.5..0.5.
 * `bulge` shifts the widest point; `taperA/taperB` set end thinness (tendons).
 */
export function fusiform(
  maxRadius = 0.5,
  bulge = 0.5,
  taperA = 0.35,
  taperB = 0.35,
  segments = 28,
  rings = 24,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1, 1, 1, segments, rings, false)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const vtmp = new THREE.Vector3()
  const b = Math.min(0.85, Math.max(0.15, bulge))
  for (let i = 0; i < pos.count; i++) {
    vtmp.fromBufferAttribute(pos, i)
    const t = vtmp.y + 0.5 // 0..1 along length
    // Asymmetric bell centred on `bulge`, with rounded (not pointed) ends.
    const side = t < b ? t / b : (1 - t) / (1 - b)
    const bell = Math.pow(Math.sin((side * Math.PI) / 2), 0.7) // full, rounded
    const endR = THREE.MathUtils.lerp(taperA, taperB, t)
    const radius = maxRadius * (endR + (1 - endR) * bell)
    pos.setX(i, vtmp.x * radius)
    pos.setZ(i, vtmp.z * radius)
  }
  geo.computeVertexNormals()
  return geo
}

/** Tapered bone shaft along +Y with slightly flared epiphyses. */
export function boneShaft(
  rA = 0.06,
  rB = 0.06,
  flare = 1.5,
  segments = 16,
  rings = 14,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1, 1, 1, segments, rings, false)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const vtmp = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    vtmp.fromBufferAttribute(pos, i)
    const t = vtmp.y + 0.5
    const base = THREE.MathUtils.lerp(rA, rB, t)
    // flare near the ends (joint condyles)
    const endBoost = 1 + (Math.pow(Math.abs(t - 0.5) * 2, 3)) * (flare - 1)
    const radius = base * endBoost
    pos.setX(i, vtmp.x * radius)
    pos.setZ(i, vtmp.z * radius)
  }
  geo.computeVertexNormals()
  return geo
}

/** Ellipsoid (skull, pelvis mass, joint heads). */
export function ellipsoid(rx: number, ry: number, rz: number, detail = 32): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, detail, Math.floor(detail * 0.75))
  geo.scale(rx, ry, rz)
  geo.computeVertexNormals()
  return geo
}

/** A single rib as a swept tube along an elliptical arc. */
export function ribArc(
  radiusX: number,
  radiusZ: number,
  span: number,
  tube = 0.012,
  drop = 0.05,
): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = []
  const steps = 28
  for (let i = 0; i <= steps; i++) {
    const a = -span / 2 + (span * i) / steps
    pts.push(new THREE.Vector3(Math.sin(a) * radiusX, -Math.abs(a) * drop, -Math.cos(a) * radiusZ))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  return new THREE.TubeGeometry(curve, 40, tube, 8, false)
}

/** Vertebra-like stacked short cylinders for the spine. */
export function vertebra(r = 0.032, h = 0.03): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(r, r * 1.05, h, 12, 1)
}

/** Tendon/ligament tube along a curve between two points with a mid sag. */
export function tendonTube(a: THREE.Vector3, b: THREE.Vector3, tube = 0.016): THREE.TubeGeometry {
  const mid = a.clone().lerp(b, 0.5)
  const curve = new THREE.CatmullRomCurve3([a, mid, b])
  return new THREE.TubeGeometry(curve, 20, tube, 8, false)
}

/**
 * Build a smooth full-body skin/fat shell as a merged set of capsules that
 * follow the rig. Returns geometry in world space for a given pose plus the
 * per-vertex region weights used for fat morphing.
 */
export function scapula(): THREE.BufferGeometry {
  // flattened triangular blade
  const shape = new THREE.Shape()
  shape.moveTo(0, 0.12)
  shape.lineTo(0.11, 0.02)
  shape.lineTo(0.07, -0.13)
  shape.lineTo(-0.02, -0.11)
  shape.lineTo(-0.05, 0.05)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

/** Pelvis: two shaped iliac blades + a body. */
export function pelvisGeometry(): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const body = ellipsoid(0.1, 0.06, 0.07, 20)
  geos.push(body)
  for (const s of [-1, 1]) {
    const blade = ellipsoid(0.075, 0.09, 0.03, 16)
    blade.translate(s * 0.09, 0.03, -0.01)
    blade.rotateZ(s * 0.4)
    geos.push(blade)
  }
  return mergeGeometries(geos)
}

/** A simple but readable hand: rounded palm block + four finger ridges + thumb. */
export function handGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const palm = new THREE.BoxGeometry(0.075, 0.085, 0.028, 4, 4, 2)
  parts.push(palm)
  for (let i = 0; i < 4; i++) {
    const f = new THREE.CapsuleGeometry(0.011, 0.05, 3, 6)
    f.translate((i - 1.5) * 0.019, -0.075, 0)
    parts.push(f)
  }
  const thumb = new THREE.CapsuleGeometry(0.013, 0.038, 3, 6)
  thumb.rotateZ(0.9)
  thumb.translate(-0.045, -0.02, 0.006)
  parts.push(thumb)
  const geo = mergeGeometries(parts)
  geo.computeVertexNormals()
  return geo
}

/** A foot wedge: heel lump tapering to a flat forefoot, flat plantar underside. */
export function footGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 16, 8, false)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const t = v.y + 0.5 // 0 heel .. 1 toe (we map Y→length along foot)
    const width = 0.035 * (0.85 + 0.3 * Math.sin(t * Math.PI))
    const height = 0.03 * (1 - t * 0.55)
    pos.setX(i, v.x * width)
    pos.setZ(i, v.z * height)
    pos.setY(i, (t - 0.5) * 0.16) // foot length along Y
  }
  // flatten the sole
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    if (v.z < -0.006) pos.setZ(i, -0.006)
  }
  geo.computeVertexNormals()
  // orient so length runs +Z (forward), sole down
  geo.rotateX(Math.PI / 2)
  return geo
}

/** Minimal geometry merge (position only). Converts indexed inputs to
 * non-indexed first so triangle topology is preserved, then recomputes normals. */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  let total = 0
  for (const g of flat) total += (g.attributes.position as THREE.BufferAttribute).count
  const positions = new Float32Array(total * 3)
  let offset = 0
  for (const g of flat) {
    const p = g.attributes.position as THREE.BufferAttribute
    positions.set(p.array as Float32Array, offset * 3)
    offset += p.count
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}
