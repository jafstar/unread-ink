import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const bookSlug = process.argv[2]
// --text-ok: a chapter with finished prose but no scene-illustration pass
// still counts as "ready" (StoryGlue's bigfoot/bears book - Mayor's call
// was "publish text now, images can wait, we know those work decently").
// Default (flag absent) preserves the original Moby Dick book's stricter
// gating unchanged: unillustrated chapters there are hidden for a
// different reason (known prose-quality issues, not just missing images).
const textOk = process.argv.includes('--text-ok')
if (!bookSlug) {
  console.error('Usage: node scripts/build-site.mjs <book-folder-name> [--text-ok]')
  process.exit(1)
}

const bookDir = path.join(ROOT, 'books', bookSlug)
const outline = JSON.parse(fs.readFileSync(path.join(bookDir, 'outline.json'), 'utf8'))
const manifestPath = path.join(bookDir, 'images', 'manifest.json')
// Books built via the old per-chapter-hero-image pipeline have this
// manifest; StoryGlue books (reference image + optional per-scene
// illustration) don't - fall back to the reference portrait as the hero.
const imageManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null
const imageByChapter = imageManifest ? Object.fromEntries(imageManifest.images.map((i) => [i.chapter, i.filename])) : {}
const bookImagesDir = path.join(bookDir, 'images')
const bookImages = fs.existsSync(bookImagesDir) ? fs.readdirSync(bookImagesDir) : []
// A real generated cover (storyglue-cover.mjs) beats the raw reference
// portrait as the hero/library-thumbnail image when one exists.
const coverImageFile = bookImages.find((f) => f.startsWith('cover.'))
const refImageFile = bookImages.find((f) => f.startsWith('0-reference'))
const heroImage = imageByChapter[0] || coverImageFile || refImageFile

// StoryGlue's outline.json (storyglue-outline.js) has no top-level
// "premise" field, unlike the old pipeline's outline.js - it only scopes
// chapters AFTER chapter 1, chapter 1 already having its own plot pitch.
// Fall back to that pitch's "Premise:" line rather than rendering the
// literal string "undefined" on the homepage.
let premise = outline.premise
if (!premise) {
  const plotsPath = path.join(bookDir, 'plots.json')
  if (fs.existsSync(plotsPath)) {
    const { plots } = JSON.parse(fs.readFileSync(plotsPath, 'utf8'))
    const winnerKeyArg = process.argv.find((a) => a.startsWith('--winner='))?.split('=')[1]
    const winningPlot = (winnerKeyArg && plots.find((p) => p.key === winnerKeyArg)) || plots[0]
    const m = winningPlot?.plot.match(/\*\*Premise:\*\*\s*([^\n]+)/)
    premise = m ? m[1].trim() : ''
  } else {
    premise = ''
  }
}

const siteDir = path.join(bookDir, 'site')
fs.mkdirSync(path.join(siteDir, 'images'), { recursive: true })
if (imageManifest) {
  for (const img of imageManifest.images) {
    fs.copyFileSync(path.join(bookDir, 'images', img.filename), path.join(siteDir, 'images', img.filename))
  }
} else if (refImageFile || coverImageFile) {
  if (refImageFile) fs.copyFileSync(path.join(bookDir, 'images', refImageFile), path.join(siteDir, 'images', refImageFile))
  if (coverImageFile) fs.copyFileSync(path.join(bookDir, 'images', coverImageFile), path.join(siteDir, 'images', coverImageFile))
}
fs.copyFileSync(path.join(ROOT, 'lib', 'site', 'style.css'), path.join(siteDir, 'style.css'))

// Optional per-book review pull-quote (books/<slug>/review.json: {quote, cite})
// - the old Moby Dick homepage hardcoded a Gemini quote about that specific
// book; genuinely optional now so a new book without a review doesn't ship
// someone else's blurb.
const reviewPath = path.join(bookDir, 'review.json')
const review = fs.existsSync(reviewPath) ? JSON.parse(fs.readFileSync(reviewPath, 'utf8')) : null

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
  ${heroImage ? `<img src="images/${heroImage}" alt="${outline.title}">` : ''}
  <div class="hero-text">
    <h1>${outline.title}</h1>
    <div class="sub">${premise}</div>
  </div>
</div>
<div class="wrap">
  ${review ? `<blockquote class="review-quote">
    "${review.quote}"
    <cite>— ${review.cite}</cite>
  </blockquote>` : ''}
  <a class="read-cta" href="contents.html"><span class="cta">Begin Reading</span></a>
  <footer>unread.ink — a book written by a council of models</footer>
</div>
`))

// A chapter with the real scene-based illustration pass is always ready.
// With --text-ok, a chapter with finished prose but no illustration is
// ALSO ready (rendered without images) - see the flag comment above for
// why this doesn't apply by default.
function isReady(chapterNum) {
  const num = String(chapterNum).padStart(2, '0')
  if (fs.existsSync(path.join(bookDir, `scenes-${num}`, 'scenes.json'))) return true
  return textOk && fs.existsSync(path.join(bookDir, `chapter-${num}.md`))
}

// Books whose outline was written AFTER chapter 1 (storyglue-outline.js -
// "do not include Chapter 1, it is already done") never have a chapter 1
// entry in outline.chapters at all, unlike the original all-up-front
// Moby Dick pipeline where chapter 1 IS entry #1. Synthesize one so
// chapter 1 still gets a real page instead of silently never being built.
const allChapters = outline.chapters.some((c) => c.number === 1)
  ? outline.chapters
  : [{ number: 1, title: 'The Hemlock', summary: '' }, ...outline.chapters]

// Contents page.
const tocItems = allChapters.map((c) => {
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
const readyChapters = allChapters.filter((c) => isReady(c.number))
for (const chapter of readyChapters) {
  const num = String(chapter.number).padStart(2, '0')
  const prev = readyChapters.find((c) => c.number === chapter.number - 1)
  const next = readyChapters.find((c) => c.number === chapter.number + 1)

  const scenesPath = path.join(bookDir, `scenes-${num}`, 'scenes.json')
  let mainContent
  if (fs.existsSync(scenesPath)) {
    const scenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8'))
    fs.mkdirSync(path.join(siteDir, 'images'), { recursive: true })
    for (const s of scenes) {
      if (s.filename) fs.copyFileSync(path.join(bookDir, `scenes-${num}`, s.filename), path.join(siteDir, 'images', s.filename))
    }
    mainContent = scenes.map((s) => `
  <section class="scene">
    ${s.filename ? `<div class="scene-image"><img src="images/${s.filename}" alt="${s.imageDescription}"></div>` : '<div class="scene-image"></div>'}
    <div class="scene-text">${paragraphs(s.text)}</div>
  </section>`).join('\n')
  } else {
    // Text-only chapter (--text-ok, no scene-illustration pass yet) -
    // strip the "# Chapter N: Title" heading the pipeline writes into the
    // .md file, since the page already renders its own heading above.
    const raw = fs.readFileSync(path.join(bookDir, `chapter-${num}.md`), 'utf8').replace(/^#[^\n]*\n\n/, '')
    mainContent = `<div class="chapter-text">${paragraphs(raw)}</div>`
  }

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

const imageCount = imageManifest ? imageManifest.images.length : fs.readdirSync(path.join(siteDir, 'images')).length
console.log(`Site built: ${siteDir}`)
console.log(`  ${readyChapters.length + 2} pages (${readyChapters.length}/${allChapters.length} chapters ready), ${imageCount} images`)
