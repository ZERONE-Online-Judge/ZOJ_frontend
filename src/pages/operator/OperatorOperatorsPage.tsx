import { type FormEvent, useId, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import ContestRoleSelector from '@/components/operator/ContestRoleSelector';
import {
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
} from '@/components/operator/OperatorShell';
import { sharedUiText } from '@/data/uiText';
import {
  createContestOperator,
  getOperatorContestDashboard,
  listContestOperators,
  removeContestOperator,
  updateContestOperator,
} from '@/domains/contestAdministration/api';
import {
  CONTEST_ROLES,
  contestRoleTitleForAccount,
  contestRolesForAccount,
  isAssignedContestMaster,
  type ContestRole,
} from '@/domains/identityAccess/contestRoles';
import {
  hasContestPermission,
  isContestMaster,
} from '@/domains/identityAccess/permissions';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import type {
  StaffAccount,
  StaffSession,
} from '@/domains/identityAccess/types';
import { formatApiError } from '@/shared/api/errors';

type OperatorForm = {
  displayName: string;
  email: string;
  editingEmail: string;
  roles: ContestRole[];
};

const emptyOperatorForm: OperatorForm = {
  displayName: '',
  editingEmail: '',
  email: '',
  roles: [],
};

export default function OperatorOperatorsPage() {
  const { contestId } = useParams();
  return (
    <OperatorAccessGate contestId={contestId} permission="contest.staff.manage">
      {(session) =>
        contestId ? (
          <OperatorOperatorsContent
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

function OperatorOperatorsContent({
  contestId,
  session,
}: {
  contestId: string;
  session: StaffSession;
}) {
  const token = session.accessToken;
  const canManageStaff = hasContestPermission(
    session,
    contestId,
    'contest.staff.manage',
  );
  const canAssignMaster = isContestMaster(session, contestId);
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [operatorForm, setOperatorForm] = useState(emptyOperatorForm);
  const [operatorFormError, setOperatorFormError] = useState('');
  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const operatorsQuery = useQuery({
    queryKey: ['operator', 'operators', contestId, queryIdentity],
    queryFn: () => listContestOperators(contestId, token),
  });
  const operators = (operatorsQuery.data ?? []).filter(
    (operator) => !operator.is_service_master,
  );
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
      width="full"
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 운영자 추가`}
      description="이 대회를 운영할 구성원을 추가하고 이름과 담당 권한을 관리합니다."
    >
      <OperatorTabs contestId={contestId} />
      {dashboardQuery.error || operatorsQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || operatorsQuery.error}
          fallback="운영자 정보를 불러오지 못했습니다"
        />
      ) : null}
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
              saveOperatorMutation.isPending || removeOperatorMutation.isPending
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
        const roleTitle = contestRoleTitleForAccount(operator, contestId);
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
                {roleTitle ? (
                  <span className="font-medium text-slate-500">
                    {' '}
                    / {roleTitle}
                  </span>
                ) : null}
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
