import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidBase64 } from './encoding.js';

test('accepts valid base64 strings', () => {
  assert.equal(isValidBase64('aGVsbG8='), true);
});

test('rejects sentinel "No Content" strings', () => {
  assert.equal(isValidBase64('No Content: http://x'), false);
});

test('rejects strings with invalid base64 characters', () => {
  assert.equal(isValidBase64('%%%'), false);
});

test('rejects empty string', () => {
  assert.equal(isValidBase64(''), false);
});

test('rejects strings whose length is not a multiple of 4', () => {
  assert.equal(isValidBase64('abc'), false);
});
