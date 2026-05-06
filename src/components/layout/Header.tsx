import { Link, NavLink } from 'react-router-dom';
import { SvgIcon } from '@/assets/icons/Icons';
import { navigationRoutes } from '@/routes/routeConfig';

export default function Header() {
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
          관리자 로그인
        </button>
      </div>
    </header>
  );
}
