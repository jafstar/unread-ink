// Shared timeout wrapper - real bug found live (Chapter 5's final
// continuity check hung indefinitely mid-book, no error, no retry,
// just stuck): none of the 4 text model wrappers (claude/gemini/chatgpt/
// radium) had a timeout, unlike the image models (flux-image.js,
// gemini-image.js) which already used this exact pattern. A stalled
// network request had no way to ever fail.
//
// 90s wasn't enough either, once the fix was in - Chapter 10 timed out
// 3 times in a row at the exact same call (the continuity checker's
// earlierChapters context, which grows every chapter - by chapter 10
// that's 8 chapters of text). Not random network flakiness, genuinely
// more processing time needed for a larger input. Bumped to 150s.
export async function fetchTimeout(url, opts, timeoutMs = 240000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
