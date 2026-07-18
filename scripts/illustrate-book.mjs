import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { illustrateBook } from '../lib/pipeline/illustrate.js'
import { generateGeminiImage } from '../lib/models/gemini-image.js'
import { generateFluxImage } from '../lib/models/flux-image.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const bookSlug = process.argv[2]
if (!bookSlug) {
  console.error('Usage: node scripts/illustrate-book.mjs <book-folder-name>')
  process.exit(1)
}

const outDir = path.join(ROOT, 'books', bookSlug)
const outline = JSON.parse(fs.readFileSync(path.join(outDir, 'outline.json'), 'utf8'))

const geminiKey = process.env.GEMINI_API_KEY
const fluxKey = process.env.BFL_API_KEY

console.log(`Illustrating "${outline.title}" (${outline.chapters.length} chapters)...\n`)

await illustrateBook({
  outline,
  outDir,
  generateGemini: (prompt) => generateGeminiImage(prompt, geminiKey),
  generateFlux: (prompt, ref) => generateFluxImage(prompt, ref, fluxKey),
})

console.log('\nDone.')
