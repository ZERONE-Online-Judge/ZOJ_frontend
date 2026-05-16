import { Link } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { publicPageText } from '@/data/uiText';
import PageNotice from '@/shared/ui/PageNotice';

export default function NotFoundPage() {
  return (
    <PageLayout
      eyebrow={publicPageText.notFound.eyebrow}
      title={publicPageText.notFound.title}
    >
      <PageNotice message={publicPageText.notFound.message} status="error" />
      <Link
        className="bg-zoj-blue flex h-11 w-fit items-center rounded px-5 text-sm font-bold text-white transition hover:bg-blue-700"
        to="/"
      >
        {publicPageText.notFound.homeLink}
      </Link>
    </PageLayout>
  );
}
