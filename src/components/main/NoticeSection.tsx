import NoticeItem, { type NoticeItemData } from '@/components/ui/NoticeItem';
import PreviewSection from '@/components/main/PreviewSection';

type NoticeSectionProps = {
  title: string;
  titleHref?: string;
  notices?: NoticeItemData[];
};

export default function NoticeSection({
  title,
  titleHref,
  notices = [],
}: NoticeSectionProps) {
  return (
    <PreviewSection title={title} titleHref={titleHref}>
      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {notices.slice(0, 5).map((notice, index) => (
          <NoticeItem key={`${notice.title}-${index}`} {...notice} />
        ))}
      </ul>
    </PreviewSection>
  );
}
