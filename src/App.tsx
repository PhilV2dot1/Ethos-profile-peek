import { useEthosProfile } from './hooks/useEthosProfile';
import { SearchForm } from './components/SearchForm';
import { ProfileCard } from './components/ProfileCard';
import { ErrorMessage } from './components/ErrorMessage';
import { LangProvider, useLang, type Lang } from './lib/i18n';
import './App.css';

/** Official Ethos logomark — stylised "E" from favicon.svg */
function EthosLogomark() {
  return (
    <svg
      className="ethos-logomark"
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M255.38 255.189a254.98 254.98 0 0 1-1.935 31.411H101v62.2h136.447a251.522 251.522 0 0 1-35.932 62.2H411v-62.2H237.447a250.584 250.584 0 0 0 15.998-62.2H411v-62.2H253.521a250.604 250.604 0 0 0-15.826-62.2H411V100H202.003a251.526 251.526 0 0 1 35.692 62.2H101v62.2h152.521a255 255 0 0 1 1.859 30.789Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Language toggle button */
function LangToggle() {
  const { lang, setLang } = useLang();
  const next: Lang = lang === 'fr' ? 'en' : 'fr';
  return (
    <button
      className="lang-toggle"
      onClick={() => setLang(next)}
      aria-label={`Switch to ${next.toUpperCase()}`}
      title={`Switch to ${next.toUpperCase()}`}
    >
      <span className={lang === 'fr' ? 'lang-active' : ''}>FR</span>
      <span className="lang-sep">/</span>
      <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
    </button>
  );
}

function AppInner() {
  const { query, setQuery, detected, profile, state, error, search } = useEthosProfile();
  const { t } = useLang();

  return (
    <div className="app">
      {/* ── Nav bar ── */}
      <nav className="ethos-nav">
        <a
          href="https://app.ethos.network"
          target="_blank"
          rel="noopener noreferrer"
          className="ethos-nav-brand"
        >
          <EthosLogomark />
          <span>Ethos</span>
        </a>
        <div className="ethos-nav-right">
          <span className="ethos-nav-tag">{t.profilePeek}</span>
          <LangToggle />
        </div>
      </nav>

      <header className="app-header">
        <p className="app-subtitle">{t.inspectSubtitle}</p>
      </header>

      <main className="app-main">
        <SearchForm
          query={query}
          onQueryChange={setQuery}
          detected={detected}
          loading={state === 'loading'}
          onSearch={search}
        />

        {state === 'error' && error && <ErrorMessage message={error} onRetry={search} />}
        {state === 'success' && profile && <ProfileCard data={profile} />}

        {state === 'idle' && (
          <div className="idle-hint">
            <p>{t.idleHint}</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          {t.poweredBy}{' '}
          <a href="https://developers.ethos.network" target="_blank" rel="noopener noreferrer">
            Ethos Network
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
