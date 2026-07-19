// Parses a chapter's real title from its own markdown heading
// ("# Chapter N: Title") - the single source of truth. Replaces a
// hardcoded 'The Hemlock' fallback that used to be duplicated in
// build-site.mjs and storyglue-rhythm.mjs, correct only for the first
// book it was written for and silently wrong for every book after it.
export function parseChapterTitle(chapterMdText, chapterNum) {
  const m = chapterMdText.match(/^#\s*Chapter\s*\d+\s*:\s*(.+)$/m)
  return m ? m[1].trim() : `Chapter ${chapterNum}`
}
