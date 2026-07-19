// StoryGlue stage 3: run AFTER chapter 1 is finalized. The Lead Editor
// scopes the rest of the book against the actual finished Chapter 1
// (canon), not the original pre-prose plot pitch. Real product framing:
// this is also the natural "unlock the rest of the book" purchase moment
// if this pipeline goes live - chapter 1 free, outline as the pitch.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateOutlineAfterChapter1 } from '../lib/pipeline/storyglue-outline.js'

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
if (!bookFolder || !winnerKey) {
  console.error('Usage: node scripts/storyglue-outline.mjs <book-folder> <winner-key>')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookFolder)
const { bigAnswer, plots } = JSON.parse(fs.readFileSync(path.join(bookDir, 'plots.json'), 'utf8'))
const winningPlot = plots.find((p) => p.key === winnerKey).plot
const chapter1Text = fs.readFileSync(path.join(bookDir, 'chapter-01.md'), 'utf8').replace(/^# Chapter 1\n\n/, '')

console.log('=== Lead Editor scoping the rest of the book ===')
const outline = await generateOutlineAfterChapter1({ bigAnswer, winningPlot, chapter1Text, editorKey: winnerKey, keys })
fs.writeFileSync(path.join(bookDir, 'outline.json'), JSON.stringify(outline, null, 2))

console.log(`\n"${outline.title}" - ${outline.chapters.length} more chapters`)
outline.chapters.forEach((c) => console.log(`  ${c.number}. ${c.title}`))
console.log(`\nOutline -> ${path.join(bookDir, 'outline.json')}`)
