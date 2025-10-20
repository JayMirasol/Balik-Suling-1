import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./translate.css";

const LANGS = { en: "English", fil: "Filipino", pam: "Kapampangan" };

/**
 * Small debounce factory that returns a debounced function.
 * The returned function preserves its own timer across calls.
 */
function debounceFactory(fn, ms = 250) {
  let h = null;
  return (...args) => {
    if (h) clearTimeout(h);
    h = setTimeout(() => {
      h = null;
      fn(...args);
    }, ms);
  };
}

export default function Translate() {
  const [text, setText] = useState("");
  const [source, setSource] = useState("pam");
  const MAX_CHARS = 5000;
  const [auto, setAuto] = useState(true);

  // Enforce single target language based on allowed pairs
  const allowedTargetsFor = (src) => {
    if (src === "pam") return ["fil", "en"]; // Kapampangan -> Tagalog or English
    if (src === "fil") return ["pam"]; // Tagalog -> Kapampangan
    if (src === "en") return ["pam"]; // English -> Kapampangan
    return [];
  };

  const [target, setTarget] = useState(allowedTargetsFor("pam")[0]);
  const [out, setOut] = useState({ en: "", fil: "", pam: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ en: null, fil: null, pam: null });
  const [statusMsg, setStatusMsg] = useState("");
  const [hoverDef, setHoverDef] = useState(null); // { word, x, y, entry }
  const dictCacheRef = useRef({});

  // Keep target valid whenever source changes
  useEffect(() => {
    const allowed = allowedTargetsFor(source);
    if (!allowed.includes(target)) {
      setTarget(allowed[0] || "");
    }
  }, [source]); // target intentionally not included, we check allowed membership

  // -- Stable refs to help debounced callbacks read latest state without recreation --
  const stateRef = useRef({ text, source, target, auto });
  useEffect(() => {
    stateRef.current = { text, source, target, auto };
  }, [text, source, target, auto]);

  // Track IME/composition state so we don't interrupt composition.
  const composingRef = useRef(false);

  // Debounced hover lookup (capture coords synchronously to avoid stale/null event)
  // Use a stable debounce factory so this debouncedLookup remains stable across renders.
  const debouncedLookup = useMemo(
    () =>
      debounceFactory(async ({ x, y, word }) => {
        const w = (word || "").trim();
        if (!w) return;
        if (dictCacheRef.current[w]) {
          setHoverDef({ word: w, x, y, entry: dictCacheRef.current[w] });
          return;
        }
        try {
          const { data } = await axios.get("/dict/lookup", { params: { term: w }, timeout: 8000 });
          dictCacheRef.current[w] = data?.entry || null;
          setHoverDef({ word: w, x, y, entry: data?.entry || null });
        } catch (e) {
          setHoverDef(null);
        }
      }, 180),
    []
  );

  // Tokenize input for per-word hover
  const tokenizeUi = (s) => {
    const text = s || "";
    const tokens = [];
    const re = /([\p{L}]+[\p{L}\p{Mn}\-']*)|([0-9]+)|([^\p{L}0-9\s])/giu;
    let m;
    let last = 0;
    while ((m = re.exec(text)) !== null) {
      const [full, w, n, p] = m;
      if (m.index > last) tokens.push({ t: text.slice(last, m.index), kind: "ws" });
      if (w) tokens.push({ t: w, kind: "word" });
      else if (n) tokens.push({ t: n, kind: "num" });
      else tokens.push({ t: p, kind: "punct" });
      last = m.index + full.length;
    }
    if (text.length > last) tokens.push({ t: text.slice(last), kind: "ws" });
    return tokens;
  };

  const Wordy = ({ value }) => {
    const pieces = useMemo(() => tokenizeUi(value), [value]);
    return (
      <div className="wordy">
        {pieces.map((p, i) =>
          p.kind === "word" ? (
            <span
              key={i}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + window.scrollY;
                debouncedLookup({ x, y, word: p.t });
              }}
              onMouseLeave={() => setHoverDef(null)}
              className="wordy__token"
              title="Lookup"
            >
              {p.t}
            </span>
          ) : (
            <span key={i}>{p.t}</span>
          )
        )}
      </div>
    );
  };

  const Tooltip = ({ def }) => {
    if (!def) return null;
    const { x, y, word, entry } = def;
    const items = entry
      ? [
          entry?.pam?.length ? `Kapampangan: ${entry.pam.slice(0, 3).join(", ")}` : null,
          entry?.tl?.length ? `Tagalog: ${entry.tl.slice(0, 3).join(", ")}` : null,
          entry?.en?.length ? `English: ${entry.en.slice(0, 3).join(", ")}` : null,
        ].filter(Boolean)
      : [];
    return (
      <div className="translate-tooltip" style={{ left: Math.max(8, x - 160), top: y + 22 }}>
        <div className="translate-tooltip__inner">
          <div className="translate-tooltip__title">{word}</div>
          {items.length ? items.map((s, i) => <div key={i} className="translate-tooltip__line">{s}</div>) : <div className="translate-hint">No entry</div>}
        </div>
      </div>
    );
  };

  // Main translate runner: posts to proxied /translate endpoint
  // Make run stable with useCallback so debounced functions can call it without needing recreation.
  const run = useCallback(async () => {
    setStatusMsg("");
    const textTrim = (stateRef.current.text || "").trim();
    if (!textTrim) {
      setStatusMsg("Enter some text to translate.");
      return;
    }
    const src = stateRef.current.source;
    const tgt = stateRef.current.target;
    const allowed = allowedTargetsFor(src);
    if (!tgt || !allowed.includes(tgt)) {
      setStatusMsg("Please choose a valid target language for the selected source.");
      return;
    }
    setLoading(true);
    setOut((o) => {
      const next = { ...o };
      next[tgt] = "";
      return next;
    });
    setErrors((e) => {
      const next = { ...e };
      next[tgt] = null;
      return next;
    });

    try {
      const { data } = await axios.post(
        "/translate",
        // Send single target (wrapped as array for compatibility)
        { text: textTrim, source: src, targets: [tgt] },
        { timeout: 20000 }
      );
      if (data && data.ok === false && data.error) {
        setStatusMsg(`Server error: ${data.error}`);
        setErrors((e) => {
          const next = { ...e };
          next[tgt] = data.error;
          return next;
        });
      } else if (data && data.translations && typeof data.translations === "object") {
        setOut((o) => ({ ...o, ...data.translations }));
      } else if (data && data.translated) {
        const tt = data.target || tgt;
        setOut((o) => ({ ...o, [tt]: data.translated }));
      } else {
        if (typeof data === "string") setOut((o) => ({ ...o, [tgt]: data }));
        else setOut((o) => ({ ...o, [tgt]: JSON.stringify(data) }));
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Translation request failed";
      setStatusMsg(msg);
      setErrors((e) => {
        const next = { ...e };
        next[tgt] = msg;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []); // no deps since it reads stateRef directly

  // Swap languages when valid (only pam↔fil or pam↔en). If swap would be invalid, do nothing.
  const swapLanguages = () => {
    const newSource = target;
    const newTargetCandidates = allowedTargetsFor(newSource);
    if (!newTargetCandidates.length) return; // invalid swap
    // If the old source fits as a valid target for newSource, keep it; else pick first allowed.
    const pickedTarget = newTargetCandidates.includes(source) ? source : newTargetCandidates[0];
    setSource(newSource);
    setTarget(pickedTarget);
  };

  // Debounced auto-translate on input/lang changes
  // Create one debounced function once, which reads latest values from stateRef and respects composition.
  const debouncedAutoRunRef = useRef(null);
  useEffect(() => {
    if (!debouncedAutoRunRef.current) {
      debouncedAutoRunRef.current = debounceFactory(() => {
        // don't run while composing
        if (composingRef.current) return;
        const { text: t, source: s, target: tg, auto: a } = stateRef.current;
        const ttrim = (t || "").trim();
        if (!a || !ttrim) return;
        const allowed = allowedTargetsFor(s);
        if (!allowed.includes(tg)) return;
        run();
      }, 500);
    }
    // no cleanup needed for the timer (internal to debounceFactory)
  }, [run]);

  // Trigger debounced auto-run whenever relevant state changes
  useEffect(() => {
    if (debouncedAutoRunRef.current) debouncedAutoRunRef.current();
  }, [text, source, target, auto]);

  return (
    <div className="screen-container translate-screen">
      <h2>Kapampangan Translation</h2>

      {/* Language top bar */}
      <div className="translate-topbar">
        <div className="topbar-side">
          <label className="translate-form__group">
            <span className="translate-label">From</span>
            <select className="translate-select" value={source} onChange={(e) => setSource(e.target.value)}>
              {Object.entries(LANGS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <button className="swap-btn" onClick={swapLanguages} title="Swap languages">⇄</button>
        <div className="topbar-side">
          <label className="translate-form__group">
            <span className="translate-label">To</span>
            <select className="translate-select" value={target} onChange={(e) => setTarget(e.target.value)}>
              {allowedTargetsFor(source).map((k) => (
                <option key={k} value={k}>{LANGS[k]}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="translate-allowed">Allowed: Kapampangan ↔ Tagalog, Kapampangan ↔ English</div>

      {/* Two-column translator */}
      <div className="translate-columns">
        <div className="translate-panel">
          <div className="translate-panel__header">
            <h3 className="translate-panel__title">{LANGS[source]}</h3>
            <div className="translate-panel__actions">
              <div className="char-count">{text.length} / {MAX_CHARS}</div>
              <label className="auto-toggle"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto</label>
              <button className="btn btn-secondary" onClick={() => { setText(""); setStatusMsg(""); }}>Clear</button>
              <button className="btn btn-primary" onClick={run} disabled={loading || !text.trim()}>{loading ? "Translating…" : "Translate"}</button>
            </div>
          </div>

          <textarea
            className="translate-textarea"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={() => {
              composingRef.current = false;
              // trigger debounced run after composition ends
              if (debouncedAutoRunRef.current) debouncedAutoRunRef.current();
            }}
            placeholder={`Enter ${LANGS[source]} text…`}
          />
          <div className="translate-status">{statusMsg}</div>
        </div>

        <div className="translate-panel">
          <div className="translate-panel__header">
            <h3 className="translate-panel__title">{`${LANGS[target]} (target)`}</h3>
            <div className="translate-panel__actions">
              {loading && <span className="loading-dot">Loading…</span>}
              {out[target] && <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText?.(out[target]); setStatusMsg("Copied"); setTimeout(() => setStatusMsg(""), 1200); }}>Copy</button>}
            </div>
          </div>

          {errors[target] ? (
            <div className="translate-error">Error: {errors[target]}</div>
          ) : out[target] ? (
            <Wordy value={out[target]} />
          ) : (
            <div className="translate-hint"><em>No translation yet</em></div>
          )}
        </div>

        <Tooltip def={hoverDef} />
      </div>
    </div>
  );
}
