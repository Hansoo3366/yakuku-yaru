import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { notifyError } from '../lib/error-alert.js';
import { HttpError } from '../utils/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
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

  if (
    error instanceof Error &&
    (error.message.includes('이미지만 업로드') ||
      error.message.includes('이미지 저장 용량'))
  ) {
    res.status(400).json({
      code: error.message.includes('저장 용량')
        ? 'UPLOAD_QUOTA_EXCEEDED'
        : 'INVALID_FILE_TYPE',
      message: error.message,
    });
    return;
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
      사용자ID: req.user?.id,
      IP: req.ip,
      'User-Agent': req.header('user-agent'),
    },
  });

  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버에서 오류가 발생했습니다.',
  });
};
