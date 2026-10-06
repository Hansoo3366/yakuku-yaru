import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { errorHandler } from './error-handler.js';
import { HttpError } from '../utils/http-error.js';

function createResponse() {
  const calls: { status?: number; json?: unknown; destroyed: boolean } = {
    destroyed: false,
  };
  const res = {
    headersSent: false,
    status(code: number) {
      calls.status = code;
      return res;
    },
    json(body: unknown) {
      calls.json = body;
      return res;
    },
    destroy() {
      calls.destroyed = true;
    },
  };

  return { res: res as unknown as Response, calls };
}

function createRequest(overrides: Partial<Request> = {}) {
  return {
    method: 'GET',
    originalUrl: '/uploads/a.webp',
    ip: '127.0.0.1',
    aborted: false,
    header: () => undefined,
    ...overrides,
  } as unknown as Request;
}

void test('클라이언트가 요청을 중단한 오류는 응답 없이 연결만 정리한다', () => {
  const error = Object.assign(new Error('Request aborted'), {
    code: 'ECONNABORTED',
  });
  const { res, calls } = createResponse();
  let forwarded = false;

  void errorHandler(error, createRequest(), res, (() => {
    forwarded = true;
  }) as NextFunction);

  assert.equal(calls.status, undefined);
  assert.equal(calls.json, undefined);
  assert.equal(calls.destroyed, true);
  assert.equal(forwarded, false);
});

void test('요청이 중단된 상태면 오류 종류와 상관없이 알리지 않는다', () => {
  const { res, calls } = createResponse();

  void errorHandler(
    new Error('stream failed'),
    createRequest({ aborted: true } as Partial<Request>),
    res,
    (() => {}) as NextFunction,
  );

  assert.equal(calls.status, undefined);
  assert.equal(calls.destroyed, true);
});

void test('응답을 이미 보내기 시작했으면 Express 기본 처리에 넘긴다', () => {
  const { res, calls } = createResponse();
  (res as unknown as { headersSent: boolean }).headersSent = true;
  let forwardedError: unknown = null;

  void errorHandler(new Error('late failure'), createRequest(), res, ((
    error: unknown,
  ) => {
    forwardedError = error;
  }) as NextFunction);

  assert.ok(forwardedError instanceof Error);
  assert.equal(calls.status, undefined);
  assert.equal(calls.destroyed, false);
});

void test('HttpError 는 지정한 상태 코드와 메시지로 응답한다', () => {
  const { res, calls } = createResponse();

  void errorHandler(
    new HttpError(404, 'ASSET_NOT_FOUND', '이미지를 찾을 수 없습니다.'),
    createRequest(),
    res,
    (() => {}) as NextFunction,
  );

  assert.equal(calls.status, 404);
  assert.deepEqual(calls.json, {
    code: 'ASSET_NOT_FOUND',
    message: '이미지를 찾을 수 없습니다.',
  });
});

void test('알 수 없는 오류는 500 으로 응답한다', () => {
  const { res, calls } = createResponse();

  void errorHandler(
    new Error('boom'),
    createRequest(),
    res,
    (() => {}) as NextFunction,
  );

  assert.equal(calls.status, 500);
  assert.equal((calls.json as { code: string }).code, 'INTERNAL_SERVER_ERROR');
});
