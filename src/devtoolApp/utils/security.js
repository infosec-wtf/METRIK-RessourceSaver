// Security helpers for validating attacker-controlled URLs before the extension
// acts on them (retry-fetch, tab navigation). See SECURITY-AUDIT.md findings #3/#9.

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isHttp = (url) => !!url && (url.protocol === 'http:' || url.protocol === 'https:');

// True for hostnames that point at the local machine or a private/internal
// network — i.e. targets a public web page has no business making the extension
// reach out to. Blocks the SSRF / internal-network-read vector.
export const isPrivateHost = (hostname) => {
  if (!hostname) return true;
  let host = hostname.toLowerCase();
  // Strip IPv6 brackets.
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  // IPv6 loopback and unique-local / link-local ranges (::1, fc00::/7, fe80::/10).
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    if (a === 0 || a === 127) return true; // "this host" / loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata)
    if (a >= 224) return true; // multicast / reserved
  }
  return false;
};

// Gate for the automatic retry-fetch in resource.js: only public http(s) URLs.
export const isSafeRetryFetchUrl = (value) => {
  const url = parseUrl(value);
  if (!isHttp(url)) return false;
  return !isPrivateHost(url.hostname);
};

// Gate for chrome.tabs.update navigation: must be a real http(s) URL, not merely
// a string that startsWith('http') (e.g. "httpx://") nor a javascript:/data:/file: URI.
export const isNavigableHttpUrl = (value) => isHttp(parseUrl(value));
