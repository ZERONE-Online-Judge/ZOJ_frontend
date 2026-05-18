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
import OperatorBoardPage from '@/pages/operator/OperatorBoardPage';
import OperatorNoticesPage from '@/pages/operator/OperatorNoticesPage';
import OperatorParticipantsPage from '@/pages/operator/OperatorParticipantsPage';
import OperatorProblemsPage from '@/pages/operator/OperatorProblemsPage';
import OperatorScoreboardPage from '@/pages/operator/OperatorScoreboardPage';
import OperatorSettingsPage from '@/pages/operator/OperatorSettingsPage';
import OperatorSubmissionsPage from '@/pages/operator/OperatorSubmissionsPage';
import SupportGuidePage from '@/pages/public/SupportGuidePage';
import MainPage from '@/pages/main/MainPage';
import { routeText } from '@/data/uiText';

export type AppRoute = {
  name: string;
  path: string;
  Component: ComponentType;
  showInNavigation?: boolean;
};

export const appRoutes = [
  {
    name: routeText.home,
    path: '/',
    Component: MainPage,
  },
  {
    name: routeText.contests,
    path: '/contests',
    Component: ContestsPage,
  },
  {
    name: routeText.contestDetail,
    path: '/contests/:contestId',
    Component: ContestOverviewPage,
    showInNavigation: false,
  },
  {
    name: routeText.contestProblems,
    path: '/contests/:contestId/problems',
    Component: ContestProblemsPage,
    showInNavigation: false,
  },
  {
    name: routeText.contestProblem,
    path: '/contests/:contestId/problems/:problemId',
    Component: ContestProblemDetailPage,
    showInNavigation: false,
  },
  {
    name: routeText.contestProblemDetail,
    path: '/contests/:contestId/problems/:problemId/:problemView',
    Component: ContestProblemDetailPage,
    showInNavigation: false,
  },
  {
    name: routeText.contestSubmissions,
    path: '/contests/:contestId/submissions',
    Component: ContestSubmissionsPage,
    showInNavigation: false,
  },
  {
    name: routeText.contestScoreboard,
    path: '/contests/:contestId/scoreboard',
    Component: ContestScoreboardPage,
    showInNavigation: false,
  },
  {
    name: routeText.contestBoard,
    path: '/contests/:contestId/board',
    Component: ContestBoardPage,
    showInNavigation: false,
  },
  {
    name: routeText.notices,
    path: '/notices',
    Component: NoticesPage,
  },
  {
    name: routeText.judgeStatus,
    path: '/judge-status',
    Component: JudgeStatusPage,
  },
  {
    name: routeText.support,
    path: '/support',
    Component: SupportGuidePage,
  },
  {
    name: routeText.login,
    path: '/login',
    Component: LoginPage,
    showInNavigation: false,
  },
  {
    name: routeText.admin,
    path: '/admin',
    Component: AdminHomePage,
    showInNavigation: false,
  },
  {
    name: routeText.operator,
    path: '/operator',
    Component: OperatorHomePage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorContest,
    path: '/operator/contests/:contestId',
    Component: OperatorHomePage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorSettings,
    path: '/operator/contests/:contestId/settings',
    Component: OperatorSettingsPage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorNotices,
    path: '/operator/contests/:contestId/notices',
    Component: OperatorNoticesPage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorBoard,
    path: '/operator/contests/:contestId/board',
    Component: OperatorBoardPage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorParticipants,
    path: '/operator/contests/:contestId/participants',
    Component: OperatorParticipantsPage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorProblems,
    path: '/operator/contests/:contestId/problems',
    Component: OperatorProblemsPage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorSubmissions,
    path: '/operator/contests/:contestId/submissions',
    Component: OperatorSubmissionsPage,
    showInNavigation: false,
  },
  {
    name: routeText.operatorScoreboard,
    path: '/operator/contests/:contestId/scoreboard',
    Component: OperatorScoreboardPage,
    showInNavigation: false,
  },
  {
    name: routeText.adminContests,
    path: '/admin/contests',
    Component: AdminContestsPage,
    showInNavigation: false,
  },
  {
    name: routeText.adminJudge,
    path: '/admin/judge',
    Component: AdminJudgePage,
    showInNavigation: false,
  },
  {
    name: routeText.notFound,
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
