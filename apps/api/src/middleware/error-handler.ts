import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { notifyError } from '../lib/error-alert.js';
import { HttpError } from '../utils/http-error.js';

/**
 * 클라이언트가 응답을 받다 말고 연결을 끊었을 때 Node/Express 가 내는 오류.
 * 페이지를 떠나거나 이미지 로딩을 취소한 것이라 서버 잘못이 아니므로 알리지 않는다.
 */
const CLIENT_ABORT_CODES = new Set(['ECONNABORTED', 'ECONNRESET', 'EPIPE']);

function isClientAbort(
  error: unknown,
  req: Parameters<ErrorRequestHandler>[1],
) {
  if (req.aborted) return true;

  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    CLIENT_ABORT_CODES.has(error.code)
  );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (isClientAbort(error, req)) {
    // 응답할 상대가 없다. 연결만 정리한다.
    if (!res.headersSent) {
      res.destroy();
    }
    return;
  }

  // 응답을 이미 보내기 시작했으면 JSON 으로 바꿔 보낼 수 없다. Express 기본 처리(연결 종료)에 맡긴다.
  if (res.headersSent) {
    console.error(error);
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      code: error.code,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? '업로드 가능한 이미지 용량을 초과했습니다.'
          : '파일 업로드 중 오류가 발생했습니다.',
    });
    return;
  }

  if (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ER_DUP_ENTRY'
  ) {
    const databaseMessage = `${error.message} ${
      'sqlMessage' in error ? String(error.sqlMessage) : ''
    }`;

    if (databaseMessage.includes('uq_users_nickname')) {
      res.status(409).json({
        code: 'NICKNAME_ALREADY_EXISTS',
        message: '이미 사용 중인 닉네임입니다.',
      });
      return;
    }

    if (databaseMessage.includes('uq_users_email')) {
      res.status(409).json({
        code: 'EMAIL_ALREADY_EXISTS',
        message: '이미 사용 중인 이메일입니다.',
      });
      return;
    }
  }

  console.error(error);

  // 쿼리스트링에는 토큰 등이 섞일 수 있어 경로만 남긴다.
  const path = req.originalUrl.split('?')[0];
  notifyError({
    source: 'api',
    title: `500 ${req.method} ${path}`,
    error,
    context: {
      요청: `${req.method} ${path}`,
      IP: req.ip,
      'User-Agent': req.header('user-agent'),
    },
    userId: req.user?.id,
  });

  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버에서 오류가 발생했습니다.',
  });
};
