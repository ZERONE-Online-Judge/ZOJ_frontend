const VISITOR_KEY = 'zoj.usage.visitor.v1';
const VISIT_KEY = 'zoj.usage.visit.v1';
const VISIT_IDLE_MS = 30 * 60_000;
const VISITOR_LIFETIME_MS = 395 * 24 * 60 * 60_000;

type Identity = { id: string; at: number };
export type UsagePayload = {
  event_id: string;
  visitor_id: string;
  visit_id: string;
  path: string;
  referrer: string;
  active_seconds: number;
};
type TrackerOptions = {
  path: string;
  endpoint: string;
  getToken: () => string | undefined;
  now?: () => number;
  createId?: () => string;
  send?: (payload: UsagePayload, token: string | undefined) => void;
};
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let memoryVisitor: Identity | undefined;
let memoryVisit: Identity | undefined;
let previousPath: string | undefined;

export function usagePath(pathname: string, search: string) {
  if (pathname === '/support') {
    const tab = new URLSearchParams(search).get('tab');
    if (tab && ['rules', 'help', 'privacy', 'contact'].includes(tab))
      return `/support/${tab}`;
  }
  return pathname;
}

function read(key: string): Identity | undefined {
  try {
    const value = JSON.parse(
      (key === VISITOR_KEY ? localStorage : sessionStorage).getItem(key) ??
        'null',
    );
    if (uuidPattern.test(value?.id) && Number.isFinite(value.at)) return value;
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return key === VISITOR_KEY ? memoryVisitor : memoryVisit;
}
function write(key: string, value: Identity) {
  if (key === VISITOR_KEY) memoryVisitor = value;
  else memoryVisit = value;
  try {
    (key === VISITOR_KEY ? localStorage : sessionStorage).setItem(
      key,
      JSON.stringify(value),
    );
  } catch {
    /* Use memory for this page lifetime. */
  }
}
function coarseReferrer(value: string) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : '';
  } catch {
    return '';
  }
}

export function startUsageTracking({
  path,
  endpoint,
  getToken,
  now = Date.now,
  createId = () => crypto.randomUUID(),
  send,
}: TrackerOptions) {
  if (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  )
    return () => {};
  const report =
    send ??
    ((payload, token) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      void fetch(endpoint, {
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
        .catch(() => undefined)
        .finally(() => window.clearTimeout(timeout));
    });
  let event: UsagePayload | undefined;
  let activeSince: number | undefined;
  let lastVisibleAt = now();
  let activeMs = 0;
  let eventStartedAt = now();
  let stopped = false;
  function begin() {
    const timestamp = now();
    const oldVisitor = read(VISITOR_KEY);
    const visitor =
      oldVisitor &&
      timestamp - oldVisitor.at < VISITOR_LIFETIME_MS &&
      timestamp >= oldVisitor.at
        ? oldVisitor
        : { id: createId(), at: timestamp };
    write(VISITOR_KEY, visitor);
    const oldVisit = read(VISIT_KEY);
    const visit =
      oldVisit &&
      timestamp - oldVisit.at < VISIT_IDLE_MS &&
      timestamp >= oldVisit.at
        ? oldVisit
        : { id: createId(), at: timestamp };
    write(VISIT_KEY, { ...visit, at: timestamp });
    event = {
      event_id: createId(),
      visitor_id: visitor.id,
      visit_id: visit.id,
      path,
      referrer: previousPath
        ? window.location.origin
        : coarseReferrer(document.referrer),
      active_seconds: 0,
    };
    previousPath = path;
    activeMs = 0;
    eventStartedAt = timestamp;
    activeSince = timestamp;
    lastVisibleAt = timestamp;
    report(event, getToken());
  }
  function flush() {
    if (!event) return;
    const timestamp = now();
    if (activeSince !== undefined) {
      // A suspended laptop must not add hours of unattended time on wake.
      activeMs += Math.max(0, Math.min(timestamp - activeSince, 45_000));
      activeSince = document.hidden ? undefined : timestamp;
      lastVisibleAt = timestamp;
    }
    event = {
      ...event,
      active_seconds: Math.min(86400, Math.floor(activeMs / 1000)),
    };
    write(VISIT_KEY, { id: event.visit_id, at: lastVisibleAt });
    report(event, getToken());
  }
  function visibility() {
    if (stopped) return;
    if (document.hidden) {
      flush();
      activeSince = undefined;
    } else {
      if (!event || now() - lastVisibleAt >= VISIT_IDLE_MS) begin();
      else {
        activeSince = now();
        lastVisibleAt = now();
        flush();
      }
    }
  }
  // Let redirects and React StrictMode settle before counting a page.
  const initial = window.setTimeout(() => {
    if (!document.hidden && !event) begin();
  }, 250);
  const heartbeat = window.setInterval(() => {
    if (!document.hidden) {
      if (event) flush();
      // The server accepts updates for 24 hours; continue measuring long-open displays.
      if (!event || now() - eventStartedAt >= 23 * 60 * 60_000) begin();
    }
  }, 30_000);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', flush);
  function restored(event: PageTransitionEvent) {
    if (event.persisted) visibility();
  }
  window.addEventListener('pageshow', restored);
  return () => {
    stopped = true;
    window.clearTimeout(initial);
    window.clearInterval(heartbeat);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', flush);
    window.removeEventListener('pageshow', restored);
    flush();
  };
}
