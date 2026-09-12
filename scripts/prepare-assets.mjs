import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { MARBLE, TRAVERTINE, INTERIOR, BATH } from '../src/data/images.js'

const exec = promisify(execFile)
const urls = [...new Set([...MARBLE, ...TRAVERTINE, ...INTERIOR, ...BATH])]
await mkdir('public/images/materials', { recursive: true })
await mkdir('/tmp/vk-material-downloads', { recursive: true })
let cursor = 0
const manifest = {}
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++]
    const name = url.split('/').at(-1).replace('.jpg', '')
    const input = `/tmp/vk-material-downloads/${name}.jpg`
    const output = `public/images/materials/${name}.webp`
    try {
      await exec('curl', ['-fLs', '--max-time', '40', '--retry', '1', url, '-o', input])
      await exec('convert', [input, '-auto-orient', '-resize', '1400x1400>', '-quality', '82', output])
      manifest[url] = `/${output.replace('public/', '')}`
      console.log('OK', name)
    } catch (error) { console.error('FAILED', name, error.message) }
  }
}))
await writeFile('public/images/materials/sources.json', JSON.stringify(manifest, null, 2))
await writeFile('src/data/image-assets.json', JSON.stringify(manifest, null, 2))
console.log(`${Object.keys(manifest).length}/${urls.length} optimized`)

// Bundle the official glTF and its dependencies as one portable GLB.
const gltf = JSON.parse(await readFile('public/models/vase/vase.gltf', 'utf8'))
const chunks = [await readFile('public/models/vase/' + gltf.buffers[0].uri)]
let offset = chunks[0].length
for (const image of gltf.images) {
  const pad = (4 - offset % 4) % 4
  if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad }
  const bytes = await readFile('public/models/vase/' + image.uri)
  image.bufferView = gltf.bufferViews.length
  image.mimeType = 'image/jpeg'
  delete image.uri
  gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length })
  chunks.push(bytes)
  offset += bytes.length
}
gltf.buffers = [{ byteLength: offset }]
let json = Buffer.from(JSON.stringify(gltf))
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)])
let binary = Buffer.concat(chunks)
binary = Buffer.concat([binary, Buffer.alloc((4 - binary.length % 4) % 4)])
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8)
const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(json.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4)
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4)
await writeFile('public/models/ceramic-vase.glb', Buffer.concat([header, jsonHeader, json, binHeader, binary]))
