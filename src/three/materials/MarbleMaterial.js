import { extend } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Procedural marble — see ASSETS.md §3.
 *
 * Rather than a raw ShaderMaterial (which would throw away three's PBR
 * lighting and environment maps) this subclasses MeshPhysicalMaterial and
 * injects domain-warped fBm veining into the diffuse term. We keep the
 * environment reflection, clearcoat and roughness that sell the polish, and
 * pay nothing in texture downloads.
 */

const COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uVeinSharpness;
  uniform float uWarp;
  uniform vec3 uBase;
  uniform vec3 uVein;
  uniform vec3 uShadow;
  varying vec3 vMarblePos;

  vec3 vkHash(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float vkNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(dot(vkHash(i + vec3(0, 0, 0)), f - vec3(0, 0, 0)),
            dot(vkHash(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
        mix(dot(vkHash(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)),
            dot(vkHash(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
      mix(
        mix(dot(vkHash(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)),
            dot(vkHash(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
        mix(dot(vkHash(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)),
            dot(vkHash(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y),
      u.z);
  }

  float vkFbm(vec3 p) {
    float amp = 0.5;
    float sum = 0.0;
    for (int i = 0; i < 5; i++) {
      sum += amp * vkNoise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }
`

const VERTEX_TAIL = /* glsl */ `
  vMarblePos = position;
`

const FRAGMENT_BODY = /* glsl */ `
  vec3 mp = vMarblePos * uScale;
  mp.y += uTime * 0.008;

  // Domain warp — this is what turns noise into geology.
  float warp = vkFbm(mp * 0.55);
  float body = vkFbm(mp * 1.35 + warp * uWarp);

  float vein = abs(sin((mp.x * 1.6 + mp.z * 0.5 + body * 5.4) * 3.14159));
  vein = pow(1.0 - vein, uVeinSharpness);

  float dust = vkFbm(mp * 4.5) * 0.5 + 0.5;

  vec3 marble = mix(uBase, uShadow, smoothstep(0.25, 0.85, dust) * 0.35);
  marble = mix(marble, uVein, clamp(vein, 0.0, 1.0));

  diffuseColor.rgb *= marble;
`

export class MarbleMaterial extends THREE.MeshPhysicalMaterial {
  constructor(parameters = {}) {
    const {
      scale = 0.35,
      veinSharpness = 3.4,
      warp = 2.6,
      base = '#efece4',
      vein = '#8d8577',
      shadow = '#cfc8ba',
      ...rest
    } = parameters

    super({ color: '#ffffff', roughness: 0.22, metalness: 0, ...rest })

    this.uniforms = {
      uTime: { value: 0 },
      uScale: { value: scale },
      uVeinSharpness: { value: veinSharpness },
      uWarp: { value: warp },
      uBase: { value: new THREE.Color(base) },
      uVein: { value: new THREE.Color(vein) },
      uShadow: { value: new THREE.Color(shadow) },
    }
  }

  onBeforeCompile(shader) {
    Object.assign(shader.uniforms, this.uniforms)

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n varying vec3 vMarblePos;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_TAIL}`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_BODY}`)
  }

  /* Without this, three reuses a cached non-marble program for the material. */
  customProgramCacheKey() {
    return 'vk-marble-v1'
  }

  set time(value) {
    this.uniforms.uTime.value = value
  }

  get time() {
    return this.uniforms.uTime.value
  }
}

extend({ MarbleMaterial })
