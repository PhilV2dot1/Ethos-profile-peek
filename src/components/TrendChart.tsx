import type { XpDataPoint } from '../lib/ethos-api';

interface Props {
  data: XpDataPoint[];
}

const W = 280;
const H = 72;
const PAD = { top: 6, right: 6, bottom: 20, left: 32 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function TrendChart({ data }: Props) {
  // Filter to last 30 points with at least some XP data
  const points = data.slice(-30);

  if (points.length < 2) {
    return (
      <div className="trend-empty">Pas assez de données XP disponibles.</div>
    );
  }

  const values = points.map((p) => p.cumulativeXp);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  // Map data to SVG coords
  const coords = points.map((p, i) => ({
    x: PAD.left + (i / (points.length - 1)) * INNER_W,
    y: PAD.top + INNER_H - ((p.cumulativeXp - minV) / range) * INNER_H,
    ...p,
  }));

  // SVG polyline path
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  // Fill area under curve
  const fillPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(PAD.top + INNER_H).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + INNER_H).toFixed(1)} Z`;

  // Y-axis labels
  const yLabels = [minV, Math.round(minV + range / 2), maxV];

  // X-axis labels: first, middle, last
  const xLabels = [
    coords[0],
    coords[Math.floor(coords.length / 2)],
    coords[coords.length - 1],
  ];

  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
        <defs>
          <linearGradient id="xp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {yLabels.map((v, i) => {
          const y = PAD.top + INNER_H - ((v - minV) / range) * INNER_H;
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={y}
                x2={PAD.left + INNER_W} y2={y}
                stroke="rgba(31,33,38,.08)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={PAD.left - 4} y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={7}
                fill="var(--text-muted)"
                fontFamily="Inter, sans-serif"
              >
                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              </text>
            </g>
          );
        })}

        {/* Fill area */}
        <path d={fillPath} fill="url(#xp-fill)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--blue)"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Last point dot */}
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={3}
          fill="var(--blue)"
        />

        {/* X labels */}
        {xLabels.map((c, i) => (
          <text
            key={i}
            x={c.x}
            y={H - 4}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}
            fontSize={7}
            fill="var(--text-muted)"
            fontFamily="Inter, sans-serif"
          >
            {formatDay(c.time)}
          </text>
        ))}
      </svg>
    </div>
  );
}
