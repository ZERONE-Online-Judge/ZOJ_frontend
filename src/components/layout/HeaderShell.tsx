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
  actionClassName = 'w-48',
  ariaLabel,
  navGapClassName = 'gap-24',
  navItems,
}: HeaderShellProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white font-sans">
      <div className="relative flex h-20 w-full items-center justify-between px-12">
        <Link className="flex items-center gap-3" to="/">
          <SiteBrand />
        </Link>

        <nav
          aria-label={ariaLabel}
          className="absolute left-1/2 -translate-x-1/2"
        >
          <ul
            className={[
              'flex items-center text-center text-lg leading-7 font-semibold tracking-normal text-slate-700',
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
            'flex items-center justify-end gap-3',
            actionClassName,
          ].join(' ')}
        >
          {actions}
        </div>
      </div>
    </header>
  );
}
