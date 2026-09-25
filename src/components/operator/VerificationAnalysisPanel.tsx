import { useState } from 'react';
import VerificationAgentEvidence from '@/components/operator/VerificationAgentEvidence';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tokenQueryIdentity } from '@/domains/identityAccess/queryIdentity';
import {
  getVerificationAnalysis,
  downloadVerificationWorkspace,
  requestVerificationAnalysis,
  type VerificationAnalysis,
  type VerificationReport,
} from '@/domains/problemManagement/verificationAi';
import { formatApiError } from '@/shared/api/errors';

export default function VerificationAnalysisPanel({
  contestId,
  problemId,
  submissionId,
  token,
  available,
  initial,
  stale,
}: {
  contestId: string;
  problemId: string;
  submissionId: string;
  token: string;
  available: boolean;
  initial?: VerificationAnalysis | null;
  stale?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const queryKey = [
    'operator',
    'verification-analysis',
    contestId,
    problemId,
    submissionId,
    tokenQueryIdentity(token),
  ];
  const query = useQuery({
    queryKey,
    queryFn: () =>
      getVerificationAnalysis(contestId, problemId, submissionId, token),
    enabled: open,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (state) => {
      const data = state.state.data;
      return data?.available &&
        (!data.analysis || ['queued', 'running'].includes(data.analysis.status))
        ? 3000
        : false;
    },
  });
  const request = useMutation({
    mutationFn: () =>
      requestVerificationAnalysis(contestId, problemId, submissionId, token),
    onSuccess: (data) => {
      client.setQueryData(queryKey, data);
      void client.invalidateQueries({
        queryKey: ['operator', 'verification-runs', contestId, problemId],
      });
    },
  });
  const download = useMutation({
    mutationFn: () =>
      downloadVerificationWorkspace(contestId, problemId, submissionId, token),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'verification-workspace.zip';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
  const analysis = open
    ? (query.data?.analysis ?? initial)
    : (initial ?? query.data?.analysis);
  const canRequest = query.data?.available ?? available;
  const status = analysis?.status;
  const label =
    status === 'succeeded'
      ? '저장된 AI 분석 보기'
      : status === 'queued'
        ? 'AI 분석 대기 중'
        : status === 'running'
          ? 'AI 분석 중'
          : status === 'failed'
            ? 'AI 분석 실패'
            : 'AI 판정 분석';
  return (
    <div className="grid min-w-0 gap-3 sm:ml-12">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
          onClick={() => setOpen(!open)}
        >
          {label} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
        {status === 'succeeded' ? (
          <span className="text-xs text-slate-500">
            운영자 공유 · 저장된 결과 재사용
          </span>
        ) : null}
        {stale ? (
          <span className="text-xs font-medium text-amber-800">
            문제 자료가 변경됨 · 이전 채점 기준
          </span>
        ) : null}
      </div>
      {open ? (
        <section
          aria-label="AI 판정 분석"
          className="grid min-w-0 gap-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 sm:p-5"
        >
          <p className="text-xs leading-5 text-slate-600">
            {analysis?.engine_version === 2
              ? '필요한 자료를 찾아 검토하고 원본·수정 후보를 실제 채점기로 검증합니다. 공식 판정은 바꾸지 않으며, 실행 기록과 AI 의견을 함께 확인하세요.'
              : '실제 채점 당시 자료를 검토한 AI 보조 의견입니다. 공식 판정은 바꾸지 않으며, 제안한 수정과 반례는 다시 채점해 확인하세요.'}
          </p>
          {!canRequest ? (
            <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              AI 연결이 설정되지 않았습니다. 관리자가 서버 환경변수를 설정하면
              불일치 판정을 자동 분석합니다. 이미 저장된 분석은 계속 볼 수
              있습니다.
            </p>
          ) : null}
          {query.isLoading ? (
            <p role="status" className="text-sm text-indigo-700">
              저장된 분석을 확인하고 있습니다.
            </p>
          ) : null}
          {status === 'queued' || status === 'running' ? (
            <p role="status" className="text-sm text-indigo-700">
              {status === 'queued'
                ? '분석 대기 중입니다. 대기 작업과 일일 사용 한도에 따라 시간이 걸릴 수 있습니다.'
                : `${analysis?.phase || '문제와 코드, 테스트케이스를 검토하고 있습니다.'} · 이 화면을 닫아도 계속됩니다.`}
            </p>
          ) : null}
          {analysis?.error_message || query.error || request.error ? (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
            >
              {request.error
                ? formatApiError(request.error, '분석 요청에 실패했습니다.')
                : query.error
                  ? formatApiError(query.error, '분석을 불러오지 못했습니다.')
                  : analysis?.error_message}
            </p>
          ) : null}
          {canRequest &&
          (!analysis ||
            status === 'failed' ||
            (status === 'succeeded' &&
              analysis.engine_version === 1 &&
              !stale)) ? (
            <button
              type="button"
              disabled={request.isPending}
              onClick={() => request.mutate()}
              className="w-fit rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {request.isPending
                ? '요청 중…'
                : status === 'failed'
                  ? '분석 다시 요청'
                  : status === 'succeeded'
                    ? '실제 채점으로 검증'
                    : '분석 요청'}
            </button>
          ) : null}
          {analysis?.coverage ? (
            <details className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-6 text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-800">
                분석 범위 ·{' '}
                {analysis.coverage.partial
                  ? '일부 자료만 검토'
                  : '제공 자료 전체'}{' '}
                · 테스트케이스 {analysis.coverage.full_testcases}/
                {analysis.coverage.total_testcases}개 전체 내용 포함
              </summary>
              <p>
                테스트케이스 v{analysis.coverage.testcase_version ?? '없음'} ·
                부분 포함 {analysis.coverage.partial_testcases}개 · 제외{' '}
                {analysis.coverage.omitted_testcases}개
              </p>
              {analysis.coverage.files.map((file, index) => (
                <p key={index} className="break-words">
                  {file.filename}:{' '}
                  {file.complete
                    ? '전체 포함'
                    : file.included
                      ? '일부 포함'
                      : '제외'}
                  {file.note ? ` · ${file.note}` : ''}
                </p>
              ))}
              {analysis.coverage.notes.map((note, index) => (
                <p key={index}>{note}</p>
              ))}
            </details>
          ) : null}
          {analysis ? <VerificationAgentEvidence analysis={analysis} /> : null}
          {analysis?.workspace_files?.length ? (
            <button
              type="button"
              onClick={() => download.mutate()}
              disabled={download.isPending}
              className="w-fit rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-800 disabled:opacity-50"
            >
              {download.isPending
                ? '다운로드 준비 중…'
                : '작업 파일 전체 다운로드'}
            </button>
          ) : null}
          {download.error ? (
            <p role="alert" className="text-sm text-rose-800">
              {formatApiError(
                download.error,
                '작업 파일 다운로드에 실패했습니다.',
              )}
            </p>
          ) : null}
          {analysis?.report ? <ReportBody report={analysis.report} /> : null}
          {analysis ? (
            <p className="text-xs text-slate-500">
              {analysis.model}
              {analysis.completed_at
                ? ` · ${new Date(analysis.completed_at).toLocaleString('ko-KR')}`
                : ''}{' '}
              · 같은 자료와 판정의 분석을 서버에 보관합니다.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export function ReportBody({ report }: { report: VerificationReport }) {
  return (
    <div className="grid min-w-0 gap-5 text-sm leading-7 text-slate-700">
      <section className="grid gap-2">
        <h4 className="font-semibold text-slate-950">분석 요약</h4>
        <p className="break-words whitespace-pre-wrap">{report.summary}</p>
        <p className="break-words whitespace-pre-wrap">
          {report.verdict_assessment}
        </p>
      </section>
      <section className="grid gap-3">
        <h4 className="font-semibold text-slate-950">원인과 근거</h4>
        {report.causes.map((cause, index) => (
          <article
            key={index}
            className="grid min-w-0 gap-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <h5 className="font-semibold text-slate-900">
              {index + 1}. {cause.title}{' '}
              <span className="text-xs font-normal text-slate-500">
                {
                  { high: '근거 충분', medium: '추가 확인 필요', low: '가설' }[
                    cause.confidence
                  ]
                }
              </span>
            </h5>
            <p className="break-words whitespace-pre-wrap">
              {cause.explanation}
            </p>
            <p className="break-words whitespace-pre-wrap text-indigo-800">
              근거: {cause.evidence}
            </p>
            {cause.code_reference ? (
              <p className="text-xs break-words whitespace-pre-wrap">
                관련 코드: {cause.code_reference}
              </p>
            ) : null}
          </article>
        ))}
      </section>
      <section className="grid gap-3">
        <h4 className="font-semibold text-slate-950">수정 방법과 재검증</h4>
        {report.fixes.map((fix, index) => (
          <article
            key={index}
            className="grid min-w-0 gap-2 rounded-lg border border-slate-200 bg-white p-3"
          >
            <h5 className="font-semibold text-slate-900">
              {index + 1}. {fix.title}
            </h5>
            <p className="break-words whitespace-pre-wrap">{fix.change}</p>
            {fix.code_example ? (
              <Code label="수정 예시" value={fix.code_example} />
            ) : null}
            <p className="break-words whitespace-pre-wrap">
              확인 방법: {fix.verification}
            </p>
          </article>
        ))}
      </section>
      {report.suggested_tests.length ? (
        <section className="grid gap-3">
          <h4 className="font-semibold text-slate-950">
            추가할 테스트케이스 제안
          </h4>
          <p className="text-xs text-slate-500">
            AI가 제안한 미실행 예시입니다. 입력 조건과 기대 출력을 확인한 뒤
            등록하세요.
          </p>
          {report.suggested_tests.map((test, index) => (
            <article
              key={index}
              className="grid min-w-0 gap-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="grid min-w-0 gap-3 md:grid-cols-2">
                <Code label="제안 입력" value={test.input} />
                <Code label="제안 기대 출력" value={test.expected_output} />
              </div>
              <p className="break-words whitespace-pre-wrap">
                {test.explanation}
              </p>
            </article>
          ))}
        </section>
      ) : null}
      {report.limitations.length ? (
        <section className="grid gap-2 rounded-lg bg-amber-50 p-3">
          <h4 className="font-semibold text-amber-950">
            추가 확인이 필요한 점
          </h4>
          <ul className="list-disc space-y-1 pl-5">
            {report.limitations.map((item, index) => (
              <li key={index} className="break-words whitespace-pre-wrap">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
function Code({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <pre
        aria-label={label}
        tabIndex={0}
        className="max-h-64 min-w-0 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-100"
      >
        {value || '(빈 내용)'}
      </pre>
    </div>
  );
}
