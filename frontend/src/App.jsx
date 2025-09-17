import React, { useEffect, useMemo, useState } from "react";
import BTN_FREQ_100BB from "./btnFreq.js";

const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const SUITS = ["s","h","d","c"];
const SUIT_ICON = { s: "♠", h: "♥", d: "♦", c: "♣" };

function asCard(x) {
  const c = Array.isArray(x) ? x[0] : x;
  return c && typeof c.rank === "string" && typeof c.suit === "string" ? { rank: c.rank, suit: c.suit } : null;
}

function deckDeal() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });
  const i = Math.floor(Math.random() * deck.length);
  const a = asCard(deck.splice(i, 1)[0]);
  const j = Math.floor(Math.random() * deck.length);
  const b = asCard(deck.splice(j, 1)[0]);
  return [a, b];
}

function deckDealValid() {
  let [a, b] = deckDeal();
  if (!a || !b) [a, b] = deckDeal();
  if (!a || !b) return [{ rank: "A", suit: "s" }, { rank: "K", suit: "d" }];
  return [a, b];
}

function comboKey(c1, c2) {
  const i1 = RANKS.indexOf(c1.rank);
  const i2 = RANKS.indexOf(c2.rank);
  if (i1 === i2) return c1.rank + c2.rank;
  const hi = i1 < i2 ? c1 : c2;
  const lo = i1 < i2 ? c2 : c1;
  return hi.rank + lo.rank + (c1.suit === c2.suit ? "s" : "o");
}

function handLabelFromKey(k) {
  if (k.length === 2) return k;
  const r1 = k[0], r2 = k[1], t = k[2];
  return r1 + r2 + (t === "s" ? "s" : "o");
}

function cardText(c) { return c.rank + " " + (SUIT_ICON[c.suit] || c.suit.toUpperCase()); }

function colorForPct(pct) {
  const p = Math.max(0, Math.min(100, pct));
  const g = Math.round(40 + (p / 100) * 120);
  const r = Math.round(90 + ((100 - p) / 100) * 100);
  const b = 80;
  return `rgb(${r}, ${g}, ${b})`;
}

function Card({ card, onClick }) {
  return (
    <span className="card" onClick={onClick} style={{ cursor: "pointer", fontSize: 20, letterSpacing: 1 }}>
      {cardText(card)}
    </span>
  );
}

function MiniChart({ highlight, freqMap }) {
  return (
    <div className="chart" style={{ marginTop: 10 }}>
      <div className="grid">
        {RANKS.map((r1, i) => (
          <div className="row" key={r1}>
            {RANKS.map((r2, j) => {
              let k;
              if (i === j) k = r1 + r2;
              else if (i < j) k = r1 + r2 + "s";
              else k = r2 + r1 + "o";
              const f = typeof freqMap[k] === "number" ? freqMap[k] : 0;
              const isHL = k === highlight;
              const style = {
                background: colorForPct(f),
                border: isHL ? "2px solid #ffda6b" : "1px solid #2a3245",
                color: "#fff",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              };
              return (
                <div key={k} className="cell" style={style} title={`${handLabelFromKey(k)}: raise ${Math.round(f)}%`}>
                  {handLabelFromKey(k)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  // Object state with nonce: guarantees new reference on Next
  const [hand, setHand] = useState(() => {
    const [a, b] = deckDealValid();
    return { c1: a, c2: b, nonce: Math.random() };
  });
  const { c1, c2 } = hand;

  const [result, setResult] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [score, setScore] = useState(0);
  const [mixPct, setMixPct] = useState(50);
  const [tolerance, setTolerance] = useState(10);

  useEffect(() => {
    const savedChart = localStorage.getItem("btn_chart_toggle");
    if (savedChart === "true") setShowChart(true);
    const savedTol = Number(localStorage.getItem("btn_tol") || "10");
    if (!Number.isNaN(savedTol)) setTolerance(savedTol);
  }, []);

  useEffect(() => {
    localStorage.setItem("btn_chart_toggle", showChart ? "true" : "false");
  }, [showChart]);

  useEffect(() => {
    localStorage.setItem("btn_tol", String(tolerance));
  }, [tolerance]);

  function next() {
    setResult(null);
    setShowChart(false);
    setHand(() => {
      const [a, b] = deckDealValid();
      const obj = { c1: a, c2: b, nonce: Math.random() };
      console.log("Next ->", obj);
      return obj;
    });
  }

  const key = useMemo(() => comboKey(c1, c2), [c1, c2, hand.nonce]);
  const raiseFreq = typeof BTN_FREQ_100BB[key] === "number" ? BTN_FREQ_100BB[key] : 0;

  function gradePercent(percent) {
    if (percent === "PURE_RAISE") return raiseFreq === 100;
    if (percent === "PURE_FOLD") return raiseFreq === 0;
    if (raiseFreq === 0 || raiseFreq === 100) return false;
    return Math.abs(percent - raiseFreq) <= tolerance;
  }

  function acceptImmediate(percent) {
    const ok = gradePercent(percent);
    setResult(ok ? "correct" : "wrong");
    if (ok) setScore(s => s + 1);
    if (!ok) setShowChart(true);
    // Auto-advance on correct after a short tick to show feedback
    if (ok) setTimeout(next, 200);
  }

  function submitManual() {
    const p = Math.max(0, Math.min(100, Number(mixPct) || 0));
    const ok = gradePercent(p);
    setResult(ok ? "correct" : "wrong");
    if (ok) setScore(s => s + 1);
    if (!ok) setShowChart(true);
    if (ok) setTimeout(next, 200);
  }

  return (
    <div className="wrap">
      <header className="head">
        <div>BTN RFI Trainer</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>Score: {score}</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Tol ±
            <input
              type="number"
              min={1}
              max={30}
              value={tolerance}
              onChange={e => setTolerance(Math.max(1, Math.min(30, Number(e.target.value) || 10)))}
              style={{ width: 52 }}
            />
            %
          </label>
        </div>
      </header>

      <div className="hand">
        <Card card={c1} onClick={next} />
        <Card card={c2} onClick={next} />
        {result === "correct" && <span className="mark good">✔</span>}
        {result === "wrong" && <span className="mark bad">✘</span>}
      </div>

      <div className="actions" style={{ gap: 10, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
        {/* Instant-submit pure buttons */}
        <button onClick={() => acceptImmediate("PURE_RAISE")}>Pure Raise</button>
        <button onClick={() => acceptImmediate("PURE_FOLD")}>Pure Fold</button>

        {/* Mixed quick options (instant) + manual input (Submit) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 6, padding: "4px 8px", background: "#202634" }}>
          <span>Mixed</span>
          <button onClick={() => acceptImmediate(25)}>25</button>
          <button onClick={() => acceptImmediate(50)}>50</button>
          <button onClick={() => acceptImmediate(75)}>75</button>
          <input
            type="number"
            min={0}
            max={100}
            value={mixPct}
            onChange={e => setMixPct(e.target.value)}
            style={{ width: 64 }}
            placeholder="0-100"
          />
          <button className="primary" onClick={submitManual}>Submit</button>
        </div>

        <button onClick={next}>Next</button>
        <button onClick={() => setShowChart(s => !s)}>{showChart ? "Hide chart" : "Chart"}</button>
      </div>

      {showChart && <MiniChart highlight={key} freqMap={BTN_FREQ_100BB} />}
    </div>
  );
}
