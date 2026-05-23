export function formatMemoryKb(value?: number | null) {
  if (value === undefined || value === null) return '-';
  if (value >= 1000) {
    const megabytes = Math.round((value / 1000) * 10) / 10;
    return `${megabytes.toLocaleString('ko-KR')} MB`;
  }
  return `${value.toLocaleString('ko-KR')} KB`;
}
