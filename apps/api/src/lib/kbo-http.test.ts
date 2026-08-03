import assert from 'node:assert/strict';
import { fetchKboJson, fetchKboText } from './kbo-http.js';

const originalFetch = globalThis.fetch;

try {
  const seenUserAgents: string[] = [];
  let callCount = 0;

  globalThis.fetch = async (_input, init) => {
    callCount += 1;
    seenUserAgents.push(new Headers(init?.headers).get('user-agent') ?? '');

    if (callCount === 1) {
      return new Response(null, { status: 204 });
    }

    return new Response('{"rows":[]}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const parsed = await fetchKboJson<{ rows: unknown[] }>(
    'https://example.test/schedule',
    undefined,
    '테스트 일정',
  );

  assert.deepEqual(parsed, { rows: [] });
  assert.equal(callCount, 2);
  assert.match(seenUserAgents[0], /^Mozilla\/5\.0/);
  assert.match(seenUserAgents[1], /^Mozilla\/5\.0/);
  assert.notEqual(seenUserAgents[0], seenUserAgents[1]);

  globalThis.fetch = async () => new Response('', { status: 200 });

  await assert.rejects(
    fetchKboText('https://example.test/empty', undefined, '테스트 빈 응답'),
    /200 빈 응답/,
  );

  callCount = 0;
  globalThis.fetch = async () => {
    callCount += 1;
    return new Response('Forbidden', { status: 403, statusText: 'Forbidden' });
  };

  await assert.rejects(
    fetchKboText('https://example.test/forbidden', undefined, '테스트 거부'),
    /403 Forbidden/,
  );
  assert.equal(callCount, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('kbo-http.test.ts: ok');
