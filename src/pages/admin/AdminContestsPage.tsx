import { type FormEvent, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AdminAccessGate,
  AdminPanel,
  AdminTabs,
  ContestIcon,
} from '@/components/admin/AdminShell';
import PageLayout from '@/components/common/PageLayout';
import {
  assignAdminContestOperator,
  createAdminContest,
  getAdminContests,
} from '@/domains/contestAdministration/api';
import type { Contest } from '@/domains/contestAdministration/types';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime, todayInputValue } from '@/shared/lib/dateTime';

type ContestFormState = {
  organizationName: string;
  operatorEmail: string;
  overview: string;
  startDate: string;
  title: string;
};

type OperatorFormState = {
  contestId: string;
  displayName: string;
  email: string;
};

const emptyContestForm: ContestFormState = {
  organizationName: '',
  operatorEmail: '',
  overview: '',
  startDate: todayInputValue(),
  title: '',
};

const emptyOperatorForm: OperatorFormState = {
  contestId: '',
  displayName: '',
  email: '',
};

const statusLabels: Record<string, string> = {
  archived: '보관',
  draft: '초안',
  ended: '종료',
  finalized: '결과 확정',
  open: '접수 중',
  running: '진행 중',
  schedule_tbd: '일정 미정',
  scheduled: '예정',
};

export default function AdminContestsPage() {
  return (
    <AdminAccessGate>
      {(session) => <AdminContestsContent token={session.accessToken} />}
    </AdminAccessGate>
  );
}

function AdminContestsContent({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const createContestSectionRef = useRef<HTMLDivElement>(null);
  const [contestForm, setContestForm] = useState(emptyContestForm);
  const [operatorForm, setOperatorForm] = useState(emptyOperatorForm);
  const [contestFormError, setContestFormError] = useState('');
  const [operatorFormError, setOperatorFormError] = useState('');

  const contestsQuery = useQuery({
    queryKey: ['admin', 'contests', queryIdentity],
    queryFn: () => getAdminContests(token),
  });

  const contests = useMemo(
    () =>
      [...(contestsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
      ),
    [contestsQuery.data],
  );

  const createContestMutation = useMutation({
    mutationFn: () =>
      createAdminContest(token, {
        operator_email: contestForm.operatorEmail.trim() || undefined,
        organization_name: contestForm.organizationName.trim(),
        overview:
          contestForm.overview.trim() ||
          `${contestForm.organizationName.trim()}에서 주최하는 대회입니다.`,
        start_at: `${contestForm.startDate}T00:00:00+09:00`,
        status: 'schedule_tbd',
        title: contestForm.title.trim() || undefined,
      }),
    onSuccess: () => {
      setContestForm(emptyContestForm);
      setContestFormError('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'contests'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const assignOperatorMutation = useMutation({
    mutationFn: () =>
      assignAdminContestOperator(operatorForm.contestId, token, {
        display_name: operatorForm.displayName.trim() || undefined,
        email: operatorForm.email.trim(),
      }),
    onSuccess: () => {
      setOperatorForm(emptyOperatorForm);
      setOperatorFormError('');
    },
  });

  function handleCreateContest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contestForm.organizationName.trim()) {
      setContestFormError('주최 기관은 반드시 입력해야 합니다.');
      return;
    }

    setContestFormError('');
    createContestMutation.mutate();
  }

  function handleAssignOperator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!operatorForm.contestId || !operatorForm.email.trim()) {
      setOperatorFormError('대회와 운영자 이메일을 선택해야 합니다.');
      return;
    }

    setOperatorFormError('');
    assignOperatorMutation.mutate();
  }

  function scrollToCreateContest() {
    createContestSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <PageLayout
      description="서비스 마스터가 대회를 만들고 운영자를 배정합니다."
      eyebrow="Service Master"
      title="대회 관리"
      width="7xl"
    >
      <AdminTabs />

      {contestsQuery.error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {formatApiError(
            contestsQuery.error,
            '대회 목록을 불러오지 못했습니다',
          )}
        </div>
      ) : null}

      <div className="grid gap-6">
        <AdminPanel
          actions={
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-violet-950 px-4 text-sm font-black text-white shadow-sm transition hover:bg-violet-800"
              onClick={scrollToCreateContest}
              type="button"
            >
              <ContestIcon />
              대회 생성
            </button>
          }
          description="최근 생성된 대회부터 표시됩니다."
          title="대회 목록"
        >
          <div className="max-h-[560px] overflow-auto rounded border border-slate-200">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    대회
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    주최
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    상태
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    시작
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    종료
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    바로가기
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contests.length > 0 ? (
                  contests.map((contest) => (
                    <ContestRow contest={contest} key={contest.contest_id} />
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                      colSpan={6}
                    >
                      등록된 대회가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel
          description="이미 만들어진 대회에 운영자를 추가합니다."
          title="운영자 배정"
        >
          <form
            className="grid gap-4 lg:grid-cols-3"
            onSubmit={handleAssignOperator}
          >
            <label className="grid gap-2 text-sm font-black text-slate-700">
              대회
              <select
                className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  setOperatorForm((prev) => ({
                    ...prev,
                    contestId: event.target.value,
                  }))
                }
                value={operatorForm.contestId}
              >
                <option value="">대회 선택</option>
                {contests.map((contest) => (
                  <option key={contest.contest_id} value={contest.contest_id}>
                    {contest.title || contest.organization_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              운영자 이메일
              <input
                className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  setOperatorForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="operator@example.com"
                type="email"
                value={operatorForm.email}
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              표시 이름
              <input
                className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  setOperatorForm((prev) => ({
                    ...prev,
                    displayName: event.target.value,
                  }))
                }
                placeholder="예: 대회 운영팀"
                value={operatorForm.displayName}
              />
            </label>

            {operatorFormError || assignOperatorMutation.error ? (
              <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 lg:col-span-3">
                {operatorFormError ||
                  formatApiError(
                    assignOperatorMutation.error,
                    '운영자 배정에 실패했습니다',
                  )}
              </p>
            ) : null}

            <div className="flex justify-end lg:col-span-3">
              <button
                className="h-11 rounded border border-amber-200 bg-amber-50 px-5 text-sm font-black text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:text-slate-400"
                disabled={assignOperatorMutation.isPending}
                type="submit"
              >
                {assignOperatorMutation.isPending ? '배정 중' : '운영자 배정'}
              </button>
            </div>
          </form>
        </AdminPanel>

        <div ref={createContestSectionRef}>
          <AdminPanel
            description="일정은 미정 상태로 생성하고, 이후 운영 페이지에서 상세 설정합니다."
            title="대회 생성"
          >
            <form className="grid gap-4" onSubmit={handleCreateContest}>
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  대회명
                  <input
                    className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    onChange={(event) =>
                      setContestForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="예: HEPC 1"
                    value={contestForm.title}
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  주최 기관
                  <input
                    className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    onChange={(event) =>
                      setContestForm((prev) => ({
                        ...prev,
                        organizationName: event.target.value,
                      }))
                    }
                    placeholder="예: COSS"
                    value={contestForm.organizationName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  기준 시작일
                  <input
                    className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    onChange={(event) =>
                      setContestForm((prev) => ({
                        ...prev,
                        startDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={contestForm.startDate}
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  초기 운영자 이메일
                  <input
                    className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    onChange={(event) =>
                      setContestForm((prev) => ({
                        ...prev,
                        operatorEmail: event.target.value,
                      }))
                    }
                    placeholder="operator@example.com"
                    type="email"
                    value={contestForm.operatorEmail}
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                개요
                <textarea
                  className="min-h-28 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 font-bold text-slate-950 transition outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  onChange={(event) =>
                    setContestForm((prev) => ({
                      ...prev,
                      overview: event.target.value,
                    }))
                  }
                  placeholder="대회 소개를 입력하세요."
                  value={contestForm.overview}
                />
              </label>

              {contestFormError || createContestMutation.error ? (
                <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {contestFormError ||
                    formatApiError(
                      createContestMutation.error,
                      '대회 생성에 실패했습니다',
                    )}
                </p>
              ) : null}

              <div className="flex justify-end">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded bg-violet-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-violet-800 disabled:bg-slate-300"
                  disabled={createContestMutation.isPending}
                  type="submit"
                >
                  <ContestIcon />
                  {createContestMutation.isPending ? '생성 중' : '대회 생성'}
                </button>
              </div>
            </form>
          </AdminPanel>
        </div>
      </div>
    </PageLayout>
  );
}

function ContestRow({ contest }: { contest: Contest }) {
  return (
    <tr className="transition hover:bg-violet-50/40">
      <td className="border-r border-slate-100 px-4 py-4">
        <div className="grid gap-1">
          <strong className="font-black text-slate-950">
            {contest.title || '-'}
          </strong>
          <span className="text-xs font-bold text-slate-400">
            {contest.contest_id}
          </span>
        </div>
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
        {contest.organization_name || '-'}
      </td>
      <td className="border-r border-slate-100 px-4 py-4">
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
          {statusLabels[contest.status] ?? contest.status}
        </span>
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-600">
        {formatDateTime(contest.start_at)}
      </td>
      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-600">
        {formatDateTime(contest.end_at)}
      </td>
      <td className="px-4 py-4">
        <Link
          className="rounded border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          to={`/contests/${contest.contest_id}`}
        >
          대회 보기
        </Link>
      </td>
    </tr>
  );
}
