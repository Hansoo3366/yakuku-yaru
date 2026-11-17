'use client';

import { useMutation } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import {
  updateAdminFreeAgent,
  type AdminFreeAgentInput,
} from '@/lib/admin-api';
import type { FreeAgent, Team } from '@/lib/baseball-api';
import {
  formatFreeAgentBreakdown,
  formatFreeAgentDeal,
  formatManwon,
} from '@/lib/fa-amount';
import { getPlayerProfileImageSrc } from '@/lib/player-image';
import { useTeamsQuery } from '@/lib/queries';
import {
  useAdminFreeAgentsQuery,
  useAdminToken,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { AdminDialog } from '../_components/AdminDialog';
import { errorMessage, useAdminFeedback } from '../_components/feedback';
import {
  Avatar,
  Chip,
  listState,
  PanelHeading,
  ResultCount,
  Segmented,
  TeamName,
  Toolbar,
} from '../_components/ui';

type StatusFilter = 'all' | 'open' | 'signed';

type FreeAgentForm = {
  contractYears: string;
  /** 금액은 억 단위로 입력받아 저장할 때 만 원으로 바꾼다 */
  incentiveAmount: string;
  newTeamId: string;
  note: string;
  salaryAmount: string;
  signedOn: string;
  signingBonus: string;
  totalAmount: string;
};

type AmountKey = 'signingBonus' | 'salaryAmount' | 'incentiveAmount';

const AMOUNT_FIELDS: { key: AmountKey; label: string }[] = [
  { key: 'signingBonus', label: '계약금' },
  { key: 'salaryAmount', label: '연봉 총액' },
  { key: 'incentiveAmount', label: '옵션·인센티브' },
];

type ContractChoice = 'open' | 'stayed' | 'moved';

/** 만 원 → 억 (입력창 표시용). 50억 → "50", 4억 5천만 → "4.5" */
function toEok(amount: number | null) {
  return amount == null ? '' : String(amount / 10000);
}

/** 억 입력값 → 만 원. 비었거나 숫자가 아니면 null */
function eokToManwon(value: string) {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 10000) : Number.NaN;
}

function toForm(freeAgent: FreeAgent): FreeAgentForm {
  return {
    contractYears: freeAgent.contractYears?.toString() ?? '',
    incentiveAmount: toEok(freeAgent.incentiveAmount),
    newTeamId: freeAgent.newTeam ? String(freeAgent.newTeam.id) : '',
    note: freeAgent.note ?? '',
    salaryAmount: toEok(freeAgent.salaryAmount),
    signedOn: freeAgent.signedOn ?? '',
    signingBonus: toEok(freeAgent.signingBonus),
    totalAmount: toEok(freeAgent.totalAmount),
  };
}

function toInput(form: FreeAgentForm): AdminFreeAgentInput {
  return {
    contractYears:
      form.contractYears.trim() === '' ? null : Number(form.contractYears),
    incentiveAmount: eokToManwon(form.incentiveAmount),
    newTeamId: form.newTeamId ? Number(form.newTeamId) : null,
    note: form.note.trim() || null,
    salaryAmount: eokToManwon(form.salaryAmount),
    signedOn: form.signedOn || null,
    signingBonus: eokToManwon(form.signingBonus),
    totalAmount: eokToManwon(form.totalAmount),
  };
}

/** 저장하면 홈에 보일 모습을 미리 그리기 위한 값 */
function toPreview(
  freeAgent: FreeAgent,
  form: FreeAgentForm,
  teams: Team[],
): FreeAgent {
  const input = toInput(form);
  const valid = (value: number | null) =>
    value != null && Number.isFinite(value) && value >= 0 ? value : null;
  const newTeam = teams.find((team) => team.id === input.newTeamId);

  return {
    ...freeAgent,
    newTeam: newTeam
      ? { id: newTeam.id, name: newTeam.name, shortName: newTeam.shortName }
      : null,
    contractYears: valid(input.contractYears),
    totalAmount: valid(input.totalAmount),
    signingBonus: valid(input.signingBonus),
    salaryAmount: valid(input.salaryAmount),
    incentiveAmount: valid(input.incentiveAmount),
  };
}

export function FreeAgentsTab() {
  const [year, setYear] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<FreeAgent | null>(null);
  const freeAgentsQuery = useAdminFreeAgentsQuery(year);
  const teamsQuery = useTeamsQuery();
  const teams = useMemo(() => teamsQuery.data?.items ?? [], [teamsQuery.data]);
  const teamColors = useMemo(
    () => new Map(teams.map((team) => [team.id, team.primaryColor])),
    [teams],
  );
  const data = freeAgentsQuery.data;
  const allItems = data?.items ?? [];
  const signedCount = allItems.filter((item) => item.newTeam).length;
  const items = allItems.filter((item) =>
    status === 'all'
      ? true
      : status === 'signed'
        ? item.newTeam
        : !item.newTeam,
  );

  const state = listState({
    ...freeAgentsQuery,
    isEmpty: !items.length,
    empty: {
      title: allItems.length
        ? '조건에 맞는 FA가 없습니다'
        : 'FA 명단이 아직 없습니다',
      description: allItems.length
        ? undefined
        : '데이터 갱신 탭에서 FA 명단·계약을 실행하세요.',
    },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="명단과 계약 팀은 매일 KBO 선수 이동현황에서 받습니다. KBO가 공개하지 않는 계약 기간과 금액은 여기서 채웁니다."
        title="FA"
      />
      <Toolbar>
        {data?.years.length ? (
          <Segmented
            label="스토브리그"
            onChange={(value) => setYear(Number(value))}
            options={data.years.map((item) => ({
              value: String(item),
              label: `${item} 겨울`,
            }))}
            value={String(data.faYear ?? '')}
          />
        ) : null}
        <Segmented
          label="계약 상태"
          onChange={setStatus}
          options={[
            { value: 'all', label: '전체', count: allItems.length },
            {
              value: 'open',
              label: '미계약',
              count: allItems.length - signedCount,
            },
            { value: 'signed', label: '계약', count: signedCount },
          ]}
          value={status}
        />
        <ResultCount
          fetching={freeAgentsQuery.isFetching && !freeAgentsQuery.isPending}
          total={items.length}
          unit="명"
        />
      </Toolbar>

      {state ?? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--free-agents">
            <thead>
              <tr>
                <th scope="col">선수</th>
                <th scope="col">원소속</th>
                <th scope="col">계약</th>
                <th scope="col">조건</th>
                <th className="is-actions" scope="col">
                  <span className="sr-only">수정</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((freeAgent) => {
                const deal = formatFreeAgentDeal(freeAgent);
                const breakdown = formatFreeAgentBreakdown(freeAgent);

                return (
                  <tr key={freeAgent.id}>
                    <td className="is-primary">
                      <span className="admin-person">
                        <Avatar
                          name={freeAgent.playerName}
                          src={
                            freeAgent.profileImageUrl
                              ? getPlayerProfileImageSrc(
                                  freeAgent.profileImageUrl,
                                )
                              : null
                          }
                        />
                        <span>
                          <strong>{freeAgent.playerName}</strong>
                          <small>{freeAgent.position}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="원소속">
                      <TeamName
                        color={teamColors.get(freeAgent.previousTeam.id)}
                        name={freeAgent.previousTeam.shortName}
                      />
                    </td>
                    <td data-label="계약">
                      {freeAgent.newTeam ? (
                        <span className="admin-fa-signed">
                          <TeamName
                            color={teamColors.get(freeAgent.newTeam.id)}
                            name={freeAgent.newTeam.shortName}
                          />
                          <small>
                            {freeAgent.newTeam.id === freeAgent.previousTeam.id
                              ? '잔류'
                              : '이적'}
                            {freeAgent.signedOn
                              ? ` · ${freeAgent.signedOn}`
                              : ''}
                          </small>
                        </span>
                      ) : (
                        <Chip tone="warning">미계약</Chip>
                      )}
                    </td>
                    <td
                      className={deal ? undefined : 'is-empty'}
                      data-label="조건"
                    >
                      {deal ? (
                        <span className="admin-fa-deal">
                          <strong>{deal}</strong>
                          {breakdown ? <small>{breakdown}</small> : null}
                        </span>
                      ) : (
                        <span className="admin-muted">
                          {freeAgent.newTeam ? '금액 미입력' : '-'}
                        </span>
                      )}
                    </td>
                    <td className="is-actions">
                      <button
                        aria-label={`${freeAgent.playerName} 계약 조건 수정`}
                        className="admin-row-btn"
                        onClick={() => setEditing(freeAgent)}
                        type="button"
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <FreeAgentEditor
          freeAgent={editing}
          key={editing.id}
          onClose={() => setEditing(null)}
          teams={teams}
        />
      ) : null}
    </section>
  );
}

function FreeAgentEditor({
  freeAgent,
  teams,
  onClose,
}: {
  freeAgent: FreeAgent;
  teams: Team[];
  onClose: () => void;
}) {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { notify, notifyError } = useAdminFeedback();
  const [form, setForm] = useState<FreeAgentForm>(() => toForm(freeAgent));
  const [formError, setFormError] = useState('');
  const previousTeamId = String(freeAgent.previousTeam.id);
  const choice: ContractChoice = !form.newTeamId
    ? 'open'
    : form.newTeamId === previousTeamId
      ? 'stayed'
      : 'moved';
  const partsSum = AMOUNT_FIELDS.reduce(
    (sum, field) => sum + (eokToManwon(form[field.key]) || 0),
    0,
  );
  const preview = toPreview(freeAgent, form, teams);
  const previewDeal = formatFreeAgentDeal(preview);
  const previewBreakdown = formatFreeAgentBreakdown(preview);

  const saveMutation = useMutation({
    mutationFn: (input: AdminFreeAgentInput) =>
      updateAdminFreeAgent(freeAgent.id, input, token),
    onSuccess: () => {
      notify(`${freeAgent.playerName} 계약 조건을 저장했습니다.`);
      onClose();
      return invalidate(['admin', 'free-agents'], ['free-agents']);
    },
    onError: (error) => {
      setFormError(errorMessage(error, '계약 조건을 저장하지 못했습니다.'));
      notifyError(error, '계약 조건을 저장하지 못했습니다.');
    },
  });

  function update<K extends keyof FreeAgentForm>(
    key: K,
    value: FreeAgentForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseContract(next: ContractChoice) {
    if (next === 'open') {
      update('newTeamId', '');
    } else if (next === 'stayed') {
      update('newTeamId', previousTeamId);
    } else if (choice !== 'moved') {
      // 이적을 고르면 원소속이 아닌 첫 팀을 먼저 골라 두고, 아래 목록에서 바꾼다
      update(
        'newTeamId',
        teams
          .find((team) => String(team.id) !== previousTeamId)
          ?.id.toString() ?? '',
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = toInput(form);
    const amounts = [
      input.totalAmount,
      input.signingBonus,
      input.salaryAmount,
      input.incentiveAmount,
    ];

    if (
      amounts.some(
        (value) => value != null && (!Number.isFinite(value) || value < 0),
      )
    ) {
      setFormError(
        '금액은 0 이상의 숫자로 입력해 주세요. 예: 4.5 = 4억 5천만 원',
      );
      return;
    }

    setFormError('');
    // 미계약이면 숨겨진 계약 칸에 남은 값은 저장하지 않는다
    saveMutation.mutate(
      input.newTeamId
        ? input
        : {
            ...input,
            signedOn: null,
            contractYears: null,
            totalAmount: null,
            signingBonus: null,
            salaryAmount: null,
            incentiveAmount: null,
          },
    );
  }

  return (
    <AdminDialog
      dismissOnBackdrop={false}
      eyebrow="FA 계약 조건"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} type="button">
            취소
          </button>
          <button
            className="btn btn-primary"
            disabled={saveMutation.isPending}
            form="admin-free-agent-form"
            type="submit"
          >
            {saveMutation.isPending ? '저장 중' : '저장'}
          </button>
        </>
      }
      onClose={onClose}
      open
      title={freeAgent.playerName}
    >
      <form
        className="fa-editor"
        id="admin-free-agent-form"
        onSubmit={handleSubmit}
      >
        <div className="fa-editor__player">
          <Avatar
            name={freeAgent.playerName}
            src={
              freeAgent.profileImageUrl
                ? getPlayerProfileImageSrc(freeAgent.profileImageUrl)
                : null
            }
          />
          <span>
            <strong>{freeAgent.playerName}</strong>
            <small>
              {freeAgent.previousTeam.name} · {freeAgent.position} · 자격 공시{' '}
              {freeAgent.qualifiedOn}
            </small>
          </span>
        </div>

        <section className="fa-editor__section">
          <h3>계약</h3>
          <div
            aria-label="계약 상태"
            className="fa-editor__choice"
            role="radiogroup"
          >
            {(
              [
                ['open', '미계약'],
                ['stayed', `${freeAgent.previousTeam.shortName} 잔류`],
                ['moved', '이적'],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-checked={choice === value}
                className={choice === value ? 'is-active' : undefined}
                key={value}
                onClick={() => chooseContract(value)}
                role="radio"
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {choice === 'moved' ? (
            <label className="admin-field">
              <span>이적한 팀</span>
              <select
                className="admin-input"
                onChange={(event) => update('newTeamId', event.target.value)}
                value={form.newTeamId}
              >
                {teams
                  .filter((team) => String(team.id) !== previousTeamId)
                  .map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          {choice !== 'open' ? (
            <div className="fa-editor__row">
              <label className="admin-field">
                <span>계약일</span>
                <input
                  className="admin-input"
                  onChange={(event) => update('signedOn', event.target.value)}
                  type="date"
                  value={form.signedOn}
                />
              </label>
              <label className="admin-field">
                <span>계약 기간</span>
                <span className="fa-editor__unit">
                  <input
                    className="admin-input admin-input--num"
                    inputMode="numeric"
                    max={20}
                    min={1}
                    onChange={(event) =>
                      update('contractYears', event.target.value)
                    }
                    placeholder="4"
                    type="number"
                    value={form.contractYears}
                  />
                  <i aria-hidden="true">년</i>
                </span>
              </label>
            </div>
          ) : null}
        </section>

        {choice !== 'open' ? (
          <section className="fa-editor__section">
            <h3>
              금액 <small>억 원 단위 · 4억 5천만 원은 4.5</small>
            </h3>
            <div className="fa-editor__money">
              {AMOUNT_FIELDS.map((field) => (
                <label className="fa-editor__money-row" key={field.key}>
                  <span>{field.label}</span>
                  <span className="fa-editor__unit">
                    <input
                      className="admin-input admin-input--num"
                      inputMode="decimal"
                      min={0}
                      onChange={(event) =>
                        update(field.key, event.target.value)
                      }
                      placeholder="0"
                      step="0.1"
                      type="number"
                      value={form[field.key]}
                    />
                    <i aria-hidden="true">억</i>
                  </span>
                </label>
              ))}
              <label className="fa-editor__money-row is-total">
                <span>총액</span>
                <span className="fa-editor__unit">
                  <input
                    className="admin-input admin-input--num"
                    inputMode="decimal"
                    min={0}
                    onChange={(event) =>
                      update('totalAmount', event.target.value)
                    }
                    placeholder={partsSum ? String(partsSum / 10000) : '0'}
                    step="0.1"
                    type="number"
                    value={form.totalAmount}
                  />
                  <i aria-hidden="true">억</i>
                </span>
              </label>
              <p className="fa-editor__hint">
                {form.totalAmount.trim()
                  ? '발표된 총액을 그대로 씁니다.'
                  : partsSum
                    ? `총액을 비우면 세 항목 합계 ${formatManwon(partsSum)} 원으로 보여요.`
                    : '발표된 항목만 채우면 됩니다.'}
              </p>
            </div>
          </section>
        ) : null}

        <label className="admin-field">
          <span>메모 (선택)</span>
          <input
            autoComplete="off"
            className="admin-input"
            maxLength={200}
            onChange={(event) => update('note', event.target.value)}
            placeholder="예: 4+2년, 보상선수 ○○○"
            value={form.note}
          />
        </label>

        <div className="fa-editor__preview">
          <span>홈에 이렇게 보여요</span>
          <strong>
            {preview.newTeam
              ? preview.newTeam.id === freeAgent.previousTeam.id
                ? `${preview.newTeam.shortName} 잔류`
                : `${freeAgent.previousTeam.shortName} → ${preview.newTeam.shortName} 이적`
              : '미계약'}
            {previewDeal ? ` · ${previewDeal}` : ''}
          </strong>
          {previewBreakdown ? <small>{previewBreakdown}</small> : null}
        </div>

        <p className="fa-editor__note">
          계약 팀·계약일은 KBO 공시가 나오면 공시 기준으로 바뀝니다.
          기간·금액·메모는 KBO가 공개하지 않아 입력한 값이 그대로 유지됩니다.
        </p>

        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>
    </AdminDialog>
  );
}
