import type { ComponentType } from 'react';
import HEPCProblemPage from '@/pages/hepc/HEPCProblemPage';
import HEPCSubmissionDetailPage from '@/pages/hepc/HEPCSubmissionDetailPage';
import HEPCSubmissionWaitingPage from '@/pages/hepc/HEPCSubmissionWaitingPage';
import SharedUiPreviewPage from '@/pages/debug/SharedUiPreviewPage';
import MainPage from '@/pages/main/MainPage';
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
    name: 'UI 미리보기',
    path: '/ui-preview',
    Component: SharedUiPreviewPage,
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
] as const satisfies readonly AppRoute[];

export const navigationRoutes = appRoutes.filter(
  (route) =>
    route.path !== '/' &&
    !('showInNavigation' in route && route.showInNavigation === false),
);
