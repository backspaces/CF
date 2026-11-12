# HTML tunnel

Requires Deno and cloudflared on your PATH.

Run from any folder:

    /path/to/CF/tunnel/run /path/to/page.html [web-root]

The web root defaults to the HTML file's directory. To serve a page with
assets elsewhere in its project, pass the project's parent directory:

    ./run /path/to/project/pages/demo.html /path/to/project

Prints the full public HTTPS URL, including the page's path within the
web root. Allow a few seconds for it to become available. Press Ctrl-C to stop.

Relative JavaScript, CSS, and image paths work. The HTML file must be
inside the chosen root. All files in that root are publicly accessible
while the tunnel runs, including files reachable through symlinks.
Directory listings are disabled.

Save and refresh to see changes. The URL changes each run.
No Cloudflare account is required. HTTP/2 is used.

Deno downloads its standard-library file server on first use.
