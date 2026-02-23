import type { EthosProfileData } from '../lib/ethos-api';
import { generateSummary } from '../lib/ethos-api';

interface Props {
  data: EthosProfileData;
}

function scoreColor(score: number): string {
  if (score >= 2000) return '#127f31';
  if (score >= 1000) return '#1f21b6';
  if (score >= 500) return '#cc9a1a';
  return '#b72b38';
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(timestamp);
  }
}

function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    vouch: '👍 Vouch',
    unvouch: '👎 Unvouch',
    review: '📝 Review',
    attestation: '✅ Attestation',
    vote: '🗳️ Vote',
    'market-vote': '📊 Market Vote',
    reply: '💬 Reply',
    slash: '⚡ Slash',
    'xp-tip': '💰 XP Tip',
    'invitation-accepted': '🤝 Invitation',
    'human-verification': '🧑 Verification',
    market: '📈 Market',
    'broker-post': '📣 Broker Post',
  };
  return labels[type] || type;
}

export function ProfileCard({ data }: Props) {
  const { user, vouches, activities } = data;
  const score = user.score;
  const vouchReceived = user.stats?.vouch?.received?.count ?? vouches.total;
  const summary = generateSummary(score, user.xpTotal, vouchReceived);

  const positiveVouches = vouches.values.filter((v) => !v.archived && !v.unhealthy).length;
  const negativeVouches = vouches.total - positiveVouches;

  const profileLink = user.links?.profile ?? `https://app.ethos.network/profile/${user.profileId ?? user.id}`;

  return (
    <div className="profile-card fade-in">
      {/* Header */}
      <div className="profile-header">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName} className="avatar" />
        ) : (
          <div className="avatar avatar-placeholder">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="profile-info">
          <h2 className="display-name">{user.displayName}</h2>
          {user.username && user.username !== user.displayName && (
            <span className="username">@{user.username}</span>
          )}
          <a
            href={profileLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ethos-link"
          >
            Voir sur Ethos ↗
          </a>
        </div>
        <div className="score-circle" style={{ borderColor: scoreColor(score) }}>
          <span className="score-value" style={{ color: scoreColor(score) }}>
            {score}
          </span>
          <span className="score-label">Score</span>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-banner" style={{ backgroundColor: scoreColor(score) + '18' }}>
        <span className="summary-text" style={{ color: scoreColor(score) }}>
          {summary}
          {data.score?.level && ` — ${data.score.level}`}
        </span>
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
          <span className="stat-value">{activities.length}</span>
          <span className="stat-label">Activités</span>
        </div>
      </div>

      {/* Recent Activities */}
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
  );
}
