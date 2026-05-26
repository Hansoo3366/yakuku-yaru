import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../utils/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
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

  if (error instanceof Error && error.message.includes('이미지만 업로드')) {
    res.status(400).json({
      code: 'INVALID_FILE_TYPE',
      message: error.message,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버에서 오류가 발생했습니다.',
  });
};
