// Generates a real book-cover composition, reference-conditioned against
// the locked protagonist portrait - same identity-lock mechanism as every
// scene image, just framed as a cover (portrait aspect, atmospheric,
// title-safe negative space) instead of an in-story moment. Replaces the
// raw character portrait currently used as both the library card thumbnail
// and homepage hero.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateFluxImage } from '../lib/models/flux-image.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}
const fluxKey = process.env.BFL_API_KEY

const bookFolder = process.argv[2]
const coverPrompt = process.argv[3]
if (!bookFolder || !coverPrompt) {
  console.error('Usage: node scripts/storyglue-cover.mjs <book-folder> "<cover scene/mood description>"')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookFolder)
const refPath = path.join(bookDir, 'images', fs.readdirSync(path.join(bookDir, 'images')).find((f) => f.startsWith('0-reference')))
const refBuf = fs.readFileSync(refPath)
const refExt = path.extname(refPath).slice(1)
const refDataUrl = `data:image/${refExt};base64,${refBuf.toString('base64')}`

async function withRetries(fn, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try { return await fn() }
    catch (e) {
      console.error(`  attempt ${i}/${attempts} failed: ${e.message}`)
      if (i === attempts) throw e
    }
  }
}

console.log('Generating cover...')
const dataUrl = await withRetries(() => generateFluxImage(coverPrompt, refDataUrl, fluxKey, 480, 720))
const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
const outPath = path.join(bookDir, 'images', `cover.${ext}`)
fs.writeFileSync(outPath, Buffer.from(match[2], 'base64'))
console.log(`Done -> ${outPath}`)
