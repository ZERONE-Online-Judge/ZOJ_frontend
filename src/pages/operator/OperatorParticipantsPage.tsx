import { type FormEvent, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/common/PageLayout';
import { sharedUiText } from '@/data/uiText';
import {
  OperatorAccessGate,
  OperatorPanel,
  OperatorTabs,
  TeamIcon,
} from '@/components/operator/OperatorShell';
import { getOperatorContestDashboard } from '@/domains/contestAdministration/api';
import {
  bulkCreateParticipantTeams,
  createParticipantTeam,
  formatParticipantTeamError,
  listParticipantTeams,
  revokeParticipantMemberSessions,
  updateParticipantTeam,
} from '@/domains/teamParticipation/api';
import { parseTeamImportFile } from '@/domains/teamParticipation/importParser';
import type { ParticipantTeam } from '@/domains/teamParticipation/types';
import { formatApiError } from '@/shared/api/errors';
import { formatDateTime } from '@/shared/lib/dateTime';

type TeamForm = {
  divisionId: string;
  leaderEmail: string;
  leaderName: string;
  teamId: string;
  teamName: string;
};

const emptyTeamForm: TeamForm = {
  divisionId: '',
  leaderEmail: '',
  leaderName: '',
  teamId: '',
  teamName: '',
};

export default function OperatorParticipantsPage() {
  const { contestId } = useParams();

  return (
    <OperatorAccessGate
      contestId={contestId}
      permission="contest.participant.view"
    >
      {(session) =>
        contestId ? (
          <OperatorParticipantsContent
            contestId={contestId}
            token={session.accessToken}
          />
        ) : (
          <PageLayout title={sharedUiText.contestSelectionRequiredTitle}>
            {sharedUiText.contestSelectionRequiredBody}
          </PageLayout>
        )
      }
    </OperatorAccessGate>
  );
}

function OperatorParticipantsContent({
  contestId,
  token,
}: {
  contestId: string;
  token: string;
}) {
  const queryClient = useQueryClient();
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [bulkText, setBulkText] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');

  const dashboardQuery = useQuery({
    queryKey: ['operator', 'dashboard', contestId],
    queryFn: () => getOperatorContestDashboard(contestId, token),
  });
  const teamsQuery = useQuery({
    queryKey: ['operator', 'participants', contestId],
    queryFn: () => listParticipantTeams(contestId, token),
  });

  const divisionSource = dashboardQuery.data?.divisions;
  const divisions = useMemo(() => divisionSource ?? [], [divisionSource]);
  const teams = teamsQuery.data ?? [];
  const divisionById = useMemo(
    () =>
      new Map(divisions.map((division) => [division.division_id, division])),
    [divisions],
  );
  const filteredTeams = teams.filter((team) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return (
      team.team_name.toLowerCase().includes(keyword) ||
      team.members.some(
        (member) =>
          member.name.toLowerCase().includes(keyword) ||
          member.email.toLowerCase().includes(keyword),
      )
    );
  });

  const saveTeamMutation = useMutation({
    mutationFn: () =>
      teamForm.teamId
        ? updateParticipantTeam(contestId, teamForm.teamId, token, {
            division_id: teamForm.divisionId,
            team_name: teamForm.teamName.trim(),
          })
        : createParticipantTeam(contestId, token, {
            division_id: teamForm.divisionId,
            leader: {
              email: teamForm.leaderEmail.trim(),
              name: teamForm.leaderName.trim(),
              role: 'leader',
            },
            team_name: teamForm.teamName.trim(),
          }),
    onSuccess: () => {
      setTeamForm(emptyTeamForm);
      setFormError('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'participants', contestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'dashboard', contestId],
      });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: () =>
      bulkCreateParticipantTeams(
        contestId,
        token,
        parseTeamImportFile(bulkText, divisions),
      ),
    onSuccess: () => {
      setBulkText('');
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'participants', contestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'dashboard', contestId],
      });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: ({ memberId, teamId }: { memberId: string; teamId: string }) =>
      revokeParticipantMemberSessions(contestId, teamId, memberId, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['operator', 'participants', contestId],
      });
    },
  });

  function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamForm.teamName.trim() || !teamForm.divisionId) {
      setFormError('팀명과 참가 유형을 입력해야 합니다.');
      return;
    }
    if (
      !teamForm.teamId &&
      (!teamForm.leaderName.trim() || !teamForm.leaderEmail.trim())
    ) {
      setFormError('새 팀은 팀장 이름과 이메일이 필요합니다.');
      return;
    }
    saveTeamMutation.mutate();
  }

  function editTeam(team: ParticipantTeam) {
    const leader =
      team.members.find((member) => member.role === 'leader') ??
      team.members[0];
    setTeamForm({
      divisionId: team.division_id,
      leaderEmail: leader?.email ?? '',
      leaderName: leader?.name ?? '',
      teamId: team.participant_team_id,
      teamName: team.team_name,
    });
  }

  return (
    <PageLayout
      description="참가팀을 등록하고 팀원 세션을 관리합니다."
      eyebrow="Operator"
      title={`${dashboardQuery.data?.contest.title ?? '대회'} 참가팀`}
      width="7xl"
    >
      <OperatorTabs contestId={contestId} />

      {dashboardQuery.error || teamsQuery.error ? (
        <ErrorBox
          error={dashboardQuery.error || teamsQuery.error}
          fallback="참가팀 데이터를 불러오지 못했습니다"
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.45fr)]">
        <OperatorPanel
          actions={
            <input
              className="h-10 rounded border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="팀/이름/이메일 검색"
              value={search}
            />
          }
          description="등록된 참가팀과 팀원 상태입니다."
          title="참가팀 목록"
        >
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    팀
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    유형
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    팀원
                  </th>
                  <th className="border-r border-b border-slate-200 px-4 py-3">
                    등록
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <tr
                      className="hover:bg-indigo-50/40"
                      key={team.participant_team_id}
                    >
                      <td className="border-r border-slate-100 px-4 py-4">
                        <strong className="font-black text-slate-950">
                          {team.team_name}
                        </strong>
                        <span className="block text-xs font-bold text-slate-400">
                          {team.status}
                        </span>
                      </td>
                      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-700">
                        {divisionById.get(team.division_id)?.name ??
                          team.division?.name ??
                          '-'}
                      </td>
                      <td className="border-r border-slate-100 px-4 py-4">
                        <div className="grid gap-2">
                          {team.members.map((member) => (
                            <div
                              className="flex flex-wrap items-center gap-2"
                              key={member.team_member_id ?? member.email}
                            >
                              <span className="font-bold text-slate-800">
                                {member.name}
                              </span>
                              <span className="text-xs font-bold text-slate-400">
                                {member.email}
                              </span>
                              {member.team_member_id ? (
                                <button
                                  className="rounded border border-amber-200 px-2 py-1 text-xs font-black text-amber-700"
                                  onClick={() =>
                                    revokeSessionMutation.mutate({
                                      memberId: member.team_member_id!,
                                      teamId: team.participant_team_id,
                                    })
                                  }
                                  type="button"
                                >
                                  세션 해제
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border-r border-slate-100 px-4 py-4 font-bold text-slate-500">
                        {formatDateTime(team.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          className="rounded border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700"
                          onClick={() => editTeam(team)}
                          type="button"
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                      colSpan={5}
                    >
                      표시할 참가팀이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </OperatorPanel>

        <div className="grid gap-6">
          <OperatorPanel
            description="팀 단위로 참가자를 등록합니다."
            title="참가팀 등록"
          >
            <form className="grid gap-4" onSubmit={submitTeam}>
              <TextInput
                label="팀명"
                onChange={(value) =>
                  setTeamForm((prev) => ({ ...prev, teamName: value }))
                }
                value={teamForm.teamName}
              />
              <label className="grid gap-2 text-sm font-black text-slate-700">
                참가 유형
                <select
                  className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setTeamForm((prev) => ({
                      ...prev,
                      divisionId: event.target.value,
                    }))
                  }
                  value={teamForm.divisionId}
                >
                  <option value="">유형 선택</option>
                  {divisions.map((division) => (
                    <option
                      key={division.division_id}
                      value={division.division_id}
                    >
                      {division.name}
                    </option>
                  ))}
                </select>
              </label>
              {!teamForm.teamId ? (
                <>
                  <TextInput
                    label="팀장 이름"
                    onChange={(value) =>
                      setTeamForm((prev) => ({ ...prev, leaderName: value }))
                    }
                    value={teamForm.leaderName}
                  />
                  <TextInput
                    label="팀장 이메일"
                    onChange={(value) =>
                      setTeamForm((prev) => ({ ...prev, leaderEmail: value }))
                    }
                    value={teamForm.leaderEmail}
                  />
                </>
              ) : null}
              {formError || saveTeamMutation.error ? (
                <ErrorBox
                  error={saveTeamMutation.error}
                  fallback={
                    formError ||
                    formatParticipantTeamError(
                      saveTeamMutation.error,
                      '참가팀 저장에 실패했습니다',
                    )
                  }
                />
              ) : null}
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded bg-indigo-950 px-5 text-sm font-black text-white"
                type="submit"
              >
                <TeamIcon />
                {teamForm.teamId ? '참가팀 수정' : '참가팀 등록'}
              </button>
            </form>
          </OperatorPanel>

          <OperatorPanel
            description="CSV/TSV 헤더: team_name, division, leader_name, leader_email"
            title="일괄 등록"
          >
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                bulkCreateMutation.mutate();
              }}
            >
              <textarea
                className="min-h-44 resize-y rounded border border-slate-200 px-3 py-3 font-mono text-xs leading-5 text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) => setBulkText(event.target.value)}
                placeholder={
                  'team_name,division,leader_name,leader_email\nTeam A,일반,홍길동,a@example.com'
                }
                value={bulkText}
              />
              {bulkCreateMutation.error ? (
                <ErrorBox
                  error={bulkCreateMutation.error}
                  fallback="참가팀 일괄 등록에 실패했습니다"
                />
              ) : null}
              {bulkCreateMutation.data ? (
                <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {bulkCreateMutation.data.created.length}팀 등록,{' '}
                  {bulkCreateMutation.data.errors.length}건 실패
                </p>
              ) : null}
              <button
                className="h-11 rounded border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-700"
                type="submit"
              >
                일괄 등록 실행
              </button>
            </form>
          </OperatorPanel>
        </div>
      </div>
    </PageLayout>
  );
}

function TextInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="h-11 rounded border border-slate-200 px-3 text-sm font-bold text-slate-950 transition outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function ErrorBox({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <p className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
      {error ? formatApiError(error, fallback) : fallback}
    </p>
  );
}
