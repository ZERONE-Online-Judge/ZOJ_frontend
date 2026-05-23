import type { CSSProperties, ReactNode } from 'react';
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
import {
  canViewContestResource,
  contestStartAnnouncement,
  contestAccessPhase,
  contestResourceAccess,
  freezeAnnouncement,
  isFrozen,
  scoreboardFreezeEndAnnouncement,
} from '@/domains/contestAdministration/logic';
import type { PublicContestDetail } from '@/domains/contestAdministration/types';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  getContestNotices,
  getContestQuestions,
} from '@/domains/serviceCommunication/api';
import { sharedUiText } from '@/data/uiText';
import PageNotice from '@/shared/ui/PageNotice';
import { SvgIcon } from '@/utils/Icons';

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
      <div className="relative min-w-0 flex-1 overflow-hidden" ref={viewportRef}>
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
          <span className="block whitespace-nowrap">
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
        <SvgIcon name="close" size={14} />
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
  const [, setAnnouncementTick] = useState(0);
  const {
    activeParticipantSession,
    ensureParticipantSession,
    generalSession,
    isRefreshingGeneralSession,
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
  const automaticNotice = contest
    ? contestStartAnnouncement(contest) ||
      (isFrozen(contest)
        ? scoreboardFreezeEndAnnouncement(contest)
        : freezeAnnouncement(contest))
    : '';
  const automaticNoticeKey =
    contestId && automaticNotice
      ? emergencyNoticeDismissKey(contestId, automaticNotice)
      : null;
  const isAutomaticNoticeDismissed =
    readDismissedEmergencyNotice(automaticNoticeKey) ||
    dismissedEmergencyNoticeKey === automaticNoticeKey;
  const hasSessionAccess = Boolean(participantContest || activeParticipantSession);
  const hasPublicAfterEndResource = contest
    ? ([
        'problem',
        'scoreboard',
        'submission',
        'board',
        'notice',
      ] as const).some((resource) =>
        canViewContestResource(
          contest,
          hasSessionAccess,
          contestResourceAccess(contest, resource),
        ),
      )
    : false;
  const shouldRequireParticipantAccess =
    contest ? contestAccessPhase(contest) !== 'ended' : true;
  const hasContestParticipantAccess =
    !generalSession ||
    Boolean(participantContest) ||
    (!shouldRequireParticipantAccess && hasPublicAfterEndResource);

  useEffect(() => {
    if (!contestId || !detail) return;
    if (!hasContestParticipantAccess) return;

    const currentContestId = contestId;
    const currentDetail = detail;
    let cancelled = false;

    async function prefetchContestPageData() {
      const generalToken = generalSession?.accessToken;
      const shouldUseParticipantScope =
        contestAccessPhase(currentDetail.contest) !== 'ended';
      const currentParticipantSession = shouldUseParticipantScope
        ? activeParticipantSession ?? (await ensureParticipantSession())
        : null;
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnnouncementTick((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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
      {detail && contest && isRefreshingGeneralSession ? (
        <PageNotice message="참가 권한을 확인하는 중입니다." status="loading" />
      ) : null}

      {detail &&
      contest &&
      !hasContestParticipantAccess &&
      !isRefreshingGeneralSession ? (
        <ContestAccessDeniedModal
          onClose={() => navigate('/contests', { replace: true })}
        />
      ) : null}

      {detail &&
      contest &&
      hasContestParticipantAccess &&
      !isRefreshingGeneralSession ? (
        <>
          {contest.emergency_notice && !isEmergencyNoticeDismissed ? (
            <EmergencyNoticeBanner
              notice={contest.emergency_notice}
              onDismiss={() =>
                dismissEmergencyNotice(contest.emergency_notice!)
              }
            />
          ) : null}
          {automaticNotice && !isAutomaticNoticeDismissed ? (
            <EmergencyNoticeBanner
              notice={automaticNotice}
              onDismiss={() => dismissEmergencyNotice(automaticNotice)}
            />
          ) : null}

          {children(detail)}
        </>
      ) : null}
    </section>
  );
}
