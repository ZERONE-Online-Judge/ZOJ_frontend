import { create } from 'zustand';
import {
  loadStoredGeneralSession,
  loadStoredParticipantSession,
  emitSessionSync,
  saveGeneralSession,
  saveParticipantSession,
} from '@/domains/identityAccess/sessionStorage';
import type { GeneralSession } from '@/domains/identityAccess/types';
import type { ParticipantSession } from '@/domains/teamParticipation/types';

function loadStoredSessions() {
  return {
    generalSession: loadStoredGeneralSession(),
    participantSession: loadStoredParticipantSession(),
  };
}

type SessionStore = {
  generalSession: GeneralSession | null;
  participantSession: ParticipantSession | null;
  setGeneralSession: (session: GeneralSession | null) => void;
  setParticipantSession: (session: ParticipantSession | null) => void;
  syncSessionsFromStorage: () => void;
  clearSessions: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...loadStoredSessions(),
  setGeneralSession: (session) => {
    saveGeneralSession(session);
    set({ generalSession: session });
    emitSessionSync();
  },
  setParticipantSession: (session) => {
    saveParticipantSession(session);
    set({ participantSession: session });
    emitSessionSync();
  },
  syncSessionsFromStorage: () => {
    set(loadStoredSessions());
  },
  clearSessions: () => {
    saveGeneralSession(null);
    saveParticipantSession(null);
    set({ generalSession: null, participantSession: null });
    emitSessionSync();
  },
}));
