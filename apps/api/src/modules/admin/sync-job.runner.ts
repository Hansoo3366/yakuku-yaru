import { syncKboGameCenter } from '../kbo-game-center/sync-game-center.js';
import { syncKboPlayers } from '../kbo-players/sync-kbo-players.js';
import { syncKboScheduleForMonth } from '../kbo-schedule/sync-schedule.js';
import { runKboSyncMode } from '../kbo-schedule/sync-modes.js';
import { generateKboSeasonProjection } from '../kbo-season-projection/generate-season-projection.js';
import { syncKboTeamRank } from '../kbo-team-rank/sync-team-rank.js';

export const ADMIN_SYNC_JOB_TYPES = [
  'schedule-today',
  'schedule-week',
  'schedule-month',
  'schedule-season',
  'game-center-today',
  'game-center-week',
  'game-center-month',
  'live',
  'standings',
  'projection',
  'players',
] as const;

export type AdminSyncJobType = (typeof ADMIN_SYNC_JOB_TYPES)[number];

export type AdminSyncJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed';

export type AdminSyncJobParams = {
  date?: string;
  year?: number;
  month?: number;
};

export type AdminSyncJob = {
  id: string;
  type: AdminSyncJobType;
  status: AdminSyncJobStatus;
  params: AdminSyncJobParams;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  summary: unknown | null;
  error: string | null;
};

const MAX_JOB_HISTORY = 20;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const jobs = new Map<string, AdminSyncJob>();
let currentJobId: string | null = null;
let running = false;

export function isAdminSyncJobType(value: unknown): value is AdminSyncJobType {
  return (
    typeof value === 'string' &&
    (ADMIN_SYNC_JOB_TYPES as readonly string[]).includes(value)
  );
}

export function parseAdminSyncJobParams(input: unknown): AdminSyncJobParams {
  if (input == null || typeof input !== 'object') {
    return {};
  }

  const body = input as Record<string, unknown>;
  const params: AdminSyncJobParams = {};

  if (body.date != null && body.date !== '') {
    if (typeof body.date !== 'string' || !DATE_RE.test(body.date)) {
      throw new Error('INVALID_DATE');
    }

    const reference = new Date(`${body.date}T12:00:00+09:00`);
    if (Number.isNaN(reference.getTime())) {
      throw new Error('INVALID_DATE');
    }

    params.date = body.date;
  }

  if (body.year != null && body.year !== '') {
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('INVALID_YEAR');
    }
    params.year = year;
  }

  if (body.month != null && body.month !== '') {
    const month = Number(body.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('INVALID_MONTH');
    }
    params.month = month;
  }

  if (params.month != null && params.year == null && params.date) {
    params.year = Number(params.date.slice(0, 4));
  }

  if (params.month != null && params.year == null) {
    throw new Error('YEAR_REQUIRED_FOR_MONTH');
  }

  return params;
}

export function getSyncJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export function getCurrentSyncJob() {
  if (currentJobId) {
    return jobs.get(currentJobId) ?? null;
  }

  let latest: AdminSyncJob | null = null;

  for (const job of jobs.values()) {
    if (!latest || job.createdAt > latest.createdAt) {
      latest = job;
    }
  }

  return latest;
}

function rememberJob(job: AdminSyncJob) {
  jobs.set(job.id, job);

  if (jobs.size <= MAX_JOB_HISTORY) {
    return;
  }

  const removable = [...jobs.values()]
    .filter((entry) => entry.id !== currentJobId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  while (jobs.size > MAX_JOB_HISTORY && removable.length > 0) {
    const oldest = removable.shift();
    if (!oldest) break;
    jobs.delete(oldest.id);
  }
}

function updateJob(jobId: string, patch: Partial<AdminSyncJob>) {
  const existing = jobs.get(jobId);
  if (!existing) return;

  const next = { ...existing, ...patch };
  jobs.set(jobId, next);
}

function resolveReference(params: AdminSyncJobParams): Date | undefined {
  if (params.date) {
    return new Date(`${params.date}T12:00:00+09:00`);
  }

  if (params.year != null && params.month != null) {
    return new Date(
      `${params.year}-${String(params.month).padStart(2, '0')}-15T12:00:00+09:00`,
    );
  }

  return undefined;
}

function toYyyymmdd(date: string) {
  return date.replace(/-/g, '');
}

function resolveYearMonth(params: AdminSyncJobParams) {
  if (params.year != null && params.month != null) {
    return { seasonYear: params.year, month: params.month };
  }

  if (params.date) {
    return {
      seasonYear: Number(params.date.slice(0, 4)),
      month: Number(params.date.slice(5, 7)),
    };
  }

  return null;
}

async function executeSyncJob(
  type: AdminSyncJobType,
  params: AdminSyncJobParams,
) {
  const reference = resolveReference(params);

  switch (type) {
    case 'schedule-today':
      return runKboSyncMode('today', {
        reference: reference ?? new Date(),
        seasonYear: params.year,
      });
    case 'schedule-week':
      return runKboSyncMode('week', {
        reference: reference ?? new Date(),
        seasonYear: params.year,
      });
    case 'schedule-month': {
      const yearMonth = resolveYearMonth(params);
      if (yearMonth) {
        return syncKboScheduleForMonth(yearMonth.seasonYear, yearMonth.month);
      }
      return runKboSyncMode('month', {
        reference: reference ?? new Date(),
        seasonYear: params.year,
      });
    }
    case 'schedule-season':
      return runKboSyncMode('season', {
        seasonYear: params.year,
        reference: reference ?? new Date(),
      });
    case 'game-center-today':
      if (params.date) {
        return syncKboGameCenter({
          mode: 'today',
          dates: [toYyyymmdd(params.date)],
        });
      }
      return syncKboGameCenter({
        mode: 'today',
        reference: reference ?? new Date(),
      });
    case 'game-center-week':
      return syncKboGameCenter({
        mode: 'week',
        reference: reference ?? new Date(),
      });
    case 'game-center-month': {
      const yearMonth = resolveYearMonth(params);
      return syncKboGameCenter({
        mode: 'month',
        reference: yearMonth
          ? new Date(
              `${yearMonth.seasonYear}-${String(yearMonth.month).padStart(2, '0')}-15T12:00:00+09:00`,
            )
          : (reference ?? new Date()),
      });
    }
    case 'live': {
      const schedule = await runKboSyncMode('today', {
        reference: reference ?? new Date(),
        seasonYear: params.year,
      });
      const gameCenter = params.date
        ? await syncKboGameCenter({
            mode: 'today',
            dates: [toYyyymmdd(params.date)],
          })
        : await syncKboGameCenter({
            mode: 'today',
            reference: reference ?? new Date(),
          });
      return { schedule, gameCenter };
    }
    case 'standings':
      return syncKboTeamRank();
    case 'projection':
      return generateKboSeasonProjection({
        seasonYear: params.year,
      });
    case 'players':
      return syncKboPlayers();
    default: {
      const exhaustive: never = type;
      throw new Error(`알 수 없는 동기화 유형: ${exhaustive}`);
    }
  }
}

async function runJob(jobId: string) {
  updateJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  try {
    const job = jobs.get(jobId);
    if (!job) {
      throw new Error('동기화 잡을 찾을 수 없습니다.');
    }

    const summary = await executeSyncJob(job.type, job.params);

    updateJob(jobId, {
      status: 'succeeded',
      finishedAt: new Date().toISOString(),
      summary,
      error: null,
    });
  } catch (error) {
    updateJob(jobId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : '동기화에 실패했습니다.',
    });
  } finally {
    running = false;
    currentJobId = null;
  }
}

export type StartSyncJobResult =
  | { ok: true; job: AdminSyncJob }
  | { ok: false; reason: 'busy'; currentJob: AdminSyncJob | null };

export function startSyncJob(
  type: AdminSyncJobType,
  params: AdminSyncJobParams = {},
): StartSyncJobResult {
  if (running || currentJobId) {
    return {
      ok: false,
      reason: 'busy',
      currentJob: currentJobId ? (jobs.get(currentJobId) ?? null) : null,
    };
  }

  const job: AdminSyncJob = {
    id: crypto.randomUUID(),
    type,
    status: 'queued',
    params,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date().toISOString(),
    summary: null,
    error: null,
  };

  running = true;
  currentJobId = job.id;
  rememberJob(job);

  void runJob(job.id);

  return { ok: true, job };
}
