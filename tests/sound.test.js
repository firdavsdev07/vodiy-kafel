import { test } from 'node:test'
import assert from 'node:assert/strict'

function audioMock() {
  const started = [], stopped = [], resumes = []
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} })
  class AudioContext {
    state = 'suspended'
    currentTime = 0
    destination = {}
    resume() { return new Promise(resolve => resumes.push(() => { this.state = 'running'; resolve() })) }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} } }
    createBiquadFilter() { return { type: 'lowpass', frequency: parameter(), Q: parameter(), connect() {}, disconnect() {} } }
    createOscillator() {
      const voice = { frequency: parameter(), detune: parameter(), connect() {}, disconnect() {}, start() { started.push(voice) }, stop() { stopped.push(voice) } }
      return voice
    }
  }
  globalThis.window = { AudioContext }
  return { started, stopped, unlock: async () => { resumes.splice(0).forEach(resolve => resolve()); await Promise.resolve() } }
}

test('audio waits for user opt-in and a resumed context', async () => {
  const mock = audioMock()
  const sound = await import('../src/lib/sound.js?test=unlock')
  await sound.playTone('enter')
  assert.equal(mock.started.length, 0)
  sound.setSoundEnabled(true)
  const tone = sound.playTone('enter')
  assert.equal(mock.started.length, 0)
  await mock.unlock(); await tone
  assert.equal(mock.started.length, 4) // three ambient voices + entrance
  assert.equal(sound.isSoundEnabled(), true)
  sound.setSoundEnabled(false)
  assert.equal(mock.stopped.length, 4)
})

test('mute during unlock prevents delayed sound', async () => {
  const mock = audioMock()
  const sound = await import('../src/lib/sound.js?test=cancel')
  sound.setSoundEnabled(true)
  const tone = sound.playTone('enter')
  sound.setSoundEnabled(false)
  await mock.unlock(); await tone
  assert.equal(mock.started.length, 0)
})

test('repeated enable never duplicates the ambient layer', async () => {
  const mock = audioMock()
  const sound = await import('../src/lib/sound.js?test=repeat')
  sound.setSoundEnabled(true); sound.setSoundEnabled(true)
  await mock.unlock()
  assert.equal(mock.started.length, 3)
})

test('unsupported audio stays visibly disabled', async () => {
  globalThis.window = {}
  const sound = await import('../src/lib/sound.js?test=unsupported')
  sound.setSoundEnabled(true)
  assert.equal(sound.isSoundEnabled(), false)
})
