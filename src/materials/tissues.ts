import * as THREE from 'three'

/**
 * Physically-based tissue materials tuned to read as "wet, living" anatomy
 * without any scanned textures. Realism comes from transmission (translucency),
 * sheen, clearcoat wetness, fresnel rim and procedural fiber normals injected
 * via onBeforeCompile.
 */

export interface TissueOpts {
  color?: THREE.ColorRepresentation
}

/** Injects a directional fiber-stripe normal + subtle albedo variation. */
function injectFibers(mat: THREE.Material, scale = 42, strength = 0.5) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFiberScale = { value: scale }
    shader.uniforms.uFiberStrength = { value: strength }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vFiberPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vFiberPos = position;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uFiberScale;
         uniform float uFiberStrength;
         varying vec3 vFiberPos;
         // Fibers run ALONG the muscle long axis (local +Y): variation is in the
         // azimuthal angle so striations read as longitudinal, not circumferential rings.
         float fiberNoise(vec3 p){
           float ang = atan(p.x, p.z);
           return sin(ang * uFiberScale) * 0.5
                + sin(ang * uFiberScale * 1.73 + p.y * 3.5) * 0.32
                + sin(ang * uFiberScale * 0.5 - p.y * 1.5) * 0.16;
         }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         float f = fiberNoise(vFiberPos);
         normal = normalize(normal + vec3(dFdx(f), dFdy(f), 0.0) * uFiberStrength);`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float fv = fiberNoise(vFiberPos);
         diffuseColor.rgb *= 1.0 + fv * 0.06;`,
      )
  }
  mat.customProgramCacheKey = () => `fiber-${scale}-${strength}`
}

export function makeBone(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d8cdb4'),
    roughness: 0.64,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.62,
    sheen: 0.3,
    sheenColor: new THREE.Color('#fff6e0'),
    transmission: 0.06,
    thickness: 1.2,
    ior: 1.42,
    attenuationColor: new THREE.Color('#d8c9a0'),
    attenuationDistance: 3,
  })
  return m
}

export function makeMuscle(color: THREE.ColorRepresentation = '#8f2d2d'): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.48,
    sheen: 0.35,
    sheenColor: new THREE.Color('#c65a4a'),
    sheenRoughness: 0.6,
    transmission: 0.12,
    thickness: 0.8,
    ior: 1.37,
    attenuationColor: new THREE.Color('#5a1410'),
    attenuationDistance: 0.5,
    specularIntensity: 0.7,
    specularColor: new THREE.Color('#e8b8a8'),
  })
  injectFibers(m, 30, 0.44)
  return m
}

export function makeTendon(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ece4d4'),
    roughness: 0.28,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
    sheen: 0.6,
    sheenColor: new THREE.Color('#ffffff'),
    transmission: 0.28,
    thickness: 0.4,
    ior: 1.4,
    attenuationColor: new THREE.Color('#d8cbb0'),
    attenuationDistance: 0.5,
  })
  injectFibers(m, 90, 0.35)
  return m
}

export function makeFat(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6c063'),
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.4,
    transmission: 0.35,
    thickness: 1.5,
    ior: 1.44,
    attenuationColor: new THREE.Color('#caa03a'),
    attenuationDistance: 1.2,
    transparent: true,
    opacity: 0.92,
  })
}

export function makeSkin(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d9a07a'),
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
    sheen: 0.4,
    sheenColor: new THREE.Color('#ffdcc0'),
    transmission: 0.12,
    thickness: 2.0,
    ior: 1.4,
    attenuationColor: new THREE.Color('#c1613f'),
    attenuationDistance: 1.5,
    transparent: true,
    opacity: 0.9,
  })
}

export function makeNerve(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f2d24a'),
    emissive: new THREE.Color('#8a6a00'),
    emissiveIntensity: 0.4,
    roughness: 0.5,
  })
}
