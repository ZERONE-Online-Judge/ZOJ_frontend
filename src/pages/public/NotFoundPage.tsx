import { Link } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import PageNotice from '@/shared/ui/PageNotice';

export default function NotFoundPage() {
  return (
    <PageLayout eyebrow="404" title="페이지를 찾을 수 없습니다">
      <PageNotice
        message="주소가 잘못되었거나 더 이상 사용할 수 없는 페이지입니다."
        status="error"
      />
      <Link
        className="bg-zoj-blue flex h-11 w-fit items-center rounded px-5 text-sm font-bold text-white transition hover:bg-blue-700"
        to="/"
      >
        메인으로 이동
      </Link>
    </PageLayout>
  );
}
