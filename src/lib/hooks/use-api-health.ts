import { useEffect, useRef, useState, useCallback } from 'react';
import { getHealth } from '@/lib/api/midgard';
import { getAllNodes } from '@/lib/api/thornode';

export type ApiHealthStatus = 'healthy' | 'degraded' | 'down';

export interface ApiHealthState {
  midgard: ApiHealthStatus;
  thornode: ApiHealthStatus;
  lastChecked: Date | null;
}

const CONSECUTIVE_FAILURES_FOR_DOWN = 3;
const MIDGARD_INTERVAL_MS = 30_000;
const THORNODE_INTERVAL_MS = 60_000;

function isHttpOrNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  const match = message.match(/API error:\s*(\d{3})/);
  if (match) {
    const status = parseInt(match[1], 10);
    return status >= 400 && status < 600;
  }
  return true;
}

function updateStatusFromFailure(
  failuresRef: React.MutableRefObject<number>,
  setStatus: (status: ApiHealthStatus) => void
) {
  failuresRef.current += 1;
  if (failuresRef.current >= CONSECUTIVE_FAILURES_FOR_DOWN) {
    setStatus('down');
  } else {
    setStatus('degraded');
  }
}

export function useApiHealth(): ApiHealthState {
  const [midgardStatus, setMidgardStatus] = useState<ApiHealthStatus>('healthy');
  const [thornodeStatus, setThornodeStatus] = useState<ApiHealthStatus>('healthy');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const midgardFailures = useRef(0);
  const thornodeFailures = useRef(0);

  const checkMidgard = useCallback(async () => {
    try {
      await getHealth();
      midgardFailures.current = 0;
      setMidgardStatus('healthy');
    } catch (error) {
      if (isHttpOrNetworkError(error)) {
        updateStatusFromFailure(midgardFailures, setMidgardStatus);
      }
    }
  }, []);

  const checkThornode = useCallback(async () => {
    try {
      await getAllNodes();
      thornodeFailures.current = 0;
      setThornodeStatus('healthy');
    } catch (error) {
      if (isHttpOrNetworkError(error)) {
        updateStatusFromFailure(thornodeFailures, setThornodeStatus);
      }
    }
  }, []);

  useEffect(() => {
    checkMidgard();
    checkThornode();
    setLastChecked(new Date());

    const midgardInterval = setInterval(() => {
      checkMidgard();
      setLastChecked(new Date());
    }, MIDGARD_INTERVAL_MS);

    const thornodeInterval = setInterval(() => {
      checkThornode();
      setLastChecked(new Date());
    }, THORNODE_INTERVAL_MS);

    return () => {
      clearInterval(midgardInterval);
      clearInterval(thornodeInterval);
    };
  }, [checkMidgard, checkThornode]);

  return {
    midgard: midgardStatus,
    thornode: thornodeStatus,
    lastChecked,
  };
}
