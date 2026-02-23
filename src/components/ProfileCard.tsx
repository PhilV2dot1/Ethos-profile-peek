import { getTier, type EthosProfileData } from '../lib/ethos-api';

interface Props {
  data: EthosProfileData;
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return String(timestamp);
  }
}

function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    vouch:                 '👍 Vouch',
    unvouch:               '👎 Unvouch',
    review:                '📝 Review',
    attestation:           '✅ Attestation',
    vote:                  '🗳️ Vote',
    'market-vote':         '📊 Market Vote',
    reply:                 '💬 Reply',
    slash:                 '⚡ Slash',
    'xp-tip':              '💰 XP Tip',
    'invitation-accepted': '🤝 Invitation',
    'human-verification':  '🧑 Verification',
    market:                '📈 Market',
    'broker-post':         '📣 Broker Post',
  };
  return labels[type] ?? type;
}

export function ProfileCard({ data }: Props) {
  const { user, vouches, activities } = data;
  const score  = user.score;
  const tier   = getTier(score);
  const color  = tier.color;

  const positiveVouches = vouches.values.filter((v) => !v.archived && !v.unhealthy).length;
  const negativeVouches = vouches.total - positiveVouches;

  const profileLink = user.links?.profile
    ?? `https://app.ethos.network/profile/${user.profileId ?? user.id}`;

  return (
    <div className="profile-card">

      {/* ── Top banner: avatar + name + score ── */}
      <div className="score-banner">
        <div className="profile-left">
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
            <a href={profileLink} target="_blank" rel="noopener noreferrer" className="ethos-link">
              Voir sur Ethos ↗
            </a>
          </div>
        </div>

        {/* Score block — big number in Literata + tier name below, matching Ethos UI */}
        <div className="score-block">
          <span className="score-number" style={{ color }}>{score}</span>
          <span className="score-tier-name" style={{ color }}>{tier.nameLabel}</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="profile-body">

        {/* ENS resolved */}
        {data.resolvedFrom && (
          <div className="ens-badge">
            🔗 Résolu via ENS : {data.resolvedFrom}
          </div>
        )}

        {/* Tier description banner */}
        <div className="tier-banner" style={{ borderLeftColor: color }}>
          <span className="tier-label" style={{ color }}>{tier.nameLabel}</span>
          <span className="tier-desc">{tier.description}</span>
        </div>

        {/* Stats */}
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

        {/* Score range bar */}
        <div className="score-range">
          <div
            className="score-range-fill"
            style={{
              width: `${Math.min(100, (score / 2800) * 100)}%`,
              backgroundColor: color,
            }}
          />
          <div className="score-range-labels">
            <span>0</span>
            <span style={{ color, fontWeight: 700 }}>{score}</span>
            <span>2800</span>
          </div>
        </div>

        {/* Recent activities */}
        {activities.length > 0 && (
          <div className="activities-section">
            <h3>Dernières activités</h3>
            <ul className="activity-list">
              {activities.map((act, i) => (
                <li key={i} className="activity-item">
                  <span className="activity-type">{formatActivityType(act.type)}</span>
                  {act.data?.createdAt && (
                    <span className="activity-date">{formatDate(act.data.createdAt)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
