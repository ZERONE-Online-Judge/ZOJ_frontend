function scoreboardUpdateKey(contestId: string) {
  return `zoj.scoreboard.updated.${contestId}`;
}

export function notifyScoreboardUpdate(contestId: string) {
  try {
    // Only signal a refresh; each display fetches its own authorized data.
    window.localStorage.setItem(
      scoreboardUpdateKey(contestId),
      `${Date.now()}:${Math.random()}`,
    );
  } catch {
    // Presentation polling still works when browser storage is unavailable.
  }
}

export function subscribeScoreboardUpdates(
  contestId: string,
  onUpdate: () => void,
) {
  function handleStorage(event: StorageEvent) {
    if (event.key === scoreboardUpdateKey(contestId) && event.newValue) {
      onUpdate();
    }
  }

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
