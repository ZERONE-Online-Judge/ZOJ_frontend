import type { ComponentType } from 'react';
import HEPCCOSSPage from '@/pages/hepc/HEPCCOSSPage';
import HEPCLoginPage from '@/pages/hepc/HEPCLoginPage';
import HEPCMOSSPage from '@/pages/hepc/HEPCMOSSPage';
import HEPCNoticeDetailPage from '@/pages/hepc/HEPCNoticeDetailPage';
import HEPCProblemPage from '@/pages/hepc/HEPCProblemPage';
import HEPCQuestionDetailPage from '@/pages/hepc/HEPCQuestionDetailPage';
import HEPCQuestionWritePage from '@/pages/hepc/HEPCQuestionWritePage';
import HEPCSubmissionDetailPage from '@/pages/hepc/HEPCSubmissionDetailPage';
import HEPCSubmissionWaitingPage from '@/pages/hepc/HEPCSubmissionWaitingPage';
import HEPCWorkspaceSubPage from '@/pages/hepc/HEPCWorkspaceSubPage';
import MainPage from '@/pages/main/MainPage';
import BoardPage from '@/pages/public/BoardPage';
import ContactPage from '@/pages/public/ContactPage';
import ContestListPage from '@/pages/public/ContestListPage';
import JudgeStatusPage from '@/pages/public/JudgeStatusPage';
import PublicContestDetailPage from '@/pages/public/PublicContestDetailPage';
import PublicNoticeDetailPage from '@/pages/public/PublicNoticeDetailPage';
import RulesPage from '@/pages/public/RulesPage';
import { navigationContent } from '@/data/testContent';

export type AppRoute = {
  name: string;
  path: string;
  Component: ComponentType;
  showInNavigation?: boolean;
};

export const appRoutes = [
  {
    name: navigationContent.main,
    path: '/',
    Component: MainPage,
  },
  {
    name: navigationContent.contests,
    path: '/contests',
    Component: ContestListPage,
  },
  {
    name: 'HEPC 공개 상세',
    path: '/contests/hepc',
    Component: PublicContestDetailPage,
    showInNavigation: false,
  },
  {
    name: navigationContent.board,
    path: '/board',
    Component: BoardPage,
  },
  {
    name: '공지 상세',
    path: '/board/:noticeId',
    Component: PublicNoticeDetailPage,
    showInNavigation: false,
  },
  {
    name: navigationContent.rules,
    path: '/rules',
    Component: RulesPage,
  },
  {
    name: navigationContent.judgeStatus,
    path: '/judge-status',
    Component: JudgeStatusPage,
  },
  {
    name: navigationContent.contact,
    path: '/contact',
    Component: ContactPage,
  },
  {
    name: 'HEPC 참가 로그인',
    path: '/HEPC_login',
    Component: HEPCLoginPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC MOSS',
    path: '/HEPC_MOSS',
    Component: HEPCMOSSPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC COSS',
    path: '/HEPC_COSS',
    Component: HEPCCOSSPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC 문제',
    path: '/HEPC_problem',
    Component: HEPCProblemPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC 제출 대기',
    path: '/HEPC/:division/submissions/:submissionId/wait',
    Component: HEPCSubmissionWaitingPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC 제출 상세',
    path: '/HEPC/:division/submissions/:submissionId',
    Component: HEPCSubmissionDetailPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC 공지 상세',
    path: '/HEPC/:division/notices/:noticeId',
    Component: HEPCNoticeDetailPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC 질문 작성',
    path: '/HEPC/:division/board/new',
    Component: HEPCQuestionWritePage,
    showInNavigation: false,
  },
  {
    name: 'HEPC 질문 상세',
    path: '/HEPC/:division/board/:questionId',
    Component: HEPCQuestionDetailPage,
    showInNavigation: false,
  },
  {
    name: 'HEPC 내부 페이지',
    path: '/HEPC/:division/:section',
    Component: HEPCWorkspaceSubPage,
    showInNavigation: false,
  },
] as const satisfies readonly AppRoute[];

export const navigationRoutes = appRoutes.filter(
  (route) =>
    route.path !== '/' &&
    !('showInNavigation' in route && route.showInNavigation === false),
);
