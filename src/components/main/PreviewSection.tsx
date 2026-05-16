import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SvgIcon } from '@/utils/Icons';

type PreviewSectionProps = {
  title: string;
  children: ReactNode;
  titleHref?: string;
};

export default function PreviewSection({
  title,
  children,
  titleHref,
}: PreviewSectionProps) {
  const titleContent = (
    <>
      <h2 className="text-3xl font-semibold break-keep text-slate-950 sm:text-4xl">
        {title}
      </h2>
      <SvgIcon name="arrow" size={30} color="#000000" />
    </>
  );

  return (
    <section className="flex flex-col gap-10">
      {titleHref ? (
        <Link
          className="flex w-fit max-w-full items-center gap-3"
          to={titleHref}
        >
          {titleContent}
        </Link>
      ) : (
        <div className="flex max-w-full items-center gap-3">{titleContent}</div>
      )}

      <div>{children}</div>
    </section>
  );
}
