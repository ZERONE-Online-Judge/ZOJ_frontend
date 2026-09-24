import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OperatorPanel } from '@/components/operator/OperatorShell';
import {
  createOperatorDivision,
  updateOperatorDivision,
} from '@/domains/contestAdministration/api';
import { isContestOperationLocked } from '@/domains/contestAdministration/logic';
import type { Contest, Division } from '@/domains/contestAdministration/types';
import { formatApiError } from '@/shared/api/errors';
import useConfirmation from '@/shared/ui/useConfirmation';

const emptyForm = { divisionId: '', name: '', description: '' };

export default function ParticipantDivisionsPanel({
  contestId,
  token,
  contest,
  divisions,
}: {
  contestId: string;
  token: string;
  contest: Contest;
  divisions: Division[];
}) {
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState('');
  const queryClient = useQueryClient();
  const locked = isContestOperationLocked(contest);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
      };
      return form.divisionId
        ? updateOperatorDivision(contestId, form.divisionId, token, body)
        : createOperatorDivision(contestId, token, body);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setSaved('참가 유형을 저장했습니다.');
      for (const name of ['dashboard', 'divisions', 'participants']) {
        void queryClient.invalidateQueries({
          queryKey: ['operator', name, contestId],
        });
      }
    },
  });
  const { confirm, dialog } = useConfirmation();
  const selected = divisions.find(
    (division) => division.division_id === form.divisionId,
  );
  const dirty =
    form.name !== (selected?.name ?? '') ||
    form.description !== (selected?.description ?? '');
  const guard = {
    confirm: async (action: () => void) => {
      if (
        !dirty ||
        (await confirm('입력 중인 참가 유형 변경사항을 버리고 이동할까요?'))
      )
        action();
    },
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!locked && !save.isPending && form.name.trim()) save.mutate();
  }
  return (
    <OperatorPanel
      title="참가 유형 관리"
      description="초등부·중등부처럼 참가팀을 나누는 구분입니다. 유형별로 문제와 스코어보드를 운영합니다."
    >
      {dialog}
      {locked ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          대회 진행 중에는 참가 유형을 추가하거나 수정할 수 없습니다.
        </p>
      ) : null}
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          {divisions.map((division) => (
            <button
              key={division.division_id}
              type="button"
              disabled={locked || save.isPending}
              aria-pressed={form.divisionId === division.division_id}
              className="min-w-0 rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-default disabled:hover:bg-white aria-pressed:border-indigo-400 aria-pressed:bg-indigo-50"
              onClick={() =>
                guard.confirm(() => {
                  setForm({
                    divisionId: division.division_id,
                    name: division.name,
                    description: division.description,
                  });
                  setSaved('');
                  save.reset();
                })
              }
            >
              <span className="block font-semibold break-words text-slate-900">
                {division.name}
              </span>
              <span className="mt-1 block text-sm break-words text-slate-500">
                {division.description || '설명 없음'}
              </span>
            </button>
          ))}
          {!divisions.length ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              참가팀을 등록하기 전에 참가 유형을 추가해 주세요.
            </p>
          ) : null}
        </div>
        <form
          onSubmit={submit}
          className="grid content-start gap-3 rounded-lg border border-slate-200 p-4"
        >
          <h3 className="font-semibold text-slate-900">
            {form.divisionId ? '참가 유형 수정' : '참가 유형 추가'}
          </h3>
          <fieldset
            disabled={locked || save.isPending}
            className="grid min-w-0 gap-3 disabled:opacity-60"
          >
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              유형 이름
              <input
                className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 font-normal"
                placeholder="예: 초등부, 중등부"
                required
                maxLength={120}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              설명
              <input
                className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 font-normal"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!form.name.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {save.isPending
                  ? '저장 중…'
                  : form.divisionId
                    ? '변경사항 저장'
                    : '유형 추가'}
              </button>
              {form.divisionId ? (
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                  onClick={() =>
                    guard.confirm(() => {
                      setForm(emptyForm);
                      save.reset();
                    })
                  }
                >
                  수정 취소
                </button>
              ) : null}
            </div>
          </fieldset>
          {save.error ? (
            <p role="alert" className="text-sm text-rose-700">
              {formatApiError(save.error, '참가 유형 저장에 실패했습니다')}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="text-sm text-emerald-700">
              {saved}
            </p>
          ) : null}
        </form>
      </div>
    </OperatorPanel>
  );
}
