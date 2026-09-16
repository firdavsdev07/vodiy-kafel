/**
 * Sound system:
 *  - Ambient background: loops /audio.mp3 via HTML5 Audio.
 *    Controlled by the sound toggle (enabled flag).
 *  - Interface tones (hover, click, open, close, enter): synthesised
 *    noise-burst voices via Web Audio API — always active once the user
 *    has entered the site, regardless of the sound toggle.
 */

let ctx = null
let master = null
let enabled = false
let tonesReady = false
let noiseBuffer = null
let bgAudio = null
const listeners = new Set()

/* ------------------------------------------------------------------ *
 * Background music — HTML5 Audio, loops /audio.mp3
 * ------------------------------------------------------------------ */
function ensureBgAudio() {
  if (bgAudio) return bgAudio
  bgAudio = new Audio('/audio.mp3')
  bgAudio.loop = true
  bgAudio.volume = 0.3
  return bgAudio
}

function startBgAudio() {
  ensureBgAudio().play().catch(() => {})
}

function stopBgAudio() {
  if (bgAudio) bgAudio.pause()
}

/* ------------------------------------------------------------------ *
 * Web Audio bootstrap (for interface tones)
 * ------------------------------------------------------------------ */
function ensureContext() {
  if (ctx) return ctx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  try { ctx = new AudioCtx() } catch { return null }
  master = ctx.createGain()
  master.gain.value = 0.35
  master.connect(ctx.destination)
  return ctx
}

/** Call once after a user gesture to unlock Web Audio for tones. */
function bootstrapTones() {
  if (tonesReady) return
  const audio = ensureContext()
  if (audio && audio.state !== 'running') {
    audio.resume().catch(() => {})
  }
  tonesReady = true
}

/* ------------------------------------------------------------------ *
 * White noise buffer (1 s, reused by all voices)
 * ------------------------------------------------------------------ */
function getNoiseBuffer(audio) {
  if (noiseBuffer) return noiseBuffer
  const length = audio.sampleRate
  noiseBuffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/* ------------------------------------------------------------------ *
 * Voice definitions — shaped bursts of filtered noise
 * ------------------------------------------------------------------ */
const VOICES = {
  // Tiny airy pop — like a soft breath on hover
  hover: {
    filterType: 'bandpass', freq: 2800, Q: 1.2,
    dur: 0.04, attack: 0.003, gain: 0.18,
  },
  // Slightly fuller tap — still breathy
  click: {
    filterType: 'bandpass', freq: 1200, Q: 0.8,
    dur: 0.07, attack: 0.004, gain: 0.22,
  },
  // Upward swoosh — opening gesture
  open: {
    filterType: 'highpass', freq: 400, Q: 0.3,
    dur: 0.25, attack: 0.02, gain: 0.15,
    sweep: 3200,
  },
  // Downward settle — closing gesture
  close: {
    filterType: 'highpass', freq: 2400, Q: 0.3,
    dur: 0.2, attack: 0.01, gain: 0.12,
    sweep: 300,
  },
  // Slow wide wash — entrance bloom
  enter: {
    filterType: 'bandpass', freq: 600, Q: 0.25,
    dur: 0.7, attack: 0.08, gain: 0.14,
    sweep: 1800,
  },
}

/**
 * Play an interface tone. Works regardless of the background-music
 * toggle — tones are always on once Web Audio has been bootstrapped.
 */
export async function playTone(name) {
  if (!tonesReady) return
  const voice = VOICES[name]
  if (!voice) return
  const audio = ensureContext()
  if (!audio) return
  try {
    if (audio.state !== 'running') await audio.resume()
  } catch {
    return
  }
  if (audio.state !== 'running') return

  const now = audio.currentTime
  const buf = getNoiseBuffer(audio)

  const src = audio.createBufferSource()
  src.buffer = buf
  const offset = Math.random() * (buf.duration - voice.dur - 0.05)

  const filter = audio.createBiquadFilter()
  filter.type = voice.filterType
  filter.frequency.setValueAtTime(voice.freq, now)
  filter.Q.value = voice.Q
  if (voice.sweep) {
    filter.frequency.exponentialRampToValueAtTime(voice.sweep, now + voice.dur)
  }

  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(voice.gain, now + voice.attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.dur)

  src.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  src.start(now, offset, voice.dur + 0.05)

  src.onended = () => { src.disconnect(); filter.disconnect(); gain.disconnect() }
}

/* ------------------------------------------------------------------ *
 * Enable / disable / toggle  (controls background music only)
 * ------------------------------------------------------------------ */
export function setSoundEnabled(next) {
  enabled = next
  // Always bootstrap tones on first enable (user gesture)
  bootstrapTones()
  if (next) {
    startBgAudio()
  } else {
    stopBgAudio()
  }
  listeners.forEach((fn) => fn(enabled))
}

export const isSoundEnabled = () => enabled

export function toggleSound() {
  setSoundEnabled(!enabled)
  playTone('click')
  return enabled
}

export function subscribeSound(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

