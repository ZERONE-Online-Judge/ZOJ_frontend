import type { UsageFilters, UsageReport } from '@/domains/usageAnalytics/types';

export function koreaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function dateRange(
  days: number,
  now = new Date(),
): Pick<UsageFilters, 'start' | 'end'> {
  const end = koreaDate(now);
  const start = new Date(`${end}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end };
}
export function duration(seconds: number | null) {
  if (seconds === null) return '—';
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}초`;
  if (rounded < 3600) return `${Math.floor(rounded / 60)}분 ${rounded % 60}초`;
  return `${Math.floor(rounded / 3600)}시간 ${Math.floor((rounded % 3600) / 60)}분`;
}
export function comparison(
  current: number,
  previous: number,
  available: boolean,
) {
  if (!available) return '비교할 이전 기록이 아직 없어요';
  if (!previous)
    return current ? '이전 기간에는 방문 기록이 없어요' : '이전 기간과 같아요';
  const value = Math.round(((current - previous) / previous) * 100);
  return value === 0
    ? '이전 동일 기간과 같아요'
    : `이전 동일 기간 대비 ${value > 0 ? '+' : ''}${value.toLocaleString()}%`;
}
function csvCell(value: unknown) {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function usageCsv(report: UsageReport) {
  const rows: unknown[][] = [
    ['ZOJ 운영 통계', '한국시간(KST)', report.period.start, report.period.end],
    [
      '필터',
      report.filters.contest_id ?? '전체 대회',
      report.filters.service ?? '전체 서비스',
      report.filters.audience,
    ],
    ['항목', '수치'],
    ['페이지 조회', report.summary.views],
    ['방문자(브라우저)', report.summary.visitors],
    ['방문 세션', report.summary.visits],
    ['로그인 계정', report.summary.signed_in_users],
    [],
    ['시간대별 추이', '페이지 조회', '방문자', '방문 세션'],
    ...report.timeline
      .filter((row) => !row.future)
      .map((row) => [row.period, row.views, row.visitors, row.visits]),
    [],
    ['요일(월=1)', '시각(KST)', '페이지 조회'],
    ...report.heatmap.map((row) => [row.weekday + 1, row.hour, row.views]),
    [],
    ['대회', '페이지 조회', '방문자', '방문 세션'],
    ...report.contests.map((row) => [
      row.title,
      row.views,
      row.visitors,
      row.visits,
    ]),
  ];
  for (const [label, items] of [
    ['서비스', report.services],
    ['화면', report.pages],
    ['기기', report.devices],
    ['브라우저', report.browsers],
    ['유입 출처', report.referrers],
    ['이용자 구분', report.audiences],
  ] as const)
    rows.push(
      [],
      [label, '페이지 조회', '방문자', '화면 표시 시간(초)'],
      ...items.map((row) => [
        row.label,
        row.views,
        row.visitors,
        row.active_seconds,
      ]),
    );
  rows.push(
    [],
    ['운영 지표(기간·대회 기준)', '수치'],
    ['제출', report.operations.submissions],
    ['성공한 로그인', report.operations.login_successes],
    ['실패한 로그인', report.operations.login_failures],
    ['운영 작업 실패', report.operations.operation_failures],
    ['질문', report.operations.questions],
  );
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
