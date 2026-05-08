import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  headerContent,
  hepcWorkspaceHeaderContent,
} from '@/data/testContent';
import { navigationRoutes } from '@/routes/routeConfig';
import { SvgIcon } from '@/utils/Icons';

type HepcDivision = 'MOSS' | 'COSS';

function getHepcDivision(pathname: string): HepcDivision {
  return pathname.includes('COSS') ? 'COSS' : 'MOSS';
}

function isHepcWorkspacePath(pathname: string) {
  return (
    pathname === '/HEPC_MOSS' ||
    pathname === '/HEPC_COSS' ||
    pathname === '/HEPC_problem' ||
    pathname.startsWith('/HEPC/MOSS') ||
    pathname.startsWith('/HEPC/COSS')
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white font-sans">
      <div className="relative flex h-20 w-full items-center justify-between px-12">
        <Link className="flex items-center gap-3" to="/">
          <span className="bg-zoj-blue flex size-8 items-center justify-center rounded-lg text-base font-bold text-white" />
          <span className="text-lg font-bold text-slate-950">
            <span className="text-zoj-blue">Z</span>erone{' '}
            <span className="text-zoj-blue">O</span>nline{' '}
            <span className="text-zoj-blue">J</span>udge
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="absolute left-1/2 -translate-x-1/2"
        >
          <ul className="flex items-center gap-24 text-center text-lg leading-7 font-semibold tracking-normal text-slate-700">
            {navigationRoutes.map(({ name, path }) => (
              <li key={path}>
                <NavLink
                  className="hover:text-zoj-blue whitespace-nowrap transition"
                  to={path}
                >
                  {name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          className="hover:border-zoj-blue hover:text-zoj-blue flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-800 transition"
          type="button"
        >
          <SvgIcon name="arrow" size={20} />
          {headerContent.adminLogin}
        </button>
      </div>
    </header>
  );
}

function ContestHeader({ division }: { division: HepcDivision }) {
  const content = hepcWorkspaceHeaderContent[division];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white font-sans">
      <div className="flex min-h-20 w-full items-center justify-between gap-8 px-12 py-3">
        <Link
          className="flex min-w-64 items-center gap-3"
          to={content.navItems[0].href}
        >
          <span className="bg-zoj-blue flex size-8 items-center justify-center rounded-lg text-base font-bold text-white" />
          <span>
            <span className="block text-xs font-semibold text-slate-500">
              HEPC Workspace
            </span>
            <span className="block text-base font-bold text-slate-950">
              {content.contestTitle}
            </span>
          </span>
        </Link>

        <nav aria-label="Contest navigation" className="min-w-0 flex-1">
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {content.navItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'inline-flex whitespace-nowrap rounded border px-3 py-2 text-sm font-semibold transition',
                      isActive
                        ? 'border-zoj-blue bg-zoj-blue text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-zoj-blue hover:text-zoj-blue',
                    ].join(' ')
                  }
                  to={item.href}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-56 rounded border border-slate-200 bg-slate-50 px-4 py-2">
          <p className="text-xs font-semibold text-slate-500">팀 정보</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">
            {content.team.teamName} / {content.team.division}
          </p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            {content.team.participantEmail}
          </p>
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  const { pathname } = useLocation();

  if (isHepcWorkspacePath(pathname)) {
    return <ContestHeader division={getHepcDivision(pathname)} />;
  }

  return <PublicHeader />;
}
