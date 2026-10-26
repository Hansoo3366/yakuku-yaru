import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMonthWindow, selectGamesMissingFromSchedule } from './stale-games.js';

void test('resolveMonthWindow 는 한 달 범위를 돌려주고 12월은 다음 해로 넘긴다', () => {
  assert.deepEqual(resolveMonthWindow(2026, 10), {
    from: '2026-10-01 00:00:00',
    to: '2026-11-01 00:00:00',
  });
  assert.deepEqual(resolveMonthWindow(2026, 12), {
    from: '2026-12-01 00:00:00',
    to: '2027-01-01 00:00:00',
  });
});

void test('resolveMonthWindow 는 날짜 필터 안으로 좁히고, 겹치지 않으면 null', () => {
  assert.deepEqual(
    resolveMonthWindow(2026, 10, {
      from: '2026-10-19 00:00:00',
      to: '2026-11-09 00:00:00',
    }),
    { from: '2026-10-19 00:00:00', to: '2026-11-01 00:00:00' },
  );
  assert.equal(
    resolveMonthWindow(2026, 9, {
      from: '2026-10-26 00:00:00',
      to: '2026-10-27 00:00:00',
    }),
    null,
  );
});

void test('selectGamesMissingFromSchedule 는 일정에 없는 경기만 고르고, 직관 기록이 있으면 취소로 남긴다', () => {
  const actions = selectGamesMissingFromSchedule(
    [
      { id: 1, externalId: '20261027HTSS0', attendanceCount: 0 },
      { id: 2, externalId: '20261028SSHT0', attendanceCount: 0 },
      { id: 3, externalId: '20261031HTSS0', attendanceCount: 2 },
    ],
    new Set(['20261027HTSS0', '20261029SSHT0']),
  );

  assert.deepEqual(actions, [
    { id: 2, action: 'delete' },
    { id: 3, action: 'cancel' },
  ]);
});
