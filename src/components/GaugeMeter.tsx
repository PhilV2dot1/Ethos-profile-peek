import { ETHOS_TIERS, getTier } from '../lib/ethos-api';

interface Props {
  score: number;
}

// ── Geometry ─────────────────────────────────────────────────────────────────
// Total SVG width = ARC section + PANEL section
const ARC_W  = 210;
const PANEL_W = 110;
const W      = ARC_W + PANEL_W;
const H      = 136;

// Arc pivot is below the bottom edge → very flat arc
const CX     = ARC_W / 2;
const CY     = H + 30;        // pivot well below the visible area → wide flat arc
const R      = 158;            // large radius
const STROKE = 13;             // segment thickness
const GAP    = 1.5;            // gap in score units converted to angle (visual gap between segments)
const MAX    = 2800;

// Arc sweeps from angle A_START (lower-left) to A_END (lower-right)
// With CY = H+30 and R=158, the arc top clears the SVG nicely
const A_START = 205;  // degrees CW from right (lower-left)
const A_END   = 335;  // degrees CW from right (lower-right)
const SWEEP   = A_END - A_START; // 130°

function scoreToAngle(s: number): number {
  return A_START + (Math.max(0, Math.min(s, MAX)) / MAX) * SWEEP;
}

function polar(deg: number, r = R) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

// Score gap → angle gap (so segments have a small visual separation)
function scoreGapToAngle(g: number): number {
  return (g / MAX) * SWEEP;
}

function segmentPath(sMin: number, sMax: number): string {
  const halfGap = scoreGapToAngle(GAP) / 2;
  const a0 = scoreToAngle(sMin) + (sMin === 0 ? 0 : halfGap);
  const a1 = scoreToAngle(sMax) - (sMax === MAX ? 0 : halfGap);
  const p0 = polar(a0);
  const p1 = polar(a1);
  const sweep = a1 - a0;
  const large = sweep > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

export function GaugeMeter({ score }: Props) {
  const tier  = getTier(score);
  const color = tier.color;
  const pct   = Math.min(score, MAX) / MAX;

  // Needle
  const needleAngle = scoreToAngle(score);
  const tip   = polar(needleAngle, R - 20);
  const base1 = polar(needleAngle + 90, 5.5);
  const base2 = polar(needleAngle - 90, 5.5);

  return (
    <div className="gauge-wrapper">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="gauge-svg"
        aria-label={`Ethos score: ${score} — ${tier.nameLabel}`}
      >
        <defs>
          <filter id="needle-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.25)" />
          </filter>
        </defs>

        {/* ── Tier segments — full arc, dimmed ── */}
        {ETHOS_TIERS.map((t) => (
          <path
            key={t.name + '-bg'}
            d={segmentPath(t.min, t.max)}
            stroke={t.color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            opacity={0.2}
          />
        ))}

        {/* ── Tier segments — lit for tiers the score has reached ── */}
        {ETHOS_TIERS.map((t) => {
          if (score < t.min) return null;
          // Partially lit if we're inside this tier
          const litMax = score >= t.max ? t.max : score;
          return (
            <path
              key={t.name + '-lit'}
              d={segmentPath(t.min, litMax)}
              stroke={t.color}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              opacity={1}
            />
          );
        })}

        {/* ── Needle ── */}
        <polygon
          points={`${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${base1.x.toFixed(1)},${base1.y.toFixed(1)} ${base2.x.toFixed(1)},${base2.y.toFixed(1)}`}
          fill={color}
          filter="url(#needle-shadow)"
        />
        {/* Pivot */}
        <circle cx={CX} cy={CY} r={6} fill="var(--card)" stroke={color} strokeWidth={2} />
        <circle cx={CX} cy={CY} r={2.5} fill={color} />

        {/* ── Score range labels ── */}
        {(() => {
          const L  = polar(A_START, R + 20);
          const Rv = polar(A_END,   R + 20);
          return (
            <>
              <text x={L.x}  y={L.y}  textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="rgba(31,33,38,0.35)" fontFamily="Inter,sans-serif">0</text>
              <text x={Rv.x} y={Rv.y} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="rgba(31,33,38,0.35)" fontFamily="Inter,sans-serif">2800</text>
            </>
          );
        })()}

        {/* ══ Right panel ══════════════════════════════════════════════════ */}

        {/* Vertical divider */}
        <line
          x1={ARC_W} y1={10} x2={ARC_W} y2={H - 10}
          stroke="rgba(31,33,38,0.1)" strokeWidth={1}
        />

        {/* Ethos "E" logomark — 4 offset horizontal bars (from favicon.svg) */}
        {(() => {
          const lx = ARC_W + PANEL_W / 2;
          const ly = 18;
          // Bars: widths 20, 17, 14, 20 — staggered right
          const bars = [
            { x: -10, w: 20, y: 0   },
            { x: -7,  w: 17, y: 6.5 },
            { x: -4,  w: 14, y: 13  },
            { x: -10, w: 20, y: 19.5},
          ];
          return (
            <g fill={color}>
              {bars.map((b, i) => (
                <rect key={i} x={lx + b.x} y={ly + b.y} width={b.w} height={4} rx={1} />
              ))}
            </g>
          );
        })()}

        {/* ETHOS wordmark */}
        <text
          x={ARC_W + PANEL_W / 2}
          y={52}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7}
          fontWeight="700"
          fontFamily="Inter,sans-serif"
          letterSpacing="3"
          fill={color}
          opacity={0.65}
        >
          ETHOS
        </text>

        {/* Score */}
        <text
          x={ARC_W + PANEL_W / 2}
          y={85}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={38}
          fontWeight="700"
          fontFamily="Literata,Georgia,serif"
          fill={color}
          letterSpacing="-1.5"
        >
          {score}
        </text>

        {/* Mini progress bar */}
        {(() => {
          const bx = ARC_W + 12;
          const bw = PANEL_W - 24;
          const by = 100;
          const bh = 3;
          return (
            <>
              <rect x={bx} y={by} width={bw}      height={bh} rx={bh / 2} fill="rgba(31,33,38,0.1)" />
              <rect x={bx} y={by} width={bw * pct} height={bh} rx={bh / 2} fill={color} />
            </>
          );
        })()}

        {/* Tier pill */}
        {(() => {
          const py = 110;
          const ph = 16;
          const pw = PANEL_W - 20;
          const px = ARC_W + 10;
          return (
            <>
              <rect x={px} y={py} width={pw} height={ph} rx={ph / 2} fill={color} opacity={0.13} />
              <text
                x={ARC_W + PANEL_W / 2}
                y={py + ph / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8.5}
                fontWeight="800"
                fontFamily="Inter,sans-serif"
                fill={color}
                letterSpacing="1"
                style={{ textTransform: 'uppercase' }}
              >
                {tier.nameLabel}
              </text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}
