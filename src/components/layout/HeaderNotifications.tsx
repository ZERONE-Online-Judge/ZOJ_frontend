import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMatch, useNavigate } from 'react-router-dom';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import {
  getContestNotices,
  getContestQuestions,
} from '@/domains/serviceCommunication/api';
import type {
  ContestNotice,
  ContestQuestion,
} from '@/domains/serviceCommunication/types';
import { listSubmissionsPage } from '@/domains/submissionScoreboard/api';
import {
  isSubmissionTerminal,
  submissionStatusLabel,
} from '@/domains/submissionScoreboard/status';
import type { Submission } from '@/domains/submissionScoreboard/types';
import { formatDateTime, formatTime } from '@/shared/lib/dateTime';

type HeaderNotificationType = 'answer' | 'notice' | 'submission';

type HeaderNotification = {
  body: string;
  createdAt: string;
  dismissedAt?: string;
  href: string;
  id: string;
  sourceKey: string;
  title: string;
  type: HeaderNotificationType;
};

type NotificationStore = {
  notifications: HeaderNotification[];
  sourceSeen: Record<string, true>;
};

const NOTIFICATION_STORAGE_KEY = 'zoj.headerNotifications.v1';

function emptyStore(): NotificationStore {
  return { notifications: [], sourceSeen: {} };
}

function readStore(): NotificationStore {
  if (typeof window === 'undefined') return emptyStore();

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) ?? '',
    ) as Partial<NotificationStore>;

    return {
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : [],
      sourceSeen:
        parsed.sourceSeen && typeof parsed.sourceSeen === 'object'
          ? (parsed.sourceSeen as Record<string, true>)
          : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: NotificationStore) {
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(store));
}

function hasSeenPrefix(store: NotificationStore, prefix: string) {
  return Object.keys(store.sourceSeen).some((key) => key.startsWith(prefix));
}

function latestFirst(a: HeaderNotification, b: HeaderNotification) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function formatNotificationAge(value: string, now: number) {
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return '-';

  const diffSeconds = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}초전`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}분전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 10) return `${diffHours}시간전`;

  return formatDateTime(value);
}

function problemLabel(submission: Submission) {
  return (
    submission.problem?.problem_code ??
    submission.problem_code ??
    submission.problem?.title ??
    submission.problem_title ??
    '문제'
  );
}

function submissionHref(contestId: string, submission: Submission) {
  if (submission.problem_id) {
    return `/contests/${contestId}/problems/${submission.problem_id}?submissionId=${encodeURIComponent(
      submission.submission_id,
    )}`;
  }

  return `/contests/${contestId}/submissions`;
}

function answerBelongsToParticipant(
  question: ContestQuestion,
  teamName?: string,
  memberName?: string,
) {
  if (!teamName && !memberName) return false;
  return (
    (teamName ? question.team_name === teamName : false) ||
    (memberName ? question.author_name === memberName : false)
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 20 20">
      <path
        d="M6.25 8.25a3.75 3.75 0 0 1 7.5 0v2.1c0 .7.22 1.38.63 1.95l.74 1.03H4.88l.74-1.03c.41-.57.63-1.25.63-1.95v-2.1ZM8.5 15.5a1.75 1.75 0 0 0 3 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 20 20">
      <path
        d="m6 6 8 8M14 6l-8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function HeaderNotifications() {
  const navigate = useNavigate();
  const contestNestedMatch = useMatch('/contests/:contestId/*');
  const contestExactMatch = useMatch('/contests/:contestId');
  const contestMatch = contestNestedMatch ?? contestExactMatch;
  const contestId = contestMatch?.params.contestId ?? '';
  const {
    activeParticipantSession,
    ensureParticipantSession,
    participantContest,
    token,
  } = useContestParticipantSession(contestId);
  const [store, setStore] = useState<NotificationStore>(() => readStore());
  const [now, setNow] = useState(() => Date.now());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const participantToken = activeParticipantSession?.accessToken ?? token;
  const canPollContestNotifications = Boolean(
    contestId && (participantContest || activeParticipantSession),
  );
  const participantTeamName =
    participantContest?.team.team_name ??
    activeParticipantSession?.team.team_name;
  const participantMemberName =
    participantContest?.member.name ?? activeParticipantSession?.member.name;

  useEffect(() => {
    if (store.notifications.length === 0) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [store.notifications.length]);

  useEffect(() => {
    writeStore(store);
  }, [store]);

  const noticesQuery = useQuery({
    enabled: canPollContestNotifications,
    queryKey: contestQueryKeys.notices(
      contestId,
      participantToken,
      participantContest?.contest.contest_id,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session =
        activeParticipantSession ??
        (participantContest ? await ensureParticipantSession() : null);
      return getContestNotices(
        contestId,
        session?.accessToken ?? participantToken,
      );
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  const questionsQuery = useQuery({
    enabled: canPollContestNotifications,
    queryKey: contestQueryKeys.questions(
      contestId,
      participantToken,
      participantContest?.contest.contest_id,
      activeParticipantSession?.accessToken,
    ),
    queryFn: async () => {
      const session =
        activeParticipantSession ??
        (participantContest ? await ensureParticipantSession() : null);
      return getContestQuestions(
        contestId,
        session?.accessToken ?? participantToken,
      );
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  const submissionsQuery = useQuery({
    enabled: canPollContestNotifications,
    queryKey: [
      ...contestQueryKeys.submissions(
        contestId,
        participantToken,
        participantContest?.contest.contest_id,
        undefined,
        activeParticipantSession?.accessToken,
        undefined,
        undefined,
        false,
      ),
      'header-notifications',
    ],
    queryFn: async () => {
      const session =
        activeParticipantSession ??
        (participantContest ? await ensureParticipantSession() : null);
      return listSubmissionsPage(
        contestId,
        session?.accessToken ?? participantToken,
        {
          limit: 10,
        },
      );
    },
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const notices = noticesQuery.data;
    if (!contestId || !notices) return;

    const timer = window.setTimeout(() => {
      setStore((current) => {
        const prefix = `notice:${contestId}:`;
        const hasBaseline = hasSeenPrefix(current, prefix);
        const next: NotificationStore = {
          notifications: [...current.notifications],
          sourceSeen: { ...current.sourceSeen },
        };

        notices.forEach((notice: ContestNotice) => {
          const sourceKey = `${prefix}${notice.contest_notice_id}`;
          if (next.sourceSeen[sourceKey]) return;
          next.sourceSeen[sourceKey] = true;

          if (!hasBaseline) return;
          next.notifications.unshift({
            body: notice.title,
            createdAt: notice.published_at,
            href: `/contests/${contestId}/board?noticeId=${encodeURIComponent(
              notice.contest_notice_id,
            )}`,
            id: sourceKey,
            sourceKey,
            title: '공지 올라왔습니다',
            type: 'notice',
          });
        });

        next.notifications = next.notifications.sort(latestFirst);
        return next;
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [contestId, noticesQuery.data]);

  useEffect(() => {
    const questions = questionsQuery.data;
    if (!contestId || !questions) return;

    const timer = window.setTimeout(() => {
      setStore((current) => {
        const prefix = `answer:${contestId}:`;
        const hasBaseline = hasSeenPrefix(current, prefix);
        const next: NotificationStore = {
          notifications: [...current.notifications],
          sourceSeen: { ...current.sourceSeen },
        };

        questions
          .filter((question) =>
            answerBelongsToParticipant(
              question,
              participantTeamName,
              participantMemberName,
            ),
          )
          .forEach((question) => {
            question.answers.forEach((answer) => {
              const sourceKey = `${prefix}${answer.contest_answer_id}`;
              if (next.sourceSeen[sourceKey]) return;
              next.sourceSeen[sourceKey] = true;

              if (!hasBaseline) return;
              next.notifications.unshift({
                body: question.title,
                createdAt: answer.created_at,
                href: `/contests/${contestId}/board?questionId=${encodeURIComponent(
                  question.contest_question_id,
                )}`,
                id: sourceKey,
                sourceKey,
                title: '내 질문글에 답변이 달렸습니다',
                type: 'answer',
              });
            });
          });

        next.notifications = next.notifications.sort(latestFirst);
        return next;
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    contestId,
    participantMemberName,
    participantTeamName,
    questionsQuery.data,
  ]);

  useEffect(() => {
    const submissions = submissionsQuery.data?.data;
    if (!contestId || !submissions) return;

    const timer = window.setTimeout(() => {
      setStore((current) => {
        const prefix = `submission:${contestId}:`;
        const hasBaseline = hasSeenPrefix(current, prefix);
        const next: NotificationStore = {
          notifications: [...current.notifications],
          sourceSeen: { ...current.sourceSeen },
        };

        submissions.forEach((submission) => {
          if (!isSubmissionTerminal(submission.status)) return;

          const sourceKey = `${prefix}${submission.submission_id}:${submission.status}`;
          if (next.sourceSeen[sourceKey]) return;
          next.sourceSeen[sourceKey] = true;

          if (!hasBaseline) return;
          next.notifications.unshift({
            body: submissionStatusLabel(submission.status),
            createdAt: new Date().toISOString(),
            href: submissionHref(contestId, submission),
            id: sourceKey,
            sourceKey,
            title: `${problemLabel(submission)}에 대한 제출결과가 나왔습니다`,
            type: 'submission',
          });
        });

        next.notifications = next.notifications.sort(latestFirst);
        return next;
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [contestId, submissionsQuery.data]);

  const toastNotifications = useMemo(
    () =>
      store.notifications
        .filter((notification) => !notification.dismissedAt)
        .sort(latestFirst),
    [store.notifications],
  );
  const panelNotifications = useMemo(
    () => [...store.notifications].sort(latestFirst),
    [store.notifications],
  );

  function dismissNotification(notificationId: string) {
    setStore((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, dismissedAt: new Date().toISOString() }
          : notification,
      ),
    }));
  }

  function openNotification(notification: HeaderNotification) {
    dismissNotification(notification.id);
    setIsPanelOpen(false);
    navigate(notification.href);
  }

  return (
    <>
      <button
        aria-label="알림"
        className="relative flex size-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:size-11"
        onClick={() => setIsPanelOpen(true)}
        type="button"
      >
        <BellIcon />
        {toastNotifications.length > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs leading-5 font-black text-white">
            {toastNotifications.length}
          </span>
        ) : null}
      </button>

      {toastNotifications.length > 0 ? (
        <div className="fixed top-24 right-4 z-[65] grid w-[min(22rem,calc(100vw-2rem))] gap-2">
          {toastNotifications.map((notification) => (
            <article
              className="grid gap-2 rounded-lg border border-slate-200 bg-white/95 p-4 text-left shadow-xl backdrop-blur"
              key={notification.id}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="grid min-w-0 flex-1 gap-1 text-left"
                  onClick={() => openNotification(notification)}
                  type="button"
                >
                  <span className="text-sm font-black text-slate-950">
                    {notification.title}
                  </span>
                  <span className="line-clamp-2 text-xs leading-5 font-bold text-slate-600">
                    {notification.body}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {formatNotificationAge(notification.createdAt, now)}
                  </span>
                </button>
                <button
                  aria-label="알림 닫기"
                  className="flex size-7 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  onClick={() => dismissNotification(notification.id)}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {isPanelOpen ? (
        <div
          aria-labelledby="notification-panel-title"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-slate-950/40"
          role="dialog"
        >
          <button
            aria-label="알림 닫기"
            className="absolute inset-0 size-full cursor-default"
            onClick={() => setIsPanelOpen(false)}
            type="button"
          />
          <aside className="absolute top-0 right-0 grid h-full w-full max-w-md grid-rows-[auto_minmax(0,1fr)] border-l border-slate-200 bg-white shadow-2xl">
            <header className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <p className="text-xs font-black text-indigo-600 uppercase">
                    Notifications
                  </p>
                  <h2
                    className="text-xl font-black text-slate-950"
                    id="notification-panel-title"
                  >
                    알림
                  </h2>
                </div>
                <button
                  className="h-9 rounded border border-slate-200 px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setIsPanelOpen(false)}
                  type="button"
                >
                  닫기
                </button>
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto px-6 py-5">
              {panelNotifications.length > 0 ? (
                <ul className="grid gap-2">
                  {panelNotifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        className="grid w-full gap-1 rounded border border-slate-200 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                        onClick={() => openNotification(notification)}
                        type="button"
                      >
                        <span className="text-sm font-black text-slate-950">
                          {notification.title}
                        </span>
                        <span className="line-clamp-2 text-xs leading-5 font-bold text-slate-600">
                          {notification.body}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {formatNotificationAge(notification.createdAt, now)}
                          {notification.dismissedAt
                            ? ` · 닫음 ${formatTime(notification.dismissedAt)}`
                            : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-bold text-slate-500">
                  받은 알림이 없습니다.
                </p>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
