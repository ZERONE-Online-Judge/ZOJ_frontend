export type SupportTabId = 'rules' | 'help' | 'contact';

export type SupportSection = {
  id: SupportTabId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  groups: {
    title: string;
    items: string[];
  }[];
};

export const supportSections: SupportSection[] = [
  {
    id: 'rules',
    label: '규정',
    eyebrow: 'RULES',
    title: '규정 안내',
    description: '운영/참가 시 공통으로 적용되는 기본 규정입니다.',
    groups: [
      {
        title: '기본 운영 규정',
        items: [
          '대회 시작 전/진행 중에는 비로그인 사용자에게 문제/제출/스코어보드를 공개하지 않습니다.',
          '참가팀은 팀당 1개 참가 유형에만 속하며, 유형별 문제/스코어보드는 완전히 분리됩니다.',
          '채점 결과는 완료 즉시 반영되며, 프리즈 이후 공개 스코어보드는 프리즈 시점 기준으로 고정됩니다.',
          '대회 종료 후 공개 범위(문제/제출/스코어보드)는 대회 설정에 따릅니다.',
          '운영 감사 로그는 삭제하지 않고 보존합니다.',
        ],
      },
    ],
  },
  {
    id: 'help',
    label: '도움말',
    eyebrow: 'HELP',
    title: '도움말',
    description: '자주 사용하는 흐름만 간단히 정리했습니다.',
    groups: [
      {
        title: '참가자',
        items: [
          '로그인 후 내 대회에서 참가 가능한 대회를 선택하면 바로 대회 개요로 이동합니다.',
          '문제집은 본인 참가 유형 기준으로만 표시됩니다.',
          '채점현황은 최근 제출 순으로 자동 갱신됩니다.',
        ],
      },
      {
        title: '운영자',
        items: [
          "상단 '운영' 탭에서 대회 설정/참가팀/문제/공지/채점 현황을 관리합니다.",
          '운영 중 시간 변경 시 자동 긴급 공지가 생성됩니다.',
          '운영자 상세 채점 화면에서 실패 테스트, 로그, 리소스 사용량을 확인할 수 있습니다.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    label: '문의',
    eyebrow: 'CONTACT',
    title: '문의',
    description: '서비스 운영 문의 채널입니다.',
    groups: [
      {
        title: '문의 채널',
        items: [
          '대회 운영 이슈: 대회 게시판의 비공개 질문으로 접수',
          '계정/권한 이슈: 서비스 관리자 메일로 접수',
          '장애/긴급 상황: 서비스 긴급공지 확인 후 운영자에게 즉시 전달',
        ],
      },
    ],
  },
];
