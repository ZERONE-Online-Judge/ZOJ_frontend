import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import SiteBrand from '@/components/layout/SiteBrand';

export type HeaderNavItem = {
  activeClassName?: string;
  key: string;
  label: string;
  to: string;
  end?: boolean;
};

type HeaderShellProps = {
  actions: ReactNode;
  actionClassName?: string;
  ariaLabel: string;
  navGapClassName?: string;
  navItems: HeaderNavItem[];
};

export default function HeaderShell({
  actions,
  actionClassName = 'xl:w-48',
  ariaLabel,
  navGapClassName = 'gap-2 md:gap-6 xl:gap-24',
  navItems,
}: HeaderShellProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white font-sans">
      <div className="relative flex min-h-16 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:min-h-20 sm:px-6 sm:py-3 md:flex-nowrap xl:px-12">
        <Link
          aria-label="Zerone Online Judge 홈"
          className="flex shrink-0 items-center gap-3"
          to="/"
        >
          <SiteBrand />
        </Link>

        <nav
          aria-label={ariaLabel}
          className="order-3 -mx-3 w-[calc(100%+1.5rem)] min-w-0 overflow-x-auto border-t border-slate-100 px-3 pt-2 pb-1 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 md:order-none md:mx-0 md:w-auto md:flex-1 md:border-t-0 md:px-0 md:pt-0 md:pb-0 xl:absolute xl:left-1/2 xl:w-auto xl:flex-none xl:-translate-x-1/2"
        >
          <ul
            className={[
              'flex min-w-max items-center text-center text-sm leading-6 font-bold tracking-normal text-slate-700 sm:text-base md:justify-center md:text-lg md:font-semibold',
              navGapClassName,
            ].join(' ')}
          >
            {navItems.map((item) => (
              <li key={item.key}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'inline-flex h-8 items-center rounded-full px-3 whitespace-nowrap transition hover:bg-slate-50 hover:text-zoj-blue md:h-auto md:rounded-none md:px-0 md:hover:bg-transparent',
                      isActive ? 'text-zoj-blue' : 'text-slate-700',
                      isActive ? 'bg-blue-50 md:bg-transparent' : '',
                      isActive ? (item.activeClassName ?? '') : '',
                    ].join(' ')
                  }
                  end={item.end}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={[
            'ml-auto flex max-w-full flex-nowrap items-center justify-end gap-2 sm:gap-3',
            actionClassName,
          ].join(' ')}
        >
          {actions}
        </div>
      </div>
    </header>
  );
}
