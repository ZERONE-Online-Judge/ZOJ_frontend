import { Link, NavLink } from 'react-router-dom';
import { navigationRoutes } from '@/routes/routeConfig';

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
        <div className="w-48" aria-hidden="true" />
      </div>
    </header>
  );
}

export default function Header() {
  return <PublicHeader />;
}
