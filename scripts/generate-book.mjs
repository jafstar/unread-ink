import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateOutline } from '../lib/pipeline/outline.js'
import { writeChapter } from '../lib/pipeline/write.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const keys = {
  radium: process.env.RADIUM_API_KEY,
  chatgpt: process.env.CHATGPT_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
}

const CONCEPT = process.argv[2] || 'Moby Dick, reimagined in the 1980s - same obsession, same sea, same white whale, but Ahab is now hunting it in an era of satellite tracking, cassette tapes, and a whaling world already living under the shadow of the 1986 international moratorium. Keep the core cast and the core tragedy; change the era, the technology, and the cultural texture around them.'

const slug = CONCEPT.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const OUT_DIR = path.join(ROOT, 'books', `${Date.now()}-${slug}`)
fs.mkdirSync(OUT_DIR, { recursive: true })

console.log(`Concept: ${CONCEPT}\n`)
console.log('=== Outline stage (Radium -> ChatGPT) ===')
const outline = await generateOutline(CONCEPT, keys)
fs.writeFileSync(path.join(OUT_DIR, 'outline.json'), JSON.stringify(outline, null, 2))
console.log(`\n"${outline.title}" - ${outline.chapters.length} chapters`)
outline.chapters.forEach((c) => console.log(`  ${c.number}. ${c.title}`))

console.log('\n=== Writing stage (Gemini -> Claude), one chapter at a time ===')
let priorSummary = ''
const chapterTexts = []
for (const chapter of outline.chapters) {
  console.log(`\nChapter ${chapter.number}: ${chapter.title}`)
  const text = await writeChapter({ outline, chapter, priorSummary, keys })
  chapterTexts.push({ number: chapter.number, title: chapter.title, text })
  fs.writeFileSync(path.join(OUT_DIR, `chapter-${String(chapter.number).padStart(2, '0')}.md`), `# ${chapter.title}\n\n${text}\n`)
  // Rolling context for the next chapter: prior chapters' OUTLINE summaries
  // (already written, no extra summarization call needed), not the full
  // prose - keeps the prompt from growing unbounded as the book gets long.
  priorSummary += `Chapter ${chapter.number} ("${chapter.title}"): ${chapter.summary}\n`
  console.log(`  -> ${text.split(/\s+/).length} words`)
}

const fullBook = [
  `# ${outline.title}`,
  '',
  outline.premise,
  '',
  ...chapterTexts.map((c) => `## ${c.number}. ${c.title}\n\n${c.text}`),
].join('\n\n')
fs.writeFileSync(path.join(OUT_DIR, 'full-book.md'), fullBook)

console.log(`\nDone. ${chapterTexts.length}/${outline.chapters.length} chapters written to ${OUT_DIR}`)
