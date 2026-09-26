import { useState, type ReactNode } from 'react';
import ContestVisibilitySettings from '@/components/operator/ContestVisibilitySettings';
import SettingsSaveBar from '@/components/operator/SettingsSaveBar';
import CollapsibleEditor from '@/components/operator/CollapsibleEditor';
import ContestRoleSelector from '@/components/operator/ContestRoleSelector';
import OperatorList from '@/components/operator/OperatorList';
import ParticipantMemberCard from '@/components/operator/ParticipantMemberCard';
import SessionExpiredNotice from '@/components/auth/SessionExpiredNotice';
import NoticeEditorFields, {
  type NoticeForm,
} from '@/components/operator/NoticeEditorFields';
import NoticeItem from '@/components/ui/NoticeItem';
import NoticeCountdownText from '@/components/contest/NoticeCountdownText';
import QuestionInlineDetail, {
  type AnswerForm,
} from '@/components/operator/QuestionInlineDetail';
import ScoreboardReleaseView from '@/components/operator/ScoreboardReleaseView';
import ContestScoreboardTable from '@/components/contest/scoreboard/ContestScoreboardTable';
import ProblemStatementPanel from '@/components/contest/problem/ProblemStatementPanel';
import ProblemReviewResult from '@/components/operator/ProblemReviewResult';
import SubmissionDetailContent from '@/components/operator/SubmissionDetailContent';
import OperationalAuditLogTable from '@/components/audit/OperationalAuditLogTable';
import ModalDialog, { ModalButton } from '@/shared/ui/ModalDialog';
import useConfirmation from '@/shared/ui/useConfirmation';
import type { ContestVisibility } from '@/domains/contestAdministration/types';
import type { ContestRole } from '@/domains/identityAccess/contestRoles';
import type { StaffAccount } from '@/domains/identityAccess/types';
import type {
  ScoreboardRelease,
  ScoreboardReleaseAction,
} from '@/domains/submissionScoreboard/types';
import {
  guideAuditLogs,
  guideContest,
  guideContestId,
  guideProblem,
  guideQuestion,
  guideRanks,
  guideSubmission,
  guideTime,
} from './guideFixtures';
import '@/pages/operator/OperatorSettingsPage.css';

export function PracticeFrame({
  title,
  location,
  steps,
  children,
}: {
  title: string;
  location: string;
  steps: string[];
  children: ReactNode;
}) {
  return (
    <section className="og-practice" aria-label={title}>
      <header className="og-practice-header">
        <div>
          <span className="og-eyebrow">화면으로 익히기 · {location}</span>
          <h3>{title}</h3>
        </div>
        <span className="og-practice-tag">연습용 예제</span>
      </header>
      <ol className="og-practice-steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="og-practice-safety">
        서비스와 같은 화면 요소를 사용합니다. 이 안의 입력과 버튼은 예제
        데이터에만 적용됩니다.
      </p>
      <div className="og-practice-surface">{children}</div>
    </section>
  );
}
function Feedback({ children }: { children: ReactNode }) {
  return (
    <p className="og-practice-feedback" role="status">
      {children}
    </p>
  );
}
const buttonStyle =
  'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50';
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

export function SettingsPractice() {
  const [saved, setSaved] = useState<{
    visibility: ContestVisibility;
    visibility_after_end: ContestVisibility;
  }>({ visibility: 'public', visibility_after_end: 'private' });
  const [draft, setDraft] = useState(saved);
  const [message, setMessage] = useState('');
  const { confirm, dialog } = useConfirmation();
  const changed =
    Number(saved.visibility !== draft.visibility) +
    Number(saved.visibility_after_end !== draft.visibility_after_end);
  return (
    <PracticeFrame
      title="선택한 공개 범위를 저장하기"
      location="설정 → 공개 범위"
      steps={[
        '종료 후 대회 공개 여부를 공개로 바꿉니다.',
        '변경사항 저장을 누릅니다.',
        '저장 전 되돌리기는 확인창에서 취소할 수 있습니다.',
      ]}
    >
      {dialog}
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(draft);
          setMessage('설정을 저장했습니다.');
        }}
      >
        <ContestVisibilitySettings
          visibility={draft.visibility}
          afterEnd={draft.visibility_after_end}
          onChange={(field, value) => {
            setDraft((previous) => ({ ...previous, [field]: value }));
            setMessage('');
          }}
        />
        <SettingsSaveBar
          changedCount={changed}
          pending={false}
          savedMessage={message}
          onReset={async () => {
            if (
              await confirm('아직 저장하지 않은 변경사항을 모두 되돌릴까요?', {
                title: '설정 변경 취소',
                confirmLabel: '되돌리기',
              })
            ) {
              setDraft(saved);
              setMessage('');
            }
          }}
        />
      </form>
      <Feedback>
        적용된 종료 후 공개 범위:{' '}
        <strong>
          {saved.visibility_after_end === 'public' ? '공개' : '비공개'}
        </strong>{' '}
        ·{' '}
        {saved.visibility_after_end === 'public'
          ? '대회 목록과 소개는 비로그인 방문자에게도 표시됩니다.'
          : '대회 목록과 소개는 해당 참가자·운영자에게만 표시됩니다.'}{' '}
        자료별 공개 범위는 별도 설정입니다.
      </Feedback>
    </PracticeFrame>
  );
}

export function RolesPractice() {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<ContestRole[]>(['problem_reviewer']);
  const [name, setName] = useState('예제 검수자');
  const [email, setEmail] = useState('reviewer@example.com');
  const [operators, setOperators] = useState<StaffAccount[]>([]);
  const [editing, setEditing] = useState('');
  const { confirm, dialog } = useConfirmation();
  return (
    <PracticeFrame
      title="운영자 추가와 권한 수정"
      location="운영자 추가"
      steps={[
        '운영자 추가를 펼칩니다.',
        '이름·이메일과 담당 권한을 입력한 뒤 추가합니다.',
        '목록에서 이름·이메일·권한 수정을 눌러 다시 편집합니다.',
      ]}
    >
      {dialog}
      <CollapsibleEditor
        title={editing ? '운영자 정보 수정' : '운영자 추가'}
        description="이름·이메일과 담당 권한을 입력합니다."
        open={open}
        onOpenChange={setOpen}
        draft={open}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!roles.length || !name.trim() || !email.trim()) return;
            const next: StaffAccount = {
              email: email.trim().toLowerCase(),
              display_name: name.trim(),
              is_service_master: false,
              contest_scopes: { [guideContestId]: [] },
              contest_roles: { [guideContestId]: roles },
            };
            setOperators((current) => [
              ...current.filter(
                (item) =>
                  item.email !== (editing || email.trim().toLowerCase()),
              ),
              next,
            ]);
            setEditing('');
            setOpen(false);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이름" value={name} onChange={setName} />
            <Field
              label="이메일"
              type="email"
              value={email}
              onChange={setEmail}
            />
          </div>
          <ContestRoleSelector
            canAssignMaster
            value={roles}
            onChange={setRoles}
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!roles.length || !name.trim() || !email.trim()}
          >
            {editing ? '변경사항 저장' : '운영자 추가'}
          </button>
        </form>
      </CollapsibleEditor>
      <div className="mt-4">
        <OperatorList
          contestId={guideContestId}
          canAssignMaster
          disabled={false}
          operators={operators}
          onEdit={(account) => {
            setName(account.display_name);
            setEmail(account.email);
            setRoles(account.contest_roles?.[guideContestId] ?? []);
            setEditing(account.email);
            setOpen(true);
          }}
          onRemove={async (account) => {
            if (await confirm(`${account.display_name} 운영자를 제거할까요?`)) {
              setOperators((current) =>
                current.filter((item) => item.email !== account.email),
              );
            }
          }}
        />
      </div>
      <Feedback>
        {operators.length
          ? `${operators.length}명의 예제 운영자가 목록에 있습니다. 저장한 권한은 목록의 배지에 표시됩니다.`
          : '아직 추가한 예제 운영자가 없습니다.'}
      </Feedback>
    </PracticeFrame>
  );
}

export function SessionPractice() {
  const [active, setActive] = useState(true);
  const [notice, setNotice] = useState(false);
  return (
    <PracticeFrame
      title="참가자 계정 로그아웃"
      location="참가팀 → 팀원 세션"
      steps={[
        '팀원 카드에서 활성 세션 수를 확인합니다.',
        '계정 로그아웃을 누릅니다.',
        '참가자에게 표시되는 종료 안내를 확인합니다.',
      ]}
    >
      <ParticipantMemberCard
        member={{
          team_member_id: 'example-member',
          name: '예제 참가자',
          email: 'participant@example.com',
          role: 'leader',
          active_sessions: active ? 2 : 0,
          last_session_seen_at: guideTime,
        }}
        pending={false}
        onRevoke={() => {
          setActive(false);
          setNotice(true);
        }}
      />
      {notice ? (
        <SessionExpiredNotice
          onHome={() => setNotice(false)}
          onLogin={() => setNotice(false)}
        />
      ) : null}
      <Feedback>
        {active
          ? '계정 로그아웃은 이 계정의 모든 기기·대회 로그인 세션을 해제합니다.'
          : '예제 세션이 모두 해제되었습니다. 다시 로그인하려면 실제 서비스에서는 인증 절차를 거칩니다.'}
      </Feedback>
      {!active ? (
        <button
          className={buttonStyle}
          type="button"
          onClick={() => setNotice(true)}
        >
          참가자 종료 안내 다시 보기
        </button>
      ) : null}
    </PracticeFrame>
  );
}

export function NoticePractice() {
  const [contest] = useState(guideContest);
  const [form, setForm] = useState<NoticeForm>({
    title: '종료 시각 안내',
    body: '마감 전에 제출을 완료해 주세요.',
    visibility: 'participants',
    pinned: false,
    emergency: false,
    noticeId: '',
  });
  const [saved, setSaved] = useState<NoticeForm | null>(null);
  return (
    <PracticeFrame
      title="공지를 작성하고 참가자 표시 확인하기"
      location="공지 → 공지 작성"
      steps={[
        '제목·본문과 공개 범위를 입력합니다.',
        '종료 카운트다운을 눌러 문구를 추가합니다.',
        '공지 등록을 누르고 아래 결과를 확인합니다.',
      ]}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (form.title.trim() && form.body.trim()) setSaved({ ...form });
        }}
      >
        <NoticeEditorFields form={form} setForm={setForm} contest={contest} />
      </form>
      {saved ? (
        <div className="og-practice-result">
          <h4>
            저장된 공지 · {saved.visibility === 'public' ? '공개' : '참가자'}
          </h4>
          <ul>
            <NoticeItem
              title={saved.title}
              date="예제 대회"
              tone={
                saved.emergency
                  ? 'emergency'
                  : saved.pinned
                    ? 'pinned'
                    : 'default'
              }
              label={saved.emergency ? '긴급' : saved.pinned ? '고정' : '공지'}
            />
          </ul>
          <p className="px-4 py-3 text-sm whitespace-pre-wrap">
            <NoticeCountdownText text={saved.body} contest={contest} />
          </p>
        </div>
      ) : null}
      <Feedback>
        예제 대회는 이 화면을 연 시점에서 20분 뒤 종료됩니다. 카운트다운은 실제
        공지와 같은 방식으로 갱신됩니다.
      </Feedback>
    </PracticeFrame>
  );
}

export function BoardPractice() {
  const [question, setQuestion] = useState({ ...guideQuestion });
  const [deleted, setDeleted] = useState(false);
  const [form, setForm] = useState<AnswerForm>({
    body: '',
    questionId: '',
    visibility: 'public',
  });
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState<Error | null>(null);
  const { confirm, dialog } = useConfirmation();
  return (
    <PracticeFrame
      title="질문에 답변하고 공개 범위 바꾸기"
      location="게시판 → 질문 펼치기"
      steps={[
        '답변 작성을 누르고 내용을 입력합니다.',
        '답변 등록 후 답변 내역을 확인합니다.',
        '질문을 비공개로 전환하면 다음 답변의 공개 범위가 비공개로 고정됩니다.',
      ]}
    >
      {dialog}
      {deleted ? (
        <Feedback>
          예제 질문을 삭제했습니다. 처음부터 다시하기로 복원하세요.
        </Feedback>
      ) : (
        <QuestionInlineDetail
          question={question}
          answerForm={form}
          onAnswerChange={setForm}
          onStartAnswer={() => {
            setForm({
              body: '',
              questionId: question.contest_question_id,
              visibility:
                question.visibility === 'private' ? 'questioner' : 'public',
            });
            setError('');
          }}
          onCancelAnswer={() => {
            setForm({ ...form, questionId: '' });
            setError('');
          }}
          onSubmitAnswer={(event) => {
            event.preventDefault();
            if (!form.body.trim()) {
              setError('답변 내용을 입력해 주세요.');
              return;
            }
            setQuestion((previous) => ({
              ...previous,
              answers: [
                ...previous.answers,
                {
                  contest_answer_id: `example-answer-${previous.answers.length + 1}`,
                  body: form.body.trim(),
                  visibility:
                    previous.visibility === 'private'
                      ? 'questioner'
                      : form.visibility,
                  created_by_role: 'operator',
                  created_by_name: '예제 운영자',
                  created_at: guideTime,
                },
              ],
            }));
            setForm({ body: '', questionId: '', visibility: 'public' });
            setError('');
          }}
          onToggleVisibility={() =>
            setQuestion((previous) => ({
              ...previous,
              visibility:
                previous.visibility === 'public' ? 'private' : 'public',
              answers: previous.answers.map((answer) => ({
                ...answer,
                visibility: 'questioner',
              })),
            }))
          }
          onDelete={async () => {
            if (await confirm('이 질문을 삭제할까요?')) setDeleted(true);
          }}
          onDeleteAnswer={async (answer) => {
            if (await confirm('이 답변을 삭제할까요?'))
              setQuestion((previous) => ({
                ...previous,
                answers: previous.answers.filter(
                  (item) => item.contest_answer_id !== answer.contest_answer_id,
                ),
              }));
          }}
          onToggleAnswerVisibility={(answer) => {
            setActionError(null);
            if (question.visibility === 'private') {
              setActionError(
                new Error('비공개 질문에는 비공개 답변만 등록할 수 있습니다.'),
              );
              return;
            }
            setQuestion((previous) => ({
              ...previous,
              answers: previous.answers.map((item) =>
                item.contest_answer_id === answer.contest_answer_id
                  ? {
                      ...item,
                      visibility:
                        item.visibility === 'public' ? 'questioner' : 'public',
                    }
                  : item,
              ),
            }));
          }}
          answerActionError={actionError}
          answerActionPending={false}
          answerMutationError={null}
          deleteError={null}
          deletePending={false}
          formError={error}
          isAnswerSubmitting={false}
          updateError={null}
          updatePending={false}
        />
      )}
    </PracticeFrame>
  );
}

export function ScoreboardPractice() {
  const initial: ScoreboardRelease = {
    mode: 'not_started',
    strategy: 'manual',
    ranks: guideRanks.map((row) => ({
      rank: row.rank,
      team_count: 1,
      revealed: false,
    })),
    total_count: 3,
    revealed_count: 0,
  };
  const [release, setRelease] = useState(initial);
  const [history, setHistory] = useState<ScoreboardRelease[]>([]);
  function publish(action: ScoreboardReleaseAction) {
    if (action.action === 'undo') {
      const last = history.at(-1);
      if (last) {
        setRelease(last);
        setHistory(history.slice(0, -1));
      }
      return;
    }
    setHistory((previous) => [...previous, release]);
    const ranks = release.ranks.map((item) => ({
      ...item,
      revealed:
        action.action === 'all' ||
        item.revealed ||
        (action.action === 'rank' && item.rank === action.rank),
    }));
    setRelease({
      ...release,
      ranks,
      mode: ranks.every((item) => item.revealed) ? 'all' : 'partial',
      revealed_count: ranks.filter((item) => item.revealed).length,
      undo: { action: action.action, rank: action.rank },
    });
  }
  return (
    <PracticeFrame
      title="순위 공개와 되돌리기"
      location="스코어보드 → 순위별 공개"
      steps={[
        '개별 순위 공개 시작을 누릅니다.',
        '3위 공개부터 눌러 참가자 표에 나타나는 팀을 확인합니다.',
        '되돌리기 (Undo)를 눌러 마지막 공개를 취소합니다.',
      ]}
    >
      <ScoreboardReleaseView
        release={release}
        strategy="manual"
        divisionName="일반부"
        publish={publish}
      />
      <div className="og-practice-result">
        <h4>
          참가자 스코어보드 ·{' '}
          {release.mode === 'not_started'
            ? '공개 시작 전'
            : release.mode === 'all'
              ? '전체 공개'
              : '순위별 공개 중'}
        </h4>
        <ContestScoreboardTable
          release={release}
          rows={guideRanks.map((row) => ({
            ...row,
            is_revealed:
              release.mode === 'not_started' ||
              release.ranks.some(
                (item) => item.rank === row.rank && item.revealed,
              ),
          }))}
        />
      </div>
      <Feedback>
        공개 시작 전에는 프리즈 표가 표시됩니다. 이 예제는 프리즈 이후 점수
        변화가 없는 3팀입니다. 공개를 시작하면 팀 정보를 가리고 선택한 순위부터
        표시합니다.
      </Feedback>
    </PracticeFrame>
  );
}

export function ProblemPractice({ review = false }: { review?: boolean }) {
  const [tab, setTab] = useState<'problem' | 'result'>('problem');
  const [open, setOpen] = useState(false);
  return (
    <PracticeFrame
      title={
        review
          ? '문제를 읽고 검수 결과 확인하기'
          : '문제 미리보기와 실패 테스트 확인'
      }
      location={review ? '문제 모아보기' : '문제 → 전체 미리보기 · 검증 코드'}
      steps={[
        '문제의 제한·입출력 조건을 확인합니다.',
        '저장된 채점 결과로 이동합니다.',
        '실패 입력과 출력 비교를 펼쳐 원인을 확인합니다.',
      ]}
    >
      <div
        className="og-practice-tabs"
        role="group"
        aria-label="문제 예제 화면"
      >
        <button
          type="button"
          aria-pressed={tab === 'problem'}
          onClick={() => setTab('problem')}
        >
          문제 본문
        </button>
        <button
          type="button"
          aria-pressed={tab === 'result'}
          onClick={() => setTab('result')}
        >
          저장된 채점 결과
        </button>
      </div>
      {tab === 'problem' ? (
        <ProblemStatementPanel problem={guideProblem} />
      ) : (
        <>
          <ProblemReviewResult
            run={{
              id: 'example-run',
              problemId: guideProblem.problem_id,
              language: 'cpp17',
              sourceCode: guideSubmission.source_code!,
              startedAt: guideTime,
              phase: 'done',
              submission: guideSubmission,
            }}
            onResume={() => {}}
          />
          <button
            type="button"
            className={`${buttonStyle} mt-3`}
            onClick={() => setOpen(true)}
          >
            상세 보기
          </button>
        </>
      )}
      {open ? (
        <ModalDialog
          title="검증 제출 상세"
          size="wide"
          onClose={() => setOpen(false)}
          footer={
            <ModalButton onClick={() => setOpen(false)}>닫기</ModalButton>
          }
        >
          <SubmissionDetailContent
            submission={guideSubmission}
            owner="예제 운영자"
            kind="검증 제출"
            runtime="33 ms"
            memory="584 KB"
            codeLength="예제 코드"
          />
        </ModalDialog>
      ) : null}
      <Feedback>
        예제 코드는 덧셈 대신 뺄셈을 수행합니다. 입력 2 3의 기대 출력은 5, 실제
        출력은 -1입니다. 이 연습은 저장된 예제 판정을 표시하며 실제 채점을
        요청하지 않습니다.
      </Feedback>
    </PracticeFrame>
  );
}

export function SubmissionPractice() {
  const [state, setState] = useState<
    'waiting' | 'preparing' | 'judging' | 'wrong_answer'
  >('waiting');
  const submission = {
    ...guideSubmission,
    status: state,
    judge_message:
      state === 'wrong_answer' ? guideSubmission.judge_message : null,
    failed_testcase_order: state === 'wrong_answer' ? 2 : null,
    runtime_ms: state === 'wrong_answer' ? 33 : null,
    memory_kb: state === 'wrong_answer' ? 584 : null,
    progress_current: state === 'judging' ? 1 : null,
    progress_total: state === 'judging' ? 2 : null,
    queue_position: state === 'waiting' ? 1 : null,
  };
  return (
    <PracticeFrame
      title="제출 상태별 상세 화면"
      location="제출 → 상세 보기"
      steps={[
        '채점 대기·준비 중·채점 중 화면을 차례로 선택합니다.',
        '판정 완료를 선택해 시간·메모리와 실패 번호를 확인합니다.',
        '실패 입력·출력과 소스 코드를 비교합니다.',
      ]}
    >
      <div
        className="og-practice-tabs"
        role="group"
        aria-label="채점 상태 예제"
      >
        {(
          [
            ['waiting', '채점 대기'],
            ['preparing', '준비 중'],
            ['judging', '채점 중'],
            ['wrong_answer', '판정 완료'],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            aria-pressed={state === value}
            key={value}
            onClick={() => setState(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <SubmissionDetailContent
        submission={submission}
        owner="예제 참가자 · 예제팀"
        kind="참가자 제출"
        runtime={state === 'wrong_answer' ? '33 ms' : '-'}
        memory={state === 'wrong_answer' ? '584 KB' : '-'}
        codeLength="예제 코드"
      />
    </PracticeFrame>
  );
}

export function AuditPractice() {
  return (
    <PracticeFrame
      title="작업 이름에서 변경 전후 값까지"
      location="운영 로그 → 작업 로그"
      steps={[
        '작업 내용에서 대상과 변경 요약을 확인합니다.',
        '상세 기록 보기를 누릅니다.',
        '실제 변경된 항목과 요청에 포함된 값을 구분합니다.',
      ]}
    >
      <OperationalAuditLogTable logs={guideAuditLogs} />
    </PracticeFrame>
  );
}

export function NavigationPractice({
  onTopic,
  help = false,
}: {
  onTopic: (category: string, article: string) => void;
  help?: boolean;
}) {
  const items = help
    ? [
        [
          'settings',
          'visibility',
          '문제가 보이지 않아요',
          '설정 → 공개 범위에서 대회와 자료의 공개 대상을 확인합니다.',
        ],
        [
          'participants',
          'force-logout',
          '참가자가 로그인하지 못해요',
          '참가팀의 이메일·참가 상태·세션을 확인합니다.',
        ],
        [
          'problems',
          'bundle-trouble',
          '채점 준비에 실패했어요',
          '문제의 활성 테스트와 채점 번들 오류를 확인합니다.',
        ],
        [
          'logs',
          'login-investigation',
          '메일이 오지 않아요',
          '운영 로그 → 이메일 발송 로그에서 수신자와 발송 상태를 확인합니다.',
        ],
      ]
    : [
        ['settings', 'basic-status', '설정', '기본 정보와 일정을 저장합니다.'],
        [
          'participants',
          'divisions',
          '참가팀',
          '참가 유형을 만든 뒤 팀장·팀원을 등록합니다.',
        ],
        [
          'operators',
          'assign-role',
          '운영자 추가',
          '담당자와 권한을 등록합니다.',
        ],
        [
          'problems',
          'problem-basics',
          '문제',
          '지문·예제·테스트케이스를 준비합니다.',
        ],
        [
          'review',
          'review-flow',
          '문제 모아보기',
          '검수 코드를 제출하고 판정을 확인합니다.',
        ],
        [
          'scoreboard',
          'release-modes',
          '스코어보드',
          '프리즈와 종료 후 공개 방식을 정합니다.',
        ],
      ];
  return (
    <section
      className="og-practice"
      aria-label={help ? '증상별 해결 안내' : '관리 화면별 준비 순서'}
    >
      <header className="og-practice-header">
        <div>
          <span className="og-eyebrow">{help ? '문제 해결' : '시작하기'}</span>
          <h3>
            {help
              ? '증상에 해당하는 화면으로 이동하세요'
              : '실제 메뉴 순서대로 준비하세요'}
          </h3>
        </div>
      </header>
      <div className="og-practice-navigation">
        {items.map(([category, article, title, text]) => (
          <button
            key={article}
            type="button"
            onClick={() => onTopic(category, article)}
          >
            <strong>
              {title}
              <span>안내 보기 →</span>
            </strong>
            <p>{text}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
