const BASE_URL = 'https://api.ethos.network/api/v2';
const CLIENT_HEADER = 'ethos-profile-peek@1.0.0';

const HEADERS = {
  'X-Ethos-Client': CLIENT_HEADER,
  'Content-Type': 'application/json',
};

export type IdentifierType = 'address' | 'x' | 'discord' | 'farcaster' | 'profileId';

export interface DetectionResult {
  type: IdentifierType | null;
  /** Value to use in the /user/by/... endpoint path */
  pathValue: string;
  /** Full userkey for score/vouches/activities endpoints */
  userKey: string;
  label: string;
}

export function detectIdentifier(input: string): DetectionResult {
  const trimmed = input.trim();
  const noAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  // ETH address
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return {
      type: 'address',
      pathValue: trimmed,
      userKey: `address:${trimmed}`,
      label: 'ETH Address',
    };
  }

  // Farcaster FID (explicit prefix)
  if (/^fid:\d+$/i.test(trimmed)) {
    const fid = trimmed.slice(4);
    return {
      type: 'farcaster',
      pathValue: fid,
      userKey: `service:farcaster:${fid}`,
      label: 'Farcaster FID',
    };
  }

  // Discord snowflake (17-19 digits)
  if (/^\d{17,19}$/.test(trimmed)) {
    return {
      type: 'discord',
      pathValue: trimmed,
      userKey: `service:discord:${trimmed}`,
      label: 'Discord ID',
    };
  }

  // Profile ID (1-16 digits)
  if (/^\d{1,16}$/.test(trimmed)) {
    return {
      type: 'profileId',
      pathValue: trimmed,
      userKey: `profileId:${trimmed}`,
      label: 'Profile ID',
    };
  }

  // X.com username (letters, digits, underscores, 1-15 chars)
  if (/^[a-zA-Z_][a-zA-Z0-9_]{0,14}$/.test(noAt)) {
    return {
      type: 'x',
      pathValue: noAt,
      userKey: `service:x.com:username:${noAt}`,
      label: 'X.com',
    };
  }

  return { type: null, pathValue: '', userKey: '', label: '' };
}

// ---- API helpers ----

async function ethosGet(url: string) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND');
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

async function ethosPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND');
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

/** Build the correct /user/by/... URL based on identifier type */
function userEndpoint(det: DetectionResult): string {
  const v = encodeURIComponent(det.pathValue);
  switch (det.type) {
    case 'address':    return `${BASE_URL}/user/by/address/${v}`;
    case 'x':          return `${BASE_URL}/user/by/x/${v}`;
    case 'discord':    return `${BASE_URL}/user/by/discord/${v}`;
    case 'farcaster':  return `${BASE_URL}/user/by/farcaster/${v}`;
    case 'profileId':  return `${BASE_URL}/user/by/profile-id/${v}`;
    default:           return '';
  }
}

// ---- Types ----

export interface EthosUser {
  id: number;
  profileId: number | null;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  score: number;
  xpTotal: number;
  status: string;
  userkeys: string[];
  links: { profile: string; scoreBreakdown: string };
  stats: {
    review: { received: { negative: number; neutral: number; positive: number } };
    vouch: {
      given: { amountWeiTotal: string; count: number };
      received: { amountWeiTotal: string; count: number };
    };
  };
}

export interface EthosScore {
  score: number;
  level: string;
}

export interface EthosVouch {
  id: number;
  archived: boolean;
  unhealthy: boolean;
  authorProfileId: number;
  subjectProfileId: number;
  comment?: string;
  [key: string]: unknown;
}

export interface EthosActivity {
  type: string;
  data: {
    id: number;
    createdAt?: number;
    score?: string;
    comment?: string;
    [key: string]: unknown;
  };
}

export interface EthosProfileData {
  user: EthosUser;
  score: EthosScore | null;
  vouches: { values: EthosVouch[]; total: number };
  activities: EthosActivity[];
}

// ---- Main fetch ----

const ACTIVITY_TYPES = ['VOUCH', 'UNVOUCH', 'REVIEW', 'ATTESTATION', 'VOTE', 'REPLY'];

export async function fetchEthosProfile(det: DetectionResult): Promise<EthosProfileData> {
  const profileUrl = userEndpoint(det);
  if (!profileUrl) throw new Error('Type d\'identifiant non supporté.');

  const encodedKey = encodeURIComponent(det.userKey);
  const activityParams = ACTIVITY_TYPES.map(t => `activityType=${t}`).join('&');

  const [profileRes, scoreRes, vouchesRes, activitiesRes] = await Promise.allSettled([
    ethosGet(profileUrl),
    ethosGet(`${BASE_URL}/score/userkey?userkey=${encodedKey}`),
    ethosPost(`${BASE_URL}/vouches`, { subjectUserkeys: [det.userKey], limit: 50 }),
    ethosGet(`${BASE_URL}/activities/userkey?userkey=${encodedKey}&${activityParams}&limit=3`),
  ]);

  // Profile is required
  if (profileRes.status === 'rejected') {
    if (profileRes.reason?.message === 'NOT_FOUND') {
      throw new Error('Aucun profil trouvé pour cet identifiant.');
    }
    throw new Error('Impossible de contacter Ethos Network.');
  }

  const user: EthosUser = profileRes.value;

  return {
    user,
    score: scoreRes.status === 'fulfilled' ? scoreRes.value : null,
    vouches: vouchesRes.status === 'fulfilled'
      ? vouchesRes.value
      : { values: [], total: 0 },
    activities: activitiesRes.status === 'fulfilled'
      ? (Array.isArray(activitiesRes.value) ? activitiesRes.value : [])
      : [],
  };
}

export function generateSummary(score: number, xp: number, vouchCount: number): string {
  if (score >= 2000) {
    return vouchCount > 10
      ? 'Profil exceptionnel, très soutenu par la communauté'
      : 'Profil exceptionnel';
  }
  if (score >= 1000) {
    return 'Excellente réputation';
  }
  if (score >= 500) {
    return xp > 1000
      ? 'Bonne réputation, profil actif'
      : 'Bonne réputation';
  }
  if (score >= 100) {
    return 'Réputation en construction';
  }
  return xp > 50 ? 'Nouveau profil mais actif' : 'Nouveau profil';
}
