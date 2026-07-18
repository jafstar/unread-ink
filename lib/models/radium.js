// Same proven pattern as Valid's callRadium (sync-agent-extension/extension.js).
const MODEL = 'clarke-1.0'

export async function callRadium(prompt, system, apiKey) {
  const res = await fetch('https://api.radium.cloud/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Radium API ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Radium returned an empty response')
  return content
}
