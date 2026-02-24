import { useLang } from '../lib/i18n';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: Props) {
  const { t } = useLang();
  return (
    <div className="error-card fade-in">
      <span className="error-icon">⚠️</span>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          {t.retry}
        </button>
      )}
    </div>
  );
}
