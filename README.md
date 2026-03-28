# walang.studio

WS initial site, PHP backend via [puwit](https://github.com/walangstudio/puwit).

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla JS, GSAP 3, CSS |
| Backend | PHP 8.2 (puwit micro-framework) |
| Database | SQLite 3 |
| Web server | Apache + mod_rewrite |
| Build | Node.js (Terser, CleanCSS, html-minifier-terser) |

---

## Project structure

```
walang.studio/
├── index.html          — single-page app shell
├── script.js           — all frontend logic (GSAP animations, SPA nav, API calls)
├── styles.css          — retro film aesthetic
├── build.js            — build script → dist/
├── api/
│   ├── news.php        — hardcoded dispatches (static)
│   ├── apps.php        — hardcoded contraptions (static)
│   └── games.php       — hardcoded amusements (static)
├── backend/
│   ├── index.php       — puwit entry point (sets PUWIT_ROOT → _puwit/, strips /backend prefix)
│   └── .htaccess       — rewrites /backend/* to index.php
├── _puwit/             — puwit source (vendor/ gitignored — run composer before building)
│   ├── src/
│   ├── composer.json
│   ├── composer.lock
│   ├── .env            — GITIGNORED: DB driver, JWT secret
│   └── storage/        — GITIGNORED: SQLite database file
└── .htaccess           — blocks direct HTTP access to _puwit/, disables directory listing
```

---

## Local setup

### Prerequisites

- PHP 8.0+ (AMPPS on this machine: `F:\bin\ampps\php\php.exe`)
- Apache with mod_rewrite (AMPPS)
- Node.js + npm
- Composer (on this machine: `F:\bin\composer\composer.bat`)

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install puwit PHP dependencies

```bash
cd _puwit
"F:\bin\ampps\php\php.exe" "F:\bin\composer\composer.phar" install --no-dev
cd ..
```

This must be run before `node build.js` since vendor/ is gitignored.

### 3. Virtual host

AMPPS vhost config: `F:\bin\ampps\apache\conf\extra\httpd-custom-vhosts.conf`

Add to Windows hosts file once (elevated PowerShell):
```powershell
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "127.0.0.1   walang.local"
```

Then restart Apache via AMPPS.

### 4. Create `_puwit/.env`

```env
APP_ENV=development
APP_DEBUG=true

DB_DRIVER=sqlite

JWT_SECRET=<generate with: php -r "echo bin2hex(random_bytes(32));">
JWT_TTL=3600

PUWIT_ADMIN_KEY=<choose a temporary bootstrap key>

CORS_ORIGINS=*
```

`DB_PATH` can be omitted — defaults to `_puwit/storage/database.sqlite` via `PUWIT_ROOT` in `backend/index.php`.

### 5. Bootstrap puwit (first run only)

Creates the admin key, word model (marked public), and seeds data. Replace `BOOTSTRAP_KEY` with the value you set as `PUWIT_ADMIN_KEY` in `.env`, and replace `ADMIN_KEY` with the key returned in step one.

```bash
# Create admin key — save the returned key value
curl -s -X POST http://walang.local/backend/admin/keys \
  -H "X-API-Key: BOOTSTRAP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label": "admin", "scopes": ["admin"]}'

# Create word model (public = GET endpoints require no auth)
curl -s -X POST http://walang.local/backend/admin/models \
  -H "X-API-Key: ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "word", "fields": [{"name": "text", "type": "string", "nullable": false}], "public": true}'

# Seed 26 words
for WORD in kwenta trabaho pera magawa makain silbi dahilan katuwiran kinabukasan katinuan tulong pangarap masabi layunin kalayaan saysay pagasa lakas buhay patutunguhan tulugan galang emosyon kasama karapatan pagkakataon; do
  curl -s -X POST http://walang.local/backend/api/word \
    -H "X-API-Key: ADMIN_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$WORD\"}" > /dev/null && echo "✓ $WORD"
done
```

After this, remove `PUWIT_ADMIN_KEY` from `_puwit/.env`.

### 6. Verify

```bash
# No auth header — word model is public
curl http://walang.local/backend/api/word?per_page=26
# → {"data":[{"id":1,"text":"kwenta",...},...], "meta":{...}}
```

Open `http://walang.local/` — typewriter cycles through Tagalog words ending with "studio".

---

## Managing words

Use the admin key for all write operations. List words first to get IDs for edit/delete.

### List all words

```bash
curl -s "http://walang.local/backend/api/word?per_page=100" \
  -H "X-API-Key: ADMIN_KEY" | python -m json.tool
```

### Add a word

```bash
curl -s -X POST http://walang.local/backend/api/word \
  -H "X-API-Key: ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "bagong"}'
```

### Edit a word

```bash
curl -s -X PATCH http://walang.local/backend/api/word/ID \
  -H "X-API-Key: ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "updated"}'
```

### Delete a word

```bash
curl -s -X DELETE http://walang.local/backend/api/word/ID \
  -H "X-API-Key: ADMIN_KEY"
```

For production replace `http://walang.local/backend` with `https://walang.studio/backend`.

---

## Build & deploy

```bash
node build.js
```

Outputs to `dist/` — minified HTML/JS/CSS, all PHP files, `_puwit/` source + vendor + SQLite DB (if present locally). Upload contents of `dist/` to the server.

**After upload, create one file on the server:**

`_puwit/.env`:
```env
APP_ENV=production
APP_DEBUG=false

DB_DRIVER=sqlite

JWT_SECRET=<generate: php -r "echo bin2hex(random_bytes(32));">
JWT_TTL=3600

CORS_ORIGINS=https://walang.studio
```

Make `_puwit/storage/` writable by PHP (chmod 755 via cPanel).

If bootstrapping a fresh server (no DB in the zip), run the step 5 curl commands against `https://walang.studio/backend` after upload.

---

## How words work

`script.js` fetches `backend/api/word?per_page=26` directly from the browser. The word model is marked `public: true` in puwit, so GET requests require no authentication. The response is `{data: [{id, text, ...}], meta: {...}}`. JS shuffles the array, picks 10–20 words, appends `"studio"`, and feeds them to the typewriter animation.

If the fetch fails or returns fewer than 10 words, a hardcoded 26-word fallback pool is used instead.

`backend/.htaccess` routes all `/backend/*` requests to `backend/index.php`, which strips the `/backend` prefix from `REQUEST_URI` before booting puwit's kernel.
