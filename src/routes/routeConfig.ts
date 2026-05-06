import type { ComponentType } from 'react';
import MainPage from '@/pages/MainPage';

export type AppRoute = {
  name: string;
  path: string;
  Component: ComponentType;
};

export const appRoutes = [
  /*
  {
    name: '예시',
    path: '/example',
    Component: ExamplePage,
  },
  */
  {
    name: '메인',
    path: '/',
    Component: MainPage,
  },
  {
    name: '대회 목록',
    path: '/contests',
    Component: MainPage,
  },
  {
    name: '게시판',
    path: '/board',
    Component: MainPage,
  },
  {
    name: '규정 안내',
    path: '/rules',
    Component: MainPage,
  },
  {
    name: '채점 상태',
    path: '/judge-status',
    Component: MainPage,
  },
  {
    name: '문의',
    path: '/contact',
    Component: MainPage,
  },
] as const satisfies readonly AppRoute[];

export const navigationRoutes = appRoutes.filter(({ path }) => path !== '/');
