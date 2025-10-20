"use strict";

const path = require("path");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

// Cache file for dictionary lookups so we don't hammer the site.
const CACHE_DIR = path.join(__dirname, "cache");
const CACHE_FILE = path.join(CACHE_DIR, "dict-cache.json");
fs.mkdirSync(CACHE_DIR, { recursive: true });

let _cache = {};
try {
  if (fs.existsSync(CACHE_FILE)) {
    _cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  }
} catch {
  _cache = {};
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(_cache, null, 2), "utf8");
  } catch {}
}

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// Build local map from pam-dict.json (two-way where present)
function loadLocalDict() {
  const p = path.join(__dirname, "pam-dict.json");
  const out = {};
  try {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      for (const [k, v] of Object.entries(raw)) {
        out[norm(k)] = String(v);
      }
    }
  } catch {}
  return out;
}

const LOCAL_DICT = loadLocalDict();

// Scrape helpers for tagaloglang.com pages. We'll support queries for a word
// in Kapampangan, Tagalog, or English by trying sensible URL patterns.
// We keep it minimal and cache results; user confirmed permission to use as basis.
async function fetchTagalogLangEntry(term) {
  const key = norm(term);
  if (!key) return null;
  if (_cache[key]) return _cache[key];

  // Try a few URL patterns. Many entries are under /kapampangan-dictionary/<word>/
  // Some English words redirect to pages listing Kapampangan equivalents.
  const candidates = [
    `https://www.tagaloglang.com/kapampangan-dictionary/${encodeURIComponent(key)}/`,
    `https://www.tagaloglang.com/?s=${encodeURIComponent(key)}`
  ];

  for (const url of candidates) {
    try {
      const resp = await axios.get(url, { timeout: 12000, validateStatus: null, headers: { "User-Agent": "balik-suling/1.0" } });
      if (resp.status < 200 || resp.status >= 300) continue;
      const html = String(resp.data || "");
      if (!html || /captcha|blocked/i.test(html)) continue;
      const $ = cheerio.load(html);
      const result = parseTagalogLangHtml($, html);
      if (result && (result.pam?.length || result.tl?.length || result.en?.length)) {
        _cache[key] = result;
        saveCache();
        return result;
      }
    } catch (_) {
      // try next candidate
    }
  }
  return null;
}

function parseTagalogLangHtml($, html) {
  const out = { pam: [], tl: [], en: [], defs: [] };

  // Basic approach:
  // - Look for lists and bold terms commonly used in their dictionary pages
  // - Extract Kapampangan words appearing near labels like "Kapampangan", etc.
  // - Also gather visible list items as candidate translations.

  // Title can hint at the headword
  const title = $("title").text().trim();
  if (title) out.defs.push(title);

  // Collect list items
  $("li").each((_, li) => {
    const t = $(li).text().trim();
    if (!t) return;
    // naive splits
    const c = t.split(/[;:,()]/).map(s => s.trim()).filter(Boolean);
    c.forEach(seg => {
      const low = seg.toLowerCase();
      // heuristic grouping by common language hints
      if (/\bkapampangan\b|\bkapampangan:\b/.test(low)) {
        seg.split(/\s+/).forEach(w => { if (w && !/kapampangan/i.test(w)) out.pam.push(w); });
      } else if (/\btagalog\b|\bfilipino\b/.test(low)) {
        out.tl.push(seg.replace(/.*?:\s*/i, ""));
      } else if (/\benglish\b/.test(low)) {
        out.en.push(seg.replace(/.*?:\s*/i, ""));
      } else {
        // generic catch-all; let smart translator decide later
        out.defs.push(seg);
      }
    });
  });

  // Also scrape emphasized terms
  $("strong, b, em, i").each((_, el) => {
    const t = $(el).text().trim();
    if (t && out.defs.indexOf(t) === -1) out.defs.push(t);
  });

  // De-duplicate and normalize
  out.pam = uniqClean(out.pam);
  out.tl = uniqClean(out.tl);
  out.en = uniqClean(out.en);
  out.defs = uniqClean(out.defs);
  return out;
}

function uniqClean(arr) {
  const seen = new Set();
  const out = [];
  (arr || []).forEach(x => {
    const s = String(x || "").trim();
    if (!s) return;
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  });
  return out;
}

// Tokenize preserving punctuation; light implementation
function tokenize(text) {
  const tokens = [];
  const re = /(\p{L}+[\p{L}\p{Mn}\-']*)|([0-9]+)|([^\p{L}0-9\s])/giu;
  let m;
  let lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    const [full, word, number, punct] = m;
    if (m.index > lastIndex) {
      tokens.push({ t: text.slice(lastIndex, m.index), kind: "ws" });
    }
    if (word) tokens.push({ t: word, kind: "word" });
    else if (number) tokens.push({ t: number, kind: "num" });
    else tokens.push({ t: punct, kind: "punct" });
    lastIndex = m.index + full.length;
  }
  if (lastIndex < text.length) tokens.push({ t: text.slice(lastIndex), kind: "ws" });
  return tokens;
}

// Attempt smart per-token translation using LOCAL_DICT first, then scrape fallback.
async function smartTranslateTokens(text, source, target) {
  const toks = tokenize(text);
  const out = [];

  for (const tok of toks) {
    if (tok.kind !== "word") {
      out.push(tok.t);
      continue;
    }
    const lower = tok.t.toLowerCase();

    // direct local
    if (LOCAL_DICT[lower]) {
      out.push(adaptCasing(LOCAL_DICT[lower], tok.t));
      continue;
    }

    // scrape fallback (pam/tagalog/english space); store as pam->en or tl when obvious
    try {
      const entry = await fetchTagalogLangEntry(lower);
      if (entry) {
        const pick = pickForTarget(entry, target);
        if (pick) {
          out.push(adaptCasing(pick, tok.t));
          // update local cache mapping for faster next time
          _cache[lower] = entry;
          saveCache();
          continue;
        }
      }
    } catch {}

    // fallback no change
    out.push(tok.t);
  }

  return out.join("");
}

function pickForTarget(entry, target) {
  if (!entry) return null;
  if (target === "pam") return entry.pam?.[0] || entry.defs?.[0] || null;
  if (target === "fil" || target === "tl") return entry.tl?.[0] || entry.defs?.[0] || null;
  if (target === "en") return entry.en?.[0] || entry.defs?.[0] || null;
  return entry.defs?.[0] || null;
}

function adaptCasing(out, likeToken) {
  if (!out) return out;
  // Capitalize if token is capitalized; ALLCAPS if token is caps
  if (likeToken.toUpperCase() === likeToken) return String(out).toUpperCase();
  if (likeToken[0] && likeToken[0] === likeToken[0].toUpperCase()) {
    return out[0].toUpperCase() + out.slice(1);
  }
  return out;
}

module.exports = {
  smartTranslateTokens,
  fetchTagalogLangEntry,
  tokenize,
};
