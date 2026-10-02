import type {
  Game,
  SeasonProjectionResponse,
  Team,
  TeamStandingsResponse,
} from '@/lib/baseball-api';
import type {
  PlayerCheer,
  PlayerCheerListResponse,
} from '@/lib/player-cheer-api';
import { getKoreaDateString } from '@/lib/date-format';
import type { PostListItem, PostListResponse } from '@/lib/post-api';
import type { StadiumSummary } from '@/lib/stadium-note-api';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
).replace(/\/+$/, '');

/** 로그인 없이 볼 수 있는 API 를 서버에서 호출한다. 실패하면 null 을 돌려주고 화면은 클라이언트 조회로 넘어간다. */
export async function requestPublic<T>(path: string, revalidate = 60 * 60) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * 경기 한 건을 받는다. 없는 경기(404)와 일시적인 실패를 구분해서 돌려준다.
 * 없는 경기는 페이지가 404 로 응답해야 하고, 일시적인 실패는 클라이언트 조회로 넘겨야 하기 때문이다.
 */
export async function fetchPublicGameResult(
  gameId: number,
): Promise<{ game: Game | null; missing: boolean }> {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 * 5 },
    });

    if (response.status === 404) {
      return { game: null, missing: true };
    }

    if (!response.ok) {
      return { game: null, missing: false };
    }

    const body = (await response.json()) as { game: Game };

    return { game: body.game ?? null, missing: false };
  } catch {
    return { game: null, missing: false };
  }
}

export async function fetchPublicGame(gameId: number) {
  return (await fetchPublicGameResult(gameId)).game;
}

export async function listPublicSeasonGames(seasonYear: number) {
  const params = new URLSearchParams({
    from: `${seasonYear}-03-01`,
    to: `${seasonYear + 1}-01-01`,
  });
  const response = await requestPublic<{ items: Game[] }>(
    `/games?${params.toString()}`,
  );

  return response?.items ?? [];
}

/**
 * 아래 함수들은 서버 컴포넌트가 첫 HTML 에 실제 데이터를 담기 위해 쓴다.
 * JS 를 실행하지 않는 크롤러(검색·AI)도 순위와 일정을 읽을 수 있게 하고,
 * 같은 값을 클라이언트 쿼리의 initialData 로 넘겨 첫 화면의 로딩 상태를 없앤다.
 */
export function getKoreaSeasonYear(base = new Date()) {
  return Number(getKoreaDateString(base).slice(0, 4));
}

export function listPublicTeams() {
  return requestPublic<{ items: Team[] }>('/teams', 60 * 60);
}

export function fetchPublicStandings(seasonYear: number) {
  return requestPublic<TeamStandingsResponse>(
    `/teams/standings?seasonYear=${seasonYear}`,
    60 * 10,
  );
}

export function fetchPublicSeasonProjection(seasonYear: number) {
  return requestPublic<SeasonProjectionResponse>(
    `/teams/season-projection?seasonYear=${seasonYear}`,
    60 * 10,
  );
}

export async function listPublicGames(
  input: { from: string; to: string },
  revalidate = 60 * 5,
) {
  const params = new URLSearchParams(input);
  const response = await requestPublic<{ items: Game[] }>(
    `/games?${params.toString()}`,
    revalidate,
  );

  return response?.items ?? null;
}

/** 선수 한 명의 응원가. 없는 선수(404)와 일시적인 실패를 구분한다. */
export async function fetchPublicPlayerCheerResult(
  playerId: number,
): Promise<{ item: PlayerCheer | null; missing: boolean }> {
  try {
    const response = await fetch(`${API_URL}/player-cheers/${playerId}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 * 10 },
    });

    if (response.status === 404) {
      return { item: null, missing: true };
    }

    if (!response.ok) {
      return { item: null, missing: false };
    }

    const body = (await response.json()) as { item: PlayerCheer };

    return { item: body.item ?? null, missing: false };
  } catch {
    return { item: null, missing: false };
  }
}

/** 응원가가 등록된 선수 전체. 사이트맵에 선수별 응원가 주소를 넣는 데 쓴다. */
export async function listPublicPlayersWithCheer() {
  const size = 100; // API 가 허용하는 최대 쪽 크기
  const players: PlayerCheer[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const response = await requestPublic<PlayerCheerListResponse>(
      `/player-cheers?page=${page}&size=${size}&rosterScope=all&onlyWithCheer=true`,
      60 * 60,
    );

    if (!response) {
      break;
    }

    players.push(...response.items);

    if (page >= response.pagination.totalPages) {
      break;
    }
  }

  return players;
}

/** 공개 게시글 전체(최신순). 사이트맵에 글 주소를 넣는 데 쓴다. */
export async function listPublicPosts() {
  const size = 50; // API 가 허용하는 최대 쪽 크기
  const posts: PostListItem[] = [];

  for (let page = 1; page <= 40; page += 1) {
    const response = await requestPublic<PostListResponse>(
      `/posts?page=${page}&size=${size}`,
      60 * 30,
    );

    if (!response) {
      break;
    }

    posts.push(...response.items);

    if (page >= response.totalPages) {
      break;
    }
  }

  return posts;
}

export async function listPublicStadiums() {
  const response = await requestPublic<{ items: StadiumSummary[] }>(
    '/stadiums',
    60 * 30,
  );

  return response?.items ?? [];
}

/** 'YYYY-MM' 한 달의 조회 범위. to 는 다음 달 1일(포함하지 않음)이다. */
export function getMonthRangeOf(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const pad = (value: number) => String(value).padStart(2, '0');
  const next =
    monthNumber === 12
      ? { year: year + 1, month: 1 }
      : { year, month: monthNumber + 1 };
  const previous =
    monthNumber === 1
      ? { year: year - 1, month: 12 }
      : { year, month: monthNumber - 1 };

  return {
    from: `${year}-${pad(monthNumber)}-01`,
    to: `${next.year}-${pad(next.month)}-01`,
    nextMonth: `${next.year}-${pad(next.month)}`,
    previousMonth: `${previous.year}-${pad(previous.month)}`,
  };
}
