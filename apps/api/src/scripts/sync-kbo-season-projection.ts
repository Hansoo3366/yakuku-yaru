import { runMigrations } from '../config/migrations.js';
import { generateKboSeasonProjection } from '../modules/kbo-season-projection/generate-season-projection.js';

function readNumberArg(name: string) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));

  if (!arg) {
    return undefined;
  }

  const parsed = Number(arg.slice(prefix.length));

  return Number.isFinite(parsed) ? parsed : undefined;
}

await runMigrations();

const result = await generateKboSeasonProjection({
  seasonYear: readNumberArg('seasonYear'),
  simulations: readNumberArg('simulations'),
});

if (!result.stored) {
  console.warn(
    `[kbo-projection] 저장 건너뜀 — ${result.seasonYear}시즌 (${result.reason})`,
  );
  process.exit(0);
}

console.log(
  `[kbo-projection] 완료 — ${result.seasonYear}시즌 ${result.rankDate} 기준 ${result.teamCount}팀, ${result.simulations.toLocaleString('ko-KR')}회 (snapshot=${result.snapshotId})`,
);

process.exit(0);
