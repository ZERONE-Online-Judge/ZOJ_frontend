import type { Contest } from '@/domains/contestAdministration/types';
import type { GeneralParticipantContest } from '@/domains/teamParticipation/types';

export type StaffAccount = {
  email: string;
  display_name: string;
  is_service_master: boolean;
  contest_scopes: Record<string, string[]>;
};

export type StaffSession = {
  accessToken: string;
  refreshToken: string;
  staff: StaffAccount;
  defaultRedirect: string;
};

export type StaffSessionApi = {
  access_token: string;
  refresh_token: string;
  staff: StaffAccount;
  default_redirect: string;
};

export type GeneralOperatorContest = {
  contest: Contest;
  scopes: string[];
};

export type GeneralSession = {
  accessToken: string;
  refreshToken: string;
  account: {
    email: string;
    display_name: string;
  };
  participantContests: GeneralParticipantContest[];
  operatorContests: GeneralOperatorContest[];
  operatorSession?: StaffSession | null;
};

export type GeneralSessionApi = {
  access_token?: string;
  refresh_token?: string;
  account: {
    email: string;
    display_name: string;
  };
  participant_contests: GeneralParticipantContest[];
  operator_contests: GeneralOperatorContest[];
  operator_session?: StaffSessionApi | null;
};

export type OtpRequestResponse = {
  sent: boolean;
  delivery: string;
  cooldown_seconds: number;
  demo_otp?: string;
};

export type GeneralLoginMethod = {
  method: 'otp' | 'password';
};
