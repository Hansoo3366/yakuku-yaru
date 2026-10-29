import assert from 'node:assert/strict';
import test from 'node:test';
import { readCookieHeader } from './auth-cookie.js';

test('readCookieHeader 는 이름이 맞는 쿠키 값을 풀어서 돌려준다', () => {
  assert.equal(readCookieHeader('a=1; yakuku_access=x%20y', 'yakuku_access'), 'x y');
});

test('readCookieHeader 는 깨진 쿠키 값이면 던지지 않고 null 을 돌려준다', () => {
  assert.equal(readCookieHeader('yakuku_access=%', 'yakuku_access'), null);
});
