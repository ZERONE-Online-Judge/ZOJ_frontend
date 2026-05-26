import { toApiError } from '@/shared/api/errors';
import type {
  ApiPageMeta,
  ApiPagePayload,
  ApiRawResponse,
} from '@/shared/api/types';
import {
  emitSessionSync,
  loadStoredGeneralSession,
  loadStoredParticipantSession,
  mapGeneralSession,
  mapStaffSession,
  saveGeneralSession,
  saveParticipantSession,
  SESSION_EXPIRED_EVENT,
  type SessionExpiredEventDetail,
} from '@/domains/identityAccess/sessionStorage';
import type { GeneralSession } from '@/domains/identityAccess/types';
import type { ParticipantSession } from '@/domains/teamParticipation/types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

let staffRefreshInFlight: Promise<string | null> | null = null;
let generalRefreshInFlight: Promise<string | null> | null = null;
let participantRefreshInFlight: Promise<string | null> | null = null;

type DataEnvelope<T> = {
  data?: T;
  page?: ApiPageMeta;
};

export function parseContestId(path: string) {
  const match = path.match(/\/contests\/([^/]+)/);
  return match?.[1] ?? null;
}

export async function apiFetchRaw(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<ApiRawResponse> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => null);

  return { response, payload };
}

export function canAttemptAutoRefresh(path: string) {
  if (!path.startsWith('/')) return false;
  if (path === '/auth/staff/refresh' || path === '/auth/general/refresh')
    return false;
  if (path === '/auth/staff/login' || path === '/auth/general/otp/verify')
    return false;
  if (
    path === '/auth/staff/otp/verify' ||
    path === '/auth/general/password/otp/verify'
  )
    return false;
  if (
    path === '/auth/general/password/login' ||
    path === '/auth/general/login-method'
  )
    return false;
  if (path === '/auth/general/password/otp/request') return false;
  if (
    path === '/auth/general/otp/request' ||
    path === '/auth/staff/otp/request'
  )
    return false;
  if (path === '/auth/staff/logout' || path === '/auth/general/logout')
    return false;

  return true;
}

function storedReplacementTokenForRequest(
  token: string,
  path: string,
): string | null {
  const contestId = parseContestId(path);
  const participant = loadStoredParticipantSession();
  if (
    contestId &&
    participant?.accessToken &&
    participant.accessToken !== token &&
    (!participant.contestId || participant.contestId === contestId)
  ) {
    return participant.accessToken;
  }

  const general = loadStoredGeneralSession();
  if (
    (path.startsWith('/operator/') || path.startsWith('/admin/')) &&
    general?.operatorSession?.accessToken &&
    general.operatorSession.accessToken !== token
  ) {
    return general.operatorSession.accessToken;
  }

  if (
    general?.accessToken &&
    general.accessToken !== token &&
    (path.startsWith('/auth/general/') || contestId)
  ) {
    return general.accessToken;
  }

  return null;
}

function preferredStoredTokenForRequest(
  path: string,
  token?: string,
): string | undefined {
  if (token) return storedReplacementTokenForRequest(token, path) ?? token;

  const general = loadStoredGeneralSession();
  if (
    (path.startsWith('/operator/') || path.startsWith('/admin/')) &&
    general?.operatorSession?.accessToken
  ) {
    return general.operatorSession.accessToken;
  }

  if (
    (path === '/auth/general/me' || path.startsWith('/auth/general/')) &&
    general?.accessToken
  ) {
    return general.accessToken;
  }

  const contestId = parseContestId(path);
  const participant = loadStoredParticipantSession();
  if (
    contestId &&
    participant?.accessToken &&
    (!participant.contestId || participant.contestId === contestId)
  ) {
    return participant.accessToken;
  }

  return token;
}

async function refreshOperatorAccessTokenViaGeneralSession(): Promise<
  string | null
> {
  const general = loadStoredGeneralSession();
  if (!general?.accessToken) return null;

  let generalToken = general.accessToken;
  if (general.refreshToken) {
    generalToken = (await refreshGeneralAccessToken(generalToken)) ?? generalToken;
  }

  let result = await apiFetchRaw('/auth/general/me', generalToken);

  if (result.response.status === 401) {
    const refreshedGeneral = await refreshGeneralAccessToken(generalToken);
    if (!refreshedGeneral) return null;

    generalToken = refreshedGeneral;
    result = await apiFetchRaw('/auth/general/me', generalToken);
  }

  if (!result.response.ok) return null;

  const next = mapGeneralSession(
    (result.payload as DataEnvelope<Parameters<typeof mapGeneralSession>[0]>)
      .data!,
    loadStoredGeneralSession(),
  );
  saveGeneralSession(next);
  emitSessionSync();

  return next.operatorSession?.accessToken ?? null;
}

async function refreshStaffAccessToken(token: string): Promise<string | null> {
  const general = loadStoredGeneralSession();
  if (general?.operatorSession?.accessToken !== token) return null;

  const operatorSession = general.operatorSession;
  if (!operatorSession.refreshToken) {
    return refreshOperatorAccessTokenViaGeneralSession();
  }

  if (!staffRefreshInFlight) {
    staffRefreshInFlight = (async () => {
      const { response, payload } = await apiFetchRaw(
        '/auth/staff/refresh',
        undefined,
        {
          method: 'POST',
          ...(operatorSession.refreshToken
            ? {
                body: JSON.stringify({
                  refresh_token: operatorSession.refreshToken,
                }),
              }
            : {}),
        },
      );
      if (!response.ok) return null;

      const data = (
        payload as DataEnvelope<Partial<Parameters<typeof mapStaffSession>[0]>>
      ).data;
      if (!data) return null;

      const refreshed = mapStaffSession({
        access_token: data.access_token ?? operatorSession.accessToken,
        refresh_token: data.refresh_token ?? operatorSession.refreshToken,
        staff: data.staff ?? operatorSession.staff,
        default_redirect:
          data.default_redirect ?? operatorSession.defaultRedirect,
      });
      const nextGeneral: GeneralSession = {
        ...general,
        operatorSession: refreshed,
      };
      saveGeneralSession(nextGeneral);
      emitSessionSync();
      return refreshed.accessToken;
    })().finally(() => {
      staffRefreshInFlight = null;
    });
  }

  return staffRefreshInFlight;
}

async function refreshGeneralAccessToken(
  token: string,
): Promise<string | null> {
  const general = loadStoredGeneralSession();
  if (!general || general.accessToken !== token) return null;

  if (!generalRefreshInFlight) {
    generalRefreshInFlight = (async () => {
      const { response, payload } = await apiFetchRaw(
        '/auth/general/refresh',
        undefined,
        {
          method: 'POST',
          ...(general.refreshToken
            ? { body: JSON.stringify({ refresh_token: general.refreshToken }) }
            : {}),
        },
      );
      if (!response.ok) return null;

      const next = mapGeneralSession(
        (payload as DataEnvelope<Parameters<typeof mapGeneralSession>[0]>)
          .data!,
        general,
      );
      saveGeneralSession(next);
      emitSessionSync();
      return next.accessToken;
    })().finally(() => {
      generalRefreshInFlight = null;
    });
  }

  return generalRefreshInFlight;
}

async function refreshParticipantAccessToken(
  token: string,
  path: string,
): Promise<string | null> {
  const participant = loadStoredParticipantSession();
  if (!participant || participant.accessToken !== token) return null;

  if (!participantRefreshInFlight) {
    participantRefreshInFlight = (async () => {
      const general = loadStoredGeneralSession();
      if (!general) return null;

      const contestId = participant.contestId || parseContestId(path);
      if (!contestId) return null;

      let generalToken = general.accessToken;
      let sessionResponse = await apiFetchRaw(
        `/auth/general/contests/${contestId}/participant-session`,
        generalToken,
        { method: 'POST' },
      );

      if (sessionResponse.response.status === 401) {
        const refreshedGeneral = await refreshGeneralAccessToken(generalToken);
        if (!refreshedGeneral) return null;

        generalToken = refreshedGeneral;
        sessionResponse = await apiFetchRaw(
          `/auth/general/contests/${contestId}/participant-session`,
          generalToken,
          { method: 'POST' },
        );
      }

      if (!sessionResponse.response.ok) return null;

      const data = (
        sessionResponse.payload as DataEnvelope<{
          access_token: string;
          team: ParticipantSession['team'];
          member: ParticipantSession['member'];
          division: ParticipantSession['division'];
        }>
      ).data;

      if (!data) return null;

      const next: ParticipantSession = {
        accessToken: data.access_token,
        contestId,
        team: data.team,
        member: data.member,
        division: data.division,
      };
      saveParticipantSession(next);
      emitSessionSync();
      return next.accessToken;
    })().finally(() => {
      participantRefreshInFlight = null;
    });
  }

  return participantRefreshInFlight;
}

async function tryRefreshTokenForRequest(
  token: string,
  path: string,
): Promise<string | null> {
  const replacement = storedReplacementTokenForRequest(token, path);
  if (replacement) return replacement;

  if (path.startsWith('/operator/') || path.startsWith('/admin/')) {
    const refreshedOperator =
      await refreshOperatorAccessTokenViaGeneralSession();
    if (refreshedOperator && refreshedOperator !== token)
      return refreshedOperator;
  }

  const refreshedStaff = await refreshStaffAccessToken(token);
  if (refreshedStaff) return refreshedStaff;

  const refreshedGeneral = await refreshGeneralAccessToken(token);
  if (refreshedGeneral) return refreshedGeneral;

  const refreshedParticipant = await refreshParticipantAccessToken(token, path);
  if (refreshedParticipant) return refreshedParticipant;

  return null;
}

export async function refreshActiveAccessTokens() {
  const general = loadStoredGeneralSession();
  if (!general?.accessToken) return false;

  const refreshedGeneral = await refreshGeneralAccessToken(general.accessToken);
  return Boolean(refreshedGeneral);
}

function clearStoredSessionForFailedToken(token: string, path: string) {
  const general = loadStoredGeneralSession();
  let changed = false;

  if (general?.accessToken === token) {
    saveGeneralSession(null);
    changed = true;
  } else if (general?.operatorSession?.accessToken === token) {
    saveGeneralSession({ ...general, operatorSession: null });
    changed = true;
  }

  const participant = loadStoredParticipantSession();
  const contestId = parseContestId(path);
  if (
    participant?.accessToken === token &&
    (!contestId ||
      !participant.contestId ||
      participant.contestId === contestId)
  ) {
    saveParticipantSession(null);
    changed = true;
  }

  if (changed) {
    emitSessionSync();
    if (typeof window !== 'undefined') {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.dispatchEvent(
        new CustomEvent<SessionExpiredEventDetail>(SESSION_EXPIRED_EVENT, {
          detail: { currentPath, requestPath: path },
        }),
      );
    }
  }
}

export async function apiRequest<T>(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<T> {
  let currentToken = preferredStoredTokenForRequest(path, token);
  let result = await apiFetchRaw(path, currentToken, init);

  if (
    !result.response.ok &&
    result.response.status === 401 &&
    currentToken &&
    canAttemptAutoRefresh(path)
  ) {
    const refreshedToken = await tryRefreshTokenForRequest(currentToken, path);
    if (refreshedToken) {
      currentToken = refreshedToken;
      result = await apiFetchRaw(path, currentToken, init);
    }
  }

  if (!result.response.ok) {
    if (
      result.response.status === 401 &&
      currentToken &&
      canAttemptAutoRefresh(path)
    ) {
      clearStoredSessionForFailedToken(currentToken, path);
    }
    throw toApiError(result.response, result.payload);
  }

  return (result.payload as DataEnvelope<T>).data as T;
}

export async function apiPageRequest<T>(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<ApiPagePayload<T>> {
  let currentToken = preferredStoredTokenForRequest(path, token);
  let result = await apiFetchRaw(path, currentToken, init);

  if (
    !result.response.ok &&
    result.response.status === 401 &&
    currentToken &&
    canAttemptAutoRefresh(path)
  ) {
    const refreshedToken = await tryRefreshTokenForRequest(currentToken, path);
    if (refreshedToken) {
      currentToken = refreshedToken;
      result = await apiFetchRaw(path, currentToken, init);
    }
  }

  if (!result.response.ok) {
    if (
      result.response.status === 401 &&
      currentToken &&
      canAttemptAutoRefresh(path)
    ) {
      clearStoredSessionForFailedToken(currentToken, path);
    }
    throw toApiError(result.response, result.payload);
  }

  const payload = result.payload as DataEnvelope<T>;
  return {
    data: (payload.data ?? []) as T,
    page: payload.page ?? {
      limit: 20,
      next_cursor: null,
      current_cursor: '0',
      total_count: 0,
    },
  };
}
