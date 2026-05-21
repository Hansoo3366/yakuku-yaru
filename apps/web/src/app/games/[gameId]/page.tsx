'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchGame, type Game } from '@/lib/baseball-api';
import { getAccessToken } from '@/lib/auth';
import {
  listAttendanceRecords,
  type AttendanceRecord,
} from '@/lib/attendance-api';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export default function GameDetailPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = Number(params.gameId);
  const [game, setGame] = useState<Game | null>(null);
  const [attendanceRecord, setAttendanceRecord] =
    useState<AttendanceRecord | null>(null);

  useEffect(() => {
    fetchGame(gameId).then((response) => setGame(response.game));

    const token = getAccessToken();
    if (token) {
      listAttendanceRecords({}, token).then((response) => {
        setAttendanceRecord(
          response.items.find((record) => record.gameId === gameId) ?? null,
        );
      });
    }
  }, [gameId]);

  if (!game) {
    return (
      <main className="app-shell">
        <p className="loading-text">경기 정보를 불러오는 중</p>
      </main>
    );
  }

  const scoreText =
    game.homeScore === null || game.awayScore === null
      ? '경기 예정'
      : `${game.awayScore} : ${game.homeScore}`;

  return (
    <main className="app-shell">
      <section className="game-detail-panel">
        <Link className="back-link" href="/calendar">
          캘린더로
        </Link>
        <p className="eyebrow">Game Detail</p>
        <h1>
          {game.awayTeam.name} @ {game.homeTeam.name}
        </h1>
        <div className="scoreboard-line">
          <span>{game.awayTeam.shortName}</span>
          <strong>{scoreText}</strong>
          <span>{game.homeTeam.shortName}</span>
        </div>

        <dl className="info-list">
          <div>
            <dt>경기 일시</dt>
            <dd>{formatDateTime(game.gameDate)}</dd>
          </div>
          <div>
            <dt>구장</dt>
            <dd>{game.stadium}</dd>
          </div>
          <div>
            <dt>경기 상태</dt>
            <dd>{game.status === 'finished' ? '종료' : '예정'}</dd>
          </div>
          <div>
            <dt>예매 오픈</dt>
            <dd>
              {game.ticketOpenAt
                ? formatDateTime(game.ticketOpenAt)
                : '예매 정보 준비 중'}
            </dd>
          </div>
        </dl>

        <div className="game-actions">
          {game.ticketUrl ? (
            <a href={game.ticketUrl} rel="noreferrer" target="_blank">
              예매처 보기
            </a>
          ) : null}
          {attendanceRecord ? (
            <Link href={`/attendance/${attendanceRecord.id}/edit`}>
              직관 기록 수정
            </Link>
          ) : (
            <Link href={`/attendance/new?gameId=${game.id}`}>직관 기록 작성</Link>
          )}
          <button type="button">알림 설정</button>
        </div>
      </section>
    </main>
  );
}
