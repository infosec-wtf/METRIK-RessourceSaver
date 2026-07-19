import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNavigableHttpUrl, isSafeRetryFetchUrl } from './security.js';

test('isSafeRetryFetchUrl allows public http(s) resources', () => {
  for (const u of [
    'https://cdn.example.com/lib/app.js',
    'http://example.com/style.css',
    'https://172.32.0.1/asset.png', // public (outside 172.16/12)
  ]) {
    assert.equal(isSafeRetryFetchUrl(u), true, `should allow ${u}`);
  }
});

test('isSafeRetryFetchUrl blocks internal/private and non-http targets (SSRF)', () => {
  for (const u of [
    'http://localhost:9200/_cat/indices',
    'http://127.0.0.1/',
    'http://10.0.0.5/secret',
    'http://192.168.1.1/admin',
    'http://172.16.0.1/x',
    'http://169.254.169.254/latest/meta-data/', // cloud metadata
    'http://[::1]/',
    'http://router.local/',
    'http://0.0.0.0/',
    'ftp://example.com/x',
    'file:///etc/passwd',
    'not a url',
  ]) {
    assert.equal(isSafeRetryFetchUrl(u), false, `should block ${u}`);
  }
});

test('isSafeRetryFetchUrl blocks IPv4-mapped IPv6 and other IPv6-literal private ranges (SSRF)', () => {
  for (const u of [
    'http://[::ffff:169.254.169.254]/', // IPv4-mapped cloud metadata
    'http://[::ffff:127.0.0.1]/', // IPv4-mapped loopback
    'http://[fe80::1]/', // link-local
    'http://[fc00::1]/', // unique-local
    'http://[::1]/', // loopback
  ]) {
    assert.equal(isSafeRetryFetchUrl(u), false, `should block ${u}`);
  }
});

test('isSafeRetryFetchUrl does not over-block hostnames that merely resemble IPv6 prefixes', () => {
  for (const u of [
    'http://fd-cdn.example.com/a.js',
    'http://fconline.example.com/',
    'http://[2606:4700:4700::1111]/', // real public IPv6 (Cloudflare)
  ]) {
    assert.equal(isSafeRetryFetchUrl(u), true, `should allow ${u}`);
  }
});

test('isNavigableHttpUrl only accepts real http(s) URLs', () => {
  assert.equal(isNavigableHttpUrl('https://example.com/page'), true);
  assert.equal(isNavigableHttpUrl('http://example.com/'), true);
  for (const u of [
    'javascript:alert(1)',
    'httpx://evil.com', // startsWith('http') would wrongly pass
    'file:///etc/passwd',
    'data:text/html,<script>',
    'chrome://settings',
    '',
  ]) {
    assert.equal(isNavigableHttpUrl(u), false, `should reject ${u}`);
  }
});
