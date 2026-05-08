import { NavLink } from 'react-router-dom';

export type ContestWorkspaceNavItem = {
  label: string;
  href: string;
};

export type ContestTeamInfo = {
  teamName: string;
  division: string;
  participantEmail: string;
};

export type ContestWorkspaceHeaderContent = {
  contestTitle: string;
  team: ContestTeamInfo;
  navItems: ContestWorkspaceNavItem[];
};

type ContestWorkspaceHeaderProps = {
  content: ContestWorkspaceHeaderContent;
};

export default function ContestWorkspaceHeader({
  content,
}: ContestWorkspaceHeaderProps) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-6 flex flex-col gap-5 py-5 lg:mx-64">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Contest Workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              {content.contestTitle}
            </h1>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 px-5 py-3">
            <p className="text-xs font-semibold text-slate-500">팀 정보</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {content.team.teamName} / {content.team.division}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {content.team.participantEmail}
            </p>
          </div>
        </div>

        <nav aria-label="Contest navigation">
          <ul className="flex flex-wrap gap-2">
            {content.navItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  className={({ isActive }) =>
                    [
                      'inline-flex rounded border px-4 py-2 text-sm font-semibold transition',
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
      </div>
    </section>
  );
}
