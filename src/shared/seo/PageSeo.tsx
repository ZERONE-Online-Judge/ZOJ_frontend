import { useQuery } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '@/shared/api/client';
import {
  applyPageMetadata,
  fallbackMetadata,
  isPublicSeoPath,
  readBootstrapMetadata,
  resolveSeoPath,
  type PageMetadata,
} from '@/shared/seo/metadata';

export default function PageSeo() {
  const { pathname, search } = useLocation();
  const path = resolveSeoPath(pathname, search);
  const publicPath = isPublicSeoPath(path);
  const query = useQuery({
    queryKey: ['public-page-seo', path],
    queryFn: () =>
      apiRequest<PageMetadata>(`/public/seo?path=${encodeURIComponent(path)}`),
    initialData: () => readBootstrapMetadata(path),
    enabled: publicPath,
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useLayoutEffect(() => {
    const fallback = fallbackMetadata(path);
    const metadata =
      publicPath && query.data?.path === path ? query.data : fallback;
    applyPageMetadata(
      query.isError && !query.data && fallback.robots === null
        ? { ...fallback, robots: 'noindex,nofollow' }
        : metadata,
      {
        // The read-only presentation sets a descriptive contest-specific tab
        // title itself. All its search and sharing metadata is still private.
        preserveTitle:
          /^\/operator\/contests\/[^/]+\/scoreboard\/presentation$/.test(path),
      },
    );
    const bootstrap = document.getElementById('zoj-seo-data');
    if (bootstrap && !readBootstrapMetadata(path)) bootstrap.remove();
  }, [path, publicPath, query.data, query.isError]);

  return null;
}
