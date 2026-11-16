'use client';

/* eslint-disable @next/next/no-img-element */

import { useMutation } from '@tanstack/react-query';
import { ImageOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  clearAdminAttendancePhoto,
  deleteAdminAttendanceRecord,
  type AdminAttendanceRecord,
} from '@/lib/admin-api';
import { getAssetUrl } from '@/lib/api';
import { formatKoreanDateShort } from '@/lib/date-format';
import { useTeamsQuery } from '@/lib/queries';
import {
  useAdminAttendanceQuery,
  useAdminToken,
  useInvalidateAdmin,
} from '@/lib/queries/admin';
import { useAdminFeedback } from '../_components/feedback';
import {
  listState,
  PanelHeading,
  Pagination,
  paginate,
  ResultCount,
  SearchBox,
  Segmented,
  TeamName,
  Toolbar,
} from '../_components/ui';

const PAGE_SIZE = 24;

type WatchFilter = 'all' | 'stadium' | 'home';

const WATCH_LABELS: Record<string, string> = {
  stadium: '직관',
  home: '집관',
};

export function MediaTab() {
  const [keyword, setKeyword] = useState('');
  const [watchType, setWatchType] = useState<WatchFilter>('all');
  const [page, setPage] = useState(1);
  const attendanceQuery = useAdminAttendanceQuery(keyword);
  const teamsQuery = useTeamsQuery();
  const token = useAdminToken();
  const invalidate = useInvalidateAdmin();
  const { confirm, notify, notifyError } = useAdminFeedback();

  const teamColors = useMemo(
    () => new Map((teamsQuery.data?.items ?? []).map((team) => [team.shortName, team.primaryColor])),
    [teamsQuery.data],
  );

  const withPhoto = useMemo(
    () => (attendanceQuery.data?.items ?? []).filter((record) => record.photoUrl),
    [attendanceQuery.data],
  );
  const counts = {
    all: withPhoto.length,
    stadium: withPhoto.filter((record) => record.watchType === 'stadium').length,
    home: withPhoto.filter((record) => record.watchType === 'home').length,
  };
  const filtered =
    watchType === 'all' ? withPhoto : withPhoto.filter((record) => record.watchType === watchType);
  const pageData = paginate(filtered, page, PAGE_SIZE);

  const clearPhotoMutation = useMutation({
    mutationFn: (record: AdminAttendanceRecord) => clearAdminAttendancePhoto(record.id, token),
    onSuccess: () => {
      notify('사진을 내렸습니다. 직관 기록은 그대로 남아 있습니다.');
      return invalidate(['admin', 'attendance']);
    },
    onError: (error) => notifyError(error, '사진을 내리지 못했습니다.'),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (record: AdminAttendanceRecord) => deleteAdminAttendanceRecord(record.id, token),
    onSuccess: () => {
      notify('직관 기록을 삭제했습니다.');
      return invalidate(['admin', 'attendance']);
    },
    onError: (error) => notifyError(error, '직관 기록을 삭제하지 못했습니다.'),
  });

  const busyId = clearPhotoMutation.isPending
    ? clearPhotoMutation.variables?.id
    : deleteRecordMutation.isPending
      ? deleteRecordMutation.variables?.id
      : null;

  const state = listState({
    ...attendanceQuery,
    isEmpty: filtered.length === 0,
    empty: {
      title: '검수할 사진이 없습니다',
      description: keyword
        ? '닉네임, 메모, 구장 이름 일부로 다시 찾아보세요.'
        : '사용자가 직관 기록에 사진을 올리면 최신순으로 여기에 모입니다.',
    },
  });

  return (
    <section className="admin-panel">
      <PanelHeading
        description="직관 기록에 올라온 사진을 메모와 함께 확인합니다. 사진만 내리면 기록은 남습니다."
        title="직관 사진"
      />
      <Toolbar>
        <SearchBox
          label="직관 사진 검색"
          onSearch={(next) => {
            setKeyword(next);
            setPage(1);
          }}
          placeholder="닉네임, 메모, 구장"
        />
        <Segmented
          label="관람 유형"
          onChange={(value) => {
            setWatchType(value);
            setPage(1);
          }}
          options={[
            { value: 'all', label: '전체', count: counts.all },
            { value: 'stadium', label: '직관', count: counts.stadium },
            { value: 'home', label: '집관', count: counts.home },
          ]}
          value={watchType}
        />
        <ResultCount
          fetching={attendanceQuery.isFetching && !attendanceQuery.isPending}
          total={attendanceQuery.data ? filtered.length : null}
        />
      </Toolbar>

      {state ?? (
        <>
          <ul className="admin-media-grid">
            {pageData.items.map((record) => (
              <li className="admin-media-card" key={record.id}>
                <MediaImage record={record} />
                <div className="admin-media-body">
                  <p className="admin-media-match">
                    <TeamName color={teamColors.get(record.awayTeamShortName)} name={record.awayTeamShortName} />
                    <span aria-hidden="true">@</span>
                    <TeamName color={teamColors.get(record.homeTeamShortName)} name={record.homeTeamShortName} />
                    <span className="admin-media-type">{WATCH_LABELS[record.watchType] ?? record.watchType}</span>
                  </p>
                  <p className="admin-media-meta">
                    {record.stadium} · {formatKoreanDateShort(record.gameDate)}
                  </p>
                  <p className="admin-media-memo">
                    <strong>{record.authorNickname}</strong>
                    {record.memo ? ` ${record.memo}` : <span className="admin-muted"> 메모 없음</span>}
                  </p>
                </div>
                <div className="admin-media-actions">
                  <button
                    className="admin-row-btn"
                    disabled={busyId === record.id}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: '이 사진만 내릴까요?',
                          description: `${record.authorNickname}님의 직관 기록은 남기고 사진 파일만 지웁니다.`,
                          confirmLabel: '사진 내리기',
                        })
                      ) {
                        clearPhotoMutation.mutate(record);
                      }
                    }}
                    type="button"
                  >
                    사진 내리기
                  </button>
                  <button
                    className="admin-row-btn admin-row-btn--danger"
                    disabled={busyId === record.id}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: '직관 기록 전체를 삭제할까요?',
                          description: `${record.authorNickname}님의 ${record.awayTeamShortName} @ ${record.homeTeamShortName} 기록과 사진, 메모가 모두 지워지고 되돌릴 수 없습니다.`,
                          confirmLabel: '기록 삭제',
                        })
                      ) {
                        deleteRecordMutation.mutate(record);
                      }
                    }}
                    type="button"
                  >
                    기록 삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            label="직관 사진 페이지"
            onChange={setPage}
            page={pageData.page}
            totalPages={pageData.totalPages}
          />
        </>
      )}
    </section>
  );
}

function MediaImage({ record }: { record: AdminAttendanceRecord }) {
  const [failed, setFailed] = useState(false);
  const src = getAssetUrl(record.photoUrl);

  if (failed || !src) {
    return (
      <div className="admin-media-image admin-media-image--failed">
        <ImageOff aria-hidden="true" size={22} />
        <span>사진을 불러오지 못했습니다</span>
      </div>
    );
  }

  return (
    <a className="admin-media-image" href={src} rel="noreferrer" target="_blank">
      <img
        alt={`${record.authorNickname}님이 올린 직관 사진`}
        loading="lazy"
        onError={() => setFailed(true)}
        src={src}
      />
    </a>
  );
}
