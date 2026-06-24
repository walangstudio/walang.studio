# walang.studio

Retro B&W film SPA on Cloudflare. One Worker serves the static site and a small
JSON API backed by D1.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla JS + GSAP 3 + CSS (in `public/`) |
| Backend | Cloudflare Worker, [Hono](https://hono.dev) router |
| Database | Cloudflare D1 (SQLite) |
| Hosting | Workers Static Assets (single deploy, free tier) |
| Tooling | Wrangler |

## Layout

```
public/            static site — index.html, script.js, styles.css
src/index.ts       Worker: serves /api/* from D1, assets binding serves the rest
migrations/        D1 schema + seed
wrangler.jsonc     Worker config (assets + D1 binding)
```

## API

Public reads:

| Route | Returns |
|-------|---------|
| `GET /api/words` | `{ data: [{ id, text }] }` |
| `GET /api/news`  | `{ articles: [{ date, headline, body }] }` |
| `GET /api/apps`  | `{ apps: [{ id, title, desc, status }] }` |
| `GET /api/games` | `{ games: [{ badge, title, desc }] }` |

Admin CRUD — `X-API-Key: $ADMIN_KEY` on every write. `:table` is one of
`words` / `news` / `apps` / `games`:

```
POST   /api/admin/:table        body = column fields → { id }
PATCH  /api/admin/:table/:id    body = fields to change
DELETE /api/admin/:table/:id
```

## Local dev

```bash
npm install
npm run migrate:local          # apply migrations/ to the local D1
npm run dev                     # http://localhost:8787
```

`.dev.vars` holds the local `ADMIN_KEY`. Example write:

```bash
curl -X POST http://localhost:8787/api/admin/words \
  -H "X-API-Key: dev-local-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"text":"bagong"}'
```

## Deploy (Cloudflare account required)

```bash
wrangler d1 create walang-studio        # paste database_id into wrangler.jsonc
npm run migrate:remote
wrangler secret put ADMIN_KEY           # production admin key
npm run deploy
```
