import { type ReactNode, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isServiceMaster } from '@/domains/identityAccess/permissions';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { appRoutes } from '@/routes/routeConfig';
import RouteErrorBoundary from '@/routes/RouteErrorBoundary';
import PageNotice from '@/shared/ui/PageNotice';

function RouteAccessGuard({
  access,
  children,
}: {
  access?: 'public' | 'admin' | 'operator';
  children: ReactNode;
}) {
  const location = useLocation();
  const generalSession = useSessionStore((state) => state.generalSession);

  if (!access || access === 'public') return children;

  if (!generalSession?.operatorSession) {
    const next = `${location.pathname}${location.search}`;

    return <Navigate replace to={`/login?moveTo=${encodeURIComponent(next)}`} />;
  }

  if (access === 'admin' && !isServiceMaster(generalSession)) {
    return (
      <section className="mx-auto w-full max-w-4xl px-6 py-14">
        <PageNotice
          message="서비스 관리자 권한이 필요한 페이지입니다."
          status="error"
        />
      </section>
    );
  }

  return children;
}

export default function AppRoutes() {
  const location = useLocation();

  return (
    <RouteErrorBoundary resetKey={location.key}>
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-4xl px-6 py-14">
            <PageNotice message="페이지를 불러오는 중입니다." status="loading" />
          </section>
        }
      >
        <Routes>
          {appRoutes.map(({ access, path, Component }) => (
            <Route
              element={
                <RouteAccessGuard access={access}>
                  <Component />
                </RouteAccessGuard>
              }
              key={path}
              path={path}
            />
          ))}
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
