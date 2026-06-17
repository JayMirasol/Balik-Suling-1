// backend/scripts/migrate.js
//
// Deploys the schema to Neon (Postgres) and seeds it from the existing
// JSON data files. Idempotent: re-running will not duplicate or clobber data.
//
//   node scripts/migrate.js
//
"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool } = require("../db");

const ROOT = path.join(__dirname, "..");
const SCHEMA_FILE = path.join(ROOT, "schema.sql");

// Built-in song catalog (mirrors the hardcoded list in src/screens/feed/index.js).
// Fixed ids so re-running is idempotent. image/audio are bundled frontend assets,
// so they are left blank here; admin-added songs use hosted URLs.
const BUILTIN_SONGS = [
  { id: 1, title: "Atin Cu Pung Singsing", path: "/chords/atin-cu-pung-singsing", youtube_link: "https://www.youtube.com/watch?v=38cbteSAffE" },
  { id: 2, title: "Masayang Kebaitan", path: "/chords/masayang-kebaitan", youtube_link: "https://www.youtube.com/watch?v=g7doXhRymUY" },
  { id: 3, title: "O Caca", path: "/chords/o-caca", youtube_link: "https://www.youtube.com/watch?v=FDu-3JjTLnE" },
  { id: 4, title: "Tuknang", path: "/chords/tuknang", youtube_link: "https://www.youtube.com/watch?v=FDu-3JjTLnE" },
  { id: 5, title: "Pupul", path: "/chords/pupul", youtube_link: "https://www.youtube.com/watch?v=38cbteSAffE" },
  { id: 6, title: "Abe-Abe", path: "/chords/abe-abe", youtube_link: "https://www.youtube.com/watch?v=Y4zwG40DWiI" },
];

function readJSON(file, fallback) {
  try {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) return fallback;
    const raw = fs.readFileSync(p, "utf8").trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`[seed] Could not read ${file}: ${e.message}`);
    return fallback;
  }
}

async function applySchema(client) {
  console.log("→ Applying schema.sql ...");
  const sql = fs.readFileSync(SCHEMA_FILE, "utf8");
  await client.query(sql);
  console.log("  ✓ schema applied");
}

async function seedViews(client) {
  const views = readJSON("views.json", {});
  const entries = Object.entries(views);
  let n = 0;
  for (const [key, count] of entries) {
    await client.query(
      `INSERT INTO views (view_key, count) VALUES ($1, $2)
       ON CONFLICT (view_key) DO NOTHING`,
      [String(key), Number(count) || 0]
    );
    n++;
  }
  console.log(`  ✓ views: ${n} keys processed`);
}

async function seedFeedback(client) {
  const feedback = readJSON("feedback.json", []);
  let n = 0;
  for (const f of feedback) {
    if (!f || f.id == null) continue;
    await client.query(
      `INSERT INTO feedback (id, name, email, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        Number(f.id),
        f.name || "",
        f.email || "",
        Number(f.rating) || 5,
        f.comment || "",
        f.timestamp || new Date().toISOString(),
      ]
    );
    n++;
  }
  console.log(`  ✓ feedback: ${n} rows processed`);
}

async function seedSongs(client) {
  const songs = readJSON("songs.json", []);
  let n = 0;
  for (const s of songs) {
    if (!s || s.id == null) continue;
    await client.query(
      `INSERT INTO songs (id, title, image, audio, path)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [Number(s.id), s.title || "", s.image || "", s.audio || "", s.path || ""]
    );
    n++;
  }
  console.log(`  ✓ songs: ${n} rows processed`);
}

async function seedBuiltinSongs(client) {
  let n = 0;
  for (const s of BUILTIN_SONGS) {
    await client.query(
      `INSERT INTO songs (id, title, image, audio, path, youtube_link)
       VALUES ($1, $2, '', '', $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.title, s.path, s.youtube_link]
    );
    n++;
  }
  console.log(`  ✓ built-in songs: ${n} processed`);
}

async function seedDictCache(client) {
  const cache = readJSON(path.join("cache", "dict-cache.json"), {});
  const entries = Object.entries(cache);
  let n = 0;
  for (const [term, entry] of entries) {
    if (entry == null) continue;
    await client.query(
      `INSERT INTO dict_cache (term, entry) VALUES ($1, $2::jsonb)
       ON CONFLICT (term) DO NOTHING`,
      [String(term), JSON.stringify(entry)]
    );
    n++;
  }
  console.log(`  ✓ dict_cache: ${n} entries processed`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "✗ DATABASE_URL is not set. Add it to backend/.env first (see .env.example)."
    );
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await applySchema(client);

    console.log("→ Seeding data ...");
    await seedViews(client);
    await seedFeedback(client);
    await seedSongs(client);
    await seedBuiltinSongs(client);
    await seedDictCache(client);

    await client.query("COMMIT");
    console.log("\n✅ Migration complete. Neon is ready.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("\n✗ Migration failed, rolled back:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
