'use client';

/* eslint-disable @next/next/no-img-element */

import type { Game } from '@/lib/baseball-api';
import { isTeamInGame } from '@/lib/attendance-game';
import { getTeamLogoSrc } from '@/lib/team-logo';

type Props = {
  game: Game;
  favoriteTeamId: number | null;
  favoriteTeamShortName?: string | null;
  value: number | null;
  onChange: (teamId: number) => void;
};

function getDescription(
  game: Game,
  favoriteTeamId: number | null,
  favoriteTeamShortName?: string | null,
) {
  if (!favoriteTeamId && !favoriteTeamShortName?.trim()) {
    return '프로필에 응원팀을 설정하면 내 팀 경기는 자동으로 잡혀요. 지금은 그날 응원한 팀을 골라주세요.';
  }

  if (!isTeamInGame(game, favoriteTeamId) && favoriteTeamShortName) {
    const inGame =
      game.homeTeam.shortName === favoriteTeamShortName.trim() ||
      game.awayTeam.shortName === favoriteTeamShortName.trim();

    if (inGame) {
      return '응원팀 정보를 다시 불러오는 중이에요. 그날 응원한 팀을 골라주세요.';
    }
  }

  if (
    favoriteTeamId &&
    !isTeamInGame(game, favoriteTeamId) &&
    !favoriteTeamShortName?.trim()
  ) {
    return '내 응원팀이 뛰지 않는 경기예요. 그날 응원한 팀을 골라주세요.';
  }

  if (
    favoriteTeamShortName &&
    game.homeTeam.shortName !== favoriteTeamShortName.trim() &&
    game.awayTeam.shortName !== favoriteTeamShortName.trim()
  ) {
    return '내 응원팀이 뛰지 않는 경기예요. 그날 응원한 팀을 골라주세요.';
  }

  return '그날 응원한 팀을 골라주세요.';
}

export function CheeredTeamPicker({
  game,
  favoriteTeamId,
  favoriteTeamShortName = null,
  value,
  onChange,
}: Props) {
  const teams = [game.awayTeam, game.homeTeam];

  return (
    <section className="card stack">
      <div className="section-heading" style={{ marginBottom: 0 }}>
        <div>
          <h2>이날 응원한 팀</h2>
          <p>{getDescription(game, favoriteTeamId, favoriteTeamShortName)}</p>
        </div>
      </div>
      <div className="choice-group cheered-team-picker" role="radiogroup" aria-label="응원 팀">
        {teams.map((team) => (
          <button
            aria-checked={value === team.id}
            className={`choice-button cheered-team-option${
              value === team.id ? ' is-selected' : ''
            }`}
            key={team.id}
            onClick={() => onChange(team.id)}
            role="radio"
            type="button"
          >
            <img alt="" src={getTeamLogoSrc(team)} />
            <span>{team.shortName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
