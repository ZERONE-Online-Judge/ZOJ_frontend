import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SvgIcon } from '@/utils/Icons';

type PreviewSectionProps = {
  title: string;
  children: ReactNode;
  compact?: boolean;
  titleSize?: 'default' | 'small';
  titleHref?: string;
};

export default function PreviewSection({
  title,
  children,
  compact = false,
  titleSize = 'default',
  titleHref,
}: PreviewSectionProps) {
  const titleContent = (
    <>
      <h2
        className={[
          'font-semibold break-keep text-slate-950',
          titleSize === 'small'
            ? 'text-xl sm:text-2xl'
            : compact
              ? 'text-xl sm:text-2xl'
              : 'text-3xl sm:text-4xl',
        ].join(' ')}
      >
        {title}
      </h2>
      <SvgIcon name="arrow" size={compact ? 22 : 30} color="#000000" />
    </>
  );

  return (
    <section
      className={compact ? 'flex flex-col gap-4' : 'flex flex-col gap-10'}
    >
      {titleHref ? (
        <Link
          className={[
            'flex w-fit max-w-full items-center',
            compact ? 'gap-2' : 'gap-3',
          ].join(' ')}
          to={titleHref}
        >
          {titleContent}
        </Link>
      ) : (
        <div
          className={[
            'flex max-w-full items-center',
            compact ? 'gap-2' : 'gap-3',
          ].join(' ')}
        >
          {titleContent}
        </div>
      )}

      <div>{children}</div>
    </section>
  );
}
