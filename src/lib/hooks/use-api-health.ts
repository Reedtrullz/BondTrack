import { createContext, createElement, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { getHealth } from '@/lib/api/midgard';
import { getAllNodes } from '@/lib/api/thornode';
import { assertUsableThornodeNodes } from '@/lib/api/source-validation';
import { isDevelopmentMode } from '@/lib/mock-data';

export type ApiHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'down' | 'mock';

export interface ApiHealthState {
  midgard: ApiHealthStatus;
  thornode: ApiHealthStatus;
  lastChecked: Date | null;
  lastSuccessful: {
    midgard: Date | null;
    thornode: Date | null;
  };
}

const CONSECUTIVE_FAILURES_FOR_DOWN = 3;
const MIDGARD_INTERVAL_MS = 30_000;
const THORNODE_INTERVAL_MS = 60_000;
const HEALTH_PROBE_HEADER = 'X-Heimdall-Health-Probe';

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
  failuresRef: MutableRefObject<number>,
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
  const useMockData = isDevelopmentMode();
  const [midgardStatus, setMidgardStatus] = useState<ApiHealthStatus>(useMockData ? 'mock' : 'unknown');
  const [thornodeStatus, setThornodeStatus] = useState<ApiHealthStatus>(useMockData ? 'mock' : 'unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [lastSuccessful, setLastSuccessful] = useState<ApiHealthState['lastSuccessful']>({
    midgard: null,
    thornode: null,
  });

  const midgardFailures = useRef(0);
  const thornodeFailures = useRef(0);

  const checkMidgard = useCallback(async () => {
    if (useMockData) {
      setMidgardStatus('mock');
      setLastChecked(new Date());
      return;
    }

    try {
      await getHealth({
        cache: 'no-store',
        headers: { [HEALTH_PROBE_HEADER]: 'midgard' },
        retry: false,
      });
      midgardFailures.current = 0;
      setMidgardStatus('healthy');
      setLastSuccessful((previous) => ({ ...previous, midgard: new Date() }));
    } catch (error) {
      if (isHttpOrNetworkError(error)) {
        updateStatusFromFailure(midgardFailures, setMidgardStatus);
      }
    } finally {
      setLastChecked(new Date());
    }
  }, [useMockData]);

  const checkThornode = useCallback(async () => {
    if (useMockData) {
      setThornodeStatus('mock');
      setLastChecked(new Date());
      return;
    }

    try {
      const nodes = await getAllNodes({
        cache: 'no-store',
        headers: { [HEALTH_PROBE_HEADER]: 'thornode' },
        retry: false,
      });
      assertUsableThornodeNodes(nodes);
      thornodeFailures.current = 0;
      setThornodeStatus('healthy');
      setLastSuccessful((previous) => ({ ...previous, thornode: new Date() }));
    } catch (error) {
      if (isHttpOrNetworkError(error)) {
        updateStatusFromFailure(thornodeFailures, setThornodeStatus);
      }
    } finally {
      setLastChecked(new Date());
    }
  }, [useMockData]);

  useEffect(() => {
    checkMidgard();
    checkThornode();

    if (useMockData) {
      return undefined;
    }

    const midgardInterval = setInterval(checkMidgard, MIDGARD_INTERVAL_MS);
    const thornodeInterval = setInterval(checkThornode, THORNODE_INTERVAL_MS);

    return () => {
      clearInterval(midgardInterval);
      clearInterval(thornodeInterval);
    };
  }, [checkMidgard, checkThornode, useMockData]);

  return {
    midgard: midgardStatus,
    thornode: thornodeStatus,
    lastChecked,
    lastSuccessful,
  };
}

const ApiHealthContext = createContext<ApiHealthState | null>(null);

export function ApiHealthProvider({ children }: { children: ReactNode }) {
  const health = useApiHealth();
  return createElement(ApiHealthContext.Provider, { value: health }, children);
}

export function useApiHealthContext(): ApiHealthState {
  const context = useContext(ApiHealthContext);
  if (!context) {
    throw new Error('useApiHealthContext must be used within ApiHealthProvider');
  }
  return context;
}
