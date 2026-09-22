import ParticipantPreviewShell from '@/components/contest/ParticipantPreviewShell';
import { hasParticipantPreviewAccess } from '@/domains/identityAccess/participantPreview';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import type { ReactNode } from 'react';
import ContestEmergencyNotice from '@/components/contest/ContestEmergencyNotice';
import { useEffect, useRef, useState } from 'react';
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
import PageNotice from '@/shared/ui/PageNotice';
import { contestLoginPath } from '@/shared/lib/loginRedirect';

type ContestPageShellProps = {
  children: (detail: PublicContestDetail) => ReactNode;
};

export default function ContestPageShell({ children }: ContestPageShellProps) {
  const { contestId } = useParams();
  const session = useSessionStore((state) => state.generalSession);
  if (contestId && session && hasParticipantPreviewAccess(session, contestId)) {
    return (
      <ParticipantPreviewShell
        contestId={contestId}
        session={session}
        key={`${contestId}:${session.account.email}`}
      >
        {children}
      </ParticipantPreviewShell>
    );
  }
  return <StandardContestPageShell>{children}</StandardContestPageShell>;
}

function StandardContestPageShell({ children }: ContestPageShellProps) {
  const { contestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedContestId = contestId ?? '';
  const queryClient = useQueryClient();
  const prefetchedKeyRef = useRef<string | null>(null);
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
  const hasSessionAccess = Boolean(
    participantContest || activeParticipantSession,
  );
  const hasPublicAfterEndResource = contest
    ? (
        ['problem', 'scoreboard', 'submission', 'board', 'notice'] as const
      ).some((resource) =>
        canViewContestResource(
          contest,
          hasSessionAccess,
          contestResourceAccess(contest, resource),
        ),
      )
    : false;
  const shouldRequireParticipantAccess = contest
    ? contestAccessPhase(contest) !== 'ended'
    : true;
  const hasContestParticipantAccess =
    !generalSession ||
    Boolean(participantContest) ||
    (!shouldRequireParticipantAccess && hasPublicAfterEndResource);
  const shouldCheckParticipantAccess = Boolean(
    contestId && generalSession && shouldRequireParticipantAccess,
  );
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
    shouldCheckParticipantAccess && !hasCheckedParticipantAccess;

  useEffect(() => {
    if (!contestId || !generalSession || !shouldRequireParticipantAccess)
      return;
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
        ? (activeParticipantSession ?? (await ensureParticipantSession()))
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
      <section className="zoj-contest-shell mx-auto grid w-full max-w-[112rem] min-w-0 gap-5 px-4 py-6 font-sans sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
        <PageNotice message="대회 정보를 찾을 수 없습니다." status="error" />
      </section>
    );
  }

  return (
    <section className="zoj-contest-shell mx-auto grid w-full max-w-[112rem] min-w-0 gap-5 px-4 py-6 font-sans sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
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
          <ContestEmergencyNotice
            contestId={contestId}
            notice={contest.emergency_notice ?? ''}
          />

          {children(detail)}
        </>
      ) : null}
    </section>
  );
}
