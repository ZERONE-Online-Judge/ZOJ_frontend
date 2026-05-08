import ContestActivityPanel, {
  type ContestActivityContent,
} from '@/components/hepc/ContestActivityPanel';
import ProblemStatusPanel, {
  type ProblemStatusContent,
} from '@/components/hepc/ProblemStatusPanel';

type ContestHomeDashboardProps = {
  activity: ContestActivityContent;
  division: 'MOSS' | 'COSS';
  problems: ProblemStatusContent;
};

export default function ContestHomeDashboard({
  activity,
  division,
  problems,
}: ContestHomeDashboardProps) {
  return (
    <section className="mx-6 mt-10 grid grid-cols-1 gap-6 lg:mx-64 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <ProblemStatusPanel content={problems} />
      <ContestActivityPanel content={activity} division={division} />
    </section>
  );
}
