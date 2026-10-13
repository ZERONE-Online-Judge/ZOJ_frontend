import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateAdminJudgeNodeWorkloads } from '@/domains/auditMonitoring/api';
import type { AdminJudgeNode } from '@/domains/auditMonitoring/types';
import { formatApiError } from '@/shared/api/errors';

export default function JudgeNodeWorkloads({
  node,
  token,
}: {
  node: AdminJudgeNode;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const allowZoj = node.allow_zoj ?? true;
  const allowEditor = node.allow_editor ?? true;
  async function change(allow_zoj: boolean, allow_editor: boolean) {
    if (pending || (!allow_zoj && !allow_editor)) return;
    setPending(true);
    setError('');
    try {
      await queryClient.cancelQueries({
        queryKey: ['admin', 'judge-dashboard'],
      });
      const saved = await updateAdminJudgeNodeWorkloads(
        node.judge_node_id,
        token,
        { allow_zoj, allow_editor },
      );
      queryClient.setQueriesData<{ nodes: AdminJudgeNode[] }>(
        { queryKey: ['admin', 'judge-dashboard'] },
        (old) =>
          old
            ? {
                ...old,
                nodes: old.nodes.map((item) =>
                  item.judge_node_id === node.judge_node_id
                    ? { ...item, ...saved }
                    : item,
                ),
              }
            : old,
      );
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'judge-dashboard'],
      });
    } catch (cause) {
      setError(formatApiError(cause, '처리 범위를 저장하지 못했습니다'));
    } finally {
      setPending(false);
    }
  }
  return (
    <fieldset
      aria-label={`${node.node_name} 처리할 작업`}
      className="space-y-2"
      disabled={pending}
    >
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <label className="inline-flex items-center gap-2 font-medium text-slate-700">
          <input
            aria-label={`${node.node_name} ZOJ 채점`}
            type="checkbox"
            className="h-4 w-4 accent-indigo-600"
            checked={allowZoj}
            disabled={pending || (allowZoj && !allowEditor)}
            onChange={(event) => void change(event.target.checked, allowEditor)}
          />
          ZOJ
        </label>
        <label className="inline-flex items-center gap-2 font-medium text-slate-700">
          <input
            aria-label={`${node.node_name} Editor 실행`}
            type="checkbox"
            className="h-4 w-4 accent-indigo-600"
            checked={allowEditor}
            disabled={pending || (allowEditor && !allowZoj)}
            onChange={(event) => void change(allowZoj, event.target.checked)}
          />
          Editor
        </label>
      </div>
      <p className="text-xs text-slate-500" aria-live="polite">
        {pending
          ? '저장 중…'
          : allowZoj && allowEditor
            ? 'ZOJ·Editor 모두 처리'
            : allowZoj
              ? 'ZOJ만 처리'
              : 'Editor만 처리'}
      </p>
      {allowEditor &&
      (!(node.execution_capabilities ?? []).includes('editor-execute-v1') ||
        !node.execution_revision) ? (
        <p className="text-xs text-amber-700">
          Editor 전체 실행은 채점기 업데이트 후 사용할 수 있습니다.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
