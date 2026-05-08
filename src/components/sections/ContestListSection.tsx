import ContestCard, { type ContestCardData } from '@/components/ui/ContestCard';
import PreviewSection from '@/components/sections/PreviewSection';

type ContestListSectionProps = {
  contests?: ContestCardData[];
};

export default function ContestListSection({
  contests = [],
}: ContestListSectionProps) {
  return (
    <PreviewSection title="대회 목록">
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {contests.slice(0, 6).map((contest, index) => (
          <ContestCard key={`${contest.title}-${index}`} {...contest} />
        ))}
      </ul>
    </PreviewSection>
  );
}
