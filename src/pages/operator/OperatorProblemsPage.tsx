import {
  Fragment,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  deleteProblemAsset,
  deleteProblemTestcase,
  deleteProblemTestcaseSet,
  copyOperatorProblem,
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
  PackageFileRole,
  PackageSupportFileStatus,
  Problem,
  ProblemAsset,
  TestcaseSet,
} from '@/domains/problemManagement/types';
import {
  PACKAGE_FILE_ROLES,
  PROBLEM_STATEMENT_TEMPLATE,
  TESTCASE_SUPPORT_FILE_ROLES,
} from '@/domains/problemManagement/types';
import {
  createOperatorTestSubmission,
  waitOperatorTestSubmissionStatus,
} from '@/domains/submissionScoreboard/api';
import {
  parseJudgeDetail,
  submissionProgressPercent,
  submissionProgressText,
  submissionStatusLabel,
  isSubmissionPending,
} from '@/domains/submissionScoreboard/status';
import {
  isJudgeLanguage,
  loadLastJudgeLanguage,
  saveLastJudgeLanguage,
} from '@/domains/submissionScoreboard/languagePreference';
import type {
  JudgeLanguage,
  Submission,
} from '@/domains/submissionScoreboard/types';
import { formatApiError } from '@/shared/api/errors';
import { loadCodeDraft, saveCodeDraft } from '@/shared/lib/codeDraftStorage';
import { formatMemoryKb } from '@/shared/lib/formatters';

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

const TEST_SUBMISSION_MAX_WAIT_ATTEMPTS = 60;

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type VerificationCodeKind =
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded';

type VerificationRunResult = {
  asset?: ProblemAsset;
  error?: string;
  expectedStatus: string;
  filename: string;
  submission?: Submission;
};

const VERIFICATION_CODE_KINDS: {
  description: string;
  expectedStatus: VerificationCodeKind;
  label: string;
}[] = [
  {
    description: '정답으로 통과해야 하는 기준 코드입니다.',
    expectedStatus: 'accepted',
    label: '정답 코드',
  },
  {
    description: '약한 테스트케이스를 잡기 위한 오답 코드입니다.',
    expectedStatus: 'wrong_answer',
    label: '오답 코드',
  },
  {
    description: '시간 제한 검증용 코드입니다.',
    expectedStatus: 'time_limit_exceeded',
    label: '시간초과 코드',
  },
  {
    description: '메모리 제한 검증용 코드입니다.',
    expectedStatus: 'memory_limit_exceeded',
    label: '메모리 초과 코드',
  },
];

function verificationKindFromAsset(
  asset: ProblemAsset,
): VerificationCodeKind | null {
  const match = asset.storage_key.match(/\/verification-solutions\/([^/]+)\//);
  const value = match?.[1];
  return VERIFICATION_CODE_KINDS.some((kind) => kind.expectedStatus === value)
    ? (value as VerificationCodeKind)
    : null;
}

function languageFromFilename(filename: string): JudgeLanguage | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx')) {
    return 'cpp17';
  }
  if (lower.endsWith('.c')) return 'c99';
  if (lower.endsWith('.py')) return 'python313';
  if (lower.endsWith('.java')) return 'java8';
  return null;
}

function formatRuntime(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return `${value.toLocaleString('ko-KR')} ms`;
}

function codeLength(submission: Submission) {
  const length =
    submission.code_length_bytes ??
    submission.source_code_length ??
    submission.source_code?.length ??
    null;
  return typeof length === 'number'
    ? `${length.toLocaleString('ko-KR')} B`
    : '-';
}

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

function uniqueProblemCode(baseCode: string, existingCodes: Set<string>) {
  if (!existingCodes.has(baseCode)) return baseCode;

  let index = 1;
  let candidate = `${baseCode}-copy`;
  while (existingCodes.has(candidate)) {
    index += 1;
    candidate = `${baseCode}-copy${index}`;
  }
  return candidate;
}

function storageFileName(storageKey: string) {
  return decodeURIComponent(storageKey.split('/').pop() ?? storageKey);
}

function testcaseDisplayFileName(displayOrder: number, extension: 'in' | 'out') {
  return `${displayOrder}.${extension}`;
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
  const [copySourceProblemId, setCopySourceProblemId] = useState('');
  const [isCopyPanelOpen, setIsCopyPanelOpen] = useState(false);
  const [filterDivisionId, setFilterDivisionId] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestcaseModalOpen, setIsTestcaseModalOpen] = useState(false);
  const [isCaseDropActive, setIsCaseDropActive] = useState(false);
  const [testcaseFilePreview, setTestcaseFilePreview] = useState<{
    storageKey: string;
    title: string;
  } | null>(null);
  const [supportFilePreview, setSupportFilePreview] = useState<{
    storageKey: string;
    title: string;
  } | null>(null);
  const [testLanguage, setTestLanguage] = useState<JudgeLanguage>(() =>
    loadLastJudgeLanguage(),
  );
  const [testSourceCode, setTestSourceCode] = useState('');
  const [testSubmission, setTestSubmission] = useState<Submission | null>(null);
  const [verificationResults, setVerificationResults] = useState<
    Record<string, VerificationRunResult>
  >({});
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadProgressValue, setUploadProgressValue] = useState(0);
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
  const copyableProblems = activeDivisionId
    ? problems.filter((problem) => problem.division_id !== activeDivisionId)
    : [];
  const effectiveSelectedProblemId = selectedProblemId;
  const selectedProblem = problems.find(
    (problem) => problem.problem_id === effectiveSelectedProblemId,
  );
  const testDraftScope = `operator:${contestId}`;
  const testDraftKey = effectiveSelectedProblemId
    ? `preview:${effectiveSelectedProblemId}`
    : '';
  const previewProblem = useMemo(
    () => previewProblemFromForm(form, selectedProblem),
    [form, selectedProblem],
  );

  const assetsQuery = useQuery({
    enabled:
      Boolean(effectiveSelectedProblemId) &&
      (authoringTab === 'statement' ||
        authoringTab === 'tests' ||
        isPreviewOpen),
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
  const verificationAssetsByKind = useMemo(() => {
    const grouped = new Map<VerificationCodeKind, ProblemAsset[]>();
    for (const kind of VERIFICATION_CODE_KINDS) {
      grouped.set(kind.expectedStatus, []);
    }
    for (const asset of assetsQuery.data ?? []) {
      const kind = verificationKindFromAsset(asset);
      if (!kind) continue;
      grouped.get(kind)?.push(asset);
    }
    for (const [kind, assets] of grouped) {
      grouped.set(
        kind,
        [...assets].sort((a, b) =>
          a.original_filename.localeCompare(b.original_filename, 'ko-KR', {
            numeric: true,
          }),
        ),
      );
    }
    return grouped;
  }, [assetsQuery.data]);
  const supportAssetByRole = useMemo(() => {
    const grouped = new Map<string, ProblemAsset>();
    for (const asset of assetsQuery.data ?? []) {
      const role = supportRoleFromAsset(asset);
      if (!role) continue;
      grouped.set(role, asset);
    }
    return grouped;
  }, [assetsQuery.data]);
  const supportFileRows = useMemo(() => {
    const statusByRole = new Map(
      (packageStatusQuery.data?.support_files ?? []).map((file) => [
        file.role,
        file,
      ]),
    );

    return TESTCASE_SUPPORT_FILE_ROLES.map((role) => {
      const roleMeta = PACKAGE_FILE_ROLES.find((item) => item.value === role);
      const fallback: PackageSupportFileStatus = {
        role,
        label: supportRoleRequiredFilename(role),
        required: role !== 'checker',
        count: 0,
        latest_filename: null,
        status: 'missing',
      };
      const current = statusByRole.get(role) ?? fallback;

      return {
        ...current,
        detail: roleMeta?.detail ?? '',
        label:
          supportRoleRequiredFilename(role) ||
          current.label ||
          roleMeta?.label ||
          role,
      };
    });
  }, [packageStatusQuery.data?.support_files]);
  const testcaseFileQuery = useQuery({
    enabled: Boolean(testcaseFilePreview?.storageKey),
    queryKey: [
      'operator',
      'testcase-file',
      testcaseFilePreview?.storageKey ?? '',
    ],
    queryFn: () => getStorageObjectText(testcaseFilePreview!.storageKey),
  });
  const supportFileQuery = useQuery({
    enabled: Boolean(supportFilePreview?.storageKey),
    queryKey: [
      'operator',
      'support-file',
      supportFilePreview?.storageKey ?? '',
    ],
    queryFn: () => getStorageObjectText(supportFilePreview!.storageKey),
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

  const copyProblemMutation = useMutation({
    mutationFn: () => {
      const sourceProblem = problems.find(
        (problem) => problem.problem_id === copySourceProblemId,
      );
      if (!sourceProblem) {
        throw new Error('복사할 문제를 선택해 주세요.');
      }
      if (!activeDivisionId) {
        throw new Error('문제를 가져올 유형을 선택해 주세요.');
      }

      const targetProblems = problems.filter(
        (problem) => problem.division_id === activeDivisionId,
      );
      const existingCodes = new Set(
        targetProblems.map((problem) => problem.problem_code),
      );
      const nextDisplayOrder =
        Math.max(0, ...targetProblems.map((problem) => problem.display_order ?? 0)) +
        1;

      return copyOperatorProblem(contestId, token, {
        display_order: nextDisplayOrder,
        problem_code: uniqueProblemCode(sourceProblem.problem_code, existingCodes),
        source_problem_id: sourceProblem.problem_id,
        target_division_id: activeDivisionId,
      });
    },
    onSuccess: (problem) => {
      setCopySourceProblemId('');
      setIsCopyPanelOpen(false);
      setEditorMode('edit');
      setAuthoringTab('statement');
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
        `problems/${effectiveSelectedProblemId}/package-files/${role}`,
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

  async function runOperatorTestSubmission(sourceCode: string, filename: string) {
    const language = languageFromFilename(filename);
    if (!language) {
      throw new Error('지원하지 않는 코드 파일입니다. .c, .cpp, .py, .java 파일을 사용해 주세요.');
    }

    const submitted = await createOperatorTestSubmission(
      contestId,
      effectiveSelectedProblemId,
      token,
      {
        language,
        source_code: sourceCode,
      },
    );

    return waitForOperatorTestSubmission(submitted);
  }

  async function waitForOperatorTestSubmission(
    submitted: Submission,
    onUpdate?: (submission: Submission) => void,
  ) {
    let latest = submitted;
    onUpdate?.(latest);

    for (
      let attempt = 0;
      isSubmissionPending(latest.status) &&
      attempt < TEST_SUBMISSION_MAX_WAIT_ATTEMPTS;
      attempt += 1
    ) {
      latest = await waitOperatorTestSubmissionStatus(
        contestId,
        latest.submission_id,
        token,
        {
          pollIntervalSeconds: 0.1,
          waitSeconds: 0.35,
        },
      );
      onUpdate?.(latest);

      if (isSubmissionPending(latest.status)) {
        await sleep(100);
      }
    }

    return latest;
  }

  const uploadVerificationCodeMutation = useMutation({
    mutationFn: async ({
      expectedStatus,
      files,
    }: {
      expectedStatus: VerificationCodeKind;
      files: File[];
    }) => {
      const results: VerificationRunResult[] = [];

      for (const file of files) {
        const tempKey = `${expectedStatus}:${file.name}:${file.lastModified}`;
        setVerificationResults((previous) => ({
          ...previous,
          [tempKey]: {
            expectedStatus,
            filename: file.name,
          },
        }));

        try {
          const sourceCode = await file.text();
          const asset = await uploadProblemAsset(
            contestId,
            effectiveSelectedProblemId,
            token,
            file,
            `problems/${effectiveSelectedProblemId}/verification-solutions/${expectedStatus}`,
          );
          const submission = await runOperatorTestSubmission(
            sourceCode,
            file.name,
          );
          const result = {
            asset,
            expectedStatus,
            filename: file.name,
            submission,
          };
          results.push(result);
          setVerificationResults((previous) => {
            const next = { ...previous };
            delete next[tempKey];
            next[asset.asset_id] = result;
            return next;
          });
        } catch (error) {
          const result = {
            error:
              error instanceof Error
                ? error.message
                : '검증 코드 처리에 실패했습니다.',
            expectedStatus,
            filename: file.name,
          };
          results.push(result);
          setVerificationResults((previous) => ({
            ...previous,
            [tempKey]: result,
          }));
        }
      }

      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          'operator',
          'problem-assets',
          contestId,
          effectiveSelectedProblemId,
        ],
      });
    },
  });

  const runVerificationCodeMutation = useMutation({
    mutationFn: async ({
      asset,
      expectedStatus,
    }: {
      asset: ProblemAsset;
      expectedStatus: VerificationCodeKind;
    }) => {
      setVerificationResults((previous) => ({
        ...previous,
        [asset.asset_id]: {
          asset,
          expectedStatus,
          filename: asset.original_filename,
        },
      }));

      const sourceCode = await getStorageObjectText(asset.storage_key);
      const submission = await runOperatorTestSubmission(
        sourceCode,
        asset.original_filename,
      );
      const result = {
        asset,
        expectedStatus,
        filename: asset.original_filename,
        submission,
      };
      setVerificationResults((previous) => ({
        ...previous,
        [asset.asset_id]: result,
      }));
      return result;
    },
    onError: (error, variables) => {
      setVerificationResults((previous) => ({
        ...previous,
        [variables.asset.asset_id]: {
          asset: variables.asset,
          error:
            error instanceof Error
              ? error.message
              : '검증 코드 채점에 실패했습니다.',
          expectedStatus: variables.expectedStatus,
          filename: variables.asset.original_filename,
        },
      }));
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (asset: ProblemAsset) =>
      deleteProblemAsset(
        contestId,
        effectiveSelectedProblemId,
        asset.asset_id,
        token,
      ),
    onSuccess: (_asset, deletedAsset) => {
      if (supportFilePreview?.storageKey === deletedAsset.storage_key) {
        setSupportFilePreview(null);
      }
      setVerificationResults((previous) => {
        const next = { ...previous };
        delete next[deletedAsset.asset_id];
        return next;
      });
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
          setUploadProgressValue(
            Math.round((progress.current / progress.total) * 100),
          );
          setUploadProgress(
            `${progress.phase} ${progress.current}/${progress.total}${filename}`,
          );
        },
      ),
    onSuccess: async (result) => {
      setUploadProgressValue(100);
      setUploadProgress(
        result.warnings.length
          ? `검증 완료: ${result.verified_count}건, 경고 ${result.warnings.length}건`
          : `검증 완료: ${result.verified_count}건`,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            'operator',
            'problem-testcase-sets',
            contestId,
            effectiveSelectedProblemId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            'operator',
            'problem-package-status',
            contestId,
            effectiveSelectedProblemId,
          ],
        }),
      ]);
    },
    onError: () => setUploadProgressValue(0),
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

  const deleteTestcaseMutation = useMutation({
    mutationFn: ({
      testcaseId,
      testcaseSetId,
    }: {
      testcaseId: string;
      testcaseSetId: string;
    }) =>
      deleteProblemTestcase(
        contestId,
        effectiveSelectedProblemId,
        testcaseSetId,
        testcaseId,
        token,
      ),
    onSuccess: (deletedTestcase) => {
      if (
        testcaseFilePreview?.storageKey === deletedTestcase.input_storage_key ||
        testcaseFilePreview?.storageKey === deletedTestcase.output_storage_key
      ) {
        setTestcaseFilePreview(null);
      }
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

      setTestSubmission(submitted);

      const latest = await waitForOperatorTestSubmission(
        submitted,
        setTestSubmission,
      );

      return latest;
    },
    onSuccess: (submission) => {
      setTestSubmission(submission);
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!testDraftKey) {
        setTestSourceCode('');
        return;
      }

      const savedDraft = loadCodeDraft(testDraftScope, testDraftKey);
      setTestSourceCode(savedDraft?.sourceCode ?? '');
      if (isJudgeLanguage(savedDraft?.language)) {
        setTestLanguage(savedDraft.language);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [testDraftKey, testDraftScope]);

  function handleTestLanguageChange(language: JudgeLanguage) {
    setTestLanguage(language);
    saveLastJudgeLanguage(language);
    if (testDraftKey) {
      saveCodeDraft(testDraftScope, testDraftKey, { language });
    }
  }

  function handleTestSourceCodeChange(sourceCode: string) {
    setTestSourceCode(sourceCode);
    if (testDraftKey) {
      saveCodeDraft(testDraftScope, testDraftKey, { sourceCode });
    }
  }

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
      examples: prev.examples.filter(
        (_, exampleIndex) => exampleIndex !== index,
      ),
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
    if (
      !effectiveSelectedProblemId ||
      uploadMatchedTestcasesMutation.isPending
    ) {
      return;
    }

    const testcaseFiles = files.filter((file) =>
      /\.(in|out)$/i.test(file.name),
    );
    if (!testcaseFiles.length) {
      setUploadProgress('.in 또는 .out 파일을 선택해 주세요.');
      return;
    }
    setUploadProgressValue(0);
    setUploadProgress('업로드 준비 중');
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

      <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
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
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700"
                onClick={startCreateMode}
                type="button"
              >
                새 문제
              </button>
              <button
                aria-expanded={isCopyPanelOpen}
                className={[
                  'rounded border px-3 py-2 text-xs font-black transition',
                  isCopyPanelOpen
                    ? 'border-indigo-300 bg-indigo-950 text-white'
                    : 'border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
                ].join(' ')}
                onClick={() => setIsCopyPanelOpen((current) => !current)}
                type="button"
              >
                문제 복사
              </button>
            </div>
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
          {isCopyPanelOpen ? (
            <div className="grid gap-2 rounded border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-xs font-black text-slate-700">
                  다른 유형 문제 가져오기
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  채점 파일과 테스트케이스까지 현재 유형으로 복사합니다.
                </p>
              </div>
              <select
                className="h-10 rounded border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                disabled={!copyableProblems.length || copyProblemMutation.isPending}
                onChange={(event) => setCopySourceProblemId(event.target.value)}
                value={copySourceProblemId}
              >
                <option value="">
                  {copyableProblems.length
                    ? '복사할 문제 선택'
                    : '다른 유형 문제가 없습니다'}
                </option>
                {copyableProblems.map((problem) => {
                  const divisionName =
                    divisions.find(
                      (division) => division.division_id === problem.division_id,
                    )?.name ?? '다른 유형';

                  return (
                    <option key={problem.problem_id} value={problem.problem_id}>
                      [{divisionName}] {problem.problem_code}. {problem.title}
                    </option>
                  );
                })}
              </select>
              <button
                className="h-10 rounded bg-indigo-950 px-3 text-xs font-black text-white disabled:bg-slate-300"
                disabled={
                  !copySourceProblemId ||
                  !activeDivisionId ||
                  copyProblemMutation.isPending
                }
                onClick={() => copyProblemMutation.mutate()}
                type="button"
              >
                {copyProblemMutation.isPending
                  ? '가져오는 중'
                  : '현재 유형으로 가져오기'}
              </button>
              {copyProblemMutation.error ? (
                <ErrorBox
                  error={copyProblemMutation.error}
                  fallback="문제 복사에 실패했습니다"
                />
              ) : null}
            </div>
          ) : null}
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
        <div className="grid content-start gap-6">
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
            <div className="grid items-start gap-2 md:grid-cols-4">
              {[
                ['settings', '기본 정보'],
                ['statement', '문제/예제'],
                ['tests', '테스트케이스'],
                ['preview', '전체 미리보기'],
              ].map(([value, label]) => (
                <button
                  className={[
                    'h-11 rounded border px-4 text-sm font-black transition',
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
                        setForm((prev) => ({
                          ...prev,
                          note: event.target.value,
                        }))
                      }
                      value={form.note}
                    />
                  </label>
                  <div className="grid gap-3 rounded border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          예제
                        </p>
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
                                updateExample(index, {
                                  input: event.target.value,
                                })
                              }
                              value={example.input}
                            />
                          </label>
                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            예제 출력
                            <textarea
                              className="min-h-28 resize-y rounded border border-slate-200 px-3 py-3 font-mono text-xs leading-5 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                              onChange={(event) =>
                                updateExample(index, {
                                  output: event.target.value,
                                })
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
                  아래 영역에서 채점 보조 파일과 .in/.out 테스트케이스를
                  관리합니다.
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
                  <div className="grid gap-3">
                    {packageStatusQuery.data ? (
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
                    ) : null}
                    {packageStatusQuery.data?.warnings.length ? (
                      <ul className="grid gap-1 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                        {packageStatusQuery.data.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="grid gap-2">
                      {supportFileRows.map((file) => {
                        const asset = supportAssetByRole.get(file.role);

                        return (
                          <div
                            className="grid gap-3 rounded border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-600 sm:grid-cols-[minmax(0,1fr)_auto]"
                            key={file.role}
                          >
                            <span className="grid min-w-0 gap-1">
                              <span>
                                {file.label}
                                {file.required ? ' *' : ''}
                              </span>
                              {file.detail ? (
                                <span className="text-[11px] font-bold text-slate-400">
                                  {file.detail}
                                </span>
                              ) : null}
                              <button
                                className={[
                                  'w-fit max-w-full truncate text-left font-black',
                                  asset
                                    ? 'text-indigo-700 hover:text-indigo-950'
                                    : file.status === 'ready'
                                      ? 'text-emerald-700'
                                      : 'text-amber-700',
                                ].join(' ')}
                                disabled={!asset}
                                onClick={() =>
                                  asset
                                    ? setSupportFilePreview({
                                        storageKey: asset.storage_key,
                                        title: `${file.label} · ${asset.original_filename}`,
                                      })
                                    : undefined
                                }
                                title={asset?.original_filename ?? undefined}
                                type="button"
                              >
                                {asset?.original_filename ??
                                  file.latest_filename ??
                                  '파일 없음'}
                              </button>
                            </span>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="h-9 rounded border border-indigo-200 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-50 disabled:border-slate-200 disabled:text-slate-300"
                                disabled={!asset}
                                onClick={() =>
                                  asset
                                    ? setSupportFilePreview({
                                        storageKey: asset.storage_key,
                                        title: `${file.label} · ${asset.original_filename}`,
                                      })
                                    : undefined
                                }
                                type="button"
                              >
                                보기
                              </button>
                              <button
                                className="h-9 rounded border border-rose-200 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:border-slate-200 disabled:text-slate-300"
                                disabled={
                                  !asset || deleteAssetMutation.isPending
                                }
                                onClick={() => {
                                  if (
                                    asset &&
                                    window.confirm(
                                      `${asset.original_filename} 파일을 삭제할까요?`,
                                    )
                                  ) {
                                    deleteAssetMutation.mutate(asset);
                                  }
                                }}
                                type="button"
                              >
                                삭제
                              </button>
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                        <span className="text-xs font-bold text-slate-400">
                          개별 케이스는 목록에서 삭제합니다.
                        </span>
                      </div>
                    ) : (
                      <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                        업로드된 테스트케이스가 없습니다.
                      </p>
                    )}
                  </div>
                  <VerificationCodeSection
                    assetsByKind={verificationAssetsByKind}
                    isBusy={
                      uploadVerificationCodeMutation.isPending ||
                      runVerificationCodeMutation.isPending
                    }
                    onDelete={(asset) => {
                      if (
                        window.confirm(
                          `${asset.original_filename} 검증 코드를 삭제할까요?`,
                        )
                      ) {
                        deleteAssetMutation.mutate(asset);
                      }
                    }}
                    onPreview={(asset, label) =>
                      setSupportFilePreview({
                        storageKey: asset.storage_key,
                        title: `${label} · ${asset.original_filename}`,
                      })
                    }
                    onRun={(asset, expectedStatus) =>
                      runVerificationCodeMutation.mutate({
                        asset,
                        expectedStatus,
                      })
                    }
                    onUpload={(expectedStatus, files) =>
                      uploadVerificationCodeMutation.mutate({
                        expectedStatus,
                        files,
                      })
                    }
                    results={verificationResults}
                  />
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
                        if (uploadMatchedTestcasesMutation.isPending) return;
                        setIsCaseDropActive(true);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsCaseDropActive(false);
                        if (uploadMatchedTestcasesMutation.isPending) return;
                        handleMatchedFiles(
                          Array.from(event.dataTransfer.files),
                        );
                      }}
                    >
                      <p className="text-sm font-black text-slate-800">
                        .in/.out 파일을 이 영역에 드롭
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        같은 파일명 기준으로 입력과 출력을 짝지어 한 번에
                        반영합니다.
                      </p>
                      <label
                        className={[
                          'mx-auto inline-flex h-10 items-center rounded px-4 text-xs font-black text-white transition',
                          uploadMatchedTestcasesMutation.isPending
                            ? 'cursor-not-allowed bg-slate-300'
                            : 'cursor-pointer bg-emerald-700 hover:bg-emerald-800',
                        ].join(' ')}
                      >
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
                      <p
                        aria-live="polite"
                        className="text-xs font-bold text-slate-600"
                      >
                        {uploadProgress}
                      </p>
                    ) : null}
                    {uploadRoleFileMutation.error ||
                    uploadMatchedTestcasesMutation.error ||
                    deleteTestcaseSetMutation.error ||
                    deleteTestcaseMutation.error ||
                    deleteAssetMutation.error ||
                    uploadVerificationCodeMutation.error ||
                    runVerificationCodeMutation.error ? (
                      <ErrorBox
                        error={
                          uploadRoleFileMutation.error ||
                          uploadMatchedTestcasesMutation.error ||
                          deleteTestcaseSetMutation.error ||
                          deleteTestcaseMutation.error ||
                          deleteAssetMutation.error ||
                          uploadVerificationCodeMutation.error ||
                          runVerificationCodeMutation.error
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
          onDeleteTestcase={(testcaseId) => {
            if (!latestTestcaseSet) return;
            if (
              window.confirm('이 테스트케이스 입력/출력 세트를 삭제할까요?')
            ) {
              deleteTestcaseMutation.mutate({
                testcaseId,
                testcaseSetId: latestTestcaseSet.testcase_set_id,
              });
            }
          }}
          onSelectFile={setTestcaseFilePreview}
          deletingTestcaseId={
            deleteTestcaseMutation.variables?.testcaseId ?? null
          }
          testcaseSet={latestTestcaseSet}
        />
      ) : null}
      {supportFilePreview ? (
        <FileContentModal
          fileError={supportFileQuery.error}
          filePreview={supportFilePreview}
          fileText={supportFileQuery.data}
          isFileLoading={supportFileQuery.isLoading}
          onClose={() => setSupportFilePreview(null)}
        />
      ) : null}
      {uploadMatchedTestcasesMutation.isPending ? (
        <UploadProgressModal
          message={uploadProgress || '테스트케이스 파일을 업로드하고 있습니다.'}
          progress={uploadProgressValue}
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
              : testSubmissionMutation.isPending && testSubmission
                ? `채점 중: ${submissionStatusLabel(testSubmission.status)}`
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
          onLanguageChange={handleTestLanguageChange}
          onSourceCodeChange={handleTestSourceCodeChange}
          onSubmit={() => testSubmissionMutation.mutate()}
          problem={previewProblem}
          sourceCode={testSourceCode}
          testSubmission={testSubmission}
          testLanguage={testLanguage}
        />
      ) : null}
    </PageLayout>
  );
}

function TestcaseSetModal({
  deletingTestcaseId,
  fileError,
  filePreview,
  fileText,
  isFileLoading,
  onClose,
  onDeleteTestcase,
  onSelectFile,
  testcaseSet,
}: {
  deletingTestcaseId: string | null;
  fileError: unknown;
  filePreview: { storageKey: string; title: string } | null;
  fileText?: string;
  isFileLoading: boolean;
  onClose: () => void;
  onDeleteTestcase: (testcaseId: string) => void;
  onSelectFile: (preview: { storageKey: string; title: string } | null) => void;
  testcaseSet: TestcaseSet;
}) {
  const testcases = [...(testcaseSet.testcases ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const selectedStorageKey = filePreview?.storageKey ?? null;

  function selectTestcaseFile(storageKey: string, title: string) {
    onSelectFile(
      selectedStorageKey === storageKey ? null : { storageKey, title },
    );
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 p-3 sm:p-6"
      role="dialog"
    >
      <section className="mx-auto grid h-full max-h-[calc(100vh-1.5rem)] w-full max-w-[min(96rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:max-w-[min(96rem,calc(100vw-3rem))]">
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

        <div className="min-h-0 overflow-hidden">
          <div className="h-full min-w-0 overflow-x-scroll overflow-y-auto [scrollbar-gutter:stable]">
            <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="w-20 border-r border-b border-slate-200 px-4 py-3">
                    번호
                  </th>
                  <th className="w-36 border-r border-b border-slate-200 px-4 py-3">
                    입력 파일
                  </th>
                  <th className="w-36 border-r border-b border-slate-200 px-4 py-3">
                    출력 파일
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    내용
                  </th>
                  <th className="w-28 border-b border-slate-200 px-4 py-3">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testcases.map((testcase) => {
                  const isInputOpen =
                    selectedStorageKey === testcase.input_storage_key;
                  const isOutputOpen =
                    selectedStorageKey === testcase.output_storage_key;
                  const isOpen = isInputOpen || isOutputOpen;

                  return (
                    <Fragment key={testcase.testcase_id}>
                      <tr className="hover:bg-indigo-50/40">
                        <td className="border-r border-slate-100 px-4 py-3 font-black text-slate-950">
                          {testcase.display_order}
                        </td>
                        <td
                          className="border-r border-slate-100 px-4 py-3 font-mono text-xs font-bold whitespace-nowrap text-slate-600"
                          title={storageFileName(testcase.input_storage_key)}
                        >
                          {testcaseDisplayFileName(
                            testcase.display_order,
                            'in',
                          )}
                        </td>
                        <td
                          className="border-r border-slate-100 px-4 py-3 font-mono text-xs font-bold whitespace-nowrap text-slate-600"
                          title={storageFileName(testcase.output_storage_key)}
                        >
                          {testcaseDisplayFileName(
                            testcase.display_order,
                            'out',
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              aria-expanded={isInputOpen}
                              className={[
                                'rounded border px-3 py-2 text-xs font-black whitespace-nowrap',
                                isInputOpen
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
                              ].join(' ')}
                              onClick={() =>
                                selectTestcaseFile(
                                  testcase.input_storage_key,
                                  `${testcase.display_order}번 입력`,
                                )
                              }
                              type="button"
                            >
                              입력 보기
                            </button>
                            <button
                              aria-expanded={isOutputOpen}
                              className={[
                                'rounded border px-3 py-2 text-xs font-black whitespace-nowrap',
                                isOutputOpen
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
                              ].join(' ')}
                              onClick={() =>
                                selectTestcaseFile(
                                  testcase.output_storage_key,
                                  `${testcase.display_order}번 출력`,
                                )
                              }
                              type="button"
                            >
                              출력 보기
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="rounded border border-rose-200 px-3 py-2 text-xs font-black whitespace-nowrap text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
                            disabled={
                              deletingTestcaseId === testcase.testcase_id
                            }
                            onClick={() =>
                              onDeleteTestcase(testcase.testcase_id)
                            }
                            type="button"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-slate-50">
                          <td
                            className="border-t border-slate-100 px-4 py-4"
                            colSpan={5}
                          >
                            <div className="animate-panel-enter grid gap-3 rounded border border-slate-200 bg-white p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-black text-slate-950">
                                    {filePreview?.title ?? '파일 내용'}
                                  </p>
                                  <p className="font-mono text-xs font-bold break-all text-slate-400">
                                    {filePreview?.storageKey}
                                  </p>
                                </div>
                                <button
                                  className="h-8 rounded border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
                                  onClick={() => onSelectFile(null)}
                                  type="button"
                                >
                                  접기
                                </button>
                              </div>
                              {isFileLoading ? (
                                <p className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                                  파일 내용을 불러오는 중입니다.
                                </p>
                              ) : fileError ? (
                                <ErrorBox
                                  error={fileError}
                                  fallback="파일 내용을 불러오지 못했습니다"
                                />
                              ) : (
                                <pre className="max-h-96 min-h-32 overflow-auto rounded border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-50">
                                  {fileText ?? ''}
                                </pre>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {!testcases.length ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                      colSpan={5}
                    >
                      표시할 테스트케이스가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function FileContentModal({
  fileError,
  filePreview,
  fileText,
  isFileLoading,
  onClose,
}: {
  fileError: unknown;
  filePreview: { storageKey: string; title: string };
  fileText?: string;
  isFileLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 p-3 sm:p-6"
      role="dialog"
    >
      <section className="mx-auto grid h-full max-h-[calc(100vh-1.5rem)] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-indigo-600 uppercase">
              Support file
            </p>
            <h2 className="truncate text-xl font-black text-slate-950">
              {filePreview.title}
            </h2>
            <p className="font-mono text-xs font-bold break-all text-slate-400">
              {filePreview.storageKey}
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
        <div className="min-h-0 p-5">
          {isFileLoading ? (
            <p className="rounded border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
              파일 내용을 불러오는 중입니다.
            </p>
          ) : fileError ? (
            <ErrorBox
              error={fileError}
              fallback="파일 내용을 불러오지 못했습니다"
            />
          ) : (
            <pre className="h-full min-h-72 overflow-auto rounded border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-50">
              {fileText ?? ''}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}

function UploadProgressModal({
  message,
  progress,
}: {
  message: string;
  progress: number;
}) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-4"
      role="dialog"
    >
      <section className="w-full max-w-md rounded border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="grid gap-2">
          <p className="text-xs font-black text-indigo-600 uppercase">
            Uploading
          </p>
          <h2 className="text-xl font-black text-slate-950">
            테스트케이스 반영 중
          </h2>
          <p className="text-sm font-bold text-slate-500">
            업로드와 검증이 끝날 때까지 기다려 주세요.
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-700 transition-all"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-600">
            <span>{message}</span>
            <span>{safeProgress}%</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function VerificationCodeSection({
  assetsByKind,
  isBusy,
  onDelete,
  onPreview,
  onRun,
  onUpload,
  results,
}: {
  assetsByKind: Map<VerificationCodeKind, ProblemAsset[]>;
  isBusy: boolean;
  onDelete: (asset: ProblemAsset) => void;
  onPreview: (asset: ProblemAsset, label: string) => void;
  onRun: (asset: ProblemAsset, expectedStatus: VerificationCodeKind) => void;
  onUpload: (expectedStatus: VerificationCodeKind, files: File[]) => void;
  results: Record<string, VerificationRunResult>;
}) {
  const pendingResults = Object.entries(results).filter(
    ([assetId, result]) => !result.asset && assetId.includes(':'),
  );

  return (
    <section className="grid gap-4 rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-sm font-black text-slate-950">
            검증 코드 채점
          </h3>
          <p className="text-xs leading-5 font-bold text-slate-500">
            정답/오답/시간초과/메모리초과 코드를 여러 개 올려 테스트케이스가
            의도대로 판정하는지 확인합니다.
          </p>
        </div>
        {isBusy ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            채점 중
          </span>
        ) : null}
      </div>

      <div className="grid gap-3">
        {VERIFICATION_CODE_KINDS.map((kind) => {
          const assets = assetsByKind.get(kind.expectedStatus) ?? [];

          return (
            <section
              className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3"
              key={kind.expectedStatus}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-black text-slate-900">
                    {kind.label}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    기대 결과: {submissionStatusLabel(kind.expectedStatus)} ·{' '}
                    {kind.description}
                  </p>
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center rounded bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800">
                  파일 선택
                  <input
                    accept=".c,.cc,.cpp,.cxx,.py,.java,text/plain"
                    className="sr-only"
                    disabled={isBusy}
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.currentTarget.files ?? []);
                      if (files.length) onUpload(kind.expectedStatus, files);
                      event.currentTarget.value = '';
                    }}
                    type="file"
                  />
                </label>
              </div>

              {assets.length ? (
                <div className="grid gap-2">
                  {assets.map((asset) => (
                    <VerificationCodeRow
                      asset={asset}
                      expectedStatus={kind.expectedStatus}
                      key={asset.asset_id}
                      label={kind.label}
                      onDelete={onDelete}
                      onPreview={onPreview}
                      onRun={onRun}
                      result={results[asset.asset_id]}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs font-bold text-slate-500">
                  등록된 {kind.label}가 없습니다.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {pendingResults.length ? (
        <div className="grid gap-2">
          {pendingResults.map(([key, result]) => (
            <VerificationResultSummary key={key} result={result} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function VerificationCodeRow({
  asset,
  expectedStatus,
  label,
  onDelete,
  onPreview,
  onRun,
  result,
}: {
  asset: ProblemAsset;
  expectedStatus: VerificationCodeKind;
  label: string;
  onDelete: (asset: ProblemAsset) => void;
  onPreview: (asset: ProblemAsset, label: string) => void;
  onRun: (asset: ProblemAsset, expectedStatus: VerificationCodeKind) => void;
  result?: VerificationRunResult;
}) {
  return (
    <div className="grid gap-3 rounded border border-slate-200 bg-white px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="grid min-w-0 gap-2">
        <button
          className="w-fit max-w-full truncate text-left text-xs font-black text-indigo-700 hover:text-indigo-950"
          onClick={() => onPreview(asset, label)}
          title={asset.original_filename}
          type="button"
        >
          {asset.original_filename}
        </button>
        {result ? <VerificationResultSummary result={result} /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="h-9 rounded border border-indigo-200 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
          onClick={() => onPreview(asset, label)}
          type="button"
        >
          보기
        </button>
        <button
          className="h-9 rounded border border-emerald-200 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
          onClick={() => onRun(asset, expectedStatus)}
          type="button"
        >
          채점
        </button>
        <button
          className="h-9 rounded border border-rose-200 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50"
          onClick={() => onDelete(asset)}
          type="button"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function VerificationResultSummary({
  result,
}: {
  result: VerificationRunResult;
}) {
  const actualStatus = result.submission?.status;
  const isPending = actualStatus ? isSubmissionPending(actualStatus) : false;
  const passed =
    actualStatus && !isPending && actualStatus === result.expectedStatus;
  const failed = actualStatus && !isPending && actualStatus !== result.expectedStatus;

  return (
    <div
      className={[
        'grid gap-1 rounded px-3 py-2 text-xs font-bold',
        result.error
          ? 'border border-rose-200 bg-rose-50 text-rose-700'
          : passed
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : failed
              ? 'border border-amber-200 bg-amber-50 text-amber-800'
              : 'border border-slate-200 bg-slate-50 text-slate-600',
      ].join(' ')}
    >
      <p className="font-black">
        {result.filename} · 기대 {submissionStatusLabel(result.expectedStatus)}
        {actualStatus ? ` / 실제 ${submissionStatusLabel(actualStatus)}` : ' / 채점 대기'}
        {passed ? ' · 통과' : failed ? ' · 확인 필요' : ''}
      </p>
      {result.submission?.judge_message ? (
        <p className="break-words text-[11px] leading-5">
          {result.submission.judge_message}
        </p>
      ) : null}
      {result.submission?.compile_message ? (
        <p className="break-words text-[11px] leading-5">
          {result.submission.compile_message}
        </p>
      ) : null}
      {result.error ? (
        <p className="break-words text-[11px] leading-5">{result.error}</p>
      ) : null}
    </div>
  );
}

function OperatorPreviewJudgeResult({
  submission,
}: {
  submission: Submission | null;
}) {
  if (!submission) {
    return (
      <section className="mx-7 mb-7 rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
        테스트 제출 후 채점 진행률과 실패 케이스 상세가 여기에 표시됩니다.
      </section>
    );
  }

  const detail = parseJudgeDetail(submission.judge_message);
  const progressText = submissionProgressText(submission);
  const progressPercent = submissionProgressPercent(submission);
  const runtime = formatRuntime(
    submission.runtime_ms ?? submission.time_ms ?? submission.execution_time_ms,
  );
  const memory = formatMemoryKb(
    submission.memory_kb ??
      submission.memory_usage_kb ??
      submission.max_memory_kb,
  );

  return (
    <section className="mx-7 mb-7 grid gap-4 rounded border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-indigo-600 uppercase">
            Judge result
          </p>
          <h3 className="text-lg font-black text-slate-950">
            {submissionStatusLabel(submission.status)}
            {progressText ? ` · ${progressText}` : ''}
          </h3>
        </div>
        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-black',
            isSubmissionPending(submission.status)
              ? 'bg-amber-50 text-amber-700'
              : submission.status === 'accepted'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700',
          ].join(' ')}
        >
          {submission.status}
        </span>
      </div>

      {isSubmissionPending(submission.status) ? (
        <div className="grid gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{
                width: `${progressPercent ?? 0}%`,
              }}
            />
          </div>
          <p className="text-xs font-bold text-slate-500">
            채점 서버 응답을 기다리는 중입니다.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PreviewJudgeMetric label="실패 케이스" value={String(submission.failed_testcase_order ?? '-')} />
        <PreviewJudgeMetric label="실패 파일" value={detail.caseFiles || '-'} />
        <PreviewJudgeMetric label="소요 시간" value={runtime} />
        <PreviewJudgeMetric label="사용 메모리" value={memory} />
        <PreviewJudgeMetric label="언어" value={String(submission.language)} />
        <PreviewJudgeMetric label="코드 길이" value={codeLength(submission)} />
      </div>

      <PreviewJudgeLog label="컴파일 로그" value={submission.compile_message || '-'} />
      <PreviewJudgeLog label="채점 로그" value={submission.judge_message || '-'} />
      <div className="grid gap-3 xl:grid-cols-3">
        <PreviewJudgeLog label="실패 입력" value={detail.inputText || '-'} />
        <PreviewJudgeLog label="기대 출력" value={detail.expectedText || '-'} />
        <PreviewJudgeLog label="실제 출력" value={detail.actualText || '-'} />
      </div>
    </section>
  );
}

function PreviewJudgeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <strong className="text-xs font-black break-words text-slate-950">
        {value}
      </strong>
    </div>
  );
}

function PreviewJudgeLog({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 text-xs font-black text-slate-700">
      {label}
      <pre className="max-h-56 overflow-auto rounded border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-[11px] leading-5 whitespace-pre-wrap text-slate-50">
        {value}
      </pre>
    </label>
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
  testSubmission,
  testLanguage,
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
  testSubmission: Submission | null;
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
            <OperatorPreviewJudgeResult submission={testSubmission} />
          </div>
        </div>
      </section>
    </div>
  );
}

function supportRoleRequiredFilename(role: PackageFileRole) {
  if (role === 'package-resource') return 'testlib.h';
  if (role === 'validator') return 'validator.cpp';
  if (role === 'checker') return 'checker.cpp';
  return '';
}

function supportRoleFromAsset(asset: ProblemAsset): PackageFileRole | null {
  const storageRole = asset.storage_key.match(
    /\/(?:support|package-files)\/([^/]+)(?:\/|$)/,
  )?.[1];
  if (isPackageFileRole(storageRole)) return storageRole;

  const filename = asset.original_filename.toLowerCase();
  if (filename === 'testlib.h') return 'package-resource';
  if (filename === 'validator.cpp') return 'validator';
  if (filename === 'checker.cpp') return 'checker';

  return null;
}

function isPackageFileRole(
  value: string | undefined,
): value is PackageFileRole {
  return PACKAGE_FILE_ROLES.some((role) => role.value === value);
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
