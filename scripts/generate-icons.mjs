// Generates the app icons used by the web app manifest and iOS.
// Pure Node (no dependencies) so the assets can be regenerated anywhere.
//
//   node scripts/generate-icons.mjs
//
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function insideRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false
  const rx = Math.min(r, w / 2)
  const ry = Math.min(r, h / 2)
  const dx = Math.max(x + rx - px, 0, px - (x + w - rx))
  const dy = Math.max(y + ry - py, 0, py - (y + h - ry))
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

// A speech/list mark: three rounded bars on a rounded gradient tile.
function renderIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  const ss = 3
  const radius = maskable ? 0 : size * 0.22
  const samples = ss * ss

  const barHeight = size * (maskable ? 0.085 : 0.09)
  const bars = [
    { y: 0.305, w: 0.46 },
    { y: 0.455, w: 0.6 },
    { y: 0.605, w: 0.38 },
  ].map((bar) => ({
    x: (size - bar.w * size) / 2,
    y: bar.y * size,
    w: bar.w * size,
    h: barHeight,
    r: barHeight / 2,
  }))

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const px = x + (sx + 0.5) / ss
          const py = y + (sy + 0.5) / ss

          let cr = 0
          let cg = 0
          let cb = 0
          let ca = 0

          const inTile =
            maskable || insideRoundedRect(px, py, 0, 0, size, size, radius)
          if (inTile) {
            const t = py / size
            cr = lerp(0x35, 0x1f, t)
            cg = lerp(0x63, 0x43, t)
            cb = lerp(0xf0, 0xc4, t)
            ca = 1
          }

          const inBar = bars.some((bar) =>
            insideRoundedRect(px, py, bar.x, bar.y, bar.w, bar.h, bar.r),
          )
          if (inBar) {
            cr = 0xff
            cg = 0xff
            cb = 0xff
            ca = 1
          }

          r += cr * ca
          g += cg * ca
          b += cb * ca
          a += ca
        }
      }

      const offset = (y * size + x) * 4
      if (a === 0) {
        rgba[offset] = 0
        rgba[offset + 1] = 0
        rgba[offset + 2] = 0
        rgba[offset + 3] = 0
      } else {
        rgba[offset] = Math.round(r / a)
        rgba[offset + 1] = Math.round(g / a)
        rgba[offset + 2] = Math.round(b / a)
        rgba[offset + 3] = Math.round((a / samples) * 255)
      }
    }
  }

  return encodePng(size, size, rgba)
}

mkdirSync(outDir, { recursive: true })

const targets = [
  ['icon-192.png', renderIcon(192)],
  ['icon-512.png', renderIcon(512)],
  ['icon-maskable-512.png', renderIcon(512, { maskable: true })],
  ['apple-touch-icon.png', renderIcon(180)],
]

for (const [name, data] of targets) {
  writeFileSync(join(outDir, name), data)
  console.log(`wrote public/icons/${name} (${data.length} bytes)`)
}
