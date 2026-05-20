import HeaderAuthControls from '@/components/layout/HeaderAuthControls';
import HeaderShell, {
  type HeaderNavItem,
} from '@/components/layout/HeaderShell';
import { contestHeaderNavText } from '@/data/uiText';

type ContestHeaderProps = {
  contestId: string;
};

function contestNavItems(contestId: string): HeaderNavItem[] {
  return contestHeaderNavText.map(({ name, path }) => ({
    end: !path,
    key: path || 'overview',
    label: name,
    to: path ? `/contests/${contestId}/${path}` : `/contests/${contestId}`,
  }));
}

export default function ContestHeader({ contestId }: ContestHeaderProps) {
  return (
    <HeaderShell
      actionClassName="min-w-0 xl:min-w-80"
      actions={
        <HeaderAuthControls
          loginTo={`/login?reason=contest&contestId=${encodeURIComponent(contestId)}`}
        />
      }
      ariaLabel="Contest navigation"
      navGapClassName="gap-16"
      navItems={contestNavItems(contestId)}
    />
  );
}
