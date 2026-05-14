import type { ComponentType } from 'react';
import LoginPage from '@/pages/auth/LoginPage';
import ContestBoardPage from '@/pages/contest/ContestBoardPage';
import ContestOverviewPage from '@/pages/contest/ContestOverviewPage';
import ContestProblemDetailPage from '@/pages/contest/ContestProblemDetailPage';
import ContestProblemsPage from '@/pages/contest/ContestProblemsPage';
import ContestScoreboardPage from '@/pages/contest/ContestScoreboardPage';
import ContestSubmissionsPage from '@/pages/contest/ContestSubmissionsPage';
import ContestsPage from '@/pages/public/ContestsPage';
import JudgeStatusPage from '@/pages/public/JudgeStatusPage';
import NoticesPage from '@/pages/public/NoticesPage';
import SupportGuidePage from '@/pages/public/SupportGuidePage';
import MainPage from '@/pages/main/MainPage';

export type AppRoute = {
  name: string;
  path: string;
  Component: ComponentType;
  showInNavigation?: boolean;
};

export const appRoutes = [
  {
    name: '메인',
    path: '/',
    Component: MainPage,
  },
  {
    name: '대회 목록',
    path: '/contests',
    Component: ContestsPage,
  },
  {
    name: '표준 대회',
    path: '/contests/:contestId',
    Component: ContestOverviewPage,
    showInNavigation: false,
  },
  {
    name: '대회 문제집',
    path: '/contests/:contestId/problems',
    Component: ContestProblemsPage,
    showInNavigation: false,
  },
  {
    name: '대회 문제',
    path: '/contests/:contestId/problems/:problemId',
    Component: ContestProblemDetailPage,
    showInNavigation: false,
  },
  {
    name: '대회 문제 보기',
    path: '/contests/:contestId/problems/:problemId/:problemView',
    Component: ContestProblemDetailPage,
    showInNavigation: false,
  },
  {
    name: '대회 채점현황',
    path: '/contests/:contestId/submissions',
    Component: ContestSubmissionsPage,
    showInNavigation: false,
  },
  {
    name: '대회 스코어보드',
    path: '/contests/:contestId/scoreboard',
    Component: ContestScoreboardPage,
    showInNavigation: false,
  },
  {
    name: '대회 게시판',
    path: '/contests/:contestId/board',
    Component: ContestBoardPage,
    showInNavigation: false,
  },
  {
    name: '공지사항',
    path: '/notices',
    Component: NoticesPage,
  },
  {
    name: '채점 상태',
    path: '/judge-status',
    Component: JudgeStatusPage,
  },
  {
    name: '지원 안내',
    path: '/support',
    Component: SupportGuidePage,
  },
  {
    name: '로그인',
    path: '/login',
    Component: LoginPage,
    showInNavigation: false,
  },
] as const satisfies readonly AppRoute[];

export const navigationRoutes = appRoutes.filter(
  (route) =>
    route.path !== '/' &&
    !('showInNavigation' in route && route.showInNavigation === false),
);
