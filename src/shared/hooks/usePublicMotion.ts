import { useEffect, useState } from 'react';

const preferenceKey = 'zoj.publicMotion';
export default function usePublicMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const [userPaused, setUserPaused] = useState(() => {
    try {
      return window.localStorage.getItem(preferenceKey) === 'off';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(Boolean(media?.matches));
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);
  function toggle() {
    const next = !userPaused;
    setUserPaused(next);
    try {
      window.localStorage.setItem(preferenceKey, next ? 'off' : 'on');
    } catch {
      /* Motion controls also work without storage. */
    }
  }
  return { paused: reduced || userPaused, reduced, toggle };
}
