import ModalDialog, { ModalButton } from '@/shared/ui/ModalDialog';
import { Link } from 'react-router-dom';
import { accessText, loginPageText } from '@/data/uiText';
import { SvgIcon } from '@/utils/Icons';

type ContestAccessDeniedModalProps = {
  loginTo?: string;
  onClose: () => void;
};

export default function ContestAccessDeniedModal({
  loginTo,
  onClose,
}: ContestAccessDeniedModalProps) {
  return (
    <ModalDialog
      titleId="contest-access-denied-title"
      title={accessText.participantNoAccessTitle}
      icon={<SvgIcon name="alert" size={20} />}
      onClose={onClose}
      footer={
        <>
          <ModalButton onClick={onClose}>
            {loginPageText.modalConfirm}
          </ModalButton>
          {loginTo ? (
            <Link className="zoj-modal-action" data-tone="primary" to={loginTo}>
              로그인
            </Link>
          ) : null}
        </>
      }
    >
      <p className="zoj-modal-copy">
        {accessText.participantNoAccessDescription}
      </p>
      <p className="zoj-modal-copy mt-3">
        {accessText.participantNoAccessMessage}
      </p>
    </ModalDialog>
  );
}
