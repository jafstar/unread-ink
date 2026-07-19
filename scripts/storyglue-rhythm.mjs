// Real pacing analysis, whole-book report - read-only, never touches the
// book itself. Core measurement logic lives in lib/pipeline/rhythmAnalysis.js,
// shared with the live syncopation feedback loop (storyglue-chapter.mjs).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { analyzeChapterText } from '../lib/pipeline/rhythmAnalysis.js'
import { parseChapterTitle } from '../lib/pipeline/chapterTitle.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const bookFolder = process.argv[2]
if (!bookFolder) {
  console.error('Usage: node scripts/storyglue-rhythm.mjs <book-folder>')
  process.exit(1)
}
const bookDir = path.join(ROOT, 'books', bookFolder)
const outline = JSON.parse(fs.readFileSync(path.join(bookDir, 'outline.json'), 'utf8'))

const chapterFiles = fs.readdirSync(bookDir).filter((f) => /^chapter-\d+\.md$/.test(f)).sort()

const timeline = []
let globalParaIndex = 0
const chapterStats = []

for (const file of chapterFiles) {
  const num = parseInt(file.match(/chapter-(\d+)\.md/)[1], 10)
  const fullText = fs.readFileSync(path.join(bookDir, file), 'utf8')
  const meta = outline.chapters.find((c) => c.number === num)
  const title = meta ? meta.title : parseChapterTitle(fullText, num)
  const raw = fullText.replace(/^#[^\n]*\n\n/, '')
  const analysis = analyzeChapterText(raw)
  const startParaIndex = globalParaIndex

  for (const p of analysis.paragraphs) {
    timeline.push({ chapter: num, chapterTitle: title, paraIndex: globalParaIndex, ...p })
    globalParaIndex++
  }

  chapterStats.push({
    number: num,
    title,
    paragraphCount: analysis.paragraphCount,
    wordCount: analysis.wordCount,
    avgPace: analysis.avgPace,
    shape: analysis.shape,
    startParaIndex,
    endParaIndex: globalParaIndex - 1,
  })
}

const output = { book: outline.title, totalParagraphs: timeline.length, chapters: chapterStats, timeline }
fs.writeFileSync(path.join(bookDir, 'rhythm-analysis.json'), JSON.stringify(output, null, 2))

console.log(`Analyzed ${chapterFiles.length} chapters, ${timeline.length} paragraphs -> rhythm-analysis.json\n`)
chapterStats.forEach((c) => console.log(`  Ch${c.number} "${c.title}": ${c.paragraphCount} paras, ${c.wordCount} words, avg pace ${c.avgPace}, shape: ${c.shape.pattern}`))
