import type { Problem, ProblemAsset } from '@/domains/problemManagement/types';
import MarkdownPreview from '@/shared/ui/MarkdownPreview';

type ProblemEditorialPanelProps = {
  assets?: ProblemAsset[];
  problem: Problem;
};

function editorialAssets(assets: ProblemAsset[]) {
  return assets.filter((asset) =>
    asset.storage_key.includes('/editorial-assets/'),
  );
}

export default function ProblemEditorialPanel({
  assets = [],
  problem,
}: ProblemEditorialPanelProps) {
  const attachments = editorialAssets(assets);
  const body = problem.editorial?.trim() ?? '';

  return (
    <article className="min-w-0 bg-white px-8 py-7">
      <header>
        <p className="text-xs font-black tracking-normal text-indigo-600 uppercase">
          Editorial
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950">
          {problem.problem_code}. {problem.title} 해설
        </h1>
      </header>

      <div className="mt-7">
        {body ? (
          <MarkdownPreview assets={assets} statement={body} />
        ) : (
          <p className="rounded border border-dashed border-slate-200 px-4 py-12 text-center text-sm font-bold text-slate-500">
            등록된 해설 본문이 없습니다.
          </p>
        )}
      </div>

      {attachments.length ? (
        <section className="mt-10 grid gap-3">
          <h2 className="text-2xl font-black tracking-normal text-slate-950">
            해설 파일
          </h2>
          <div className="grid gap-2">
            {attachments.map((asset) => (
              <a
                className="rounded border border-slate-200 px-4 py-3 text-sm font-black text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                href={asset.download_url}
                key={asset.asset_id}
                rel="noreferrer"
                target="_blank"
              >
                {asset.original_filename}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
