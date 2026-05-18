import { type FormEvent, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import {
  buildProblemPackageRecipe,
  createVerifiedTestcaseSetFromZip,
  deleteProblemTestcaseSet,
  createOperatorProblem,
  getOperatorProblems,
  getProblemAssets,
  getProblemPackageStatus,
  getProblemTestcaseSets,
  updateProblemTestcaseSet,
  uploadAndCreateMatchedTestcaseSet,
  updateOperatorProblem,
  uploadProblemAsset,
} from '@/domains/problemManagement/api';
import ProblemSubmitPanel from '@/components/contest/problem/ProblemSubmitPanel';
import ProblemStatementPanel from '@/components/contest/problem/ProblemStatementPanel';
import type { Problem } from '@/domains/problemManagement/types';
import {
  PROBLEM_STATEMENT_TEMPLATE,
  TEST_SCRIPT_TEMPLATE,
} from '@/domains/problemManagement/types';
import {
  createOperatorTestSubmission,
  waitOperatorTestSubmissionStatus,
} from '@/domains/submissionScoreboard/api';
import {
  submissionStatusLabel,
  isSubmissionPending,
} from '@/domains/submissionScoreboard/status';
import {
  loadLastJudgeLanguage,
  saveLastJudgeLanguage,
} from '@/domains/submissionScoreboard/languagePreference';
import type {
  JudgeLanguage,
  Submission,
} from '@/domains/submissionScoreboard/types';
import { formatApiError } from '@/shared/api/errors';

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

type ProblemEditorMode = 'create' | 'edit';

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

function problemFormFromProblem(problem: Problem): ProblemForm {
  return {
    displayOrder: String(problem.display_order ?? ''),
    divisionId: problem.division_id ?? '',
    maxScore: String(problem.max_score ?? 100),
    memoryLimitMb: String(problem.memory_limit_mb),
    problemCode: problem.problem_code,
    problemId: problem.problem_id,
    statement: problem.statement,
    timeLimitMs: String(problem.time_limit_ms),
    title: problem.title,
  };
}

function positiveNumberOrFallback(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function previewProblemFromForm(
  form: ProblemForm,
  selectedProblem?: Problem,
): Problem {
  const displayOrder = form.displayOrder
    ? positiveNumberOrFallback(
        form.displayOrder,
        selectedProblem?.display_order ?? 1,
      )
    : selectedProblem?.display_order;

  return {
    display_order: displayOrder,
    division_id: form.divisionId || selectedProblem?.division_id,
    max_score: positiveNumberOrFallback(
      form.maxScore,
      selectedProblem?.max_score ?? 100,
    ),
    memory_limit_mb: positiveNumberOrFallback(
      form.memoryLimitMb,
      selectedProblem?.memory_limit_mb ?? 256,
    ),
    problem_code:
      form.problemCode.trim() || selectedProblem?.problem_code || 'Preview',
    problem_id: form.problemId || selectedProblem?.problem_id || 'preview',
    statement:
      form.statement.trim() ||
      selectedProblem?.statement ||
      PROBLEM_STATEMENT_TEMPLATE,
    time_limit_ms: positiveNumberOrFallback(
      form.timeLimitMs,
      selectedProblem?.time_limit_ms ?? 1000,
    ),
    title: form.title.trim() || selectedProblem?.title || '문제 미리보기',
  };
}

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
  const queryIdentity = tokenQueryIdentity(token);
  const queryClient = useQueryClient();
  const [editorMode, setEditorMode] = useState<ProblemEditorMode>('create');
  const [form, setForm] = useState(emptyProblemForm);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [isProblemPickerOpen, setIsProblemPickerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [packageScript, setPackageScript] = useState(TEST_SCRIPT_TEMPLATE);
  const [testLanguage, setTestLanguage] = useState<JudgeLanguage>(() =>
    loadLastJudgeLanguage(),
  );
  const [testSourceCode, setTestSourceCode] = useState('');
  const [testSubmission, setTestSubmission] = useState<Submission | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const problemsQuery = useQuery({
    queryKey: ['operator', 'problems', contestId, queryIdentity],
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
  const effectiveSelectedProblemId = selectedProblemId;
  const selectedProblem = problems.find(
    (problem) => problem.problem_id === effectiveSelectedProblemId,
  );
  const previewProblem = useMemo(
    () => previewProblemFromForm(form, selectedProblem),
    [form, selectedProblem],
  );

  const assetsQuery = useQuery({
    enabled: Boolean(effectiveSelectedProblemId),
    queryKey: [
      'operator',
      'problem-assets',
      contestId,
      effectiveSelectedProblemId,
      queryIdentity,
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
      queryIdentity,
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
      queryIdentity,
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
      setEditorMode('edit');
      setSelectedProblemId(problem.problem_id);
      setForm(problemFormFromProblem(problem));
      setTestSubmission(null);
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

  const uploadRoleFileMutation = useMutation({
    mutationFn: ({ file, role }: { file: File; role: string }) =>
      uploadProblemAsset(
        contestId,
        effectiveSelectedProblemId,
        token,
        file,
        `problems/${effectiveSelectedProblemId}/support/${role}`,
      ),
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

  const uploadMatchedTestcasesMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadAndCreateMatchedTestcaseSet(
        contestId,
        effectiveSelectedProblemId,
        token,
        files,
        (progress) => {
          const filename = progress.filename ? ` · ${progress.filename}` : '';
          setUploadProgress(
            `${progress.phase} ${progress.current}/${progress.total}${filename}`,
          );
        },
      ),
    onSuccess: (result) => {
      setUploadProgress(
        result.warnings.length
          ? `검증 완료: ${result.verified_count}건, 경고 ${result.warnings.length}건`
          : `검증 완료: ${result.verified_count}건`,
      );
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

  const updateTestcaseSetMutation = useMutation({
    mutationFn: ({
      isActive,
      testcaseSetId,
    }: {
      isActive: boolean;
      testcaseSetId: string;
    }) =>
      updateProblemTestcaseSet(
        contestId,
        effectiveSelectedProblemId,
        testcaseSetId,
        token,
        { is_active: isActive },
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

  const deleteTestcaseSetMutation = useMutation({
    mutationFn: (testcaseSetId: string) =>
      deleteProblemTestcaseSet(
        contestId,
        effectiveSelectedProblemId,
        testcaseSetId,
        token,
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

  const testSubmissionMutation = useMutation({
    mutationFn: async () => {
      const submitted = await createOperatorTestSubmission(
        contestId,
        effectiveSelectedProblemId,
        token,
        {
          language: testLanguage,
          source_code: testSourceCode,
        },
      );

      if (isSubmissionPending(submitted.status)) {
        return waitOperatorTestSubmissionStatus(
          contestId,
          submitted.submission_id,
          token,
        );
      }

      return submitted;
    },
    onSuccess: (submission) => {
      setTestSubmission(submission);
    },
  });

  function editProblem(problem: Problem) {
    setEditorMode('edit');
    setSelectedProblemId(problem.problem_id);
    setForm(problemFormFromProblem(problem));
    setTestSubmission(null);
    setFormError('');
  }

  function startCreateMode() {
    setEditorMode('create');
    setForm(emptyProblemForm);
    setTestSubmission(null);
    setFormError('');
  }

  function startEditMode() {
    setEditorMode('edit');
    setFormError('');
    setIsProblemPickerOpen(true);
  }

  function selectProblemForEdit(problem: Problem) {
    editProblem(problem);
    setIsProblemPickerOpen(false);
  }

  function submitProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editorMode === 'edit' && !form.problemId) {
      setFormError('수정할 문제를 먼저 가져와 주세요.');
      return;
    }
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

      <div className="grid gap-6">
        <OperatorPanel
          actions={
            <>
              <span className="inline-flex rounded border border-slate-200 bg-slate-50 p-1">
                <button
                  className={[
                    'h-9 rounded px-4 text-xs font-black transition',
                    editorMode === 'create'
                      ? 'bg-indigo-950 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-indigo-700',
                  ].join(' ')}
                  onClick={startCreateMode}
                  type="button"
                >
                  문제 생성
                </button>
                <button
                  className={[
                    'h-9 rounded px-4 text-xs font-black transition',
                    editorMode === 'edit'
                      ? 'bg-indigo-950 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-indigo-700',
                  ].join(' ')}
                  onClick={startEditMode}
                  type="button"
                >
                  문제 수정
                </button>
              </span>
              {editorMode === 'edit' ? (
                <button
                  className="h-10 rounded border border-indigo-200 bg-white px-4 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
                  onClick={() => setIsProblemPickerOpen(true)}
                  type="button"
                >
                  문제 변경
                </button>
              ) : null}
              <button
                className="h-10 rounded border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => setIsPreviewOpen(true)}
                type="button"
              >
                프리뷰
              </button>
            </>
          }
          description={
            editorMode === 'edit'
              ? '문제 목록 모달에서 가져온 문제를 수정합니다.'
              : '새 문제의 기본 정보와 본문을 작성합니다.'
          }
          title={editorMode === 'edit' ? '문제 수정' : '문제 생성'}
        >
          {editorMode === 'edit' && !form.problemId ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              수정할 문제를 목록에서 가져와 주세요.
            </p>
          ) : null}
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-indigo-950 px-5 text-sm font-black text-white disabled:bg-slate-300"
              disabled={editorMode === 'edit' && !form.problemId}
              type="submit"
            >
              <ProblemIcon />
              {editorMode === 'edit' ? '문제 수정' : '문제 생성'}
            </button>
          </form>
        </OperatorPanel>

        <OperatorPanel
          description={
            selectedProblem
              ? `${selectedProblem.problem_code}. ${selectedProblem.title} 패키지 상태입니다.`
              : '문제를 생성하거나 수정할 문제를 가져오면 패키지를 관리할 수 있습니다.'
          }
          title="패키지 상태"
        >
          {!effectiveSelectedProblemId ? (
            <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
              패키지 상태를 확인할 문제를 먼저 선택해 주세요.
            </p>
          ) : (
            <>
              {packageStatusQuery.isLoading ? (
                <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  패키지 상태를 불러오는 중입니다.
                </p>
              ) : null}
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
                  <div className="grid gap-2">
                    {packageStatusQuery.data.support_files.map((file) => (
                      <label
                        className="grid gap-2 rounded border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-600"
                        key={file.role}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>
                            {file.label}
                            {file.required ? ' *' : ''}
                          </span>
                          <span
                            className={
                              file.status === 'ready'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }
                          >
                            {file.count}개
                          </span>
                        </span>
                        <input
                          className="block w-full text-xs font-bold text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                          disabled={
                            !effectiveSelectedProblemId ||
                            uploadRoleFileMutation.isPending
                          }
                          onChange={(event) => {
                            const fileObject = event.currentTarget.files?.[0];
                            if (fileObject) {
                              uploadRoleFileMutation.mutate({
                                file: fileObject,
                                role: file.role,
                              });
                            }
                            event.currentTarget.value = '';
                          }}
                          type="file"
                        />
                      </label>
                    ))}
                  </div>
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
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                    key={set.testcase_set_id}
                  >
                    <span>
                      v{set.version} {set.is_active ? '활성' : '비활성'} /{' '}
                      {set.testcases?.length ?? 0} cases
                    </span>
                    <span className="flex gap-2">
                      {!set.is_active ? (
                        <button
                          className="rounded border border-emerald-200 px-2 py-1 font-black text-emerald-700"
                          onClick={() =>
                            updateTestcaseSetMutation.mutate({
                              isActive: true,
                              testcaseSetId: set.testcase_set_id,
                            })
                          }
                          type="button"
                        >
                          활성화
                        </button>
                      ) : null}
                      <button
                        className="rounded border border-rose-200 px-2 py-1 font-black text-rose-600"
                        onClick={() => {
                          if (
                            window.confirm('테스트케이스 세트를 삭제할까요?')
                          ) {
                            deleteTestcaseSetMutation.mutate(
                              set.testcase_set_id,
                            );
                          }
                        }}
                        type="button"
                      >
                        삭제
                      </button>
                    </span>
                  </div>
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
                      !effectiveSelectedProblemId ||
                      uploadAssetMutation.isPending
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
                <label className="grid gap-2 text-xs font-black text-slate-600">
                  .in/.out 파일 묶음
                  <input
                    accept=".in,.out,text/plain"
                    className="block w-full text-xs font-bold text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                    disabled={
                      !effectiveSelectedProblemId ||
                      uploadMatchedTestcasesMutation.isPending
                    }
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.currentTarget.files ?? []);
                      if (files.length)
                        uploadMatchedTestcasesMutation.mutate(files);
                      event.currentTarget.value = '';
                    }}
                    type="file"
                  />
                </label>
                {uploadProgress ? (
                  <p className="text-xs font-bold text-slate-600">
                    {uploadProgress}
                  </p>
                ) : null}
                {uploadAssetMutation.error ||
                uploadTestcaseZipMutation.error ||
                uploadRoleFileMutation.error ||
                uploadMatchedTestcasesMutation.error ||
                updateTestcaseSetMutation.error ||
                deleteTestcaseSetMutation.error ? (
                  <ErrorBox
                    error={
                      uploadAssetMutation.error ||
                      uploadTestcaseZipMutation.error ||
                      uploadRoleFileMutation.error ||
                      uploadMatchedTestcasesMutation.error ||
                      updateTestcaseSetMutation.error ||
                      deleteTestcaseSetMutation.error
                    }
                    fallback="문제 리소스 또는 테스트케이스 처리에 실패했습니다"
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
                  className="h-10 rounded border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-700 disabled:text-slate-300"
                  disabled={!effectiveSelectedProblemId}
                  type="submit"
                >
                  패키지 빌드
                </button>
              </form>
            </>
          )}
        </OperatorPanel>
      </div>

      {isProblemPickerOpen ? (
        <ProblemPickerModal
          onClose={() => setIsProblemPickerOpen(false)}
          onSelect={selectProblemForEdit}
          problems={problems}
          selectedProblemId={selectedProblemId}
        />
      ) : null}

      {isPreviewOpen ? (
        <ProblemPreviewModal
          canSubmit={Boolean(form.problemId)}
          isSubmitting={testSubmissionMutation.isPending}
          message={
            !form.problemId
              ? '테스트 제출은 저장된 문제를 수정 모드로 가져온 뒤 사용할 수 있습니다.'
              : testSubmission
                ? `결과: ${submissionStatusLabel(testSubmission.status)}${
                    testSubmission.awarded_score !== null
                      ? ` / ${testSubmission.awarded_score}점`
                      : ''
                  }`
                : testSubmissionMutation.error
                  ? formatApiError(
                      testSubmissionMutation.error,
                      '테스트 제출에 실패했습니다',
                    )
                  : '패키지 빌드 후 정답/오답 코드를 빠르게 검증할 수 있습니다.'
          }
          messageStatus={
            !form.problemId
              ? 'idle'
              : testSubmissionMutation.isPending
                ? 'loading'
                : testSubmissionMutation.error
                  ? 'error'
                  : testSubmission
                    ? 'ready'
                    : 'idle'
          }
          onClose={() => setIsPreviewOpen(false)}
          onLanguageChange={(language) => {
            setTestLanguage(language);
            saveLastJudgeLanguage(language);
          }}
          onSourceCodeChange={setTestSourceCode}
          onSubmit={() => testSubmissionMutation.mutate()}
          problem={previewProblem}
          sourceCode={testSourceCode}
          testLanguage={testLanguage}
        />
      ) : null}
    </PageLayout>
  );
}

function ProblemPickerModal({
  onClose,
  onSelect,
  problems,
  selectedProblemId,
}: {
  onClose: () => void;
  onSelect: (problem: Problem) => void;
  problems: Problem[];
  selectedProblemId: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      role="dialog"
    >
      <section className="grid max-h-[86vh] w-full max-w-3xl gap-5 overflow-hidden rounded border border-slate-200 bg-white p-6 shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="text-xl font-black text-slate-950">
              수정할 문제 가져오기
            </h2>
            <p className="text-sm font-medium text-slate-500">
              목록에서 문제를 선택하면 수정 양식으로 불러옵니다.
            </p>
          </div>
          <button
            className="h-10 rounded border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </header>

        <div className="grid gap-2 overflow-y-auto pr-1">
          {problems.length > 0 ? (
            problems.map((problem) => (
              <button
                className={[
                  'grid gap-1 rounded border px-4 py-3 text-left transition',
                  selectedProblemId === problem.problem_id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50',
                ].join(' ')}
                key={problem.problem_id}
                onClick={() => onSelect(problem)}
                type="button"
              >
                <span className="font-black text-slate-950">
                  {problem.problem_code}. {problem.title}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {problem.time_limit_ms}ms / {problem.memory_limit_mb}MB /{' '}
                  {problem.max_score}점
                </span>
              </button>
            ))
          ) : (
            <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
              가져올 문제가 없습니다.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ProblemPreviewModal({
  canSubmit,
  isSubmitting,
  message,
  messageStatus,
  onClose,
  onLanguageChange,
  onSourceCodeChange,
  onSubmit,
  problem,
  sourceCode,
  testLanguage,
}: {
  canSubmit: boolean;
  isSubmitting: boolean;
  message: string;
  messageStatus: 'idle' | 'loading' | 'ready' | 'error';
  onClose: () => void;
  onLanguageChange: (language: JudgeLanguage) => void;
  onSourceCodeChange: (sourceCode: string) => void;
  onSubmit: () => void;
  problem: Problem;
  sourceCode: string;
  testLanguage: JudgeLanguage;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 p-3 sm:p-6"
      role="dialog"
    >
      <section className="mx-auto flex h-full max-h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black tracking-normal text-indigo-600 uppercase">
              Preview
            </p>
            <h2 className="text-xl font-black text-slate-950">
              {problem.problem_code}. {problem.title}
            </h2>
          </div>
          <button
            className="h-10 rounded border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="min-h-0 overflow-y-auto">
            <ProblemStatementPanel problem={problem} />
          </div>
          <div className="min-h-0 overflow-y-auto border-t border-slate-200 lg:border-t-0 lg:border-l">
            <ProblemSubmitPanel
              canSubmit={canSubmit}
              editorHeight={360}
              isSubmitting={isSubmitting}
              language={testLanguage}
              layout="standalone"
              message={message}
              messageStatus={messageStatus}
              onLanguageChange={onLanguageChange}
              onSourceCodeChange={onSourceCodeChange}
              onSubmit={onSubmit}
              sourceCode={sourceCode}
            />
          </div>
        </div>
      </section>
    </div>
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
