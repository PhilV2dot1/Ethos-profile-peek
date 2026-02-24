import { ETHOS_TIERS, getTier } from '../lib/ethos-api';

interface Props {
  score: number;
}

// ── Geometry ─────────────────────────────────────────────────────────────────
// Layout: [arc SVG | score panel]
// Arc: wide flat half-ellipse, pivot near bottom
const ARC_W  = 220;
const ARC_H  = 130;
const CX     = ARC_W / 2;
const CY     = ARC_H - 10;   // pivot near bottom → flat arc
const R      = 102;
const STROKE = 12;
const MAX_SCORE = 2800;

// Arc spans 220° (110° each side of top), clockwise from lower-left to lower-right
// Angle 0° = right in SVG; start at 220°CW from right (lower-left), sweep 220°
const SWEEP  = 220;
const START  = 180 + (180 - SWEEP) / 2; // = 160°  (lower-left)
// end = START + SWEEP = 380° = 20° (lower-right)

function scoreToAngle(s: number): number {
  return START + (Math.max(0, Math.min(s, MAX_SCORE)) / MAX_SCORE) * SWEEP;
}

function polar(deg: number, r = R) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(s0: number, s1: number, r = R): string {
  const a0 = scoreToAngle(s0);
  const a1 = scoreToAngle(s1);
  const p0 = polar(a0, r);
  const p1 = polar(a1, r);
  const sweep = a1 - a0;
  const large = sweep > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

// Build a gradient stop list that maps score positions to tier colors
// We sample points along the full 0→2800 arc and assign colors
function buildGradientStops() {
  return ETHOS_TIERS.map((t) => ({
    offset: `${((t.min + (t.max - t.min) / 2) / MAX_SCORE) * 100}%`,
    color: t.color,
  }));
}

export function GaugeMeter({ score }: Props) {
  const tier    = getTier(score);
  const color   = tier.color;
  const pct     = Math.min(score, MAX_SCORE) / MAX_SCORE;

  // Needle geometry
  const needleAngle = scoreToAngle(score);
  const tip   = polar(needleAngle, R - 16);
  const base1 = polar(needleAngle + 90, 5);
  const base2 = polar(needleAngle - 90, 5);

  // Gradient stops (percent along the arc ≈ percent along gradient x-axis)
  const stops = buildGradientStops();

  // Active arc path (track from 0 to current score)
  const activePath  = arcPath(0, Math.min(score, MAX_SCORE));
  const fullPath    = arcPath(0, MAX_SCORE);

  // Clip gradient: we use a radialGradient along the arc path
  // Simpler: use a gradient paintServer on the full arc but clip to score
  // We use a mask: full gradient arc, masked by active arc with thicker stroke
  const gradId = 'tier-grad';
  const glowId = 'arc-glow';
  const maskId = 'arc-mask';

  // Score panel dimensions
  const PANEL_W = 96;
  const TOTAL_W = ARC_W + PANEL_W;
  const TOTAL_H = ARC_H;

  return (
    <div className="gauge-wrapper">
      <svg
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        className="gauge-svg"
        aria-label={`Score Ethos: ${score} — ${tier.nameLabel}`}
      >
        <defs>
          {/* Multi-stop tier gradient across the full arc width */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            {stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>

          {/* Glow filter */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Mask: reveal only the active portion of the gradient arc */}
          <mask id={maskId}>
            {/* White = visible, black = hidden */}
            {/* Draw the active arc segment as white stroke */}
            <path
              d={activePath}
              stroke="white"
              strokeWidth={STROKE + 4}
              fill="none"
              strokeLinecap="round"
            />
          </mask>
        </defs>

        {/* ── Background track ── */}
        <path
          d={fullPath}
          stroke="rgba(31,33,38,0.1)"
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
        />

        {/* ── Dimmed tier segments (color hints on track) ── */}
        {ETHOS_TIERS.map((t) => (
          <path
            key={t.name}
            d={arcPath(t.min, t.max)}
            stroke={t.color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="butt"
            opacity={0.14}
          />
        ))}

        {/* ── Full gradient arc, clipped to active score via mask ── */}
        <path
          d={fullPath}
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          mask={`url(#${maskId})`}
          filter={`url(#${glowId})`}
        />

        {/* ── Thin bright highlight on top of active arc ── */}
        <path
          d={activePath}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />

        {/* ── Tick marks at each tier boundary ── */}
        {ETHOS_TIERS.slice(1).map((t) => {
          const a  = scoreToAngle(t.min);
          const i  = polar(a, R - STROKE / 2 - 3);
          const o  = polar(a, R + STROKE / 2 + 2);
          return (
            <line
              key={t.name}
              x1={i.x} y1={i.y} x2={o.x} y2={o.y}
              stroke="rgba(31,33,38,0.2)"
              strokeWidth={1.2}
            />
          );
        })}

        {/* ── Needle ── */}
        <polygon
          points={`${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${base1.x.toFixed(1)},${base1.y.toFixed(1)} ${base2.x.toFixed(1)},${base2.y.toFixed(1)}`}
          fill={color}
          opacity={0.92}
        />
        <circle cx={CX} cy={CY} r={5.5} fill="var(--card)" stroke={color} strokeWidth={1.8} />
        <circle cx={CX} cy={CY} r={2} fill={color} />

        {/* ── Range endpoint labels ── */}
        {(() => {
          const L = polar(scoreToAngle(0), R + 18);
          const Rv = polar(scoreToAngle(MAX_SCORE), R + 18);
          return (
            <>
              <text x={L.x}  y={L.y}  textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fill="rgba(31,33,38,0.3)" fontFamily="Inter, sans-serif">0</text>
              <text x={Rv.x} y={Rv.y} textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fill="rgba(31,33,38,0.3)" fontFamily="Inter, sans-serif">2800</text>
            </>
          );
        })()}

        {/* ══ Score panel (right side) ══════════════════════════════════════ */}
        {/* Divider */}
        <line
          x1={ARC_W + 1} y1={8}
          x2={ARC_W + 1} y2={TOTAL_H - 8}
          stroke="rgba(31,33,38,0.1)"
          strokeWidth={1}
        />

        {/* Ethos logomark — official "E" offset bars */}
        {(() => {
          const lx = ARC_W + PANEL_W / 2 - 10;
          const ly = 12;
          return (
            <g transform={`translate(${lx}, ${ly})`} fill={color} opacity={0.85}>
              {/* 4 horizontal bars with rightward offset (faithful to favicon) */}
              <rect x={0}   y={0}    width={20} height={3.8} rx={0.8} />
              <rect x={2.5} y={6}    width={17} height={3.8} rx={0.8} />
              <rect x={4.5} y={12}   width={15} height={3.8} rx={0.8} />
              <rect x={0}   y={18}   width={20} height={3.8} rx={0.8} />
            </g>
          );
        })()}

        {/* "ETHOS" label under logo */}
        <text
          x={ARC_W + PANEL_W / 2}
          y={48}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          fill={color}
          letterSpacing="2.5"
          opacity={0.7}
        >
          ETHOS
        </text>

        {/* Score number */}
        <text
          x={ARC_W + PANEL_W / 2}
          y={82}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={36}
          fontWeight="700"
          fontFamily="Literata, Georgia, serif"
          fill={color}
          letterSpacing="-1.5"
        >
          {score}
        </text>

        {/* Progress bar under score */}
        {(() => {
          const bx = ARC_W + 10;
          const bw = PANEL_W - 20;
          const bh = 3;
          const by = 98;
          return (
            <>
              <rect x={bx} y={by} width={bw} height={bh} rx={bh / 2} fill="rgba(31,33,38,0.1)" />
              <rect x={bx} y={by} width={bw * pct} height={bh} rx={bh / 2} fill={color} />
            </>
          );
        })()}

        {/* Tier name pill */}
        {(() => {
          const py = 112;
          const pw = PANEL_W - 20;
          const px = ARC_W + 10;
          return (
            <>
              <rect x={px} y={py} width={pw} height={15} rx={7.5} fill={color} opacity={0.12} />
              <text
                x={ARC_W + PANEL_W / 2}
                y={py + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fontWeight="800"
                fontFamily="Inter, sans-serif"
                fill={color}
                letterSpacing="1.2"
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
