import { useCallback, useEffect, useState } from 'react';
import { getRetryAfterSeconds } from '../utils/retryAfter';

export const useRetryAfter = () => {
  const [retryUntil, setRetryUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const startRetryAfter = useCallback((error: unknown) => {
    const startedAt = Date.now();
    const seconds = getRetryAfterSeconds(error, startedAt);
    if (seconds == null) return false;

    setNow(startedAt);
    setRetryUntil(startedAt + Math.max(1, seconds) * 1000);
    return true;
  }, []);

  useEffect(() => {
    if (retryUntil <= Date.now()) return;

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  const secondsRemaining = Math.max(0, Math.ceil((retryUntil - now) / 1000));

  return {
    isCoolingDown: secondsRemaining > 0,
    secondsRemaining,
    startRetryAfter,
  };
};
