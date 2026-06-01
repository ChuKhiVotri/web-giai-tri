const { Pool } = require('pg');

let pool;
let tableReady = false;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  return pool;
}

async function ensureTable() {
  if (tableReady) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      guest TEXT,
      slug TEXT,
      attending BOOLEAN NOT NULL DEFAULT TRUE,
      note TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  tableReady = true;
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function cleanText(value, maxLength = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dashboard-password');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    await ensureTable();

    if (req.method === 'POST') {
      const body = typeof req.body === 'object' && req.body ? req.body : {};
      const name = cleanText(body.name, 80);
      const guest = cleanText(body.guest, 80);
      const slug = cleanText(body.slug, 80);
      const note = cleanText(body.note, 240);
      const attending = body.attending !== false;

      if (!name || name.length < 2) {
        return sendJson(res, 400, { ok: false, message: 'Vui lòng nhập tên ít nhất 2 ký tự.' });
      }

      const ip = cleanText(req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '', 80);
      const userAgent = cleanText(req.headers['user-agent'] || '', 240);

      const result = await getPool().query(
        `INSERT INTO rsvps (name, guest, slug, attending, note, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, guest, slug, attending, note, created_at`,
        [name, guest || null, slug || null, attending, note || null, ip || null, userAgent || null]
      );

      return sendJson(res, 201, { ok: true, item: result.rows[0] });
    }

    if (req.method === 'GET') {
      const expectedPassword = process.env.DASHBOARD_PASSWORD;
      const providedPassword = req.headers['x-dashboard-password'];

      if (!expectedPassword) {
        return sendJson(res, 500, { ok: false, message: 'Missing DASHBOARD_PASSWORD environment variable' });
      }

      if (!providedPassword || providedPassword !== expectedPassword) {
        return sendJson(res, 401, { ok: false, message: 'Sai mật khẩu dashboard.' });
      }

      const result = await getPool().query(
        `SELECT id, name, guest, slug, attending, note, created_at
         FROM rsvps
         ORDER BY created_at DESC
         LIMIT 500`
      );

      return sendJson(res, 200, {
        ok: true,
        total: result.rows.length,
        items: result.rows
      });
    }

    return sendJson(res, 405, { ok: false, message: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      ok: false,
      message: 'Server error. Kiểm tra DATABASE_URL / Neon database.',
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};
