export function parseVerificationDetails(message?: string | null) {
  const normalized = (message ?? '').replace(/\r\n/g, '\n');
  const testcase = normalized.match(
    /^testcase\s+#(\d+)(?:\s*\([^\n]*\))?:\s*/i,
  );
  const values = normalized.match(
    /^\[input\]\n([\s\S]*?)\n\[expected\]\n([\s\S]*?)\n\[actual\]\n([\s\S]*)$/m,
  );

  return {
    testcaseOrder: testcase ? Number(testcase[1]) : undefined,
    // Preserve output whitespace: it can explain a failed comparison.
    input: values?.[1],
    expected: values?.[2],
    actual: values?.[3],
    message: normalized
      .slice(0, values?.index ?? normalized.length)
      .replace(/^testcase\s+#\d+(?:\s*\([^\n]*\))?:\s*/i, '')
      .replace(
        /^\[(?:source_sha256|input_storage_key|output_storage_key)\][^\n]*\n?/gm,
        '',
      )
      .trim(),
  };
}
