import { Hono } from 'hono'

type Env = { DB: D1Database; ADMIN_KEY: string }

const app = new Hono<{ Bindings: Env }>()

// ── Public reads ── (envelopes + column aliases match the frontend renderers)
app.get('/api/words', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, text FROM words ORDER BY id').all()
  return c.json({ data: results })
})

app.get('/api/news', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT date, headline, body FROM news ORDER BY sort DESC, id DESC').all()
  return c.json({ articles: results })
})

app.get('/api/apps', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT label AS id, title, description AS "desc", status FROM apps ORDER BY id').all()
  return c.json({ apps: results })
})

app.get('/api/games', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT badge, title, description AS "desc" FROM games ORDER BY id').all()
  return c.json({ games: results })
})

// ── Admin CRUD ── single shared secret in X-API-Key. Table + column names come
// only from this whitelist (never interpolated from user input); values are bound.
const TABLES: Record<string, string[]> = {
  words: ['text'],
  news: ['date', 'headline', 'body', 'sort'],
  apps: ['label', 'title', 'description', 'status'],
  games: ['badge', 'title', 'description'],
}

const admin = new Hono<{ Bindings: Env }>()

admin.use('*', async (c, next) => {
  if (c.req.header('X-API-Key') !== c.env.ADMIN_KEY) return c.json({ error: 'unauthorized' }, 401)
  await next()
})

admin.post('/:table', async (c) => {
  const table = c.req.param('table')
  const cols = TABLES[table]
  if (!cols) return c.json({ error: 'unknown resource' }, 404)
  const body = await c.req.json<Record<string, unknown>>()
  const used = cols.filter((k) => k in body)
  if (!used.length) return c.json({ error: 'no valid fields' }, 400)
  const sql = `INSERT INTO ${table} (${used.join(',')}) VALUES (${used.map(() => '?').join(',')})`
  const res = await c.env.DB.prepare(sql).bind(...used.map((k) => body[k])).run()
  return c.json({ id: res.meta.last_row_id }, 201)
})

admin.patch('/:table/:id', async (c) => {
  const table = c.req.param('table')
  const cols = TABLES[table]
  if (!cols) return c.json({ error: 'unknown resource' }, 404)
  const body = await c.req.json<Record<string, unknown>>()
  const used = cols.filter((k) => k in body)
  if (!used.length) return c.json({ error: 'no valid fields' }, 400)
  const sql = `UPDATE ${table} SET ${used.map((k) => `${k}=?`).join(',')} WHERE id=?`
  await c.env.DB.prepare(sql).bind(...used.map((k) => body[k]), c.req.param('id')).run()
  return c.json({ ok: true })
})

admin.delete('/:table/:id', async (c) => {
  const table = c.req.param('table')
  if (!TABLES[table]) return c.json({ error: 'unknown resource' }, 404)
  await c.env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

app.route('/api/admin', admin)

export default app
