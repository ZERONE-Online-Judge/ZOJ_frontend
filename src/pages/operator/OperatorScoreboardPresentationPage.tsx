import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { OperatorAccessGate } from '@/components/operator/OperatorShell';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { getOperatorPresentationScoreboard } from '@/domains/submissionScoreboard/api';
import type {
  OperatorPresentationScoreboardSection,
  ScoreboardProblemScore,
  ScoreboardRow,
} from '@/domains/submissionScoreboard/types';
import { formatDateTime } from '@/shared/lib/dateTime';
import { formatApiError } from '@/shared/api/errors';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function timeLeftLabel(target?: string | null, now = Date.now()) {
  if (!target) return '-';

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return '도달';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function sortedProblemCodes(section: OperatorPresentationScoreboardSection) {
  const codes = new Set<string>();
  section.problems.forEach((problem) => codes.add(problem.problem_code));
  section.rows.forEach((row) => {
    row.problem_scores.forEach((score) => codes.add(score.problem_code));
  });

  return Array.from(codes).sort((a, b) =>
    a.localeCompare(b, 'ko-KR', { numeric: true }),
  );
}

function problemScoreByCode(row: ScoreboardRow) {
  return new Map(row.problem_scores.map((score) => [score.problem_code, score]));
}

function solvedLabel(score?: ScoreboardProblemScore) {
  if (!score) return '';
  if (score.solved) {
    return score.wrong_attempts > 0 ? `+${score.wrong_attempts}` : '+';
  }
  if (score.attempts > 0) return `-${score.attempts}`;
  return '';
}

function penaltyLabel(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString('ko-KR');
}

function PresentationScoreCell({ score }: { score?: ScoreboardProblemScore }) {
  const label = solvedLabel(score);

  return (
    <span
      className={[
        'inline-flex h-8 min-w-9 items-center justify-center rounded border px-2 text-sm font-black',
        score?.solved
          ? 'border-emerald-400 bg-emerald-400 text-slate-950'
          : score && score.attempts > 0
            ? 'border-rose-400/70 bg-rose-500/15 text-rose-100'
            : 'border-white/10 bg-white/[0.03] text-white/30',
      ].join(' ')}
    >
      {label || '-'}
    </span>
  );
}

function PresentationDivisionBoard({
  section,
}: {
  section: OperatorPresentationScoreboardSection;
}) {
  const problemCodes = useMemo(() => sortedProblemCodes(section), [section]);

  return (
    <section className="min-w-0 overflow-hidden rounded border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.05] px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-200">
            Division
          </p>
          <h2 className="truncate text-[clamp(1.35rem,2vw,2rem)] font-black text-white">
            {section.division.name}
          </h2>
        </div>
        <span
          className={[
            'shrink-0 rounded-full border px-3 py-1 text-sm font-black',
            section.frozen
              ? 'border-amber-300 bg-amber-300 text-slate-950'
              : 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100',
          ].join(' ')}
        >
          {section.frozen ? '프리즈' : '라이브'}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs font-black uppercase tracking-[0.12em] text-white/55">
              <th className="w-16 px-4 py-3">Rank</th>
              <th className="min-w-48 px-4 py-3">Team</th>
              <th className="w-20 px-3 py-3 text-center">Solved</th>
              {problemCodes.map((code) => (
                <th className="w-12 px-1 py-3 text-center" key={code}>
                  {code}
                </th>
              ))}
              <th className="w-24 px-4 py-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => {
              const scores = problemScoreByCode(row);

              return (
                <tr
                  className="border-b border-white/10 last:border-b-0 odd:bg-white/[0.025]"
                  key={`${section.division.division_id}-${row.team_id ?? row.team_name}`}
                >
                  <td className="px-4 py-3 text-lg font-black text-indigo-100">
                    {row.rank}
                  </td>
                  <td className="max-w-72 px-4 py-3">
                    <span className="block truncate text-base font-black text-white">
                      {row.team_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-lg font-black text-white">
                    {row.solved}
                  </td>
                  {problemCodes.map((code) => (
                    <td className="px-1 py-2 text-center" key={code}>
                      <PresentationScoreCell score={scores.get(code)} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-base font-black text-white/80">
                    {penaltyLabel(row.penalty)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {section.rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm font-bold text-white/50">
          표시할 팀이 없습니다.
        </p>
      ) : null}
    </section>
  );
}

export default function OperatorScoreboardPresentationPage() {
  const { contestId } = useParams();
  const now = useNow();

  return (
    <OperatorAccessGate
      contestId={contestId}
      permission="contest.scoreboard.view"
    >
      {(session) =>
        contestId ? (
          <OperatorScoreboardPresentationContent
            contestId={contestId}
            now={now}
            token={session.accessToken}
          />
        ) : null
      }
    </OperatorAccessGate>
  );
}

function OperatorScoreboardPresentationContent({
  contestId,
  now,
  token,
}: {
  contestId: string;
  now: number;
  token: string;
}) {
  const queryIdentity = tokenQueryIdentity(token);
  const presentationQuery = useQuery({
    queryKey: ['operator', 'scoreboard', 'presentation', contestId, queryIdentity],
    queryFn: () => getOperatorPresentationScoreboard(contestId, token),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  });
  const contest = presentationQuery.data?.contest;
  const sections = presentationQuery.data?.sections ?? [];

  useEffect(() => {
    if (contest?.title) {
      document.title = `${contest.title} 프레젠테이션 스코어보드`;
    }
  }, [contest?.title]);

  return (
    <section className="fixed inset-0 z-[100] overflow-auto bg-slate-950 px-6 py-6 text-white">
      <div className="mx-auto grid w-full max-w-[1800px] gap-5">
        <header className="grid gap-4 rounded border border-white/10 bg-white/[0.06] px-6 py-5 shadow-2xl shadow-black/30 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.32em] text-indigo-200">
              ZOJ Presentation Scoreboard
            </p>
            <h1 className="mt-2 truncate text-[clamp(2rem,4vw,4.8rem)] font-black leading-none tracking-normal">
              {contest?.title ?? '스코어보드'}
            </h1>
          </div>
          <div className="grid gap-2 text-sm font-bold text-white/75 sm:grid-cols-2 lg:min-w-[560px]">
            <TimePanel
              label="스코어보드 프리즈"
              time={formatDateTime(contest?.freeze_at)}
              value={
                contest && new Date(contest.freeze_at).getTime() <= now
                  ? '프리즈 적용 중'
                  : `프리즈까지 ${timeLeftLabel(contest?.freeze_at, now)}`
              }
            />
            <TimePanel
              label="대회 종료"
              time={formatDateTime(contest?.end_at)}
              value={
                contest && new Date(contest.end_at).getTime() <= now
                  ? '대회 종료'
                  : `종료까지 ${timeLeftLabel(contest?.end_at, now)}`
              }
            />
          </div>
        </header>

        {presentationQuery.error ? (
          <div className="rounded border border-rose-400/40 bg-rose-500/15 px-5 py-4 text-sm font-black text-rose-100">
            {formatApiError(
              presentationQuery.error,
              '프레젠테이션 스코어보드를 불러오지 못했습니다',
            )}
          </div>
        ) : null}

        {presentationQuery.isLoading ? (
          <div className="rounded border border-white/10 bg-white/[0.06] px-5 py-16 text-center text-lg font-black text-white/70">
            스코어보드를 불러오는 중입니다.
          </div>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,560px),1fr))] gap-5">
          {sections.map((section) => (
            <PresentationDivisionBoard
              key={section.division.division_id}
              section={section}
            />
          ))}
        </div>

        {!presentationQuery.isLoading && sections.length === 0 ? (
          <div className="rounded border border-white/10 bg-white/[0.06] px-5 py-16 text-center text-lg font-black text-white/70">
            표시할 유형이 없습니다.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TimePanel({
  label,
  time,
  value,
}: {
  label: string;
  time: string;
  value: string;
}) {
  return (
    <div className="rounded border border-white/10 bg-slate-950/50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white/70">{time}</p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}
