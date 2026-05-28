import type { ReactNode } from 'react';

type PageHeadingVariant = 'page' | 'contest' | 'section';
type PageWidth = '5xl' | '6xl' | '7xl' | 'full';

type PageHeadingProps = {
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  level?: 1 | 2;
  title: ReactNode;
  variant?: PageHeadingVariant;
};

type PageLayoutProps = {
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
  width?: PageWidth;
};

const widthClasses: Record<PageWidth, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-[112rem]',
};

const headingClasses: Record<PageHeadingVariant, string> = {
  page: 'break-keep text-2xl font-black tracking-normal text-slate-950 sm:text-3xl',
  contest: 'break-keep text-3xl font-black tracking-normal text-slate-950 sm:text-4xl',
  section: 'break-keep text-xl font-black text-slate-950 sm:text-2xl',
};

const descriptionClasses: Record<PageHeadingVariant, string> = {
  page: 'text-sm leading-6 text-slate-600 sm:text-base sm:leading-7',
  contest: 'text-sm leading-6 font-medium text-slate-400 sm:text-base',
  section: 'text-sm leading-6 text-slate-600',
};

const eyebrowClasses: Record<PageHeadingVariant, string> = {
  page: 'text-sm font-bold text-zoj-blue',
  contest: 'text-sm font-bold text-zoj-blue',
  section:
    'w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-zoj-blue',
};

export function PageHeading({
  className,
  description,
  eyebrow,
  level = 1,
  title,
  variant = 'page',
}: PageHeadingProps) {
  const HeadingTag = level === 2 ? 'h2' : 'h1';

  return (
    <header className={['grid gap-2', className].filter(Boolean).join(' ')}>
      {eyebrow ? (
        <span className={eyebrowClasses[variant]}>{eyebrow}</span>
      ) : null}
      <HeadingTag className={headingClasses[variant]}>{title}</HeadingTag>
      {description ? (
        <p className={descriptionClasses[variant]}>{description}</p>
      ) : null}
    </header>
  );
}

export default function PageLayout({
  children,
  description,
  eyebrow,
  title,
  width = '7xl',
}: PageLayoutProps) {
  return (
    <section
      className={[
        'animate-page-enter mx-auto grid w-full min-w-0 gap-6 px-4 py-10 font-sans sm:gap-8 sm:px-6 sm:py-14 lg:px-8',
        widthClasses[width],
      ].join(' ')}
    >
      {title ? (
        <PageHeading
          description={description}
          eyebrow={eyebrow}
          title={title}
          variant="page"
        />
      ) : null}
      {children}
    </section>
  );
}
