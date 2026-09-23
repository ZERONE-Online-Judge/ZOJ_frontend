import { create } from 'zustand';

export type PresentationSession = {
  access_token: string;
  contest_id: string;
  expires_at: string;
};
const KEY = 'zoj.presentationSession';
function read(): PresentationSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    return value &&
      typeof value.access_token === 'string' &&
      typeof value.contest_id === 'string' &&
      typeof value.expires_at === 'string' &&
      Number.isFinite(Date.parse(value.expires_at))
      ? value
      : null;
  } catch {
    return null;
  }
}
export function presentationPath(contestId: string) {
  return `/presentation/contests/${encodeURIComponent(contestId)}`;
}
export function isPresentationEmail(email: string) {
  return email.trim().toLowerCase().endsWith('@score.zoj.kr');
}
export const usePresentationSession = create<{
  session: PresentationSession | null;
  setSession: (session: PresentationSession | null) => void;
}>((set) => ({
  session: read(),
  setSession: (session) => {
    try {
      if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* The current tab can still display the presentation. */
    }
    set({ session });
  },
}));
