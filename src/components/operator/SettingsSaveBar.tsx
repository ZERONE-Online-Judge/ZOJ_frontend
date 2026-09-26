import { SettingsIcon } from '@/components/operator/OperatorShell';

export default function SettingsSaveBar({
  changedCount,
  pending,
  savedMessage,
  error,
  onReset,
}: {
  changedCount: number;
  pending: boolean;
  savedMessage: string;
  error?: string;
  onReset: () => void;
}) {
  return (
    <div className="operator-settings-savebar" aria-label="설정 저장">
      <div className="min-w-0" aria-live="polite">
        <strong>
          {changedCount
            ? `${changedCount}개 항목 변경됨`
            : savedMessage || '저장된 설정과 같습니다'}
        </strong>
        {error ? (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        ) : (
          <p>펼친 항목과 접힌 항목의 변경사항을 함께 저장합니다.</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="settings-reset"
          disabled={!changedCount || pending}
          onClick={onReset}
        >
          되돌리기
        </button>
        <button
          type="submit"
          className="settings-save"
          disabled={!changedCount || pending}
        >
          <SettingsIcon />
          {pending ? '저장 중…' : '변경사항 저장'}
        </button>
      </div>
    </div>
  );
}
