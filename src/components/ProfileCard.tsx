import { getTier, type EthosProfileData, type EthosActivity } from '../lib/ethos-api';
import { GaugeMeter } from './GaugeMeter';
import { TrendChart } from './TrendChart';

interface Props {
  data: EthosProfileData;
}

const ACTIVITY_ICONS: Record<string, string> = {
  VOUCH:       '👍',
  UNVOUCH:     '👎',
  REVIEW:      '📝',
  ATTESTATION: '✅',
  VOTE:        '🗳️',
  REPLY:       '💬',
  XP_TIP:      '💰',
  SLASH:       '⚡',
};

const ACTIVITY_LABELS: Record<string, string> = {
  VOUCH:       'Vouch reçu',
  UNVOUCH:     'Unvouch',
  REVIEW:      'Review',
  ATTESTATION: 'Attestation',
  VOTE:        'Vote',
  REPLY:       'Réponse',
  XP_TIP:      'XP Tip',
  SLASH:       'Slash',
};

const REVIEW_COLORS: Record<string, string> = {
  positive: 'var(--green)',
  neutral:  'var(--text-muted)',
  negative: 'var(--red)',
};

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp * 1000;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 2)  return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH   < 24) return `il y a ${diffH}h`;
  if (diffD   < 7)  return `il y a ${diffD}j`;

  return new Date(timestamp * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function sevenDaysSummary(activities: EthosActivity[]): Record<string, number> {
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const counts: Record<string, number> = {};
  for (const act of activities) {
    const ts = act.data?.createdAt;
    if (!ts || ts * 1000 < cutoff) continue;
    const key = act.type.toUpperCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function ProfileCard({ data }: Props) {
  const { user, vouches, activities, xpTimeline } = data;
  const score = user.score;
  const tier  = getTier(score);
  const color = tier.color;

  const positiveVouches = vouches.values.filter((v) => !v.archived && !v.unhealthy).length;
  const negativeVouches = vouches.total - positiveVouches;

  const profileLink = user.links?.profile
    ?? `https://app.ethos.network/profile/${user.profileId ?? user.id}`;

  const summary7d = sevenDaysSummary(activities);
  const hasSummary = Object.keys(summary7d).length > 0;

  const hasXpTrend = xpTimeline && xpTimeline.length >= 2;

  return (
    <div className="profile-card fade-in">

      {/* ── Identity header (compact) ── */}
      <div className="profile-header">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName} className="avatar" />
        ) : (
          <div className="avatar-placeholder">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="profile-info">
          <h2 className="display-name">{user.displayName}</h2>
          {user.username && user.username !== user.displayName && (
            <span className="username">@{user.username}</span>
          )}
          {data.resolvedFrom && (
            <span className="ens-inline">🔗 {data.resolvedFrom}</span>
          )}
          <a href={profileLink} target="_blank" rel="noopener noreferrer" className="ethos-link">
            Voir sur Ethos ↗
          </a>
        </div>
      </div>

      {/* ── Gauge meter ── */}
      <GaugeMeter score={score} />

      {/* ── Tier description ── */}
      <div className="profile-body">
        <div className="tier-banner" style={{ borderLeftColor: color }}>
          <span className="tier-label" style={{ color }}>{tier.nameLabel}</span>
          <span className="tier-desc">{tier.description}</span>
        </div>

        {/* ── Stats grid ── */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{user.xpTotal.toLocaleString()}</span>
            <span className="stat-label">XP Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-value stat-positive">{positiveVouches}</span>
            <span className="stat-label">Vouches +</span>
          </div>
          <div className="stat-card">
            <span className="stat-value stat-negative">{negativeVouches}</span>
            <span className="stat-label">Vouches −</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{user.xpStreakDays > 0 ? `${user.xpStreakDays}🔥` : '—'}</span>
            <span className="stat-label">Streak</span>
          </div>
        </div>

        {/* ── XP Trend chart ── */}
        {hasXpTrend && (
          <div className="trend-section">
            <h3 className="section-title">Tendance XP (30 jours)</h3>
            <TrendChart data={xpTimeline} />
          </div>
        )}

        {/* ── 7-day activity summary ── */}
        {hasSummary && (
          <div className="activities-section">
            <h3 className="section-title">Résumé des 7 derniers jours</h3>
            <div className="summary-pills">
              {Object.entries(summary7d).map(([type, count]) => (
                <span key={type} className="summary-pill">
                  {ACTIVITY_ICONS[type] ?? '•'} {ACTIVITY_LABELS[type] ?? type} ×{count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent activities (full list) ── */}
        {activities.length > 0 && (
          <div className="activities-section">
            <h3 className="section-title">Activités récentes</h3>
            <ul className="activity-list">
              {activities.slice(0, 15).map((act, i) => {
                const type  = act.type.toUpperCase();
                const icon  = ACTIVITY_ICONS[type] ?? '•';
                const label = ACTIVITY_LABELS[type] ?? act.type;
                const ts    = act.data?.createdAt;
                const score = act.data?.score as string | undefined;
                const comment = typeof act.data?.comment === 'string' ? act.data.comment : undefined;

                return (
                  <li key={i} className="activity-item">
                    <div className="activity-main">
                      <span className="activity-icon">{icon}</span>
                      <div className="activity-body">
                        <span
                          className="activity-type"
                          style={score ? { color: REVIEW_COLORS[score] ?? 'inherit' } : undefined}
                        >
                          {label}
                          {score && ` (${score})`}
                        </span>
                        {comment && (
                          <span className="activity-comment">"{comment}"</span>
                        )}
                      </div>
                    </div>
                    {ts && (
                      <span className="activity-date">{relativeTime(ts)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
