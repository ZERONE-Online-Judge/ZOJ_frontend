import { useState } from 'react';
import { Link } from 'react-router-dom';
import ContestAccessDeniedModal from '@/components/contest/ContestAccessDeniedModal';
import { contestListItemText } from '@/data/uiText';
import { useSessionStore } from '@/domains/identityAccess/sessionStore';
import { SvgIcon } from '@/utils/Icons';

export type ContestListItemData = {
  contestId: string;
  title: string;
  organization: string;
  status: string;
  period?: string;
  registrationDeadline?: string;
  isOpen?: boolean;
  href?: string;
};

type ContestListItemProps = ContestListItemData;

export default function ContestListItem({
  contestId,
  title,
  organization,
  status,
  period,
  registrationDeadline,
  isOpen = false,
  href,
}: ContestListItemProps) {
  const [isAccessDeniedOpen, setIsAccessDeniedOpen] = useState(false);
  const [isUnavailableMessageVisible, setIsUnavailableMessageVisible] =
    useState(false);
  const generalSession = useSessionStore((state) => state.generalSession);
  const loginHref = `/login?reason=contest&contestId=${encodeURIComponent(contestId)}`;
  const contestHref = `/contests/${encodeURIComponent(contestId)}`;
  const isParticipantContest = generalSession?.participantContests.some(
    (item) => item.contest.contest_id === contestId,
  );
  const canOpenContest = !generalSession || isParticipantContest;
  const itemHref = canOpenContest
    ? (href ?? (generalSession ? contestHref : loginHref))
    : undefined;
  const canShowUnavailableMessage = canOpenContest && !itemHref;

  const content = (
    <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {isParticipantContest ? (
            <span className="inline-flex h-7 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-black text-slate-700">
              <span className="bg-zoj-blue size-2 rounded-full" />
              <span>내 참가</span>
            </span>
          ) : null}
          <span className="inline-flex h-7 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-black text-slate-700">
            <span
              className={
                isOpen
                  ? 'size-2 rounded-full bg-emerald-500'
                  : 'size-2 rounded-full bg-slate-300'
              }
            />
            {status}
          </span>
          <span className="min-w-0 text-sm font-bold break-keep text-slate-400">
            {organization}
          </span>
        </div>
        <h2 className="text-xl leading-7 font-black break-keep text-slate-950">
          {title}
        </h2>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
        {period ? (
          <span className="bg-zoj-blue/15 text-zoj-blue inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold">
            <SvgIcon name="timer" size={14} />
            {contestListItemText.periodPrefix}: {period}
          </span>
        ) : null}
        {registrationDeadline ? (
          <span className="bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
            {contestListItemText.registrationDeadlinePrefix}:{' '}
            {registrationDeadline}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <li
      className={[
        'relative overflow-hidden rounded border border-slate-200 bg-white transition',
        itemHref || !canOpenContest || canShowUnavailableMessage
          ? 'hover:border-zoj-blue hover:shadow-sm'
          : 'opacity-70',
      ].join(' ')}
    >
      {isParticipantContest ? (
        <span
          aria-hidden="true"
          className="bg-zoj-blue absolute inset-y-0 left-0 w-2"
        />
      ) : null}
      {itemHref ? (
        <Link className="block px-8 py-7" to={itemHref}>
          {content}
        </Link>
      ) : !canOpenContest ? (
        <>
          <button
            aria-haspopup="dialog"
            className="block w-full px-8 py-7 text-left"
            onClick={() => setIsAccessDeniedOpen(true)}
            type="button"
          >
            {content}
          </button>
          {isAccessDeniedOpen ? (
            <ContestAccessDeniedModal
              onClose={() => setIsAccessDeniedOpen(false)}
            />
          ) : null}
        </>
      ) : canShowUnavailableMessage ? (
        <button
          className="block w-full px-8 py-7 text-left"
          onClick={() => setIsUnavailableMessageVisible(true)}
          type="button"
        >
          {content}
          {isUnavailableMessageVisible ? (
            <p
              className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"
              role="alert"
            >
              {contestListItemText.unavailableMessage}
            </p>
          ) : null}
        </button>
      ) : (
        <div className="px-8 py-7">{content}</div>
      )}
    </li>
  );
}
