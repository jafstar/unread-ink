// Pass 2: run once a book is fully drafted. Reads the whole manuscript at
// once and reports repeated sentence-level constructions/rhythms - see
// lib/pipeline/passTwo.js for why this can't be done per-chapter.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { runPassTwo } from '../lib/pipeline/passTwo.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const envPath = path.join(ROOT, '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
}

const bookFolder = process.argv[2]
// Optional "1-3" style range - lets a run be scoped to match what a
// specific outside review actually covered, for a real apples-to-apples
// comparison, instead of always auditing the whole book.
const rangeArg = process.argv[3]
if (!bookFolder) {
  console.error('Usage: node scripts/storyglue-pass2.mjs <book-folder> [chapter-range e.g. 1-3]')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookFolder)
const outline = fs.existsSync(path.join(bookDir, 'outline.json'))
  ? JSON.parse(fs.readFileSync(path.join(bookDir, 'outline.json'), 'utf8'))
  : { title: bookFolder }

let chapterFiles = fs.readdirSync(bookDir).filter((f) => /^chapter-\d+\.md$/.test(f)).sort()
if (rangeArg) {
  const [lo, hi] = rangeArg.split('-').map(Number)
  chapterFiles = chapterFiles.filter((f) => {
    const n = parseInt(f.match(/chapter-(\d+)\.md/)[1], 10)
    return n >= lo && n <= (hi || lo)
  })
}
const allChaptersText = chapterFiles.map((f) => fs.readFileSync(path.join(bookDir, f), 'utf8')).join('\n\n---\n\n')

console.log(`Book: ${outline.title}`)
console.log(`Auditing ${chapterFiles.length} chapters (${allChaptersText.split(/\s+/).length} words)...\n`)

const result = await runPassTwo({ bookTitle: outline.title, allChaptersText, apiKey: process.env.ANTHROPIC_API_KEY })

const suffix = rangeArg ? `-ch${rangeArg}` : ''
fs.writeFileSync(path.join(bookDir, `pass2-report${suffix}.json`), JSON.stringify(result, null, 2))

const md = [
  `# Pass 2 report — ${outline.title}${rangeArg ? ` (chapters ${rangeArg})` : ''}`,
  '',
  result.summary,
  '',
  ...result.findings.map((f) => [
    `## ${f.pattern}`,
    `**Severity:** ${f.severity} — **~${f.approximateCount} occurrences**`,
    '',
    ...f.examples.map((e) => `> Ch. ${e.chapter}: "${e.quote}"`),
    '',
  ].join('\n')),
].join('\n')
fs.writeFileSync(path.join(bookDir, `pass2-report${suffix}.md`), md)

console.log(`\n${result.findings.length} pattern(s) found:\n`)
result.findings.forEach((f) => console.log(`  [${f.severity}] ${f.pattern} (~${f.approximateCount}x)`))
console.log(`\nFull report -> ${path.join(bookDir, `pass2-report${suffix}.md`)}`)
