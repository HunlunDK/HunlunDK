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
         float fiberNoise(vec3 p){
           return sin(p.y * uFiberScale) * 0.5
                + sin(p.y * uFiberScale * 2.13 + p.x * 6.0) * 0.25
                + sin(p.x * uFiberScale * 0.7) * 0.15;
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
    color: new THREE.Color('#e9e2d0'),
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
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

export function makeMuscle(color: THREE.ColorRepresentation = '#b8403a'): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    sheen: 0.5,
    sheenColor: new THREE.Color('#ff6a5a'),
    sheenRoughness: 0.5,
    transmission: 0.18,
    thickness: 0.9,
    ior: 1.38,
    attenuationColor: new THREE.Color('#7a1e18'),
    attenuationDistance: 0.6,
    specularIntensity: 1,
    specularColor: new THREE.Color('#ffd9c9'),
  })
  injectFibers(m, 46, 0.55)
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
