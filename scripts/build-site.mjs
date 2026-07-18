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

// A chapter is "ready" once it has the real scene-based illustration
// pass - until then it's the old lower-quality prose/single-image
// version and stays unpublished (Contents shows it as Coming Soon,
// no page gets built for it) rather than shipping something below the
// bar next to something that's actually good.
function isReady(chapterNum) {
  return fs.existsSync(path.join(bookDir, `scenes-${String(chapterNum).padStart(2, '0')}`, 'scenes.json'))
}

// Contents page.
const tocItems = outline.chapters.map((c) => {
  const num = String(c.number).padStart(2, '0')
  if (isReady(c.number)) return `<li><a href="chapter-${num}.html"><span class="toc-num">${num}</span>${c.title}</a></li>`
  return `<li class="toc-pending"><span class="toc-num">${num}</span>${c.title}<span class="toc-soon">Coming Soon</span></li>`
}).join('\n')
fs.writeFileSync(path.join(siteDir, 'contents.html'), page(`Contents — ${outline.title}`, `
<div class="wrap">
  <div class="story-bar"><a href="index.html">&larr; ${outline.title}</a></div>
  <div class="chapter-heading">Contents</div>
  <ul class="toc">
    ${tocItems}
  </ul>
</div>
`))

// One page per READY chapter only - unready chapters get no HTML at all
// while they're Coming Soon, not just an unlinked page someone could
// still stumble onto directly.
const readyChapters = outline.chapters.filter((c) => isReady(c.number))
for (const chapter of readyChapters) {
  const num = String(chapter.number).padStart(2, '0')
  const prev = readyChapters.find((c) => c.number === chapter.number - 1)
  const next = readyChapters.find((c) => c.number === chapter.number + 1)

  const scenesPath = path.join(bookDir, `scenes-${num}`, 'scenes.json')
  const scenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8'))
  fs.mkdirSync(path.join(siteDir, 'images'), { recursive: true })
  for (const s of scenes) {
    if (s.filename) fs.copyFileSync(path.join(bookDir, `scenes-${num}`, s.filename), path.join(siteDir, 'images', s.filename))
  }
  const mainContent = scenes.map((s) => `
  <section class="scene">
    ${s.filename ? `<div class="scene-image"><img src="images/${s.filename}" alt="${s.imageDescription}"></div>` : '<div class="scene-image"></div>'}
    <div class="scene-text">${paragraphs(s.text)}</div>
  </section>`).join('\n')

  const body = `
<div class="wrap">
  <div class="story-bar">
    <a href="contents.html">&larr; Contents</a>
    <span>${outline.title}</span>
  </div>
  <div class="chapter-heading">Chapter ${chapter.number}</div>
  <h1 class="chapter-title">${chapter.title}</h1>
  ${mainContent}
  <div class="page-nav">
    ${prev ? `<a href="chapter-${String(prev.number).padStart(2, '0')}.html">&larr; ${prev.title}</a>` : '<span class="spacer"></span>'}
    ${next ? `<a class="next" href="chapter-${String(next.number).padStart(2, '0')}.html">${next.title} &rarr;</a>` : `<a class="next" href="contents.html">Contents &rarr;</a>`}
  </div>
</div>
`
  fs.writeFileSync(path.join(siteDir, `chapter-${num}.html`), page(`${chapter.title} — ${outline.title}`, body))
}

console.log(`Site built: ${siteDir}`)
console.log(`  ${readyChapters.length + 2} pages (${readyChapters.length}/${outline.chapters.length} chapters ready), ${imageManifest.images.length} images`)
