import HeaderPanel, {
  HeaderIcon,
  type HeaderIconName,
} from '@/components/layout/HeaderPanel';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMatch, useNavigate } from 'react-router-dom';
import { contestQueryKeys } from '@/domains/contestRuntime/queryKeys';
import { useContestParticipantSession } from '@/domains/contestRuntime/useContestParticipantSession';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import { getParticipantPreview } from '@/domains/teamParticipation/api';
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
import { formatDateTime } from '@/shared/lib/dateTime';

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

const notificationLabels: Record<HeaderNotificationType, string> = {
  notice: '대회 공지',
  answer: '질문 답변',
  submission: '채점 결과',
};
const notificationIcons: Record<HeaderNotificationType, HeaderIconName> = {
  notice: 'bell',
  answer: 'answer',
  submission: 'submission',
};

function NotificationContent({
  notification,
  now,
}: {
  notification: HeaderNotification;
  now: number;
}) {
  return (
    <>
      <span className="header-notification-icon" data-type={notification.type}>
        <HeaderIcon name={notificationIcons[notification.type]} />
      </span>
      <span className="header-notification-content">
        <span className="header-notification-meta">
          {notificationLabels[notification.type]}
          {!notification.dismissedAt ? (
            <>
              <i aria-hidden="true" />
              <span className="sr-only">새 알림</span>
            </>
          ) : null}
        </span>
        <strong>{notification.title}</strong>
        <span>{notification.body}</span>
        <time dateTime={notification.createdAt}>
          {formatNotificationAge(notification.createdAt, now)}
        </time>
      </span>
    </>
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
    isPreview,
    participantContest,
    token,
  } = useContestParticipantSession(contestId);
  const [store, setStore] = useState<NotificationStore>(() => readStore());
  const [now, setNow] = useState(() => Date.now());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const participantToken = activeParticipantSession?.accessToken ?? token;
  const previewSelection = useQuery({
    enabled: isPreview && Boolean(contestId && participantToken),
    queryKey: [
      'participant-preview',
      contestId,
      tokenQueryIdentity(participantToken),
    ],
    queryFn: () => getParticipantPreview(contestId, participantToken!),
    refetchOnMount: 'always',
    refetchInterval: 15_000,
  });
  const hasValidPreviewSelection =
    previewSelection.isFetchedAfterMount &&
    !previewSelection.error &&
    previewSelection.data?.selected_division_id ===
      activeParticipantSession?.division.division_id;
  const canPollContestNotifications = Boolean(
    contestId &&
    (participantContest || activeParticipantSession) &&
    (!isPreview || hasValidPreviewSelection),
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

  function removeNotification(notification: HeaderNotification) {
    setStore((current) => ({
      ...current,
      notifications: current.notifications.filter(
        (item) => item.id !== notification.id,
      ),
      // Keep the source recorded so polling cannot recreate a removed alert.
      sourceSeen: { ...current.sourceSeen, [notification.sourceKey]: true },
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
        aria-expanded={isPanelOpen}
        aria-haspopup="dialog"
        className="header-action"
        onClick={() => setIsPanelOpen(true)}
        type="button"
      >
        <HeaderIcon name="bell" />
        <span className="header-action-label">알림</span>
        {toastNotifications.length ? (
          <span className="header-action-count">
            {toastNotifications.length > 99 ? '99+' : toastNotifications.length}
          </span>
        ) : null}
      </button>
      {toastNotifications.length && !isPanelOpen ? (
        <div className="header-toast-stack" aria-label="새 알림">
          {toastNotifications.slice(0, 3).map((notification) => (
            <article className="header-toast" key={notification.id}>
              <button
                onClick={() => openNotification(notification)}
                type="button"
              >
                <NotificationContent notification={notification} now={now} />
              </button>
              <button
                aria-label="알림 닫기"
                className="header-icon-button"
                onClick={() => dismissNotification(notification.id)}
                type="button"
              >
                <HeaderIcon name="close" />
              </button>
            </article>
          ))}
          {toastNotifications.length > 3 ? (
            <button
              className="header-toast-more"
              type="button"
              onClick={() => setIsPanelOpen(true)}
            >
              새 알림 {toastNotifications.length}개 모두 보기 ↗
            </button>
          ) : null}
        </div>
      ) : null}
      {isPanelOpen ? (
        <HeaderPanel
          id="notification-panel-title"
          title="알림"
          label="NOTIFICATIONS"
          icon="bell"
          description="대회 소식부터 내 질문의 답변, 채점 결과까지."
          onClose={() => setIsPanelOpen(false)}
        >
          {panelNotifications.length ? (
            <>
              <div className="header-section-heading">
                <h3>받은 알림</h3>
                <span>새 알림 {toastNotifications.length}개</span>
              </div>
              <ul className="header-notification-list">
                {panelNotifications.map((notification) => (
                  <li
                    className={`header-notification-card ${notification.dismissedAt ? 'is-dismissed' : ''}`}
                    key={notification.id}
                  >
                    <button
                      className="header-notification-open"
                      onClick={() => openNotification(notification)}
                      type="button"
                    >
                      <NotificationContent
                        notification={notification}
                        now={now}
                      />
                    </button>
                    <button
                      aria-label={`${notification.title} 알림 삭제`}
                      className="header-icon-button header-notification-remove"
                      onClick={() => removeNotification(notification)}
                      title="알림 삭제"
                      type="button"
                    >
                      <HeaderIcon name="close" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="header-empty">
              <span>
                <HeaderIcon name="bell" />
              </span>
              <strong>아직 도착한 알림이 없어요.</strong>
              <p>
                새로운 소식이 생기면
                <br />
                이곳에 차곡차곡 모아 드릴게요.
              </p>
            </div>
          )}
        </HeaderPanel>
      ) : null}
    </>
  );
}
