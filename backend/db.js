// backend/db.js
// Shared PostgreSQL (Neon) connection pool.
// Reads the connection string from process.env.DATABASE_URL.
"use strict";

require("dotenv").config();

const { Pool, types } = require("pg");

// Return BIGINT (int8, OID 20) as a JS number instead of a string. Safe here
// because our bigint ids are Date.now() millisecond values, well within
// Number.MAX_SAFE_INTEGER — this keeps the JSON API contract identical to the
// old file-based code (which used numeric ids).
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL is not set. Set it in backend/.env before using Postgres."
  );
}

// Neon requires SSL. The pooled endpoint presents a valid cert, but we disable
// strict verification to avoid environment-specific CA issues.
const pool = new Pool({
  connectionString,
  ssl: connectionString && /neon\.tech/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected idle client error:", err.message);
});

// Convenience helper: query(text, params)
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
