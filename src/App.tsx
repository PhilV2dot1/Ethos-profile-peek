import { useEthosProfile } from './hooks/useEthosProfile';
import { SearchForm } from './components/SearchForm';
import { ProfileCard } from './components/ProfileCard';
import { ErrorMessage } from './components/ErrorMessage';
import './App.css';

/** Ethos logo — 3 horizontal bars, faithful to the real UI */
function EthosLogo() {
  return (
    <svg className="ethos-logo-svg" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect y="0"  width="32" height="4" rx="2" fill="currentColor"/>
      <rect y="9"  width="32" height="4" rx="2" fill="currentColor"/>
      <rect y="18" width="32" height="4" rx="2" fill="currentColor"/>
    </svg>
  );
}

export default function App() {
  const { query, setQuery, detected, profile, state, error, search } = useEthosProfile();

  return (
    <div className="app">
      {/* ── Top nav bar (faithful to Ethos) ── */}
      <nav className="ethos-nav">
        <a href="https://app.ethos.network" target="_blank" rel="noopener noreferrer" className="ethos-nav-brand">
          <EthosLogo />
          <span>Ethos</span>
        </a>
        <span className="ethos-nav-tag">Profile Peek</span>
      </nav>

      {/* ── Page hero ── */}
      <header className="app-header">
        <p className="app-subtitle">
          Inspectez n'importe quel profil Ethos Network
        </p>
      </header>

      <main className="app-main">
        <SearchForm
          query={query}
          onQueryChange={setQuery}
          detected={detected}
          loading={state === 'loading'}
          onSearch={search}
        />

        {state === 'error' && error && (
          <ErrorMessage message={error} onRetry={search} />
        )}

        {state === 'success' && profile && <ProfileCard data={profile} />}

        {state === 'idle' && (
          <div className="idle-hint">
            <p>Entrez un identifiant ci-dessus pour inspecter un profil Ethos.</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Propulsé par l'API publique <a href="https://developers.ethos.network" target="_blank" rel="noopener noreferrer">Ethos Network</a></p>
      </footer>
    </div>
  );
}
