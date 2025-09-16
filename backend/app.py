from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional, Dict
import random

app = FastAPI(title="Poker Trainer API")

# Allow localhost React to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Scenario(BaseModel):
    id: str
    module: str
    text: str

class Answer(BaseModel):
    scenario_id: str
    module: Literal["bluffcatch","thinvalue","threebet","preflop_open","preflop_3bet"]
    action: str
    reasoning: Optional[str] = ""

# Baseline hints (ASCII-only text)
RFI_BASE_HINT: Dict[str, str] = {
    "UTG/LJ": "RFI ~ 18-22%; tighter broadways, pairs, suited aces down to A5s.",
    "HJ": "RFI ~ 22-26%; add suited broadways, some suited connectors.",
    "CO": "RFI ~ 28-32%; add suited gappers and offsuit broadways.",
    "BTN": "RFI ~ 42-48%; widest range; many suited/offsuit broadways, suited connectors.",
    "SB": "Raise-first ~ 40-46% with raise-only strategy; small open size common."
}

THREEBET_HINT: Dict[str, str] = {
    "BTN-vs-SB": "SB 3-bets ~14-16% (linear-ish): strong broadways/pairs, suited wheel aces as blockers.",
    "BB-vs-BTN": "BB 3-bets ~12-14% baseline; linear vs polarized mixes by pool.",
    "SB-vs-BTN": "OOP sizing bigger (5.0-5.5x); similar idea to BTN-vs-SB matchups."
}

# --- Postflop generators ---
def gen_bluffcatch() -> Scenario:
    options = [
        ("bc1", "BTN vs BB SRP — River Overbet",
         "6-max 100bb. BTN opens 2.5bb, BB calls. Pot 5.5bb.\n"
         "Flop Kc 9d 4c — BTN 33% c-bet, BB calls.\n"
         "Turn 2h — check/check.\n"
         "River 6c — BB overbets 150% pot.\n"
         "Hero: BTN holds Ac Qd.\n"
         "Task: Call or fold vs 1.5x pot? Discuss range vs range, blockers, bluff supply, MDF."),
        ("bc2", "CO vs BB SRP — Missed Turn, River Donk",
         "6-max 100bb. CO opens 2.5bb, BB calls. Pot 5.5bb.\n"
         "Flop Js 8d 3c — CO 33% c-bet, BB calls.\n"
         "Turn 3d — check/check.\n"
         "River Tc — BB leads 125% pot.\n"
         "Hero: CO holds Qc Jd.\n"
         "Task: Call/fold/raise? Use blockers and MDF."),
    ]
    key, title, body = random.choice(options)
    return Scenario(id=key, module="bluffcatch", text=f"{title}\n{body}")

def gen_thinvalue() -> Scenario:
    key, title, body = (
        "tv1", "CO vs BB — Paired-Paired River",
        "6-max 100bb. CO opens 2.5bb, BB calls. Pot 5.5bb.\n"
        "Flop Ts 6d 2s — CO 33% c-bet, BB calls.\n"
        "Turn Tc — check/check.\n"
        "River 2d — BB checks.\n"
        "Hero: CO holds Ad Td.\n"
        "Task: Choose river size (check, 25-50%, 66%+, overbet). Targets and why."
    )
    return Scenario(id=key, module="thinvalue", text=f"{title}\n{body}")

def gen_3bet() -> Scenario:
    key, title, body = (
        "b3p1", "SB 3-bet vs BTN — Polar River Jam",
        "6-max 100bb. BTN opens 2.5bb, SB 3-bets 9bb, BTN calls. Pot 19bb.\n"
        "Flop Qh Js 5s — SB 33% bet, BTN calls.\n"
        "Turn 3c — SB 75% bet, BTN calls.\n"
        "River Kd — SB jams ~2x pot.\n"
        "Hero: BTN holds Qc Jd.\n"
        "Task: Call or fold? Discuss nuts advantage, removal, bluff supply, pot odds."
    )
    return Scenario(id=key, module="threebet", text=f"{title}\n{body}")

# --- Preflop generators ---
RFI_POSITIONS = ["UTG/LJ", "HJ", "CO", "BTN", "SB"]

def gen_preflop_open(pos: str) -> Scenario:
    pos_clean = pos if pos in RFI_POSITIONS else random.choice(RFI_POSITIONS)
    sample_hands = ["AJo","KQo","A5s","K9s","QTs","J9s","55","77","A8o","T9s"]
    hand = random.choice(sample_hands)
    text = (
        "Open Trainer (RFI)\n"
        f"Position: {pos_clean}\n"
        f"Hand: {hand}\n"
        "Task: Open or Fold? Suggested sizes: 2.2-2.7bb (SB ~3bb). "
        f"Hint: {RFI_BASE_HINT.get(pos_clean,'')}"
    )
    return Scenario(id="preflop_open", module="preflop_open", text=text)

def gen_preflop_3bet(opener: str, defender: str) -> Scenario:
    open_pos = opener if opener in RFI_POSITIONS else "BTN"
    def_pos = defender if defender in RFI_POSITIONS else "SB"
    sample_hands = ["AQo","A5s","KJs","QJs","TT","99","AJo","KQo"]
    hand = random.choice(sample_hands)
    match = f"{def_pos}-vs-{open_pos}"
    # Simple hint map
    if match == "SB-vs-BTN":
        hint = THREEBET_HINT.get("SB-vs-BTN", "IP ~3.5x, OOP ~5.0-5.5x.")
    elif match == "BTN-vs-SB":
        hint = THREEBET_HINT.get("BTN-vs-SB", "IP ~3.5x, OOP ~5.0-5.5x.")
    else:
        hint = "IP ~3.5x, OOP ~5.0-5.5x. Use blockers and consider linear vs polarized mixes."
    text = (
        "3-Bet Trainer\n"
        f"Opener: {open_pos}, Defender: {def_pos}\n"
        f"Hand: {hand}\n"
        f"Task: 3-Bet / Call / Fold? Give size. Notes: {hint}"
    )
    return Scenario(id="preflop_3bet", module="preflop_3bet", text=text)

# --- Feedback engine (rule-based) ---
def feedback_engine(scenario: Scenario, action: str, reasoning: str) -> str:
    t = scenario.text.lower()
    tips = []
    if ("150% pot" in t) or ("125% pot" in t) or ("2x pot" in t) or ("overbet" in t):
        tips.append("MDF: Pot/(Pot+Bet). 1.5x => 40%, 1.25x => ~44%.")
    if "check/check" in t:
        tips.append("After IP checks turn, OOP polarizes rivers; pick bluff-catchers that block value and unblock bluffs.")
    if ("3-bet" in t) or ("3-bets" in t):
        tips.append("3-bet pots: stronger ranges; big river jams need strong bluff-catchers or nut blockers.")
    if any(s in t for s in [" flush", "s ", "c ", "d ", "h "]):  # crude suit/flush heuristic
        tips.append("Track front-door vs back-door flushes and key blockers on rivers.")
    if scenario.module == "preflop_open":
        tips.append("RFI: tighter early, widest BTN/SB; sizes 2.2-2.7bb (SB ~3bb).")
    if scenario.module == "preflop_3bet":
        tips.append("3-bet sizing: IP ~3.5x, OOP ~5.0-5.5x. Use blockers; linear vs polarized by matchup.")

    a = (action or "").lower()
    if a.startswith("call"): tips.append("Call when removal favors you and equity clears pot-odds.")
    if a.startswith("fold"): tips.append("Exploit under-bluffing by folding marginal bluff-catchers.")
    if a.startswith("raise") or ("jam" in a): tips.append("Raise polar (nuts + low-SDV bluffs); avoid merged raises.")

    if not tips:
        tips.append("State range advantage, nutted combos, and your future-street plan.")
    return "Feedback:\n- " + "\n- ".join(tips)

# --- API Routes ---
@app.get("/health")
def health() -> Dict[str, bool]:
    return {"ok": True}

@app.get("/scenario/{module}", response_model=Scenario)
def scenario(
    module: Literal["bluffcatch","thinvalue","threebet","preflop_open","preflop_3bet"],
    opener: Optional[str] = None,
    defender: Optional[str] = None,
):
    if module == "bluffcatch":
        return gen_bluffcatch()
    if module == "thinvalue":
        return gen_thinvalue()
    if module == "threebet":
        return gen_3bet()
    if module == "preflop_open":
        return gen_preflop_open(opener or "CO")
    if module == "preflop_3bet":
        return gen_preflop_3bet(opener or "BTN", defender or "SB")
    return gen_bluffcatch()

@app.post("/feedback")
def feedback(ans: Answer) -> Dict[str, str]:
    # For simplicity, generate a fresh scenario per module for deterministic tips.
    mod = ans.module
    if mod == "bluffcatch":
        s = gen_bluffcatch()
    elif mod == "thinvalue":
        s = gen_thinvalue()
    elif mod == "threebet":
        s = gen_3bet()
    elif mod == "preflop_open":
        s = gen_preflop_open("CO")
    elif mod == "preflop_3bet":
        s = gen_preflop_3bet("BTN", "SB")
    else:
        s = gen_bluffcatch()
    return {"feedback": feedback_engine(s, ans.action, ans.reasoning or "")}
