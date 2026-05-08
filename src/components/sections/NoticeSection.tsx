import NoticeItem, { type NoticeItemData } from '@/components/ui/NoticeItem';
import PreviewSection from '@/components/sections/PreviewSection';

type NoticeSectionProps = {
  notices?: NoticeItemData[];
};

export default function NoticeSection({ notices = [] }: NoticeSectionProps) {
  return (
    <PreviewSection title="공지사항">
      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {notices.slice(0, 5).map((notice, index) => (
          <NoticeItem key={`${notice.title}-${index}`} {...notice} />
        ))}
      </ul>
    </PreviewSection>
  );
}
