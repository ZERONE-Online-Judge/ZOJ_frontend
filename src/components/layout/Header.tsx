import { Link, NavLink } from 'react-router-dom';
import { navigationRoutes } from '@/routes/routeConfig';

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white font-sans">
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[auto_1fr_auto] items-center px-8">
        <Link className="flex items-center gap-3" to="/">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#7B61FF] text-base font-bold text-white"/>
          <span className="text-lg font-bold text-slate-950">
            <span className="text-[#7B61FF]">Z</span>erone{' '}
            <span className="text-[#7B61FF]">O</span>nline{' '}
            <span className="text-[#7B61FF]">J</span>udge
          </span>
        </Link>

        <nav aria-label="Main navigation" className="justify-self-center">
          <ul className="flex items-center gap-[100px] text-sm font-semibold text-slate-700">
            {navigationRoutes.map(({ name, path }) => (
              <li key={path}>
                <NavLink className="transition hover:text-[#7B61FF]" to={path}>
                  {name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <button
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-800 transition hover:border-[#7B61FF] hover:text-[#7B61FF]"
          type="button"
        >
          관리자 로그인
        </button>
      </div>
    </header>
  );
}
