import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import ContestSubmissionsTable from '@/components/contest/submissions/ContestSubmissionsTable';
import {
  JudgeIcon,
  OperatorAccessGate,
  OperatorMetricCard,
  OperatorPanel,
  OperatorTabs,
} from '@/components/operator/OperatorShell';
import { getOperatorContestDashboard } from '@/domains/contestAdministration/api';
import { getOperatorProblems } from '@/domains/problemManagement/api';
import {
  listOperatorSubmissions,
  waitOperatorSubmissionStatus,
} from '@/domains/submissionScoreboard/api';
import { isSubmissionPending } from '@/domains/submissionScoreboard/status';
import { formatApiError } from '@/shared/api/errors';
import useDocumentVisibility from '@/shared/hooks/useDocumentVisibility';
import AnimatedNumber from '@/shared/ui/AnimatedNumber';

export default function OperatorSubmissionsPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate>
      {(session) =>
        contestId ? (
          <OperatorSubmissionsContent
            contestId={contestId}
            token={session.accessToken}
          />
        ) : (
          <PageLayout title="대회 선택 필요">
            운영할 대회를 먼저 선택하세요.
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorSubmissionsContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const isVisible = useDocumentVisibility();
  const queryClient = useQueryClient();
  const waitingIds = useRef(new Set<string>());

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const problemsQuery = useQuery({
    queryKey: ['operator', 'problems', contestId],
    queryFn: () => getOperatorProblems(contestId, token),
  });
  const submissionsQuery = useQuery({
    queryKey: ['operator', 'submissions', contestId],
    queryFn: () => listOperatorSubmissions(contestId, token),
    refetchInterval: (query) => {
      if (!isVisible) return false;
      const submissions = query.state.data ?? [];
      return submissions.some((submission) =>
        isSubmissionPending(submission.status),
      )
        ? 3_000
        : 15_000;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!isVisible) return;

    (submissionsQuery.data ?? [])
      .filter((submission) => isSubmissionPending(submission.status))
      .forEach((submission) => {
        if (waitingIds.current.has(submission.submission_id)) return;

        waitingIds.current.add(submission.submission_id);
        void waitOperatorSubmissionStatus(
          contestId,
          submission.submission_id,
          token,
          {
            pollIntervalSeconds: 0.5,
            waitSeconds: 4,
          },
        )
          .then(() => {
            void queryClient.invalidateQueries({
              queryKey: ['operator', 'submissions', contestId],
            });
            void queryClient.invalidateQueries({
              queryKey: ['operator', 'dashboard', contestId],
            });
          })
          .catch(() => undefined)
          .finally(() => {
            waitingIds.current.delete(submission.submission_id);
          });
      });
  }, [contestId, isVisible, queryClient, submissionsQuery.data, token]);

  const submissions = submissionsQuery.data ?? [];
  const pendingCount = submissions.filter((submission) =>
    isSubmissionPending(submission.status),
  ).length;

  return (
    <PageLayout
      description="대회 전체 제출과 채점 진행 상태를 운영자 기준으로 확인합니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 제출`}
      width="7xl"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || problemsQuery.error || submissionsQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(
            dashboardQuery.error ||
              problemsQuery.error ||
              submissionsQuery.error,
            '제출 데이터를 불러오지 못했습니다',
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <OperatorMetricCard
          description="현재 목록 기준"
          icon={<JudgeIcon />}
          label="전체 제출"
          tone="indigo"
          value={<AnimatedNumber value={submissions.length} />}
        />
        <OperatorMetricCard
          description="채점 중 또는 대기"
          icon={<JudgeIcon />}
          label="진행 중"
          tone="amber"
          value={<AnimatedNumber value={pendingCount} />}
        />
        <OperatorMetricCard
          description="대시보드 집계"
          icon={<JudgeIcon />}
          label="대기 작업"
          tone="cyan"
          value={
            <AnimatedNumber value={dashboardQuery.data?.pending_jobs ?? 0} />
          }
        />
      </div>

      <OperatorPanel
        description="문제 번호와 언어 링크는 참가자 문제/제출 화면으로 연결됩니다."
        title="제출 목록"
      >
        <ContestSubmissionsTable
          contestId={contestId}
          problems={problemsQuery.data ?? []}
          submissions={submissions}
        />
        {!submissionsQuery.isLoading && submissions.length === 0 ? (
          <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
            표시할 제출이 없습니다.
          </p>
        ) : null}
      </OperatorPanel>
    </PageLayout>
  );
}
