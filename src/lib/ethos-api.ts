const BASE_URL = 'https://api.ethos.network/api/v2';
const CLIENT_HEADER = 'ethos-profile-peek@1.0.0';

export type IdentifierType = 'address' | 'x' | 'discord' | 'farcaster' | 'profileId';

export interface DetectionResult {
  type: IdentifierType | null;
  userKey: string;
  label: string;
}

export function detectIdentifier(input: string): DetectionResult {
  const trimmed = input.trim();

  // Strip @ prefix for X handles
  const noAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  // ETH address
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { type: 'address', userKey: `address:${trimmed}`, label: 'ETH Address' };
  }

  // Farcaster FID (explicit prefix)
  if (/^fid:\d+$/i.test(trimmed)) {
    const fid = trimmed.slice(4);
    return { type: 'farcaster', userKey: `service:farcaster:${fid}`, label: 'Farcaster FID' };
  }

  // Discord snowflake (17-19 digits)
  if (/^\d{17,19}$/.test(trimmed)) {
    return { type: 'discord', userKey: `service:discord:${trimmed}`, label: 'Discord ID' };
  }

  // Profile ID (1-16 digits)
  if (/^\d{1,16}$/.test(trimmed)) {
    return { type: 'profileId', userKey: `profileId:${trimmed}`, label: 'Profile ID' };
  }

  // X.com username (letters, digits, underscores, 1-15 chars)
  if (/^[a-zA-Z_][a-zA-Z0-9_]{0,14}$/.test(noAt)) {
    return { type: 'x', userKey: `service:x.com:username:${noAt}`, label: 'X.com' };
  }

  return { type: null, userKey: '', label: '' };
}

async function ethosGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Ethos-Client': CLIENT_HEADER },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND');
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export interface EthosProfileData {
  user: {
    displayName: string;
    username?: string;
    avatarUrl?: string;
    score: number;
    xpTotal: number;
    profileId: number;
    stats?: Record<string, unknown>;
  };
  score: {
    score: number;
    [key: string]: unknown;
  } | null;
  vouches: {
    values: Array<{
      id: number;
      archived: boolean;
      unhealthy: boolean;
      authorProfileId: number;
      subjectProfileId: number;
      comment?: string;
      [key: string]: unknown;
    }>;
    total: number;
  };
  activities: {
    values: Array<{
      type: string;
      createdAt: string;
      data?: Record<string, unknown>;
      [key: string]: unknown;
    }>;
    total: number;
  };
}

export async function fetchEthosProfile(userKey: string): Promise<EthosProfileData> {
  const encodedKey = encodeURIComponent(userKey);

  const [profileRes, scoreRes, vouchesRes, activitiesRes] = await Promise.allSettled([
    ethosGet(`/profiles/${encodedKey}`),
    ethosGet(`/score/${encodedKey}`),
    ethosGet(`/vouches?userkey=${encodedKey}&limit=50`),
    ethosGet(`/activities/userkey?userkey=${encodedKey}&limit=3`),
  ]);

  // Profile is required
  if (profileRes.status === 'rejected') {
    if (profileRes.reason?.message === 'NOT_FOUND') {
      throw new Error('Aucun profil trouvé pour cet identifiant.');
    }
    throw new Error('Impossible de contacter Ethos Network.');
  }

  const user = profileRes.value;

  return {
    user: {
      displayName: user.displayName || user.username || 'Unknown',
      username: user.username,
      avatarUrl: user.avatarUrl,
      score: user.score ?? 0,
      xpTotal: user.xpTotal ?? 0,
      profileId: user.profileId ?? user.id,
      stats: user.stats,
    },
    score: scoreRes.status === 'fulfilled' ? scoreRes.value : null,
    vouches: vouchesRes.status === 'fulfilled'
      ? vouchesRes.value
      : { values: [], total: 0 },
    activities: activitiesRes.status === 'fulfilled'
      ? activitiesRes.value
      : { values: [], total: 0 },
  };
}

export function generateSummary(score: number, xp: number, vouchCount: number): string {
  if (score >= 80) {
    return vouchCount > 10
      ? 'Profil très bien noté et soutenu par la communauté'
      : 'Profil très bien noté';
  }
  if (score >= 50) {
    return 'Bonne réputation';
  }
  if (score >= 20) {
    return xp > 100
      ? 'Réputation en construction, profil actif'
      : 'Réputation en construction';
  }
  return xp > 50 ? 'Nouveau profil mais actif' : 'Nouveau profil';
}
