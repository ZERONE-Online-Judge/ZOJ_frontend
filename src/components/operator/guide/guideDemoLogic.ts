export function guideAccessOutcome(
  contestPublic: boolean,
  resource: string,
  viewer: string,
) {
  if (viewer === 'operator') return true;
  if (resource === 'private') return false;
  if (viewer === 'participant') return true;
  return contestPublic && resource === 'public';
}
