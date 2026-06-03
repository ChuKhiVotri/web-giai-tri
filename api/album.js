const { Pool } = require('pg');

let pool;
let tableReady = false;

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed' });
  }

  try {
    const { head } = await import('@vercel/blob');

    await ensureTable();
    const db = getPool();

    if (db) {
      const result = await db.query(
        `SELECT id, url, pathname, caption, original_filename, created_at
         FROM album_photos
         ORDER BY created_at DESC
         LIMIT 300`
      );

      // Với private store: generate signed URL từ pathname (có hiệu lực 1 giờ)
      const items = await Promise.all(result.rows.map(async (row) => {
        let src = row.url;
        if (row.pathname) {
          try {
            const blobMeta = await head(row.pathname, { access: 'private' });
            src = blobMeta.downloadUrl; // signed URL tươi
          } catch (_) {
            // fallback về url gốc nếu head() lỗi
            src = row.url;
          }
        }
        return {
          src,
          caption: row.caption || row.original_filename || 'Ảnh kỷ niệm',
          created_at: row.created_at
        };
      }));

      return sendJson(res, 200, { ok: true, source: 'database', items });
    }

    // Fallback: không có DB, dùng blob list
    const { list } = await import('@vercel/blob');
    const blobs = await list({ prefix: 'album/', mode: 'folded' });
    const items = blobs.blobs.map((blob) => ({
      src: blob.downloadUrl || blob.url,
      caption: blob.pathname.split('/').pop() || 'Ảnh kỷ niệm',
      created_at: blob.uploadedAt
    }));
    return sendJson(res, 200, { ok: true, source: 'blob', items });

  } catch (error) {
    console.error('[album] error:', error);
    return sendJson(res, 500, {
      ok: false,
      message: 'Không tải được danh sách album.',
      detail: error.message || String(error)
    });
  }
};
