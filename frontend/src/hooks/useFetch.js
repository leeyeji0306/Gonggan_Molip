import { useCallback, useEffect, useState } from "react";

// 사용: const { data, loading, error, reload } = useFetch(() => getCafes(q), [q]);
export default function useFetch(fn, deps = []) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve(fn())
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch(
        (error) => alive && setState({ data: null, error, loading: false }),
      );
    return () => {
      alive = false;
    };
  }, deps);

  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}
