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
  operatorOnlyVisible?: boolean;
  countdownLabel?: string;
  period?: string;
  registrationDeadline?: string;
  isOpen?: boolean;
  publicResourceLabels?: string[];
  href?: string;
};

type ContestListItemProps = ContestListItemData;

export default function ContestListItem({
  contestId,
  title,
  organization,
  status,
  operatorOnlyVisible = false,
  countdownLabel,
  period,
  registrationDeadline,
  isOpen = false,
  publicResourceLabels = [],
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
  const isOperatorContest = generalSession?.operatorContests.some(
    (item) => item.contest.contest_id === contestId,
  );
  const operatorHref = `/operator/contests/${encodeURIComponent(contestId)}`;
  const hasPublicReadableResource = publicResourceLabels.some((label) =>
    label.includes('비로그인 공개'),
  );
  const canOpenContest =
    !generalSession || isParticipantContest || isOperatorContest;
  const itemHref = canOpenContest
    ? (href ??
      (isOperatorContest
        ? operatorHref
        : generalSession || hasPublicReadableResource
          ? contestHref
          : loginHref))
    : undefined;
  const canShowUnavailableMessage = canOpenContest && !itemHref;

  const content = (
    <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {isParticipantContest ? (
            <span className="inline-flex h-7 items-center gap-2 rounded-full bg-sky-50 px-3 text-xs font-black text-sky-700">
              <span className="size-2 rounded-full bg-sky-500" />
              <span>내 참가</span>
            </span>
          ) : null}
          {isOperatorContest ? (
            <span className="inline-flex h-7 items-center gap-2 rounded-full bg-indigo-50 px-3 text-xs font-black text-indigo-700">
              <span className="size-2 rounded-full bg-indigo-500" />
              <span>운영</span>
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
            {operatorOnlyVisible ? (
              <span className="text-slate-400">* 비공개됨</span>
            ) : null}
          </span>
          <span className="min-w-0 text-sm font-bold break-keep text-slate-400">
            {organization}
          </span>
        </div>
        <h2 className="text-xl leading-7 font-black break-keep text-slate-950">
          {title}
        </h2>
        {publicResourceLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {publicResourceLabels.map((label) => (
              <span
                className="inline-flex h-7 items-center rounded-full bg-emerald-50 px-3 text-xs font-black text-emerald-700"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
        {countdownLabel ? (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-700">
            <SvgIcon name="timer" size={14} />
            {countdownLabel}
          </span>
        ) : null}
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
        'zoj-surface zoj-surface-hover relative overflow-hidden rounded border border-slate-200 bg-white transition',
        itemHref || !canOpenContest || canShowUnavailableMessage
          ? 'hover:border-zoj-blue hover:shadow-sm'
          : 'opacity-70',
      ].join(' ')}
    >
      {isParticipantContest || isOperatorContest ? (
        <span
          aria-hidden="true"
          className={[
            'absolute inset-y-0 left-0 w-2',
            isOperatorContest ? 'bg-indigo-500' : 'bg-sky-500',
          ].join(' ')}
        />
      ) : null}
      {itemHref ? (
        <Link
          className="block px-8 py-7 transition-colors duration-200"
          to={itemHref}
        >
          {content}
        </Link>
      ) : !canOpenContest ? (
        <>
          <button
            aria-haspopup="dialog"
            className="zoj-pressable block w-full px-8 py-7 text-left"
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
          className="zoj-pressable block w-full px-8 py-7 text-left"
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
