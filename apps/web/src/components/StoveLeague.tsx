'use client';

/* eslint-disable @next/next/no-img-element */

import './stove-league.css';

import { ChevronRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import type {
  FreeAgent,
  FreeAgentTeam,
  PostseasonBracket,
  Team,
  TeamStandingsResponse,
} from '@/lib/baseball-api';
import { formatKoreanMonthDay } from '@/lib/date-format';
import { formatFreeAgentBreakdown, formatFreeAgentDeal } from '@/lib/fa-amount';
import { getPlayerProfileImageSrc } from '@/lib/player-image';
import { getTeamLogoSrc } from '@/lib/team-logo';
import { FreeAgentRecordDialog } from './FreeAgentRecordDialog';
import { isIntegratedChampion } from './PostseasonBracket';

/* ---------- 우승 배너 ---------- */

/**
 * 시즌별 우승 KV 배경. 글자는 이미지에 넣지 않고 빈 자리(PC 왼쪽, 모바일 아래)에 얹는다.
 * PC 3:1, 모바일 1:1 WebP 를 public/kv/ 에 두고, base 는 이미지 빈 자리의 평균 색이다.
 */
const CHAMPION_KV: Record<
  number,
  { desktop: string; mobile: string; base: string } | undefined
> = {
  2026: {
    desktop: '/kv/champion-2026-pc.webp',
    mobile: '/kv/champion-2026-mo.webp',
    base: '#001141',
  },
};

/** 한국시리즈 우승팀을 크게 보여 준다. KV 가 없으면 우승팀 컬러 면에 로고를 둔다. */
export function ChampionBanner({
  bracket,
  teams,
  titleAs: Title = 'h2',
}: {
  bracket: PostseasonBracket;
  teams: Team[];
  /** 페이지에 다른 h1 이 없으면 h1 으로 쓴다 */
  titleAs?: 'h1' | 'h2';
}) {
  const champion = bracket.champion;

  if (!champion) {
    return null;
  }

  const team = teams.find((item) => item.id === champion.teamId);
  const finals = bracket.rounds.find((round) => round.seriesId === '7');
  const championIsHigher = finals?.higher?.teamId === champion.teamId;
  const opponent = championIsHigher ? finals?.lower : finals?.higher;
  const championWins = championIsHigher
    ? finals?.higherWins
    : finals?.lowerWins;
  const opponentWins = championIsHigher
    ? finals?.lowerWins
    : finals?.higherWins;
  const kv = CHAMPION_KV[bracket.seasonYear];
  // 우승 기록이 이번 시즌까지 반영됐을 때만 '통산 N번째'를 붙인다.
  const titles =
    team?.championshipHistory?.lastTitleYear === bracket.seasonYear
      ? team.championshipHistory.currentTitles
      : null;
  const colorStyle = kv
    ? ({ '--champion-color': kv.base } as CSSProperties)
    : team?.primaryColor
      ? ({ '--champion-color': team.primaryColor } as CSSProperties)
      : undefined;

  return (
    <section
      aria-labelledby="champion-banner-title"
      className={kv ? 'champion-banner champion-banner--kv' : 'champion-banner'}
      style={colorStyle}
    >
      {kv ? (
        <picture className="champion-banner__kv">
          <source media="(max-width: 720px)" srcSet={kv.mobile} />
          <img alt="" fetchPriority="high" src={kv.desktop} />
        </picture>
      ) : null}
      <div className="champion-banner__copy">
        <p className="champion-banner__eyebrow">
          {bracket.seasonYear} KBO 한국시리즈 우승
        </p>
        <Title id="champion-banner-title">
          {champion.name} <span>우승을 축하합니다</span>
        </Title>
        <dl className="champion-banner__facts">
          {titles ? (
            <div>
              <dt>통산</dt>
              <dd>{titles}번째 우승</dd>
            </div>
          ) : null}
          {finals && opponent ? (
            <div>
              <dt>한국시리즈</dt>
              <dd>
                {championWins}승 {opponentWins}패{' '}
                <small>vs {opponent.shortName}</small>
              </dd>
            </div>
          ) : null}
          {champion.seed ? (
            <div>
              <dt>정규시즌</dt>
              <dd>
                {champion.seed}위
                {isIntegratedChampion(bracket) ? ' · 통합우승' : ''}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
      {kv ? null : (
        <div aria-hidden="true" className="champion-banner__mark">
          {titles ? (
            <span className="champion-banner__titles">V{titles}</span>
          ) : null}
          <img alt="" src={getTeamLogoSrc(champion)} />
        </div>
      )}
    </section>
  );
}

/* ---------- FA ---------- */

function PlayerPhoto({ freeAgent }: { freeAgent: FreeAgent }) {
  const [failed, setFailed] = useState(false);

  if (!freeAgent.profileImageUrl || failed) {
    return (
      <span aria-hidden="true" className="fa-photo fa-photo--logo">
        <img alt="" src={getTeamLogoSrc(freeAgent.previousTeam)} />
      </span>
    );
  }

  return (
    <img
      alt=""
      className="fa-photo"
      loading="lazy"
      onError={() => setFailed(true)}
      src={getPlayerProfileImageSrc(freeAgent.profileImageUrl)}
    />
  );
}

function formatShortDate(dateKey: string) {
  return formatKoreanMonthDay(`${dateKey}T12:00:00+09:00`)
    .replace('월 ', '.')
    .replace('일', '');
}

/** 미계약 / 잔류 / 이적 → 팀. 글자 배지 대신 점으로 상태를 보인다. */
function FreeAgentStatus({ freeAgent }: { freeAgent: FreeAgent }) {
  const deal = formatFreeAgentDeal(freeAgent);

  if (!freeAgent.newTeam) {
    return (
      <span className="fa-status" data-state="open">
        <i aria-hidden="true" />
        미계약
      </span>
    );
  }

  const stayed = freeAgent.newTeam.id === freeAgent.previousTeam.id;

  return (
    <span className="fa-status" data-state={stayed ? 'stayed' : 'moved'}>
      <i aria-hidden="true" />
      {stayed ? '잔류' : `${freeAgent.newTeam.shortName} 이적`}
      {deal ? <b>{deal}</b> : null}
    </span>
  );
}

/** 계약 소식 한 줄: 사진 · 이름 · 원소속 → 계약 팀 · 조건 */
function SignedRow({
  freeAgent,
  onOpen,
}: {
  freeAgent: FreeAgent;
  onOpen: (freeAgent: FreeAgent) => void;
}) {
  const newTeam = freeAgent.newTeam;
  const deal = formatFreeAgentDeal(freeAgent);
  const breakdown = formatFreeAgentBreakdown(freeAgent);

  if (!newTeam) {
    return null;
  }

  const stayed = newTeam.id === freeAgent.previousTeam.id;

  return (
    <li>
      <button
        aria-label={`${freeAgent.playerName} 기록 보기`}
        className="fa-signed"
        onClick={() => onOpen(freeAgent)}
        type="button"
      >
        <PlayerPhoto freeAgent={freeAgent} />
        <span className="fa-signed__who">
          <strong>{freeAgent.playerName}</strong>
          <small>{freeAgent.position}</small>
        </span>
        <span
          className="fa-signed__move"
          data-state={stayed ? 'stayed' : 'moved'}
        >
          <img alt="" src={getTeamLogoSrc(freeAgent.previousTeam)} />
          {stayed ? (
            <span>{newTeam.shortName} 잔류</span>
          ) : (
            <span>
              {freeAgent.previousTeam.shortName} → <b>{newTeam.shortName}</b>
            </span>
          )}
          {stayed ? null : <img alt="" src={getTeamLogoSrc(newTeam)} />}
        </span>
        <span className="fa-signed__deal">
          <strong>{deal ?? '조건 미공개'}</strong>
          {breakdown ? <small>{breakdown}</small> : null}
        </span>
        {freeAgent.signedOn ? (
          <time className="fa-signed__date" dateTime={freeAgent.signedOn}>
            {formatShortDate(freeAgent.signedOn)}
          </time>
        ) : null}
      </button>
    </li>
  );
}

/** 고른 값이면 빼고, 아니면 더한다 */
function toggle<T>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

/** 포지션 필터 순서. KBO 이동현황의 포지션 표기를 그대로 쓴다. */
const POSITION_ORDER = ['투수', '포수', '내야수', '외야수'];

/**
 * 스토브리그 FA 현황. 계약 소식(최근 순)과 원소속 팀별 명단.
 * 팀 순서는 정규시즌 최종 순위를 따른다.
 */
export function FreeAgentBoard({
  faYear,
  items,
  standings,
  hideTitle = false,
  moreHref,
}: {
  faYear: number;
  items: FreeAgent[];
  standings: TeamStandingsResponse | null;
  /** 페이지 h1 이 이미 같은 제목이면 숨긴다 */
  hideTitle?: boolean;
  /** 홈에서 FA 전용 페이지로 잇는 링크 */
  moreHref?: string;
}) {
  // 여러 개를 고를 수 있고, 아무것도 안 고르면 전체다
  const [teamFilter, setTeamFilter] = useState<number[]>([]);
  const [positionFilter, setPositionFilter] = useState<string[]>([]);
  // 선수를 누르면 KBO 기록 팝업을 연다
  const [opened, setOpened] = useState<FreeAgent | null>(null);
  // 팀을 고르면 그 팀에서 나간 선수와 들어온 선수를 함께 보여 준다
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!teamFilter.length ||
            teamFilter.includes(item.previousTeam.id) ||
            (item.newTeam != null && teamFilter.includes(item.newTeam.id))) &&
          (!positionFilter.length || positionFilter.includes(item.position)),
      ),
    [items, teamFilter, positionFilter],
  );
  const positions = useMemo(
    () =>
      POSITION_ORDER.filter((position) =>
        items.some((item) => item.position === position),
      ),
    [items],
  );
  const signed = useMemo(
    () =>
      filtered
        .filter((item) => item.newTeam)
        .sort(
          (a, b) =>
            (b.signedOn ?? '').localeCompare(a.signedOn ?? '') ||
            a.playerName.localeCompare(b.playerName, 'ko'),
        ),
    [filtered],
  );
  const byTeam = useMemo(() => {
    const rankByTeam = new Map(
      (standings?.items ?? []).map((item) => [item.teamId, item.rank]),
    );
    const groups = new Map<number, FreeAgent[]>();

    for (const item of filtered) {
      groups.set(item.previousTeam.id, [
        ...(groups.get(item.previousTeam.id) ?? []),
        item,
      ]);
    }

    return [...groups.values()]
      .map((players) =>
        players.sort(
          (a, b) =>
            Number(Boolean(a.newTeam)) - Number(Boolean(b.newTeam)) ||
            a.playerName.localeCompare(b.playerName, 'ko'),
        ),
      )
      .sort(
        (a, b) =>
          (rankByTeam.get(a[0].previousTeam.id) ?? 99) -
            (rankByTeam.get(b[0].previousTeam.id) ?? 99) ||
          a[0].previousTeam.id - b[0].previousTeam.id,
      );
  }, [filtered, standings]);
  // 필터 칩의 팀 순서도 정규시즌 순위를 따른다
  const teamChips = useMemo(() => {
    const rankByTeam = new Map(
      (standings?.items ?? []).map((item) => [item.teamId, item.rank]),
    );
    const teams = new Map<number, FreeAgentTeam>();

    for (const item of items) {
      teams.set(item.previousTeam.id, item.previousTeam);
      if (item.newTeam) teams.set(item.newTeam.id, item.newTeam);
    }

    return [...teams.values()].sort(
      (a, b) => (rankByTeam.get(a.id) ?? 99) - (rankByTeam.get(b.id) ?? 99),
    );
  }, [items, standings]);
  const allSigned = items.filter((item) => item.newTeam);
  const movedCount = allSigned.filter(
    (item) => item.newTeam?.id !== item.previousTeam.id,
  ).length;

  return (
    <section
      aria-label={hideTitle ? `${faYear} 스토브리그 FA` : undefined}
      aria-labelledby={hideTitle ? undefined : 'fa-board-title'}
      className="fa-board"
    >
      <header className="fa-board__head">
        <div>
          {hideTitle ? null : (
            <h2 id="fa-board-title">
              {moreHref ? (
                <Link href={moreHref}>
                  {faYear} 스토브리그 FA
                  <ChevronRight aria-hidden="true" size={20} />
                </Link>
              ) : (
                `${faYear} 스토브리그 FA`
              )}
            </h2>
          )}
          <p>KBO 선수 이동현황 기준 · 계약 조건은 구단 발표 기준</p>
        </div>
        <dl className="fa-board__counts">
          <div>
            <dt>FA 자격</dt>
            <dd>{items.length}명</dd>
          </div>
          <div>
            <dt>계약</dt>
            <dd>{allSigned.length}명</dd>
          </div>
          <div>
            <dt>이적</dt>
            <dd>{movedCount}명</dd>
          </div>
          <div>
            <dt>미계약</dt>
            <dd>{items.length - allSigned.length}명</dd>
          </div>
        </dl>
      </header>

      <div className="fa-filters">
        <div aria-label="팀 필터" className="fa-filters__teams" role="group">
          <button
            aria-pressed={!teamFilter.length}
            onClick={() => setTeamFilter([])}
            type="button"
          >
            전체 팀
          </button>
          {teamChips.map((team) => (
            <button
              aria-pressed={teamFilter.includes(team.id)}
              key={team.id}
              onClick={() => setTeamFilter(toggle(teamFilter, team.id))}
              type="button"
            >
              <img alt="" src={getTeamLogoSrc(team)} />
              {team.shortName}
            </button>
          ))}
        </div>
        <div
          aria-label="포지션 필터"
          className="fa-filters__positions"
          role="group"
        >
          <button
            aria-pressed={!positionFilter.length}
            onClick={() => setPositionFilter([])}
            type="button"
          >
            전체 포지션
          </button>
          {positions.map((position) => (
            <button
              aria-pressed={positionFilter.includes(position)}
              key={position}
              onClick={() =>
                setPositionFilter(toggle(positionFilter, position))
              }
              type="button"
            >
              {position}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? null : (
        <p className="fa-board__empty">조건에 맞는 FA 선수가 없어요.</p>
      )}

      {signed.length ? (
        <div className="fa-board__block">
          <h3>계약 소식</h3>
          <ul className="fa-signed-list">
            {signed.map((freeAgent) => (
              <SignedRow
                freeAgent={freeAgent}
                key={freeAgent.id}
                onOpen={setOpened}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {byTeam.length ? (
        <div className="fa-board__block">
          <h3>팀별 FA 명단</h3>
          <div className="fa-teams">
            {byTeam.map((players) => {
              const team = players[0].previousTeam;
              const teamSigned = players.filter((item) => item.newTeam).length;

              return (
                <section className="fa-team" key={team.id}>
                  <header className="fa-team__head">
                    <img alt="" src={getTeamLogoSrc(team)} />
                    <h4>{team.name}</h4>
                    <span>
                      {players.length}명
                      {teamSigned ? ` · 계약 ${teamSigned}` : ''}
                    </span>
                  </header>
                  <ul className="fa-team__list">
                    {players.map((freeAgent) => (
                      <li key={freeAgent.id}>
                        <button
                          aria-label={`${freeAgent.playerName} 기록 보기`}
                          className="fa-player"
                          onClick={() => setOpened(freeAgent)}
                          type="button"
                        >
                          <PlayerPhoto freeAgent={freeAgent} />
                          <span className="fa-player__who">
                            <strong>{freeAgent.playerName}</strong>
                            <small>{freeAgent.position}</small>
                          </span>
                          <FreeAgentStatus freeAgent={freeAgent} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}

      {opened ? (
        <FreeAgentRecordDialog
          freeAgent={opened}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </section>
  );
}

/* ---------- 시즌 결과 ---------- */

/** 포스트시즌 시리즈 결과와 정규시즌 최종 순위. 우승팀과 가을야구 진출선을 표시한다. */
export function SeasonRecap({
  bracket,
  standings,
}: {
  bracket: PostseasonBracket;
  standings: TeamStandingsResponse | null;
}) {
  const championId = bracket.champion?.teamId;
  const rounds = [...bracket.rounds]
    .filter((round) => round.higher && round.lower && round.winnerTeamId)
    .reverse();

  return (
    <section aria-labelledby="season-recap-title" className="season-recap">
      <header className="season-recap__head">
        <h2 id="season-recap-title">{bracket.seasonYear} 시즌 결과</h2>
        <Link href="/standings">
          순위 페이지
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      </header>
      <div className="season-recap__grid">
        <section className="season-recap__card">
          <h3>포스트시즌</h3>
          <ol className="season-recap__series">
            {rounds.map((round) => {
              const higherWon = round.winnerTeamId === round.higher?.teamId;
              const winner = higherWon ? round.higher : round.lower;
              const loser = higherWon ? round.lower : round.higher;
              const winnerWins = higherWon ? round.higherWins : round.lowerWins;
              const loserWins = higherWon ? round.lowerWins : round.higherWins;
              const isFinal = round.seriesId === '7';

              return (
                <li data-final={isFinal || undefined} key={round.seriesId}>
                  <span className="season-recap__round">
                    {isFinal ? (
                      <Trophy aria-hidden="true" size={14} strokeWidth={2.4} />
                    ) : null}
                    {round.name}
                  </span>
                  <span className="season-recap__matchup">
                    <span className="season-recap__team is-winner">
                      <img alt="" src={getTeamLogoSrc(winner)} />
                      {winner?.shortName}
                    </span>
                    <span className="season-recap__score">
                      <b>{winnerWins}</b>
                      <i aria-hidden="true">:</i>
                      {loserWins}
                      {round.draws ? <small> ({round.draws}무)</small> : null}
                    </span>
                    <span className="season-recap__team is-loser">
                      <img alt="" src={getTeamLogoSrc(loser)} />
                      {loser?.shortName}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        {standings?.items.length ? (
          <section className="season-recap__card">
            <h3>정규시즌 최종 순위</h3>
            <table className="season-recap__table">
              <thead>
                <tr>
                  <th scope="col">순위</th>
                  <th scope="col">팀</th>
                  <th scope="col">승</th>
                  <th scope="col">패</th>
                  <th scope="col">무</th>
                  <th scope="col">승률</th>
                  <th scope="col">게임차</th>
                </tr>
              </thead>
              <tbody>
                {standings.items.map((item) => (
                  <tr
                    data-champion={item.teamId === championId || undefined}
                    data-cutline={item.rank === 5 || undefined}
                    key={item.teamId}
                  >
                    <td className="season-recap__rank">{item.rank}</td>
                    <th scope="row">
                      <span className="season-recap__team">
                        <img
                          alt=""
                          src={getTeamLogoSrc({
                            shortName: item.teamShortName,
                          })}
                        />
                        {item.teamShortName}
                        {item.teamId === championId ? (
                          <Trophy
                            aria-label="한국시리즈 우승"
                            className="season-recap__trophy"
                            size={14}
                            strokeWidth={2.4}
                          />
                        ) : null}
                      </span>
                    </th>
                    <td>{item.wins}</td>
                    <td>{item.losses}</td>
                    <td>{item.draws}</td>
                    <td>{item.winRate.toFixed(3).replace(/^0/, '')}</td>
                    <td>{item.gamesBehind || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="season-recap__note">5위까지 가을야구 진출</p>
          </section>
        ) : null}
      </div>
    </section>
  );
}
