import PreviewSection from '@/components/main/PreviewSection';
import ContestListItem from '@/components/ui/ContestListItem';
import { contestAccessPhase } from '@/domains/contestAdministration/logic';
import { toContestCardData } from '@/domains/contestAdministration/presentation';
import type { Contest } from '@/domains/contestAdministration/types';

type ContestSectionKey = 'running' | 'upcoming' | 'ended';

type ContestListSectionProps = {
  title: string;
  titleHref?: string;
  contests?: Contest[];
};

const contestSections: {
  key: ContestSectionKey;
  title: string;
}[] = [
  { key: 'running', title: '진행중 대회' },
  { key: 'upcoming', title: '운영예정 대회' },
  { key: 'ended', title: '이미 종료된 대회' },
];

function sectionKeyForContest(contest: Contest): ContestSectionKey {
  const phase = contestAccessPhase(contest);
  if (phase === 'running') return 'running';
  if (phase === 'ended') return 'ended';
  return 'upcoming';
}

function contestSortDate(contest: Contest) {
  const sectionKey = sectionKeyForContest(contest);
  const value = sectionKey === 'ended' ? contest.end_at : contest.start_at;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortContestsByRecentDate(contests: Contest[]) {
  return [...contests].sort((a, b) => contestSortDate(b) - contestSortDate(a));
}

export default function ContestListSection({
  title,
  titleHref,
  contests = [],
}: ContestListSectionProps) {
  const sections = contestSections.map((section) => ({
    ...section,
    contests: sortContestsByRecentDate(
      contests.filter((contest) => sectionKeyForContest(contest) === section.key),
    ),
  }));

  return (
    <PreviewSection title={title} titleHref={titleHref}>
      <div className="grid gap-7">
        {sections.map((section) =>
          section.contests.length > 0 ? (
            <section className="grid gap-3" key={section.key}>
              <header className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">
                  {section.title}
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {section.contests.length}개
                </span>
              </header>
              <ul className="grid grid-cols-1 gap-2.5">
                {section.contests.map((contest) => (
                  <ContestListItem
                    key={contest.contest_id}
                    {...toContestCardData(contest)}
                  />
                ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>
    </PreviewSection>
  );
}
