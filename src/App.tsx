import { useEthosProfile } from './hooks/useEthosProfile';
import { SearchForm } from './components/SearchForm';
import { ProfileCard } from './components/ProfileCard';
import { ErrorMessage } from './components/ErrorMessage';
import './App.css';

export default function App() {
  const { query, setQuery, detected, profile, state, error, search } = useEthosProfile();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="logo-icon">🔎</span> Ethos Profile Peek
        </h1>
        <p className="app-subtitle">
          Rechercher n'importe quel profil sur Ethos Network
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
          <div className="idle-hint fade-in">
            <p>Entrez un identifiant ci-dessus pour inspecter un profil Ethos.</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Powered by{' '}
          <a href="https://ethos.network" target="_blank" rel="noopener noreferrer">
            Ethos Network
          </a>{' '}
          API
        </p>
      </footer>
    </div>
  );
}
