import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, actionTo, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon">0</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary" style={{ marginTop: 12 }}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary" style={{ marginTop: 12 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
