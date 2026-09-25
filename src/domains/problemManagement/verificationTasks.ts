import { apiRequest, apiBlobRequest } from '@/shared/api/client';
import type { VerificationAnalysis } from './verificationAi';

export type VerificationTask = {
  task_id: string;
  parent_task_id: string | null;
  goal: string;
  source_asset_id: string | null;
  cancel_requested: boolean;
  stale?: boolean;
  analysis: VerificationAnalysis;
};
export type VerificationTasks = {
  available: boolean;
  can_run: boolean;
  limits: { max_cost_usd: number; max_calls: number; concurrency?: number };
  sources: { asset_id: string; filename: string }[];
  tasks: VerificationTask[];
};
const base = (cid: string, pid: string) =>
  `/operator/contests/${cid}/problems/${pid}/verification-tasks`;
export const listVerificationTasks = (
  cid: string,
  pid: string,
  token: string,
) => apiRequest<VerificationTasks>(base(cid, pid), token);
export const getVerificationTask = (
  cid: string,
  pid: string,
  tid: string,
  token: string,
) => apiRequest<VerificationTask>(`${base(cid, pid)}/${tid}`, token);
export const createVerificationTask = (
  cid: string,
  pid: string,
  token: string,
  body: {
    goal: string;
    source_asset_id?: string | null;
    parent_task_id?: string | null;
  },
) =>
  apiRequest<VerificationTask>(base(cid, pid), token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
export const stopVerificationTask = (
  cid: string,
  pid: string,
  tid: string,
  token: string,
) =>
  apiRequest<VerificationTask>(`${base(cid, pid)}/${tid}/stop`, token, {
    method: 'POST',
  });
export const downloadTaskWorkspace = (
  cid: string,
  pid: string,
  tid: string,
  token: string,
) => apiBlobRequest(`${base(cid, pid)}/${tid}/workspace.zip`, token);
