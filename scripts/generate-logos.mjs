import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const SVG = readFileSync('frontend/src/assets/lucide-boxes.svg', 'utf8')
const PADDED = (fg, bg) => Buffer.from(
  SVG
    .replace(/stroke="currentColor"/g, `stroke="${fg}"`)
    .replace(/<svg /, `<svg style="background:${bg}" `)
)

const targets = [
  { out: 'LogoWithBackground.png', size: 1024, fg: '#ffffff', bg: '#000000' },
  { out: 'LogoWithName.png',       size: 1024, fg: '#000000', bg: '#ffffff' },
  { out: 'LogoWithNameWhite.png',  size: 1024, fg: '#ffffff', bg: '#000000' },
  { out: 'logo.png',               size:  512, fg: '#000000', bg: '#ffffff' },
  { out: 'borgscale-logo.png',     size:  512, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/logo.png',                size: 512, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/favicon-16x16.png',       size:  16, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/favicon-32x32.png',       size:  32, fg: '#000000', bg: '#ffffff' },
  { out: 'frontend/public/apple-touch-icon.png',    size: 180, fg: '#000000', bg: '#ffffff' },
]

for (const t of targets) {
  await sharp(PADDED(t.fg, t.bg), { density: 1024 })
    .resize(t.size, t.size, { fit: 'contain', background: t.bg })
    .png()
    .toFile(t.out)
  console.log(`wrote ${t.out} (${t.size}x${t.size})`)
}
