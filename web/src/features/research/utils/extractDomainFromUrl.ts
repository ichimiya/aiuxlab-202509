export function extractDomainFromUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname.replace(/^www\./i, "");

    if (!hostname || !hostname.includes(".")) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}
