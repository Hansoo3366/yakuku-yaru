'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchGame, type Game } from '@/lib/baseball-api';
import { getAccessToken } from '@/lib/auth';
import {
  listAttendanceRecords,
  type AttendanceRecord,
} from '@/lib/attendance-api';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { Skeleton } from '@/components/Skeleton';
import {
  getGameStatusBadgeClass,
  getGameStatusLabel,
  getGameStatusTone,
} from '@/lib/game-status';

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
        <Skeleton height={220} radius={10} />
        <Skeleton height={140} radius={10} />
        <Skeleton height={120} radius={10} />
      </main>
    );
  }

  const isFinished = game.homeScore !== null && game.awayScore !== null;
  const scoreText = isFinished
    ? `${game.awayScore} : ${game.homeScore}`
    : null;

  return (
    <main className="app-shell">
      <Link className="back-link" href="/calendar">
        캘린더로
      </Link>

      <section aria-label="경기 매치업" className="match-hero">
        <div>
          <span className="eyebrow">Game Detail</span>
          <h1>
            {game.awayTeam.name} vs {game.homeTeam.name}
          </h1>
          <p className="match-hero-stadium">
            {formatDateTime(game.gameDate)} · {game.stadium}
          </p>
        </div>

        <div className="match-scoreboard">
          <div className="match-team">
            <img alt="" src={getTeamLogoSrc(game.awayTeam)} />
            <strong>{game.awayTeam.shortName}</strong>
            <small>Away</small>
          </div>
          <div className="match-score">
            {isFinished ? (
              <>
                <span className="match-score-label">FINAL</span>
                <span>{scoreText}</span>
              </>
            ) : (
              <>
                <span className="match-score-label">Scheduled</span>
                <span className="match-score-vs">VS</span>
              </>
            )}
          </div>
          <div className="match-team">
            <img alt="" src={getTeamLogoSrc(game.homeTeam)} />
            <strong>{game.homeTeam.shortName}</strong>
            <small>Home</small>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="action-bar">
          {attendanceRecord ? (
            <Link
              className="btn btn-primary btn-lg"
              href={`/attendance/${attendanceRecord.id}/edit`}
            >
              직관 기록 수정
            </Link>
          ) : (
            <Link
              className="btn btn-primary btn-lg"
              href={`/attendance/new?gameId=${game.id}`}
            >
              직관 기록 작성
            </Link>
          )}
          {game.ticketUrl ? (
            <a
              className="btn btn-ghost btn-lg"
              href={game.ticketUrl}
              rel="noreferrer"
              target="_blank"
            >
              예매처 열기
            </a>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>경기 정보</h2>
        </div>
        <dl style={{ margin: 0 }}>
          <div className="info-row">
            <dt>경기 일시</dt>
            <dd>{formatDateTime(game.gameDate)}</dd>
          </div>
          <div className="info-row">
            <dt>구장</dt>
            <dd>{game.stadium}</dd>
          </div>
          <div className="info-row">
            <dt>경기 상태</dt>
            <dd>
              {(() => {
                const tone = getGameStatusTone(game);
                return (
                  <span className={getGameStatusBadgeClass(tone)}>
                    {getGameStatusLabel(tone)}
                  </span>
                );
              })()}
            </dd>
          </div>
        </dl>
      </section>

      {game.stadiumGuide ? (
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>구장 가이드</h2>
              <p>주변 맛집과 주차 정보</p>
            </div>
            {game.stadiumGuide.mapUrl ? (
              <a
                className="btn btn-ghost btn-sm"
                href={game.stadiumGuide.mapUrl}
                rel="noreferrer"
                target="_blank"
              >
                지도 열기
              </a>
            ) : null}
          </div>
          <div className="stadium-info">
            <div className="stadium-info-row">
              <strong>맛집 메모</strong>
              <p>{game.stadiumGuide.foodSummary}</p>
            </div>
            <div className="stadium-info-row">
              <strong>주차 정보</strong>
              <p>{game.stadiumGuide.parkingSummary}</p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
