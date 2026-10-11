import { ChoiceCard, SettingsCard } from '@/components/common/ManagementCards';
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
  function toggleRole(role: ContestRole, checked: boolean) {
    if (!checked) {
      onChange(value.filter((item) => item !== role));
      return;
    }
    if (role === 'problem_author') {
      onChange([
        ...value.filter(
          (item) => item !== 'master' && item !== 'participant_preview',
        ),
        ...(value.includes('problem_reviewer')
          ? []
          : ['problem_reviewer' as const]),
        role,
      ]);
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
    <SettingsCard
      title="권한 (필수)"
      disabled={disabled}
      description="담당할 권한을 하나 이상 선택하세요. 대회 마스터와 참가자 미리보기는 각각 단독으로 선택합니다. 출제진을 선택하면 검수진 권한도 자동으로 포함됩니다."
      hint={
        !canAssignMaster
          ? '대회 마스터 권한은 마스터만 부여할 수 있습니다.'
          : undefined
      }
    >
      <div className="zoj-settings-fields">
        {CONTEST_ROLES.filter(
          (role) =>
            role.value !== 'owner' &&
            (canAssignMaster || role.value !== 'master'),
        ).map((role) => (
          <ChoiceCard
            key={role.value}
            checked={
              value.includes(role.value) ||
              (role.value === 'problem_reviewer' &&
                value.includes('problem_author'))
            }
            disabled={
              disabled ||
              (role.value === 'problem_reviewer' &&
                value.includes('problem_author'))
            }
            onChange={(checked) => toggleRole(role.value, checked)}
            type="checkbox"
            value={role.value}
            title={role.label}
            description={role.description}
          />
        ))}
      </div>
    </SettingsCard>
  );
}
