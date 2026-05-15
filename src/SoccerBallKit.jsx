import React from 'react';

const KITS = {
  brazil:      { primary: '#009C3B', secondary: '#FFDF00', accent: '#002776' },
  argentina:   { primary: '#75AADB', secondary: '#FFFFFF', accent: '#F6B40E' },
  usa:         { primary: '#B22234', secondary: '#FFFFFF', accent: '#3C3B6E' },
  germany:     { primary: '#000000', secondary: '#FFFFFF', accent: '#DD0000' },
  france:      { primary: '#002395', secondary: '#FFFFFF', accent: '#ED2939' },
  spain:       { primary: '#AA151B', secondary: '#F1BF00', accent: '#AA151B' },
  england:     { primary: '#FFFFFF', secondary: '#CF081F', accent: '#012169' },
  portugal:    { primary: '#006600', secondary: '#FF0000', accent: '#FFD700' },
  netherlands: { primary: '#FF6600', secondary: '#FFFFFF', accent: '#003DA5' },
  italy:       { primary: '#003DA5', secondary: '#FFFFFF', accent: '#009246' },
  japan:       { primary: '#003087', secondary: '#FFFFFF', accent: '#BC002D' },
  southkorea:  { primary: '#003DA5', secondary: '#FFFFFF', accent: '#CD2E3A' },
  mexico:      { primary: '#006847', secondary: '#FFFFFF', accent: '#CE1126' },
  nigeria:     { primary: '#008751', secondary: '#FFFFFF', accent: '#FFFFFF' },
  senegal:     { primary: '#00853F', secondary: '#FFFFFF', accent: '#FDEF42' },
  ghana:       { primary: '#FCD116', secondary: '#FFFFFF', accent: '#006B3F' },
  morocco:     { primary: '#C1272D', secondary: '#006233', accent: '#FFFFFF' },
  egypt:       { primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000' },
  cameroon:    { primary: '#007A5E', secondary: '#FFFFFF', accent: '#CE1126' },
  iran:        { primary: '#239F40', secondary: '#FFFFFF', accent: '#DA0000' },
};

const DEFAULT_KIT = { primary: '#1B456A', secondary: '#FFFFFF', accent: '#00BAF8' };

export default function SoccerBallKit({ kitId, size = 32 }) {
  const kit = KITS[kitId] || DEFAULT_KIT;
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.46;

  // Pentagon patch positions (simplified soccer ball pattern)
  const patches = [
    { x: cx,           y: cy - r * 0.38 },
    { x: cx + r * 0.38, y: cy + r * 0.12 },
    { x: cx + r * 0.23, y: cy + r * 0.42 },
    { x: cx - r * 0.23, y: cy + r * 0.42 },
    { x: cx - r * 0.38, y: cy + r * 0.12 },
  ];

  const patchSize = r * 0.28;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0 }}>
      {/* Ball background */}
      <circle cx={cx} cy={cy} r={r} fill={kit.secondary} stroke={kit.accent} strokeWidth={s * 0.03} />
      {/* Center pentagon patch */}
      <circle cx={cx} cy={cy} r={patchSize} fill={kit.primary} opacity={0.9} />
      {/* Surrounding patches */}
      {patches.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={patchSize * 0.72} fill={kit.primary} opacity={0.75} />
      ))}
      {/* Seam lines from center to surrounding patches */}
      {patches.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke={kit.accent} strokeWidth={s * 0.025} opacity={0.5} />
      ))}
      {/* Outer ring highlight */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={s * 0.04} />
    </svg>
  );
}
