import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
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
  contestStatusLabel,
  isContestOperationLocked,
} from '@/domains/contestAdministration/logic';
import type { Contest, Division } from '@/domains/contestAdministration/types';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import type { StaffAccount } from '@/domains/identityAccess/types';
import { formatApiError } from '@/shared/api/errors';
import { dateTimeLocalToIso, dateTimeLocalValue } from '@/shared/lib/dateTime';

type SettingsForm = {
  emergency_notice: string;
  end_at: string;
  freeze_at: string;
  organization_name: string;
  overview: string;
  problem_public_after_end: boolean;
  scoreboard_public_after_end: boolean;
  start_at: string;
  status: string;
  submission_public_after_end: boolean;
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
};

const statusOptions = [
  ['draft', '초안'],
  ['schedule_tbd', '일정 미정'],
  ['scheduled', '예정'],
  ['open', '접수 중'],
  ['running', '진행 중'],
  ['ended', '종료'],
  ['finalized', '결과 확정'],
  ['archived', '보관'],
] as const;

function settingsFormFromContest(contest: Contest): SettingsForm {
  return {
    emergency_notice: contest.emergency_notice ?? '',
    end_at: dateTimeLocalValue(contest.end_at),
    freeze_at: dateTimeLocalValue(contest.freeze_at),
    organization_name: contest.organization_name,
    overview: contest.overview,
    problem_public_after_end: contest.problem_public_after_end,
    scoreboard_public_after_end: contest.scoreboard_public_after_end,
    start_at: dateTimeLocalValue(contest.start_at),
    status: contest.status,
    submission_public_after_end: contest.submission_public_after_end,
    title: contest.title,
  };
}

export default function OperatorSettingsPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate contestId={contestId} permission="contest.view">
      {(session) =>
        contestId ? (
          <OperatorSettingsContent
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

function OperatorSettingsContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(
    null,
  );
  const [divisionForm, setDivisionForm] = useState(emptyDivisionForm);
  const [operatorForm, setOperatorForm] = useState(emptyOperatorForm);
  const [formError, setFormError] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });

  const operatorsQuery = useQuery({
    queryKey: ['operator', 'operators', contestId, queryIdentity],
    queryFn: () => listContestOperators(contestId, token),
  });

  const contest = dashboardQuery.data?.contest;
  const divisions = dashboardQuery.data?.divisions ?? [];
  const operators = operatorsQuery.data ?? [];
  const settingsForm =
    settingsDraft?.contestId === contestId
      ? settingsDraft.form
      : contest
        ? settingsFormFromContest(contest)
        : null;
  const operationLocked = contest ? isContestOperationLocked(contest) : false;

  function setSettingsForm(
    updater: (prev: SettingsForm | null) => SettingsForm | null,
  ) {
    const next = updater(settingsForm);
    setSettingsDraft(next ? { contestId, form: next } : null);
  }

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      updateContestSettings(contestId, token, {
        emergency_notice: settingsForm?.emergency_notice.trim() || null,
        end_at: dateTimeLocalToIso(settingsForm!.end_at),
        freeze_at: dateTimeLocalToIso(settingsForm!.freeze_at),
        organization_name: settingsForm!.organization_name.trim(),
        overview: settingsForm!.overview.trim(),
        problem_public_after_end: settingsForm!.problem_public_after_end,
        scoreboard_public_after_end: settingsForm!.scoreboard_public_after_end,
        start_at: dateTimeLocalToIso(settingsForm!.start_at),
        status: settingsForm!.status,
        submission_public_after_end: settingsForm!.submission_public_after_end,
        title: settingsForm!.title.trim(),
      }),
    onSuccess: () => {
      setSettingsDraft(null);
      setFormError('');
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
          })
        : createContestOperator(contestId, token, {
            display_name: operatorForm.displayName.trim(),
            email: operatorForm.email.trim(),
          }),
    onSuccess: () => {
      setOperatorForm(emptyOperatorForm);
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

    updateSettingsMutation.mutate();
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
      | 'freeze-60'
      | 'open-after-end',
  ) {
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
    if (action === 'open-after-end') {
      setSettingsForm((prev) =>
        prev
          ? {
              ...prev,
              problem_public_after_end: true,
              scoreboard_public_after_end: true,
              submission_public_after_end: true,
            }
          : prev,
      );
    }
  }

  function handleDivisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!divisionForm.name.trim()) return;
    saveDivisionMutation.mutate();
  }

  function handleOperatorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operatorForm.editingEmail && !operatorForm.email.trim()) return;
    saveOperatorMutation.mutate();
  }

  return (
    <PageLayout
      description="대회 일정, 공개 범위, 참가 유형, 운영자 권한을 조정합니다."
      eyebrow="Operator"
      title={`${contest?.title ?? '대회'} 설정`}
      width="7xl"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || operatorsQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || operatorsQuery.error}
          fallback="설정 데이터를 불러오지 못했습니다"
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.45fr)]">
        <OperatorPanel
          description="대회 기본 정보와 공개 정책을 수정합니다."
          title="대회 설정"
        >
          {settingsForm ? (
            <form className="grid gap-4" onSubmit={handleSettingsSubmit}>
              {operationLocked ? (
                <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  대회가 진행 중이어서 기본 정보와 상태 변경은 잠겨 있습니다.
                  종료/프리즈 시간과 긴급 공지만 조정하세요.
                </p>
              ) : null}
              <QuickActions
                currentStatus={settingsForm.status}
                onAction={applyQuickAction}
              />
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
              <label className="grid gap-2 text-sm font-black text-slate-700">
                상태
                <select
                  className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
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
              <label className="grid gap-2 text-sm font-black text-slate-700">
                개요
                <textarea
                  className="min-h-28 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
                  disabled={operationLocked}
                  onChange={(event) =>
                    setSettingsForm((prev) =>
                      prev ? { ...prev, overview: event.target.value } : prev,
                    )
                  }
                  value={settingsForm.overview}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <DateInput
                  label="시작"
                  name="start_at"
                  setForm={setSettingsForm}
                  value={settingsForm.start_at}
                />
                <DateInput
                  label="종료"
                  name="end_at"
                  setForm={setSettingsForm}
                  value={settingsForm.end_at}
                />
                <DateInput
                  label="프리즈"
                  name="freeze_at"
                  setForm={setSettingsForm}
                  value={settingsForm.freeze_at}
                />
              </div>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                긴급 공지
                <input
                  className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setSettingsForm((prev) =>
                      prev
                        ? { ...prev, emergency_notice: event.target.value }
                        : prev,
                    )
                  }
                  value={settingsForm.emergency_notice}
                />
              </label>
              <div className="grid gap-2 md:grid-cols-3">
                <Toggle
                  checked={settingsForm.problem_public_after_end}
                  label="종료 후 문제 공개"
                  onChange={(checked) =>
                    setSettingsForm((prev) =>
                      prev
                        ? { ...prev, problem_public_after_end: checked }
                        : prev,
                    )
                  }
                />
                <Toggle
                  checked={settingsForm.scoreboard_public_after_end}
                  label="종료 후 스코어보드 공개"
                  onChange={(checked) =>
                    setSettingsForm((prev) =>
                      prev
                        ? { ...prev, scoreboard_public_after_end: checked }
                        : prev,
                    )
                  }
                />
                <Toggle
                  checked={settingsForm.submission_public_after_end}
                  label="종료 후 제출 공개"
                  onChange={(checked) =>
                    setSettingsForm((prev) =>
                      prev
                        ? { ...prev, submission_public_after_end: checked }
                        : prev,
                    )
                  }
                />
              </div>

              {formError || updateSettingsMutation.error ? (
                <ErrorBox
                  error={updateSettingsMutation.error}
                  fallback={formError || '대회 설정 저장에 실패했습니다'}
                />
              ) : null}

              <button
                className="inline-flex h-11 w-fit items-center gap-2 rounded bg-indigo-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-800 disabled:bg-slate-300"
                disabled={updateSettingsMutation.isPending}
                type="submit"
              >
                <SettingsIcon />
                {updateSettingsMutation.isPending ? '저장 중' : '설정 저장'}
              </button>
            </form>
          ) : (
            <p className="text-sm font-bold text-slate-500">
              대회 설정을 불러오는 중입니다.
            </p>
          )}
        </OperatorPanel>

        <div className="grid gap-6">
          <OperatorPanel
            description="참가 유형을 추가하거나 이름을 수정합니다."
            title="참가 유형"
          >
            <form className="grid gap-3" onSubmit={handleDivisionSubmit}>
              <TextInput
                label="유형 이름"
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
                className="h-10 rounded bg-indigo-950 px-4 text-sm font-black text-white"
                type="submit"
              >
                {divisionForm.divisionId ? '유형 수정' : '유형 추가'}
              </button>
            </form>
            <DivisionList divisions={divisions} onEdit={setDivisionForm} />
          </OperatorPanel>

          <OperatorPanel
            description="대회 운영 권한을 함께 관리할 계정을 등록합니다."
            title="운영자"
          >
            <form className="grid gap-3" onSubmit={handleOperatorSubmit}>
              <TextInput
                disabled={Boolean(operatorForm.editingEmail)}
                label="이메일"
                onChange={(value) =>
                  setOperatorForm((prev) => ({ ...prev, email: value }))
                }
                value={operatorForm.email}
              />
              <TextInput
                label="표시 이름"
                onChange={(value) =>
                  setOperatorForm((prev) => ({ ...prev, displayName: value }))
                }
                value={operatorForm.displayName}
              />
              {saveOperatorMutation.error ? (
                <ErrorBox
                  error={saveOperatorMutation.error}
                  fallback="운영자 저장에 실패했습니다"
                />
              ) : null}
              <button
                className="h-10 rounded bg-indigo-950 px-4 text-sm font-black text-white"
                type="submit"
              >
                {operatorForm.editingEmail ? '운영자 수정' : '운영자 추가'}
              </button>
            </form>
            <OperatorList
              onEdit={(operator) =>
                setOperatorForm({
                  displayName: operator.display_name,
                  editingEmail: operator.email,
                  email: operator.email,
                })
              }
              onRemove={(operator) => removeOperatorMutation.mutate(operator)}
              operators={operators}
            />
          </OperatorPanel>
        </div>
      </div>
    </PageLayout>
  );
}

function TextInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
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
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
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

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
      <input
        checked={checked}
        className="size-4 accent-indigo-600"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function QuickActions({
  currentStatus,
  onAction,
}: {
  currentStatus: string;
  onAction: (
    action:
      | 'start-now'
      | 'end-10'
      | 'end-30'
      | 'freeze-now'
      | 'freeze-30'
      | 'freeze-60'
      | 'open-after-end',
  ) => void;
}) {
  const actions = [
    ['start-now', '지금 시작'],
    ['end-10', '종료 +10분'],
    ['end-30', '종료 +30분'],
    ['freeze-now', '지금 프리즈'],
    ['freeze-30', '프리즈 +30분'],
    ['freeze-60', '프리즈 +60분'],
    ['open-after-end', '종료 후 공개'],
  ] as const;

  return (
    <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm font-black text-slate-800">
          빠른 운영 액션
        </strong>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
          현재 상태: {contestStatusLabel(currentStatus)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(([action, label]) => (
          <button
            className="h-9 rounded border border-indigo-200 bg-white px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
            key={action}
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
          className="rounded border border-slate-200 px-3 py-3 text-left text-sm transition hover:border-indigo-200 hover:bg-indigo-50"
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
          <strong className="font-black text-slate-950">{division.name}</strong>
          <span className="mt-1 block text-xs font-bold text-slate-500">
            {division.code || '코드 없음'}
          </span>
        </button>
      ))}
    </div>
  );
}

function OperatorList({
  onEdit,
  onRemove,
  operators,
}: {
  onEdit: (operator: StaffAccount) => void;
  onRemove: (operator: StaffAccount) => void;
  operators: StaffAccount[];
}) {
  return (
    <div className="grid gap-2">
      {operators.map((operator) => (
        <div
          className="rounded border border-slate-200 px-3 py-3"
          key={operator.email}
        >
          <strong className="block font-black text-slate-950">
            {operator.display_name}
          </strong>
          <span className="block text-xs font-bold text-slate-500">
            {operator.email}
          </span>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded border border-indigo-200 px-3 py-1 text-xs font-black text-indigo-700"
              onClick={() => onEdit(operator)}
              type="button"
            >
              수정
            </button>
            <button
              className="rounded border border-rose-200 px-3 py-1 text-xs font-black text-rose-600"
              onClick={() => onRemove(operator)}
              type="button"
            >
              제거
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
      {error ? formatApiError(error, fallback) : fallback}
    </p>
  );
}
