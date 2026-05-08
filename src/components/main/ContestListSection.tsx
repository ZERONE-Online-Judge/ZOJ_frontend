import ContestCard, { type ContestCardData } from '@/components/ui/ContestCard';
import PreviewSection from '@/components/main/PreviewSection';

type ContestListSectionProps = {
  title: string;
  titleHref?: string;
  contests?: ContestCardData[];
};

function getContestCardSpan(total: number, index: number) {
  if (total === 1) {
    return 'md:col-span-6';
  }

  if (total === 2 || total === 4) {
    return 'md:col-span-3';
  }

  if (total === 5 && index > 2) {
    return 'md:col-span-3';
  }

  return 'md:col-span-2';
}

export default function ContestListSection({
  title,
  titleHref,
  contests = [],
}: ContestListSectionProps) {
  const visibleContests = contests.slice(0, 6);

  return (
    <PreviewSection title={title} titleHref={titleHref}>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-6">
        {visibleContests.map((contest, index) => (
          <ContestCard
            className={getContestCardSpan(visibleContests.length, index)}
            key={`${contest.title}-${index}`}
            {...contest}
          />
        ))}
      </ul>
    </PreviewSection>
  );
}
