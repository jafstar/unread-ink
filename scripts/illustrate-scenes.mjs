// Great Illustrated Classics format, real pipeline step: splits one
// chapter into its real narrative scenes (lib/pipeline/scenes.js), then
// generates one image per scene - reference-conditioned against the
// locked protagonist (Flux) when the scene actually has a character in
// it, plain prompt-only (Gemini) when it's pure setting/atmosphere with
// nobody in frame. Test run: chapter 1 only, not the whole book - proving
// the format before spending the time/API cost on all 10 chapters.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { splitIntoScenes } from '../lib/pipeline/scenes.js'
import { callClaude } from '../lib/models/claude.js'
import { generateGeminiImage } from '../lib/models/gemini-image.js'
import { generateFluxImage } from '../lib/models/flux-image.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const claudeKey = process.env.ANTHROPIC_API_KEY
const geminiKey = process.env.GEMINI_API_KEY
const fluxKey = process.env.BFL_API_KEY

const DEFAULT_STYLE = 'moody 1980s maritime illustration style, muted teal and rust color palette, grainy textured linework, dramatic overcast lighting, evocative of gritty 80s documentary photography crossed with classic nautical woodcut illustration'

const bookFolder = process.argv[2]
const chapterNum = process.argv[3] || '01'
const STYLE = process.argv[4] || DEFAULT_STYLE
if (!bookFolder) {
  console.error('Usage: node scripts/illustrate-scenes.mjs <book-folder> [chapter-num] [style]')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookFolder)
const chapterText = fs.readFileSync(path.join(bookDir, `chapter-${chapterNum}.md`), 'utf8').replace(/^#[^\n]*\n\n/, '')

async function withRetries(fn, label, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      console.error(`    ${label} attempt ${i}/${attempts} failed: ${e.message}`)
      if (i === attempts) throw e
    }
  }
}

function saveImage(dataUrl, filepath) {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const finalPath = `${filepath}.${ext}`
  fs.writeFileSync(finalPath, Buffer.from(match[2], 'base64'))
  return path.basename(finalPath)
}

console.log(`Splitting Chapter ${chapterNum} into scenes (Claude)...`)
const scenes = await splitIntoScenes(chapterText, callClaude, claudeKey)
console.log(`  -> ${scenes.length} scenes`)

const scenesDir = path.join(bookDir, `scenes-${chapterNum}`)
fs.mkdirSync(scenesDir, { recursive: true })

const refPath = path.join(bookDir, 'images', fs.readdirSync(path.join(bookDir, 'images')).find((f) => f.startsWith('0-reference')))
const refBuf = fs.readFileSync(refPath)
const refExt = path.extname(refPath).slice(1)
const refDataUrl = `data:image/${refExt};base64,${refBuf.toString('base64')}`

const results = []
for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  const num = String(i + 1).padStart(2, '0')
  console.log(`Scene ${num}: ${scene.hasCharacter ? 'Flux (reference-conditioned)' : 'Gemini (setting only)'} - ${scene.imageDescription}`)
  try {
    const dataUrl = await withRetries(
      () => scene.hasCharacter
        ? generateFluxImage(`${scene.imageDescription}, ${STYLE}`, refDataUrl, fluxKey)
        : generateGeminiImage(`${scene.imageDescription}, ${STYLE}`, geminiKey),
      `scene ${num}`
    )
    const filename = saveImage(dataUrl, path.join(scenesDir, `scene-${num}`))
    console.log(`  -> ${filename}`)
    results.push({ scene: i + 1, text: scene.text, imageDescription: scene.imageDescription, hasCharacter: scene.hasCharacter, filename })
  } catch (e) {
    console.error(`  Scene ${num} failed after retries, skipping image: ${e.message}`)
    results.push({ scene: i + 1, text: scene.text, imageDescription: scene.imageDescription, hasCharacter: scene.hasCharacter, filename: null })
  }
}

fs.writeFileSync(path.join(scenesDir, 'scenes.json'), JSON.stringify(results, null, 2))
console.log(`\nDone. ${results.filter((r) => r.filename).length}/${scenes.length} scene images -> ${scenesDir}`)
