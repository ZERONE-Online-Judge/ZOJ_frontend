import ModalDialog, { ModalButton } from '@/shared/ui/ModalDialog';

export default function SessionExpiredNotice({
  onHome,
  onLogin,
}: {
  onHome: () => void;
  onLogin: () => void;
}) {
  return (
    <ModalDialog
      titleId="session-expired-title"
      title="로그아웃되었습니다"
      footer={
        <>
          <ModalButton onClick={onHome}>메인으로 돌아가기</ModalButton>
          <ModalButton tone="primary" onClick={onLogin}>
            다시 로그인
          </ModalButton>
        </>
      }
    >
      <p className="zoj-modal-copy">
        운영자가 세션을 해제했거나 로그인 유지 시간이 지나 연결이
        종료되었습니다. 다른 기기에서 로그인한 경우에도 종료될 수 있습니다.
      </p>
      <p className="zoj-modal-copy mt-3">
        계속 이용하려면 다시 로그인해 주세요.
      </p>
    </ModalDialog>
  );
}
