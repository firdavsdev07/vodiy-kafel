import { test } from 'node:test'
import assert from 'node:assert/strict'

function audioMock() {
  const started = [], stopped = [], resumes = [], plays = [], pauses = []
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} })
  class AudioContext {
    state = 'suspended'
    currentTime = 0
    sampleRate = 44100
    destination = {}
    resume() { return new Promise(resolve => resumes.push(() => { this.state = 'running'; resolve() })) }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} } }
    createBiquadFilter() { return { type: 'lowpass', frequency: parameter(), Q: parameter(), connect() {}, disconnect() {} } }
    createBuffer(channels, length) {
      return { duration: length / this.sampleRate, getChannelData() { return new Float32Array(length) } }
    }
    createBufferSource() {
      const src = { buffer: null, loop: false, connect() {}, disconnect() {}, start() { started.push(src) }, stop() { stopped.push(src) } }
      return src
    }
  }
  class MockAudio {
    loop = false
    volume = 1
    play() { plays.push(this); return Promise.resolve() }
    pause() { pauses.push(this) }
  }
  globalThis.window = { AudioContext }
  globalThis.Audio = MockAudio
  return { started, stopped, plays, pauses, unlock: async () => { resumes.splice(0).forEach(resolve => resolve()); await Promise.resolve() } }
}

test('tones play after enable even when toggled off', async () => {
  const mock = audioMock()
  const sound = await import('../src/lib/sound.js?test=tones')
  // Before any enable, tones are not ready
  await sound.playTone('click')
  assert.equal(mock.started.length, 0)
  // Enable bootstraps tones + starts bg music
  sound.setSoundEnabled(true)
  assert.equal(mock.plays.length, 1)
  await mock.unlock()
  await sound.playTone('click')
  assert.equal(mock.started.length, 1)
  // Disable stops bg music but tones still work
  sound.setSoundEnabled(false)
  assert.equal(mock.pauses.length, 1)
  await sound.playTone('hover')
  assert.equal(mock.started.length, 2)
})

test('toggle controls only background music', async () => {
  const mock = audioMock()
  const sound = await import('../src/lib/sound.js?test=toggle')
  sound.toggleSound() // enables
  await mock.unlock()
  assert.equal(sound.isSoundEnabled(), true)
  assert.equal(mock.plays.length, 1)
  sound.toggleSound() // disables
  assert.equal(sound.isSoundEnabled(), false)
  assert.equal(mock.pauses.length, 1)
  // Tones still fire after toggle off
  await sound.playTone('open')
  assert.equal(mock.started.length > 0, true)
})

test('unsupported Web Audio still allows bg music', async () => {
  globalThis.window = {}
  globalThis.Audio = class { play() { return Promise.resolve() } pause() {} }
  const sound = await import('../src/lib/sound.js?test=unsupported')
  sound.setSoundEnabled(true)
  assert.equal(sound.isSoundEnabled(), true)
  // playTone is a no-op without AudioContext
  await sound.playTone('click')
  sound.setSoundEnabled(false)
})
