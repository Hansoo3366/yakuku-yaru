import { HttpError } from './http-error.js';

export const EMAIL_MAX_LENGTH = 255;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;
export const POST_TITLE_MAX_LENGTH = 200;
export const POST_CONTENT_MAX_LENGTH = 10000;
export const COMMENT_CONTENT_MAX_LENGTH = 2000;
export const STADIUM_NOTE_FIELD_MAX_LENGTH = 4000;

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9_]+$/;

const BLOCKED_INPUT_PATTERNS = [
  /<\/?[a-z][^>]*>/i,
  /<script\b/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<style\b/i,
  /expression\s*\(/i,
  /@import/i,
  /url\s*\(\s*javascript/i,
];

function containsBlockedPayload(value: string) {
  return BLOCKED_INPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function stripControlCharacters(value: string) {
  return value
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
}

export function sanitizePlainText(value: string, maxLength: number) {
  const normalized = stripControlCharacters(
    value.replace(/<[^>]*>/g, ''),
  ).trim();

  if (!normalized) {
    return '';
  }

  if (containsBlockedPayload(normalized)) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      '허용되지 않는 문자가 포함되어 있습니다.',
    );
  }

  return normalized.slice(0, maxLength);
}

function normalizeBoardText(value: string, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value
    .replace(/\r\n/g, '\n')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 10 || code === 9 || (code >= 32 && code !== 127);
    })
    .join('')
    .trim();

  if (!normalized) {
    return '';
  }

  if (containsBlockedPayload(normalized)) {
    throw new HttpError(
      400,
      'UNSAFE_CONTENT',
      '스크립트, CSS, HTML 태그는 입력할 수 없습니다.',
    );
  }

  if (normalized.length > maxLength) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      `${maxLength}자 이하로 입력해주세요.`,
    );
  }

  return normalized;
}

export function validatePostTitle(title: string) {
  return normalizeBoardText(title, POST_TITLE_MAX_LENGTH);
}

export function validatePostContent(content: string) {
  return normalizeBoardText(content, POST_CONTENT_MAX_LENGTH);
}

export function validateCommentContent(content: string) {
  return normalizeBoardText(content, COMMENT_CONTENT_MAX_LENGTH);
}

export function validateStadiumNoteField(value: string) {
  return normalizeBoardText(value, STADIUM_NOTE_FIELD_MAX_LENGTH);
}

export function validateEmail(email: string) {
  const sanitized = sanitizePlainText(email.toLowerCase(), EMAIL_MAX_LENGTH);

  if (!sanitized || !EMAIL_PATTERN.test(sanitized)) {
    throw new HttpError(400, 'INVALID_INPUT', '올바른 이메일 형식이 아닙니다.');
  }

  return sanitized;
}

export function validatePassword(password: string) {
  if (typeof password !== 'string') {
    throw new HttpError(400, 'INVALID_INPUT', '비밀번호를 입력해주세요.');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new HttpError(
      400,
      'WEAK_PASSWORD',
      `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`,
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해주세요.`,
    );
  }

  if (containsBlockedPayload(password)) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      '허용되지 않는 문자가 포함되어 있습니다.',
    );
  }

  return password;
}

export function validateNickname(nickname: string) {
  const sanitized = sanitizePlainText(nickname, NICKNAME_MAX_LENGTH);

  if (sanitized.length < NICKNAME_MIN_LENGTH) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요.`,
    );
  }

  if (!NICKNAME_PATTERN.test(sanitized)) {
    throw new HttpError(
      400,
      'INVALID_INPUT',
      '닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.',
    );
  }

  return sanitized;
}
