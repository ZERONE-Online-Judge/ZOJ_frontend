import { type FormEvent, useId, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import ContestRoleSelector from '@/components/operator/ContestRoleSelector';
import { sharedUiText } from '@/data/uiText';
import {
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
  SettingsIcon,
} from '@/components/operator/OperatorShell';
import {
  createContestOperator,
  createOperatorDivision,
  getOperatorContestDashboard,
  listContestOperators,
  removeContestOperator,
  updateContestOperator,
  updateContestSettings,
  updateOperatorDivision,
} from '@/domains/contestAdministration/api';
import {
  contestResourceAccess,
  contestStatusLabel,
  isContestOperationLocked,
  isScheduleTbd,
} from '@/domains/contestAdministration/logic';
import type {
  Contest,
  ContestSettingsPatch,
  ContestResourceAccess,
  Division,
} from '@/domains/contestAdministration/types';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import {
  CONTEST_ROLES,
  contestRolesForAccount,
  isAssignedContestMaster,
  type ContestRole,
} from '@/domains/identityAccess/contestRoles';
import {
  hasContestPermission,
  isContestMaster,
} from '@/domains/identityAccess/permissions';
import type {
  StaffAccount,
  StaffSession,
} from '@/domains/identityAccess/types';
import { formatApiError } from '@/shared/api/errors';
import { dateTimeLocalToIso, dateTimeLocalValue } from '@/shared/lib/dateTime';

type SettingsForm = {
  end_at: string;
  freeze_at: string;
  organization_name: string;
  overview: string;
  problem_access_after_end: ContestResourceAccess;
  scoreboard_access_after_end: ContestResourceAccess;
  start_at: string;
  status: string;
  submission_access_after_end: ContestResourceAccess;
  board_access_after_end: ContestResourceAccess;
  board_write_after_end: boolean;
  editorial_access_after_end: ContestResourceAccess;
  notice_access_after_end: ContestResourceAccess;
  mock_judging_enabled: boolean;
  participant_progress_visible: boolean;
  mock_judging_progress_visible: boolean;
  title: string;
};

type DivisionForm = {
  description: string;
  divisionId: string;
  name: string;
};

type OperatorForm = {
  displayName: string;
  email: string;
  editingEmail: string;
  roles: ContestRole[];
};

type SettingsDraft = {
  contestId: string;
  form: SettingsForm;
};

const emptyDivisionForm: DivisionForm = {
  description: '',
  divisionId: '',
  name: '',
};

const emptyOperatorForm: OperatorForm = {
  displayName: '',
  editingEmail: '',
  email: '',
  roles: [],
};

const statusOptions = [
  ['draft', '초안'],
  ['scheduled', '예정(비공개)'],
  ['open', '예정(공개)'],
  ['running', '진행중'],
  ['ended', '종료'],
] as const;

const accessOptions: { label: string; value: ContestResourceAccess }[] = [
  { label: '비공개', value: 'private' },
  { label: '참가자 공개 유지', value: 'participants' },
  { label: '비로그인 공개', value: 'public' },
];

function settingsFormFromContest(contest: Contest): SettingsForm {
  const status = contest.status === 'schedule_tbd' ? 'draft' : contest.status;

  return {
    end_at: dateTimeLocalValue(contest.end_at),
    freeze_at: dateTimeLocalValue(contest.freeze_at),
    organization_name: contest.organization_name,
    overview: contest.overview,
    problem_access_after_end: contestResourceAccess(contest, 'problem'),
    scoreboard_access_after_end: contestResourceAccess(contest, 'scoreboard'),
    start_at: dateTimeLocalValue(contest.start_at),
    status,
    submission_access_after_end: contestResourceAccess(contest, 'submission'),
    board_access_after_end: contestResourceAccess(contest, 'board'),
    board_write_after_end: Boolean(contest.board_write_after_end),
    editorial_access_after_end:
      contestResourceAccess(contest, 'problem') === 'private'
        ? 'private'
        : contestResourceAccess(contest, 'editorial'),
    notice_access_after_end: contestResourceAccess(contest, 'notice'),
    mock_judging_enabled:
      contestResourceAccess(contest, 'problem') === 'private'
        ? false
        : Boolean(contest.mock_judging_enabled),
    participant_progress_visible: contest.participant_progress_visible ?? true,
    mock_judging_progress_visible: Boolean(
      contest.mock_judging_progress_visible,
    ),
    title: contest.title,
  };
}

export default function OperatorSettingsPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate
      contestId={contestId}
      permission={['contest.settings.manage', 'contest.staff.manage']}
    >
      {(session) =>
        contestId ? (
          <OperatorSettingsContent
            contestId={contestId}
            key={`${contestId}:${session.staff.email}`}
            session={session}
          />
        ) : (
          <PageLayout
            variant="management"
            title={sharedUiText.contestSelectionRequiredTitle}
          >
            {sharedUiText.contestSelectionRequiredBody}
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorSettingsContent({
  contestId,
  session,
}: {
  contestId: string;
  session: StaffSession;
}) {
  const token = session.accessToken;
  const canManageSettings = hasContestPermission(
    session,
    contestId,
    'contest.settings.manage',
  );
  const canManageStaff = hasContestPermission(
    session,
    contestId,
    'contest.staff.manage',
  );
  const canAssignMaster = isContestMaster(session, contestId);
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(
    null,
  );
  const [divisionForm, setDivisionForm] = useState(emptyDivisionForm);
  const [operatorForm, setOperatorForm] = useState(emptyOperatorForm);
  const [formError, setFormError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [operatorFormError, setOperatorFormError] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });

  const operatorsQuery = useQuery({
    queryKey: ['operator', 'operators', contestId, queryIdentity],
    queryFn: () => listContestOperators(contestId, token),
    enabled: canManageStaff,
  });

  const contest = dashboardQuery.data?.contest;
  const divisions = dashboardQuery.data?.divisions ?? [];
  const operators = (operatorsQuery.data ?? []).filter(
    (operator) => !operator.is_service_master,
  );
  const settingsForm =
    settingsDraft?.contestId === contestId
      ? settingsDraft.form
      : contest
        ? settingsFormFromContest(contest)
        : null;
  const operationLocked = contest ? isContestOperationLocked(contest) : false;

  const scheduleDisabled = !settingsForm || isScheduleTbd(settingsForm.status);
  const quickActionsVisible = Boolean(
    settingsForm &&
    ['open', 'running', 'ended', 'finalized', 'archived'].includes(
      settingsForm.status,
    ),
  );

  function setSettingsForm(
    updater: (prev: SettingsForm | null) => SettingsForm | null,
  ) {
    const next = updater(settingsForm);
    setSettingsDraft(next ? { contestId, form: next } : null);
  }

  function settingsPatchFromForm(form: SettingsForm): ContestSettingsPatch {
    const body: ContestSettingsPatch = {
      problem_access_after_end: form.problem_access_after_end,
      scoreboard_access_after_end: form.scoreboard_access_after_end,
      submission_access_after_end: form.submission_access_after_end,
      board_access_after_end: form.board_access_after_end,
      board_write_after_end: form.board_write_after_end,
      editorial_access_after_end:
        form.problem_access_after_end === 'private'
          ? 'private'
          : form.editorial_access_after_end,
      notice_access_after_end: form.notice_access_after_end,
      mock_judging_enabled:
        form.problem_access_after_end === 'private'
          ? false
          : form.mock_judging_enabled,
      participant_progress_visible: form.participant_progress_visible,
      mock_judging_progress_visible: form.participant_progress_visible
        ? false
        : form.mock_judging_progress_visible,
    };

    if (!isScheduleTbd(form.status)) {
      body.start_at = dateTimeLocalToIso(form.start_at);
      body.freeze_at = dateTimeLocalToIso(form.freeze_at);
      body.end_at = dateTimeLocalToIso(form.end_at);
    }

    if (!operationLocked) {
      body.organization_name = form.organization_name.trim();
      body.overview = form.overview.trim();
      body.status = form.status;
      body.title = form.title.trim();
    }

    return body;
  }

  const updateSettingsMutation = useMutation({
    mutationFn: (body?: ContestSettingsPatch) =>
      updateContestSettings(
        contestId,
        token,
        body ?? settingsPatchFromForm(settingsForm!),
      ),
    onSuccess: () => {
      setSettingsDraft(null);
      setFormError('');
      setSavedMessage('설정이 저장되었습니다.');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'dashboard', contestId],
      });
    },
  });

  const saveDivisionMutation = useMutation({
    mutationFn: () =>
      divisionForm.divisionId
        ? updateOperatorDivision(contestId, divisionForm.divisionId, token, {
            description: divisionForm.description.trim(),
            name: divisionForm.name.trim(),
          })
        : createOperatorDivision(contestId, token, {
            description: divisionForm.description.trim(),
            name: divisionForm.name.trim(),
          }),
    onSuccess: () => {
      setDivisionForm(emptyDivisionForm);
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'dashboard', contestId],
      });
    },
  });

  const saveOperatorMutation = useMutation({
    mutationFn: () =>
      operatorForm.editingEmail
        ? updateContestOperator(contestId, operatorForm.editingEmail, token, {
            display_name: operatorForm.displayName.trim(),
            roles: operatorForm.roles,
          })
        : createContestOperator(contestId, token, {
            display_name: operatorForm.displayName.trim(),
            roles: operatorForm.roles,
            email: operatorForm.email.trim(),
          }),
    onSuccess: () => {
      setOperatorForm(emptyOperatorForm);
      setOperatorFormError('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'operators', contestId],
      });
    },
  });

  const removeOperatorMutation = useMutation({
    mutationFn: (operator: StaffAccount) =>
      removeContestOperator(contestId, operator.email, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'operators', contestId],
      });
    },
  });

  function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsForm?.title.trim() || !settingsForm.organization_name.trim()) {
      setFormError('대회명과 주최 기관을 입력해야 합니다.');
      return;
    }

    setSavedMessage('');
    updateSettingsMutation.mutate(undefined);
  }

  function updateDate(name: 'start_at' | 'end_at' | 'freeze_at', date: Date) {
    setSettingsForm((prev) =>
      prev ? { ...prev, [name]: dateTimeLocalValue(date.toISOString()) } : prev,
    );
  }

  function applyQuickAction(
    action:
      | 'start-now'
      | 'end-10'
      | 'end-30'
      | 'freeze-now'
      | 'freeze-30'
      | 'freeze-60',
  ) {
    if (!quickActionsVisible || updateSettingsMutation.isPending) return;
    const now = new Date();
    const addMinutes = (minutes: number) =>
      new Date(now.getTime() + minutes * 60_000);

    if (action === 'start-now') {
      setSettingsForm((prev) =>
        prev
          ? {
              ...prev,
              start_at: dateTimeLocalValue(now.toISOString()),
              status: 'running',
            }
          : prev,
      );
      return;
    }

    if (action === 'end-10') updateDate('end_at', addMinutes(10));
    if (action === 'end-30') updateDate('end_at', addMinutes(30));
    if (action === 'freeze-now') updateDate('freeze_at', now);
    if (action === 'freeze-30') updateDate('freeze_at', addMinutes(30));
    if (action === 'freeze-60') updateDate('freeze_at', addMinutes(60));
  }

  function handleDivisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveDivisionMutation.isPending) return;
    if (!divisionForm.name.trim()) return;
    saveDivisionMutation.mutate();
  }

  function handleOperatorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveOperatorMutation.isPending) return;
    if (!canManageStaff) return;
    if (!operatorForm.email.trim() || !operatorForm.displayName.trim()) {
      setOperatorFormError('운영자의 이메일과 이름을 입력하세요.');
      return;
    }
    if (!operatorForm.roles.length) {
      setOperatorFormError('담당할 권한을 하나 이상 선택하세요.');
      return;
    }
    setOperatorFormError('');
    saveOperatorMutation.mutate();
  }

  return (
    <PageLayout
      variant="management"
      description={
        canManageSettings
          ? '대회 일정, 공개 범위, 참가 유형과 담당 권한을 조정합니다.'
          : '이 대회를 운영할 구성원의 이름과 담당 권한을 관리합니다.'
      }
      eyebrow="Operator"
      title={`${contest?.title ?? '대회'} ${canManageSettings ? '설정' : '운영자 관리'}`}
      width="full"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || operatorsQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || operatorsQuery.error}
          fallback="설정 데이터를 불러오지 못했습니다"
        />
      ) : null}

      {canManageSettings ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.45fr)]">
          <OperatorPanel
            description="대회 기본 정보와 공개 정책을 수정합니다."
            title="대회 설정"
          >
            {settingsForm ? (
              <form className="grid gap-4" onSubmit={handleSettingsSubmit}>
                {operationLocked ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    대회가 진행 중이어서 기본 정보와 상태 변경은 잠겨 있습니다.
                    일정, 공개 범위와 채점 진행률 설정은 계속 조정할 수
                    있습니다.
                  </p>
                ) : null}
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  상태
                  <select
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={operationLocked}
                    onChange={(event) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, status: event.target.value } : prev,
                      )
                    }
                    value={settingsForm.status}
                  >
                    {statusOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset
                  disabled={
                    scheduleDisabled || updateSettingsMutation.isPending
                  }
                  aria-describedby={
                    scheduleDisabled ? 'schedule-locked-help' : undefined
                  }
                  className={`grid min-w-0 gap-4 rounded-lg border px-4 py-4 md:grid-cols-3 ${scheduleDisabled ? 'border-slate-200 bg-slate-50' : 'border-indigo-100 bg-indigo-50/60'}`}
                >
                  <div className="grid gap-1 md:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      대회 일정
                    </h3>
                    {scheduleDisabled ? (
                      <p
                        id="schedule-locked-help"
                        className="text-xs text-slate-500"
                      >
                        초안에서는 일정 입력이 잠깁니다. 위에서 예정 상태로
                        변경하세요.
                      </p>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {Intl.DateTimeFormat().resolvedOptions().timeZone}
                      </span>
                    )}
                  </div>
                  <DateInput
                    label="시작"
                    name="start_at"
                    setForm={setSettingsForm}
                    value={settingsForm.start_at}
                  />
                  <DateInput
                    label="프리즈"
                    name="freeze_at"
                    setForm={setSettingsForm}
                    value={settingsForm.freeze_at}
                  />
                  <DateInput
                    label="종료"
                    name="end_at"
                    setForm={setSettingsForm}
                    value={settingsForm.end_at}
                  />
                </fieldset>
                {quickActionsVisible ? (
                  <QuickActions
                    currentStatus={settingsForm.status}
                    disabled={updateSettingsMutation.isPending}
                    onAction={applyQuickAction}
                  />
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    disabled={operationLocked}
                    label="대회명"
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, title: value } : prev,
                      )
                    }
                    value={settingsForm.title}
                  />
                  <TextInput
                    disabled={operationLocked}
                    label="주최 기관"
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, organization_name: value } : prev,
                      )
                    }
                    value={settingsForm.organization_name}
                  />
                </div>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  개요
                  <textarea
                    className="min-h-28 resize-y rounded-lg border border-slate-200 px-3 py-3 text-sm leading-6 font-medium text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={operationLocked}
                    onChange={(event) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, overview: event.target.value } : prev,
                      )
                    }
                    value={settingsForm.overview}
                  />
                </label>
                <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="grid gap-2 md:col-span-2 xl:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      자료 공개 범위
                    </h3>
                    <p className="text-xs leading-5 text-slate-600">
                      종료 후 각 자료를 누가 볼 수 있는지 선택하세요.
                      문제집·스코어보드·채점현황은 ‘비로그인 공개’를 선택하면
                      대회 진행 중에도 로그인 없이 열람할 수 있습니다. 해설은
                      대회 종료 후에만 공개됩니다.
                    </p>
                    <dl className="grid gap-2 text-xs leading-5 sm:grid-cols-3">
                      <div>
                        <dt className="font-medium text-slate-700">비공개</dt>
                        <dd className="text-slate-500">
                          종료 후 참가자와 일반 방문자의 열람을 막습니다.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-700">
                          참가자 공개 유지
                        </dt>
                        <dd className="text-slate-500">
                          종료 후에도 해당 대회 참가자로 로그인하면 볼 수
                          있습니다.
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-700">
                          비로그인 공개
                        </dt>
                        <dd className="text-slate-500">
                          로그인하지 않은 방문자도 볼 수 있습니다. 게시판 작성
                          권한은 별도입니다.
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <AccessSelect
                    helperText="문제 목록과 문제 본문의 공개 범위입니다. 비공개로 바꾸면 해설도 비공개로 바뀌고 모의채점이 꺼집니다."
                    label="문제집"
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              problem_access_after_end: value,
                              editorial_access_after_end:
                                value === 'private'
                                  ? 'private'
                                  : prev.editorial_access_after_end,
                              mock_judging_enabled:
                                value === 'private'
                                  ? false
                                  : prev.mock_judging_enabled,
                            }
                          : prev,
                      )
                    }
                    value={settingsForm.problem_access_after_end}
                  />
                  <AccessSelect
                    label="스코어보드"
                    helperText="순위와 팀별 성적의 열람 범위입니다. 프리즈 해제는 스코어보드 화면에서 별도로 관리합니다."
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev
                          ? { ...prev, scoreboard_access_after_end: value }
                          : prev,
                      )
                    }
                    value={settingsForm.scoreboard_access_after_end}
                  />
                  <AccessSelect
                    label="채점현황"
                    helperText="제출 목록과 채점 결과의 열람 범위입니다. 제출 소스 코드의 열람 권한과는 별개입니다."
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev
                          ? { ...prev, submission_access_after_end: value }
                          : prev,
                      )
                    }
                    value={settingsForm.submission_access_after_end}
                  />
                  <AccessSelect
                    label="게시판"
                    helperText="종료 후 게시판을 열람할 수 있는 대상입니다. 글을 쓰게 하려면 아래 ‘게시판 작성 허용’도 켜세요."
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev
                          ? { ...prev, board_access_after_end: value }
                          : prev,
                      )
                    }
                    value={settingsForm.board_access_after_end}
                  />
                  <AccessSelect
                    disabled={
                      settingsForm.problem_access_after_end === 'private'
                    }
                    helperText={
                      settingsForm.problem_access_after_end === 'private'
                        ? '문제집 종료 후 공개가 켜져야 해설 공개 범위를 설정할 수 있습니다.'
                        : '해설은 대회 종료 후에만 공개됩니다.'
                    }
                    label="해설"
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev
                          ? { ...prev, editorial_access_after_end: value }
                          : prev,
                      )
                    }
                    value={settingsForm.editorial_access_after_end}
                  />
                  <AccessSelect
                    label="공지"
                    helperText="대회 종료 후 공지사항을 열람할 수 있는 대상입니다."
                    onChange={(value) =>
                      setSettingsForm((prev) =>
                        prev
                          ? { ...prev, notice_access_after_end: value }
                          : prev,
                      )
                    }
                    value={settingsForm.notice_access_after_end}
                  />
                </div>

                <div className="grid gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                  <div className="grid gap-1">
                    <span className="font-semibold">참가자 채점 진행률</span>
                    <span className="font-medium text-slate-500">
                      가리면 참가자 화면에는 테스트케이스 진행률이나 큐 순번을
                      보여주지 않고 채점 경과 시간만 표시합니다. 최종 채점
                      결과는 계속 표시되며, 스코어보드 프리즈와는 별도
                      설정입니다.
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label
                      className={[
                        'flex items-center gap-3 rounded-lg border px-4 py-3 font-semibold transition',
                        settingsForm.participant_progress_visible
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600',
                      ].join(' ')}
                    >
                      <input
                        checked={settingsForm.participant_progress_visible}
                        className="size-4 accent-indigo-600"
                        name="participant_progress_visible"
                        onChange={() =>
                          setSettingsForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  participant_progress_visible: true,
                                  mock_judging_progress_visible: false,
                                }
                              : prev,
                          )
                        }
                        type="radio"
                      />
                      보이기
                    </label>
                    <label
                      className={[
                        'flex items-center gap-3 rounded-lg border px-4 py-3 font-semibold transition',
                        !settingsForm.participant_progress_visible
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600',
                      ].join(' ')}
                    >
                      <input
                        checked={!settingsForm.participant_progress_visible}
                        className="size-4 accent-indigo-600"
                        name="participant_progress_visible"
                        onChange={() =>
                          setSettingsForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  participant_progress_visible: false,
                                }
                              : prev,
                          )
                        }
                        type="radio"
                      />
                      가리기
                    </label>
                  </div>
                  {!settingsForm.participant_progress_visible ? (
                    <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        checked={settingsForm.mock_judging_progress_visible}
                        className="mt-1 size-4 accent-indigo-600"
                        onChange={(event) =>
                          setSettingsForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  mock_judging_progress_visible:
                                    event.target.checked,
                                }
                              : prev,
                          )
                        }
                        type="checkbox"
                      />
                      <span className="grid gap-1">
                        <span className="font-semibold">
                          모의채점 진행률 보이기
                        </span>
                        <span className="font-medium text-slate-500">
                          정규 제출의 진행률은 가린 채 모의채점 진행률만
                          보여줍니다. 꺼두면 모의채점도 채점 경과 시간만
                          표시합니다.
                        </span>
                      </span>
                    </label>
                  ) : null}
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    checked={settingsForm.board_write_after_end}
                    className="mt-1 size-4 accent-indigo-600"
                    onChange={(event) =>
                      setSettingsForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              board_write_after_end: event.target.checked,
                            }
                          : prev,
                      )
                    }
                    type="checkbox"
                  />
                  <span className="grid gap-1">
                    <span className="font-semibold">
                      대회 종료 후 게시판 작성 허용
                    </span>
                    <span className="font-medium text-slate-500">
                      켜면 종료 이후에도 참가자가 질문과 댓글을 작성할 수
                      있습니다. 게시판 공개 범위가 비공개면 작성도 차단됩니다.
                    </span>
                  </span>
                </label>

                {settingsForm.problem_access_after_end !== 'private' ? (
                  <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <input
                      checked={settingsForm.mock_judging_enabled}
                      className="mt-1 size-4 accent-amber-500"
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                mock_judging_enabled: event.target.checked,
                              }
                            : prev,
                        )
                      }
                      type="checkbox"
                    />
                    <span className="grid gap-1">
                      <span className="font-semibold">모의채점</span>
                      <span className="font-medium text-amber-800">
                        종료된 대회에서 문제집 접근자가 제출 필드로 채점 결과만
                        확인할 수 있습니다. 일반 채점현황과 스코어보드에는
                        기록하지 않습니다.
                      </span>
                    </span>
                  </label>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                    모의채점은 종료 후 연습 제출 기능입니다. 사용하려면 문제집을
                    ‘참가자 공개 유지’ 또는 ‘비로그인 공개’로 바꾸세요. 모의채점
                    결과는 대회 순위에 반영되지 않습니다.
                  </p>
                )}

                {formError || updateSettingsMutation.error ? (
                  <ErrorBox
                    error={updateSettingsMutation.error}
                    fallback={formError || '대회 설정 저장에 실패했습니다'}
                  />
                ) : null}
                {savedMessage ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {savedMessage}
                  </p>
                ) : null}

                <button
                  className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:bg-slate-300"
                  disabled={updateSettingsMutation.isPending}
                  type="submit"
                >
                  <SettingsIcon />
                  {updateSettingsMutation.isPending ? '저장 중' : '설정 저장'}
                </button>
              </form>
            ) : (
              <p className="text-sm font-medium text-slate-500">
                대회 설정을 불러오는 중입니다.
              </p>
            )}
          </OperatorPanel>

          <div className="grid gap-6">
            <OperatorPanel
              description="초등부·중등부처럼 참가팀을 나누는 구분입니다. 참가 유형별로 문제를 배정하고 스코어보드를 확인할 수 있습니다. 목록을 누르면 해당 유형을 수정합니다. 추가·수정은 대회 설정 저장과 별도로 반영됩니다."
              title={
                divisionForm.divisionId ? '참가 유형 수정' : '참가 유형 추가'
              }
            >
              <form className="grid gap-3" onSubmit={handleDivisionSubmit}>
                <TextInput
                  label="유형 이름"
                  helperText="예: 초등부, 중등부, 고등부"
                  onChange={(value) =>
                    setDivisionForm((prev) => ({ ...prev, name: value }))
                  }
                  value={divisionForm.name}
                />
                <TextInput
                  label="설명"
                  onChange={(value) =>
                    setDivisionForm((prev) => ({ ...prev, description: value }))
                  }
                  value={divisionForm.description}
                />
                {saveDivisionMutation.error ? (
                  <ErrorBox
                    error={saveDivisionMutation.error}
                    fallback="참가 유형 저장에 실패했습니다"
                  />
                ) : null}
                <button
                  className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={
                    saveDivisionMutation.isPending || !divisionForm.name.trim()
                  }
                  type="submit"
                >
                  {saveDivisionMutation.isPending
                    ? '저장 중…'
                    : divisionForm.divisionId
                      ? '변경사항 저장'
                      : '유형 추가'}
                </button>
                {divisionForm.divisionId ? (
                  <button
                    className="h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600"
                    disabled={saveDivisionMutation.isPending}
                    onClick={() => {
                      setDivisionForm(emptyDivisionForm);
                      saveDivisionMutation.reset();
                    }}
                    type="button"
                  >
                    수정 취소 · 새 유형 추가로 돌아가기
                  </button>
                ) : null}
              </form>
              <DivisionList
                divisions={divisions}
                onEdit={(form) => {
                  if (!saveDivisionMutation.isPending) {
                    saveDivisionMutation.reset();
                    setDivisionForm(form);
                  }
                }}
              />
              {!divisions.length ? (
                <p className="text-sm text-slate-500">
                  등록된 참가 유형이 없습니다. 문제와 참가팀을 추가하기 전에
                  유형을 만들어주세요.
                </p>
              ) : null}
            </OperatorPanel>
          </div>
        </div>
      ) : null}
      {canManageStaff ? (
        <OperatorPanel
          description="운영자의 이름과 담당 권한을 지정하세요. 추가·수정·제거는 즉시 반영됩니다. 서비스 관리자가 배정한 대회 마스터는 이 화면에서 변경하거나 제거할 수 없습니다."
          title={operatorForm.editingEmail ? '운영자 수정' : '운영자 추가'}
        >
          <form className="grid gap-3" onSubmit={handleOperatorSubmit}>
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <TextInput
                disabled={
                  Boolean(operatorForm.editingEmail) ||
                  saveOperatorMutation.isPending
                }
                helperText="로그인에 사용하는 이메일입니다. 등록 후에는 이름과 권한을 수정할 수 있습니다."
                label="이메일 (필수)"
                required
                type="email"
                onChange={(value) =>
                  setOperatorForm((prev) => ({ ...prev, email: value }))
                }
                value={operatorForm.email}
              />
              <TextInput
                label="이름 (필수)"
                required
                disabled={saveOperatorMutation.isPending}
                onChange={(value) =>
                  setOperatorForm((prev) => ({ ...prev, displayName: value }))
                }
                value={operatorForm.displayName}
              />
            </div>
            <ContestRoleSelector
              canAssignMaster={canAssignMaster}
              disabled={saveOperatorMutation.isPending}
              value={operatorForm.roles}
              onChange={(roles) =>
                setOperatorForm((prev) => ({ ...prev, roles }))
              }
            />
            {operatorFormError || saveOperatorMutation.error ? (
              <ErrorBox
                error={saveOperatorMutation.error}
                fallback={operatorFormError || '운영자 저장에 실패했습니다'}
              />
            ) : null}
            <button
              className="h-10 w-fit rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
              disabled={
                saveOperatorMutation.isPending ||
                !operatorForm.email.trim() ||
                !operatorForm.displayName.trim() ||
                !operatorForm.roles.length
              }
              type="submit"
            >
              {saveOperatorMutation.isPending
                ? '저장 중…'
                : operatorForm.editingEmail
                  ? '변경사항 저장'
                  : '운영자 추가'}
            </button>
            {operatorForm.editingEmail ? (
              <button
                className="h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600"
                disabled={saveOperatorMutation.isPending}
                onClick={() => {
                  setOperatorForm(emptyOperatorForm);
                  setOperatorFormError('');
                  saveOperatorMutation.reset();
                }}
                type="button"
              >
                수정 취소 · 새 운영자 추가로 돌아가기
              </button>
            ) : null}
          </form>
          <div className="mt-3 border-t border-slate-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              등록된 운영자 · {operators.length}명
            </h3>
            {operatorsQuery.isPending ? (
              <p className="text-sm text-slate-500">
                운영자 목록을 불러오는 중입니다.
              </p>
            ) : null}
            {removeOperatorMutation.error ? (
              <ErrorBox
                error={removeOperatorMutation.error}
                fallback="운영자를 제거하지 못했습니다"
              />
            ) : null}
            <OperatorList
              contestId={contestId}
              canAssignMaster={canAssignMaster}
              disabled={
                saveOperatorMutation.isPending ||
                removeOperatorMutation.isPending
              }
              onEdit={(operator) => {
                if (saveOperatorMutation.isPending) return;
                saveOperatorMutation.reset();
                setOperatorFormError('');
                setOperatorForm({
                  displayName: operator.display_name,
                  editingEmail: operator.email,
                  email: operator.email,
                  roles: contestRolesForAccount(operator, contestId),
                });
              }}
              onRemove={(operator) => removeOperatorMutation.mutate(operator)}
              operators={operators}
            />
          </div>
        </OperatorPanel>
      ) : null}
    </PageLayout>
  );
}

function TextInput({
  disabled,
  helperText,
  label,
  onChange,
  required,
  type = 'text',
  value,
}: {
  disabled?: boolean;
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'email';
  value: string;
}) {
  const helpId = useId();
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        aria-describedby={helperText ? helpId : undefined}
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
      {helperText ? (
        <span
          id={helpId}
          className="text-xs leading-5 font-normal text-slate-500"
        >
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function DateInput({
  label,
  name,
  setForm,
  value,
}: {
  label: string;
  name: 'start_at' | 'end_at' | 'freeze_at';
  setForm: (
    updater: (prev: SettingsForm | null) => SettingsForm | null,
  ) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className="h-11 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        onChange={(event) =>
          setForm((prev) =>
            prev ? { ...prev, [name]: event.target.value } : prev,
          )
        }
        type="datetime-local"
        value={value}
      />
    </label>
  );
}

function AccessSelect({
  disabled,
  helperText,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  helperText?: string;
  label: string;
  onChange: (value: ContestResourceAccess) => void;
  value: ContestResourceAccess;
}) {
  const helpId = useId();
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <select
        aria-describedby={helperText ? helpId : undefined}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as ContestResourceAccess)
        }
        value={value}
      >
        {accessOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? (
        <span
          id={helpId}
          className="text-xs leading-5 font-normal text-slate-500"
        >
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function QuickActions({
  currentStatus,
  disabled,
  onAction,
}: {
  currentStatus: string;
  disabled: boolean;
  onAction: (
    action:
      | 'start-now'
      | 'end-10'
      | 'end-30'
      | 'freeze-now'
      | 'freeze-30'
      | 'freeze-60',
  ) => void;
}) {
  const actions = [
    ['start-now', '지금 시작'],
    ['end-10', '지금부터 10분 뒤 종료'],
    ['end-30', '지금부터 30분 뒤 종료'],
    ['freeze-now', '지금 프리즈'],
    ['freeze-30', '지금부터 30분 뒤 프리즈'],
    ['freeze-60', '지금부터 60분 뒤 프리즈'],
  ] as const;

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm font-semibold text-slate-800">
          빠른 운영 액션
        </strong>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          선택한 상태: {contestStatusLabel(currentStatus)}
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        시간 버튼은 입력값만 바꿉니다. 기존 시간에 더하는 것이 아니라 지금을
        기준으로 설정하며, 아래 ‘설정 저장’을 눌러야 반영됩니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map(([action, label]) => (
          <button
            className="h-9 rounded-lg border border-indigo-200 bg-white px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            key={action}
            disabled={disabled}
            onClick={() => onAction(action)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DivisionList({
  divisions,
  onEdit,
}: {
  divisions: Division[];
  onEdit: (form: DivisionForm) => void;
}) {
  return (
    <div className="grid gap-2">
      {divisions.map((division) => (
        <button
          className="min-w-0 rounded-lg border border-slate-200 px-3 py-3 text-left text-sm transition hover:border-indigo-200 hover:bg-indigo-50"
          key={division.division_id}
          onClick={() =>
            onEdit({
              description: division.description,
              divisionId: division.division_id,
              name: division.name,
            })
          }
          type="button"
        >
          <strong
            className="zoj-break-anywhere font-semibold text-slate-950"
            title={division.name}
          >
            {division.name}
          </strong>
          <span
            className="zoj-truncate-safe mt-1 max-w-full text-xs font-medium text-slate-500"
            title={division.description || '설명 없음'}
          >
            {division.description || '설명 없음'}
          </span>
          <span
            className="mt-2 inline-flex w-fit rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500"
            title={division.code || '코드 없음'}
          >
            코드 {division.code || '-'}
          </span>
        </button>
      ))}
    </div>
  );
}

function OperatorList({
  canAssignMaster,
  contestId,
  disabled,
  onEdit,
  onRemove,
  operators,
}: {
  canAssignMaster: boolean;
  contestId: string;
  disabled: boolean;
  onEdit: (operator: StaffAccount) => void;
  onRemove: (operator: StaffAccount) => void;
  operators: StaffAccount[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {operators.map((operator) => {
        const roles = contestRolesForAccount(operator, contestId);
        const assignedMaster = isAssignedContestMaster(operator, contestId);
        const protectedOperator =
          assignedMaster || (!canAssignMaster && roles.includes('master'));
        return (
          <div
            className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 p-4"
            key={operator.email}
          >
            <div className="grid gap-1">
              <strong className="zoj-break-anywhere font-semibold text-slate-950">
                {operator.display_name}
              </strong>
              <span className="zoj-break-anywhere text-xs text-slate-500">
                {operator.email}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label="부여된 권한">
              {roles.map((role) => (
                <span
                  className={`rounded-md px-2 py-1 text-xs font-medium ${role === 'master' ? 'bg-amber-50 text-amber-800' : 'bg-indigo-50 text-indigo-700'}`}
                  key={role}
                >
                  {CONTEST_ROLES.find((option) => option.value === role)
                    ?.label ?? role}
                </span>
              ))}
            </div>
            {protectedOperator ? (
              <p className="text-xs leading-5 text-slate-500">
                {assignedMaster
                  ? '서비스 관리자가 배정한 대회 마스터입니다.'
                  : '대회 마스터만 이 운영자의 권한을 관리할 수 있습니다.'}
              </p>
            ) : (
              <div className="mt-auto flex gap-2 pt-1">
                <button
                  className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => onEdit(operator)}
                  type="button"
                >
                  이름·권한 수정
                </button>
                <button
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => onRemove(operator)}
                  type="button"
                >
                  제거
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
      {error ? formatApiError(error, fallback) : fallback}
    </p>
  );
}
