import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { safeLoginRedirectTarget } from '@/shared/lib/loginRedirect';

type RouteErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route render failed', error, errorInfo);
  }

  componentDidUpdate(previousProps: RouteErrorBoundaryProps) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const target = safeLoginRedirectTarget(
      typeof window === 'undefined'
        ? null
        : `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    const loginPath = target
      ? `/login?reason=session&moveTo=${encodeURIComponent(target)}`
      : '/login?reason=session';

    return (
      <PageLayout
        description="로그인 세션이 끊겼거나 화면 상태를 복구하지 못했습니다. 다시 로그인하거나 홈으로 이동해 주세요."
        title="화면을 다시 불러오지 못했습니다"
      >
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded bg-violet-950 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-800"
            reloadDocument
            to={loginPath}
          >
            다시 로그인
          </Link>
          <Link
            className="rounded border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            reloadDocument
            to="/"
          >
            홈으로 이동
          </Link>
        </div>
      </PageLayout>
    );
  }
}
