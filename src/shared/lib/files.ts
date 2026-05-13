export async function sha256Hex(file: Blob) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function encodeStorageKey(storageKey: string) {
  return storageKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}
