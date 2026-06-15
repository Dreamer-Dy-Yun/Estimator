export function resolvePublicAssetUrl(path: string): string {
  const baseUrl: string = import.meta.env.BASE_URL || '/'
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${path.replace(/^\/+/, '')}`
}
