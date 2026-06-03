const { Pool } = require('pg');

let pool;
let tableReady = false;

exports.config = {
  api: {
    bodyParser: false
  }
};

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureTable() {
  const db = getPool();
  if (!db || tableReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS album_photos (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      pathname TEXT,
      caption TEXT,
      original_filename TEXT,
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

function cleanText(value, maxLength = 180) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function safeFileName(name) {
  const cleaned = cleanText(name, 120)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || `album-${Date.now()}.jpg`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename, x-caption, x-admin-password');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed' });
  }

  const expectedPassword = process.env.ADMIN_ALBUM_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];
  if (expectedPassword && providedPassword !== expectedPassword) {
    return sendJson(res, 401, { ok: false, message: 'Sai mật khẩu upload album.' });
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.startsWith('image/')) {
    return sendJson(res, 400, { ok: false, message: 'Chỉ cho phép upload file ảnh.' });
  }

  try {
    const { put } = await import('@vercel/blob');
    const originalFilename = safeFileName(req.headers['x-filename']);
    const caption = cleanText(decodeURIComponent(req.headers['x-caption'] || ''), 180);
    const pathname = `album/${Date.now()}-${originalFilename}`;

    const blob = await put(pathname, req, {
      access: 'public',
      contentType,
      addRandomSuffix: true
    });

    await ensureTable();
    const db = getPool();

    let item = {
      id: null,
      url: blob.url,
      pathname: blob.pathname,
      caption: caption || originalFilename,
      original_filename: originalFilename,
      created_at: new Date().toISOString()
    };

    if (db) {
      const result = await db.query(
        `INSERT INTO album_photos (url, pathname, caption, original_filename)
         VALUES ($1, $2, $3, $4)
         RETURNING id, url, pathname, caption, original_filename, created_at`,
        [blob.url, blob.pathname, caption || originalFilename, originalFilename]
      );
      item = result.rows[0];
    }

    return sendJson(res, 201, { ok: true, item });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      ok: false,
      message: 'Upload ảnh thất bại. Kiểm tra BLOB_READ_WRITE_TOKEN và DATABASE_URL trên Vercel.',
      detail: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};
