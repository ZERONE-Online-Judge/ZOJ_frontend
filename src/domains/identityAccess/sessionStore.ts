import { create } from 'zustand';
import {
  loadStoredGeneralSession,
  loadStoredParticipantSession,
  saveGeneralSession,
  saveParticipantSession,
} from '@/domains/identityAccess/sessionStorage';
import type { GeneralSession } from '@/domains/identityAccess/types';
import type { ParticipantSession } from '@/domains/teamParticipation/types';

type SessionStore = {
  generalSession: GeneralSession | null;
  participantSession: ParticipantSession | null;
  setGeneralSession: (session: GeneralSession | null) => void;
  setParticipantSession: (session: ParticipantSession | null) => void;
  clearSessions: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  generalSession: loadStoredGeneralSession(),
  participantSession: loadStoredParticipantSession(),
  setGeneralSession: (session) => {
    saveGeneralSession(session);
    set({ generalSession: session });
  },
  setParticipantSession: (session) => {
    saveParticipantSession(session);
    set({ participantSession: session });
  },
  clearSessions: () => {
    saveGeneralSession(null);
    saveParticipantSession(null);
    set({ generalSession: null, participantSession: null });
  },
}));

