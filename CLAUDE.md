# walang.studio

Cloudflare Worker (Hono) + D1, static CRT-TV frontend in `public/`. Deploy by hand: `npx wrangler deploy` (no CI).

## Failure log
- Run `npx wrangler login` before deploying; `wrangler whoami` fails by default on this machine.
- Check live vs branch with CRLF stripped (`tr -d '\r'`) before hashing, or every asset looks different.
- Games and apps are static markup in `public/index.html`; the D1 `games`/`apps` tables are not read by the page.
- Keep `.dev.vars` and `.wrangler/` in `.gitignore`; they sit untracked in the repo root.
- Dispatch synthetic key events on document.body, not window: the keydown handler calls e.target.matches.
