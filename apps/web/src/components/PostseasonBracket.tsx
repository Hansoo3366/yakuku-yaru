/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from 'react';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import type {
  PostseasonBracket as PostseasonBracketData,
  PostseasonGame,
  PostseasonRound,
  PostseasonTeam,
} from '@/lib/baseball-api';
import {
  formatKoreanMonthDay,
  formatKoreanTime,
  formatKoreanWeekday,
} from '@/lib/date-format';
import { josa } from '@/lib/josa';
import { getTeamLogoSrc } from '@/lib/team-logo';

type Props = {
  bracket: PostseasonBracketData;
  highlightTeamId?: number | null;
};

const STATUS_LABEL: Record<PostseasonRound['status'], string> = {
  waiting: '대기',
  upcoming: '예정',
  in_progress: '진행 중',
  finished: '종료',
};

function formatShortDate(value: string) {
  return formatKoreanMonthDay(value).replace('월 ', '.').replace('일', '');
}

/** 대진표 위 한 줄 요약: 우승 > 진행 중인 시리즈 > 다음 시리즈 순 */
export function summarizePostseason(bracket: PostseasonBracketData) {
  if (bracket.champion) {
    return `${josa(bracket.champion.shortName, '이')} ${bracket.seasonYear} 한국시리즈 우승팀이에요.`;
  }

  const live = bracket.rounds.find((round) => round.status === 'in_progress');

  if (live?.higher && live.lower) {
    if (live.higherWins === live.lowerWins) {
      return `${live.name}에서 ${josa(live.higher.shortName, '과')} ${josa(live.lower.shortName, '이')} ${live.higherWins}승씩 맞서고 있어요.`;
    }

    const [leader, trailer, leaderWins, trailerWins] =
      live.higherWins > live.lowerWins
        ? [live.higher, live.lower, live.higherWins, live.lowerWins]
        : [live.lower, live.higher, live.lowerWins, live.higherWins];

    return `${live.name}에서 ${josa(leader.shortName, '이')} ${trailer.shortName}에 ${leaderWins}승 ${trailerWins}패로 앞서고 있어요.`;
  }

  const next = bracket.rounds.find((round) => round.status === 'upcoming');

  if (next?.higher && next.lower) {
    return `${next.name}에서 ${josa(next.higher.shortName, '과')} ${josa(next.lower.shortName, '이')} 맞붙어요.`;
  }

  return '정규시즌 상위 5팀이 한국시리즈 우승을 다퉈요.';
}

function TeamSlot({
  team,
  placeholder,
  wins,
  round,
  highlightTeamId,
}: {
  team: PostseasonTeam | null;
  placeholder: string;
  wins: number;
  round: PostseasonRound;
  highlightTeamId?: number | null;
}) {
  if (!team) {
    return (
      <li className="bracket-slot is-placeholder">
        <span className="bracket-slot__seed" />
        <span aria-hidden="true" className="bracket-slot__logo-empty" />
        <span className="bracket-slot__name">{placeholder}</span>
      </li>
    );
  }

  const isWinner = round.winnerTeamId === team.teamId;
  const isEliminated = round.winnerTeamId !== null && !isWinner;
  const showWins = round.status === 'in_progress' || round.status === 'finished';

  return (
    <li
      className={`bracket-slot${isWinner ? ' is-winner' : ''}${
        isEliminated ? ' is-eliminated' : ''
      }${highlightTeamId === team.teamId ? ' is-highlighted' : ''}`}
    >
      <span
        aria-label={team.seed ? `정규시즌 ${team.seed}위` : undefined}
        className="bracket-slot__seed"
      >
        {team.seed ?? ''}
      </span>
      <img alt="" src={getTeamLogoSrc({ shortName: team.shortName })} />
      <span className="bracket-slot__name">
        <strong>{team.shortName}</strong>
        {isWinner ? <span className="sr-only"> 진출</span> : null}
      </span>
      {showWins ? <b className="bracket-slot__wins">{wins}</b> : null}
    </li>
  );
}

function GameRow({ game, index }: { game: PostseasonGame; index: number }) {
  const finished =
    game.status === 'finished' && game.homeScore !== null && game.awayScore !== null;

  return (
    <li>
      <Link className="bracket-game" href={`/games/${game.id}`}>
        <span className="bracket-game__no">{index + 1}차전</span>
        {finished ? (
          <span className="bracket-game__score">
            {game.awayTeam.shortName} <b>{game.awayScore}:{game.homeScore}</b>{' '}
            {game.homeTeam.shortName}
          </span>
        ) : (
          <span className="bracket-game__score is-scheduled">
            {formatShortDate(game.gameDate)}({formatKoreanWeekday(game.gameDate)}){' '}
            <small>{formatKoreanTime(game.gameDate)}</small>
          </span>
        )}
      </Link>
    </li>
  );
}

function ChampionCrown({ champion, seasonYear }: { champion: PostseasonTeam | null; seasonYear: number }) {
  return (
    <div className={`bracket-crown${champion ? ' is-decided' : ''}`}>
      <span className="bracket-crown__badge">
        <Crown aria-hidden="true" size={36} />
      </span>
      {champion ? (
        <span className="bracket-crown__label">
          <img alt="" src={getTeamLogoSrc({ shortName: champion.shortName })} />
          <strong>{champion.shortName}</strong> {seasonYear} 우승
        </span>
      ) : (
        <span className="bracket-crown__label">{seasonYear} 우승팀</span>
      )}
    </div>
  );
}

function RoundColumn({
  round,
  step,
  fedByWinner,
  crown,
  highlightTeamId,
}: {
  round: PostseasonRound;
  /** 계단 위치. 와일드카드가 가장 아래(3), 한국시리즈가 맨 위(0) */
  step: number;
  /** 앞 라운드 승자가 정해져 이어지는 선을 칠한다 */
  fedByWinner: boolean;
  /** 한국시리즈 위에 얹는 우승 왕관 */
  crown?: ReactNode;
  highlightTeamId?: number | null;
}) {
  const winsLabel =
    round.seriesId === '4' ? '4위 1승 안고 시작' : `${round.winsNeeded.higher}승 선승`;

  return (
    <div
      className="bracket-column"
      data-fed={fedByWinner}
      data-first={round.seriesId === '4'}
      data-final={Boolean(crown)}
      style={{ ['--bracket-step' as string]: step }}
    >
      {crown}
      <article className="bracket-match" data-status={round.status}>
        <header className="bracket-match__head">
          <h4>{round.name}</h4>
          <span className="bracket-match__status">{STATUS_LABEL[round.status]}</span>
        </header>
        <ul className="bracket-match__slots">
          <TeamSlot
            highlightTeamId={highlightTeamId}
            placeholder={round.higherPlaceholder}
            round={round}
            team={round.higher}
            wins={round.higherWins}
          />
          <TeamSlot
            highlightTeamId={highlightTeamId}
            placeholder={round.lowerPlaceholder}
            round={round}
            team={round.lower}
            wins={round.lowerWins}
          />
        </ul>
      </article>
      <div className="bracket-column__detail" data-status={round.status}>
        <p className="bracket-column__meta">
          {winsLabel}
          {round.draws > 0 ? ` · 무승부 ${round.draws}경기` : ''}
        </p>
        {round.games.length > 0 ? (
          <ol className="bracket-column__games">
            {round.games.map((game, index) => (
              <GameRow game={game} index={index} key={game.id} />
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

/**
 * KBO 포스트시즌은 아래 순위 팀이 한 단계씩 올라가는 계단식이다.
 * 왼쪽 아래 와일드카드에서 오른쪽 위 한국시리즈로, 앞 라운드 승자가 다음 라운드 아랫칸으로 들어간다.
 */
export function PostseasonBracket({ bracket, highlightTeamId }: Props) {
  const lastStep = bracket.rounds.length - 1;

  return (
    <div className="postseason-bracket-wrap">
      <div
        aria-label={`${bracket.seasonYear} 포스트시즌 대진`}
        className="postseason-bracket"
      >
        {bracket.rounds.map((round, index) => (
          <RoundColumn
            crown={
              index === lastStep ? (
                <ChampionCrown
                  champion={bracket.champion}
                  seasonYear={bracket.seasonYear}
                />
              ) : undefined
            }
            fedByWinner={index > 0 && bracket.rounds[index - 1].winnerTeamId !== null}
            highlightTeamId={highlightTeamId}
            key={round.seriesId}
            round={round}
            step={lastStep - index}
          />
        ))}
      </div>
    </div>
  );
}
