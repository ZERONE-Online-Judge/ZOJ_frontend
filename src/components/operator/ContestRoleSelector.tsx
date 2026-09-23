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
      description="담당할 권한을 하나 이상 선택하세요. 대회 마스터와 참가자 미리보기는 각각 단독으로 선택합니다. 나머지 권한은 함께 선택할 수 있습니다."
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
            checked={value.includes(role.value)}
            disabled={disabled}
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
