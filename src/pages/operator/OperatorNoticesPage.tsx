import { type FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { sharedUiText } from '@/data/uiText';
import {
  NoticeIcon,
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
} from '@/components/operator/OperatorShell';
import {
  getOperatorContestDashboard,
  updateContestSettings,
} from '@/domains/contestAdministration/api';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import {
  createContestNotice,
  deleteContestNotice,
  listOperatorContestNotices,
  updateContestNotice,
} from '@/domains/serviceCommunication/api';
import type { ContestNotice } from '@/domains/serviceCommunication/types';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';

type NoticeForm = {
  body: string;
  emergency: boolean;
  noticeId: string;
  pinned: boolean;
  title: string;
  visibility: 'public' | 'participants';
};

const emptyNoticeForm: NoticeForm = {
  body: '',
  emergency: false,
  noticeId: '',
  pinned: false,
  title: '',
  visibility: 'participants',
};

type NoticeEditorMode = 'notice' | 'emergency';

export default function OperatorNoticesPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate contestId={contestId} permission="contest.notice.view">
      {(session) =>
        contestId ? (
          <OperatorNoticesContent
            contestId={contestId}
            token={session.accessToken}
          />
        ) : (
          <PageLayout title={sharedUiText.contestSelectionRequiredTitle}>
            {sharedUiText.contestSelectionRequiredBody}
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorNoticesContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const queryIdentity = tokenQueryIdentity(token);
  const [form, setForm] = useState(emptyNoticeForm);
  const [emergencyNotice, setEmergencyNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [editorMode, setEditorMode] = useState<NoticeEditorMode>('notice');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId, queryIdentity],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const noticesQuery = useQuery({
    queryKey: ['operator', 'notices', contestId, queryIdentity],
    queryFn: () => listOperatorContestNotices(contestId, token),
    refetchInterval: 15_000,
  });

  const contest = dashboardQuery.data?.contest;
  const notices = noticesQuery.data ?? [];

  const saveNoticeMutation = useMutation({
    mutationFn: () =>
      form.noticeId
        ? updateContestNotice(contestId, form.noticeId, token, {
            body: form.body.trim(),
            emergency: form.emergency,
            pinned: form.pinned,
            title: form.title.trim(),
            visibility: form.visibility,
          })
        : createContestNotice(contestId, token, {
            body: form.body.trim(),
            emergency: form.emergency,
            pinned: form.pinned,
            title: form.title.trim(),
            visibility: form.visibility,
          }),
    onSuccess: () => {
      setForm(emptyNoticeForm);
      setFormError('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'notices', contestId],
      });
    },
  });

  const saveEmergencyMutation = useMutation({
    mutationFn: () =>
      updateContestSettings(contestId, token, {
        emergency_notice: emergencyNotice.trim() || null,
      }),
    onSuccess: () => {
      setEmergencyNotice('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'dashboard', contestId],
      });
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: (noticeId: string) =>
      deleteContestNotice(contestId, noticeId, token),
    onSuccess: (_result, noticeId) => {
      if (form.noticeId === noticeId) {
        setForm(emptyNoticeForm);
        setFormError('');
      }
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'notices', contestId],
      });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setFormError('공지 제목과 본문을 입력해야 합니다.');
      return;
    }
    saveNoticeMutation.mutate();
  }

  function editNotice(notice: ContestNotice) {
    setForm({
      body: notice.body,
      emergency: notice.emergency,
      noticeId: notice.contest_notice_id,
      pinned: notice.pinned,
      title: notice.title,
      visibility: notice.visibility,
    });
    setEditorMode('notice');
  }

  function removeNotice(notice: ContestNotice) {
    const confirmed = window.confirm(
      `"${notice.title}" 공지를 삭제할까요? 삭제한 공지는 복구할 수 없습니다.`,
    );
    if (!confirmed) return;
    deleteNoticeMutation.mutate(notice.contest_notice_id);
  }

  return (
    <PageLayout
      description="대회 참가자에게 보이는 공지와 긴급 공지를 관리합니다."
      eyebrow="Operator"
      title={`${contest?.title ?? '대회'} 공지`}
      width="7xl"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || noticesQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || noticesQuery.error}
          fallback="공지 데이터를 불러오지 못했습니다"
        />
      ) : null}

      <div className="grid gap-6">
        <OperatorPanel
          actions={
            <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-1">
              <button
                className={[
                  'h-9 rounded px-4 text-sm font-black transition',
                  editorMode === 'notice'
                    ? 'bg-indigo-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950',
                ].join(' ')}
                onClick={() => setEditorMode('notice')}
                type="button"
              >
                공지 작성
              </button>
              <button
                className={[
                  'h-9 rounded px-4 text-sm font-black transition',
                  editorMode === 'emergency'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950',
                ].join(' ')}
                onClick={() => setEditorMode('emergency')}
                type="button"
              >
                긴급 문구
              </button>
            </div>
          }
          description={
            editorMode === 'notice'
              ? '새 공지를 작성하거나 기존 공지를 수정합니다.'
              : '대회 페이지 헤더 아래에 짧게 노출되는 긴급 문구입니다.'
          }
          title={editorMode === 'notice' ? '공지 작성' : '긴급 문구'}
        >
          {editorMode === 'notice' ? (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <TextInput
                  label="제목"
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, title: value }))
                  }
                  value={form.title}
                />
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  공개 범위
                  <select
                    className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        visibility: event.target
                          .value as NoticeForm['visibility'],
                      }))
                    }
                    value={form.visibility}
                  >
                    <option value="participants">참가자</option>
                    <option value="public">공개</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                본문
                <textarea
                  className="min-h-36 resize-y rounded border border-slate-200 px-3 py-3 text-sm leading-6 font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, body: event.target.value }))
                  }
                  value={form.body}
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Toggle
                    checked={form.pinned}
                    label="상단 고정"
                    onChange={(checked) =>
                      setForm((prev) => ({ ...prev, pinned: checked }))
                    }
                  />
                  <Toggle
                    checked={form.emergency}
                    label="긴급 공지"
                    onChange={(checked) =>
                      setForm((prev) => ({ ...prev, emergency: checked }))
                    }
                  />
                </div>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded bg-indigo-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-800 disabled:bg-slate-300"
                  disabled={saveNoticeMutation.isPending}
                  type="submit"
                >
                  <NoticeIcon />
                  {form.noticeId ? '공지 수정' : '공지 등록'}
                </button>
              </div>
              {formError || saveNoticeMutation.error ? (
                <ErrorBox
                  error={saveNoticeMutation.error}
                  fallback={formError || '공지 저장에 실패했습니다'}
                />
              ) : null}
            </form>
          ) : (
            <div className="grid gap-4">
              {contest?.emergency_notice ? (
                <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {contest.emergency_notice}
                </p>
              ) : null}
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveEmergencyMutation.mutate();
                }}
              >
                <TextInput
                  label="긴급 문구"
                  onChange={setEmergencyNotice}
                  value={emergencyNotice}
                />
                {saveEmergencyMutation.error ? (
                  <ErrorBox
                    error={saveEmergencyMutation.error}
                    fallback="긴급 문구 저장에 실패했습니다"
                  />
                ) : null}
                <div className="flex justify-end">
                  <button
                    className="h-10 rounded bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:bg-slate-300"
                    disabled={saveEmergencyMutation.isPending}
                    type="submit"
                  >
                    긴급 문구 저장
                  </button>
                </div>
              </form>
            </div>
          )}
        </OperatorPanel>

        <OperatorPanel
          description="참가자 화면 상단에 표시될 대회 공지입니다."
          title="공지 목록"
        >
          <div className="divide-y divide-slate-100 rounded border border-slate-200">
            {notices.length > 0 ? (
              notices.map((notice) => (
                <article
                  className="grid gap-3 px-4 py-4"
                  key={notice.contest_notice_id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.pinned ? (
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                        상단
                      </span>
                    ) : null}
                    {notice.emergency ? (
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
                        긴급
                      </span>
                    ) : null}
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                      {notice.visibility === 'public' ? '공개' : '참가자'}
                    </span>
                    <time className="text-xs font-bold text-slate-400">
                      {formatDateTime(notice.published_at)}
                    </time>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => editNotice(notice)}
                      type="button"
                    >
                      <strong className="text-lg font-black break-keep text-slate-950">
                        {notice.title}
                      </strong>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {notice.body}
                      </p>
                    </button>
                    <button
                      className="h-9 rounded border border-rose-200 bg-white px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:text-slate-300"
                      disabled={deleteNoticeMutation.isPending}
                      onClick={() => removeNotice(notice)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                등록된 공지가 없습니다.
              </p>
            )}
          </div>
          {deleteNoticeMutation.error ? (
            <div className="mt-3">
              <ErrorBox
                error={deleteNoticeMutation.error}
                fallback="공지 삭제에 실패했습니다"
              />
            </div>
          ) : null}
        </OperatorPanel>
      </div>
    </PageLayout>
  );
}

function TextInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
      <input
        checked={checked}
        className="size-4 accent-indigo-600"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
      {error ? formatApiError(error, fallback) : fallback}
    </p>
  );
}
