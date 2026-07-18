import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const bookSlug = process.argv[2]
if (!bookSlug) {
  console.error('Usage: node scripts/build-site.mjs <book-folder-name>')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookSlug)
const outline = JSON.parse(fs.readFileSync(path.join(bookDir, 'outline.json'), 'utf8'))
const imageManifest = JSON.parse(fs.readFileSync(path.join(bookDir, 'images', 'manifest.json'), 'utf8'))
const imageByChapter = Object.fromEntries(imageManifest.images.map((i) => [i.chapter, i.filename]))

const siteDir = path.join(bookDir, 'site')
fs.mkdirSync(path.join(siteDir, 'images'), { recursive: true })
for (const img of imageManifest.images) {
  fs.copyFileSync(path.join(bookDir, 'images', img.filename), path.join(siteDir, 'images', img.filename))
}
fs.copyFileSync(path.join(ROOT, 'lib', 'site', 'style.css'), path.join(siteDir, 'style.css'))

function paragraphs(text) {
  return text.trim().split(/\n{2,}/).map((p) => `<p>${p.trim()}</p>`).join('\n')
}

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
${body}
</body>
</html>
`
}

// Home page: hero (reference portrait as backdrop), premise, contents CTA.
fs.writeFileSync(path.join(siteDir, 'index.html'), page(outline.title, `
<div class="hero">
  <img src="images/${imageByChapter[0]}" alt="${outline.title}">
  <div class="hero-text">
    <h1>${outline.title}</h1>
    <div class="sub">${outline.premise}</div>
  </div>
</div>
<div class="wrap">
  <blockquote class="review-quote">
    "A fantastic, gritty reimagining of Moby-Dick... tightly woven and delivers a deeply satisfying conclusion that honors the source material while fully committing to its unique 1985 industrial-tech aesthetic."
    <cite>— Gemini, reviewing the finished manuscript independently</cite>
  </blockquote>
  <a class="read-cta" href="contents.html"><span class="cta">Begin Reading</span></a>
  <footer>unread.ink — a book written by a council of models</footer>
</div>
`))

// Contents page.
const tocItems = outline.chapters.map((c) => `<li><a href="chapter-${String(c.number).padStart(2, '0')}.html"><span class="toc-num">${String(c.number).padStart(2, '0')}</span>${c.title}</a></li>`).join('\n')
fs.writeFileSync(path.join(siteDir, 'contents.html'), page(`Contents — ${outline.title}`, `
<div class="wrap">
  <div class="story-bar"><a href="index.html">&larr; ${outline.title}</a></div>
  <div class="chapter-heading">Contents</div>
  <ul class="toc">
    ${tocItems}
  </ul>
</div>
`))

// One page per chapter.
for (const chapter of outline.chapters) {
  const num = String(chapter.number).padStart(2, '0')
  const chapterText = fs.readFileSync(path.join(bookDir, `chapter-${num}.md`), 'utf8').replace(/^#[^\n]*\n\n/, '')
  const prev = outline.chapters.find((c) => c.number === chapter.number - 1)
  const next = outline.chapters.find((c) => c.number === chapter.number + 1)
  const image = imageByChapter[chapter.number]

  const body = `
<div class="wrap">
  <div class="story-bar">
    <a href="contents.html">&larr; Contents</a>
    <span>${outline.title}</span>
  </div>
  <div class="chapter-heading">Chapter ${chapter.number}</div>
  <h1 class="chapter-title">${chapter.title}</h1>
  ${image ? `<figure class="chapter-image"><img src="images/${image}" alt="${chapter.title}"></figure>` : ''}
  ${paragraphs(chapterText)}
  <div class="page-nav">
    ${prev ? `<a href="chapter-${String(prev.number).padStart(2, '0')}.html">&larr; ${prev.title}</a>` : '<span class="spacer"></span>'}
    ${next ? `<a class="next" href="chapter-${String(next.number).padStart(2, '0')}.html">${next.title} &rarr;</a>` : `<a class="next" href="contents.html">Contents &rarr;</a>`}
  </div>
</div>
`
  fs.writeFileSync(path.join(siteDir, `chapter-${num}.html`), page(`${chapter.title} — ${outline.title}`, body))
}

console.log(`Site built: ${siteDir}`)
console.log(`  ${outline.chapters.length + 2} pages, ${imageManifest.images.length} images`)
