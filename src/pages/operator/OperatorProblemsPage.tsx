import { type FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { sharedUiText } from '@/data/uiText';
import {
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
  ProblemIcon,
} from '@/components/operator/OperatorShell';
import { getOperatorContestDashboard } from '@/domains/contestAdministration/api';
import {
  buildProblemPackageRecipe,
  createVerifiedTestcaseSetFromZip,
  createOperatorProblem,
  getOperatorProblems,
  getProblemAssets,
  getProblemPackageStatus,
  getProblemTestcaseSets,
  updateOperatorProblem,
  uploadProblemAsset,
} from '@/domains/problemManagement/api';
import type { Problem } from '@/domains/problemManagement/types';
import {
  PROBLEM_STATEMENT_TEMPLATE,
  TEST_SCRIPT_TEMPLATE,
} from '@/domains/problemManagement/types';
import { formatApiError } from '@/shared/api/errors';
import MarkdownPreview from '@/shared/ui/MarkdownPreview';

type ProblemForm = {
  displayOrder: string;
  divisionId: string;
  maxScore: string;
  memoryLimitMb: string;
  problemCode: string;
  problemId: string;
  statement: string;
  timeLimitMs: string;
  title: string;
};

const emptyProblemForm: ProblemForm = {
  displayOrder: '',
  divisionId: '',
  maxScore: '100',
  memoryLimitMb: '256',
  problemCode: '',
  problemId: '',
  statement: PROBLEM_STATEMENT_TEMPLATE,
  timeLimitMs: '1000',
  title: '',
};

function positiveInteger(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return `${label}은 1 이상의 정수로 입력해야 합니다.`;
  }
  return '';
}

function validateProblemForm(form: ProblemForm) {
  if (!form.divisionId || !form.problemCode.trim() || !form.title.trim()) {
    return '유형, 문제 번호, 제목은 반드시 입력해야 합니다.';
  }

  return (
    positiveInteger(form.timeLimitMs, '시간 제한') ||
    positiveInteger(form.memoryLimitMb, '메모리 제한') ||
    positiveInteger(form.maxScore, '배점') ||
    (form.displayOrder ? positiveInteger(form.displayOrder, '정렬 순서') : '')
  );
}

export default function OperatorProblemsPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate contestId={contestId} permission="contest.problem.view">
      {(session) =>
        contestId ? (
          <OperatorProblemsContent
            contestId={contestId}
            token={session.accessToken}
          />
        ) : (
          <PageLayout title={sharedUiText.contestSelectionRequiredTitle}>
            {sharedUiText.contestSelectionRequiredBody}
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorProblemsContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyProblemForm);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [packageScript, setPackageScript] = useState(TEST_SCRIPT_TEMPLATE);
  const [formError, setFormError] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const problemsQuery = useQuery({
    queryKey: ['operator', 'problems', contestId],
    queryFn: () => getOperatorProblems(contestId, token),
  });

  const problems = useMemo(
    () =>
      [...(problemsQuery.data ?? [])].sort(
        (a, b) =>
          (a.display_order ?? 0) - (b.display_order ?? 0) ||
          a.problem_code.localeCompare(b.problem_code, 'ko-KR', {
            numeric: true,
          }),
      ),
    [problemsQuery.data],
  );
  const divisions = dashboardQuery.data?.divisions ?? [];
  const effectiveSelectedProblemId =
    selectedProblemId || problems[0]?.problem_id || '';
  const selectedProblem = problems.find(
    (problem) => problem.problem_id === effectiveSelectedProblemId,
  );

  const assetsQuery = useQuery({
    enabled: Boolean(effectiveSelectedProblemId),
    queryKey: [
      'operator',
      'problem-assets',
      contestId,
      effectiveSelectedProblemId,
    ],
    queryFn: () =>
      getProblemAssets(contestId, effectiveSelectedProblemId, token),
  });
  const testcaseSetsQuery = useQuery({
    enabled: Boolean(effectiveSelectedProblemId),
    queryKey: [
      'operator',
      'problem-testcase-sets',
      contestId,
      effectiveSelectedProblemId,
    ],
    queryFn: () =>
      getProblemTestcaseSets(contestId, effectiveSelectedProblemId, token),
  });
  const packageStatusQuery = useQuery({
    enabled: Boolean(effectiveSelectedProblemId),
    queryKey: [
      'operator',
      'problem-package-status',
      contestId,
      effectiveSelectedProblemId,
    ],
    queryFn: () =>
      getProblemPackageStatus(contestId, effectiveSelectedProblemId, token),
  });

  const saveProblemMutation = useMutation({
    mutationFn: () => {
      const body = {
        display_order: form.displayOrder
          ? Number(form.displayOrder)
          : undefined,
        division_id: form.divisionId,
        max_score: Number(form.maxScore),
        memory_limit_mb: Number(form.memoryLimitMb),
        problem_code: form.problemCode.trim(),
        statement: form.statement,
        time_limit_ms: Number(form.timeLimitMs),
        title: form.title.trim(),
      };

      return form.problemId
        ? updateOperatorProblem(contestId, form.problemId, token, body)
        : createOperatorProblem(contestId, token, body);
    },
    onSuccess: (problem) => {
      setForm(emptyProblemForm);
      setSelectedProblemId(problem.problem_id);
      setFormError('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'problems', contestId],
      });
    },
  });

  const buildPackageMutation = useMutation({
    mutationFn: () =>
      buildProblemPackageRecipe(
        contestId,
        effectiveSelectedProblemId,
        token,
        packageScript,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          'operator',
          'problem-package-status',
          contestId,
          effectiveSelectedProblemId,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          'operator',
          'problem-testcase-sets',
          contestId,
          effectiveSelectedProblemId,
        ],
      });
    },
  });

  const uploadAssetMutation = useMutation({
    mutationFn: (file: File) =>
      uploadProblemAsset(contestId, effectiveSelectedProblemId, token, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          'operator',
          'problem-assets',
          contestId,
          effectiveSelectedProblemId,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          'operator',
          'problem-package-status',
          contestId,
          effectiveSelectedProblemId,
        ],
      });
    },
  });

  const uploadTestcaseZipMutation = useMutation({
    mutationFn: (file: File) =>
      createVerifiedTestcaseSetFromZip(
        contestId,
        effectiveSelectedProblemId,
        token,
        file,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          'operator',
          'problem-testcase-sets',
          contestId,
          effectiveSelectedProblemId,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          'operator',
          'problem-package-status',
          contestId,
          effectiveSelectedProblemId,
        ],
      });
    },
  });

  function editProblem(problem: Problem) {
    setSelectedProblemId(problem.problem_id);
    setForm({
      displayOrder: String(problem.display_order ?? ''),
      divisionId: problem.division_id ?? '',
      maxScore: String(problem.max_score ?? 100),
      memoryLimitMb: String(problem.memory_limit_mb),
      problemCode: problem.problem_code,
      problemId: problem.problem_id,
      statement: problem.statement,
      timeLimitMs: String(problem.time_limit_ms),
      title: problem.title,
    });
  }

  function submitProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateProblemForm(form);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
    saveProblemMutation.mutate();
  }

  return (
    <PageLayout
      description="문제 본문, 제한, 패키지 상태를 관리합니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 문제 관리`}
      width="7xl"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || problemsQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || problemsQuery.error}
          fallback="문제 데이터를 불러오지 못했습니다"
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.32fr)_minmax(0,1fr)_minmax(360px,0.42fr)]">
        <OperatorPanel
          description="문제를 선택하거나 수정 모드로 전환합니다."
          title="문제 목록"
        >
          <div className="grid gap-2">
            {problems.length > 0 ? (
              problems.map((problem) => (
                <button
                  className={[
                    'rounded border px-4 py-3 text-left transition',
                    effectiveSelectedProblemId === problem.problem_id
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50',
                  ].join(' ')}
                  key={problem.problem_id}
                  onClick={() => setSelectedProblemId(problem.problem_id)}
                  type="button"
                >
                  <strong className="font-black text-slate-950">
                    {problem.problem_code}. {problem.title}
                  </strong>
                  <span className="mt-1 block text-xs font-bold text-slate-500">
                    {problem.time_limit_ms}ms / {problem.memory_limit_mb}MB
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                등록된 문제가 없습니다.
              </p>
            )}
          </div>
        </OperatorPanel>

        <OperatorPanel
          actions={
            selectedProblem ? (
              <button
                className="rounded border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700"
                onClick={() => editProblem(selectedProblem)}
                type="button"
              >
                수정
              </button>
            ) : null
          }
          description="Markdown과 LaTeX 렌더링을 미리 확인합니다."
          title={
            selectedProblem
              ? `${selectedProblem.problem_code}. ${selectedProblem.title}`
              : '문제 미리보기'
          }
        >
          {selectedProblem ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                  시간 {selectedProblem.time_limit_ms}ms
                </span>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                  메모리 {selectedProblem.memory_limit_mb}MB
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  배점 {selectedProblem.max_score}
                </span>
                <Link
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"
                  to={`/contests/${contestId}/problems/${selectedProblem.problem_id}`}
                >
                  참가자 화면
                </Link>
              </div>
              <MarkdownPreview statement={selectedProblem.statement} />
            </>
          ) : (
            <p className="text-sm font-bold text-slate-500">
              문제를 선택하세요.
            </p>
          )}
        </OperatorPanel>

        <div className="grid gap-6">
          <OperatorPanel
            description="문제 기본 정보를 저장합니다."
            title={form.problemId ? '문제 수정' : '문제 생성'}
          >
            <form className="grid gap-3" onSubmit={submitProblem}>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                유형
                <select
                  className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      divisionId: event.target.value,
                    }))
                  }
                  value={form.divisionId}
                >
                  <option value="">유형 선택</option>
                  {divisions.map((division) => (
                    <option
                      key={division.division_id}
                      value={division.division_id}
                    >
                      {division.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput
                  label="문제 번호"
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, problemCode: value }))
                  }
                  value={form.problemCode}
                />
                <TextInput
                  label="제목"
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, title: value }))
                  }
                  value={form.title}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <TextInput
                  label="시간(ms)"
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, timeLimitMs: value }))
                  }
                  value={form.timeLimitMs}
                />
                <TextInput
                  label="메모리(MB)"
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, memoryLimitMb: value }))
                  }
                  value={form.memoryLimitMb}
                />
                <TextInput
                  label="배점"
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, maxScore: value }))
                  }
                  value={form.maxScore}
                />
              </div>
              <TextInput
                label="정렬 순서"
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, displayOrder: value }))
                }
                value={form.displayOrder}
              />
              <label className="grid gap-2 text-sm font-black text-slate-700">
                문제 본문
                <textarea
                  className="min-h-72 resize-y rounded border border-slate-200 px-3 py-3 font-mono text-xs leading-5 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      statement: event.target.value,
                    }))
                  }
                  value={form.statement}
                />
              </label>
              {formError || saveProblemMutation.error ? (
                <ErrorBox
                  error={saveProblemMutation.error}
                  fallback={formError || '문제 저장에 실패했습니다'}
                />
              ) : null}
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded bg-indigo-950 px-5 text-sm font-black text-white"
                type="submit"
              >
                <ProblemIcon />
                {form.problemId ? '문제 수정' : '문제 생성'}
              </button>
            </form>
          </OperatorPanel>

          <OperatorPanel
            description="패키지 준비 상태와 테스트케이스 세트를 확인합니다."
            title="패키지 상태"
          >
            {packageStatusQuery.data ? (
              <div className="grid gap-3">
                <p
                  className={[
                    'rounded border px-4 py-3 text-sm font-black',
                    packageStatusQuery.data.ready
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700',
                  ].join(' ')}
                >
                  {packageStatusQuery.data.ready
                    ? '패키지 준비 완료'
                    : '패키지 준비 필요'}
                </p>
                <p className="text-sm font-bold text-slate-600">
                  활성 테스트케이스{' '}
                  {packageStatusQuery.data.active_testcase_count}개, 세트{' '}
                  {packageStatusQuery.data.testcase_set_count}개
                </p>
              </div>
            ) : null}
            <div className="grid gap-2">
              {(assetsQuery.data ?? []).map((asset) => (
                <p
                  className="rounded border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                  key={asset.asset_id}
                >
                  {asset.original_filename}
                </p>
              ))}
              {(testcaseSetsQuery.data ?? []).map((set) => (
                <p
                  className="rounded border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                  key={set.testcase_set_id}
                >
                  v{set.version} {set.is_active ? '활성' : '비활성'} /{' '}
                  {set.testcases?.length ?? 0} cases
                </p>
              ))}
            </div>
            <div className="grid gap-3 rounded border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-sm font-black text-indigo-800">
                리소스 / 테스트케이스 업로드
              </p>
              <label className="grid gap-2 text-xs font-black text-slate-600">
                본문 이미지 리소스
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-xs font-bold text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-indigo-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                  disabled={
                    !effectiveSelectedProblemId || uploadAssetMutation.isPending
                  }
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) uploadAssetMutation.mutate(file);
                    event.currentTarget.value = '';
                  }}
                  type="file"
                />
              </label>
              <label className="grid gap-2 text-xs font-black text-slate-600">
                테스트케이스 ZIP
                <input
                  accept=".zip,application/zip"
                  className="block w-full text-xs font-bold text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-cyan-700 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                  disabled={
                    !effectiveSelectedProblemId ||
                    uploadTestcaseZipMutation.isPending
                  }
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) uploadTestcaseZipMutation.mutate(file);
                    event.currentTarget.value = '';
                  }}
                  type="file"
                />
              </label>
              {uploadAssetMutation.error || uploadTestcaseZipMutation.error ? (
                <ErrorBox
                  error={
                    uploadAssetMutation.error || uploadTestcaseZipMutation.error
                  }
                  fallback="파일 업로드에 실패했습니다"
                />
              ) : null}
            </div>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (effectiveSelectedProblemId) buildPackageMutation.mutate();
              }}
            >
              <textarea
                className="min-h-36 resize-y rounded border border-slate-200 px-3 py-3 font-mono text-xs leading-5 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) => setPackageScript(event.target.value)}
                value={packageScript}
              />
              {buildPackageMutation.error ? (
                <ErrorBox
                  error={buildPackageMutation.error}
                  fallback="패키지 빌드에 실패했습니다"
                />
              ) : null}
              <button
                className="h-10 rounded border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-300"
                disabled={!effectiveSelectedProblemId}
                type="submit"
              >
                패키지 빌드
              </button>
            </form>
          </OperatorPanel>
        </div>
      </div>
    </PageLayout>
  );
}

function TextInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
      {error ? formatApiError(error, fallback) : fallback}
    </p>
  );
}
