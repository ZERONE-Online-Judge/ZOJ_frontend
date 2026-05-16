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
      <div className="relative flex min-h-20 w-full flex-wrap items-center justify-between gap-y-3 px-4 py-3 sm:px-6 xl:flex-nowrap xl:px-12">
        <Link className="flex shrink-0 items-center gap-3" to="/">
          <SiteBrand />
        </Link>

        <nav
          aria-label={ariaLabel}
          className="order-3 w-full overflow-x-auto xl:absolute xl:left-1/2 xl:order-none xl:w-auto xl:-translate-x-1/2"
        >
          <ul
            className={[
              'flex min-w-max items-center justify-center text-center text-sm leading-7 font-semibold tracking-normal text-slate-700 sm:text-base xl:text-lg',
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
