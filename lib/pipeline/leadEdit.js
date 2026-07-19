import { KNIGHTS } from './knights.js'

// Lead Editor pass: the knight whose plot pitch won takes the writers'
// relayed chapter draft plus Xlectic's critique notes and produces the
// final chapter - the notes are a thought-provider, not a checklist to
// blindly satisfy. This is the only step where Xlectic's editorial input
// actually changes the text; Xlectic itself never writes prose. Real bug
// found live testing Chapter 7: the notes are labeled with the reviewer's
// name ("Portia (Arbiter): ..."), and the Lead Editor's rewrite absorbed
// "Portia" as if she were an in-story character Nora knew, not a meta-
// editorial voice - now explicitly forbidden. Also fixed: this prompt
// used to hardcode "Chapter 1" and "Three other writers," silently wrong
// for every chapter since 2 (which only has 2 writers, Gemini+ChatGPT).
const LEAD_EDIT_SYSTEM = 'You are the Lead Editor for this book - the writer whose original plot pitch was chosen. Other writers took turns drafting and refining this chapter together; below is their combined draft, plus editorial notes from independent readers, each labeled with that reader\'s name (e.g. "Portia (Arbiter): ..."). Those names are meta-editorial voices reviewing your draft from outside the story - they are NOT characters in the book. Never let a reviewer\'s name leak into the actual prose as if they were a person Nora knows or has met. Rewrite the chapter into its final form: use your own judgment on the notes (not every note demands a literal fix, but take them seriously), preserve the events/plot/POV already established, and make it read as one unified, polished chapter. Output the final chapter text only, no commentary, no chapter-number heading.'

export async function leadEditChapter({ draft, notes, editorKey, keys }) {
  const editor = KNIGHTS[editorKey]
  const notesText = notes.map((n) => `${n.name} (${n.title}): ${n.note}`).join('\n\n')
  console.log(`  [lead-edit] ${editor.label} rewriting with notes...`)
  const final = await editor.fn(
    `Chapter draft:\n\n${draft}\n\nEditorial notes:\n\n${notesText}\n\nRewrite the final chapter now.`,
    LEAD_EDIT_SYSTEM,
    keys[editorKey]
  )
  console.log(`    -> ${final.split(/\s+/).length} words`)
  return final
}
