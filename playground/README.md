# playground

Publish an AgentScript HTML application to Cloudflare Workers Static Assets.
Supports `deploy`, `list`, and `delete`. Requires Deno and uses Wrangler's
existing authentication, with the same Wrangler version as the reference utility.
If needed, sign in once with `deno run -A npm:wrangler@4.151.3 login`.

```bash
./run deploy schelling /path/to/schelling.html
./run deploy segregation /path/to/schelling.html
./run list
./run delete schelling
```

`deploy` requires exactly two arguments: a Worker name and an existing regular `.html` file.
Names become lowercase, with spaces and punctuation replaced by dashes.
Every Worker name starts with `cf-pg-`: `schelling` becomes `cf-pg-schelling`.
Deploying the same name again replaces that application's deployment.

A single HTML file is uploaded as `index.html`. Its local imports and other
files are not included; remote imports such as `https://agentscript.org/...`
remain usable. Directories are not supported.

Wrangler runs from a temporary directory with an explicit configuration, so
unrelated project configuration is not used. Temporary files are removed after
the command finishes. Wrangler's output includes the permanent public address,
such as `https://cf-pg-schelling.<your-subdomain>.workers.dev`.

The launcher works from any directory. If your login has several accounts,
set `CLOUDFLARE_ACCOUNT_ID` to select one. The utility does not manage tokens
or change Wrangler's authentication.

See Cloudflare's [Workers Static Assets documentation](https://developers.cloudflare.com/workers/static-assets/)
for the hosting service used here.

`list` reads Cloudflare's API using Wrangler's saved token and shows only Workers
whose names start with `cf-pg-`. `delete` takes the bare name shown by `list`
(for example, `schelling`) and always adds `cf-pg-`. Workers from the original
`Cloudflare/playground` utility, which use `pg-`, are outside this scope.
Wrangler handles the deletion confirmation; no confirmation bypass is passed.
