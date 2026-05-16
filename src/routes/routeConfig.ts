import type { ComponentType } from 'react';
import AdminContestsPage from '@/pages/admin/AdminContestsPage';
import AdminHomePage from '@/pages/admin/AdminHomePage';
import AdminJudgePage from '@/pages/admin/AdminJudgePage';
import LoginPage from '@/pages/auth/LoginPage';
import ContestBoardPage from '@/pages/contest/ContestBoardPage';
import ContestOverviewPage from '@/pages/contest/ContestOverviewPage';
import ContestProblemDetailPage from '@/pages/contest/ContestProblemDetailPage';
import ContestProblemsPage from '@/pages/contest/ContestProblemsPage';
import ContestScoreboardPage from '@/pages/contest/ContestScoreboardPage';
import ContestSubmissionsPage from '@/pages/contest/ContestSubmissionsPage';
import ContestsPage from '@/pages/public/ContestsPage';
import JudgeStatusPage from '@/pages/public/JudgeStatusPage';
import NotFoundPage from '@/pages/public/NotFoundPage';
import NoticesPage from '@/pages/public/NoticesPage';
import OperatorHomePage from '@/pages/operator/OperatorHomePage';
import OperatorNoticesPage from '@/pages/operator/OperatorNoticesPage';
import OperatorParticipantsPage from '@/pages/operator/OperatorParticipantsPage';
import OperatorProblemsPage from '@/pages/operator/OperatorProblemsPage';
import OperatorScoreboardPage from '@/pages/operator/OperatorScoreboardPage';
import OperatorSettingsPage from '@/pages/operator/OperatorSettingsPage';
import OperatorSubmissionsPage from '@/pages/operator/OperatorSubmissionsPage';
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
  {
    name: '관리자',
    path: '/admin',
    Component: AdminHomePage,
    showInNavigation: false,
  },
  {
    name: '운영자',
    path: '/operator',
    Component: OperatorHomePage,
    showInNavigation: false,
  },
  {
    name: '대회 운영',
    path: '/operator/contests/:contestId',
    Component: OperatorHomePage,
    showInNavigation: false,
  },
  {
    name: '대회 운영 설정',
    path: '/operator/contests/:contestId/settings',
    Component: OperatorSettingsPage,
    showInNavigation: false,
  },
  {
    name: '대회 운영 공지',
    path: '/operator/contests/:contestId/notices',
    Component: OperatorNoticesPage,
    showInNavigation: false,
  },
  {
    name: '대회 운영 참가팀',
    path: '/operator/contests/:contestId/participants',
    Component: OperatorParticipantsPage,
    showInNavigation: false,
  },
  {
    name: '대회 운영 문제',
    path: '/operator/contests/:contestId/problems',
    Component: OperatorProblemsPage,
    showInNavigation: false,
  },
  {
    name: '대회 운영 제출',
    path: '/operator/contests/:contestId/submissions',
    Component: OperatorSubmissionsPage,
    showInNavigation: false,
  },
  {
    name: '대회 운영 스코어보드',
    path: '/operator/contests/:contestId/scoreboard',
    Component: OperatorScoreboardPage,
    showInNavigation: false,
  },
  {
    name: '대회 관리',
    path: '/admin/contests',
    Component: AdminContestsPage,
    showInNavigation: false,
  },
  {
    name: '채점 관리',
    path: '/admin/judge',
    Component: AdminJudgePage,
    showInNavigation: false,
  },
  {
    name: '찾을 수 없는 페이지',
    path: '*',
    Component: NotFoundPage,
    showInNavigation: false,
  },
] as const satisfies readonly AppRoute[];

export const navigationRoutes = appRoutes.filter(
  (route) =>
    route.path !== '/' &&
    !('showInNavigation' in route && route.showInNavigation === false),
);
