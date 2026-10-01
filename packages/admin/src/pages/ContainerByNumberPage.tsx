import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

/**
 * /c/:number — where a tote's QR label points (e.g. /c/001). Scanning a
 * label with the plain iPhone camera opens this page in the browser; it
 * looks the tote up by its printed number and jumps to its detail page.
 */
export function ContainerByNumberPage() {
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!number) return;
    api.containers
      .byNumber(number)
      .then((c) => navigate(`/containers/${c.id}`, { replace: true }))
      .catch((err) => setError(err.message || 'Container not found'));
  }, [number, navigate]);

  return (
    <div className="page">
      {error ? <p className="error">{error}</p> : <p>Opening container #{number}…</p>}
    </div>
  );
}
