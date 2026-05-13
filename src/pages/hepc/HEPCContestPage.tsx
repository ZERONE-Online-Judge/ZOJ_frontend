import ContestHomeDashboard from '@/components/hepc/ContestHomeDashboard';
import ContestDetailPanel from '@/components/hepc/ContestDetailPanel';
import ParticipantListPanel from '@/components/hepc/ParticipantListPanel';
import PageInfoSection from '@/components/common/PageInfoSection';
import {
  hepcContestActivityContent,
  hepcContestDetailContent,
  hepcContestPageContent,
  hepcParticipantListContent,
  hepcProblemStatusContent,
} from '@/data/testContent';

type HEPCContestPageProps = {
  division: 'MOSS' | 'COSS';
};

export default function HEPCContestPage({ division }: HEPCContestPageProps) {
  return (
    <>
      <ContestDetailPanel content={hepcContestDetailContent[division]} />
      <ContestHomeDashboard
        activity={hepcContestActivityContent}
        division={division}
        problems={hepcProblemStatusContent}
      />
      <ParticipantListPanel content={hepcParticipantListContent} />
      <PageInfoSection content={hepcContestPageContent[division]} />
    </>
  );
}
