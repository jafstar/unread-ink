// Copies a generated book's site/ into public/books/<slug>/ (the actual
// Vercel deploy root), then regenerates the root landing page listing
// every published book. Keeps public/ as a clean, stable deploy surface
// separate from books/ (which holds the raw pipeline output - outline,
// chapter markdown, images - not meant to be served directly).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')

const [bookFolder, cleanSlug] = process.argv.slice(2)
if (!bookFolder || !cleanSlug) {
  console.error('Usage: node scripts/publish-book.mjs <book-folder-name> <clean-slug>')
  process.exit(1)
}

const srcSite = path.join(ROOT, 'books', bookFolder, 'site')
const outline = JSON.parse(fs.readFileSync(path.join(ROOT, 'books', bookFolder, 'outline.json'), 'utf8'))
const destDir = path.join(ROOT, 'public', 'books', cleanSlug)

// Real bug, live-caught: this used to only ever copy files IN, so a page
// removed from the source site (e.g. a chapter un-published back to
// Coming Soon) stayed live in public/ forever - a stale copy overlay, not
// a real republish. Wipe the destination first so it always matches the
// source site/ exactly.
fs.rmSync(destDir, { recursive: true, force: true })
fs.mkdirSync(destDir, { recursive: true })
fs.mkdirSync(path.join(destDir, 'images'), { recursive: true })
for (const file of fs.readdirSync(srcSite)) {
  const full = path.join(srcSite, file)
  if (fs.statSync(full).isFile()) fs.copyFileSync(full, path.join(destDir, file))
}
for (const file of fs.readdirSync(path.join(srcSite, 'images'))) {
  fs.copyFileSync(path.join(srcSite, 'images', file), path.join(destDir, 'images', file))
}

// Track published books in a manifest so the landing page can regenerate
// itself from a stable source instead of re-scanning + re-guessing titles
// from folder names every time.
const manifestPath = path.join(ROOT, 'public', 'books-manifest.json')
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : []
const withoutThis = manifest.filter((b) => b.slug !== cleanSlug)
// A real generated cover (storyglue-cover.mjs) beats the raw reference
// portrait as the library-grid thumbnail when one exists.
const destImages = fs.readdirSync(path.join(destDir, 'images'))
const coverImage = destImages.find((f) => f.startsWith('cover.')) || destImages.find((f) => f.startsWith('0-reference'))
withoutThis.push({ slug: cleanSlug, title: outline.title, premise: outline.premise, image: coverImage })
fs.writeFileSync(manifestPath, JSON.stringify(withoutThis, null, 2))

// Regenerate the landing page from the manifest.
fs.copyFileSync(path.join(ROOT, 'lib', 'site', 'style.css'), path.join(ROOT, 'public', 'style.css'))
const cards = withoutThis.map((b) => `
  <a class="book-card" href="books/${b.slug}/index.html">
    <img src="books/${b.slug}/images/${b.image}" alt="${b.title}">
    <div class="book-card-title">${b.title}</div>
  </a>`).join('\n')

fs.writeFileSync(path.join(ROOT, 'public', 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>unread.ink</title>
<link rel="stylesheet" href="style.css">
<style>
  .book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; margin: 40px 0; }
  .book-card { text-decoration: none; color: var(--ink); display: block; }
  .book-card img { width: 100%; aspect-ratio: 3/4; object-fit: cover; border: 1px solid var(--line); display: block; }
  .book-card-title { font-style: italic; font-size: 17px; margin-top: 10px; }
</style>
</head>
<body>
<div class="hero" style="min-height: 40vh;">
  <div class="hero-text" style="position: relative; background: none; padding: 80px 0 40px;">
    <h1>unread.ink</h1>
    <div class="sub">Books written by a council of models — an outline council drafts the shape, a writing council drafts the prose, an illustration pass locks one identity across every scene.</div>
  </div>
</div>
<div class="wrap">
  <h2>Library</h2>
  <div class="book-grid">${cards}
  </div>
  <footer>unread.ink</footer>
</div>
</body>
</html>
`)

console.log(`Published "${outline.title}" to public/books/${cleanSlug}/`)
console.log(`Landing page regenerated with ${withoutThis.length} book(s).`)
