import http from 'http'
import fs from 'fs'
import path from 'path'

const dir = process.argv[2]
const port = process.argv[3] || 8420
const MIME = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json' }

http.createServer((req, res) => {
  const filePath = path.join(dir, decodeURIComponent(req.url === '/' ? '/index.html' : req.url))
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' })
    res.end(data)
  })
}).listen(port, () => console.log(`Serving ${dir} at http://localhost:${port}`))
