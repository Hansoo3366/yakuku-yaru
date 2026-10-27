import { fetchKboJson } from '../../lib/kbo-http.js';
import {
  parseKboBoxScore,
  type KboBoxScoreResponse,
  type KboScoreBoardResponse,
} from './parse-box-score.js';

const KBO_GAME_CENTER_URL =
  'https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx';
const KBO_BOX_SCORE_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetBoxScoreScroll';
const KBO_SCORE_BOARD_URL =
  'https://www.koreabaseball.com/ws/Schedule.asmx/GetScoreBoardScroll';

export type FetchKboBoxScoreInput = {
  seasonYear: number;
  /** 시리즈가 맞지 않으면 KBO 가 오류를 돌려준다 (정규시즌 0, 포스트시즌 4·3·5·7) */
  seriesId: string;
  kboGameId: string;
};

function postGameCenter<T>(url: string, input: FetchKboBoxScoreInput, label: string) {
  return fetchKboJson<T>(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: KBO_GAME_CENTER_URL,
      },
      body: new URLSearchParams({
        leId: '1',
        srId: input.seriesId,
        seasonId: String(input.seasonYear),
        gameId: input.kboGameId,
      }).toString(),
    },
    label,
  );
}

/** 박스스코어가 아직 없거나 형식이 다르면 null */
export async function fetchKboBoxScore(input: FetchKboBoxScoreInput) {
  const boxScore = await postGameCenter<KboBoxScoreResponse>(
    KBO_BOX_SCORE_URL,
    input,
    'KBO 박스스코어 API',
  );

  if (boxScore.code && boxScore.code !== '100') {
    throw new Error(`KBO 박스스코어 응답 실패: ${boxScore.msg ?? boxScore.code}`);
  }

  const scoreBoard = await postGameCenter<KboScoreBoardResponse>(
    KBO_SCORE_BOARD_URL,
    input,
    'KBO 스코어보드 API',
  );

  return parseKboBoxScore(
    boxScore,
    scoreBoard.code && scoreBoard.code !== '100' ? null : scoreBoard,
  );
}
