import { apiRequest } from '@/shared/api/client';
import type { UsageFilters, UsageReport } from '@/domains/usageAnalytics/types';
export function getUsageReport(token: string, filters: UsageFilters) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  );
  return apiRequest<UsageReport>(`/admin/analytics?${query}`, token);
}
