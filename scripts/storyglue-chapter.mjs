// StoryGlue stage 4: writes chapter 2+ against the post-chapter-1 outline
// (storyglue-outline.mjs), reusing the same writer-relay -> Xlectic
// critique -> Lead Editor rewrite pipeline as chapter 1. No images this
// pass - text quality first, illustration already proven to work
// decently on top of a finished chapter.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { relayWriteChapterChecked } from '../lib/pipeline/storyglue-write.js'
import { critiqueChapter } from '../lib/pipeline/editorial.js'
import { leadEditChapter } from '../lib/pipeline/leadEdit.js'

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
const chapterNum = parseInt(process.argv[4], 10)
if (!bookFolder || !winnerKey || !chapterNum) {
  console.error('Usage: node scripts/storyglue-chapter.mjs <book-folder> <winner-key> <chapter-num>')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookFolder)
const { bigAnswer, plots } = JSON.parse(fs.readFileSync(path.join(bookDir, 'plots.json'), 'utf8'))
const winningPlot = plots.find((p) => p.key === winnerKey).plot
const outline = JSON.parse(fs.readFileSync(path.join(bookDir, 'outline.json'), 'utf8'))
const chapterMeta = outline.chapters.find((c) => c.number === chapterNum)
if (!chapterMeta) throw new Error(`No outline entry for chapter ${chapterNum}`)

let priorChapters = ''
for (let n = 1; n < chapterNum; n++) {
  const numStr = String(n).padStart(2, '0')
  const text = fs.readFileSync(path.join(bookDir, `chapter-${numStr}.md`), 'utf8').replace(/^# Chapter \d+[^\n]*\n\n/, '')
  priorChapters += `--- Chapter ${n} ---\n${text}\n\n`
}

console.log(`Book: ${bookFolder}`)
console.log(`Chapter ${chapterNum}: ${chapterMeta.title}\n`)

console.log(`=== Writer relay: Chapter ${chapterNum} (Gemini + ChatGPT write, Claude checks continuity) ===`)
const draft = await relayWriteChapterChecked({
  bigAnswer,
  winningPlot,
  chapterNum,
  chapterTitle: chapterMeta.title,
  chapterSummary: chapterMeta.summary,
  priorChapters,
  keys,
})
fs.writeFileSync(path.join(bookDir, `chapter-${String(chapterNum).padStart(2, '0')}-draft.md`), draft)

console.log('\n=== Xlectic editorial pass (critique only) ===')
const notes = await critiqueChapter(draft, keys)
fs.writeFileSync(path.join(bookDir, `editorial-notes-${String(chapterNum).padStart(2, '0')}.json`), JSON.stringify(notes, null, 2))
notes.forEach((n) => console.log(`  ${n.name} (${n.title}): ${n.note.slice(0, 100)}...`))

console.log('\n=== Lead Editor rewrite ===')
const final = await leadEditChapter({ draft, notes, editorKey: winnerKey, keys })
fs.writeFileSync(path.join(bookDir, `chapter-${String(chapterNum).padStart(2, '0')}.md`), `# Chapter ${chapterNum}: ${chapterMeta.title}\n\n${final}\n`)

console.log(`\nDone. Chapter ${chapterNum} -> ${path.join(bookDir, `chapter-${String(chapterNum).padStart(2, '0')}.md`)}`)
