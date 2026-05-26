'use client';

/* eslint-disable @next/next/no-img-element */

import type { Game } from '@/lib/baseball-api';
import { getTeamLogoSrc } from '@/lib/team-logo';

type Props = {
  game: Game;
  value: number | null;
  onChange: (teamId: number) => void;
};

export function CheeredTeamPicker({ game, value, onChange }: Props) {
  const teams = [game.awayTeam, game.homeTeam];

  return (
    <section className="card stack">
      <div className="section-heading" style={{ marginBottom: 0 }}>
        <div>
          <h2>이날 응원한 팀</h2>
          <p>내 응원팀이 없는 경기예요. 그날 응원한 팀을 골라주세요.</p>
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
