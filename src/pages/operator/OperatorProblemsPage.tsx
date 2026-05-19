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
  deleteProblemTestcaseSet,
  createOperatorProblem,
  getStorageObjectText,
  getOperatorProblems,
  getProblemAssets,
  getProblemPackageStatus,
  getProblemTestcaseSets,
  uploadAndCreateMatchedTestcaseSet,
  updateOperatorProblem,
  uploadProblemAsset,
} from '@/domains/problemManagement/api';
import {
  parseProblemDocument,
  serializeProblemDocument,
} from '@/domains/problemManagement/document';
import ProblemSubmitPanel from '@/components/contest/problem/ProblemSubmitPanel';
import ProblemStatementPanel from '@/components/contest/problem/ProblemStatementPanel';
import type {
  Problem,
  ProblemAsset,
  TestcaseSet,
} from '@/domains/problemManagement/types';
import { PROBLEM_STATEMENT_TEMPLATE } from '@/domains/problemManagement/types';
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
  examples: { input: string; note?: string; output: string }[];
  inputDescription: string;
  memoryLimitMb: string;
  note: string;
  outputDescription: string;
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
  examples: [],
  inputDescription: '',
  memoryLimitMb: '256',
  note: '',
  outputDescription: '',
  problemCode: '',
  problemId: '',
  statement: PROBLEM_STATEMENT_TEMPLATE,
  timeLimitMs: '1000',
  title: '',
};

function problemFormFromProblem(problem: Problem): ProblemForm {
  const document = parseProblemDocument(problem.statement);

  return {
    displayOrder: String(problem.display_order ?? ''),
    divisionId: problem.division_id ?? '',
    examples: document.examples,
    inputDescription: document.inputDescription,
    memoryLimitMb: String(problem.memory_limit_mb),
    note: document.note,
    outputDescription: document.outputDescription,
    problemCode: problem.problem_code,
    problemId: problem.problem_id,
    statement: document.statement,
    timeLimitMs: String(problem.time_limit_ms),
    title: problem.title,
  };
}

function problemStatementFromForm(form: ProblemForm) {
  return serializeProblemDocument({
    examples: form.examples.filter(
      (example) => example.input.trim() || example.output.trim(),
    ),
    inputDescription: form.inputDescription,
    note: form.note,
    outputDescription: form.outputDescription,
    statement: form.statement,
  });
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
    memory_limit_mb: positiveNumberOrFallback(
      form.memoryLimitMb,
      selectedProblem?.memory_limit_mb ?? 256,
    ),
    problem_code:
      form.problemCode.trim() || selectedProblem?.problem_code || 'Preview',
    problem_id: form.problemId || selectedProblem?.problem_id || 'preview',
    statement:
      problemStatementFromForm(form).trim() ||
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
    (form.displayOrder ? positiveInteger(form.displayOrder, '정렬 순서') : '')
  );
}

function storageFileName(storageKey: string) {
  return decodeURIComponent(storageKey.split('/').pop() ?? storageKey);
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
  const [authoringTab, setAuthoringTab] = useState<
    'settings' | 'statement' | 'tests' | 'preview'
  >('settings');
  const [form, setForm] = useState(emptyProblemForm);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestcaseModalOpen, setIsTestcaseModalOpen] = useState(false);
  const [isCaseDropActive, setIsCaseDropActive] = useState(false);
  const [testcaseFilePreview, setTestcaseFilePreview] = useState<{
    storageKey: string;
    title: string;
  } | null>(null);
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
  const activeDivisionId =
    (filterDivisionId &&
    divisions.some((division) => division.division_id === filterDivisionId)
      ? filterDivisionId
      : divisions[0]?.division_id) ?? '';
  const filteredProblems = activeDivisionId
    ? problems.filter((problem) => problem.division_id === activeDivisionId)
    : problems;
  const effectiveSelectedProblemId = selectedProblemId;
  const selectedProblem = problems.find(
    (problem) => problem.problem_id === effectiveSelectedProblemId,
  );
  const previewProblem = useMemo(
    () => previewProblemFromForm(form, selectedProblem),
    [form, selectedProblem],
  );

  const assetsQuery = useQuery({
    enabled:
      Boolean(effectiveSelectedProblemId) &&
      (authoringTab === 'statement' || isPreviewOpen),
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
    enabled: Boolean(effectiveSelectedProblemId) && authoringTab === 'tests',
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
    enabled: Boolean(effectiveSelectedProblemId) && authoringTab === 'tests',
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
  const latestTestcaseSet = useMemo(() => {
    const sets = testcaseSetsQuery.data ?? [];
    return (
      sets.find((set) => set.is_active) ??
      [...sets].sort((a, b) => b.version - a.version)[0] ??
      null
    );
  }, [testcaseSetsQuery.data]);
  const imageAssets = useMemo(
    () =>
      (assetsQuery.data ?? []).filter(
        (asset) =>
          asset.mime_type.startsWith('image/') ||
          asset.storage_key.includes('/assets/'),
      ),
    [assetsQuery.data],
  );
  const testcaseFileQuery = useQuery({
    enabled: Boolean(testcaseFilePreview?.storageKey),
    queryKey: [
      'operator',
      'testcase-file',
      testcaseFilePreview?.storageKey ?? '',
    ],
    queryFn: () => getStorageObjectText(testcaseFilePreview!.storageKey),
  });

  const saveProblemMutation = useMutation({
    mutationFn: () => {
      const body = {
        display_order: form.displayOrder
          ? Number(form.displayOrder)
          : undefined,
        division_id: form.divisionId,
        memory_limit_mb: Number(form.memoryLimitMb),
        problem_code: form.problemCode.trim(),
        statement: problemStatementFromForm(form),
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
    setAuthoringTab('statement');
    setSelectedProblemId(problem.problem_id);
    setForm(problemFormFromProblem(problem));
    setTestSubmission(null);
    setFormError('');
  }

  function startCreateMode() {
    setEditorMode('create');
    setAuthoringTab('settings');
    setSelectedProblemId('');
    setForm({
      ...emptyProblemForm,
      divisionId: activeDivisionId,
    });
    setTestSubmission(null);
    setFormError('');
  }

  function addExample() {
    setForm((prev) => ({
      ...prev,
      examples: [...prev.examples, { input: '', output: '', note: '' }],
    }));
  }

  function updateExample(
    index: number,
    values: Partial<{ input: string; note: string; output: string }>,
  ) {
    setForm((prev) => ({
      ...prev,
      examples: prev.examples.map((example, exampleIndex) =>
        exampleIndex === index ? { ...example, ...values } : example,
      ),
    }));
  }

  function removeExample(index: number) {
    setForm((prev) => ({
      ...prev,
      examples: prev.examples.filter((_, exampleIndex) => exampleIndex !== index),
    }));
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

  function handleMatchedFiles(files: File[]) {
    const testcaseFiles = files.filter((file) => /\.(in|out)$/i.test(file.name));
    if (!testcaseFiles.length) {
      setUploadProgress('.in 또는 .out 파일을 선택해 주세요.');
      return;
    }
    uploadMatchedTestcasesMutation.mutate(testcaseFiles);
  }

  return (
    <PageLayout
      description="문제 본문, 예제, 채점 파일, 테스트케이스를 관리합니다."
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

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="grid content-start gap-4 rounded border border-slate-200 bg-white p-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-indigo-600 uppercase">
                문제 목록
              </p>
              <h2 className="text-base font-black text-slate-950">
                {filteredProblems.length}개
              </h2>
            </div>
            <button
              className="rounded border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700"
              onClick={startCreateMode}
              type="button"
            >
              새 문제
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1">
            {divisions.map((division) => (
              <button
                className={[
                  'h-8 shrink-0 rounded-full px-4 text-xs font-black transition',
                  activeDivisionId === division.division_id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900',
                ].join(' ')}
                key={division.division_id}
                onClick={() => setFilterDivisionId(division.division_id)}
                type="button"
              >
                {division.name}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
            {filteredProblems.map((problem) => (
              <button
                className={[
                  'grid gap-1 rounded border px-3 py-3 text-left transition',
                  selectedProblemId === problem.problem_id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50',
                ].join(' ')}
                key={problem.problem_id}
                onClick={() => editProblem(problem)}
                type="button"
              >
                <span className="font-black text-slate-950">
                  {problem.problem_code}. {problem.title}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {problem.time_limit_ms}ms / {problem.memory_limit_mb}MB
                </span>
              </button>
            ))}
            {!filteredProblems.length ? (
              <p className="rounded border border-dashed border-slate-200 px-3 py-8 text-center text-sm font-bold text-slate-500">
                등록된 문제가 없습니다.
              </p>
            ) : null}
          </div>
        </aside>
        <div className="grid gap-6">
        <OperatorPanel
          description={
            editorMode === 'edit'
              ? '왼쪽 목록에서 선택한 문제를 수정합니다.'
              : '새 문제의 기본 정보와 본문을 작성합니다.'
          }
          title={editorMode === 'edit' ? '문제 수정' : '문제 생성'}
        >
          {editorMode === 'edit' && !form.problemId ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              수정할 문제를 목록에서 가져와 주세요.
            </p>
          ) : null}
          <div className="grid gap-2 md:grid-cols-4">
            {[
              ['settings', '기본 정보'],
              ['statement', '문제/예제'],
              ['tests', '테스트케이스'],
              ['preview', '전체 미리보기'],
            ].map(([value, label]) => (
              <button
                className={[
                  'rounded border px-4 py-3 text-sm font-black transition',
                  authoringTab === value
                    ? 'border-indigo-300 bg-indigo-950 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50',
                ].join(' ')}
                key={value}
                onClick={() => {
                  if (value === 'preview') {
                    setIsPreviewOpen(true);
                    return;
                  }
                  setAuthoringTab(value as typeof authoringTab);
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <form className="grid gap-3" onSubmit={submitProblem}>
            {authoringTab === 'settings' ? (
              <>
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
            <div className="grid gap-3 md:grid-cols-2">
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
            </div>
            <TextInput
              label="정렬 순서"
              onChange={(value) =>
                setForm((prev) => ({ ...prev, displayOrder: value }))
              }
              value={form.displayOrder}
            />
              </>
            ) : null}
            {authoringTab === 'statement' ? (
              <>
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
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                입력 설명
                <textarea
                  className="min-h-28 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      inputDescription: event.target.value,
                    }))
                  }
                  value={form.inputDescription}
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                출력 설명
                <textarea
                  className="min-h-28 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      outputDescription: event.target.value,
                    }))
                  }
                  value={form.outputDescription}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              노트
              <textarea
                className="min-h-24 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, note: event.target.value }))
                }
                value={form.note}
              />
            </label>
            <div className="grid gap-3 rounded border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-800">예제</p>
                  <p className="text-xs font-bold text-slate-500">
                    예제 입력, 출력, 설명을 여러 개 관리합니다.
                  </p>
                </div>
                <button
                  className="rounded border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700"
                  onClick={addExample}
                  type="button"
                >
                  예제 추가
                </button>
              </div>
              {form.examples.map((example, index) => (
                <section
                  className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3"
                  key={index}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm font-black text-slate-950">
                      예제 {index + 1}
                    </strong>
                    <button
                      className="rounded border border-rose-200 px-3 py-2 text-xs font-black text-rose-600"
                      onClick={() => removeExample(index)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                예제 입력
                <textarea
                  className="min-h-28 resize-y rounded border border-slate-200 px-3 py-3 font-mono text-xs leading-5 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    updateExample(index, { input: event.target.value })
                  }
                  value={example.input}
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                예제 출력
                <textarea
                  className="min-h-28 resize-y rounded border border-slate-200 px-3 py-3 font-mono text-xs leading-5 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    updateExample(index, { output: event.target.value })
                  }
                  value={example.output}
                />
              </label>
                  </div>
                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    예제 설명
                    <textarea
                      className="min-h-20 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                      onChange={(event) =>
                        updateExample(index, { note: event.target.value })
                      }
                      value={example.note ?? ''}
                    />
                  </label>
                </section>
              ))}
              {!form.examples.length ? (
                <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                  등록된 예제가 없습니다.
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 rounded border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="grid gap-1">
                <p className="text-sm font-black text-indigo-800">
                  문제/예제 이미지
                </p>
                <p className="text-xs font-bold text-slate-600">
                  본문이나 예제 설명에 사용할 이미지를 업로드합니다.
                </p>
              </div>
              <label className="inline-flex h-10 w-fit cursor-pointer items-center rounded bg-indigo-950 px-4 text-xs font-black text-white transition hover:bg-indigo-800">
                이미지 선택
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
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
              <div className="grid gap-2">
                {imageAssets.map((asset) => (
                  <p
                    className="rounded border border-indigo-100 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                    key={asset.asset_id}
                  >
                    {asset.original_filename}
                  </p>
                ))}
                {effectiveSelectedProblemId &&
                !assetsQuery.isLoading &&
                !imageAssets.length ? (
                  <p className="rounded border border-dashed border-indigo-100 bg-white/60 px-3 py-5 text-center text-xs font-bold text-slate-500">
                    업로드된 이미지가 없습니다.
                  </p>
                ) : null}
              </div>
              {uploadAssetMutation.error ? (
                <ErrorBox
                  error={uploadAssetMutation.error}
                  fallback="이미지 업로드에 실패했습니다"
                />
              ) : null}
            </div>
              </>
            ) : null}
            {authoringTab === 'tests' ? (
              <p className="rounded border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
                아래 영역에서 채점 보조 파일과 .in/.out 테스트케이스를 관리합니다.
              </p>
            ) : null}
            {formError || saveProblemMutation.error ? (
              <ErrorBox
                error={saveProblemMutation.error}
                fallback={formError || '문제 저장에 실패했습니다'}
              />
            ) : null}
            {authoringTab !== 'tests' ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded bg-indigo-950 px-5 text-sm font-black text-white disabled:bg-slate-300"
                disabled={editorMode === 'edit' && !form.problemId}
                type="submit"
              >
                <ProblemIcon />
                {editorMode === 'edit' ? '문제 수정' : '문제 생성'}
              </button>
            ) : null}
          </form>
        </OperatorPanel>

        {authoringTab === 'tests' ? (
        <OperatorPanel
          description={
            selectedProblem
              ? `${selectedProblem.problem_code}. ${selectedProblem.title} 채점 파일입니다.`
              : '문제를 생성하거나 왼쪽 목록에서 선택하면 채점 파일을 관리할 수 있습니다.'
          }
          title="채점 파일과 테스트케이스"
        >
          {!effectiveSelectedProblemId ? (
            <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
              채점 파일을 확인할 문제를 먼저 선택해 주세요.
            </p>
          ) : (
            <>
              {packageStatusQuery.isLoading ? (
                <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  채점 파일 상태를 불러오는 중입니다.
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
                      ? '채점 준비 완료'
                      : '채점 파일 확인 필요'}
                  </p>
                  <div className="grid gap-2">
                    {packageStatusQuery.data.support_files.map((file) => (
                      <div
                        className="grid gap-3 rounded border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-600 sm:grid-cols-[minmax(0,1fr)_auto]"
                        key={file.role}
                      >
                        <span className="grid min-w-0 gap-1">
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
                            {file.latest_filename ?? `${file.count}개`}
                          </span>
                        </span>
                        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded border border-slate-200 bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800">
                          파일 선택
                          <input
                            className="sr-only"
                            disabled={
                              !effectiveSelectedProblemId ||
                              uploadRoleFileMutation.isPending
                            }
                            onChange={(event) => {
                              const fileObject =
                                event.currentTarget.files?.[0];
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
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2">
                {latestTestcaseSet ? (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600"
                    key={latestTestcaseSet.testcase_set_id}
                  >
                    <button
                      className="text-left font-black text-indigo-700 hover:text-indigo-950"
                      onClick={() => setIsTestcaseModalOpen(true)}
                      type="button"
                    >
                      현재 테스트케이스{' '}
                      {latestTestcaseSet.testcases?.length ?? 0}개 보기
                    </button>
                    <button
                      className="rounded border border-rose-200 px-3 py-2 font-black text-rose-600"
                      onClick={() => {
                        if (window.confirm('현재 테스트케이스를 삭제할까요?')) {
                          deleteTestcaseSetMutation.mutate(
                            latestTestcaseSet.testcase_set_id,
                          );
                        }
                      }}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                ) : (
                  <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                    업로드된 테스트케이스가 없습니다.
                  </p>
                )}
              </div>
              <div className="grid gap-3 rounded border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-sm font-black text-indigo-800">
                  .in/.out 파일 묶음
                </p>
                <div
                  className={[
                    'grid gap-3 rounded border border-dashed px-4 py-6 text-center transition',
                    isCaseDropActive
                      ? 'border-indigo-400 bg-white'
                      : 'border-indigo-200 bg-white/70',
                  ].join(' ')}
                  onDragLeave={() => setIsCaseDropActive(false)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsCaseDropActive(true);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsCaseDropActive(false);
                    handleMatchedFiles(Array.from(event.dataTransfer.files));
                  }}
                >
                  <p className="text-sm font-black text-slate-800">
                    .in/.out 파일을 이 영역에 드롭
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    같은 파일명 기준으로 입력과 출력을 짝지어 한 번에 반영합니다.
                  </p>
                  <label className="mx-auto inline-flex h-10 cursor-pointer items-center rounded bg-emerald-700 px-4 text-xs font-black text-white transition hover:bg-emerald-800">
                    파일 선택
                    <input
                      accept=".in,.out,text/plain"
                      className="sr-only"
                      disabled={
                        !effectiveSelectedProblemId ||
                        uploadMatchedTestcasesMutation.isPending
                      }
                      multiple
                      onChange={(event) => {
                        handleMatchedFiles(
                          Array.from(event.currentTarget.files ?? []),
                        );
                        event.currentTarget.value = '';
                      }}
                      type="file"
                    />
                  </label>
                </div>
                {uploadProgress ? (
                  <p className="text-xs font-bold text-slate-600">
                    {uploadProgress}
                  </p>
                ) : null}
                {uploadRoleFileMutation.error ||
                uploadMatchedTestcasesMutation.error ||
                deleteTestcaseSetMutation.error ? (
                  <ErrorBox
                    error={
                      uploadRoleFileMutation.error ||
                      uploadMatchedTestcasesMutation.error ||
                      deleteTestcaseSetMutation.error
                    }
                    fallback="채점 파일 또는 테스트케이스 처리에 실패했습니다"
                  />
                ) : null}
              </div>
            </>
          )}
        </OperatorPanel>
        ) : null}
        </div>
      </div>

      {isTestcaseModalOpen && latestTestcaseSet ? (
        <TestcaseSetModal
          fileError={testcaseFileQuery.error}
          filePreview={testcaseFilePreview}
          fileText={testcaseFileQuery.data}
          isFileLoading={testcaseFileQuery.isLoading}
          onClose={() => {
            setIsTestcaseModalOpen(false);
            setTestcaseFilePreview(null);
          }}
          onSelectFile={setTestcaseFilePreview}
          testcaseSet={latestTestcaseSet}
        />
      ) : null}

      {isPreviewOpen ? (
        <ProblemPreviewModal
          assets={imageAssets}
          canSubmit={Boolean(form.problemId)}
          isSubmitting={testSubmissionMutation.isPending}
          message={
            !form.problemId
              ? '테스트 제출은 저장된 문제를 수정 모드로 가져온 뒤 사용할 수 있습니다.'
              : testSubmission
                ? `결과: ${submissionStatusLabel(testSubmission.status)}${
                    testSubmission.awarded_score !== null
                      ? ` / ${testSubmission.awarded_score}`
                      : ''
                  }`
                : testSubmissionMutation.error
                  ? formatApiError(
                      testSubmissionMutation.error,
                      '테스트 제출에 실패했습니다',
                    )
                  : '채점 파일과 테스트케이스 등록 후 정답/오답 코드를 빠르게 검증할 수 있습니다.'
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
          testSubmissionStatusCode={testSubmission?.status ?? ''}
        />
      ) : null}
    </PageLayout>
  );
}

function TestcaseSetModal({
  fileError,
  filePreview,
  fileText,
  isFileLoading,
  onClose,
  onSelectFile,
  testcaseSet,
}: {
  fileError: unknown;
  filePreview: { storageKey: string; title: string } | null;
  fileText?: string;
  isFileLoading: boolean;
  onClose: () => void;
  onSelectFile: (preview: { storageKey: string; title: string }) => void;
  testcaseSet: TestcaseSet;
}) {
  const testcases = [...(testcaseSet.testcases ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 p-3 sm:p-6"
      role="dialog"
    >
      <section className="mx-auto grid h-full max-h-[calc(100vh-1.5rem)] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black text-indigo-600 uppercase">
              Testcases
            </p>
            <h2 className="text-xl font-black text-slate-950">
              현재 테스트케이스 {testcases.length}개
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

        <div className="grid min-h-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
          <div className="min-h-0 overflow-auto border-b border-slate-200 lg:border-r lg:border-b-0">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    번호
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    입력 파일
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    출력 파일
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    내용
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testcases.map((testcase) => (
                  <tr
                    className="hover:bg-indigo-50/40"
                    key={testcase.testcase_id}
                  >
                    <td className="border-r border-slate-100 px-4 py-3 font-black text-slate-950">
                      {testcase.display_order}
                    </td>
                    <td className="border-r border-slate-100 px-4 py-3 font-mono text-xs font-bold text-slate-600">
                      {storageFileName(testcase.input_storage_key)}
                    </td>
                    <td className="border-r border-slate-100 px-4 py-3 font-mono text-xs font-bold text-slate-600">
                      {storageFileName(testcase.output_storage_key)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-50"
                          onClick={() =>
                            onSelectFile({
                              storageKey: testcase.input_storage_key,
                              title: `${testcase.display_order}번 입력`,
                            })
                          }
                          type="button"
                        >
                          입력 보기
                        </button>
                        <button
                          className="rounded border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-50"
                          onClick={() =>
                            onSelectFile({
                              storageKey: testcase.output_storage_key,
                              title: `${testcase.display_order}번 출력`,
                            })
                          }
                          type="button"
                        >
                          출력 보기
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!testcases.length ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                      colSpan={4}
                    >
                      표시할 테스트케이스가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] p-5">
            <div className="grid gap-1">
              <p className="text-sm font-black text-slate-900">
                {filePreview?.title ?? '파일 내용'}
              </p>
              <p className="break-all font-mono text-xs font-bold text-slate-400">
                {filePreview?.storageKey ?? '왼쪽 목록에서 입력 또는 출력을 선택하세요.'}
              </p>
            </div>
            <div className="mt-4 min-h-0">
              {isFileLoading ? (
                <p className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                  파일 내용을 불러오는 중입니다.
                </p>
              ) : fileError ? (
                <ErrorBox
                  error={fileError}
                  fallback="파일 내용을 불러오지 못했습니다"
                />
              ) : filePreview ? (
                <pre className="h-full min-h-72 overflow-auto rounded border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-50">
                  {fileText ?? ''}
                </pre>
              ) : (
                <p className="rounded border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-bold text-slate-500">
                  테스트케이스 파일을 선택하면 내용이 여기에 표시됩니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProblemPreviewModal({
  assets,
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
  testSubmissionStatusCode,
}: {
  assets: ProblemAsset[];
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
  testSubmissionStatusCode: string;
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
            <ProblemStatementPanel assets={assets} problem={problem} />
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
            {testSubmissionStatusCode ? (
              <div className="mx-7 mb-7 rounded border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600">
                관리자 테스트 제출 상태 코드:{' '}
                <code className="text-indigo-700">
                  {testSubmissionStatusCode}
                </code>
              </div>
            ) : null}
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
