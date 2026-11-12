import { serveDir } from 'jsr:@std/http/file-server'
import { dirname, relative, sep } from 'node:path'

// HTML file and web root
const file = await Deno.realPath(Deno.args[0])
const root = await Deno.realPath(Deno.args[1] ?? dirname(file))
const page = relative(root, file).split(sep).map(encodeURIComponent).join('/')

// Local HTTP server
const server = Deno.serve(
    { hostname: '127.0.0.1', port: 0, onListen() {} },
    request => serveDir(request, { fsRoot: root, quiet: true })
)

// Cloudflare tunnel a Deno.ChildProcess object (pid, stderr, status ...)
// Deno.Command describes an external command;
// .spawn() starts it and gives us an object for controlling it.
const tunnel = new Deno.Command('cloudflared', {
    args: [
        'tunnel', // start a CF tunnel
        '--protocol', // using http/2 for tunnel connection
        'http2',
        '--url', // forward incoming requests to our local HTTP server
        `http://127.0.0.1:${server.addr.port}`,
    ],
    stdout: 'null', // discard normal output
    stderr: 'piped', // will have the public url
}).spawn() // starts the process

// stop both cloudflared and our Deno HTTP server when you press Ctrl+C.
let shutdown
function stop() {
    if (shutdown) return shutdown
    try {
        tunnel.kill('SIGTERM')
    } catch {} // ignore errors
    return (shutdown = server.shutdown())
}
Deno.addSignalListener('SIGINT', stop) // ctrl+C
Deno.addSignalListener('SIGTERM', stop)

// Find and print Cloudflare's public URL
try {
    let log = ''
    let printed = false

    const textStream = tunnel.stderr.pipeThrough(new TextDecoderStream())
    console.log('textStream', textStream)

    for await (const chunk of textStream) {
        // console.log('CHUNK:', JSON.stringify(chunk))
        log = (log + chunk).slice(-8000)
        const url = log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
        if (url && !printed) {
            console.log(`${url[0]}/${page}`)
            printed = true
        }
    }

    const status = await tunnel.status
    if (!shutdown) {
        throw new Error(`cloudflared exited (${status.code}).\n${log}`)
    }
} finally {
    await stop()
    await tunnel.status
}
