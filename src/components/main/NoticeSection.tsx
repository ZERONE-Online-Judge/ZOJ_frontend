import type { ReactNode } from 'react';
import NoticeItem, { type NoticeItemData } from '@/components/ui/NoticeItem';
import PreviewSection from '@/components/main/PreviewSection';

type NoticeSectionProps = {
  children?: ReactNode;
  compact?: boolean;
  titleSize?: 'default' | 'small';
  title: string;
  titleHref?: string;
  notices?: NoticeItemData[];
};

export default function NoticeSection({
  children,
  compact = false,
  titleSize = 'default',
  title,
  titleHref,
  notices = [],
}: NoticeSectionProps) {
  return (
    <PreviewSection
      compact={compact}
      title={title}
      titleHref={titleHref}
      titleSize={titleSize}
    >
      {notices.length > 0 ? (
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          {notices.slice(0, 5).map((notice, index) => (
            <NoticeItem
              compact={compact}
              key={`${notice.title}-${index}`}
              {...notice}
            />
          ))}
        </ul>
      ) : (
        children
      )}
    </PreviewSection>
  );
}
