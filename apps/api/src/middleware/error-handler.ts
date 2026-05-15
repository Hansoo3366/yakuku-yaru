import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      code: error.code,
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
