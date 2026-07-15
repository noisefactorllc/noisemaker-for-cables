import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const host = '127.0.0.1'
const port = 4173

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
])

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname)
  const candidate = resolve(root, `.${pathname}`)
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null
  return candidate
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end()
    return
  }

  const path = resolveRequestPath(request.url || '/')
  if (!path) {
    response.writeHead(403).end('Forbidden')
    return
  }

  try {
    const metadata = await stat(path)
    if (!metadata.isFile()) throw new Error('not a file')
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': metadata.size,
      'Content-Type': contentTypes.get(extname(path)) || 'application/octet-stream',
    })
    if (request.method === 'HEAD') response.end()
    else createReadStream(path).pipe(response)
  } catch {
    response.writeHead(404).end('Not Found')
  }
})

server.listen(port, host, () => {
  process.stdout.write(`Task 9 browser fixture listening on http://${host}:${port}\n`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
