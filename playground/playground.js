const prefix = 'cf-pg-'
// Deno.Command expects command-line arguments as an array of strings
const wrangler = ['run', '-A', 'npm:wrangler@4.151.3']
// display wranglerr's commands: deno run -A npm:wrangler@4.151.3 --help

async function deploy(name, path) {
    const source = await Deno.realPath(path)

    // Keep Wrangler's configuration separate from the caller's project.
    const temporary = await Deno.makeTempDir({ prefix: 'playground-' })
    let code
    try {
        const assets = `${temporary}/assets`
        await Deno.mkdir(assets)
        await Deno.copyFile(source, `${assets}/index.html`)
        const config = `${temporary}/wrangler.json`
        await Deno.writeTextFile(
            config,
            JSON.stringify(
                {
                    name: `${prefix}${name}`,
                    compatibility_date: '2026-10-01',
                    workers_dev: true,
                    assets: { directory: assets },
                },
                null,
                2
            )
        )

        // Reuse Wrangler's login and let it print deployment progress and public URL.
        const result = await new Deno.Command(Deno.execPath(), {
            args: [...wrangler, 'deploy', '--config', config],
            cwd: temporary,
            stdin: 'inherit',
            stdout: 'inherit',
            stderr: 'inherit',
        }).spawn().status
        code = result.code
    } finally {
        await Deno.remove(temporary, { recursive: true })
    }
    Deno.exit(code)
}

// Use Wrangler's saved authentication without managing credentials ourselves.
async function wranglerJson(args, cwd) {
    const { code, stdout } = await new Deno.Command(Deno.execPath(), {
        args: [...wrangler, ...args, '--json'],
        cwd,
        stderr: 'inherit',
    }).output()
    if (code !== 0) throw new Error(`wrangler ${args[0]} failed`)
    return JSON.parse(new TextDecoder().decode(stdout))
}

async function list(cwd) {
    const { accounts } = await wranglerJson(['whoami'], cwd)
    const account =
        Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ??
        (accounts.length === 1 ? accounts[0].id : undefined)
    if (!account)
        throw new Error('set CLOUDFLARE_ACCOUNT_ID to select an account')
    const { token } = await wranglerJson(['auth', 'token'], cwd)
    const api = async path => {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${account}${path}`,
            { headers: { authorization: `Bearer ${token}` } }
        )
        const body = await response.json()
        if (!body.success) throw new Error(JSON.stringify(body.errors))
        return body.result
    }
    const { subdomain } = await api('/workers/subdomain')
    const scripts = await api('/workers/scripts')
    const playgrounds = scripts.filter(script => script.id.startsWith(prefix))
    for (const script of playgrounds) {
        console.log(
            `${script.id.slice(prefix.length)}  https://${script.id}.${subdomain}.workers.dev`
        )
    }
    if (!playgrounds.length) console.log('no playgrounds yet')
}

const [command, first, second, ...extra] = Deno.args
if (command === 'deploy' && first && second && !extra.length) {
    await deploy(first, second)
} else if (
    (command === 'list' && !first) ||
    (command === 'delete' && first && !second)
) {
    // List and delete also run outside any project configuration.
    const temporary = await Deno.makeTempDir({ prefix: 'playground-' })
    let code = 0
    try {
        if (command === 'list') await list(temporary)
        else {
            // A bare name cannot become a flag or escape our Worker prefix.
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(first))
                throw new Error(
                    'use a bare name with lowercase letters, digits and dashes'
                )
            const result = await new Deno.Command(Deno.execPath(), {
                args: [...wrangler, 'delete', `${prefix}${first}`],
                cwd: temporary,
                stdin: 'inherit',
                stdout: 'inherit',
                stderr: 'inherit',
            }).spawn().status
            code = result.code
        }
    } finally {
        await Deno.remove(temporary, { recursive: true })
    }
    Deno.exit(code)
} else {
    console.error(
        'usage: playground deploy <name> <file.html>\n' +
            '       playground list\n' +
            '       playground delete <name>'
    )
    Deno.exit(1)
}
