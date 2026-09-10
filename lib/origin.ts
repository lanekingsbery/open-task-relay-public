declare const __RELAY_STAGING_ORIGIN__: string;
export const STAGING_ORIGIN = typeof __RELAY_STAGING_ORIGIN__ === 'string' ? __RELAY_STAGING_ORIGIN__ : '';
export const CANONICAL_ORIGIN = STAGING_ORIGIN || 'https://opentaskrelay.org';
const transportOrigins = new Set([
  CANONICAL_ORIGIN,
  'https://opentaskrelay.com', 'https://www.opentaskrelay.com',
  'https://opentaskrelay.org', 'https://www.opentaskrelay.org',
]);
export function transportOrigin(value: string) {
  try { const u = new URL(value); if (transportOrigins.has(u.origin)) return u.origin; } catch {}
  return CANONICAL_ORIGIN;
}
export function onOrigin(text: string, value: string) {
  return text.replace(/https:\/\/(?:www\.)?opentaskrelay\.(?:org|com)(?![a-z0-9.:-])/gi, transportOrigin(value));
}
