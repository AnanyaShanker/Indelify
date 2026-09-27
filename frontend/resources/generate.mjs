// One-off script to rasterize the brand SVGs into the PNGs @capacitor/assets needs.
// Run with: node resources/generate.mjs
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const jobs = [
  ['icon.svg', 'icon.png', 1024, 1024],
  ['icon-foreground.svg', 'icon-foreground.png', 1024, 1024],
  ['icon-background.svg', 'icon-background.png', 1024, 1024],
  ['splash.svg', 'splash.png', 2732, 2732],
  ['splash.svg', 'splash-dark.png', 2732, 2732],
]

for (const [src, out, w, h] of jobs) {
  const svg = readFileSync(new URL(src, import.meta.url))
  await sharp(svg, { density: 384 })
    .resize(w, h)
    .png()
    .toFile(fileURLToPath(new URL(out, import.meta.url)))
  console.log(`wrote ${out} (${w}x${h})`)
}
