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

function splitContestTitle(title?: string | null) {
  const fallback = '스코어보드';
  const normalized = (title || fallback).trim();
  const [first = fallback, ...rest] = normalized.split(/\s+/);

  return {
    primary: first,
    secondary: rest.join(' '),
  };
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
    return score.wrong_attempts > 0 ? `+${score.wrong_attempts}` : '✓';
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
  if (!label) {
    return <span className="text-white/20">-</span>;
  }

  return (
    <span
      className={[
        'inline-flex h-7 min-w-9 items-center justify-center rounded-full px-2 text-xs font-black',
        score?.solved
          ? 'bg-emerald-300 text-slate-950'
          : 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-300/30',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function PresentationDivisionBoard({
  section,
}: {
  section: OperatorPresentationScoreboardSection;
}) {
  const problemCodes = useMemo(() => sortedProblemCodes(section), [section]);
  const gridMinWidth = Math.max(620, 430 + problemCodes.length * 56);

  return (
    <section className="min-w-0 overflow-hidden rounded-[1rem] border border-indigo-300/15 bg-slate-950/55 p-[clamp(1rem,2vw,1.75rem)] shadow-[0_1.25rem_4rem_rgba(0,0,0,0.28)] backdrop-blur">
      <header className="flex items-end justify-between gap-4 pb-5">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black tracking-[0.32em] text-violet-300 uppercase">
            Division
          </p>
          <h2 className="truncate text-[clamp(1.65rem,3vw,3.25rem)] leading-none font-black tracking-normal text-white">
            {section.division.name}
          </h2>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black',
            section.frozen
              ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
              : 'border-violet-300/25 bg-violet-300/10 text-violet-100',
          ].join(' ')}
        >
          <span className="size-2 rounded-full bg-current" />
          {section.frozen ? '프리즈' : '라이브'}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left"
          style={{ minWidth: `${gridMinWidth}px` }}
        >
          <thead>
            <tr className="border-y border-white/10 text-[0.68rem] font-black tracking-normal text-white/85 uppercase">
              <th className="w-20 px-4 py-4">Rank</th>
              <th className="min-w-56 px-4 py-4">Team</th>
              <th className="w-20 px-3 py-4 text-center">Solved</th>
              {problemCodes.map((code) => (
                <th className="w-14 px-1 py-4 text-center" key={code}>
                  {code}
                </th>
              ))}
              <th className="w-24 px-4 py-4 text-center">Time</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => {
              const scores = problemScoreByCode(row);

              return (
                <tr
                  className="border-b border-white/5 last:border-b-0 odd:bg-white/[0.035]"
                  key={`${section.division.division_id}-${row.team_id ?? row.team_name}`}
                >
                  <td className="px-4 py-3 text-[clamp(1rem,1.6vw,1.45rem)] font-black text-violet-300">
                    {row.rank}
                  </td>
                  <td className="max-w-72 px-4 py-3">
                    <span className="block truncate text-[clamp(0.9rem,1.2vw,1.05rem)] font-bold text-white">
                      {row.team_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-[clamp(1rem,1.4vw,1.25rem)] font-black text-white/65">
                    {row.solved}
                  </td>
                  {problemCodes.map((code) => (
                    <td className="px-1 py-2 text-center" key={code}>
                      <PresentationScoreCell score={scores.get(code)} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-[clamp(1rem,1.4vw,1.25rem)] font-black text-white/65">
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
  const titleParts = splitContestTitle(contest?.title);

  useEffect(() => {
    if (contest?.title) {
      document.title = `${contest.title} 프레젠테이션 스코어보드`;
    }
  }, [contest?.title]);

  return (
    <section className="fixed inset-0 z-[100] overflow-auto bg-[#090b14] px-[clamp(1rem,2vw,2rem)] py-[clamp(1rem,2vw,2rem)] text-white">
      <div className="mx-auto grid w-full max-w-[118rem] gap-[clamp(1rem,2vw,2rem)]">
        <header className="relative isolate overflow-hidden rounded-[1.25rem] border border-indigo-300/10 bg-[radial-gradient(circle_at_50%_100%,rgba(59,56,255,0.42),transparent_42%),linear-gradient(115deg,#070914_0%,#11154b_54%,#0d1848_100%)] px-[clamp(1.5rem,3vw,3rem)] py-[clamp(2rem,4vw,4rem)] shadow-[0_1.5rem_5rem_rgba(0,0,0,0.38)]">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(30deg,transparent_48%,rgba(255,255,255,0.18)_49%,rgba(255,255,255,0.18)_51%,transparent_52%),linear-gradient(150deg,transparent_48%,rgba(255,255,255,0.14)_49%,rgba(255,255,255,0.14)_51%,transparent_52%)] [background-size:6.5rem_3.75rem]" />
          <div className="grid gap-[clamp(1.5rem,3vw,3rem)] xl:grid-cols-[minmax(20rem,1fr)_minmax(36rem,0.95fr)] xl:items-center">
            <div className="min-w-0">
              <p className="text-[clamp(0.68rem,0.9vw,0.95rem)] font-black tracking-[0.34em] text-violet-300 uppercase">
              ZOJ Presentation Scoreboard
              </p>
              <h1 className="mt-5 grid gap-1 text-[clamp(3rem,7.8vw,8.25rem)] leading-[0.92] font-black tracking-normal text-white uppercase">
                <span className="zoj-truncate-safe whitespace-nowrap">
                  {titleParts.primary}
                </span>
                {titleParts.secondary ? (
                  <span className="zoj-truncate-safe whitespace-nowrap bg-gradient-to-r from-white via-violet-100 to-violet-500 bg-clip-text pl-[clamp(1.5rem,5vw,4rem)] text-transparent">
                    {titleParts.secondary}
                  </span>
                ) : null}
              </h1>
            </div>
            <div className="grid gap-[clamp(1rem,2vw,2rem)] md:grid-cols-2">
              <TimePanel
                label="스코어보드 프리즈"
                time={formatDateTime(contest?.freeze_at)}
                value={
                  contest && new Date(contest.freeze_at).getTime() <= now
                    ? '프리즈 적용 중'
                    : timeLeftLabel(contest?.freeze_at, now)
                }
              />
              <TimePanel
                label="대회 종료"
                time={formatDateTime(contest?.end_at)}
                value={
                  contest && new Date(contest.end_at).getTime() <= now
                    ? '대회 종료'
                    : timeLeftLabel(contest?.end_at, now)
                }
              />
            </div>
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

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,38rem),1fr))] gap-[clamp(1rem,2vw,2rem)]">
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
    <div className="grid min-h-[clamp(8rem,14vw,13rem)] content-center border border-white/10 bg-white/[0.07] px-[clamp(1.25rem,2.5vw,2rem)] py-[clamp(1.25rem,2.5vw,2rem)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-center text-[clamp(0.9rem,1.4vw,1.45rem)] font-black tracking-normal text-white/55">
        {label}
      </p>
      <p className="mt-3 text-center text-[clamp(0.85rem,1.15vw,1.15rem)] font-bold text-white/75">
        {time}
      </p>
      <p className="mt-3 text-center text-[clamp(2.3rem,5vw,5rem)] leading-none font-black tracking-normal text-violet-500">
        {value}
      </p>
    </div>
  );
}
