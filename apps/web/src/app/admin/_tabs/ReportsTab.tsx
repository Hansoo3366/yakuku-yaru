'use client';

import { useMutation } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { updateAdminReport, type AdminReport } from '@/lib/admin-api';
import { josa } from '@/lib/josa';
import {
  useAdminReportsQuery,
  useAdminToken,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { AdminDialog } from '../_components/AdminDialog';
import { useAdminFeedback } from '../_components/feedback';
import {
  Chip,
  DetailItem,
  DetailList,
  formatDate,
  listState,
  PanelHeading,
  Pagination,
  paginate,
  Segmented,
  Toolbar,
  type ChipTone,
} from '../_components/ui';

const PAGE_SIZE = 20;

type ReportStatus = AdminReport['status'];
type StatusFilter = 'all' | ReportStatus;

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '처리 대기',
  reviewing: '확인 중',
  resolved: '조치 완료',
  dismissed: '문제 없음',
};

export const REPORT_STATUS_TONES: Record<ReportStatus, ChipTone> = {
  pending: 'danger',
  reviewing: 'warning',
  resolved: 'success',
  dismissed: 'neutral',
};

export const REPORT_TARGET_LABELS: Record<AdminReport['targetType'], string> = {
  post: '게시글',
  comment: '댓글',
  user: '사용자',
  attendance: '직관 기록',
};

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: '스팸·도배',
  abuse: '욕설·괴롭힘',
  privacy: '개인정보 노출',
  copyright: '저작권 침해',
  illegal: '불법 콘텐츠',
  other: '기타',
};

export function reportReasonLabel(reason: string) {
  return REPORT_REASON_LABELS[reason] ?? reason;
}

export function reportTargetHref(report: AdminReport) {
  if (report.targetType === 'post') return `/posts/${report.targetId}`;
  if (report.targetType === 'user') return `/fans/${report.targetId}`;
  return null;
}

const STATUS_ORDER: ReportStatus[] = ['pending', 'reviewing', 'resolved', 'dismissed'];

export function ReportsTab() {
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const reportsQuery = useAdminReportsQuery();
  const reports = reportsQuery.data?.items ?? [];
  const filtered = status === 'all' ? reports : reports.filter((report) => report.status === status);
  const pageData = paginate(filtered, page, PAGE_SIZE);
  const selectedReport = reports.find((report) => report.id === selectedId) ?? null;

  const countOf = (value: ReportStatus) => reports.filter((report) => report.status === value).length;

  const state = listState({
    ...reportsQuery,
    isEmpty: filtered.length === 0,
    empty:
      status === 'pending'
        ? { title: '처리할 신고가 없습니다', description: '새 신고가 들어오면 여기와 상단 탭에 숫자로 표시됩니다.' }
        : { title: '이 상태의 신고가 없습니다' },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="신고된 원문을 확인하고 처리 결과와 메모를 남깁니다."
        title="신고 처리"
      />
      <Toolbar>
        <Segmented
          label="처리 상태"
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            ...STATUS_ORDER.map((value) => ({
              value,
              label: REPORT_STATUS_LABELS[value],
              count: reportsQuery.data ? countOf(value) : undefined,
              tone: value === 'pending' ? ('danger' as const) : undefined,
            })),
            { value: 'all' as const, label: '전체', count: reportsQuery.data ? reports.length : undefined },
          ]}
          value={status}
        />
      </Toolbar>

      {state ?? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">신고 대상</th>
                  <th scope="col">사유</th>
                  <th scope="col">상태</th>
                  <th scope="col">신고자</th>
                  <th scope="col">접수</th>
                  <th className="is-actions" scope="col">
                    <span className="sr-only">처리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.items.map((report) => (
                  <tr key={report.id}>
                    <td className="is-primary">
                      <span className="admin-target">
                        <small>
                          {REPORT_TARGET_LABELS[report.targetType]} #{report.targetId}
                        </small>
                        <strong>{report.targetLabel ?? '삭제된 콘텐츠'}</strong>
                      </span>
                    </td>
                    <td className="is-wide" data-label="사유">
                      <strong className="admin-reason">{reportReasonLabel(report.reason)}</strong>
                      {report.detail ? <small className="admin-excerpt">{report.detail}</small> : null}
                    </td>
                    <td data-label="상태">
                      <Chip tone={REPORT_STATUS_TONES[report.status]}>{REPORT_STATUS_LABELS[report.status]}</Chip>
                    </td>
                    <td data-label="신고자">{report.reporterNickname}</td>
                    <td className="is-date" data-label="접수">
                      <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                    </td>
                    <td className="is-actions">
                      <button
                        className={`admin-row-btn${report.status === 'pending' ? ' admin-row-btn--primary' : ''}`}
                        onClick={() => setSelectedId(report.id)}
                        type="button"
                      >
                        {report.status === 'pending' || report.status === 'reviewing' ? '처리' : '보기'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="신고 페이지"
            onChange={setPage}
            page={pageData.page}
            totalPages={pageData.totalPages}
          />
        </>
      )}

      {selectedReport ? (
        <ReportSheet key={selectedReport.id} onClose={() => setSelectedId(null)} report={selectedReport} />
      ) : null}
    </section>
  );
}

function ReportSheet({ report, onClose }: { report: AdminReport; onClose: () => void }) {
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { notify, notifyError } = useAdminFeedback();
  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [note, setNote] = useState(report.adminNote ?? '');
  const href = reportTargetHref(report);
  const dirty = status !== report.status || note.trim() !== (report.adminNote ?? '');

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminReport(report.id, { adminNote: note.trim() || null, status }, token),
    onSuccess: () => {
      notify(`신고 상태를 ${josa(REPORT_STATUS_LABELS[status], '으로')} 바꿨습니다.`);
      onClose();
      return invalidate(['admin', 'reports']);
    },
    onError: (error) => notifyError(error, '신고 처리 결과를 저장하지 못했습니다.'),
  });

  return (
    <AdminDialog
      dismissOnBackdrop={!dirty}
      eyebrow={`신고 #${report.id}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} type="button">
            닫기
          </button>
          <button
            className="btn btn-primary"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            type="button"
          >
            {saveMutation.isPending ? '저장 중' : '처리 결과 저장'}
          </button>
        </>
      }
      onClose={onClose}
      open
      title={report.targetLabel ?? '삭제된 콘텐츠'}
    >
      <DetailList>
        <DetailItem label="대상">
          {REPORT_TARGET_LABELS[report.targetType]} #{report.targetId}
        </DetailItem>
        <DetailItem label="신고자">{report.reporterNickname}</DetailItem>
        <DetailItem label="접수">{formatDate(report.createdAt)}</DetailItem>
        {report.resolverNickname ? (
          <DetailItem label="처리자">{report.resolverNickname}</DetailItem>
        ) : null}
      </DetailList>

      <div className="admin-field-block">
        <span className="admin-field-label">사유</span>
        <strong>{reportReasonLabel(report.reason)}</strong>
        <blockquote className="admin-quote">{report.detail || '상세 내용 없이 접수되었습니다.'}</blockquote>
        {href ? (
          <Link className="admin-link" href={href}>
            신고된 {REPORT_TARGET_LABELS[report.targetType]} 보기
            <ExternalLink aria-hidden="true" size={14} />
          </Link>
        ) : null}
      </div>

      <div className="admin-field-block">
        <span className="admin-field-label" id={`report-status-${report.id}`}>
          처리 상태
        </span>
        <div
          aria-labelledby={`report-status-${report.id}`}
          className="admin-segmented admin-segmented--full"
          role="radiogroup"
        >
          {STATUS_ORDER.map((value) => (
            <button
              aria-checked={status === value}
              className={status === value ? 'is-active' : ''}
              key={value}
              onClick={() => setStatus(value)}
              role="radio"
              type="button"
            >
              {REPORT_STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <label className="admin-field-block">
        <span className="admin-field-label">관리자 메모</span>
        <textarea
          className="admin-input admin-textarea"
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder="어떤 조치를 했는지 남겨 두면 다음에 같은 신고를 볼 때 도움이 됩니다."
          rows={4}
          value={note}
        />
      </label>
    </AdminDialog>
  );
}
