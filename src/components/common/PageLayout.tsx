import type { ReactNode } from 'react';

type PageHeadingVariant = 'page' | 'contest' | 'section';
type PageWidth = '5xl' | '6xl' | '7xl';

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
};

const headingClasses: Record<PageHeadingVariant, string> = {
  page: 'text-3xl font-black tracking-normal text-slate-950',
  contest: 'text-4xl font-black tracking-normal text-slate-950',
  section: 'text-2xl font-black text-slate-950',
};

const descriptionClasses: Record<PageHeadingVariant, string> = {
  page: 'text-base leading-7 text-slate-600',
  contest: 'text-base font-medium text-slate-400',
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
  width = '5xl',
}: PageLayoutProps) {
  return (
    <section
      className={[
        'mx-auto grid w-full gap-8 px-6 py-14 font-sans lg:px-8',
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
