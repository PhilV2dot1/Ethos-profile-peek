import { ETHOS_TIERS, getTier } from '../lib/ethos-api';

interface Props {
  score: number;
}

// ── Geometry ────────────────────────────────────────────────
// Wide, flat arc: from -210° to -330° (sweep = 240°, slightly past horizontal)
// i.e. starts lower-left, sweeps across top, ends lower-right
const W  = 320;
const H  = 178;          // compact height
const CX = W / 2;
const CY = H - 18;       // pivot close to bottom — makes the arc "flat"
const R  = 134;          // large radius for a wide arc
const STROKE = 11;       // thin, modern track width

const MAX_SCORE = 2800;

// Convert a score value to an angle along the arc
function scoreToAngle(s: number): number {
  const pct = Math.max(0, Math.min(1, s / MAX_SCORE));
  // Sweep from ARC_START (-210) going counter-clockwise by 240° to ARC_END (-330 = -210 - 240 + 360 wraps)
  // Easier: start at 210° measured from positive-X going clockwise, end at 330°
  // Let's define start=210° CW from right (= lower-left), end=330° (= lower-right), sweep=240° CW
  return 210 + pct * 240; // degrees clockwise from positive-X axis
}

function polar(angleDeg: number, r = R) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

// SVG arc path for a score segment [s0 → s1]
function arcPath(s0: number, s1: number, r = R): string {
  const a0 = scoreToAngle(s0);
  const a1 = scoreToAngle(s1);
  const p0 = polar(a0, r);
  const p1 = polar(a1, r);
  // large-arc-flag: 1 if sweep > 180°
  const sweep = a1 - a0;
  const large = sweep > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export function GaugeMeter({ score }: Props) {
  const tier   = getTier(score);
  const color  = tier.color;

  // Needle
  const needleAngle = scoreToAngle(score);
  const needleTip   = polar(needleAngle, R - 18);
  const needleBase  = polar(needleAngle + 90, 6);
  const needleBase2 = polar(needleAngle - 90, 6);

  // Active fill arc (0 → score)
  const fillPath = arcPath(0, Math.min(score, MAX_SCORE));

  // Score label position — just below the center, above pivot
  const labelY = CY - 14;

  // Three reference ticks: 0, 1400 (neutral), 2800
  const tickScores = [0, 1400, 2800];

  return (
    <div className="gauge-wrapper">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="gauge-svg"
        aria-label={`Ethos score: ${score} — ${tier.nameLabel}`}
      >
        <defs>
          {/* Glow filter for active arc */}
          <filter id="arc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for active arc: tier color → lighter */}
          <linearGradient id="arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="1"   />
          </linearGradient>
        </defs>

        {/* ── Background track (full arc, dark) ── */}
        <path
          d={arcPath(0, MAX_SCORE)}
          stroke="rgba(31,33,38,0.12)"
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
        />

        {/* ── Tier color segments (dimmed) ── */}
        {ETHOS_TIERS.map((t) => (
          <path
            key={t.name}
            d={arcPath(t.min, t.max)}
            stroke={t.color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="butt"
            opacity={0.18}
          />
        ))}

        {/* ── Active fill arc (score progress) ── */}
        <path
          d={fillPath}
          stroke="url(#arc-gradient)"
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          filter="url(#arc-glow)"
        />

        {/* ── Thin inner track highlight ── */}
        <path
          d={fillPath}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />

        {/* ── Reference tick marks ── */}
        {tickScores.map((v) => {
          const a = scoreToAngle(v);
          const inner = polar(a, R - STROKE / 2 - 6);
          const outer = polar(a, R + STROKE / 2 + 4);
          return (
            <line
              key={v}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="rgba(31,33,38,0.25)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* ── Needle (triangle) ── */}
        <polygon
          points={`${needleTip.x.toFixed(1)},${needleTip.y.toFixed(1)} ${needleBase.x.toFixed(1)},${needleBase.y.toFixed(1)} ${needleBase2.x.toFixed(1)},${needleBase2.y.toFixed(1)}`}
          fill={color}
          opacity={0.9}
        />
        {/* Pivot circle */}
        <circle cx={CX} cy={CY} r={6} fill="var(--card)" stroke={color} strokeWidth={2} />
        <circle cx={CX} cy={CY} r={2.5} fill={color} />

        {/* ── Ethos logomark — centered above score ── */}
        {/* Stylised "E" — simplified bars matching favicon */}
        <g transform={`translate(${CX - 11}, ${labelY - 68})`} opacity={0.18} fill="var(--text)">
          {/* Top bar */}
          <rect x="0"  y="0"  width="22" height="4.5" rx="1" />
          {/* Mid-top bar (offset right) */}
          <rect x="3"  y="7"  width="19" height="4.5" rx="1" />
          {/* Mid-bot bar (offset right more) */}
          <rect x="5"  y="14" width="17" height="4.5" rx="1" />
          {/* Bottom bar */}
          <rect x="0"  y="21" width="22" height="4.5" rx="1" />
        </g>

        {/* ── Score number ── */}
        <text
          x={CX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize={44}
          fontWeight="700"
          fontFamily="Literata, Georgia, serif"
          fill={color}
          letterSpacing="-2"
        >
          {score}
        </text>

        {/* ── Tier name pill ── */}
        {/* Background pill */}
        <rect
          x={CX - 36} y={labelY + 5}
          width={72} height={16}
          rx={8}
          fill={color}
          opacity={0.12}
        />
        <text
          x={CX}
          y={labelY + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          fill={color}
          letterSpacing="1.5"
          style={{ textTransform: 'uppercase' }}
        >
          {tier.nameLabel}
        </text>

        {/* ── Range labels: 0 on left, 2800 on right ── */}
        {(() => {
          const left  = polar(scoreToAngle(0),    R + 20);
          const right = polar(scoreToAngle(2800), R + 20);
          return (
            <>
              <text x={left.x}  y={left.y}  textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="rgba(31,33,38,0.35)" fontFamily="Inter, sans-serif">0</text>
              <text x={right.x} y={right.y} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="rgba(31,33,38,0.35)" fontFamily="Inter, sans-serif">2800</text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}
