import { useEffect, useState } from "react";

import { readConnectionState, type StoredConnectionState } from "./storage";

type StoredConnectionResult =
  | { status: "loading" }
  | { status: "ready"; state: StoredConnectionState | null };

/**
 * Reads the persisted connection once on mount, guarded against setting state after the calling
 * screen has unmounted (e.g. the user navigates away before the read resolves).
 */
export function useStoredConnection(): StoredConnectionResult {
  const [result, setResult] = useState<StoredConnectionResult>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await readConnectionState();
      if (!cancelled) {
        setResult({ status: "ready", state });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}
