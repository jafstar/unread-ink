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
import { checkContinuity } from '../lib/pipeline/continuityCheck.js'
import { analyzeChapterText } from '../lib/pipeline/rhythmAnalysis.js'

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
let earlierChapters = ''
let previousChapter = ''
for (let n = 1; n < chapterNum; n++) {
  const numStr = String(n).padStart(2, '0')
  const text = fs.readFileSync(path.join(bookDir, `chapter-${numStr}.md`), 'utf8').replace(/^# Chapter \d+[^\n]*\n\n/, '')
  priorChapters += `--- Chapter ${n} ---\n${text}\n\n`
  // Mayor's fix, live-caught reading the finished book: the immediately-
  // previous chapter is split out from everything earlier - see
  // continuityCheck.js for why the split matters (chapter 10 re-narrated
  // chapter 9's cave-recap almost verbatim, buried in an undifferentiated
  // 8-chapter blob the checker didn't weight correctly).
  if (n === chapterNum - 1) previousChapter = text
  else earlierChapters += `--- Chapter ${n} ---\n${text}\n\n`
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
  intendedPace: chapterMeta.intendedPace,
  priorChapters,
  previousChapter,
  earlierChapters,
  keys,
})
fs.writeFileSync(path.join(bookDir, `chapter-${String(chapterNum).padStart(2, '0')}-draft.md`), draft)

console.log('\n=== Xlectic editorial pass (critique only) ===')
const notes = await critiqueChapter(draft, keys)
fs.writeFileSync(path.join(bookDir, `editorial-notes-${String(chapterNum).padStart(2, '0')}.json`), JSON.stringify(notes, null, 2))
notes.forEach((n) => console.log(`  ${n.name} (${n.title}): ${n.note.slice(0, 100)}...`))

console.log('\n=== Lead Editor rewrite ===')
const leadEdited = await leadEditChapter({ draft, notes, editorKey: winnerKey, keys })

// Real bug found live (chapters 9/10): the Lead Editor's rewrite is the
// actual text that ships, but until now it was never re-checked - the
// continuity checker only ran during the writer relay, BEFORE Xlectic and
// the Lead Editor touched anything. Chapter 10 shipped with ~60 lines
// re-narrating chapter 9's entire cave-recap almost verbatim, because
// nothing verified the Lead Editor's own output. One more pass, same
// checker, on the actual final text.
console.log('\n=== Final continuity check (post-Lead-Editor) ===')
const final = await checkContinuity({ draft: leadEdited, winningPlot, previousChapter, earlierChapters, chapterTitle: chapterMeta.title, chapterSummary: chapterMeta.summary, apiKey: keys.claude })

fs.writeFileSync(path.join(bookDir, `chapter-${String(chapterNum).padStart(2, '0')}.md`), `# Chapter ${chapterNum}: ${chapterMeta.title}\n\n${final}\n`)

// Syncopation plan-vs-actual: the outline declared an intendedPace for
// this chapter (storyglue-outline.js); this measures what actually got
// written and logs the comparison, so the loop is verifiable, not just
// asserted. Real data, appended per-chapter, not overwritten - the point
// is a growing record, same as editorial-notes-*.json.
if (chapterMeta.intendedPace) {
  const actual = analyzeChapterText(final)
  const paceLabel = actual.avgPace >= 0.55 ? 'high' : actual.avgPace <= 0.42 ? 'low' : 'medium'
  const matched = paceLabel === chapterMeta.intendedPace
  const logPath = path.join(bookDir, 'syncopation-log.json')
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : []
  const withoutThis = log.filter((l) => l.chapter !== chapterNum)
  withoutThis.push({ chapter: chapterNum, title: chapterMeta.title, intendedPace: chapterMeta.intendedPace, measuredPace: actual.avgPace, measuredLabel: paceLabel, matched })
  withoutThis.sort((a, b) => a.chapter - b.chapter)
  fs.writeFileSync(logPath, JSON.stringify(withoutThis, null, 2))
  console.log(`\n=== Syncopation check ===`)
  console.log(`  Intended: ${chapterMeta.intendedPace} | Measured: ${paceLabel} (${actual.avgPace}) | ${matched ? 'MATCHED' : 'DRIFTED'}`)
}

console.log(`\nDone. Chapter ${chapterNum} -> ${path.join(bookDir, `chapter-${String(chapterNum).padStart(2, '0')}.md`)}`)
