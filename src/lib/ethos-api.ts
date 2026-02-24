const BASE_URL = 'https://api.ethos.network/api/v2';
const CLIENT_HEADER = 'ethos-profile-peek@1.0.0';

const HEADERS = {
  'X-Ethos-Client': CLIENT_HEADER,
  'Content-Type': 'application/json',
};

export type IdentifierType = 'address' | 'ens' | 'x' | 'discord' | 'farcaster' | 'profileId';

export interface DetectionResult {
  type: IdentifierType | null;
  pathValue: string;
  userKey: string;
  label: string;
}

export function detectIdentifier(input: string): DetectionResult {
  const trimmed = input.trim();
  const noAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  // ETH address (0x...)
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { type: 'address', pathValue: trimmed, userKey: `address:${trimmed}`, label: 'ETH Address' };
  }
  // ENS name (*.eth or *.xyz etc.)
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return { type: 'ens', pathValue: trimmed, userKey: '', label: 'ENS' };
  }
  // Farcaster FID (explicit prefix fid:123)
  if (/^fid:\d+$/i.test(trimmed)) {
    const fid = trimmed.slice(4);
    return { type: 'farcaster', pathValue: fid, userKey: `service:farcaster:${fid}`, label: 'Farcaster FID' };
  }
  // Discord snowflake (17-19 digits)
  if (/^\d{17,19}$/.test(trimmed)) {
    return { type: 'discord', pathValue: trimmed, userKey: `service:discord:${trimmed}`, label: 'Discord ID' };
  }
  // Profile ID (1-16 digits)
  if (/^\d{1,16}$/.test(trimmed)) {
    return { type: 'profileId', pathValue: trimmed, userKey: `profileId:${trimmed}`, label: 'Profile ID' };
  }
  // X.com username
  if (/^[a-zA-Z_][a-zA-Z0-9_]{0,14}$/.test(noAt)) {
    return { type: 'x', pathValue: noAt, userKey: `service:x.com:username:${noAt}`, label: 'X.com' };
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
  const res = await fetch(url, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND');
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

/** Resolve ENS name → ETH address via Ethos API */
async function resolveEns(name: string): Promise<string> {
  const data = await ethosGet(`${BASE_URL}/external/ens/by-name/${encodeURIComponent(name)}`);
  if (!data?.address) throw new Error('NOT_FOUND');
  return data.address as string;
}

function userEndpoint(type: IdentifierType, pathValue: string): string {
  const v = encodeURIComponent(pathValue);
  switch (type) {
    case 'address': return `${BASE_URL}/user/by/address/${v}`;
    case 'x':       return `${BASE_URL}/user/by/x/${v}`;
    case 'discord': return `${BASE_URL}/user/by/discord/${v}`;
    case 'farcaster': return `${BASE_URL}/user/by/farcaster/${v}`;
    case 'profileId': return `${BASE_URL}/user/by/profile-id/${v}`;
    default: return '';
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
  xpStreakDays: number;
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
    score?: string;      // 'positive' | 'neutral' | 'negative' (reviews)
    comment?: string;
    author?: string;
    authorProfileId?: number;
    [key: string]: unknown;
  };
}

export interface XpDataPoint {
  time: string;        // ISO date string
  xp: number;          // XP earned that day
  cumulativeXp: number;
}

export interface EthosProfileData {
  user: EthosUser;
  score: EthosScore | null;
  vouches: { values: EthosVouch[]; total: number };
  activities: EthosActivity[];
  xpTimeline: XpDataPoint[]; // last 30 data points
  resolvedFrom?: string;
}

// ---- Main fetch ----

const ACTIVITY_TYPES = ['VOUCH', 'UNVOUCH', 'REVIEW', 'ATTESTATION', 'VOTE', 'REPLY', 'XP_TIP', 'SLASH'];

export async function fetchEthosProfile(det: DetectionResult): Promise<EthosProfileData> {
  let resolvedFrom: string | undefined;
  let effectiveType = det.type!;
  let effectivePath = det.pathValue;

  // ENS: resolve to address first
  if (det.type === 'ens') {
    let address: string;
    try {
      address = await resolveEns(det.pathValue);
    } catch {
      throw new Error(`Impossible de résoudre l'ENS "${det.pathValue}".`);
    }
    resolvedFrom = `${det.pathValue} → ${address.slice(0, 6)}…${address.slice(-4)}`;
    effectiveType = 'address';
    effectivePath = address;
  }

  const profileUrl = userEndpoint(effectiveType, effectivePath);
  if (!profileUrl) throw new Error("Type d'identifiant non supporté.");

  // Step 1: fetch profile
  let user: EthosUser;
  try {
    user = await ethosGet(profileUrl);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      throw new Error('Aucun profil trouvé pour cet identifiant.');
    }
    throw new Error('Impossible de contacter Ethos Network.');
  }

  // Step 2: use canonical userkey from profile response (numeric IDs) for secondary calls
  const canonicalKey = user.userkeys[0] ?? `address:${effectivePath}`;
  const encodedKey = encodeURIComponent(canonicalKey);
  const activityParams = ACTIVITY_TYPES.map((t) => `activityType=${t}`).join('&');

  // Step 3: parallel fetch of score, vouches, activities, XP timelines (seasons 1+2+3)
  const [scoreRes, vouchesRes, activitiesRes, xpS1Res, xpS2Res, xpS3Res] = await Promise.allSettled([
    ethosGet(`${BASE_URL}/score/userkey?userkey=${encodedKey}`),
    ethosPost(`${BASE_URL}/vouches`, { subjectUserkeys: [canonicalKey], limit: 50 }),
    ethosGet(`${BASE_URL}/activities/userkey?userkey=${encodedKey}&${activityParams}&limit=20`),
    ethosGet(`${BASE_URL}/xp/user/${encodedKey}/season/1/timeline?granularity=day`),
    ethosGet(`${BASE_URL}/xp/user/${encodedKey}/season/2/timeline?granularity=day`),
    ethosGet(`${BASE_URL}/xp/user/${encodedKey}/season/3/timeline?granularity=day`),
  ]);

  // XP timeline: merge all seasons by date, recompute cumulative from combined daily XP
  function toEntries(res: PromiseSettledResult<unknown>): XpDataPoint[] {
    if (res.status !== 'fulfilled') return [];
    const raw = res.value;
    return Array.isArray(raw) ? raw : Object.values(raw as Record<string, XpDataPoint>);
  }

  let xpTimeline: XpDataPoint[] = [];
  {
    // Aggregate daily XP across all seasons keyed by date string
    const dailyXp: Record<string, number> = {};
    for (const entry of [...toEntries(xpS1Res), ...toEntries(xpS2Res), ...toEntries(xpS3Res)]) {
      const day = entry.time.slice(0, 10);
      dailyXp[day] = (dailyXp[day] ?? 0) + (entry.xp ?? 0);
    }
    // Sort dates and recompute cumulative
    const sortedDays = Object.keys(dailyXp).sort();
    let cumul = 0;
    const all: XpDataPoint[] = sortedDays.map((day) => {
      cumul += dailyXp[day];
      return { time: `${day}T00:00:00.000Z`, xp: dailyXp[day], cumulativeXp: cumul };
    });
    // Keep last 30 days that have data (non-zero xp) plus surrounding context
    const withXp = all.filter((p) => p.xp > 0);
    if (withXp.length > 0) {
      const lastActiveIdx = all.indexOf(withXp[withXp.length - 1]);
      const startIdx = Math.max(0, lastActiveIdx - 29);
      xpTimeline = all.slice(startIdx);
    } else {
      xpTimeline = all.slice(-30);
    }
  }

  return {
    user,
    score: scoreRes.status === 'fulfilled' ? scoreRes.value : null,
    vouches: vouchesRes.status === 'fulfilled' ? vouchesRes.value : { values: [], total: 0 },
    activities: activitiesRes.status === 'fulfilled'
      ? (Array.isArray(activitiesRes.value) ? activitiesRes.value : [])
      : [],
    xpTimeline,
    resolvedFrom,
  };
}

/**
 * Official Ethos credibility score tiers (whitepaper: ethos-mechanisms/credibility-score)
 * Scale: 0 – 2800
 */
export interface EthosTier {
  name: string;          // Official tier name from whitepaper
  nameLabel: string;     // Display label (French)
  min: number;
  max: number;
  color: string;         // UI accent color
  description: string;   // One-line summary for the UI
}

export const ETHOS_TIERS: EthosTier[] = [
  { name: 'untrusted',    nameLabel: 'Untrusted',    min: 0,    max: 799,  color: '#c0392b', description: 'Profil non vérifié ou signalé comme peu fiable' },
  { name: 'questionable', nameLabel: 'Questionable', min: 800,  max: 1199, color: '#e67e22', description: 'Réputation incertaine, à aborder avec prudence' },
  { name: 'neutral',      nameLabel: 'Neutral',      min: 1200, max: 1399, color: '#7f8c8d', description: 'Profil neutre — point de départ par défaut' },
  { name: 'known',        nameLabel: 'Known',        min: 1400, max: 1599, color: '#2980b9', description: 'Profil reconnu dans la communauté' },
  { name: 'established',  nameLabel: 'Established',  min: 1600, max: 1799, color: '#1f21b6', description: 'Réputation bien établie et active' },
  { name: 'reputable',    nameLabel: 'Reputable',    min: 1800, max: 1999, color: '#27ae60', description: 'Très bonne réputation, soutenu par la communauté' },
  { name: 'exemplary',    nameLabel: 'Exemplary',    min: 2000, max: 2199, color: '#1e8449', description: 'Comportement exemplaire, modèle de confiance' },
  { name: 'distinguished',nameLabel: 'Distinguished',min: 2200, max: 2399, color: '#145a32', description: 'Profil distingué, très haut niveau de confiance' },
  { name: 'revered',      nameLabel: 'Revered',      min: 2400, max: 2599, color: '#6c3483', description: 'Profil vénéré, référence dans l\'écosystème' },
  { name: 'renowned',     nameLabel: 'Renowned',     min: 2600, max: 2800, color: '#4a235a', description: 'Profil renommé — élite absolue d\'Ethos' },
];

export function getTier(score: number): EthosTier {
  return (
    ETHOS_TIERS.find((t) => score >= t.min && score <= t.max) ??
    ETHOS_TIERS[0]
  );
}
