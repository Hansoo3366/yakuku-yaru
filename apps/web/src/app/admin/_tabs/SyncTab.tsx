'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { useState } from 'react';
import {
  startAdminSyncJob,
  type AdminSyncJob,
  type AdminSyncJobParams,
  type AdminSyncJobType,
} from '@/lib/admin-api';
import {
  adminKeys,
  useAdminSyncJobQuery,
  useAdminToken,
} from '@/lib/queries/admin';
import { useAdminFeedback } from '../_components/feedback';
import { Chip, formatDate, PanelHeading, type ChipTone } from '../_components/ui';

export const SYNC_JOB_LABELS: Record<AdminSyncJobType, string> = {
  'schedule-today': '당일 일정·스코어',
  'schedule-week': '주간 일정',
  'schedule-month': '월간 일정',
  'schedule-season': '시즌 전체 일정',
  'game-center-today': '당일 선발·라인업',
  'game-center-week': '주간 선발·라인업',
  'game-center-month': '월간 선발·라인업',
  live: '라이브 (당일 일정 + 선발)',
  standings: '팀 순위',
  projection: '시즌 예상 순위',
  players: '선수 명단',
};

export const SYNC_STATUS_LABELS: Record<AdminSyncJob['status'], string> = {
  queued: '대기 중',
  running: '실행 중',
  succeeded: '완료',
  failed: '실패',
};

export const SYNC_STATUS_TONES: Record<AdminSyncJob['status'], ChipTone> = {
  queued: 'info',
  running: 'info',
  succeeded: 'success',
  failed: 'danger',
};

type SyncScope = 'date' | 'month' | 'year' | 'none';

const SYNC_SECTIONS: {
  id: SyncScope;
  title: string;
  description: string;
  types: AdminSyncJobType[];
}[] = [
  {
    id: 'date',
    title: '날짜 기준',
    description: '비우면 오늘(한국 시간) 기준입니다. 주간은 고른 날짜의 앞뒤 구간을 갱신합니다.',
    types: ['live', 'schedule-today', 'game-center-today', 'schedule-week', 'game-center-week'],
  },
  {
    id: 'month',
    title: '월 단위',
    description: '한 달 전체를 갱신합니다. 둘 다 비우면 이번 달입니다.',
    types: ['schedule-month', 'game-center-month'],
  },
  {
    id: 'year',
    title: '시즌 단위',
    description: '몇 분 걸릴 수 있습니다. 비우면 올해입니다.',
    types: ['schedule-season', 'projection'],
  },
  {
    id: 'none',
    title: '기간 없음',
    description: '기준일 없이 바로 실행됩니다.',
    types: ['standings', 'players'],
  },
];

export function formatSyncParams(params: AdminSyncJobParams | undefined) {
  if (!params) return '';
  const parts: string[] = [];
  if (params.date) parts.push(params.date);
  if (params.year != null) parts.push(`${params.year}년`);
  if (params.month != null) parts.push(`${params.month}월`);
  return parts.join(' ');
}

function formatDuration(job: AdminSyncJob) {
  if (!job.startedAt) return null;
  const end = job.finishedAt ? new Date(job.finishedAt) : new Date();
  const seconds = Math.max(0, Math.round((end.getTime() - new Date(job.startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}초`;
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}

export function isSyncJobActive(job: AdminSyncJob | null | undefined) {
  return job?.status === 'queued' || job?.status === 'running';
}

export function SyncTab() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const { notify, notifyError } = useAdminFeedback();
  const syncJobQuery = useAdminSyncJobQuery();
  const job = syncJobQuery.data?.job ?? null;
  const [date, setDate] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [seasonYear, setSeasonYear] = useState('');

  const startMutation = useMutation({
    mutationFn: (input: { type: AdminSyncJobType; params: AdminSyncJobParams }) =>
      startAdminSyncJob(input.type, token, input.params),
    onSuccess: (result) => {
      // 시작한 작업을 바로 보여 주고, 진행 중이므로 쿼리가 2초마다 다시 묻기 시작한다.
      queryClient.setQueryData(adminKeys.syncJob(), { job: result.job });
      const scope = formatSyncParams(result.job.params);
      notify(`${SYNC_JOB_LABELS[result.job.type]} 갱신을 시작했습니다.${scope ? ` (${scope})` : ''}`);
    },
    onError: (error) => notifyError(error, '갱신 작업을 시작하지 못했습니다.'),
  });

  const busy = startMutation.isPending || isSyncJobActive(job);

  function start(type: AdminSyncJobType, scope: SyncScope) {
    const params: AdminSyncJobParams = {};
    if (scope === 'date' && date) params.date = date;
    if (scope === 'month') {
      if (year.trim()) params.year = Number(year);
      if (month) params.month = Number(month);
      if (params.month != null && params.year == null) {
        notify('월을 고르려면 연도도 함께 입력하세요.', 'error');
        return;
      }
    }
    if (scope === 'year' && seasonYear.trim()) params.year = Number(seasonYear);
    startMutation.mutate({ params, type });
  }

  return (
    <>
      <section aria-live="polite" className="admin-panel admin-sync-current">
        <PanelHeading
          description="서버 예약 작업과 같은 함수를 지금 실행합니다. 한 번에 하나씩만 돌고, 시즌·선수 작업은 몇 분 걸릴 수 있습니다."
          title="데이터 갱신"
        />
        {syncJobQuery.isPending ? (
          <span className="skeleton" style={{ height: 72 }} />
        ) : job ? (
          <div className="admin-sync-job" data-status={job.status}>
            <div className="admin-sync-job-head">
              <Chip pulse={isSyncJobActive(job)} tone={SYNC_STATUS_TONES[job.status]}>
                {SYNC_STATUS_LABELS[job.status]}
              </Chip>
              <strong>{SYNC_JOB_LABELS[job.type]}</strong>
              <span className="admin-muted">{formatSyncParams(job.params) || '기본 범위'}</span>
            </div>
            <dl className="admin-sync-job-meta">
              <div>
                <dt>시작</dt>
                <dd>{job.startedAt ? formatDate(job.startedAt) : '대기 중'}</dd>
              </div>
              <div>
                <dt>종료</dt>
                <dd>{job.finishedAt ? formatDate(job.finishedAt) : '-'}</dd>
              </div>
              <div>
                <dt>걸린 시간</dt>
                <dd>{formatDuration(job) ?? '-'}</dd>
              </div>
            </dl>
            {job.error ? (
              <p className="form-error" role="alert">
                {job.error}
              </p>
            ) : null}
            {job.summary != null ? (
              <details className="admin-sync-summary">
                <summary>결과 자세히 보기</summary>
                <pre>{JSON.stringify(job.summary, null, 2)}</pre>
              </details>
            ) : null}
          </div>
        ) : (
          <p className="admin-sync-empty">
            서버가 켜진 뒤 실행한 작업이 없습니다. 아래에서 작업을 고르면 진행 상황이 여기에 나옵니다.
          </p>
        )}
      </section>

      <div className="admin-sync-grid">
        {SYNC_SECTIONS.map((section) => (
          <section className="admin-panel admin-sync-card" key={section.id}>
            <div className="admin-sync-card-head">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>
            {section.id === 'date' ? (
              <label className="admin-field">
                <span>기준 날짜</span>
                <input
                  className="admin-input"
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  value={date}
                />
              </label>
            ) : null}
            {section.id === 'month' ? (
              <div className="admin-field-row">
                <label className="admin-field">
                  <span>연도</span>
                  <input
                    className="admin-input admin-input--num"
                    inputMode="numeric"
                    max={2100}
                    min={2000}
                    onChange={(event) => setYear(event.target.value)}
                    placeholder="올해"
                    type="number"
                    value={year}
                  />
                </label>
                <label className="admin-field">
                  <span>월</span>
                  <select className="admin-input" onChange={(event) => setMonth(event.target.value)} value={month}>
                    <option value="">이번 달</option>
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={String(index + 1)}>
                        {index + 1}월
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            {section.id === 'year' ? (
              <label className="admin-field">
                <span>시즌</span>
                <input
                  className="admin-input admin-input--num"
                  inputMode="numeric"
                  max={2100}
                  min={2000}
                  onChange={(event) => setSeasonYear(event.target.value)}
                  placeholder="올해"
                  type="number"
                  value={seasonYear}
                />
              </label>
            ) : null}
            <div className="admin-sync-actions">
              {section.types.map((type) => (
                <button
                  className="admin-sync-btn"
                  disabled={busy}
                  key={type}
                  onClick={() => start(type, section.id)}
                  type="button"
                >
                  <Play aria-hidden="true" size={14} />
                  {SYNC_JOB_LABELS[type]}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {busy ? (
        <p className="admin-hint">작업이 끝날 때까지 다른 갱신은 시작할 수 없습니다. 이 탭을 떠나도 서버에서는 계속 실행됩니다.</p>
      ) : null}
    </>
  );
}
