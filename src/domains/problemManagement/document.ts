import {
  PACKAGE_FILE_ROLES,
  PROBLEM_META_PREFIX,
  type PackageFileRole,
  type ProblemAsset,
  type ProblemDocument,
  type ProblemExample,
  type TestcaseDraft,
} from '@/domains/problemManagement/types';

export function parseProblemDocument(rawStatement: string): ProblemDocument {
  const match = rawStatement.match(/^<!--ZOJ_META:(.+?)-->\n?/s);
  if (!match) {
    return {
      statement: rawStatement,
      inputDescription: '',
      outputDescription: '',
      note: '',
      examples: [] as ProblemExample[],
    };
  }

  try {
    const meta = JSON.parse(match[1]) as Partial<ProblemDocument>;
    return {
      statement: rawStatement.slice(match[0].length),
      inputDescription: meta.inputDescription ?? '',
      outputDescription: meta.outputDescription ?? '',
      note: meta.note ?? '',
      examples: Array.isArray(meta.examples) ? meta.examples : [],
    };
  } catch {
    return {
      statement: rawStatement,
      inputDescription: '',
      outputDescription: '',
      note: '',
      examples: [] as ProblemExample[],
    };
  }
}

export function serializeProblemDocument(document: ProblemDocument) {
  const metaExamples = document.examples.filter(
    (item) => item.input.trim() || item.output.trim() || item.note?.trim(),
  );
  const meta = {
    inputDescription: document.inputDescription,
    outputDescription: document.outputDescription,
    note: document.note,
    examples: metaExamples,
  };
  const hasMeta = Boolean(
    meta.inputDescription.trim() ||
      meta.outputDescription.trim() ||
      meta.note.trim() ||
      meta.examples.length,
  );

  if (!hasMeta) return document.statement;
  return `${PROBLEM_META_PREFIX}${JSON.stringify(meta)}-->\n${document.statement}`;
}

export function resolveAssetSource(url: string, assets: ProblemAsset[]) {
  const match = url.match(/^asset:\/\/(.+)$/);
  if (match) return assets.find((asset) => asset.asset_id === match[1])?.download_url ?? '';
  if (/^(https?:|data:|blob:|\/api\/storage\/objects\/)/.test(url)) return url;

  const cleanUrl = decodeURIComponent(url.split(/[?#]/)[0] ?? url).replace(/^\.?\//, '');
  const basename = cleanUrl.split('/').pop() ?? cleanUrl;
  const asset = assets.find((item) => {
    const storageKey = item.storage_key.replace(/^\.?\//, '');
    const storageName = storageKey.split('/').pop() ?? storageKey;

    return (
      item.original_filename === cleanUrl ||
      item.original_filename === basename ||
      storageKey === cleanUrl ||
      storageKey.endsWith(`/${cleanUrl}`) ||
      storageName === basename
    );
  });

  return asset?.download_url ?? url;
}

export function packageFileRole(asset: ProblemAsset): PackageFileRole | null {
  const matched = PACKAGE_FILE_ROLES.find((role) => asset.storage_key.includes(`/package-files/${role.value}/`));
  return matched?.value ?? null;
}

export function fileStem(filename: string) {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  return base.replace(/\.[^.]+$/, '');
}

export function newTestcaseDraft(displayOrder: number): TestcaseDraft {
  return {
    id: `case-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    display_order: displayOrder,
    input_filename: '',
    output_filename: '',
    input_storage_key: '',
    output_storage_key: '',
    input_sha256: '',
    output_sha256: '',
  };
}

export function editorLanguageForJudgeLanguage(language: string) {
  if (language === 'c99') return 'c';
  if (language === 'cpp17') return 'cpp';
  if (language === 'python313') return 'python';
  if (language === 'java8') return 'java';
  return 'plaintext';
}

