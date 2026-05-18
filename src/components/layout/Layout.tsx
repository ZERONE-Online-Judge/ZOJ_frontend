import type { ReactNode } from 'react';
import Footer from '@/components/layout/Footer';
import ContestHeader from '@/components/layout/ContestHeader';
import Header from '@/components/layout/Header';
import { useLocation } from 'react-router-dom';

type LayoutProps = {
  children: ReactNode;
};

function getContestIdFromPath(pathname: string) {
  const [, section, contestId] = pathname.split('/');

  if (section !== 'contests' || !contestId) {
    return null;
  }

  try {
    return decodeURIComponent(contestId);
  } catch {
    return contestId;
  }
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const contestId = getContestIdFromPath(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      {contestId ? <ContestHeader contestId={contestId} /> : <Header />}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
