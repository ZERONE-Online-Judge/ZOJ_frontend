import { useId } from 'react';
import {
  CONTEST_ROLES,
  type ContestRole,
} from '@/domains/identityAccess/contestRoles';

export default function ContestRoleSelector({
  canAssignMaster,
  disabled,
  onChange,
  value,
}: {
  canAssignMaster: boolean;
  disabled?: boolean;
  onChange: (roles: ContestRole[]) => void;
  value: ContestRole[];
}) {
  const helpId = useId();

  function toggleRole(role: ContestRole, checked: boolean) {
    if (!checked) {
      onChange(value.filter((item) => item !== role));
      return;
    }
    onChange(
      role === 'master' || role === 'participant_preview'
        ? [role]
        : [
            ...value.filter(
              (item) => item !== 'master' && item !== 'participant_preview',
            ),
            role,
          ],
    );
  }

  return (
    <fieldset
      aria-describedby={helpId}
      disabled={disabled}
      className="grid min-w-0 gap-3"
    >
      <legend className="mb-2 text-sm font-semibold text-slate-700">
        권한 (필수)
      </legend>
      <p id={helpId} className="text-xs leading-5 text-slate-500">
        담당할 권한을 하나 이상 선택하세요. 대회 마스터와 참가자 미리보기는 각각
        단독으로 선택합니다. 나머지 권한은 함께 선택할 수 있습니다.
        {!canAssignMaster
          ? ' 대회 마스터 권한은 마스터만 부여할 수 있습니다.'
          : ''}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {CONTEST_ROLES.filter(
          (role) => canAssignMaster || role.value !== 'master',
        ).map((role) => (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${value.includes(role.value) ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            key={role.value}
          >
            <input
              checked={value.includes(role.value)}
              className="mt-0.5 size-4 shrink-0 accent-indigo-600"
              onChange={(event) => toggleRole(role.value, event.target.checked)}
              type="checkbox"
            />
            <span className="grid min-w-0 gap-1">
              <span className="text-sm font-semibold text-slate-800">
                {role.label}
              </span>
              <span className="text-xs leading-5 text-slate-500">
                {role.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
