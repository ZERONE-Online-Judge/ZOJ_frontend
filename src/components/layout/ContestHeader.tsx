import HeaderAuthControls from '@/components/layout/HeaderAuthControls';
import HeaderShell, {
  type HeaderNavItem,
} from '@/components/layout/HeaderShell';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';

type ContestHeaderProps = {
  contestId: string;
};

const contestNavigationRoutes = [
  { name: '개요', path: '' },
  { name: '문제집', path: 'problems' },
  { name: '채점 현황', path: 'submissions' },
  { name: '스코어 보드', path: 'scoreboard' },
  { name: '게시판', path: 'board' },
] as const;

function contestNavItems(contestId: string): HeaderNavItem[] {
  return contestNavigationRoutes.map(({ name, path }) => ({
    end: !path,
    key: path || 'overview',
    label: name,
    to: path ? `/contests/${contestId}/${path}` : `/contests/${contestId}`,
  }));
}

export default function ContestHeader({ contestId }: ContestHeaderProps) {
  const generalSession = useSessionStore((state) => state.generalSession);
  const participantSession = useSessionStore(
    (state) => state.participantSession,
  );
  const participantContest = generalSession?.participantContests.find(
    (item) => item.contest.contest_id === contestId,
  );
  const teamName =
    participantContest?.team.team_name ??
    (participantSession?.contestId === contestId
      ? participantSession.team.team_name
      : null);

  return (
    <HeaderShell
      actionClassName="min-w-80"
      actions={
        <HeaderAuthControls
          loginTo={`/login?reason=contest&contestId=${encodeURIComponent(contestId)}`}
          teamName={teamName}
        />
      }
      ariaLabel="Contest navigation"
      navGapClassName="gap-16"
      navItems={contestNavItems(contestId)}
    />
  );
}
