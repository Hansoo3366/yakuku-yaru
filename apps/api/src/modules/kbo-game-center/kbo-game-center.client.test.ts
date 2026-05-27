import assert from 'node:assert/strict';
import { parseLineupRowsPayload } from './kbo-game-center.client.js';

{
  const payload = JSON.stringify({
    rows: [
      {
        row: [
          { Text: '1' },
          { Text: '중견수' },
          { Text: '최정원' },
          { Text: '1.64' },
        ],
      },
    ],
  });

  assert.deepEqual(parseLineupRowsPayload(payload), [
    {
      battingOrder: 1,
      fieldPosition: '중견수',
      name: '최정원',
      kboPlayerId: null,
      profileImageUrl: null,
      war: 1.64,
    },
  ]);
}

{
  const payload = JSON.stringify({
    rows: [
      {
        row: [
          { Text: '3' },
          { Text: '1루수' },
          {
            Text: `<span class="name"><img src="https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/kbo/2025/12345.png" alt="" /><a>김하성</a></span>`,
          },
          { Text: '2.10' },
        ],
      },
    ],
  });

  assert.deepEqual(parseLineupRowsPayload(payload), [
    {
      battingOrder: 3,
      fieldPosition: '1루수',
      name: '김하성',
      kboPlayerId: 12345,
      profileImageUrl:
        'https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/kbo/2025/12345.png',
      war: 2.1,
    },
  ]);
}

console.log('kbo-game-center.client.test.ts ok');
