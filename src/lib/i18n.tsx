import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'fr' | 'en';

// ── Translation strings ──────────────────────────────────────────────────────
export const translations = {
  fr: {
    // Nav
    profilePeek:       'Profile Peek',
    inspectSubtitle:   'Inspectez n\'importe quel profil Ethos Network',

    // Search
    searchPlaceholder: 'vitalik.eth, @elonmusk, 0x1234…, fid:12345',
    inspectBtn:        '🔍 Inspecter',
    inspecting:        'Chargement…',
    hintXcom:          'Pseudo X.com',
    hintAddress:       'Adresse ETH (0x…)',
    hintEns:           'ENS (vitalik.eth)',
    hintDiscord:       'Discord ID',
    hintFarcaster:     'fid:123',
    hintProfileId:     'Profile ID',

    // Profile
    viewOnEthos:       'Voir sur Ethos ↗',
    resolvedVia:       'Résolu via ENS :',

    // Stats
    xpTotal:           'XP Total',
    vouchesPos:        'Vouches +',
    vouchesNeg:        'Vouches −',
    streak:            'Streak',

    // Sections
    xpTrend:           'Tendance XP (30j)',
    last7days:         'Résumé 7 derniers jours',
    recentActivity:    'Activités récentes',

    // Activity labels
    VOUCH:             'Vouch reçu',
    UNVOUCH:           'Unvouch',
    REVIEW:            'Review',
    ATTESTATION:       'Attestation',
    VOTE:              'Vote',
    REPLY:             'Réponse',
    XP_TIP:            'XP Tip',
    SLASH:             'Slash',

    // Relative time
    justNow:           'à l\'instant',
    minutesAgo:        (n: number) => `il y a ${n} min`,
    hoursAgo:          (n: number) => `il y a ${n}h`,
    daysAgo:           (n: number) => `il y a ${n}j`,

    // Tier descriptions
    tier_untrusted:    'Profil non vérifié ou signalé comme peu fiable',
    tier_questionable: 'Réputation incertaine, à aborder avec prudence',
    tier_neutral:      'Profil neutre — point de départ par défaut',
    tier_known:        'Profil reconnu dans la communauté',
    tier_established:  'Réputation bien établie et active',
    tier_reputable:    'Très bonne réputation, soutenu par la communauté',
    tier_exemplary:    'Comportement exemplaire, modèle de confiance',
    tier_distinguished:'Profil distingué, très haut niveau de confiance',
    tier_revered:      'Profil vénéré, référence dans l\'écosystème',
    tier_renowned:     'Profil renommé — élite absolue d\'Ethos',

    // Errors
    errNotFound:       'Aucun profil trouvé pour cet identifiant.',
    errNetwork:        'Impossible de contacter Ethos Network.',
    errInvalidId:      'Format non reconnu.',
    errEns:            (name: string) => `Impossible de résoudre l'ENS "${name}".`,
    retry:             'Réessayer',

    // Footer
    poweredBy:         'Propulsé par l\'API publique',

    // Idle
    idleHint:          'Entrez un identifiant ci-dessus pour inspecter un profil Ethos.',

    // Gauge
    score:             'Score',
    tier:              'Tier',
  },

  en: {
    // Nav
    profilePeek:       'Profile Peek',
    inspectSubtitle:   'Inspect any Ethos Network profile',

    // Search
    searchPlaceholder: 'vitalik.eth, @elonmusk, 0x1234…, fid:12345',
    inspectBtn:        '🔍 Inspect',
    inspecting:        'Loading…',
    hintXcom:          'X.com username',
    hintAddress:       'ETH address (0x…)',
    hintEns:           'ENS (vitalik.eth)',
    hintDiscord:       'Discord ID',
    hintFarcaster:     'fid:123',
    hintProfileId:     'Profile ID',

    // Profile
    viewOnEthos:       'View on Ethos ↗',
    resolvedVia:       'Resolved via ENS:',

    // Stats
    xpTotal:           'XP Total',
    vouchesPos:        'Vouches +',
    vouchesNeg:        'Vouches −',
    streak:            'Streak',

    // Sections
    xpTrend:           'XP Trend (30d)',
    last7days:         'Last 7 days summary',
    recentActivity:    'Recent activity',

    // Activity labels
    VOUCH:             'Vouch received',
    UNVOUCH:           'Unvouch',
    REVIEW:            'Review',
    ATTESTATION:       'Attestation',
    VOTE:              'Vote',
    REPLY:             'Reply',
    XP_TIP:            'XP Tip',
    SLASH:             'Slash',

    // Relative time
    justNow:           'just now',
    minutesAgo:        (n: number) => `${n}m ago`,
    hoursAgo:          (n: number) => `${n}h ago`,
    daysAgo:           (n: number) => `${n}d ago`,

    // Tier descriptions
    tier_untrusted:    'Unverified or flagged as unreliable',
    tier_questionable: 'Uncertain reputation, approach with caution',
    tier_neutral:      'Neutral profile — default starting point',
    tier_known:        'Recognized profile in the community',
    tier_established:  'Well-established and active reputation',
    tier_reputable:    'Very good reputation, backed by the community',
    tier_exemplary:    'Exemplary behavior, a model of trust',
    tier_distinguished:'Distinguished profile, very high trust level',
    tier_revered:      'Revered profile, a reference in the ecosystem',
    tier_renowned:     'Renowned profile — the absolute elite of Ethos',

    // Errors
    errNotFound:       'No profile found for this identifier.',
    errNetwork:        'Unable to reach Ethos Network.',
    errInvalidId:      'Unrecognized format.',
    errEns:            (name: string) => `Could not resolve ENS name "${name}".`,
    retry:             'Retry',

    // Footer
    poweredBy:         'Powered by the public',

    // Idle
    idleHint:          'Enter an identifier above to inspect an Ethos profile.',

    // Gauge
    score:             'Score',
    tier:              'Tier',
  },
} as const;

// Use a structural type that works for both locales
export type T = {
  [K in keyof typeof translations.fr]: typeof translations.fr[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : string;
};

// ── Context ──────────────────────────────────────────────────────────────────
interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LangContext = createContext<LangCtx>({
  lang: 'fr',
  setLang: () => {},
  t: translations.fr as unknown as T,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr');
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] as unknown as T }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangCtx {
  return useContext(LangContext);
}
