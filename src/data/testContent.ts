import heroImage from '@/assets/images/hero image.png';
import type { PageInfoContent } from '@/components/common/PageInfoSection';
import type { ContestActivityContent } from '@/components/hepc/ContestActivityPanel';
import type { ContestDetailContent } from '@/components/hepc/ContestDetailPanel';
import type { ParticipantListContent } from '@/components/hepc/ParticipantListPanel';
import type { ContestWorkspaceHeaderContent } from '@/components/hepc/ContestWorkspaceHeader';
import type { ProblemStatusContent } from '@/components/hepc/ProblemStatusPanel';
import type { ContestCardData } from '@/components/ui/ContestCard';
import type { NoticeItemData } from '@/components/ui/NoticeItem';

export type HeroContent = {
  imageSrc: string;
  imageAlt: string;
  headline: string;
  description: string;
};

export type PreviewContent<TItem> = {
  title: string;
  items: TItem[];
};

export type MainPageContent = {
  hero: HeroContent;
  notices: PreviewContent<NoticeItemData>;
  contests: PreviewContent<ContestCardData>;
};

export const navigationContent = {
  main: '메인',
  contests: '대회 목록',
  board: '게시판',
  rules: '규정 안내',
  judgeStatus: '채점 상태',
  contact: '문의',
};

export const headerContent = {
  adminLogin: '관리자 로그인',
};

export const publicContests = [
  {
    title: 'Hanyang Erica Programming Contest',
    organization: 'Hanyang University ERICA',
    status: '접수 중',
    schedule: '온라인',
    date: '2026.05.20',
    isOpen: true,
    href: '/HEPC_login',
  },
] satisfies ContestCardData[];

export const publicNotices = [
  {
    id: 'zoj-beta',
    label: '공지',
    title: 'ZOJ 베타 서비스가 시작되었습니다',
    date: '2026.05.08',
    summary:
      '서비스 공지, 대회 목록, 참가자 대회 화면을 먼저 확인할 수 있는 베타 버전입니다.',
    body: [
      'ZOJ 베타 서비스는 대회 참가자가 문제를 확인하고 제출 흐름을 미리 테스트할 수 있도록 공개되었습니다.',
      '현재 화면에는 API가 연결되지 않았고, 모든 내용은 프론트 테스트를 위한 예시 데이터입니다.',
      '디자인 검토가 끝난 뒤 공지 목록, 공지 상세, 대회 목록, 대회 상세 API와 연결할 예정입니다.',
    ],
  },
  {
    id: 'maintenance-may',
    label: '점검',
    title: '5월 테스트 채점 서버 점검 일정 안내',
    date: '2026.05.12',
    summary: '채점 노드 점검 중에는 공개 채점 상태가 지연으로 표시될 수 있습니다.',
    body: [
      '점검 시간 동안 제출 기능은 비활성화될 수 있습니다.',
      '이미 제출된 코드는 점검이 끝난 뒤 순차적으로 다시 채점됩니다.',
    ],
  },
  {
    id: 'submission-guide',
    label: '안내',
    title: '문제 대회 제출 형식과 채점 기준 안내',
    date: '2026.05.15',
    summary: '대회 제출 언어, 시간 제한, 메모리 제한, 판정 상태를 안내합니다.',
    body: [
      '제출 언어는 C99, C++17, Python 3.13, Java 8을 기준으로 준비 중입니다.',
      '최종 판정은 Accepted, Wrong Answer, Compile Error, Runtime Error, Time Limit Exceeded 등을 표시합니다.',
    ],
  },
];

export const publicPageContent = {
  contestList: {
    title: '대회 목록',
    description:
      '현재 진행 중이거나 예정된 공개 대회를 확인하고, 대회 상세 또는 참가자 로그인으로 이동하는 공개 페이지입니다.',
    boxes: [
      {
        title: '목록에 포함될 정보',
        items: ['대회명', '주최 기관', '상태', '공개 여부', '시작/종료 시각', '대회 상세 링크'],
      },
      {
        title: '사용자 흐름',
        items: ['대회 목록 진입', '대회 카드 선택', '공개 상세 확인', '참가자 로그인으로 이동'],
      },
      {
        title: 'API',
        items: ['GET /public/contests', 'GET /public/contests/{contest_id}'],
      },
    ],
    examples: [
      {
        title: '상태 필터',
        items: ['전체', '접수 중', '진행 예정', '종료'],
      },
      {
        title: '빈 목록',
        items: ['조건에 맞는 대회가 없을 때 안내 문구 표시'],
      },
    ],
  },
  board: {
    title: '서비스 공지 게시판',
    description:
      '특정 대회에 속하지 않는 전역 공지를 공개하는 페이지입니다. 목록과 상세 화면이 분리되어야 합니다.',
    boxes: [
      {
        title: '포함 페이지',
        items: ['서비스 공지 목록', '서비스 공지 상세', '긴급 공지 배너'],
      },
      {
        title: '공개 조건',
        items: ['Published 상태', '공개 기간 안에 있는 공지', '비공개/삭제 공지는 노출하지 않음'],
      },
      {
        title: 'API',
        items: ['GET /public/service-notices', 'GET /public/service-notices/{notice_id}'],
      },
    ],
    examples: [
      {
        title: '공지 상세',
        items: ['제목', '유형', '게시일', '본문 Markdown', '첨부 이미지 영역'],
      },
    ],
  },
  rules: {
    title: '규정 안내',
    description:
      '공통 대회 규정집을 공개적으로 안내하는 페이지입니다. 참가 규정, 제출 규정, 스코어보드 규정, 이의제기 규정을 포함합니다.',
    boxes: [
      {
        title: '규정 섹션',
        items: ['참가 규정', '문제 및 제출 규정', '스코어보드 규정', '수정/재채점 규정'],
      },
      {
        title: '공개 원칙',
        items: ['비로그인 사용자도 조회 가능', 'Markdown 원문을 렌더링', '규정 변경 공지와 연결'],
      },
      {
        title: 'API',
        items: ['GET /public/rules', 'GET /public/rules/{section_anchor}'],
      },
    ],
    examples: [
      {
        title: '목차',
        items: ['참가', '제출', '판정', '스코어보드', '이의제기'],
      },
    ],
  },
  judgeStatus: {
    title: '공개 채점 상태',
    description:
      '서비스의 채점 인프라 상태를 공개 가능한 범위에서 보여주는 페이지입니다. 내부 IP나 노드명은 노출하지 않습니다.',
    boxes: [
      {
        title: '공개 가능한 정보',
        items: ['전체 상태 라벨', '사용 가능 채점 슬롯', '대기 중 job 수', '최근 처리량', '평균 대기 시간'],
      },
      {
        title: '상태 라벨',
        items: ['정상', '지연', '점검', '장애', '정보 갱신 지연'],
      },
      {
        title: 'API',
        items: ['GET /public/judge-status'],
      },
    ],
    examples: [
      {
        title: '지연 상태',
        items: ['대기열 증가', '평균 대기 시간 증가', '공지 링크 노출'],
      },
    ],
  },
  contact: {
    title: '문의',
    description:
      '신규 대회 개최 요청 또는 서비스 문의를 접수하는 공개 페이지입니다. 실제 전송 전에는 약관 동의와 스팸 방지가 필요합니다.',
    boxes: [
      {
        title: '입력 항목',
        items: ['주최 기관', '담당자 이메일', '대회 예정일', '문의 유형', '문의 내용'],
      },
      {
        title: '제출 상태',
        items: ['입력 중', '전송 중', '접수 완료', '입력 오류', '서버 오류'],
      },
      {
        title: 'API',
        items: ['POST /public/hosting-requests'],
      },
    ],
    examples: [
      {
        title: '완료 메시지',
        items: ['문의가 접수되었습니다', '영업일 기준 2일 안에 회신 예정'],
      },
    ],
  },
} satisfies Record<string, PageInfoContent>;

export const publicContestDetailContent = {
  title: 'Hanyang Erica Programming Contest',
  organization: 'Hanyang University ERICA',
  status: '접수 중',
  period: '2026.05.20 10:00 - 15:00',
  registration: '2026.05.08 - 2026.05.19',
  divisions: ['MOSS Division', 'COSS Division'],
  description:
    'ERICA 캠퍼스 참가자를 위한 알고리즘 프로그래밍 대회입니다. 대회 당일 팀별 OTP로 참가자 워크스페이스에 접속합니다.',
  notices: ['대회 중 질문은 대회 내부 질문 게시판을 사용합니다.', '스코어보드는 종료 1시간 전부터 프리즈될 수 있습니다.'],
};

export const publicJudgeStatusContent = {
  overall: '정상',
  updatedAt: '2026.05.20 10:32',
  metrics: [
    { label: '사용 가능 슬롯', value: '18 / 24' },
    { label: '대기 중 제출', value: '7' },
    { label: '채점 중 제출', value: '5' },
    { label: '평균 대기 시간', value: '14초' },
  ],
  events: [
    '10:25 Python 채점 큐가 일시적으로 증가했습니다.',
    '10:12 C++17 채점 노드가 정상 복구되었습니다.',
    '09:50 전체 채점 시스템 상태 정상.',
  ],
};

export const contactFormMockContent = {
  types: ['대회 개최 문의', '서비스 이용 문의', '채점 오류 제보'],
  stateExamples: [
    { title: '입력 오류', body: '담당자 이메일 형식이 올바르지 않을 때 필드 아래에 표시합니다.' },
    { title: '접수 완료', body: '문의 번호와 예상 회신 일정을 보여줍니다.' },
    { title: '서버 오류', body: '저장 실패 시 재시도 버튼과 임시 안내를 표시합니다.' },
  ],
};

export const publicStateFlowContent = [
  { title: '로그인 필요', body: '대회 참가자 전용 화면에 비로그인 상태로 접근했을 때 표시합니다.' },
  { title: '권한 없음', body: '다른 division 또는 다른 팀의 화면에 접근했을 때 표시합니다.' },
  { title: '대회 시작 전', body: '문제 목록과 제출 버튼을 잠그고 시작 시간을 안내합니다.' },
  { title: '대회 종료 후', body: '제출 버튼은 비활성화하고 제출/스코어보드는 읽기 전용으로 표시합니다.' },
];

export const hepcContestPageContent = {
  MOSS: {
    title: 'HEPC MOSS 대회 홈 문서 기준 메모',
    description:
      'MOSS 참가 팀이 보는 대회 워크스페이스입니다. 문제 목록, 제출 현황, 스코어보드, 공지, 질문, 규정이 연결되어야 합니다.',
    boxes: [
      {
        title: '필수 영역',
        items: ['팀 정보', '대회 상세 정보', '문제 목록', '최근 공지', '질문 게시판', '참가자 목록'],
      },
      {
        title: 'API',
        items: [
          'GET /contests/{contest_id}/workspace',
          'GET /contests/{contest_id}/problems',
          'GET /contests/{contest_id}/submissions',
          'GET /contests/{contest_id}/scoreboard',
        ],
      },
    ],
    examples: [
      {
        title: '문제 카드',
        items: ['A. Warmup', '최종 판정 Accepted', '클릭 시 문제 상세로 이동'],
      },
    ],
  },
  COSS: {
    title: 'HEPC COSS 대회 홈 문서 기준 메모',
    description:
      'COSS 참가 팀이 보는 대회 워크스페이스입니다. MOSS와 같은 구조를 사용하되 division 정보와 팀 정보가 다릅니다.',
    boxes: [
      {
        title: '접근 규칙',
        items: ['COSS 참가 팀만 접근 가능', '문제 조회와 제출은 대회 시간에만 가능', '종료 후 읽기 전용'],
      },
      {
        title: 'API',
        items: [
          'GET /contests/{contest_id}/workspace',
          'GET /contests/{contest_id}/problems',
          'GET /contests/{contest_id}/submissions',
        ],
      },
    ],
    examples: [
      {
        title: '대회 메뉴',
        items: ['대회 홈', '스코어보드', '내 제출', '공지사항', '질문 게시판', '규정집'],
      },
    ],
  },
} satisfies Record<'MOSS' | 'COSS', PageInfoContent>;

export const hepcContestDetailContent = {
  MOSS: {
    title: 'Hanyang Erica Programming Contest',
    organization: 'Hanyang University ERICA',
    division: 'MOSS Division',
    status: '진행 준비 중',
    summary:
      'MOSS 부문 참가 팀이 문제를 풀고 제출 결과와 스코어보드를 확인하는 대회 워크스페이스입니다.',
    details: [
      { label: '대회 기간', value: '2026.05.20 10:00 - 15:00' },
      { label: '스코어보드 프리즈', value: '종료 1시간 전' },
      { label: '참가 단위', value: '팀 단위 참가' },
      { label: '채점 방식', value: '제출 기반 자동 채점' },
      { label: '문의 채널', value: '대회 질문 게시판' },
    ],
  },
  COSS: {
    title: 'Hanyang Erica Programming Contest',
    organization: 'Hanyang University ERICA',
    division: 'COSS Division',
    status: '진행 준비 중',
    summary:
      'COSS 부문 참가 팀이 문제를 풀고 제출 결과와 스코어보드를 확인하는 대회 워크스페이스입니다.',
    details: [
      { label: '대회 기간', value: '2026.05.20 10:00 - 15:00' },
      { label: '스코어보드 프리즈', value: '종료 1시간 전' },
      { label: '참가 단위', value: '팀 단위 참가' },
      { label: '채점 방식', value: '제출 기반 자동 채점' },
      { label: '문의 채널', value: '대회 질문 게시판' },
    ],
  },
} satisfies Record<'MOSS' | 'COSS', ContestDetailContent>;

export const hepcWorkspaceHeaderContent = {
  MOSS: {
    contestTitle: 'Hanyang Erica Programming Contest',
    team: {
      teamName: 'Team MOSS Example',
      division: 'MOSS',
      participantEmail: 'moss@example.com',
    },
    navItems: [
      { label: '대회 홈', href: '/HEPC_MOSS' },
      { label: '스코어보드', href: '/HEPC/MOSS/scoreboard' },
      { label: '내 제출', href: '/HEPC/MOSS/submissions' },
      { label: '공지사항', href: '/HEPC/MOSS/notices' },
      { label: '질문 게시판', href: '/HEPC/MOSS/board' },
      { label: '대회 규정집', href: '/HEPC/MOSS/rules' },
    ],
  },
  COSS: {
    contestTitle: 'Hanyang Erica Programming Contest',
    team: {
      teamName: 'Team COSS Example',
      division: 'COSS',
      participantEmail: 'coss@example.com',
    },
    navItems: [
      { label: '대회 홈', href: '/HEPC_COSS' },
      { label: '스코어보드', href: '/HEPC/COSS/scoreboard' },
      { label: '내 제출', href: '/HEPC/COSS/submissions' },
      { label: '공지사항', href: '/HEPC/COSS/notices' },
      { label: '질문 게시판', href: '/HEPC/COSS/board' },
      { label: '대회 규정집', href: '/HEPC/COSS/rules' },
    ],
  },
} satisfies Record<'MOSS' | 'COSS', ContestWorkspaceHeaderContent>;

export const hepcProblemStatusContent = {
  title: '문제 목록과 풀이 현황',
  description:
    'A번부터 K번까지 문제를 세로로 보고, 현재 팀의 진행 상태와 최종 판정을 함께 확인하는 영역입니다.',
  problems: [
    { code: 'A', title: 'Warmup', maxScore: 100, status: 'accepted', attempts: 1, lastResult: 'Accepted', href: '/HEPC_problem' },
    { code: 'B', title: 'ERICA Campus Tour', maxScore: 100, status: 'accepted', attempts: 2, lastResult: 'Accepted', href: '/HEPC_problem' },
    { code: 'C', title: 'Shortest Practice', maxScore: 100, status: 'wrong_answer', attempts: 3, lastResult: 'Wrong Answer', href: '/HEPC_problem' },
    { code: 'D', title: 'Queue Simulation', maxScore: 100, status: 'judging', attempts: 1, lastResult: 'Judging', href: '/HEPC_problem' },
    { code: 'E', title: 'String Lab', maxScore: 100, status: 'runtime_error', attempts: 1, lastResult: 'Runtime Error', href: '/HEPC_problem' },
    { code: 'F', title: 'Graph Runner', maxScore: 100, status: 'compile_error', attempts: 2, lastResult: 'Compile Error', href: '/HEPC_problem' },
    { code: 'G', title: 'Dynamic Score', maxScore: 100, status: 'waiting', attempts: 1, lastResult: 'Waiting', href: '/HEPC_problem' },
    { code: 'H', title: 'Hidden Pattern', maxScore: 100, status: 'preparing', attempts: 1, lastResult: 'Preparing', href: '/HEPC_problem' },
    { code: 'I', title: 'Interval Check', maxScore: 100, status: 'time_limit_exceeded', attempts: 2, lastResult: 'Time Limit Exceeded', href: '/HEPC_problem' },
    { code: 'J', title: 'Judge Queue', maxScore: 100, status: 'memory_limit_exceeded', attempts: 1, lastResult: 'Memory Limit Exceeded', href: '/HEPC_problem' },
    { code: 'K', title: 'Final Challenge', maxScore: 100, status: 'no_submission', attempts: 0, lastResult: 'No Submission', href: '/HEPC_problem' },
  ],
} satisfies ProblemStatusContent;

export const hepcContestActivityContent = {
  notices: [
    { type: '공지', title: '대회 시작 전 안내사항', date: '2026.05.20 09:30' },
    { type: '공지', title: '제출 언어와 컴파일 옵션 안내', date: '2026.05.20 09:40' },
    { type: '긴급', title: 'B번 문제 예제 출력 표기 수정', date: '2026.05.20 10:25' },
    { type: '공지', title: '스코어보드 프리즈 시간 안내', date: '2026.05.20 13:50' },
    { type: '안내', title: '질문 게시판 답변 기준 안내', date: '2026.05.20 14:05' },
    { type: '공지', title: '대회 종료 후 결과 공개 일정', date: '2026.05.20 15:10' },
  ],
  questions: [
    { title: 'C번 입력 범위 확인 부탁드립니다', author: 'Team Alpha', status: '답변 완료' },
    { title: 'E번 예제 2번 설명 질문', author: 'Team Beta', status: '대기 중' },
    { title: '제출 언어 Python 버전 문의', author: 'Team Gamma', status: '답변 완료' },
  ],
} satisfies ContestActivityContent;

export const hepcParticipantListContent = {
  title: '참가자 목록',
  names: ['김하나', '이도윤', '박서연', '최민준', '정유진', '한지우', '오수빈', '임태민'],
} satisfies ParticipantListContent;

export const hepcWorkspacePageContent = {
  scoreboard: {
    title: '스코어보드',
    description:
      '대회 정책에 맞는 순위를 보여주는 페이지입니다. 프리즈 중에는 참가자에게 동결된 순위를 보여줄 수 있습니다.',
    generatedAt: '2026.05.20 14:30',
    frozen: true,
    rows: [
      { rank: 1, team: 'Team Alpha', solved: 6, penalty: 324, problems: ['AC', 'AC', 'AC', 'WA', 'AC', '-', 'AC', '-', '-', '-', '-'] },
      { rank: 2, team: 'Team MOSS Example', solved: 5, penalty: 411, problems: ['AC', 'AC', 'WA', 'JG', 'RE', 'CE', '-', '-', '-', '-', '-'] },
      { rank: 3, team: 'Team Beta', solved: 4, penalty: 388, problems: ['AC', 'WA', 'AC', '-', 'AC', '-', '-', 'JG', '-', '-', '-'] },
    ],
  },
  submissions: {
    title: '내 제출',
    description:
      '현재 팀의 제출 기록과 채점 상태를 확인하는 페이지입니다. 행을 클릭하면 제출 상세로 이동합니다.',
    rows: [
      { id: 'S-1024', problem: 'A. Warmup', language: 'C++17', submittedAt: '2026.05.20 10:12', status: 'accepted', result: '맞았습니다', score: '100' },
      { id: 'S-1031', problem: 'C. Shortest Practice', language: 'Python 3.13', submittedAt: '2026.05.20 10:48', status: 'wrong_answer', result: '틀렸습니다', score: '0' },
      { id: 'S-1040', problem: 'D. Queue Simulation', language: 'C++17', submittedAt: '2026.05.20 11:05', status: 'judging', result: '채점 중', score: '-' },
      { id: 'S-1044', problem: 'F. Graph Runner', language: 'Java 8', submittedAt: '2026.05.20 11:22', status: 'compile_error', result: '컴파일 에러', score: '0' },
    ],
  },
  notices: {
    title: '공지사항',
    description:
      '대회 운영자가 게시한 공지와 긴급 공지를 확인하는 페이지입니다. 공지를 클릭하면 상세 내용으로 이동합니다.',
    rows: [
      { id: 'start-guide', type: '공지', title: '대회 시작 전 안내사항', body: '문제는 대회 시작 시각에 공개되며, 참가자는 등록된 이메일 세션으로 제출해야 합니다.', date: '2026.05.20 09:30' },
      { id: 'language-guide', type: '공지', title: '제출 언어와 컴파일 옵션 안내', body: 'C99, C++17, Python 3.13, Java 8 제출을 지원합니다.', date: '2026.05.20 09:40' },
      { id: 'sample-fix', type: '긴급', title: 'B번 문제 예제 출력 표기 수정', body: '예제 출력의 공백 표기가 수정되었습니다. 채점 데이터는 변경되지 않았습니다.', date: '2026.05.20 10:25' },
    ],
  },
  board: {
    title: '질문 게시판',
    description:
      '대회 문제와 운영에 대한 질문 목록, 답변 상태, 새 질문 작성 버튼이 들어가는 페이지입니다.',
    rows: [
      { id: 'Q-201', title: 'C번 입력 범위 확인 부탁드립니다', author: 'Team Alpha', status: '답변 완료', problem: 'C', createdAt: '2026.05.20 10:33' },
      { id: 'Q-202', title: 'E번 예제 2번 설명 질문', author: 'Team Beta', status: '대기 중', problem: 'E', createdAt: '2026.05.20 11:02' },
      { id: 'Q-203', title: '제출 언어 Python 버전 문의', author: 'Team Gamma', status: '답변 완료', problem: '전체', createdAt: '2026.05.20 11:25' },
    ],
  },
  rules: {
    title: '대회 규정집',
    description:
      '참가 규정, 제출 규정, 스코어보드 규정, 이의제기 절차를 대회 내부에서 다시 확인하는 페이지입니다.',
    sections: [
      { title: '참가 규정', body: '팀은 등록된 계정으로만 대회에 참가할 수 있으며, 계정 공유는 금지됩니다.' },
      { title: '제출 규정', body: '대회 시간 안에 제출된 코드만 공식 결과에 반영됩니다.' },
      { title: '스코어보드 규정', body: '종료 1시간 전부터 스코어보드가 프리즈될 수 있습니다.' },
      { title: '이의제기', body: '판정 이의제기는 질문 게시판을 통해 대회 종료 후 지정된 시간까지 접수합니다.' },
    ],
  },
};

export const hepcSubmissionDetailContent = {
  id: 'S-1031',
  problem: 'C. Shortest Practice',
  language: 'Python 3.13',
  submittedAt: '2026.05.20 10:48',
  progressStatus: '채점 완료',
  finalResult: 'Wrong Answer',
  score: '0 / 100',
  compileLog: '컴파일은 정상적으로 완료되었습니다.',
  judgeLog: ['테스트 1: 통과', '테스트 2: 통과', '테스트 3: 오답'],
  source: ['import sys', 'a, b = map(int, sys.stdin.readline().split())', 'print(a - b)'].join('\n'),
};

export const hepcSubmissionWaitingContent = {
  id: 'S-1040',
  title: '제출이 접수되었습니다',
  steps: ['제출 저장 완료', '채점 큐 대기 중', '컴파일 준비', '테스트케이스 채점', '최종 판정 반영'],
};

export const hepcNoticeDetailContent = {
  title: 'B번 문제 예제 출력 표기 수정',
  type: '긴급',
  date: '2026.05.20 10:25',
  body: [
    'B번 문제의 예제 출력 설명에서 불필요한 공백 표기가 제거되었습니다.',
    '문제의 입력 조건과 실제 채점 데이터는 변경되지 않았습니다.',
    '이미 제출한 코드는 재제출하지 않아도 됩니다.',
  ],
};

export const hepcQuestionDetailContent = {
  id: 'Q-201',
  title: 'C번 입력 범위 확인 부탁드립니다',
  problem: 'C',
  author: 'Team Alpha',
  status: '답변 완료',
  body: '문제 설명에는 n <= 100,000이라고 적혀 있는데 예제 설명에는 n <= 10,000으로 보입니다. 어느 쪽이 맞나요?',
  answer: '문제 설명의 n <= 100,000이 맞습니다. 예제 설명 표기를 수정했습니다.',
};

export const hepcProblemDetailContent = {
  code: 'A',
  title: 'Warmup',
  statementMarkdown: [
    '두 정수 $a$와 $b$가 주어집니다.',
    '',
    '두 수의 합 $a + b$를 출력하세요.',
    '',
    '이 문제는 **Markdown**과 $\\LaTeX$ 렌더링을 확인하기 위한 예시 문제입니다.',
    '',
    '- 입력값은 모두 정수입니다.',
    '- 결과는 한 줄에 출력합니다.',
  ].join('\n'),
  inputMarkdown: '첫째 줄에 두 정수 $a$, $b$가 공백으로 구분되어 주어집니다.',
  outputMarkdown: '첫째 줄에 두 수의 합 $a + b$를 출력합니다.',
  constraintsMarkdown: ['- $0 \\le a \\le 1,000$', '- $0 \\le b \\le 1,000$', '- 입력은 항상 올바른 형식입니다.'].join('\n'),
  examples: [
    { input: '3 5', output: '8' },
    { input: '100 250', output: '350' },
  ],
  infoItems: [
    { label: '시간 제한', value: '1초' },
    { label: '메모리 제한', value: '512 MB' },
    { label: '제출', value: '128' },
    { label: '정답', value: '94' },
    { label: '맞힌 사람', value: '83' },
    { label: '정답 비율', value: '73.4%' },
    { label: '점수', value: '100점' },
  ],
  allowedLanguages: ['C99', 'C++17', 'Python 3.13', 'Java 8'],
  defaultSource: [
    '#include <bits/stdc++.h>',
    'using namespace std;',
    '',
    'int main() {',
    '    ios::sync_with_stdio(false);',
    '    cin.tie(nullptr);',
    '',
    '    int a, b;',
    '    cin >> a >> b;',
    '    cout << a + b << "\\n";',
    '    return 0;',
    '}',
  ].join('\n'),
};

export const mainPageContent = {
  hero: {
    imageSrc: heroImage,
    imageAlt: 'ZERONE Online Judge 메인 배너',
    headline: 'ZERONE ONLINE JUDGE',
    description:
      '코딩 실력을 시험하고 대회 운영 흐름을 테스트할 수 있는 온라인 저지 프로토타입입니다.',
  },
  notices: {
    title: '공지사항',
    items: publicNotices.map((notice) => ({
      label: notice.label,
      title: notice.title,
      date: notice.date,
      href: `/board/${notice.id}`,
    })),
  },
  contests: {
    title: '대회 목록',
    items: publicContests,
  },
} satisfies MainPageContent;
