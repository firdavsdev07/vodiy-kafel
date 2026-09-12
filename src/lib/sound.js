/**
 * Soft interface tones, synthesised at runtime — no audio files (ASSETS.md §7).
 * The AudioContext is only created once the user opts in at the entry gate.
 *
 * Design: warm, muted textures — filtered noise pops, soft pads and gentle
 * glides. Nothing that sounds like a clinical beep or alarm signal.
 */

let ctx = null
let master = null
let enabled = false
let ambient = null
const listeners = new Set()

/* ------------------------------------------------------------------ *
 * Ambient pad — soft, evolving chord that breathes in the background
 * ------------------------------------------------------------------ */
function startAmbient(audio) {
  if (ambient || !enabled) return

  const wet = audio.createGain()
  wet.gain.setValueAtTime(0, audio.currentTime)
  wet.gain.linearRampToValueAtTime(0.06, audio.currentTime + 2.5)

  // Low-pass to keep it pillowy
  const lp = audio.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420
  lp.Q.value = 0.7
  lp.connect(wet)
  wet.connect(master)

  // Slow detuned chord — F3, A3, C4 (gentle Fmaj)
  const notes = [174.61, 220.0, 261.63]
  const voices = notes.map((freq, i) => {
    const osc = audio.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.detune.value = (i - 1) * 4 // subtle shimmer
    osc.connect(lp)
    osc.start()
    return osc
  })

  ambient = { gain: wet, voices, filter: lp }
}

/* ------------------------------------------------------------------ *
 * AudioContext bootstrap
 * ------------------------------------------------------------------ */
function ensureContext() {
  if (ctx) return ctx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  try { ctx = new AudioCtx() } catch { return null }
  master = ctx.createGain()
  master.gain.value = 0.18
  master.connect(ctx.destination)
  return ctx
}

/* ------------------------------------------------------------------ *
 * Voice definitions — soft, warm, never harsh
 * ------------------------------------------------------------------ */
const VOICES = {
  // Tiny filtered pop — like a soft tap on fabric
  hover: { freq: 2200, type: 'sine', dur: 0.06, gain: 0.08, lpFreq: 800 },
  // Warm knock — rounded triangle through a filter
  click: { freq: 340, type: 'triangle', dur: 0.09, gain: 0.14, lpFreq: 600 },
  // Gentle rising whisper
  open: { freq: 180, type: 'sine', dur: 0.38, gain: 0.12, glide: 260, lpFreq: 500 },
  // Settling sigh
  close: { freq: 260, type: 'sine', dur: 0.32, gain: 0.10, glide: 160, lpFreq: 440 },
  // Slow warm bloom on entrance
  enter: { freq: 130, type: 'sine', dur: 1.1, gain: 0.13, glide: 220, lpFreq: 380 },
}

export async function playTone(name) {
  if (!enabled) return
  const voice = VOICES[name]
  if (!voice) return
  const audio = ensureContext()
  if (!audio) return
  try {
    if (audio.state !== 'running') await audio.resume()
  } catch {
    setSoundEnabled(false)
    return
  }
  if (!enabled || audio.state !== 'running') return

  const now = audio.currentTime
  const osc = audio.createOscillator()
  const gain = audio.createGain()

  // Low-pass filter — takes the digital edge off every tone
  const lp = audio.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = voice.lpFreq
  lp.Q.value = 0.5

  osc.type = voice.type
  osc.frequency.setValueAtTime(voice.freq, now)
  if (voice.glide) {
    osc.frequency.exponentialRampToValueAtTime(voice.glide, now + voice.dur)
  }

  // Soft attack and release — no harsh transients
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(voice.gain, now + 0.035)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.dur)

  osc.connect(lp)
  lp.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + voice.dur + 0.05)
  osc.onended = () => { osc.disconnect(); lp.disconnect(); gain.disconnect() }
}

/* ------------------------------------------------------------------ *
 * Enable / disable / toggle
 * ------------------------------------------------------------------ */
export function setSoundEnabled(next) {
  enabled = next
  if (next) {
    const audio = ensureContext()
    if (!audio) { enabled = false }
    else audio.resume().then(() => { if (enabled) startAmbient(audio) }).catch(() => setSoundEnabled(false))
  } else if (ambient) {
    const ending = ambient
    ambient = null
    ending.gain.gain.cancelScheduledValues(ctx.currentTime)
    ending.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08)
    ending.voices.forEach((voice) => {
      voice.onended = () => { voice.disconnect(); ending.filter.disconnect(); ending.gain.disconnect() }
      voice.stop(ctx.currentTime + 0.4)
    })
  }
  listeners.forEach((fn) => fn(enabled))
}

export const isSoundEnabled = () => enabled

export function toggleSound() {
  setSoundEnabled(!enabled)
  if (enabled) playTone('click')
  return enabled
}

export function subscribeSound(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
