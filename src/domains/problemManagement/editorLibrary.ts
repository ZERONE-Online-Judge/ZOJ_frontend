import { apiRequest } from '@/shared/api/client';
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
  options: { testset: string; statement_language: string };
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
  testset: string,
  statementLanguage: string,
) {
  return apiRequest<EditorPackage>(
    `${prefix(contestId)}/${projectId}/packages`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ testset, statement_language: statementLanguage }),
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
