import { useEffect, useRef } from 'react';
import { ETHOS_TIERS, getTier } from '../lib/ethos-api';

interface Props {
  score: number;
}

// ── Canvas geometry ───────────────────────────────────────────────────────────
const DPR     = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2;
const CW      = 230;    // canvas CSS width
const CH      = 118;    // canvas CSS height — compact
const CX      = CW / 2;
const CY      = CH + 18; // pivot well below canvas → very flat arc
const R       = 148;    // large radius → wide flat arc
const THICK   = 10;     // ring half-thickness (total ring = 20px diameter)
const R_OUT   = R + THICK;
const R_IN    = R - THICK;
const GAP_DEG = 1.0;    // visual gap between tier segments (degrees)
const MAX     = 2800;

// Arc: 210° sweep, starting lower-left, ending lower-right
// With pivot below canvas, this creates a very flat wide horseshoe
const A_START = 195 * (Math.PI / 180);
const A_END   = 345 * (Math.PI / 180);
const A_RANGE = A_END - A_START;

function scoreToRad(s: number): number {
  return A_START + (Math.max(0, Math.min(s, MAX)) / MAX) * A_RANGE;
}

function drawGauge(canvas: HTMLCanvasElement, score: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(DPR, DPR);

  const halfGap = (GAP_DEG * Math.PI / 180) / 2;

  // ── Tier ring segments ────────────────────────────────────────────────────
  ETHOS_TIERS.forEach((tier) => {
    const aMin = scoreToRad(tier.min);
    const aMax = scoreToRad(tier.max);
    // Gap: skip at hard ends of the full arc
    const a0 = tier.min === 0   ? aMin : aMin + halfGap;
    const a1 = tier.max === MAX ? aMax : aMax - halfGap;
    if (a1 <= a0) return;

    const isActive   = score >= tier.max;
    const isPartial  = score > tier.min && score < tier.max;

    // Dimmed background
    ctx.beginPath();
    ctx.arc(CX, CY, R_OUT, a0, a1);
    ctx.arc(CX, CY, R_IN,  a1, a0, true);
    ctx.closePath();
    ctx.fillStyle   = tier.color;
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (!isActive && !isPartial) return;

    // Active fill
    const aFill = isActive ? a1 : scoreToRad(score);
    ctx.beginPath();
    ctx.arc(CX, CY, R_OUT, a0, aFill);
    ctx.arc(CX, CY, R_IN,  aFill, a0, true);
    ctx.closePath();
    ctx.fillStyle = tier.color;
    ctx.fill();

    // Inner edge highlight (thin bright line on top arc edge for depth)
    const grad = ctx.createRadialGradient(CX, CY, R_IN + 1, CX, CY, R_OUT - 1);
    grad.addColorStop(0,   'rgba(255,255,255,0.22)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1,   'rgba(0,0,0,0.08)');
    ctx.beginPath();
    ctx.arc(CX, CY, R_OUT, a0, aFill);
    ctx.arc(CX, CY, R_IN,  aFill, a0, true);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  });

  // ── Triangular needle ─────────────────────────────────────────────────────
  const tier  = getTier(score);
  const color = tier.color;
  const angle = scoreToRad(score);

  // Tip: just inside the inner ring
  const tipR  = R_IN - 6;
  const tipX  = CX + Math.cos(angle) * tipR;
  const tipY  = CY + Math.sin(angle) * tipR;

  // Base: two points perpendicular to needle direction, at pivot
  const baseW  = 4.5; // half-width of base
  const perpA  = angle + Math.PI / 2;
  const b1x    = CX + Math.cos(perpA) * baseW;
  const b1y    = CY + Math.sin(perpA) * baseW;
  const b2x    = CX - Math.cos(perpA) * baseW;
  const b2y    = CY - Math.sin(perpA) * baseW;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur  = 6;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(b1x, b1y);
  ctx.lineTo(b2x, b2y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  // Pivot ring (white fill, tier-colored stroke)
  ctx.beginPath();
  ctx.arc(CX, CY, 5.5, 0, Math.PI * 2);
  ctx.fillStyle   = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.8;
  ctx.stroke();

  // Pivot center dot
  ctx.beginPath();
  ctx.arc(CX, CY, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

/** Official Ethos "E" mark — the offset-bars path from favicon.svg */
function EthosE({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <path
        fill={color}
        fillRule="evenodd"
        d="M255.38 255.189a254.98 254.98 0 0 1-1.935 31.411H101v62.2h136.447a251.522 251.522 0 0 1-35.932 62.2H411v-62.2H237.447a250.584 250.584 0 0 0 15.998-62.2H411v-62.2H253.521a250.604 250.604 0 0 0-15.826-62.2H411V100H202.003a251.526 251.526 0 0 1 35.692 62.2H101v62.2h152.521a255 255 0 0 1 1.859 30.789Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function GaugeMeter({ score }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tier  = getTier(score);
  const color = tier.color;
  const pct   = Math.min(score, MAX) / MAX;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width        = CW * DPR;
    canvas.height       = CH * DPR;
    canvas.style.width  = `${CW}px`;
    canvas.style.height = `${CH}px`;
    drawGauge(canvas, score);
  }, [score]);

  return (
    <div className="gauge-wrapper" aria-label={`Score Ethos: ${score} — ${tier.nameLabel}`}>

      {/* ── Arc ── */}
      <div className="gauge-arc-wrap">
        <canvas ref={canvasRef} className="gauge-canvas" />
        <span className="gauge-label-start">0</span>
        <span className="gauge-label-end">2800</span>
      </div>

      {/* ── Score panel (no divider) ── */}
      <div className="gauge-panel">
        <div className="gauge-panel-logo">
          <EthosE color={color} size={22} />
          <span className="gauge-panel-ethos" style={{ color }}>ETHOS</span>
        </div>
        <div className="gauge-panel-score" style={{ color }}>{score}</div>
        <div className="gauge-progress-track">
          <div className="gauge-progress-fill" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
        </div>
        <div
          className="gauge-tier-pill"
          style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
        >
          {tier.nameLabel}
        </div>
      </div>
    </div>
  );
}
