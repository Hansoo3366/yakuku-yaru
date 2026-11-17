'use client';

/* eslint-disable @next/next/no-img-element */

import './FreeAgentRecordDialog.css';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PlayerPhoto } from '@/components/PlayerPhoto';
import type { FreeAgent, PlayerRecord, RecordTable } from '@/lib/baseball-api';
import {
  formatFreeAgentBreakdown,
  formatFreeAgentDeal,
  formatManwon,
} from '@/lib/fa-amount';
import { getKoreaDateString } from '@/lib/date-format';
import { useFreeAgentRecordQuery } from '@/lib/queries';
import { getTeamLogoSrc } from '@/lib/team-logo';

type Tab = 'season' | 'career' | 'recent';

/** 올시즌 맨 위에 크게 보여 줄 기록 */
const KEY_STATS: Record<PlayerRecord['role'], string[]> = {
  hitter: ['AVG', 'HR', 'RBI', 'OPS', 'H', 'SB'],
  pitcher: ['ERA', 'W', 'L', 'IP', 'SO', 'WHIP'],
};

/** 선수 정보 중 보여 줄 항목. 이름·포지션은 머리에 이미 있다. */
const PROFILE_LABELS = [
  '생년월일',
  '신장/체중',
  '연봉',
  '입단 계약금',
  '경력',
  '지명순위',
];

/** "50000만원" → "5억 원" */
function formatProfileValue(value: string) {
  const amount = value.match(/^([\d,]+)만원$/)?.[1];
  return amount
    ? `${formatManwon(Number(amount.replace(/,/g, '')))} 원`
    : value;
}

/** KBO 경력은 지금 팀 직전까지만 적는다. 끝에 지금 팀을 붙인다. */
function withCurrentTeam(career: string, teamName: string) {
  return career.split('-').at(-1) === teamName
    ? career
    : `${career}-${teamName}`;
}

function getCell(table: RecordTable | null, key: string, rowIndex = 0) {
  const index = table?.columns.findIndex((column) => column.key === key) ?? -1;
  return index >= 0 ? (table?.rows[rowIndex]?.[index] ?? null) : null;
}

/** 통산 표에서 가장 최근 연도. 올시즌 제목에 쓴다. */
function latestYear(career: RecordTable | null) {
  return (career?.rows ?? [])
    .map((row) => Number(row[0]))
    .filter(Number.isFinite)
    .reduce<number | null>(
      (max, year) => (max === null || year > max ? year : max),
      null,
    );
}

function describeStatus(freeAgent: FreeAgent) {
  if (!freeAgent.newTeam) return 'FA 미계약';

  const deal = formatFreeAgentDeal(freeAgent);
  const move =
    freeAgent.newTeam.id === freeAgent.previousTeam.id
      ? `${freeAgent.newTeam.shortName} 잔류`
      : `${freeAgent.previousTeam.shortName} → ${freeAgent.newTeam.shortName} 이적`;

  return deal ? `${move} · ${deal}` : move;
}

/** KBO 표를 그대로 그린다. 열이 많아 가로로 넘기고, 첫 열은 고정한다. */
function RecordTableView({
  table,
  caption,
}: {
  table: RecordTable;
  caption: string;
}) {
  const totalSpan = table.total
    ? table.columns.length - table.total.length + 1
    : 1;

  return (
    <div className="fa-record-table-wrap">
      <table className="fa-record-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {table.columns.map((column, index) => (
              <th
                key={`${column.key}-${index}`}
                scope="col"
                title={column.label}
              >
                {column.label === column.key ? column.key : column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={index}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
        {table.total ? (
          <tfoot>
            <tr>
              <th colSpan={totalSpan} scope="row">
                {table.total[0]}
              </th>
              {table.total.slice(1).map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function SeasonPanel({ record }: { record: PlayerRecord }) {
  const season = record.season;
  const year = latestYear(record.career);

  if (!season) {
    return (
      <p className="fa-record-empty">
        {year ? `${year} 정규시즌` : '올시즌'} 1군 기록이 없어요.
      </p>
    );
  }

  const tiles = KEY_STATS[record.role]
    .map((key) => ({
      key,
      label: season.columns.find((column) => column.key === key)?.label ?? key,
      value: getCell(season, key),
    }))
    .filter((tile) => tile.value !== null);

  return (
    <div className="fa-record-panel">
      <dl className="fa-record-tiles">
        {tiles.map((tile) => (
          <div key={tile.key}>
            <dt>{tile.label}</dt>
            <dd>{tile.value}</dd>
          </div>
        ))}
      </dl>
      <RecordTableView caption={`${year ?? ''} 정규시즌 기록`} table={season} />
      {record.rankings?.rows.length ? (
        <section className="fa-record-rankings">
          <h4>주요 기록 순위</h4>
          <ul>
            {record.rankings.rows.slice(0, 8).map((row, index) => (
              <li key={index}>
                <span>{row[0]}</span>
                <strong>
                  {row[1]} {row[2]}
                </strong>
                <b>{row[3]}위</b>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function FreeAgentRecordDialog({
  freeAgent,
  onClose,
}: {
  freeAgent: FreeAgent;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('season');
  const recordQuery = useFreeAgentRecordQuery(freeAgent.id);
  const record = recordQuery.data?.record ?? null;
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const team = freeAgent.newTeam ?? freeAgent.previousTeam;
  const breakdown = formatFreeAgentBreakdown(freeAgent);
  const year = latestYear(record?.career ?? null);
  const profile = (record?.profile ?? []).filter((item) =>
    PROFILE_LABELS.includes(item.label),
  );
  const backNumber = record?.profile.find(
    (item) => item.label === '등번호',
  )?.value;
  const handedness = record?.profile
    .find((item) => item.label === '포지션')
    ?.value.match(/\(([^)]+)\)/)?.[1];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 응원가 팝업과 같은 방식: 열리면 닫기 버튼에 초점, Esc 로 닫기, Tab 은 팝업 안에서만 돈다
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      aria-labelledby="fa-record-title"
      aria-modal="true"
      className="fa-record-backdrop"
      onClick={() => onCloseRef.current()}
      role="dialog"
    >
      <section
        className="fa-record"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
      >
        <header className="fa-record__head">
          <PlayerPhoto
            className="fa-record__photo"
            height={88}
            profileImageUrl={freeAgent.profileImageUrl}
            width={88}
          />
          <div className="fa-record__identity">
            <span className="fa-record__team">
              <img alt="" src={getTeamLogoSrc(team)} />
              {team.name}
              {backNumber ? ` · ${backNumber}` : ''}
            </span>
            <h2 id="fa-record-title">{freeAgent.playerName}</h2>
            <p>
              {freeAgent.position}
              {handedness ? ` · ${handedness}` : ''}
            </p>
            <p
              className="fa-record__status"
              data-signed={Boolean(freeAgent.newTeam) || undefined}
            >
              {describeStatus(freeAgent)}
              {breakdown ? <small>{breakdown}</small> : null}
            </p>
          </div>
          <button
            aria-label="선수 기록 닫기"
            className="fa-record__close"
            onClick={() => onCloseRef.current()}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="fa-record__scroll">
          {profile.length ? (
            <dl className="fa-record-profile">
              {profile.map((item) => (
                <div key={item.label}>
                  <dt>
                    {item.label === '연봉' && year
                      ? `${year} 연봉`
                      : item.label}
                  </dt>
                  <dd>
                    {item.label === '경력'
                      ? withCurrentTeam(item.value, team.shortName)
                      : formatProfileValue(item.value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {recordQuery.isPending ? (
            <p className="fa-record-empty">KBO 기록을 불러오고 있어요.</p>
          ) : !record ? (
            <p className="fa-record-empty">
              KBO 선수 기록과 아직 연결되지 않았어요.
            </p>
          ) : (
            <>
              <div
                aria-label="기록 보기"
                className="fa-record-tabs"
                role="tablist"
              >
                {(
                  [
                    ['season', year ? `${year} 시즌` : '올시즌'],
                    ['career', '통산'],
                    ['recent', '최근 10경기'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-selected={tab === value}
                    key={value}
                    onClick={() => setTab(value)}
                    role="tab"
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div role="tabpanel">
                {tab === 'season' ? <SeasonPanel record={record} /> : null}
                {tab === 'career' ? (
                  record.career ? (
                    <RecordTableView
                      caption="연도별 정규시즌 기록과 통산"
                      table={record.career}
                    />
                  ) : (
                    <p className="fa-record-empty">통산 기록이 없어요.</p>
                  )
                ) : null}
                {tab === 'recent' ? (
                  record.recent ? (
                    <RecordTableView
                      caption="최근 10경기 기록"
                      table={record.recent}
                    />
                  ) : (
                    <p className="fa-record-empty">최근 경기 기록이 없어요.</p>
                  )
                ) : null}
              </div>
            </>
          )}

          <p className="fa-record-source">
            KBO 기록 기준 · 정규시즌
            {recordQuery.data?.syncedAt
              ? ` · ${getKoreaDateString(recordQuery.data.syncedAt)} 갱신`
              : ''}
          </p>
        </div>
      </section>
    </div>
  );
}
