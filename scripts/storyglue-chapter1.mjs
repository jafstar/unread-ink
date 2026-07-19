// StoryGlue stage 2: given a winning plot from storyglue-plots.mjs, runs
// the full Round Table pipeline for Chapter 1 only - writer relay (the 3
// non-winning knights, in sequence) -> Xlectic critique (Portia/Horatio/
// Quixote, notes only) -> Lead Editor rewrite (the winning knight, using
// those notes) -> a protagonist reference image, ready for
// illustrate-scenes.mjs to pick up.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { KNIGHT_ORDER } from '../lib/pipeline/knights.js'
import { relayWriteChapter1 } from '../lib/pipeline/storyglue-write.js'
import { critiqueChapter } from '../lib/pipeline/editorial.js'
import { leadEditChapter } from '../lib/pipeline/leadEdit.js'
import { callClaude } from '../lib/models/claude.js'
import { generateGeminiImage } from '../lib/models/gemini-image.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const keys = {
  claude: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  chatgpt: process.env.CHATGPT_API_KEY,
  radium: process.env.RADIUM_API_KEY,
}

const bookFolder = process.argv[2]
const winnerKey = process.argv[3]
if (!bookFolder || !winnerKey || !KNIGHT_ORDER.includes(winnerKey)) {
  console.error(`Usage: node scripts/storyglue-chapter1.mjs <book-folder> <winner-key: ${KNIGHT_ORDER.join('|')}>`)
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookFolder)
const { bigAnswer, plots } = JSON.parse(fs.readFileSync(path.join(bookDir, 'plots.json'), 'utf8'))
const winningPlot = plots.find((p) => p.key === winnerKey)
if (!winningPlot) throw new Error(`No plot found for key "${winnerKey}"`)
const writerKeys = KNIGHT_ORDER.filter((k) => k !== winnerKey)

console.log(`Book: ${bookFolder}`)
console.log(`Lead Editor: ${winningPlot.label}`)
console.log(`Writers: ${writerKeys.join(', ')}\n`)

console.log('=== Writer relay: Chapter 1 ===')
const draft = await relayWriteChapter1({ winningPlot: winningPlot.plot, bigAnswer, writerKeys, keys })
fs.writeFileSync(path.join(bookDir, 'chapter-01-draft.md'), draft)

console.log('\n=== Xlectic editorial pass (critique only) ===')
const notes = await critiqueChapter(draft, keys)
fs.writeFileSync(path.join(bookDir, 'editorial-notes.json'), JSON.stringify(notes, null, 2))
notes.forEach((n) => console.log(`  ${n.name} (${n.title}): ${n.note.slice(0, 100)}...`))

console.log('\n=== Lead Editor rewrite ===')
const final = await leadEditChapter({ draft, notes, editorKey: winnerKey, keys })
fs.writeFileSync(path.join(bookDir, 'chapter-01.md'), `# Chapter 1\n\n${final}\n`)

console.log('\n=== Protagonist reference image ===')
const charDescription = await callClaude(
  `Winning plot:\n\n${winningPlot.plot}\n\nFinal chapter 1:\n\n${final}\n\nWrite ONE plain, concrete visual description of the protagonist for an illustrator - appearance, clothing, a couple of defining physical details. No plot, no personality, just what they look like. 1-2 sentences.`,
  'You are a visual/casting consultant. Output only the description, no preamble, no markdown.',
  keys.claude
)
console.log(`  Protagonist: ${charDescription}`)

const imagesDir = path.join(bookDir, 'images')
fs.mkdirSync(imagesDir, { recursive: true })
const refDataUrl = await generateGeminiImage(`${charDescription.trim()}, standing portrait, plain neutral background, front-facing, single character`, keys.gemini)
const refMatch = refDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
const refExt = refMatch[1] === 'jpeg' ? 'jpg' : refMatch[1]
fs.writeFileSync(path.join(imagesDir, `0-reference.${refExt}`), Buffer.from(refMatch[2], 'base64'))

console.log(`\nDone. Chapter 1 -> ${path.join(bookDir, 'chapter-01.md')}`)
console.log(`Reference image -> ${path.join(imagesDir, `0-reference.${refExt}`)}`)
console.log(`\nNext: node scripts/illustrate-scenes.mjs ${bookFolder} 01`)
