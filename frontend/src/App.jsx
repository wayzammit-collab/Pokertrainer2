import React, { useMemo, useState } from "react";
import BTN_OPEN_100BB from "./btnRange.js";

const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const SUITS = ["s","h","d","c"];

function dealHand() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({rank:r, suit:s});
  const i = Math.floor(Math.random() * deck.length);
  const c1 = deck.splice(i,1);
  const j = Math.floor(Math.random() * deck.length);
  const c2 = deck.splice(j,1);
  return [c1,c2];
}

function comboKey(c1, c2) {
  const i1 = RANKS.indexOf(c1.rank);
  const i2 = RANKS.indexOf(c2.rank);
  if (i1 === i2) return c1.rank + c2.rank; // pairs
  const high = i1 < i2 ? c1 : c2;
  const low  = i1 < i2 ? c2 : c1;
  const suited = c1.suit === c2.suit ? "s" : "o";
  return high.rank + low.rank + suited; // e.g., "AKs", "QTo"
}

export default function App() {
  const [[c1,c2], setHand] = useState(dealHand());
  const [result, setResult] = useState(null); // "correct" | "wrong"
  const [lastKey, setLastKey] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const key = useMemo(()=>comboKey(c1,c2), [c1,c2]);
  const isOpen = BTN_OPEN_100BB[key] === true;

  function answer(choice) {
    const correct = (choice === "Raise" && isOpen) || (choice === "Fold" && !isOpen);
    setResult(correct ? "correct" : "wrong");
    setLastKey(key);
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setShowChart(!correct);
  }

  function nextHand() {
    const [n1,n2] = dealHand();
    setHand([n1,n2]);
    setResult(null);
    setShowChart(false);
  }

  return (
    <div className="wrap">
      <header className="head">
        <div>6‑Max • 100bb • BTN RFI</div>
        <div>Score: {score.correct}/{score.total}</div>
      </header>

      <div className="hand">
        <span className="card">{c1.rank}{c1.suit.toUpperCase()}</span>
        <span className="card">{c2.rank}{c2.suit.toUpperCase()}</span>
        {result === "correct" && <span className="mark good" title="Correct">✔</span>}
        {result === "wrong" && <span className="mark bad" title="Wrong">✘</span>}
      </div>

      <div className="actions">
        <button className="primary" onClick={()=>answer("Raise")}>Raise</button>
        <button onClick={()=>answer("Fold")}>Fold</button>
        <button onClick={nextHand}>Next</button>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showChart}
            onChange={e=>setShowChart(e.target.checked)}
          /> Show chart
        </label>
      </div>

      {showChart && <RangeChart highlight={lastKey} />}

      <footer className="foot">
        Tip: Chart auto‑opens when an answer is wrong. Toggle “Show chart” to keep it visible. 
      </footer>
    </div>
  );
}

function RangeChart({ highlight }) {
  return (
    <div className="chart">
      <div className="grid">
        {RANKS.map((r1, i) => (
          <div className="row" key={r1}>
            {RANKS.map((r2, j) => {
              let k;
              if (i === j) k = r1 + r2;           // pair
              else if (i < j) k = r1 + r2 + "s";  // suited above diagonal
              else k = r2 + r1 + "o";             // offsuit below diagonal
              const open = BTN_OPEN_100BB[k] === true;
              const isHL = k === highlight;
              const cls = `cell ${open ? "open" : "fold"} ${isHL ? "hl" : ""}`;
              return (
                <div key={k} className={cls} title={k}>
                  {k}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="legend">
        <span className="box open"></span> Open
        <span className="box fold"></span> Fold
        <span className="box hl"></span> Current hand
      </div>
    </div>
  );
}
