import { useEffect, useRef } from 'react';
import { ETHOS_TIERS, getTier } from '../lib/ethos-api';

interface Props {
  score: number;
}

// ── Canvas constants ──────────────────────────────────────────────────────────
const DPR      = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2;
const CW       = 240;   // canvas CSS width (px)
const CH       = 130;   // canvas CSS height
const CX       = CW / 2;
const CY       = CH - 2; // pivot near bottom → flat arc
const R_OUT    = 112;   // outer radius of arc ring
const R_IN     = 88;    // inner radius  → ring thickness = 24px
const GAP_DEG  = 1.2;   // degrees of gap between tier segments

// Arc spans 200° total: from 190° to 350° (0° = right, clockwise)
// This gives a wide flat horseshoe shape
const A_START  = 190 * (Math.PI / 180);
const A_END    = 350 * (Math.PI / 180);
const A_RANGE  = A_END - A_START; // 160° in radians
const MAX      = 2800;

function scoreToRad(s: number): number {
  return A_START + (Math.max(0, Math.min(s, MAX)) / MAX) * A_RANGE;
}

function drawGauge(
  canvas: HTMLCanvasElement,
  score: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Scale for retina
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(DPR, DPR);

  const gapRad = GAP_DEG * (Math.PI / 180);
  const halfGap = gapRad / 2;

  // Draw each tier segment
  ETHOS_TIERS.forEach((tier) => {
    const aMin = scoreToRad(tier.min);
    const aMax = scoreToRad(tier.max);

    // Apply gap: inset from each edge (but not at the very start/end of the full arc)
    const a0 = tier.min === 0   ? aMin : aMin + halfGap;
    const a1 = tier.max === MAX ? aMax : aMax - halfGap;

    if (a1 <= a0) return;

    // Determine if this segment is fully active, partially active, or inactive
    const isFullyActive  = score >= tier.max;
    const isPartlyActive = score > tier.min && score < tier.max;
    const isInactive     = score <= tier.min;

    // ── Background (dimmed) ring segment ──────────────────────────────
    ctx.beginPath();
    ctx.arc(CX, CY, R_OUT, a0, a1);
    ctx.arc(CX, CY, R_IN,  a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = tier.color;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (isInactive) return;

    // ── Active (lit) portion ──────────────────────────────────────────
    const aActive = isFullyActive ? a1 : scoreToRad(score);

    ctx.beginPath();
    ctx.arc(CX, CY, R_OUT, a0, aActive);
    ctx.arc(CX, CY, R_IN,  aActive, a0, true);
    ctx.closePath();
    ctx.fillStyle = tier.color;
    ctx.globalAlpha = 1;
    ctx.fill();

    // Subtle top shine on active segment
    if (!isInactive) {
      const grad = ctx.createRadialGradient(CX, CY, R_IN, CX, CY, R_OUT);
      grad.addColorStop(0,   'rgba(255,255,255,0.0)');
      grad.addColorStop(0.6, 'rgba(255,255,255,0.0)');
      grad.addColorStop(1,   'rgba(255,255,255,0.18)');
      ctx.beginPath();
      ctx.arc(CX, CY, R_OUT, a0, aActive);
      ctx.arc(CX, CY, R_IN,  aActive, a0, true);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Partial: draw a clean edge line at the score boundary
    if (isPartlyActive) {
      ctx.beginPath();
      const ex = CX + Math.cos(aActive) * R_OUT;
      const ey = CY + Math.sin(aActive) * R_OUT;
      const ix = CX + Math.cos(aActive) * R_IN;
      const iy = CY + Math.sin(aActive) * R_IN;
      ctx.moveTo(ex, ey);
      ctx.lineTo(ix, iy);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // ── Needle ───────────────────────────────────────────────────────────────
  const needleAngle = scoreToRad(score);
  const needleLen   = R_IN - 8;
  const nx = CX + Math.cos(needleAngle) * needleLen;
  const ny = CY + Math.sin(needleAngle) * needleLen;

  const tier  = getTier(score);
  const color = tier.color;

  // Needle line
  ctx.beginPath();
  ctx.moveTo(CX, CY);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur  = 4;
  ctx.stroke();
  ctx.shadowBlur  = 0;

  // Pivot circle
  ctx.beginPath();
  ctx.arc(CX, CY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

/** Official Ethos "E" logomark — same path as in App.tsx */
function EthosE({ color }: { color: string }) {
  return (
    <svg
      width="28" height="28"
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
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
    canvas.width  = CW * DPR;
    canvas.height = CH * DPR;
    canvas.style.width  = `${CW}px`;
    canvas.style.height = `${CH}px`;
    drawGauge(canvas, score);
  }, [score]);

  return (
    <div className="gauge-wrapper" aria-label={`Score Ethos: ${score} — ${tier.nameLabel}`}>
      {/* ── Arc canvas ── */}
      <div className="gauge-arc-wrap">
        <canvas ref={canvasRef} className="gauge-canvas" />
        {/* Range labels */}
        <span className="gauge-label-start">0</span>
        <span className="gauge-label-end">2800</span>
      </div>

      {/* ── Score panel ── */}
      <div className="gauge-panel" style={{ borderLeftColor: 'rgba(31,33,38,0.1)' }}>
        <div className="gauge-panel-logo">
          <EthosE color={color} />
          <span className="gauge-panel-ethos" style={{ color }}>ETHOS</span>
        </div>
        <div className="gauge-panel-score" style={{ color }}>
          {score}
        </div>
        {/* Progress bar */}
        <div className="gauge-progress-track">
          <div
            className="gauge-progress-fill"
            style={{ width: `${pct * 100}%`, backgroundColor: color }}
          />
        </div>
        {/* Tier pill */}
        <div
          className="gauge-tier-pill"
          style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}33` }}
        >
          {tier.nameLabel}
        </div>
      </div>
    </div>
  );
}
