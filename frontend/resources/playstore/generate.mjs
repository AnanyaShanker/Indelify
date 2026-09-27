// One-off script for Play Store listing graphics.
// Run with: node resources/playstore/generate.mjs
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

// 512x512 hi-res icon (Play Console "App icon" requirement).
await sharp(fileURLToPath(new URL('../icon.png', import.meta.url)))
  .resize(512, 512)
  .png()
  .toFile(fileURLToPath(new URL('icon-512.png', import.meta.url)))
console.log('wrote icon-512.png (512x512)')

// 1024x500 feature graphic (Play Console "Feature graphic" requirement, no alpha).
const svg = readFileSync(new URL('feature-graphic.svg', import.meta.url))
await sharp(svg, { density: 192 })
  .resize(1024, 500)
  .flatten({ background: '#100A0D' })
  .png()
  .toFile(fileURLToPath(new URL('feature-graphic.png', import.meta.url)))
console.log('wrote feature-graphic.png (1024x500)')
