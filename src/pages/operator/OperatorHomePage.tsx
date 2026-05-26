import type { ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import {
  JudgeIcon,
  OperatorAccessGate,
  OperatorMetricCard,
  OperatorPanel,
  OperatorTabs,
  ProblemIcon,
  ScoreboardIcon,
  SettingsIcon,
  TeamIcon,
} from '@/components/operator/OperatorShell';
import {
  getOperatorContestDashboard,
} from '@/domains/contestAdministration/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';
import AnimatedNumber from '@/shared/ui/AnimatedNumber';

export default function OperatorHomePage() {
  const { contestId } = useParams();

  if (!contestId) {
    return <Navigate replace to="/contests" />;
  }

  return (
    <OperatorAccessGate contestId={contestId} permission="contest.view">
      {(session) => (
        <OperatorHomeContent
          contestId={contestId}
          token={session.accessToken}
        />
      )}
    </OperatorAccessGate>
  );
}

function OperatorHomeContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const queryIdentity = tokenQueryIdentity(token);
  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
    refetchInterval: 15_000,
  });
  const dashboard = dashboardQuery.data;
  const contest = dashboard?.contest;

  return (
    <PageLayout
      description="운영 권한이 있는 대회의 참가팀, 문제, 제출, 공지를 관리합니다."
      eyebrow="Operator"
      title={contest ? `${contest.title} 운영` : '대회 운영'}
      width="full"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(
            dashboardQuery.error,
            '운영자 데이터를 불러오지 못했습니다',
          )}
        </div>
      ) : null}

      <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OperatorMetricCard
              description="전체 참가팀"
              icon={<TeamIcon />}
              label="참가팀"
              tone="indigo"
              value={
                <AnimatedNumber value={dashboard?.participant_count ?? 0} />
              }
            />
            <OperatorMetricCard
              description="전체 제출 수"
              icon={<JudgeIcon />}
              label="제출"
              tone="cyan"
              value={
                <AnimatedNumber value={dashboard?.submission_count ?? 0} />
              }
            />
            <OperatorMetricCard
              description="대기 중인 채점"
              icon={<JudgeIcon />}
              label="대기 채점"
              tone="amber"
              value={<AnimatedNumber value={dashboard?.pending_jobs ?? 0} />}
            />
            <OperatorMetricCard
              description="등록된 유형"
              icon={<SettingsIcon />}
              label="유형"
              tone="emerald"
              value={
                <AnimatedNumber value={dashboard?.divisions.length ?? 0} />
              }
            />
          </div>

          <OperatorPanel
            description="운영자가 자주 쓰는 기능으로 이동합니다."
            title="운영 작업"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <OperatorQuickLink
                icon={<SettingsIcon />}
                label="대회 설정"
                to={`/operator/contests/${contestId}/settings`}
              />
              <OperatorQuickLink
                icon={<TeamIcon />}
                label="참가팀 관리"
                to={`/operator/contests/${contestId}/participants`}
              />
              <OperatorQuickLink
                icon={<ProblemIcon />}
                label="문제 관리"
                to={`/operator/contests/${contestId}/problems`}
              />
              <OperatorQuickLink
                icon={<ScoreboardIcon />}
                label="스코어보드"
                to={`/operator/contests/${contestId}/scoreboard`}
              />
            </div>
          </OperatorPanel>

          <OperatorPanel
            description="대회 일정과 유형별 참가팀 현황입니다."
            title="대회 상태"
          >
            {contest ? (
              <div className="grid gap-4 md:grid-cols-3">
                <OperatorInfo
                  label="시작"
                  value={formatDateTime(contest.start_at)}
                />
                <OperatorInfo
                  label="종료"
                  value={formatDateTime(contest.end_at)}
                />
                <OperatorInfo
                  label="프리즈"
                  value={formatDateTime(contest.freeze_at)}
                />
              </div>
            ) : null}
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black text-slate-500">
                  <tr>
                    <th className="border-r border-b border-slate-200 px-4 py-3">
                      유형
                    </th>
                    <th className="border-r border-b border-slate-200 px-4 py-3">
                      설명
                    </th>
                    <th className="border-r border-b border-slate-200 px-4 py-3">
                      코드
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3">
                      참가팀
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(dashboard?.divisions ?? []).map((division) => (
                    <tr
                      className="hover:bg-indigo-50/40"
                      key={division.division_id}
                    >
                      <td className="border-r border-slate-100 px-4 py-4 font-black text-slate-950">
                        {division.name}
                      </td>
                      <td className="zoj-break-anywhere border-r border-slate-100 px-4 py-4 font-bold text-slate-600">
                        {division.description || '-'}
                      </td>
                      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-600">
                        {division.code || '-'}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-700">
                        {dashboard?.participant_count_by_division[
                          division.division_id
                        ] ?? 0}
                        팀
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </OperatorPanel>
      </div>
    </PageLayout>
  );
}

function OperatorQuickLink({
  icon,
  label,
  to,
}: {
  icon: ReactNode;
  label: string;
  to: string;
}) {
  return (
    <Link
      className="inline-flex h-14 items-center gap-3 rounded border border-indigo-100 bg-indigo-50 px-4 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
      to={to}
    >
      {icon}
      {label}
    </Link>
  );
}

function OperatorInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
