import { useCallback, useEffect, useState } from "react";

/** Minimal data-fetching hook: loading / error / data, plus reload(). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => !cancelled && setState({ data, loading: false }),
      (error: Error) => !cancelled && setState({ error, loading: false }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload, setData: (data: T) => setState({ data, loading: false }) };
}
