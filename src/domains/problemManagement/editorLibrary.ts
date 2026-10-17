import { apiBlobRequest, apiRequest } from '@/shared/api/client';
import type { Problem } from './types';

export type EditorProject = {
  id: string;
  name: string;
  slug: string;
  revision: number;
  updated_at: number;
  folder_id: string | null;
  uncommitted: boolean;
  testsets: string[];
  statement_languages: string[];
  url: string;
};
export type EditorFolder = {
  id: string;
  name: string;
  parent_id: string | null;
};
export type EditorLibrary = {
  configured: boolean;
  email: string;
  account_exists?: boolean;
  editor_url?: string;
  problems: EditorProject[];
  folders: EditorFolder[];
  total: number;
  offset?: number;
  limit?: number;
};
export type EditorPackage = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  revision: number;
  summary: string;
  progress: number;
  options: { testset: string; testsets?: string[]; statement_language: string };
  package?: {
    verified: boolean;
    format: string;
    size: number;
    sha256: string;
    filename: string;
  } | null;
};
const prefix = (contestId: string) =>
  `/operator/contests/${contestId}/editor-problems`;
export function getEditorLibrary(
  contestId: string,
  token: string,
  q = '',
  offset = 0,
  folder = 'all',
) {
  return apiRequest<EditorLibrary>(
    `${prefix(contestId)}?${new URLSearchParams({ q, offset: String(offset), folder })}`,
    token,
  );
}
export function prepareEditorPackage(
  contestId: string,
  token: string,
  projectId: string,
  testsets: string[],
  statementLanguage: string,
) {
  return apiRequest<EditorPackage>(
    `${prefix(contestId)}/${projectId}/packages`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        testset: testsets[0],
        testsets,
        statement_language: statementLanguage,
      }),
    },
  );
}
export function getEditorPackage(
  contestId: string,
  token: string,
  projectId: string,
  jobId: string,
) {
  return apiRequest<EditorPackage>(
    `${prefix(contestId)}/${projectId}/packages/${jobId}`,
    token,
  );
}
export function importEditorProject(
  contestId: string,
  token: string,
  projectId: string,
  jobId: string,
  divisionId: string,
  problemCode: string,
) {
  return apiRequest<Problem>(
    `${prefix(contestId)}/${projectId}/import`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        job_id: jobId,
        division_id: divisionId,
        problem_code: problemCode.trim(),
      }),
    },
  );
}
export function editorFolderPath(folders: EditorFolder[], id: string | null) {
  const path: string[] = [];
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const folder = folders.find((f) => f.id === id);
    if (!folder) break;
    path.unshift(folder.name);
    id = folder.parent_id;
  }
  return path.join(' / ');
}

export type PackageUpdatePreview = {
  target_problem_id: string;
  problem_code: string;
  title: string;
  target_hash: string;
  contest_title: string;
  division_name: string;
  archive_sha256: string;
  changes: {
    field: string;
    label: string;
    changed: boolean;
    truncated?: boolean;
    before: string | number | null;
    after: string | number | null;
  }[];
  files: {
    filename: string;
    category: string;
    change: 'added' | 'removed' | 'changed';
  }[];
  changed_file_count: number;
  current_testcase_count: number;
  incoming_testcase_count: number;
  testcase_changes: { added: number; removed: number; changed: number };
  next_testcase_version: number;
  contest_running: boolean;
  submission_count: number;
  preserved: string;
};
export type PackageUpdateResult = {
  problem: Problem;
  backup_url: string;
  official_results_unchanged: boolean;
};

export function previewEditorUpdate(
  contestId: string,
  token: string,
  projectId: string,
  jobId: string,
  targetId: string,
) {
  return apiRequest<PackageUpdatePreview>(
    `${prefix(contestId)}/${projectId}/updates:preview`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, target_problem_id: targetId }),
    },
  );
}
export function applyEditorUpdate(
  contestId: string,
  token: string,
  projectId: string,
  jobId: string,
  preview: PackageUpdatePreview,
  reason: string,
  confirmRunning: boolean,
) {
  return apiRequest<PackageUpdateResult>(
    `${prefix(contestId)}/${projectId}/updates`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        job_id: jobId,
        target_problem_id: preview.target_problem_id,
        target_hash: preview.target_hash,
        archive_sha256: preview.archive_sha256,
        reason,
        confirm_running: confirmRunning,
      }),
    },
  );
}
export async function downloadPackageBackup(path: string, token: string) {
  const blob = await apiBlobRequest(path.replace(/^\/api/, ''), token);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'before-update.zoj.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
