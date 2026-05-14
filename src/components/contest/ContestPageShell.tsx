import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getPublicContest } from '@/domains/contestAdministration/api';
import type { PublicContestDetail } from '@/domains/contestAdministration/types';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import {
  getDivisionProblems,
  getContestProblems,
} from '@/domains/problemManagement/api';
import {
  getContestNotices,
  getContestQuestions,
} from '@/domains/serviceCommunication/api';
import {
  getDivisionScoreboard,
  getScoreboard,
  listSubmissions,
} from '@/domains/submissionScoreboard/api';
import { createParticipantSessionFromGeneralToken } from '@/domains/teamParticipation/api';
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

export default function ContestPageShell({ children }: ContestPageShellProps) {
  const { contestId } = useParams();
  const queryClient = useQueryClient();
  const prefetchedKeyRef = useRef<string | null>(null);
  const [dismissedEmergencyNoticeKey, setDismissedEmergencyNoticeKey] =
    useState<string | null>(null);
  const generalSession = useSessionStore((state) => state.generalSession);
  const participantSession = useSessionStore(
    (state) => state.participantSession,
  );
  const setParticipantSession = useSessionStore(
    (state) => state.setParticipantSession,
  );
  const contestQuery = useQuery({
    enabled: Boolean(contestId),
    queryKey: ['public-contest', contestId],
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

  useEffect(() => {
    if (!contestId || !detail) return;

    const currentContestId = contestId;
    const generalToken = generalSession?.accessToken;
    const participantContest = generalSession?.participantContests.find(
      (item) => item.contest.contest_id === currentContestId,
    );
    const prefetchKey = [
      currentContestId,
      generalToken ?? 'public',
      participantContest?.division.division_id ?? 'public',
    ].join(':');

    if (prefetchedKeyRef.current === prefetchKey) return;
    prefetchedKeyRef.current = prefetchKey;

    async function prefetchContestPageData() {
      let activeParticipantSession =
        participantSession?.contestId === currentContestId
          ? participantSession
          : null;

      if (!activeParticipantSession && generalToken && participantContest) {
        activeParticipantSession =
          await createParticipantSessionFromGeneralToken(
            currentContestId,
            generalToken,
          );
        setParticipantSession(activeParticipantSession);
      }

      const token = activeParticipantSession?.accessToken ?? generalToken;
      const divisionId = activeParticipantSession?.division.division_id;

      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ['contest-problems', currentContestId, generalToken],
          queryFn: () =>
            divisionId
              ? getDivisionProblems(currentContestId, divisionId, token)
              : getContestProblems(currentContestId, token),
        }),
        queryClient.prefetchQuery({
          queryKey: ['contest-submissions', currentContestId, generalToken],
          queryFn: () => listSubmissions(currentContestId, token),
        }),
        queryClient.prefetchQuery({
          queryKey: [
            'contest-scoreboard',
            currentContestId,
            generalToken,
            activeParticipantSession?.contestId,
            divisionId,
            activeParticipantSession?.accessToken,
          ],
          queryFn: () =>
            divisionId
              ? getDivisionScoreboard(currentContestId, divisionId, token)
              : getScoreboard(currentContestId, token),
        }),
        queryClient.prefetchQuery({
          queryKey: ['contest-notices', currentContestId, generalToken],
          queryFn: () => getContestNotices(currentContestId, token),
        }),
        queryClient.prefetchQuery({
          queryKey: ['contest-questions', currentContestId, generalToken],
          queryFn: () => getContestQuestions(currentContestId, token),
        }),
      ]);
    }

    void prefetchContestPageData();
  }, [
    contestId,
    detail,
    generalSession,
    participantSession,
    queryClient,
    setParticipantSession,
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

      {detail && contest ? (
        <>
          {contest.emergency_notice && !isEmergencyNoticeDismissed ? (
            <section className="flex items-start justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-800">
              <p className="leading-6">{contest.emergency_notice}</p>
              <button
                aria-label="긴급공지 닫기"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded border border-red-200 bg-white/70 text-red-700 transition hover:bg-white hover:text-red-900"
                onClick={() =>
                  dismissEmergencyNotice(contest.emergency_notice!)
                }
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
          ) : null}

          {children(detail)}
        </>
      ) : null}
    </section>
  );
}
