import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveURLToPath } from './url.js';

// A path is unsafe if any segment is exactly ".." (directory traversal),
// i.e. it can escape the extraction root when the ZIP is unpacked (Zip-Slip).
const hasTraversal = (p) => p.split('/').some((seg) => seg === '..');

test('neutralizes path traversal in resource URLs (Zip-Slip)', () => {
  const malicious = [
    'https://evil.com/../../../etc/passwd',
    'https://evil.com/%2e%2e/%2e%2e/secret',
    'https://evil.com/a/%2e%2e%2f%2e%2e%2froot',
    'https://evil.com/a%2f..%2f..%2f..%2fetc%2fpasswd',
    'https://evil.com/....//....//etc/passwd',
    'https://evil.com/foo/%2e%2e%5c%2e%2e%5cwin.ini',
  ];
  for (const url of malicious) {
    const { path } = resolveURLToPath(url, 'text/html', 'x');
    assert.ok(!hasTraversal(path), `traversal survived for ${url} -> ${path}`);
    assert.ok(!path.startsWith('/'), `absolute path for ${url} -> ${path}`);
  }
});

test('preserves legitimate resource paths', () => {
  const cases = [
    ['https://example.com/assets/js/app.js', 'example.com/assets/js/app.js'],
    ['https://example.com/', 'example.com/index.html'],
    ['https://cdn.example.com/img/logo.png', 'cdn.example.com/img/logo.png'],
    ['https://example.com/styles/main.css', 'example.com/styles/main.css'],
  ];
  for (const [url, expected] of cases) {
    const { path } = resolveURLToPath(url, null, null);
    assert.equal(path, expected, `unexpected path for ${url}`);
  }
});

test('does not over-strip legitimate names containing dots or ports', () => {
  // ".." inside a filename segment is NOT traversal and must survive.
  assert.equal(
    resolveURLToPath('https://example.com/vendor/react..production.min.js', 'application/javascript', 'x').path,
    'example.com/vendor/react..production.min.js'
  );
  // Port and query string handling.
  assert.equal(
    resolveURLToPath('https://example.com:8443/api/data.json?v=2', 'application/json', 'x').path,
    'example.com8443/api/data.json'
  );
});

test('keeps name consistent with the sanitized path', () => {
  const { path, name } = resolveURLToPath('https://evil.com/%2e%2e/deep/app.js', 'application/javascript', 'x');
  assert.ok(!path.split('/').includes('..'));
  assert.equal(name, path.substring(path.lastIndexOf('/') + 1));
});

test('keeps single-dot and nested segments without eating real names', () => {
  // "." as a lone segment is meaningless and should collapse, but a real
  // filename that merely contains dots must survive.
  const { path } = resolveURLToPath('https://example.com/a/b/jquery.min.js', 'application/javascript', 'x');
  assert.equal(path, 'example.com/a/b/jquery.min.js');
});
