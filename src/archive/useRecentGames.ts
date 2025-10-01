import { useCallback, useEffect, useMemo, useState } from 'react';
import { listRecentGames, RecentGameRow } from '@/archive/db';

type Status = 'idle' | 'loading' | 'error' | 'success';

export function useRecentGames(limit = 3) {
  const [items, setItems] = useState<RecentGameRow[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const rows = await listRecentGames(limit);
      setItems(rows);
      setStatus('success');
      setError(null);
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshing = status === 'loading' && items.length > 0;
  const loading = status === 'loading' && items.length === 0;

  return useMemo(
    () => ({
      items,
      loading,
      refreshing,
      error,
      reload: load,
      status,
    }),
    [items, loading, refreshing, error, load, status]
  );
}

