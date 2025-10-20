#!/usr/bin/env node
"use strict";

// Expands backend/pam-dict.json using TagalogLang reference via dict-helpers.
// Usage examples:
//   node scripts/expand-pam-dict.js --terms=friend,house,water
//   node scripts/expand-pam-dict.js --file=seeds.txt
//   node scripts/expand-pam-dict.js            # seeds from existing dict keys+values

const fs = require("fs");
const path = require("path");
const { fetchTagalogLangEntry } = require("../dict-helpers");

const ROOT = path.join(__dirname, "..");
const DICT_PATH = path.join(ROOT, "pam-dict.json");

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return {}; }
}
function writeJson(p, obj) {
  const sorted = Object.fromEntries(Object.keys(obj).sort((a,b)=>a.localeCompare(b)).map(k=>[k,obj[k]]));
  fs.writeFileSync(p, JSON.stringify(sorted, null, 2), "utf8");
}
function norm(s){ return String(s||"").trim(); }

function parseArgs(){
  const out = { terms: [], file: null, augment: true, delayMs: 350, max: 0 };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith("--file=")) out.file = a.substring(7);
    else if (a.startsWith("--terms=")) out.terms = a.substring(8).split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);
    else if (a === "--no-augment") out.augment = false;
    else if (a.startsWith("--delay=")) out.delayMs = Math.max(0, parseInt(a.substring(8),10)||0);
    else if (a.startsWith("--max=")) out.max = Math.max(0, parseInt(a.substring(6),10)||0);
    else if (!a.startsWith("--")) out.terms.push(a);
  }
  return out;
}

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function addPair(dict, from, to) {
  const k = norm(from); const v = norm(to);
  if (!k || !v) return 0;
  if (!(k in dict)) { dict[k] = v; return 1; }
  return 0; // keep existing
}

async function main(){
  const args = parseArgs();
  const dict = readJson(DICT_PATH);

  // Build seed terms
  const seeds = new Set();
  if (args.augment) {
    Object.keys(dict).forEach(k => seeds.add(k));
    Object.values(dict).forEach(v => seeds.add(String(v)));
  }
  if (args.file) {
    try {
      const text = fs.readFileSync(path.resolve(args.file), "utf8");
      text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(t => seeds.add(t));
    } catch (e) {
      console.error("Could not read --file:", e.message);
    }
  }
  (args.terms||[]).forEach(t => seeds.add(t));

  const seedList = Array.from(seeds).filter(Boolean);
  if (args.max && seedList.length > args.max) seedList.length = args.max;
  console.log(`Seeds: ${seedList.length}`);

  let added = 0, lookedUp = 0;
  for (const term of seedList) {
    try {
      const entry = await fetchTagalogLangEntry(term);
      lookedUp++;
      if (!entry) { if (args.delayMs) await sleep(args.delayMs); continue; }
      const pam = Array.from(new Set(entry.pam||[]));
      const tl  = Array.from(new Set(entry.tl||[]));
      const en  = Array.from(new Set(entry.en||[]));

      // Create pam<->tl and pam<->en pairs (do not override existing values)
      for (const p of pam) {
        for (const t of tl)   added += addPair(dict, p, t) + addPair(dict, t, p);
        for (const e of en)   added += addPair(dict, p, e) + addPair(dict, e, p);
      }
    } catch (e) {
      // ignore individual failures
    }
    if (args.delayMs) await sleep(args.delayMs);
  }

  console.log(`Looked up: ${lookedUp}, new pairs added: ${added}`);
  if (added > 0) {
    writeJson(DICT_PATH, dict);
    console.log(`Updated: ${DICT_PATH}`);
  } else {
    console.log("No new entries added. Dict unchanged.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
