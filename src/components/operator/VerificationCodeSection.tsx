import type { ProblemAsset } from '@/domains/problemManagement/types';
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
    <section className="grid gap-4 rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-sm font-black text-slate-950">검증 코드 채점</h3>
          <p className="text-xs leading-5 font-bold text-slate-500">
            정답/오답/시간초과/메모리초과 코드를 여러 개 올려 테스트케이스가
            의도대로 판정하는지 확인합니다. 선택한 파일은 바로 목록에 표시되며
            각각 자동으로 채점됩니다.
          </p>
        </div>
        {runningCount ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
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
              className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3"
              key={kind.expectedStatus}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-black text-slate-900">
                    {kind.label}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    기대 결과: {submissionStatusLabel(kind.expectedStatus)} ·{' '}
                    {kind.description}
                  </p>
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center rounded bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800">
                  파일 선택
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
                <div className="grid gap-2">
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
                <p className="rounded border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs font-bold text-slate-500">
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
      className="grid gap-3 rounded border border-slate-200 bg-white px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="grid min-w-0 gap-2">
        <button
          className="w-fit max-w-full truncate text-left text-xs font-black text-indigo-700 hover:text-indigo-950 disabled:text-slate-700"
          disabled={!asset}
          onClick={() => asset && onPreview(asset, label)}
          title={filename}
          type="button"
        >
          {filename}
        </button>
        {result ? <VerificationResultSummary result={result} /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="h-9 rounded border border-indigo-200 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!asset}
          onClick={() => asset && onPreview(asset, label)}
          type="button"
        >
          보기
        </button>
        <button
          className="h-9 rounded border border-emerald-200 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!asset || isBusy}
          onClick={() => asset && onRun(asset, expectedStatus)}
          type="button"
        >
          {isBusy ? '처리 중' : '채점'}
        </button>
        <button
          className="h-9 rounded border border-rose-200 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
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
  );
}

function VerificationResultSummary({
  result,
}: {
  result: VerificationRunResult;
}) {
  const actualStatus = result.submission?.status;
  const isPending = actualStatus ? isSubmissionPending(actualStatus) : false;
  const passed =
    actualStatus && !isPending && actualStatus === result.expectedStatus;
  const failed =
    actualStatus && !isPending && actualStatus !== result.expectedStatus;
  const progressText = submissionProgressText(result.submission);
  const progressPercent = submissionProgressPercent(result.submission);
  const isWorking = isVerificationRunning(result);
  const progressWidth =
    typeof progressPercent === 'number'
      ? progressPercent
      : actualStatus === 'waiting'
        ? 12
        : isWorking
          ? 6
          : 0;
  const currentLabel = result.error
    ? '처리 실패'
    : actualStatus
      ? submissionStatusLabel(actualStatus)
      : verificationStageLabel(result.stage);

  return (
    <div
      aria-live="polite"
      className={[
        'grid gap-1 rounded px-3 py-2 text-xs font-bold',
        result.error
          ? 'border border-rose-200 bg-rose-50 text-rose-700'
          : passed
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : failed
              ? 'border border-amber-200 bg-amber-50 text-amber-800'
              : isWorking
                ? 'border border-indigo-200 bg-indigo-50 text-indigo-800'
                : 'border border-slate-200 bg-slate-50 text-slate-600',
      ].join(' ')}
    >
      <p className="font-black">
        기대 {submissionStatusLabel(result.expectedStatus)}
        {` / 현재 ${currentLabel}`}
        {passed ? ' · 통과' : failed ? ' · 확인 필요' : ''}
      </p>
      {isWorking ? (
        <div className="grid gap-1">
          <div
            aria-label={`${result.filename} 진행도`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent ?? undefined}
            aria-valuetext={progressText || currentLabel}
            role="progressbar"
            className="h-1.5 overflow-hidden rounded-full bg-white/70"
          >
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, progressWidth))}%` }}
            />
          </div>
          <p className="text-[11px] leading-5">
            {progressText || verificationStageHelp(result.stage, actualStatus)}
          </p>
        </div>
      ) : null}
      {result.submission?.judge_message ? (
        <p className="text-[11px] leading-5 break-words">
          {result.submission.judge_message}
        </p>
      ) : null}
      {result.submission?.compile_message ? (
        <p className="text-[11px] leading-5 break-words">
          {result.submission.compile_message}
        </p>
      ) : null}
      {result.error ? (
        <p className="text-[11px] leading-5 break-words">{result.error}</p>
      ) : null}
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
