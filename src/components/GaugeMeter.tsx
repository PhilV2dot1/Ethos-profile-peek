import { ETHOS_TIERS, getTier } from '../lib/ethos-api';

interface Props {
  score: number;
}

const W = 280;
const CX = W / 2;
const CY = 155;
const R = 110;
const MAX_SCORE = 2800;

/** Convert polar to cartesian (angle in degrees, 0 = right) */
function polar(angleDeg: number, r = R) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Arc from startScore to endScore as an SVG path */
function arcPath(startScore: number, endScore: number): string {
  // Map score 0–2800 to angle -180°→0° (left to right half-circle)
  const startAngle = -180 + (startScore / MAX_SCORE) * 180;
  const endAngle   = -180 + (endScore   / MAX_SCORE) * 180;
  const s = polar(startAngle);
  const e = polar(endAngle);
  return `M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y}`;
}

/** Needle tip position for a given score */
function needlePos(score: number) {
  const angle = -180 + (Math.min(score, MAX_SCORE) / MAX_SCORE) * 180;
  return polar(angle, R - 10);
}

export function GaugeMeter({ score }: Props) {
  const tier  = getTier(score);
  const needle = needlePos(score);

  return (
    <div className="gauge-wrapper">
      <svg viewBox={`0 0 ${W} ${CY + 30}`} className="gauge-svg" aria-label={`Score: ${score}`}>

        {/* ── Tier arc segments ── */}
        {ETHOS_TIERS.map((t) => (
          <path
            key={t.name}
            d={arcPath(t.min, t.max)}
            stroke={t.color}
            strokeWidth={18}
            fill="none"
            strokeLinecap="butt"
            opacity={score >= t.min ? 1 : 0.2}
          />
        ))}

        {/* ── Tier boundary tick marks ── */}
        {ETHOS_TIERS.slice(1).map((t) => {
          const angle = -180 + (t.min / MAX_SCORE) * 180;
          const inner = polar(angle, R - 11);
          const outer = polar(angle, R + 11);
          return (
            <line
              key={t.name + '-tick'}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="var(--card)"
              strokeWidth={2}
            />
          );
        })}

        {/* ── Tier labels at boundary ── */}
        {[800, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600].map((v) => {
          const angle = -180 + (v / MAX_SCORE) * 180;
          const p = polar(angle, R + 26);
          return (
            <text
              key={v}
              x={p.x} y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={7.5}
              fill="var(--text-muted)"
              fontFamily="Inter, sans-serif"
            >
              {v}
            </text>
          );
        })}

        {/* ── Needle ── */}
        <line
          x1={CX} y1={CY}
          x2={needle.x} y2={needle.y}
          stroke={tier.color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={5} fill={tier.color} />

        {/* ── Score + tier label in center ── */}
        <text
          x={CX} y={CY - 22}
          textAnchor="middle"
          fontSize={38}
          fontWeight="700"
          fontFamily="Literata, Georgia, serif"
          fill={tier.color}
          letterSpacing="-1"
        >
          {score}
        </text>
        <text
          x={CX} y={CY - 4}
          textAnchor="middle"
          fontSize={10}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          fill={tier.color}
          letterSpacing="1"
          textDecoration="none"
          style={{ textTransform: 'uppercase' }}
        >
          {tier.nameLabel}
        </text>
      </svg>
    </div>
  );
}
