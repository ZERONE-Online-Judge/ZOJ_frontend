import { useState, type ReactNode } from 'react';
import type { GuideScene } from '@/data/operatorGuideContent';
import JudgeServerDemo from './JudgeServerDemo';
import {
  SettingsPractice,
  RolesPractice,
  SessionPractice,
  NoticePractice,
  BoardPractice,
  ScoreboardPractice,
  ProblemPractice,
  SubmissionPractice,
  AuditPractice,
  NavigationPractice,
} from './GuidePractice';
export function GuideIcon({
  kind = 'book',
  className = '',
}: {
  kind?: string;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    book: (
      <>
        <path d="M12 6c-3-2-7-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-1-9 1Z" />
        <path d="M12 6v14M6 9l3 1M15 10l3-1" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v2" />
      </>
    ),
    code: (
      <>
        <path d="m7 7-5 5 5 5m10-10 5 5-5 5m-4-13-2 20" />
      </>
    ),
    flag: (
      <>
        <path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7ZM20 2v4m-2-2h4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v.1" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={`og-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind] ?? paths.book}
    </svg>
  );
}

export default function GuideVisual({
  scene,
  onTopic,
}: {
  scene: GuideScene;
  onTopic: (category: string, article: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const demos: Record<
    Exclude<GuideScene, 'journey' | 'diagnosis'>,
    ReactNode
  > = {
    visibility: <SettingsPractice />,
    roles: <RolesPractice />,
    session: <SessionPractice />,
    notice: <NoticePractice />,
    question: <BoardPractice />,
    pipeline: <ProblemPractice />,
    review: <ProblemPractice review />,
    judging: <SubmissionPractice />,
    scoreboard: <ScoreboardPractice />,
    audit: <AuditPractice />,
    'server-performance': <JudgeServerDemo />,
  };
  if (scene === 'journey' || scene === 'diagnosis')
    return (
      <NavigationPractice onTopic={onTopic} help={scene === 'diagnosis'} />
    );
  return (
    <div className="og-practice-wrapper">
      <div key={revision}>{demos[scene]}</div>
      <button
        className="og-practice-reset"
        type="button"
        onClick={() => setRevision((value) => value + 1)}
      >
        처음부터 다시하기
      </button>
    </div>
  );
}
