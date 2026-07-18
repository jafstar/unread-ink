// Same mechanism proven tonight in genstock-web's era-remix test: one
// Gemini reference portrait, then Flux reference-conditioned scenes per
// chapter via the 'exact' mode wrapper (built for "keep everything, apply
// only this one change"). Ishmael stays the consistent locked identity
// across every chapter's illustration - he's the narrator/POV character
// throughout the book, same reason a real illustrated edition would keep
// one consistent visual thread rather than a new character per plate.
import fs from 'fs'
import path from 'path'

const STYLE = 'moody 1980s maritime illustration style, muted teal and rust color palette, grainy textured linework, dramatic overcast lighting, evocative of gritty 80s documentary photography crossed with classic nautical woodcut illustration'

function saveImage(dataUrl, filepath) {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const finalPath = `${filepath}.${ext}`
  fs.writeFileSync(finalPath, Buffer.from(match[2], 'base64'))
  return path.basename(finalPath)
}

async function withRetries(fn, label, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      console.error(`    ${label} attempt ${i}/${attempts} failed: ${e.message}`)
      if (i === attempts) throw e
    }
  }
}

// Resumable + resilient: a stubborn chapter (Flux times out a lot under
// this workload) used to throw uncaught and kill the whole batch,
// abandoning every chapter after it even though nothing was wrong with
// them - real bug, live-caught on this exact book (chapter 4 killed 5-10).
// Now a failed chapter is logged and skipped, not fatal, and any image
// already on disk from a prior run is reused instead of regenerated -
// re-running this after a partial failure only fills the gaps.
function existingImage(imagesDir, baseName) {
  const found = fs.readdirSync(imagesDir).find((f) => f.startsWith(`${baseName}.`))
  return found || null
}

export async function illustrateBook({ outline, outDir, generateGemini, generateFlux }) {
  const imagesDir = path.join(outDir, 'images')
  fs.mkdirSync(imagesDir, { recursive: true })

  const protagonist = outline.characters[0]
  let refFilename = existingImage(imagesDir, '0-reference')
  let refDataUrl
  if (refFilename) {
    console.log(`  [illustrate] Reference portrait: ${protagonist.name} - already on disk, reusing.`)
    const buf = fs.readFileSync(path.join(imagesDir, refFilename))
    const ext = path.extname(refFilename).slice(1)
    refDataUrl = `data:image/${ext};base64,${buf.toString('base64')}`
  } else {
    console.log(`  [illustrate] Reference portrait: ${protagonist.name} (Gemini)...`)
    refDataUrl = await generateGemini(
      `${protagonist.description}, ${STYLE}, portrait, plain neutral background, front-facing`
    )
    refFilename = saveImage(refDataUrl, path.join(imagesDir, '0-reference'))
    console.log(`    -> ${refFilename}`)
  }

  const chapterImages = [{ chapter: 0, filename: refFilename }]
  const failures = []

  for (const chapter of outline.chapters) {
    const baseName = `${String(chapter.number).padStart(2, '0')}-${chapter.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const existing = existingImage(imagesDir, baseName)
    if (existing) {
      console.log(`  [illustrate] Chapter ${chapter.number}: ${chapter.title} - already on disk, reusing.`)
      chapterImages.push({ chapter: chapter.number, filename: existing })
      continue
    }

    console.log(`  [illustrate] Chapter ${chapter.number}: ${chapter.title} (Flux)...`)
    try {
      const dataUrl = await withRetries(
        () => generateFlux(`${chapter.summary}, ${STYLE}`, refDataUrl),
        `ch.${chapter.number}`
      )
      const filename = saveImage(dataUrl, path.join(imagesDir, baseName))
      console.log(`    -> ${filename}`)
      chapterImages.push({ chapter: chapter.number, filename })
    } catch (e) {
      console.error(`    Chapter ${chapter.number} failed after all retries, skipping: ${e.message}`)
      failures.push(chapter.number)
    }
  }

  fs.writeFileSync(path.join(imagesDir, 'manifest.json'), JSON.stringify({ style: STYLE, protagonist: protagonist.name, images: chapterImages, failures }, null, 2))
  if (failures.length) console.log(`\n  ${failures.length} chapter(s) missing an image: ${failures.join(', ')} - re-run this script to retry just those.`)
  return chapterImages
}
