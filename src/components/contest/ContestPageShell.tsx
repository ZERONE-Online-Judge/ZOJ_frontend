import type { ReactNode } from 'react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import ContestAccessDeniedModal from '@/components/contest/ContestAccessDeniedModal';
import { getPublicContest } from '@/domains/contestAdministration/api';
import type { PublicContestDetail } from '@/domains/contestAdministration/types';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  getContestNotices,
  getContestQuestions,
} from '@/domains/serviceCommunication/api';
import { sharedUiText } from '@/data/uiText';
import PageNotice from '@/shared/ui/PageNotice';

type ContestPageShellProps = {
  children: (detail: PublicContestDetail) => ReactNode;
};

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
  const textRef = useRef<HTMLSpanElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  useLayoutEffect(() => {
    const textElement = textRef.current;
    const viewportElement = viewportRef.current;
    if (!textElement || !viewportElement) return;

    function updateOverflow() {
      if (!textElement || !viewportElement) return;

      setShouldMarquee(textElement.scrollWidth > viewportElement.clientWidth);
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
      className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-500"
    >
      <svg
        aria-hidden="true"
        className="size-5 shrink-0"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          d="M3.75 11.5h2.5l5.25 3.25V5.25L6.25 8.5h-2.5v3ZM14 8l2.25-2.25M14.25 12.25 16.5 14.5M14.75 10.25h2.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
      <div className="min-w-0 flex-1 overflow-hidden" ref={viewportRef}>
        {shouldMarquee ? (
          <div className="animate-emergency-marquee flex w-max max-w-none gap-10 whitespace-nowrap">
            <span className="shrink-0" ref={textRef}>
              {notice}
            </span>
            <span aria-hidden="true" className="shrink-0">
              {notice}
            </span>
          </div>
        ) : (
          <span className="block truncate" ref={textRef}>
            {notice}
          </span>
        )}
      </div>
      <button
        aria-label={sharedUiText.emergencyNoticeClose}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded text-red-500 transition hover:bg-red-100 hover:text-red-700"
        onClick={onDismiss}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            d="m4.25 4.25 7.5 7.5M11.75 4.25l-7.5 7.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>
    </section>
  );
}

export default function ContestPageShell({ children }: ContestPageShellProps) {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const resolvedContestId = contestId ?? '';
  const queryClient = useQueryClient();
  const prefetchedKeyRef = useRef<string | null>(null);
  const [dismissedEmergencyNoticeKey, setDismissedEmergencyNoticeKey] =
    useState<string | null>(null);
  const {
    activeParticipantSession,
    ensureParticipantSession,
    generalSession,
    participantContest,
  } = useContestParticipantSession(resolvedContestId);
  const contestQuery = useQuery({
    enabled: Boolean(contestId),
    queryKey: contestQueryKeys.publicContest(contestId),
    queryFn: () => getPublicContest(contestId!),
    refetchInterval: 15_000,
  });

  const detail = contestQuery.data;
  const contest = detail?.contest;
  const emergencyNoticeKey =
    contestId && contest?.emergency_notice
      ? emergencyNoticeDismissKey(contestId, contest.emergency_notice)
      : null;
  const isStoredEmergencyNoticeDismissed = useSyncExternalStore(
    subscribeDismissedEmergencyNotice,
    () => readDismissedEmergencyNotice(emergencyNoticeKey),
    () => false,
  );
  const isEmergencyNoticeDismissed =
    isStoredEmergencyNoticeDismissed ||
    dismissedEmergencyNoticeKey === emergencyNoticeKey;
  const hasContestParticipantAccess =
    !generalSession || Boolean(participantContest);

  useEffect(() => {
    if (!contestId || !detail) return;
    if (!hasContestParticipantAccess) return;

    const currentContestId = contestId;
    let cancelled = false;

    async function prefetchContestPageData() {
      const generalToken = generalSession?.accessToken;
      const currentParticipantSession =
        activeParticipantSession ?? (await ensureParticipantSession());
      if (cancelled) return;

      const participantToken = currentParticipantSession?.accessToken;
      const token = participantToken ?? generalToken;
      const prefetchKey = [
        currentContestId,
        generalToken ?? 'public',
        participantToken ?? 'no-participant-token',
      ].join(':');

      if (prefetchedKeyRef.current === prefetchKey) return;
      prefetchedKeyRef.current = prefetchKey;

      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: contestQueryKeys.notices(currentContestId, token),
          queryFn: () => getContestNotices(currentContestId, token),
        }),
        queryClient.prefetchQuery({
          queryKey: contestQueryKeys.questions(currentContestId, token),
          queryFn: () => getContestQuestions(currentContestId, token),
        }),
      ]);
    }

    void prefetchContestPageData();

    return () => {
      cancelled = true;
    };
  }, [
    contestId,
    detail,
    generalSession,
    activeParticipantSession,
    ensureParticipantSession,
    hasContestParticipantAccess,
    participantContest,
    queryClient,
  ]);

  if (!contestId) {
    return (
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-14 font-sans lg:px-8">
        <PageNotice message="대회 정보를 찾을 수 없습니다." status="error" />
      </section>
    );
  }

  function dismissEmergencyNotice(notice: string) {
    if (!contestId) return;

    const key = emergencyNoticeDismissKey(contestId, notice);
    setDismissedEmergencyNoticeKey(key);

    try {
      window.localStorage.setItem(key, '1');
      window.dispatchEvent(new Event(EMERGENCY_NOTICE_DISMISS_EVENT));
    } catch {
      window.dispatchEvent(new Event(EMERGENCY_NOTICE_DISMISS_EVENT));
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-14 font-sans lg:px-8">
      {contestQuery.isLoading && (
        <PageNotice message="대회 정보를 불러오는 중입니다." status="loading" />
      )}
      {contestQuery.isError && (
        <PageNotice message="대회 정보를 불러오지 못했습니다." status="error" />
      )}

      {detail && contest && !hasContestParticipantAccess ? (
        <ContestAccessDeniedModal
          onClose={() => navigate('/contests', { replace: true })}
        />
      ) : null}

      {detail && contest && hasContestParticipantAccess ? (
        <>
          {contest.emergency_notice && !isEmergencyNoticeDismissed ? (
            <EmergencyNoticeBanner
              notice={contest.emergency_notice}
              onDismiss={() =>
                dismissEmergencyNotice(contest.emergency_notice!)
              }
            />
          ) : null}

          {children(detail)}
        </>
      ) : null}
    </section>
  );
}
