import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import SiteBrand from '@/components/layout/SiteBrand';

export type HeaderNavItem = {
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
  navGapClassName = 'gap-6 xl:gap-24',
  navItems,
}: HeaderShellProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white font-sans">
      <div className="relative flex min-h-20 w-full flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 md:flex-nowrap xl:px-12">
        <Link
          aria-label="Zerone Online Judge 홈"
          className="flex shrink-0 items-center gap-3"
          to="/"
        >
          <SiteBrand />
        </Link>

        <nav
          aria-label={ariaLabel}
          className="order-3 w-full min-w-0 overflow-x-auto md:order-none md:w-auto md:flex-1 xl:absolute xl:left-1/2 xl:w-auto xl:flex-none xl:-translate-x-1/2"
        >
          <ul
            className={[
              'flex min-w-max items-center justify-center text-center text-lg leading-7 font-semibold tracking-normal text-slate-700',
              navGapClassName,
            ].join(' ')}
          >
            {navItems.map((item) => (
              <li key={item.key}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'hover:text-zoj-blue whitespace-nowrap transition',
                      isActive ? 'text-zoj-blue' : 'text-slate-700',
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
            'ml-auto flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-3',
            actionClassName,
          ].join(' ')}
        >
          {actions}
        </div>
      </div>
    </header>
  );
}
