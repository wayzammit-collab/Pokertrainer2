import { CardIcon, HandIcon } from "./components/CardIcon";
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Module({ name, choices, extraControls }) {
  const [scenario, setScenario] = useState("");
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [params, setParams] = useState({ opener: "BTN", defender: "SB", pos: "CO" });

  async function genScenario() {
    const query =
      name === "preflop_open"
        ? `?opener=${encodeURIComponent(params.pos)}`
        : name === "preflop_3bet"
        ? `?opener=${encodeURIComponent(params.opener)}&defender=${encodeURIComponent(params.defender)}`
        : "";
    const r = await fetch(`${API}/scenario/${name}${query}`);
    const d = await r.json();
    setScenario(d.text);
    setFeedback("");
  }

  async function getFeedback() {
    const r = await fetch(`${API}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_id: "n/a",
        module: name,
        action,
        reasoning: reason
      }),
    });
    const d = await r.json();
    setFeedback(d.feedback);
  }

  return (
    <div className="module">
      {extraControls && (
        <div className="row wrap">
          {name === "preflop_open" && (
            <>
              <label>Position</label>
              <select
                value={params.pos}
                onChange={e => setParams(p => ({ ...p, pos: e.target.value }))}
              >
                {["UTG/LJ","HJ","CO","BTN","SB"].map(p => <option key={p}>{p}</option>)}
              </select>
            </>
          )}
          {name === "preflop_3bet" && (
            <>
              <label>Opener</label>
              <select
                value={params.opener}
                onChange={e => setParams(p => ({ ...p, opener: e.target.value }))}
              >
                {["UTG/LJ","HJ","CO","BTN","SB"].map(p => <option key={p}>{p}</option>)}
              </select>
              <label>Defender</label>
              <select
                value={params.defender}
                onChange={e => setParams(p => ({ ...p, defender: e.target.value }))}
              >
                {["UTG/LJ","HJ","CO","BTN","SB"].map(p => <option key={p}>{p}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      <div className="row">
        <button onClick={genScenario}>Generate scenario</button>
      </div>

      <pre className="scenario">{scenario || "Click to generate a scenario."}</pre>

      <div className="row">
        <label>Action</label>
        <select value={action} onChange={e => setAction(e.target.value)}>
          <option value="">Choose…</option>
          {choices.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <textarea
        placeholder="Reasoning (ranges, blockers, MDF)…"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <button onClick={getFeedback} disabled={!action}>Get feedback</button>
      <pre className="feedback">{feedback}</pre>
    </div>
  );
}

export default function App() {
  return (
    <div className="container">
      <h1>Poker Trainer</h1>
<div style={{ marginBottom: 12}}><HandIcon cards="Ah Kh" size={36} fourColor /></div>
      <details open><summary>Bluff-Catching</summary>
        <Module name="bluffcatch" choices={["Call","Fold","Raise"]} />
      </details>

      <details><summary>Thin Value</summary>
        <Module name="thinvalue" choices={["Check","25–50%","66%+","Overbet"]} />
      </details>

      <details><summary>3-Bet Pots</summary>
        <Module name="threebet" choices={["Call","Fold","Raise/Jam"]} />
      </details>

      <details><summary>Preflop Open (RFI)</summary>
        <Module name="preflop_open" choices={["Open","Fold","Open 2.2–2.7bb","SB 3bb"]} extraControls />
      </details>

      <details><summary>Preflop 3-Bet</summary>
        <Module name="preflop_3bet" choices={["3-Bet","Call","Fold","size guidance"]} extraControls />
      </details>
    </div>
  );
}
