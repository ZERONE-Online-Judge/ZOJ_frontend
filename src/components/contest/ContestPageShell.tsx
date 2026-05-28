import type { CSSProperties, ReactNode } from 'react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ContestAccessDeniedModal from '@/components/contest/ContestAccessDeniedModal';
import { getPublicContest } from '@/domains/contestAdministration/api';
import {
  canViewContestResource,
  contestAccessPhase,
  contestResourceAccess,
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
import { contestLoginPath } from '@/shared/lib/loginRedirect';
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
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedContestId = contestId ?? '';
  const queryClient = useQueryClient();
  const prefetchedKeyRef = useRef<string | null>(null);
  const [dismissedEmergencyNoticeKey, setDismissedEmergencyNoticeKey] =
    useState<string | null>(null);
  const [checkedParticipantAccessKey, setCheckedParticipantAccessKey] =
    useState('');
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
  const visibleEmergencyNotice = contest?.emergency_notice ?? '';
  const visibleEmergencyNoticeKey =
    contestId && visibleEmergencyNotice
      ? emergencyNoticeDismissKey(contestId, visibleEmergencyNotice)
      : null;
  const isStoredEmergencyNoticeDismissed = useSyncExternalStore(
    subscribeDismissedEmergencyNotice,
    () => readDismissedEmergencyNotice(visibleEmergencyNoticeKey),
    () => false,
  );
  const isEmergencyNoticeDismissed =
    isStoredEmergencyNoticeDismissed ||
    dismissedEmergencyNoticeKey === visibleEmergencyNoticeKey;
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
  const shouldCheckParticipantAccess =
    Boolean(contestId && generalSession && shouldRequireParticipantAccess);
  const participantAccessCheckKey = [
    contestId ?? 'no-contest',
    generalSession?.account.email ?? 'public',
    shouldRequireParticipantAccess ? 'required' : 'optional',
  ].join(':');
  const hasCheckedParticipantAccess =
    !shouldCheckParticipantAccess ||
    Boolean(participantContest || activeParticipantSession) ||
    checkedParticipantAccessKey === participantAccessCheckKey;
  const isCheckingParticipantAccess =
    shouldCheckParticipantAccess &&
    !hasCheckedParticipantAccess;

  useEffect(() => {
    if (!contestId || !generalSession || !shouldRequireParticipantAccess) return;
    if (participantContest || activeParticipantSession) return;
    if (checkedParticipantAccessKey === participantAccessCheckKey) return;

    let cancelled = false;
    const currentCheckKey = participantAccessCheckKey;

    async function checkParticipantAccess() {
      await ensureParticipantSession().catch(() => null);
      if (!cancelled) setCheckedParticipantAccessKey(currentCheckKey);
    }

    void checkParticipantAccess();

    return () => {
      cancelled = true;
    };
  }, [
    activeParticipantSession,
    checkedParticipantAccessKey,
    contestId,
    ensureParticipantSession,
    generalSession,
    participantAccessCheckKey,
    participantContest,
    shouldRequireParticipantAccess,
  ]);

  useEffect(() => {
    if (!contestId || !detail) return;
    if (!hasContestParticipantAccess) return;

    const currentContestId = contestId;
    const currentDetail = detail;
    let cancelled = false;

    async function prefetchContestPageData() {
      const generalToken = generalSession?.accessToken;
      const generalIdentity = generalSession?.account.email ?? 'public';
      const shouldUseParticipantScope =
        contestAccessPhase(currentDetail.contest) !== 'ended';
      const currentParticipantSession = shouldUseParticipantScope
        ? activeParticipantSession ?? (await ensureParticipantSession())
        : null;
      if (cancelled) return;

      const participantToken = currentParticipantSession?.accessToken;
      const participantIdentity = currentParticipantSession
        ? [
            currentParticipantSession.contestId,
            currentParticipantSession.member.email,
            currentParticipantSession.division.division_id,
          ].join(':')
        : undefined;
      const token = participantToken ?? generalToken;
      const prefetchKey = [
        currentContestId,
        generalIdentity,
        participantIdentity ?? 'no-participant',
      ].join(':');

      if (prefetchedKeyRef.current === prefetchKey) return;
      prefetchedKeyRef.current = prefetchKey;

      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: contestQueryKeys.notices(
            currentContestId,
            generalIdentity,
            currentParticipantSession?.contestId,
            participantIdentity,
          ),
          queryFn: () => getContestNotices(currentContestId, token),
        }),
        queryClient.prefetchQuery({
          queryKey: contestQueryKeys.questions(
            currentContestId,
            generalIdentity,
            currentParticipantSession?.contestId,
            participantIdentity,
          ),
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
      <section className="mx-auto grid w-full max-w-[96rem] gap-8 px-4 py-12 font-sans sm:px-5 lg:px-6 2xl:max-w-[104rem]">
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
    <section className="mx-auto grid w-full max-w-[96rem] gap-8 px-4 py-12 font-sans sm:px-5 lg:px-6 2xl:max-w-[104rem]">
      {contestQuery.isLoading && (
        <PageNotice message="대회 정보를 불러오는 중입니다." status="loading" />
      )}
      {contestQuery.isError && (
        <PageNotice message="대회 정보를 불러오지 못했습니다." status="error" />
      )}
      {detail && contest && isCheckingParticipantAccess ? (
        <PageNotice message="참가 권한을 확인하는 중입니다." status="loading" />
      ) : null}

      {detail &&
      contest &&
      !hasContestParticipantAccess &&
      !isCheckingParticipantAccess ? (
        <ContestAccessDeniedModal
          loginTo={
            contestId
              ? contestLoginPath(
                  contestId,
                  `${location.pathname}${location.search}`,
                )
              : undefined
          }
          onClose={() => navigate('/contests', { replace: true })}
        />
      ) : null}

      {detail &&
      contest &&
      hasContestParticipantAccess &&
      !isCheckingParticipantAccess ? (
        <>
          {visibleEmergencyNotice && !isEmergencyNoticeDismissed ? (
            <EmergencyNoticeBanner
              notice={visibleEmergencyNotice}
              onDismiss={() => dismissEmergencyNotice(visibleEmergencyNotice)}
            />
          ) : null}

          {children(detail)}
        </>
      ) : null}
    </section>
  );
}
