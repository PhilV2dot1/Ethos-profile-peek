import type { FormEvent } from 'react';
import type { DetectionResult } from '../lib/ethos-api';

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  detected: DetectionResult;
  loading: boolean;
  onSearch: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  address: '#627eea',
  x: '#000',
  discord: '#5865f2',
  farcaster: '#8a63d2',
  profileId: '#1f21b6',
};

export function SearchForm({ query, onQueryChange, detected, loading, onSearch }: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch();
  }

  return (
    <form className="search-card" onSubmit={handleSubmit}>
      <div className="input-row">
        <input
          type="text"
          className="search-input"
          placeholder="vitalik.eth, @elonmusk, 0x1234…, fid:12345"
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

      <button type="submit" className="inspect-btn" disabled={loading}>
        {loading ? (
          <span className="spinner" />
        ) : (
          '🔍 Inspect'
        )}
      </button>

      <div className="format-hints">
        <span>X.com username</span>
        <span>ETH address (0x…)</span>
        <span>Discord ID</span>
        <span>fid:123</span>
        <span>Profile ID</span>
      </div>
    </form>
  );
}
