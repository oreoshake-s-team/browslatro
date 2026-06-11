export const SITE_URL_PLACEHOLDER = "%SITE_URL%";

export function applySiteUrl(content: string, siteUrl: string): string {
  return content.replaceAll(SITE_URL_PLACEHOLDER, siteUrl);
}
