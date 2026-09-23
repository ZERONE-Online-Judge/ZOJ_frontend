import { useEffect, useState } from 'react';
import type { Contest } from '@/domains/contestAdministration/types';
import { renderNoticeCountdown } from '@/domains/serviceCommunication/noticeCountdown';

export function useNoticeCountdown(
  text: string,
  template?: string | null,
  contest?: Contest,
) {
  const [now, setNow] = useState(() => Date.now());
  const source = template ?? text;
  const rendered = renderNoticeCountdown(source, contest, now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = rendered.pending ? window.setInterval(tick, 1000) : undefined;
    const resume = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [
    source,
    rendered.pending,
    contest?.start_at,
    contest?.freeze_at,
    contest?.end_at,
    contest?.status,
    contest?.scoreboard_freeze_mode,
  ]);
  return rendered;
}
