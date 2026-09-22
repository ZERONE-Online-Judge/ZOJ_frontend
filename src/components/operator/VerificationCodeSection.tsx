import type { ProblemAsset } from '@/domains/problemManagement/types';
import { parseVerificationDetails } from '@/domains/problemManagement/verificationDetails';
import {
  VERIFICATION_CODE_KINDS,
  isVerificationRunning,
  type VerificationCodeKind,
  type VerificationRunResult,
} from '@/domains/problemManagement/useVerificationCodeRuns';
import {
  isSubmissionPending,
  submissionProgressPercent,
  submissionProgressText,
  submissionStatusLabel,
} from '@/domains/submissionScoreboard/status';

export default function VerificationCodeSection({
  assetsByKind,
  onDelete,
  onDismiss,
  onPreview,
  onRun,
  onUpload,
  results,
}: {
  assetsByKind: Map<VerificationCodeKind, ProblemAsset[]>;
  onDelete: (asset: ProblemAsset) => void;
  onDismiss: (id: string) => void;
  onPreview: (asset: ProblemAsset, label: string) => void;
  onRun: (asset: ProblemAsset, expectedStatus: VerificationCodeKind) => void;
  onUpload: (expectedStatus: VerificationCodeKind, files: File[]) => void;
  results: VerificationRunResult[];
}) {
  const runningCount = results.filter(isVerificationRunning).length;

  return (
    <section className="grid min-w-0 gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-slate-950">
            검증 코드 채점
          </h3>
          <p className="text-sm leading-6 font-normal text-slate-500">
            파일을 추가하면 자동으로 채점합니다. 각 코드가 기대한 결과로
            판정되는지 확인하세요.
          </p>
        </div>
        {runningCount ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
            <span className="size-1.5 rounded-full bg-indigo-500 motion-safe:animate-pulse" />
            {runningCount}개 처리 중
          </span>
        ) : null}
      </div>

      <div className="grid gap-3">
        {VERIFICATION_CODE_KINDS.map((kind) => {
          const assets = assetsByKind.get(kind.expectedStatus) ?? [];
          const kindResults = results.filter(
            (result) => result.expectedStatus === kind.expectedStatus,
          );
          const trackedAssets = new Set(
            kindResults.map((result) => result.asset?.asset_id),
          );
          const rows = [
            ...assets
              .filter((asset) => !trackedAssets.has(asset.asset_id))
              .map((asset) => ({
                id: asset.asset_id,
                filename: asset.original_filename,
                asset,
                result: undefined as VerificationRunResult | undefined,
              })),
            ...kindResults.map((result) => ({
              id: result.id,
              filename: result.filename,
              asset: result.asset,
              result,
            })),
          ].sort((a, b) =>
            a.filename.localeCompare(b.filename, 'ko-KR', { numeric: true }),
          );

          return (
            <section
              aria-label={kind.label}
              className="min-w-0 overflow-hidden rounded-lg border border-slate-200"
              key={kind.expectedStatus}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 px-4 py-3">
                <div className="grid gap-1">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {kind.label}
                    <span className="text-xs font-normal text-slate-500">
                      {rows.length}개
                    </span>
                  </h4>
                  <p className="text-xs font-normal text-slate-500">
                    기대 판정 <span className="mx-1 text-slate-300">·</span>{' '}
                    {submissionStatusLabel(kind.expectedStatus)}
                  </p>
                </div>
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition focus-within:ring-2 focus-within:ring-indigo-400 hover:border-indigo-300 hover:text-indigo-700">
                  <svg
                    aria-hidden="true"
                    className="size-3.5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                  파일 추가
                  <input
                    accept=".c,.cc,.cpp,.cxx,.py,.java,text/plain"
                    aria-label={`${kind.label} 파일 선택`}
                    className="sr-only"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.currentTarget.files ?? []);
                      if (files.length) onUpload(kind.expectedStatus, files);
                      event.currentTarget.value = '';
                    }}
                    type="file"
                  />
                </label>
              </div>

              {rows.length ? (
                <div className="divide-y divide-slate-100 border-t border-slate-200">
                  {rows.map((row) => (
                    <VerificationCodeRow
                      asset={row.asset}
                      expectedStatus={kind.expectedStatus}
                      filename={row.filename}
                      key={row.id}
                      label={kind.label}
                      onDelete={onDelete}
                      onDismiss={onDismiss}
                      onPreview={onPreview}
                      onRun={onRun}
                      result={row.result}
                    />
                  ))}
                </div>
              ) : (
                <p className="border-t border-dashed border-slate-200 px-4 py-5 text-center text-xs font-normal text-slate-400">
                  등록된 {kind.label}가 없습니다.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function VerificationCodeRow({
  asset,
  expectedStatus,
  filename,
  label,
  onDelete,
  onDismiss,
  onPreview,
  onRun,
  result,
}: {
  asset?: ProblemAsset;
  expectedStatus: VerificationCodeKind;
  filename: string;
  label: string;
  onDelete: (asset: ProblemAsset) => void;
  onDismiss: (id: string) => void;
  onPreview: (asset: ProblemAsset, label: string) => void;
  onRun: (asset: ProblemAsset, expectedStatus: VerificationCodeKind) => void;
  result?: VerificationRunResult;
}) {
  const isBusy = isVerificationRunning(result);
  return (
    <div
      aria-label={filename}
      role="group"
      className="grid min-w-0 gap-3 px-4 py-3.5"
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 sm:flex">
            <svg
              aria-hidden="true"
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m8 8-4 4 4 4m8-8 4 4-4 4M13.5 5l-3 14" />
            </svg>
          </span>
          <div className="grid min-w-0 flex-1 gap-2">
            <button
              className="w-fit max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-indigo-700 disabled:text-slate-900"
              disabled={!asset}
              onClick={() => asset && onPreview(asset, label)}
              title={filename}
              type="button"
            >
              {filename}
            </button>
            {result ? (
              <VerificationResultSummary result={result} />
            ) : (
              <p className="text-xs font-normal text-slate-400">
                채점 기록 없음
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            className="h-8 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!asset}
            onClick={() => asset && onPreview(asset, label)}
            type="button"
          >
            보기
          </button>
          <button
            className="h-8 rounded-md border border-indigo-200 bg-indigo-50/60 px-2.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!asset || isBusy}
            onClick={() => asset && onRun(asset, expectedStatus)}
            type="button"
          >
            {isBusy ? '처리 중' : '채점'}
          </button>
          <button
            className="h-8 rounded-md px-2 text-xs font-normal text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isBusy}
            onClick={() =>
              asset ? onDelete(asset) : result && onDismiss(result.id)
            }
            type="button"
          >
            삭제
          </button>
        </div>
      </div>
      {result ? (
        <VerificationResultDetails
          key={result.submission?.submission_id ?? result.id}
          result={result}
        />
      ) : null}
    </div>
  );
}

function VerificationResultSummary({
  result,
}: {
  result: VerificationRunResult;
}) {
  const actualStatus = result.submission?.status;
  const isWorking = isVerificationRunning(result);
  const isComplete =
    !result.error &&
    !isWorking &&
    actualStatus &&
    !isSubmissionPending(actualStatus);
  const passed = isComplete && actualStatus === result.expectedStatus;
  const failed = isComplete && !passed;
  const progressText = submissionProgressText(result.submission);
  const progressPercent = submissionProgressPercent(result.submission);
  const currentLabel = result.error
    ? '처리 실패'
    : actualStatus
      ? submissionStatusLabel(actualStatus)
      : verificationStageLabel(result.stage);
  const testcaseOrder =
    result.submission?.failed_testcase_order ??
    parseVerificationDetails(result.submission?.judge_message).testcaseOrder;

  return (
    <div aria-live="polite" className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium',
            result.error
              ? 'bg-rose-50 text-rose-700'
              : passed
                ? 'bg-emerald-50 text-emerald-700'
                : failed
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-indigo-50 text-indigo-700',
          ].join(' ')}
          title={
            passed
              ? '기대 판정과 일치합니다.'
              : failed
                ? `기대 판정: ${submissionStatusLabel(result.expectedStatus)}`
                : currentLabel
          }
        >
          {passed ? (
            <svg
              aria-hidden="true"
              className="size-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3.5 8 3 3 6-6" />
            </svg>
          ) : failed || result.error ? (
            <span aria-hidden="true">!</span>
          ) : (
            <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
          )}
          {passed ? '통과' : failed ? '확인 필요' : currentLabel}
        </span>
        {isComplete ? (
          <span className="font-normal text-slate-500">
            판정{' '}
            <span className="font-medium text-slate-700">{currentLabel}</span>
          </span>
        ) : null}
        {testcaseOrder !== undefined && testcaseOrder !== null ? (
          <span className="font-normal text-slate-400">
            테스트케이스 #{testcaseOrder}
          </span>
        ) : null}
      </div>
      {isWorking ? (
        <div className="grid w-full max-w-md gap-1.5">
          <div
            aria-label={`${result.filename} 진행도`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent ?? undefined}
            aria-valuetext={progressText || currentLabel}
            role="progressbar"
            className="h-1.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className={`h-full rounded-full bg-indigo-500 transition-all duration-300 ${progressPercent === null ? 'motion-safe:animate-pulse' : ''}`}
              style={{
                width: progressPercent === null ? '25%' : `${progressPercent}%`,
              }}
            />
          </div>
          <p className="text-xs font-normal text-slate-500">
            {progressText || verificationStageHelp(result.stage, actualStatus)}
          </p>
        </div>
      ) : null}
      {result.error ? (
        <p className="text-xs leading-5 font-normal break-words text-rose-600">
          {result.error}
        </p>
      ) : null}
    </div>
  );
}

function VerificationResultDetails({
  result,
}: {
  result: VerificationRunResult;
}) {
  const { judge_message: judgeMessage, compile_message: compileMessage } =
    result.submission ?? {};
  if (!judgeMessage && !compileMessage) return null;
  const detail = parseVerificationDetails(judgeMessage);
  const hasComparison = detail.input !== undefined;

  return (
    <details className="group min-w-0 sm:ml-12">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-indigo-700 [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 3 5 5-5 5" />
        </svg>
        상세 보기
      </summary>
      <div className="mt-3 grid min-w-0 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
        {hasComparison ? (
          <>
            <VerificationLogBlock label="입력" text={detail.input!} />
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <VerificationLogBlock label="기대 출력" text={detail.expected!} />
              <VerificationLogBlock label="실제 출력" text={detail.actual!} />
            </div>
          </>
        ) : detail.message ? (
          <VerificationLogBlock label="채점 메시지" text={detail.message} />
        ) : null}
        {compileMessage ? (
          <VerificationLogBlock label="컴파일 로그" text={compileMessage} />
        ) : null}
        {judgeMessage ? (
          <details className="min-w-0">
            <summary className="w-fit cursor-pointer text-xs font-normal text-slate-500 hover:text-slate-800">
              원본 로그
            </summary>
            <div className="mt-2 min-w-0">
              <VerificationLogBlock
                label="채점 원본 로그"
                text={judgeMessage}
              />
            </div>
          </details>
        ) : null}
      </div>
    </details>
  );
}

function VerificationLogBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <pre
        aria-label={label}
        tabIndex={0}
        className="max-h-48 min-w-0 overflow-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-xs leading-6 font-normal text-slate-800 focus-visible:outline-2 focus-visible:outline-indigo-400"
      >
        {text === '' ? (
          <span className="font-sans text-slate-400">(빈 내용)</span>
        ) : (
          text
        )}
      </pre>
    </div>
  );
}

function verificationStageLabel(stage?: VerificationRunResult['stage']) {
  switch (stage) {
    case 'uploading':
      return '업로드 중';
    case 'loading_source':
      return '코드 불러오는 중';
    case 'submitting':
      return '채점 제출 중';
    case 'judging':
      return '채점 중';
    case 'done':
      return '채점 완료';
    default:
      return '채점 대기';
  }
}

function verificationStageHelp(
  stage?: VerificationRunResult['stage'],
  status?: string | null,
) {
  if (status === 'waiting') return '채점 큐에서 순서를 기다리는 중입니다.';
  if (status === 'preparing') return '채점 환경을 준비하는 중입니다.';
  if (status === 'judging') return '테스트케이스를 실행하는 중입니다.';
  switch (stage) {
    case 'uploading':
      return '검증 코드를 등록하는 중입니다.';
    case 'loading_source':
      return '저장된 검증 코드를 불러오는 중입니다.';
    case 'submitting':
      return '채점 큐에 제출하는 중입니다.';
    default:
      return '채점 서버 응답을 기다리는 중입니다.';
  }
}
