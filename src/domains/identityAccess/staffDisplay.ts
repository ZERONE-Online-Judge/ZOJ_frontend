export function contestStaffDisplayName(
  name?: string | null,
  title?: string | null,
) {
  const displayName = name?.trim();
  const roleTitle = title?.trim() || '운영자';
  return displayName && displayName !== roleTitle
    ? `${displayName} / ${roleTitle}`
    : roleTitle;
}
