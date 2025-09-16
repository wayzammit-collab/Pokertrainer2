import React from "react";

type Suit = "s" | "h" | "d" | "c";

const suitChar: Record<Suit, string> = {
s: "♠",
h: "♥",
d: "♦",
c: "♣",
};

const suitColor2: Record<Suit, string> = {
s: "#111", // spade: black
c: "#111", // club: black
h: "#e53935", // heart: red
d: "#e53935", // diamond: red
};

const suitColor4: Record<Suit, string> = {
s: "#111", // spade: black
h: "#e53935", // heart: red
d: "#1976d2", // diamond: blue
c: "#2e7d32", // club: green
};

// Normalize rank: map "T" -> "10", keep others uppercase
function normRank(r: string) {
const up = r?.toUpperCase?.() ?? "";
return up === "T" ? "10" : up;
}

export function CardIcon({
code, // e.g., "Ah", "Td", "7c"
size = 24, // font-size in px
fourColor = false,
bold = true,
style,
}: {
code: string;
size?: number;
fourColor?: boolean;
bold?: boolean;
style?: React.CSSProperties;
}) {
if (!code || code.length < 2) return null;
const r = normRank(code);
const s = code.toLowerCase() as Suit;
const colorMap = fourColor ? suitColor4 : suitColor2;

return (
<span
style={{
fontFamily:
"'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji', system-ui, sans-serif",
fontWeight: bold ? 700 : 500,
fontSize: size,
lineHeight: 1,
color: colorMap[s],
display: "inline-flex",
alignItems: "center",
gap: 2,
...style,
}}
aria-label={r + suitChar[s]}
title={r + suitChar[s]}
>
<span>{r}</span>
<span>{suitChar[s]}</span>
</span>
);
}

export function HandIcon({
cards, // e.g., "Ah Kh" or ["Ah","Kh"]
size = 24,
gap = 8,
fourColor = false,
bold = true,
style,
}: {
cards: string | string[];
size?: number;
gap?: number;
fourColor?: boolean;
bold?: boolean;
style?: React.CSSProperties;
}) {
const list = Array.isArray(cards) ? cards : cards.trim().split(/\s+/);
return (
<span style={{ display: "inline-flex", gap, ...style }}>
{list.map((c, i) => (
<CardIcon key={i} code={c} size={size} fourColor={fourColor} bold={bold} />
))}
</span>
);
}