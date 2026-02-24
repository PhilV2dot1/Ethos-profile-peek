import type { SyntheticEvent } from 'react';
import type { DetectionResult } from '../lib/ethos-api';
import { useLang } from '../lib/i18n';

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  detected: DetectionResult;
  loading: boolean;
  onSearch: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  address: '#627eea',
  ens: '#5e74d4',
  x: '#000',
  discord: '#5865f2',
  farcaster: '#8a63d2',
  profileId: '#1f21b6',
};

export function SearchForm({ query, onQueryChange, detected, loading, onSearch }: Props) {
  const { t } = useLang();

  function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    onSearch();
  }

  return (
    <form className="search-card" onSubmit={handleSubmit}>
      <div className="input-row">
        <input
          type="text"
          className="search-input"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          disabled={loading}
        />
        {detected.type && (
          <span
            className="type-badge"
            style={{ backgroundColor: TYPE_COLORS[detected.type] || '#1f21b6' }}
          >
            {detected.label}
          </span>
        )}
      </div>

      <button type="submit" className="inspect-btn" disabled={loading || !query.trim()}>
        {loading ? (
          <><span className="spinner" /> {t.inspecting}</>
        ) : (
          t.inspectBtn
        )}
      </button>

      <div className="format-hints">
        <span>{t.hintXcom}</span>
        <span>{t.hintAddress}</span>
        <span>{t.hintEns}</span>
        <span>{t.hintDiscord}</span>
        <span>{t.hintFarcaster}</span>
        <span>{t.hintProfileId}</span>
      </div>
    </form>
  );
}
