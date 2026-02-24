import { getTier, type EthosProfileData, type EthosActivity } from '../lib/ethos-api';
import { useLang } from '../lib/i18n';
import { GaugeMeter } from './GaugeMeter';
import { TrendChart } from './TrendChart';

interface Props {
  data: EthosProfileData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

// Accent colors for each activity type in the summary bar
const ACTIVITY_COLORS: Record<string, string> = {
  VOUCH:       'var(--green)',
  UNVOUCH:     'var(--red)',
  REVIEW:      '#2980b9',
  ATTESTATION: '#8a63d2',
  VOTE:        '#e67e22',
  REPLY:       '#7f8c8d',
  XP_TIP:      '#e6b800',
  SLASH:       'var(--red)',
};

const REVIEW_COLORS: Record<string, string> = {
  positive: 'var(--green)',
  neutral:  'var(--text-muted)',
  negative: 'var(--red)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(timestamp: number, t: ReturnType<typeof useLang>['t']): string {
  const now     = Date.now();
  const diffMs  = now - timestamp * 1000;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 2)  return t.justNow;
  if (diffMin < 60) return t.minutesAgo(diffMin);
  if (diffH   < 24) return t.hoursAgo(diffH);
  if (diffD   < 7)  return t.daysAgo(diffD);

  return new Date(timestamp * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface WeekEntry { type: string; count: number; }

function buildWeeklySummary(activities: EthosActivity[]): WeekEntry[] {
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const counts: Record<string, number> = {};
  for (const act of activities) {
    const ts = act.data?.createdAt;
    if (!ts || ts * 1000 < cutoff) continue;
    const key = act.type.toUpperCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  // Sort by count descending
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Weekly summary sub-component ──────────────────────────────────────────────

interface WeeklySummaryProps {
  entries: WeekEntry[];
}

function WeeklySummary({ entries }: WeeklySummaryProps) {
  const { t } = useLang();

  if (entries.length === 0) {
    return <p className="summary-empty">{t.last7daysEmpty}</p>;
  }

  const total   = entries.reduce((s, e) => s + e.count, 0);
  const maxCount = entries[0].count; // already sorted desc

  return (
    <div className="week-summary">
      {/* Header row: total */}
      <div className="week-summary-header">
        <span className="week-total">
          {total} {total === 1 ? t.totalActions : t.totalActionsPlural}
        </span>
        <span className="week-period">7j</span>
      </div>

      {/* One row per activity type */}
      <div className="week-rows">
        {entries.map(({ type, count }) => {
          const icon    = ACTIVITY_ICONS[type] ?? '•';
          const color   = ACTIVITY_COLORS[type] ?? 'var(--blue)';
          const labelKey = type as keyof typeof t;
          const label   = typeof t[labelKey] === 'string' ? (t[labelKey] as string) : type;
          const barPct  = (count / maxCount) * 100;

          return (
            <div key={type} className="week-row">
              <span className="week-row-icon">{icon}</span>
              <span className="week-row-label">{label}</span>
              <div className="week-bar-wrap">
                <div
                  className="week-bar-fill"
                  style={{ width: `${barPct}%`, backgroundColor: color }}
                />
              </div>
              <span className="week-row-count" style={{ color }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileCard({ data }: Props) {
  const { t } = useLang();
  const { user, vouches, activities, xpTimeline } = data;
  const score = user.score;
  const tier  = getTier(score);
  const color = tier.color;

  const positiveVouches = vouches.values.filter((v) => !v.archived && !v.unhealthy).length;
  const negativeVouches = vouches.total - positiveVouches;

  const profileLink = user.links?.profile
    ?? `https://app.ethos.network/profile/${user.profileId ?? user.id}`;

  const weeklySummary = buildWeeklySummary(activities);
  const hasXpTrend    = xpTimeline && xpTimeline.length >= 2;

  const descKey  = `tier_${tier.name}` as keyof typeof t;
  const tierDesc = (t[descKey] as string) ?? tier.description;

  return (
    <div className="profile-card fade-in">

      {/* ── Identity header ── */}
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
            <span className="ens-inline">🔗 {t.resolvedVia} {data.resolvedFrom}</span>
          )}
          <a href={profileLink} target="_blank" rel="noopener noreferrer" className="ethos-link">
            {t.viewOnEthos}
          </a>
        </div>
      </div>

      {/* ── Gauge ── */}
      <GaugeMeter score={score} />

      {/* ── Body ── */}
      <div className="profile-body">

        {/* Tier banner */}
        <div className="tier-banner" style={{ borderLeftColor: color }}>
          <span className="tier-label" style={{ color }}>{tier.nameLabel}</span>
          <span className="tier-desc">{tierDesc}</span>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{user.xpTotal.toLocaleString()}</span>
            <span className="stat-label">{t.xpTotal}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value stat-positive">{positiveVouches}</span>
            <span className="stat-label">{t.vouchesPos}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value stat-negative">{negativeVouches}</span>
            <span className="stat-label">{t.vouchesNeg}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{user.xpStreakDays > 0 ? `${user.xpStreakDays}🔥` : '—'}</span>
            <span className="stat-label">{t.streak}</span>
          </div>
        </div>

        {/* XP Trend */}
        {hasXpTrend && (
          <div className="trend-section">
            <h3 className="section-title">{t.xpTrend}</h3>
            <TrendChart data={xpTimeline} />
          </div>
        )}

        {/* ── Weekly activity summary ── */}
        <div className="activities-section">
          <h3 className="section-title">{t.last7days}</h3>
          <WeeklySummary entries={weeklySummary} />
        </div>

        {/* ── Recent activity list ── */}
        {activities.length > 0 && (
          <div className="activities-section">
            <h3 className="section-title">{t.recentActivity}</h3>
            <ul className="activity-list">
              {activities.slice(0, 15).map((act, i) => {
                const type       = act.type.toUpperCase();
                const icon       = ACTIVITY_ICONS[type] ?? '•';
                const labelKey   = type as keyof typeof t;
                const label      = typeof t[labelKey] === 'string' ? (t[labelKey] as string) : act.type;
                const ts         = act.data?.createdAt;
                const reviewScore = act.data?.score as string | undefined;
                const comment    = typeof act.data?.comment === 'string' ? act.data.comment : undefined;

                return (
                  <li key={i} className="activity-item">
                    <div className="activity-main">
                      <span className="activity-icon">{icon}</span>
                      <div className="activity-body">
                        <span
                          className="activity-type"
                          style={reviewScore ? { color: REVIEW_COLORS[reviewScore] ?? 'inherit' } : undefined}
                        >
                          {label}{reviewScore && ` (${reviewScore})`}
                        </span>
                        {comment && (
                          <span className="activity-comment">"{comment}"</span>
                        )}
                      </div>
                    </div>
                    {ts && (
                      <span className="activity-date">{relativeTime(ts, t)}</span>
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
