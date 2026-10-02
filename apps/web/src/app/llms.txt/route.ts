import { getAbsoluteUrl, getSiteUrl } from '@/lib/site-url';

/**
 * AI 에이전트·LLM 크롤러를 위한 사이트 안내 (https://llmstxt.org 형식).
 * 어떤 페이지에 무엇이 있는지, 데이터를 구조화된 형태로 받으려면 어디를 보면 되는지 알려 준다.
 */
export const dynamic = 'force-static';

function buildLlmsText() {
  const link = (path: string) => getAbsoluteUrl(path);
  // 예시 주소에 쓰는 연도. 빌드 시점의 시즌으로 채운다.
  const year = new Date().getFullYear();

  return `# 야크크 야르 (Yakuku Yaru)

> KBO 프로야구 팬을 위한 비공식 서비스입니다. 경기 일정과 결과, 팀 순위, 시즌 예상 순위(가을야구 확률), 선발 투수와 라인업, 선수·팀 응원가, 구장별 팬 메모, 직관 후기 게시판을 제공합니다. 모든 시각은 한국 시간(KST) 기준입니다.

KBO 및 각 구단과 제휴 관계가 없는 개인 프로젝트입니다. 경기 데이터는 KBO 공개 웹 데이터를 주기적으로 동기화한 것이라 실제와 몇 분에서 몇 시간 차이가 날 수 있습니다. 시즌 예상 순위는 현재 승률과 피타고리안 승률을 섞은 전력으로 남은 일정을 10만 번 시뮬레이션한 추정치이며 공식 기록이 아닙니다.

## 주요 페이지

- [홈](${link('/')}): 오늘 또는 다음 경기 일정, KBO 팀 순위표, 시즌 예상 순위와 가을야구 진출 확률
- [팀 순위](${link('/standings')}): KBO 팀 순위표와 시즌 예상 순위
- [월별 일정·결과](${link(`/schedule/${year}-04`)}): \`/schedule/YYYY-MM\` 형식. 그 달 전체 경기의 시간, 대진, 스코어, 구장, 선발 투수
- [리그 현황 요약(텍스트)](${link('/llms-full.txt')}): 현재 순위, 최근 일주일 결과, 앞으로 일주일 일정을 마크다운 한 파일로
- [야구 캘린더](${link('/calendar')}): 월간·주간 KBO 전체 경기 일정과 결과, 선발 투수
- [경기 상세](${link('/games/1')}): \`/games/{id}\` 형식. 스코어, 구장, 선발 투수 기록, 라인업, 예매 정보. 페이지마다 schema.org SportsEvent 구조화 데이터가 들어 있습니다
- [응원가](${link('/cheers')}): 팀별·선수별 응원가와 등장곡 목록
- [선수 응원가](${link('/cheers/1')}): \`/cheers/{playerId}\` 형식. 선수 한 명의 응원가 가사와 영상. 전체 주소는 사이트맵에 있습니다
- [구장 정보](${link('/stadiums')}): 구장별 맛집·주차·교통 팬 메모
- [팬 라운지](${link('/posts')}): 직관 후기, 구장 정보, 자유 게시글

## 데이터 API

로그인 없이 읽을 수 있는 JSON API 입니다. 전체 명세는 OpenAPI 문서를 참고하세요.

- [API 문서 (Swagger UI)](${link('/api-docs/')})
- [OpenAPI 명세 (JSON)](${link('/api-docs.json')})
- [팀 목록](${link('/api/teams')})
- [팀 순위](${link('/api/teams/standings')}): \`?seasonYear=${year}\`
- [시즌 예상 순위](${link('/api/teams/season-projection')}): \`?seasonYear=${year}\`
- [경기 목록](${link('/api/games?from=${year}-04-01&to=${year}-05-01')}): \`from\`, \`to\` 는 YYYY-MM-DD, \`teamId\` 로 팀 필터
- [경기 상세](${link('/api/games/1')}): \`/api/games/{id}\`
- [선수 응원가](${link('/api/player-cheers?page=1&size=24&rosterScope=all')}): 선수별 응원가 제목, 가사(\`lyrics\`), 유튜브 영상 id. \`teamId\`, \`keyword\`, \`onlyWithCheer=true\` 로 필터, \`page\` 로 다음 쪽
- [선수 응원가 한 건](${link('/api/player-cheers/1')}): \`/api/player-cheers/{playerId}\`
- [팀 응원가](${link('/api/player-cheers/teams')})
- [구장 목록](${link('/api/stadiums')})
- [게시글 목록](${link('/api/posts?page=1&size=10')})

## 그 밖에

- [사이트맵](${link('/sitemap.xml')}): 모든 공개 페이지와 경기 상세 주소
- [이용약관](${link('/terms')})
- [개인정보 처리방침](${link('/privacy')})
- [커뮤니티 운영정책](${link('/community-guidelines')})

로그인이 필요한 영역(\`/me\`, \`/attendance\`, \`/admin\`)은 개인 기록이라 수집 대상이 아닙니다. 사이트 주소: ${getSiteUrl()}
`;
}

export function GET() {
  return new Response(buildLlmsText(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
