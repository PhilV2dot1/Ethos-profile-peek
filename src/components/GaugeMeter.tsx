import { useEffect, useRef } from 'react';
import { ETHOS_TIERS, getTier } from '../lib/ethos-api';

interface Props {
  score: number;
}

const MAX     = 2800;
const GAP_DEG = 1.4;

// Arc geometry — computed from canvas width at draw time
// Arc spans 200° (190°→390°=30°), pivot well below canvas bottom for flat look
const A_START_DEG = 192;
const A_END_DEG   = 348;
const A_RANGE     = (A_END_DEG - A_START_DEG) * (Math.PI / 180);
const A_START_RAD = A_START_DEG * (Math.PI / 180);

function scoreToRad(s: number): number {
  return A_START_RAD + (Math.max(0, Math.min(s, MAX)) / MAX) * A_RANGE;
}

interface GeoParams {
  cx: number;
  cy: number;
  r: number;
  thick: number;
}

/** Derive geometry from actual canvas CSS width */
function makeGeo(cssW: number, cssH: number): GeoParams {
  // Radius fills ~55% of width; pivot sits below canvas bottom for flat arc
  const r     = cssW * 0.47;
  const thick = Math.max(5, cssW * 0.026);   // thin modern ring
  const cx    = cssW / 2;
  const cy    = cssH + cssW * 0.06;           // pivot below canvas → flat arc
  return { cx, cy, r, thick };
}

function drawGauge(canvas: HTMLCanvasElement, score: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ctx  = canvas.getContext('2d');
  if (!ctx) return;

  const cssW = canvas.clientWidth  || canvas.width  / dpr;
  const cssH = canvas.clientHeight || canvas.height / dpr;

  // Resize backing store if needed
  const needW = Math.round(cssW * dpr);
  const needH = Math.round(cssH * dpr);
  if (canvas.width !== needW || canvas.height !== needH) {
    canvas.width  = needW;
    canvas.height = needH;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  const { cx, cy, r, thick } = makeGeo(cssW, cssH);
  const rOut   = r + thick;
  const rIn    = r - thick;
  const halfGap = (GAP_DEG * Math.PI / 180) / 2;

  // ── Tier segments ────────────────────────────────────────────────────────
  ETHOS_TIERS.forEach((tier) => {
    const aMin = scoreToRad(tier.min);
    const aMax = scoreToRad(tier.max);
    const a0   = tier.min === 0   ? aMin : aMin + halfGap;
    const a1   = tier.max === MAX ? aMax : aMax - halfGap;
    if (a1 <= a0) return;

    const isActive  = score >= tier.max;
    const isPartial = score > tier.min && score < tier.max;

    // Dimmed background
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, a0, a1);
    ctx.arc(cx, cy, rIn,  a1, a0, true);
    ctx.closePath();
    ctx.fillStyle   = tier.color;
    ctx.globalAlpha = 0.10;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (!isActive && !isPartial) return;

    // Active fill
    const aFill = isActive ? a1 : scoreToRad(score);
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, a0, aFill);
    ctx.arc(cx, cy, rIn,  aFill, a0, true);
    ctx.closePath();
    ctx.fillStyle = tier.color;
    ctx.fill();

    // Radial shine: bright inner edge → slight shadow outer edge
    const grad = ctx.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
    grad.addColorStop(0,   'rgba(255,255,255,0.20)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    grad.addColorStop(1,   'rgba(0,0,0,0.07)');
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, a0, aFill);
    ctx.arc(cx, cy, rIn,  aFill, a0, true);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  });

  // ── Needle ───────────────────────────────────────────────────────────────
  const tier  = getTier(score);
  const color = tier.color;
  const angle = scoreToRad(score);

  const tipX   = cx + Math.cos(angle) * (rIn - 3);
  const tipY   = cy + Math.sin(angle) * (rIn - 3);
  const baseW  = thick * 0.55;
  const perpA  = angle + Math.PI / 2;
  const b1x    = cx + Math.cos(perpA) * baseW;
  const b1y    = cy + Math.sin(perpA) * baseW;
  const b2x    = cx - Math.cos(perpA) * baseW;
  const b2y    = cy - Math.sin(perpA) * baseW;

  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.20)';
  ctx.shadowBlur    = 5;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(b1x, b1y);
  ctx.lineTo(b2x, b2y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  // Pivot
  const pivotR = thick * 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, pivotR, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, pivotR * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

/** Official Ethos "E" mark */
function EthosE({ color, size = 20 }: { color: string; size?: number }) {
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
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tier  = getTier(score);
  const color = tier.color;
  const pct   = Math.min(score, MAX) / MAX;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    // Initial draw
    const draw = () => drawGauge(canvas, score);
    draw();

    // Redraw on resize
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [score]);

  return (
    <div className="gauge-wrapper" aria-label={`Score Ethos: ${score} — ${tier.nameLabel}`}>

      {/* ── Arc — 70% width ── */}
      <div className="gauge-arc-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="gauge-canvas" />
        <span className="gauge-label-start">0</span>
        <span className="gauge-label-end">2800</span>
      </div>

      {/* ── Score panel — 30% width ── */}
      <div className="gauge-panel">
        <div className="gauge-panel-logo">
          <EthosE color={color} size={18} />
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
