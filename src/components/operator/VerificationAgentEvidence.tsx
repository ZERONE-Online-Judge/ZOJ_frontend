import type { VerificationAnalysis } from '@/domains/problemManagement/verificationAi';

const verdicts: Record<string, string> = {
  waiting: '채점 대기',
  preparing: '준비 중',
  judging: '채점 중',
  accepted: '정답',
  wrong_answer: '틀렸습니다',
  compile_error: '컴파일 오류',
  runtime_error: '실행 오류',
  system_error: '채점 시스템 오류',
  time_limit_exceeded: '시간 초과',
  memory_limit_exceeded: '메모리 초과',
  output_limit_exceeded: '출력 초과',
};
const tools: Record<string, string> = {
  list_files: '파일 찾기',
  read_file: '필요한 부분 읽기',
  search_file: '파일 검색',
  read_image: '이미지 확인',
  inspect_judge: '채점 환경 확인',
  edit_code: '수정안 작성',
  run_code: '실제 채점',
  run_probe: '제안 반례 실행',
  workspace_copy: '작업 파일 가져오기',
  workspace_write: '작업 파일 작성',
  workspace_patch: '작업 파일 수정',
  workspace_delete: '작업 파일 삭제',
  workspace_read: '작업 파일 읽기',
  workspace_list: '작업 파일 찾기',
  workspace_exec: '플레이그라운드 실행',
  workspace_candidate: '최종 후보 저장',
  escalate: '상위 모델 검토',
  finish_report: '보고서 작성',
  update_plan: '검증 계획 갱신',
  record_finding: '근거 기록',
  ask_user: '조건 확인 요청',
  finish_task: '작업 결과 작성',
  list_verification_runs: '채점 기록 찾기',
  read_verification_run: '채점 당시 코드와 로그 조회',
};
const codeName = (id: string) =>
  id === 'original'
    ? '원본 코드'
    : id.startsWith('candidate-')
      ? `수정안 ${id.slice(10)}`
      : '참조 코드';

export default function VerificationAgentEvidence({
  analysis,
}: {
  analysis: VerificationAnalysis;
}) {
  if (analysis.engine_version !== 2) return null;
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-white p-3 text-xs">
        <p className="font-semibold text-indigo-900">
          {analysis.phase || '검증 준비'}
        </p>
        {analysis.usage ? (
          <p className="text-slate-600">
            입력 {analysis.usage.input_tokens.toLocaleString()} · 출력{' '}
            {analysis.usage.output_tokens.toLocaleString()} 토큰
            {' · '}예상 ${analysis.usage.estimated_cost_usd.toFixed(4)}
            {analysis.limits
              ? ` / 한도 $${analysis.limits.max_cost_usd.toFixed(2)}`
              : ''}
          </p>
        ) : null}
      </div>
      {analysis.plan?.length ? (
        <section className="grid gap-2 rounded-lg border border-slate-200 p-3">
          <h4 className="text-sm font-semibold text-slate-950">검증 계획</h4>
          <ol className="grid gap-2 text-sm text-slate-700">
            {analysis.plan.map((step, i) => (
              <li className="flex gap-2" key={i}>
                <span
                  className={
                    step.status === 'in_progress'
                      ? 'font-semibold text-indigo-700'
                      : 'text-slate-500'
                  }
                >
                  {step.status === 'done'
                    ? '완료'
                    : step.status === 'in_progress'
                      ? '진행'
                      : '예정'}
                </span>
                <span className="min-w-0 break-words">{step.title}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {analysis.findings?.length ? (
        <section className="grid gap-2">
          <h4 className="text-sm font-semibold text-slate-950">
            확인한 사실과 가설
          </h4>
          {analysis.findings.map((finding) => (
            <details
              key={finding.id}
              className="rounded-lg border border-slate-200 p-3 text-sm"
            >
              <summary className="cursor-pointer font-medium text-slate-900">
                <span className="mr-2 text-xs text-indigo-700">
                  {
                    {
                      confirmed: '근거 확인',
                      hypothesis: '가설',
                      rejected: '기각',
                    }[finding.status]
                  }
                </span>
                {finding.title}
              </summary>
              <p className="mt-2 leading-6 break-words whitespace-pre-wrap text-slate-700">
                {finding.detail}
              </p>
              {finding.evidence_refs.length ? (
                <p className="mt-2 text-xs break-all text-slate-500">
                  근거: {finding.evidence_refs.join(' · ')}
                </p>
              ) : null}
            </details>
          ))}
        </section>
      ) : null}
      {analysis.playground_runs?.length ? (
        <section className="grid min-w-0 gap-2">
          <h4 className="text-sm font-semibold text-slate-950">
            플레이그라운드 실험
          </h4>
          <p className="text-xs leading-5 text-slate-600">
            별도 격리 환경에서 파일을 편집하고 코드를 대조한 기록입니다. 아래
            최종 채점과 실행 환경이 다르므로 여기의 시간·메모리를 공식 제한과
            직접 비교하지 마세요.
          </p>
          {analysis.playground_runs.map((run, index) => (
            <details
              key={run.request_id}
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-xs"
            >
              <summary className="cursor-pointer font-semibold text-slate-900">
                실험 {index + 1} ·{' '}
                {run.timed_out
                  ? '시간 한도 도달'
                  : `종료 코드 ${run.exit_code}`}{' '}
                · {(run.wall_ms / 1000).toFixed(2)}초
              </summary>
              <pre
                aria-label={`실험 ${index + 1} 명령`}
                tabIndex={0}
                className="my-2 max-h-32 min-w-0 overflow-auto rounded bg-slate-100 p-2"
              >
                {run.command}
              </pre>
              <pre
                aria-label={`실험 ${index + 1} 출력`}
                tabIndex={0}
                className="max-h-60 min-w-0 overflow-auto rounded bg-slate-900 p-3 leading-6 text-slate-100"
              >
                {run.stdout || '(출력 없음)'}
              </pre>
              {run.output_truncated ? (
                <p className="mt-2 text-amber-800">
                  출력이 길어 일부만 보관했습니다.
                </p>
              ) : null}
              {run.notes?.map((note, i) => (
                <p className="mt-1 break-words text-amber-800" key={i}>
                  {note}
                </p>
              ))}
            </details>
          ))}
        </section>
      ) : null}
      {analysis.workspace_files?.length ? (
        <details className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-slate-900">
            저장된 작업 파일 {analysis.workspace_files.length}개
          </summary>
          <ul className="mt-2 grid gap-1 text-slate-600">
            {analysis.workspace_files.map((file) => (
              <li key={file.path} className="break-all">
                {file.path} · {file.bytes.toLocaleString()}바이트
                {file.read_only ? ' · 읽기 전용 채점 파일' : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {analysis.executions?.length ? (
        <section className="grid min-w-0 gap-2">
          <h4 className="text-sm font-semibold text-slate-950">
            실제 채점 기록
          </h4>
          <p className="text-xs leading-5 text-slate-600">
            기존 채점기의 격리 환경에서 실행한 결과입니다. 전체 테스트를
            통과해도 모든 입력에서 정답임을 보장하지는 않습니다.
          </p>
          <div className="grid min-w-0 gap-2">
            {analysis.executions.map((run) => (
              <details
                key={run.submission_id}
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-xs"
              >
                <summary className="cursor-pointer leading-6">
                  <span className="font-semibold text-slate-950">
                    {codeName(run.artifact_id)}
                  </span>
                  {' · '}
                  {run.scope === 'probe'
                    ? '제안 반례 1개'
                    : run.scope === 'all'
                      ? `전체 ${run.testcase_count}개`
                      : `선택 ${run.testcase_count}개`}
                  {' · '}
                  <span
                    className={
                      run.status === 'accepted'
                        ? 'font-semibold text-emerald-700'
                        : 'font-semibold text-amber-800'
                    }
                  >
                    {verdicts[run.status] || run.status}
                  </span>
                  {run.failed_testcase_order
                    ? ` · 실패 #${run.failed_testcase_order}`
                    : ''}
                  {run.runtime_ms != null ? ` · ${run.runtime_ms}ms` : ''}
                  {run.memory_kb != null
                    ? ` · ${run.memory_kb.toLocaleString()}KB`
                    : ''}
                </summary>
                <div className="mt-2 grid min-w-0 gap-2 text-slate-600">
                  <p>
                    선택 범위:{' '}
                    {run.testcase_orders?.join(', ') ||
                      '등록된 모든 테스트케이스'}
                    {run.agent_version ? ` · 채점기 ${run.agent_version}` : ''}
                  </p>
                  <p className="break-all">실행 번호: {run.submission_id}</p>
                  <p>실패 시 이후 테스트는 실행되지 않을 수 있습니다.</p>
                  {run.probe ? (
                    <div className="grid min-w-0 gap-2 rounded bg-amber-50 p-2 text-amber-950">
                      <p>
                        기대 출력은 AI가 제안한 가설입니다. 공식 테스트에
                        등록되지 않았으며, 입력 validator는 실행하지 않았습니다.
                      </p>
                      <pre className="max-h-40 overflow-auto">{`입력\n${run.probe.input}\n제안 기대 출력\n${run.probe.expected_output}`}</pre>
                    </div>
                  ) : null}
                  {run.compile_message || run.judge_message ? (
                    <pre
                      tabIndex={0}
                      className="max-h-60 min-w-0 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100"
                    >
                      {[run.compile_message, run.judge_message]
                        .filter(Boolean)
                        .join('\n')}
                    </pre>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
      {analysis.artifacts?.map((item) => (
        <details
          key={item.artifact_id}
          className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-xs"
        >
          <summary className="cursor-pointer font-semibold text-slate-900">
            {codeName(item.artifact_id)} 코드 · {item.language}
          </summary>
          <p className="my-2 text-slate-600">
            별도로 보관한 수정 후보입니다. 원본 검증 코드는 유지됩니다. 위 실행
            기록에서 판정과 테스트 범위를 확인하세요.
          </p>
          <a
            className="mb-2 inline-block font-semibold text-indigo-700 underline"
            download={`${item.artifact_id}.${({ python313: 'py', cpp17: 'cpp', c99: 'c', java8: 'java' } as Record<string, string>)[item.language] || 'txt'}`}
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(item.source)}`}
          >
            수정 후보 다운로드
          </a>
          <pre
            aria-label={`${codeName(item.artifact_id)} 코드`}
            tabIndex={0}
            className="max-h-80 min-w-0 overflow-auto rounded bg-slate-900 p-3 leading-6 text-slate-100"
          >
            {item.source}
          </pre>
        </details>
      ))}
      <details className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-xs">
        <summary className="cursor-pointer font-semibold text-slate-800">
          확인한 자료와 진행 기록 · 도구 {analysis.tool_count || 0}회
        </summary>
        <p className="mt-2 leading-6 text-slate-600">
          필요한 파일만 찾아 읽습니다. 채점 대기 중에는 AI를 반복 호출하지
          않습니다. 아래 목록에 없는 자료를 검토했다고 간주하지 마세요.
        </p>
        {analysis.files_read?.length ? (
          <ul className="my-2 space-y-1 text-slate-600">
            {analysis.files_read.map((file, index) => (
              <li key={index} className="break-all">
                {file.file_id} ·{' '}
                {file.image_attached
                  ? '이미지 확인'
                  : file.complete
                    ? '전체 읽음'
                    : file.offset != null
                      ? `${file.offset}바이트부터 부분 읽음`
                      : '문자열 검색'}
              </li>
            ))}
          </ul>
        ) : null}
        <ol className="mt-2 grid gap-1 text-slate-700">
          {analysis.trace?.map((event, index) => (
            <li key={index} className="leading-6 break-words">
              <span className="font-medium">
                {tools[event.tool] || event.tool}
              </span>{' '}
              ·{' '}
              {event.status === 'error'
                ? '확인 필요'
                : event.status === 'waiting'
                  ? '요청'
                  : '완료'}{' '}
              · {event.detail}
            </li>
          ))}
        </ol>
        {analysis.usage?.by_model ? (
          <p className="mt-2 text-slate-600">
            {Object.entries(analysis.usage.by_model)
              .map(([name, usage]) => `${name} ${usage.calls}회`)
              .join(' · ')}
          </p>
        ) : null}
      </details>
    </div>
  );
}
