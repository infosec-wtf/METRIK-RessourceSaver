// Strict base64 validation: reject non-base64 sentinels/garbage before
// they reach zip.Data64URIReader (which would otherwise choke or produce
// a corrupted archive entry).
export const isValidBase64 = (s) =>
  typeof s === 'string' && s.length > 0 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(s);
