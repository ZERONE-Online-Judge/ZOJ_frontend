import heroImage from '@/assets/images/hero image.png';
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
    items: [
      {
        label: '공지',
        title: 'ZOJ 베타 서비스가 시작되었습니다',
        date: '2026.05.08',
      },
      {
        label: '점검',
        title: '5월 테스트 채점 서버 점검 일정 안내',
        date: '2026.05.12',
      },
      {
        label: '안내',
        title: '문제 대회 제출 형식과 채점 기준 안내',
        date: '2026.05.15',
      },
    ],
  },
  contests: {
    title: '대회 목록',
    items: [
      {
        title: 'Hanyang Erica Programming Contest',
        organization: 'Hanyang University ERICA',
        status: '접수 중',
        schedule: '온라인',
        date: '2026.05.20',
        isOpen: true,
      },
    ],
  },
} satisfies MainPageContent;

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
