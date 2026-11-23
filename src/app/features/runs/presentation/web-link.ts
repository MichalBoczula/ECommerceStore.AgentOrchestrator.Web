export function webLink(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
