import { useState, useMemo } from 'react';
import {
  detectIdentifier,
  fetchEthosProfile,
  type DetectionResult,
  type EthosProfileData,
} from '../lib/ethos-api';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export function useEthosProfile() {
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState<EthosProfileData | null>(null);
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const detected: DetectionResult = useMemo(() => {
    if (!query.trim()) return { type: null, pathValue: '', userKey: '', label: '' };
    return detectIdentifier(query);
  }, [query]);

  async function search() {
    const input = query.trim();
    if (!input) {
      setError('Veuillez entrer un identifiant.');
      setState('error');
      return;
    }

    const det = detectIdentifier(input);
    if (!det.type) {
      setError('Format non reconnu. Essayez un username X, une adresse ETH, un Discord ID, fid:123 ou un profileId.');
      setState('error');
      return;
    }

    setState('loading');
    setError(null);
    setProfile(null);

    try {
      const data = await fetchEthosProfile(det);
      setProfile(data);
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
      setState('error');
    }
  }

  return { query, setQuery, detected, profile, state, error, search };
}
