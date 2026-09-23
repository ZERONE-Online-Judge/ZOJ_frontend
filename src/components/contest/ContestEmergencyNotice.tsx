import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { sharedUiText } from '@/data/uiText';
import { SvgIcon } from '@/utils/Icons';
import type { Contest } from '@/domains/contestAdministration/types';
import { useNoticeCountdown } from '@/domains/serviceCommunication/useNoticeCountdown';

const EMERGENCY_NOTICE_DISMISS_EVENT = 'zoj:emergency-notice-dismissed';

function emergencyNoticeDismissKey(contestId: string, notice: string) {
  return `zoj.dismissedEmergencyNotice.${contestId}.${encodeURIComponent(notice)}`;
}

function subscribeDismissedEmergencyNotice(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(EMERGENCY_NOTICE_DISMISS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(EMERGENCY_NOTICE_DISMISS_EVENT, onStoreChange);
  };
}

function readDismissedEmergencyNotice(key: string | null) {
  if (!key) return false;

  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function EmergencyNoticeBanner({
  notice,
  onDismiss,
}: {
  notice: string;
  onDismiss: () => void;
}) {
  const marqueeTextRef = useRef<HTMLSpanElement | null>(null);
  const measureTextRef = useRef<HTMLSpanElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [marqueeDistance, setMarqueeDistance] = useState(0);
  const [marqueeDuration, setMarqueeDuration] = useState(14);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  useLayoutEffect(() => {
    const textElement = measureTextRef.current;
    const viewportElement = viewportRef.current;
    if (!textElement || !viewportElement) return;

    function updateOverflow() {
      if (!textElement || !viewportElement) return;

      const textWidth = textElement.scrollWidth;
      setShouldMarquee(textWidth > viewportElement.clientWidth);
      setMarqueeDistance(textWidth + 40);
      setMarqueeDuration(Math.max(12, Math.min(32, textWidth / 45)));
    }

    updateOverflow();

    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(textElement);
    resizeObserver.observe(viewportElement);

    return () => resizeObserver.disconnect();
  }, [notice]);

  return (
    <section
      aria-label={sharedUiText.emergencyNoticeAriaLabel}
      className="flex w-full max-w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-500"
    >
      <SvgIcon name="megaphone" size={20} />
      <div
        className="relative min-w-0 flex-1 overflow-hidden"
        ref={viewportRef}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none invisible absolute whitespace-nowrap"
          ref={measureTextRef}
        >
          {notice}
        </span>
        {shouldMarquee ? (
          <div
            className="animate-emergency-marquee flex w-max max-w-none gap-10 whitespace-nowrap will-change-transform"
            style={
              {
                '--zoj-emergency-marquee-distance': `${marqueeDistance}px`,
                '--zoj-emergency-marquee-duration': `${marqueeDuration}s`,
              } as CSSProperties
            }
          >
            <span className="shrink-0" ref={marqueeTextRef}>
              {notice}
            </span>
            <span aria-hidden="true" className="shrink-0">
              {notice}
            </span>
          </div>
        ) : (
          <span className="block whitespace-nowrap">{notice}</span>
        )}
      </div>
      <button
        aria-label={sharedUiText.emergencyNoticeClose}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded text-red-500 transition hover:bg-red-100 hover:text-red-700"
        onClick={onDismiss}
        type="button"
      >
        <SvgIcon name="close" size={14} />
      </button>
    </section>
  );
}

export default function ContestEmergencyNotice({
  contestId,
  notice,
  template,
  contest,
}: {
  contestId: string;
  notice: string;
  template?: string | null;
  contest?: Contest;
}) {
  const rendered = useNoticeCountdown(notice, template, contest);
  const key = rendered.text
    ? emergencyNoticeDismissKey(contestId, rendered.identity)
    : null;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const isStoredDismissed = useSyncExternalStore(
    subscribeDismissedEmergencyNotice,
    () => readDismissedEmergencyNotice(key),
    () => false,
  );
  if (!rendered.text || !key || isStoredDismissed || dismissedKey === key)
    return null;
  return (
    <EmergencyNoticeBanner
      notice={rendered.text}
      onDismiss={() => {
        setDismissedKey(key);
        try {
          window.localStorage.setItem(key, '1');
        } catch {
          /* Dismiss for this visit when storage is unavailable. */
        }
        window.dispatchEvent(new Event(EMERGENCY_NOTICE_DISMISS_EVENT));
      }}
    />
  );
}
