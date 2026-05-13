import { useState } from 'react';
import CodeEditor from '@/shared/ui/CodeEditor';
import DataTable from '@/shared/ui/DataTable';
import MarkdownPreview from '@/shared/ui/MarkdownPreview';
import PageNotice from '@/shared/ui/PageNotice';
import SubmissionStatusBadge from '@/shared/ui/SubmissionStatusBadge';

const sampleMarkdown = `# A+B

두 정수 \\(A\\), \\(B\\)가 주어졌을 때 합을 출력하세요.

## 입력

첫째 줄에 두 정수 A와 B가 주어집니다.

\`\`\`text
1 2
\`\`\`

## 출력

\`\`\`text
3
\`\`\`
`;

export default function SharedUiPreviewPage() {
  const [sourceCode, setSourceCode] = useState(`#include <bits/stdc++.h>
using namespace std;

int main() {
  int a, b;
  cin >> a >> b;
  cout << a + b << '\\n';
  return 0;
}
`);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 font-sans lg:px-8">
      <header className="grid gap-2">
        <span className="text-sm font-bold text-zoj-blue">Shared UI</span>
        <h1 className="text-3xl font-black tracking-normal text-slate-950">공통 UI 미리보기</h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          demo-frontend에서 반복 사용 빈도가 높은 컴포넌트만 분리한 확인용 페이지입니다.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-lg font-bold text-slate-950">PageNotice</h2>
        <PageNotice message="제출 목록을 불러오는 중입니다." status="loading" />
        <PageNotice message="문제 저장이 완료되었습니다." status="ready" />
        <PageNotice message="권한이 없어 요청을 처리할 수 없습니다." status="error" />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-bold text-slate-950">DataTable + SubmissionStatusBadge</h2>
        <DataTable
          columns={['제출 ID', '언어', '상태', '점수']}
          rows={[
            ['SUB-1024', 'C++17', <SubmissionStatusBadge key="accepted" submission={{ status: 'accepted' }} />, '100'],
            [
              'SUB-1025',
              'Python 3.13',
              <SubmissionStatusBadge
                key="judging"
                submission={{ status: 'judging', progress_current: 7, progress_total: 10 }}
              />,
              '-',
            ],
            [
              'SUB-1026',
              'Java 8',
              <SubmissionStatusBadge key="wrong" submission={{ status: 'wrong_answer' }} />,
              '0',
            ],
          ]}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-bold text-slate-950">MarkdownPreview</h2>
        <div className="rounded-md border border-slate-200 bg-white p-6">
          <MarkdownPreview statement={sampleMarkdown} />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-bold text-slate-950">CodeEditor</h2>
        <CodeEditor language="cpp17" onChange={setSourceCode} value={sourceCode} />
      </section>
    </section>
  );
}
